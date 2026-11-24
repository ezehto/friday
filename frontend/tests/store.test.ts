import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Scenario, ServerFrame, ViewSet, WidgetEnvelope } from "../src/generated/types";
import samples from "../src/mocks/samples.json";
import { applyFrame, createStore, type AppState } from "../src/store";
import { MockTransport } from "../src/transport/mock";

const emptyViews: ViewSet = { approvals: [], runs: [], sessions: [], permissions: [], traces: [], tray: [] };
const base: AppState = { ...emptyViews, board: [], core: "idle", reply: null, requestOpen: false, done: false };
const widgets = samples.items.slice(0, 2) as unknown as Scenario["widgets"];
const frame = (name: NonNullable<ServerFrame["name"]>, data: object): ServerFrame => ({
  v: 1, type: "event", id: "f000001", ts: "2026-11-24T09:00:00.000Z", name, data,
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("applyFrame keeps at most 12 board envelopes", () => {
  const env = widgets[0]!.envelope as WidgetEnvelope;
  const next = applyFrame(base, frame("board.updated", { board: Array.from({ length: 15 }, () => env) }));
  expect(next.board).toHaveLength(12);
  expect(base.board).toHaveLength(0);
});

test("alert.raised adds a tray item and never carries text", () => {
  const next = applyFrame(base, frame("alert.raised", { kind: "run_failed", level: "bad", view: "traces" }));
  expect(next.tray).toEqual([{ kind: "run_failed", source: "health" }]);
  expect(applyFrame(base, frame("alert.raised", { kind: "approvals_waiting", level: "attention" })).tray[0]?.source).toBe("approvals");
  expect(applyFrame(base, frame("alert.raised", { kind: "session_waiting", level: "attention" })).tray[0]?.source).toBe("sessions");
  expect(JSON.stringify(next.tray)).not.toMatch(/text/);
});

test("message deltas append per request, done closes, request flags toggle", () => {
  let s = applyFrame(base, frame("request.started", { request_id: "r1" }));
  expect(s.requestOpen).toBe(true);
  s = applyFrame(s, frame("message.delta", { request_id: "r1", text: "hi " }));
  s = applyFrame(s, frame("message.delta", { request_id: "r1", text: "there" }));
  expect(s.reply).toEqual({ requestId: "r1", text: "hi there", done: false });
  s = applyFrame(s, frame("message.delta", { request_id: "r2", text: "new" }));
  expect(s.reply).toEqual({ requestId: "r2", text: "new", done: false });
  s = applyFrame(s, frame("message.done", { request_id: "r2" }));
  expect(s.reply?.done).toBe(true);
  expect(applyFrame(s, frame("request.finished", { request_id: "r2" })).requestOpen).toBe(false);
});

test("other event names return the same state", () => {
  expect(applyFrame(base, frame("run.updated", {}))).toBe(base);
});

test("createStore with a preview feed sets core from core steps and done after the last step", async () => {
  const t = new MockTransport(
    { id: "t", group: "request", label: "t", now: "2026-11-24T09:00:00Z", widgets, script: [
      { at_ms: 10, core: "thinking" },
      { at_ms: 20, board: [widgets[0]!.envelope.widget_id] },
    ] },
    emptyViews,
  );
  const store = createStore(t, t);
  const seen = vi.fn();
  store.subscribe(seen);
  expect(store.getState().core).toBe("idle");
  await vi.advanceTimersByTimeAsync(10);
  expect(store.getState().core).toBe("thinking");
  expect(store.getState().done).toBe(false);
  await vi.advanceTimersByTimeAsync(10);
  expect(store.getState().board).toHaveLength(1);
  expect(store.getState().done).toBe(true);
  expect(seen).toHaveBeenCalled();
  store.dispose();
});

test("createStore without a preview feed leaves core and done alone", async () => {
  const t = new MockTransport(
    { id: "t", group: "request", label: "t", now: "2026-11-24T09:00:00Z", widgets, script: [{ at_ms: 1, core: "error" }] },
    emptyViews,
  );
  const store = createStore(t);
  await vi.runAllTimersAsync();
  expect(store.getState()).toMatchObject({ core: "idle", done: false });
  store.dispose();
});
