import { render } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Core } from "../src/chrome/Core";
import { PushToTalk } from "../src/chrome/ChatLine";
import type { Scenario, ScriptStep, ServerFrame, ViewSet } from "../src/generated/types";
import samples from "../src/mocks/samples.json";
import { applyFrame, createStore, initialState } from "../src/store";
import { MockTransport, voiceLevel } from "../src/transport/mock";
import type { VoiceLevelSource } from "../src/transport/types";

const emptyViews: ViewSet = { approvals: [], runs: [], sessions: [], permissions: [], traces: [], tray: [] };
const widgets = samples.items.slice(0, 1) as unknown as Scenario["widgets"];
const scenario = (script: ScriptStep[]): Scenario => ({
  id: "t", group: "request", label: "t", now: "2026-11-24T09:00:00Z", widgets, script,
});
const SCRIPT: ScriptStep[] = [
  { at_ms: 0, core: "idle" },
  { at_ms: 100, core: "listening" },
  { at_ms: 500, core: "thinking" },
  { at_ms: 700, core: "speaking" },
  { at_ms: 1000, core: "idle" },
];

async function collect(script: ScriptStep[], opts?: { instant?: boolean }, until = 2000) {
  const t = new MockTransport(scenario(script), emptyViews, opts);
  const log: { at: number; v: number }[] = [];
  let now = 0;
  t.onLevel((v) => log.push({ at: now + 10, v })); // the tick runs inside the 10 ms step that starts at now
  await t.connect();
  for (; now < until; now += 10) vi.advanceTimersByTime(10);
  return { t, log };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("MockTransport emits levels only while listening or speaking", async () => {
  const { log } = await collect(SCRIPT);
  const live = log.filter((l) => l.v > 0);
  expect(live.length).toBeGreaterThan(10);
  for (const { at } of live) expect((at >= 100 && at <= 510) || (at >= 700 && at <= 1010)).toBe(true);
  expect(log.filter((l) => l.at > 520 && l.at < 690)).toEqual([]);
});

test("levels are finite and within 0..1", async () => {
  const { log } = await collect(SCRIPT);
  for (const { v } of log) {
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  }
  for (let n = 0; n < 500; n++) for (const k of ["listening", "speaking"] as const) expect(voiceLevel(k, n)).toBeLessThanOrEqual(1);
});

test("leaving listening or speaking emits 0 once", async () => {
  const { log } = await collect(SCRIPT);
  expect(log.filter((l) => l.v === 0).map((l) => l.at)).toEqual([500, 1000]);
});

test("close cancels level timers", async () => {
  const { t, log } = await collect(SCRIPT, undefined, 300);
  const n = log.length;
  t.close();
  vi.advanceTimersByTime(2000);
  expect(log).toHaveLength(n);
  expect(vi.getTimerCount()).toBe(0);
});

test("instant mode emits no levels", async () => {
  const { log } = await collect(SCRIPT, { instant: true });
  expect(log).toEqual([]);
});

test("the listening and speaking curves differ", () => {
  const a = Array.from({ length: 40 }, (_, n) => voiceLevel("listening", n, 1));
  const b = Array.from({ length: 40 }, (_, n) => voiceLevel("speaking", n, 1));
  expect(a).not.toEqual(b);
  expect(a).toEqual(Array.from({ length: 40 }, (_, n) => voiceLevel("listening", n, 1)));
});

function fake() {
  const listeners = new Set<(v: number) => void>();
  const source: VoiceLevelSource = {
    onLevel(l) {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
  };
  return { source, listeners, emit: (v: number) => act(() => listeners.forEach((l) => l(v))) };
}

test("Core writes --voice-level from the source and unsubscribes on unmount", async () => {
  const f = fake();
  const { container, unmount } = render(<Core state="listening" size="full" level={f.source} />);
  const el = container.querySelector(".core") as SVGElement;
  expect(f.listeners.size).toBe(1);
  await f.emit(0.4);
  expect(el.style.getPropertyValue("--voice-level")).toBe("0.4");
  expect(el.getAttribute("data-live")).toBe("true");
  await f.emit(0);
  expect(el.hasAttribute("data-live")).toBe(false);
  unmount();
  expect(f.listeners.size).toBe(0);
});

test("the waveform writes --voice-level from the same source", async () => {
  const f = fake();
  const { container } = render(
    <>
      <Core state="speaking" size="full" level={f.source} />
      <PushToTalk pressed={false} onChange={() => undefined} level={f.source} core="speaking" />
    </>,
  );
  await f.emit(0.7);
  expect((container.querySelector(".ptt-wave") as HTMLElement).style.getPropertyValue("--voice-level")).toBe("0.7");
  expect((container.querySelector(".core") as SVGElement).style.getPropertyValue("--voice-level")).toBe("0.7");
});

test("no AppState field holds the level", async () => {
  const t = new MockTransport(scenario(SCRIPT), emptyViews);
  const store = createStore(t, t);
  const seen: string[] = [];
  store.subscribe(() => seen.push(JSON.stringify(store.getState())));
  await vi.advanceTimersByTimeAsync(400);
  const before = seen.length;
  expect(Object.keys(store.getState()).sort()).toEqual(Object.keys(initialState).sort());
  await vi.advanceTimersByTimeAsync(250);
  expect(seen.length - before).toBe(1); // only the thinking core step, no per-tick updates
  store.dispose();
});

test("carry: one throwing listener does not skip the rest, and is rethrown asynchronously", async () => {
  const queued: (() => void)[] = [];
  vi.spyOn(globalThis, "queueMicrotask").mockImplementation((fn) => void queued.push(fn));
  const t = new MockTransport(scenario(SCRIPT), emptyViews);
  const seen: number[] = [];
  t.onLevel(() => {
    throw new Error("boom");
  });
  t.onLevel((v) => seen.push(v));
  await t.connect();
  vi.advanceTimersByTime(150);
  expect(seen.length).toBeGreaterThan(0);
  expect(queued.length).toBeGreaterThan(0);
  expect(() => queued[0]!()).toThrow("boom");
  vi.restoreAllMocks();
});

test("carry: the store keeps notifying after a listener throws", async () => {
  const queued: (() => void)[] = [];
  vi.spyOn(globalThis, "queueMicrotask").mockImplementation((fn) => void queued.push(fn));
  const t = new MockTransport(scenario([{ at_ms: 10, core: "thinking" }]), emptyViews);
  const store = createStore(t, t);
  const seen: string[] = [];
  store.subscribe(() => {
    throw new Error("bad listener");
  });
  store.subscribe(() => seen.push(store.getState().core));
  await vi.advanceTimersByTimeAsync(50);
  expect(seen).toContain("thinking");
  expect(queued.some((q) => { try { q(); return false; } catch { return true; } })).toBe(true);
  store.dispose();
  vi.restoreAllMocks();
});

test("carry: inherited keys are not alert kinds", () => {
  const frame = (kind: string): ServerFrame => ({ v: 1, type: "event", id: "f000001", ts: "2026-11-24T09:00:00.000Z", name: "alert.raised", data: { kind, level: "bad" } });
  for (const kind of ["constructor", "toString", "__proto__"]) expect(applyFrame(initialState, frame(kind)).tray).toEqual([]);
  expect(applyFrame(initialState, frame("run_failed")).tray).toHaveLength(1);
});
