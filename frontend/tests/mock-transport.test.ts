import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { FIXED } from "../src/chrome/fixedText";
import type { Scenario, ScriptStep, ServerFrame, ViewSet } from "../src/generated/types";
import samples from "../src/mocks/samples.json";
import { MockTransport } from "../src/transport/mock";
import type { TransportAction } from "../src/transport/types";
import { validateAgainst } from "./helpers/schema";

const FRAME_SCHEMA = "https://friday.invalid/schema/frames/server-frame.schema.json";
const emptyViews: ViewSet = { approvals: [], runs: [], sessions: [], permissions: [], traces: [], tray: [] };
const widgets = samples.items.slice(0, 3) as unknown as Scenario["widgets"];
const ids = widgets.map((w) => w.envelope.widget_id) as [string, string, string];

const scenario = (script: ScriptStep[], extra: Partial<Scenario> = {}): Scenario => ({
  id: "t", group: "request", label: "t", now: "2026-11-24T09:00:00Z", widgets, script, ...extra,
});

async function run(script: ScriptStep[], opts?: { instant?: boolean }) {
  const t = new MockTransport(scenario(script), emptyViews, opts);
  const frames: ServerFrame[] = [];
  t.subscribe((f) => frames.push(f));
  await t.connect();
  await vi.runAllTimersAsync();
  return { t, frames };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("steps fire at their at_ms in order", async () => {
  const t = new MockTransport(
    scenario([
      { at_ms: 200, event: "request.finished", data: { request_id: "r1" } },
      { at_ms: 100, event: "request.started", data: { request_id: "r1" } },
    ]),
    emptyViews,
  );
  const names: unknown[] = [];
  t.subscribe((f) => names.push([f.name, f.id]));
  await t.connect();
  vi.advanceTimersByTime(99);
  expect(names).toEqual([]);
  vi.advanceTimersByTime(1);
  expect(names).toEqual([["request.started", "f000001"]]);
  vi.advanceTimersByTime(100);
  expect(names[1]).toEqual(["request.finished", "f000002"]);
});

test("every emitted frame validates against ServerFrame", async () => {
  const { frames } = await run([
    { at_ms: 0, event: "request.started", data: { request_id: "r9" } },
    { at_ms: 10, core: "thinking" },
    { at_ms: 20, board: [ids[0], "no-such-widget", ids[1]] },
    { at_ms: 30, reply: "Here is the board you asked for" },
    { at_ms: 40, event: "alert.raised", data: { kind: "run_failed", level: "bad", view: "traces" } },
    { at_ms: 50, event: "request.finished", data: { request_id: "r9" } },
  ]);
  const names = new Set(frames.map((f) => f.name));
  for (const n of ["request.started", "request.finished", "board.updated", "message.delta", "message.done", "alert.raised"]) {
    expect(names.has(n as ServerFrame["name"])).toBe(true);
  }
  for (const f of frames) expect(validateAgainst(FRAME_SCHEMA, f), JSON.stringify(f)).toEqual([]);
  expect(frames[0]?.ts).toBe("2026-11-24T09:00:00.000Z");
});

test("a board step emits the scenario's envelopes in the listed order, skipping unknown ids", async () => {
  const { frames } = await run([{ at_ms: 0, board: [ids[2], "missing", ids[0]] }]);
  const board = (frames[0]?.data as { board: { widget_id: string }[] }).board;
  expect(board.map((e) => e.widget_id)).toEqual([ids[2], ids[0]]);
});

test("a reply step emits word deltas 30 ms apart then message.done", async () => {
  const t = new MockTransport(scenario([{ at_ms: 100, reply: "one two  three" }]), emptyViews);
  const seen: [string | undefined, string | undefined][] = [];
  t.subscribe((f) => seen.push([f.name, (f.data as { text?: string }).text]));
  await t.connect();
  vi.advanceTimersByTime(100);
  expect(seen).toEqual([["message.delta", "one "]]);
  vi.advanceTimersByTime(30);
  vi.advanceTimersByTime(30);
  expect(seen.map((s) => s[1])).toEqual(["one ", "two  ", "three"]);
  vi.advanceTimersByTime(29);
  expect(seen).toHaveLength(3);
  vi.advanceTimersByTime(1);
  expect(seen[3]).toEqual(["message.done", undefined]);
});

test("a long reply is capped at 400 code points and deltas concatenate to it", async () => {
  const reply = Array.from({ length: 300 }, () => "ab").join(" ");
  const { frames } = await run([{ at_ms: 0, reply }]);
  const text = frames.filter((f) => f.name === "message.delta").map((f) => (f.data as { text: string }).text).join("");
  expect(text).toBe(Array.from(reply).slice(0, 400).join(""));
});

test("core steps reach onCore and never subscribe listeners", async () => {
  const t = new MockTransport(
    scenario([{ at_ms: 5, core: "thinking" }, { at_ms: 6, core: "idle" }]),
    emptyViews,
  );
  const frames: ServerFrame[] = [];
  const cores: string[] = [];
  t.subscribe((f) => frames.push(f));
  t.onCore((s) => cores.push(s));
  await t.connect();
  await vi.runAllTimersAsync();
  expect(cores).toEqual(["thinking", "idle"]);
  expect(frames).toEqual([]);
});

test("onDone fires once after the last step, including reply deltas", async () => {
  const t = new MockTransport(scenario([{ at_ms: 10, reply: "a b" }]), emptyViews);
  const done = vi.fn();
  t.onDone(done);
  await t.connect();
  vi.advanceTimersByTime(69);
  expect(done).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(done).toHaveBeenCalledTimes(1);
});

test("instant runs every step at 0 ms in script order", async () => {
  const t = new MockTransport(
    scenario([
      { at_ms: 5000, event: "request.started", data: { request_id: "r1" } },
      { at_ms: 9000, reply: "a b" },
    ]),
    emptyViews,
    { instant: true },
  );
  const names: unknown[] = [];
  t.subscribe((f) => names.push(f.name));
  await t.connect();
  vi.advanceTimersByTime(0);
  expect(names).toEqual(["request.started", "message.delta", "message.delta", "message.done"]);
});

test("close cancels pending steps", async () => {
  const t = new MockTransport(scenario([{ at_ms: 50, event: "request.started", data: { request_id: "r1" } }]), emptyViews);
  const frames: ServerFrame[] = [];
  const done = vi.fn();
  t.subscribe((f) => frames.push(f));
  t.onDone(done);
  await t.connect();
  t.close();
  await vi.runAllTimersAsync();
  expect(frames).toEqual([]);
  expect(done).not.toHaveBeenCalled();
});

test("reply deltas carry the request_id of the preceding request.started", async () => {
  const { frames } = await run([
    { at_ms: 0, reply: "early" },
    { at_ms: 10, event: "request.started", data: { request_id: "r7" } },
    { at_ms: 20, reply: "later" },
  ]);
  const ridOf = (text: string) =>
    (frames.find((f) => (f.data as { text?: string }).text === text)?.data as { request_id: string }).request_id;
  expect(ridOf("early")).toBe("r1");
  expect(ridOf("later")).toBe("r7");
});

test("connect merges base views, scenario views and an empty board", async () => {
  const tray = [{ kind: "run_failed", source: "health" }] as const;
  const t = new MockTransport(scenario([], { views: { tray: [...tray] } }), { ...emptyViews, runs: [] });
  expect(await t.connect()).toEqual({ ...emptyViews, tray: [...tray], board: [] });
});

test("act resolves the preview result for every action kind and the state is unchanged", async () => {
  const t = new MockTransport(scenario([]), emptyViews);
  const actions: TransportAction[] = [
    { kind: "approve", proposalId: "p1" },
    { kind: "reject", proposalId: "p1" },
    { kind: "open_confirm", proposalId: "p1" },
    { kind: "deny", requestId: "q1", reason: "no" },
    { kind: "cancel_run", runId: "u1" },
    { kind: "send_session_message", sessionId: "s1", text: "hi" },
    { kind: "send_message", text: "hi" },
  ];
  const frames: ServerFrame[] = [];
  t.subscribe((f) => frames.push(f));
  for (const a of actions) {
    expect(await t.act(a)).toEqual({ ok: false, preview: true, message: FIXED.previewResult });
  }
  await vi.runAllTimersAsync();
  expect(frames).toEqual([]);
});
