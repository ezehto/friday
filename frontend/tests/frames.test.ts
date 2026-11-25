import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CORE_STATES } from "../src/chrome/coreStates";
import { validateAgainst } from "./helpers/schema";

const FRAME = "https://friday.invalid/schema/frames/server-frame.schema.json";
const MOCK = "https://friday.invalid/frontend/src/mocks/mock.schema.json";
const ts = "2026-11-20T09:00:00Z";
const frame = (name: string, data: unknown) => ({ v: 1, type: "event", id: "f1", ts, name, data });
const envelope = (i: number) => ({
  widget_id: `w${i}`, source: "sample", as_of: ts, data_class: "personal", title: "t",
  blocks: [{ kind: "text", text: "x" }],
});

describe("server frame", () => {
  it("valid frames pass", () => {
    expect(validateAgainst(FRAME, frame("message.delta", { request_id: "r1", text: "hi" }))).toEqual([]);
    expect(validateAgainst(FRAME, frame("alert.raised", { kind: "run_failed", level: "bad" }))).toEqual([]);
    expect(validateAgainst(FRAME, frame("board.updated", { board: [envelope(1)] }))).toEqual([]);
    expect(validateAgainst(FRAME, { v: 1, type: "ack", id: "a", ts, data: {} })).toEqual([]);
  });

  it("a board.updated frame with 13 envelopes fails", () => {
    const board = Array.from({ length: 13 }, (_, i) => envelope(i));
    expect(validateAgainst(FRAME, frame("board.updated", { board })).join("\n")).toContain("/data/board");
  });

  it("an alert.raised frame carrying a text field fails", () => {
    expect(validateAgainst(FRAME, frame("alert.raised", { kind: "run_failed", level: "bad", text: "x" })).join("\n")).toContain("/data");
  });

  it("message.delta text of 401 characters fails", () => {
    expect(validateAgainst(FRAME, frame("message.delta", { request_id: "r", text: "x".repeat(401) })).join("\n")).toContain("/data/text");
  });

  it("an unknown event name fails", () => {
    expect(validateAgainst(FRAME, frame("board.exploded", {}))).not.toEqual([]);
  });

  it("an event frame without a name fails", () => {
    expect(validateAgainst(FRAME, { v: 1, type: "event", id: "f", ts, data: {} })).not.toEqual([]);
  });
});

const minimal: Record<string, unknown> = {
  "message.delta": { request_id: "r", text: "t" },
  "message.done": { request_id: "r" },
  "request.started": { request_id: "r" },
  "request.finished": { request_id: "r" },
  "board.updated": { board: [] },
  "approval.created": { proposal_id: "p" },
  "approval.updated": { proposal_id: "p", status: "executed" },
  "run.updated": { run_id: "r", status: "done" },
  "session.updated": { session_id: "s", state: "idle" },
  "permission.pending": { request_id: "r" },
  "permission.resolved": { request_id: "r" },
  "session_message.sent": { session_id: "s" },
  "research.finished": { job_id: "j" },
  "alert.raised": { kind: "run_failed", level: "bad", view: "sessions" },
};

describe("closed frame data", () => {
  it.each(Object.entries(minimal))("%s: minimal passes, extra key fails", (name, data) => {
    expect(validateAgainst(FRAME, frame(name, data))).toEqual([]);
    expect(validateAgainst(FRAME, frame(name, { ...(data as object), extra: "x" })).join("\n")).toContain("/data");
  });

  it("free text in constrained fields fails", () => {
    expect(validateAgainst(FRAME, frame("alert.raised", { kind: "run_failed", level: "bad", view: "elsewhere" })).join("\n")).toContain("/data/view");
    expect(validateAgainst(FRAME, frame("approval.updated", { proposal_id: "p", status: "approved" })).join("\n")).toContain("/data/status");
  });

  it("error and ack data are closed", () => {
    const base = { v: 1, id: "f", ts };
    expect(validateAgainst(FRAME, { ...base, type: "error", data: { code: "bad_hello" } })).toEqual([]);
    expect(validateAgainst(FRAME, { ...base, type: "ack", data: {} })).toEqual([]);
    expect(validateAgainst(FRAME, { ...base, type: "error", data: { code: "bad_hello", message: "x" } })).not.toEqual([]);
    expect(validateAgainst(FRAME, { ...base, type: "error", data: {} })).not.toEqual([]);
    expect(validateAgainst(FRAME, { ...base, type: "ack", data: { a: 1 } })).not.toEqual([]);
  });
});

describe("scenario model", () => {
  const step = (s: unknown) => validateAgainst(`${MOCK}#/$defs/ScriptStep`, s);

  it("each ScriptStep shape passes", () => {
    expect(step({ at_ms: 0, event: "request.started", data: { request_id: "r" } })).toEqual([]);
    expect(step({ at_ms: 5, board: ["w1"] })).toEqual([]);
    expect(step({ at_ms: 5, reply: "hello" })).toEqual([]);
    expect(step({ at_ms: 5, core: "thinking" })).toEqual([]);
  });

  it("a ScriptStep with both board and reply fails", () => {
    expect(step({ at_ms: 0, board: ["w1"], reply: "x" })).not.toEqual([]);
  });

  it("the ScriptCoreState enum equals CORE_STATES", () => {
    const schema = JSON.parse(readFileSync(resolve(import.meta.dirname, "../src/mocks/mock.schema.json"), "utf8"));
    expect(schema.$defs.ScriptCoreState.enum).toEqual([...CORE_STATES]);
  });

  it("AlertKind and EventName are declared once", () => {
    const types = readFileSync(resolve(import.meta.dirname, "../src/generated/types.ts"), "utf8");
    expect(types).toMatch(/export type AlertKind\b/);
    expect(types).toMatch(/export type EventName\b/);
    expect(types).not.toMatch(/\b(AlertKind|EventName)\d/);
  });

  it("a scenario with views replacing only some keys passes", () => {
    const scenario = { id: "a-1", group: "edge", label: "x", now: ts, widgets: [], script: [], views: { tray: [{ kind: "over_budget", source: "health" }] } };
    expect(validateAgainst(`${MOCK}#/$defs/Scenario`, scenario)).toEqual([]);
    expect(validateAgainst(`${MOCK}#/$defs/Scenario`, { ...scenario, group: "other" })).not.toEqual([]);
  });
});
