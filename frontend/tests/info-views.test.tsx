import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { FIXED } from "../src/chrome/fixedText";
import { initialState, type AppState } from "../src/store";
import views from "../src/mocks/views.json";
import type { StateSnapshot } from "../src/generated/types";
import { RUN_STATUSES, Sessions, sortSessions } from "../src/views/Sessions";
import { formatCost, Traces } from "../src/views/Traces";

const snap = views as unknown as StateSnapshot;
const result = { ok: false, preview: true, message: FIXED.previewResult } as const;
const makeAct = () => vi.fn(async () => result);

test("traces show cost and tokens", () => {
  const first = snap.traces[0]!;
  render(<Traces state={{ ...initialState, traces: snap.traces } as AppState} />);
  expect(screen.getByRole("note").textContent).toBe("PREVIEW, NOT LIVE");
  const item = screen.getAllByRole("button")[0]!;
  expect(item.textContent).toContain("$0.031");
  expect(item.textContent).toContain("5.2K");
  expect(screen.getAllByRole("list").length).toBeGreaterThan(1);
  expect(document.querySelector(".span-name")?.textContent).toBe(first.spans[0]!.name);
  // Kinds read as words, not enums.
  expect(screen.getAllByText("Model turn").length).toBeGreaterThan(0);
  expect(document.body.textContent).not.toContain("model_turn");
});

test("a span tree shows error and timeout by word", () => {
  const spans = [
    { span_id: "a", parent_span_id: null, name: "Root", kind: "request", duration_ms: 5, status: "ok" },
    { span_id: "b", parent_span_id: "a", name: "Slow", kind: "tool_call", duration_ms: 2000, status: "timeout" },
    { span_id: "c", parent_span_id: "b", name: "Broken", kind: "tool_call", duration_ms: 5, status: "error" },
  ] as const;
  const trace = { ...snap.traces[0]!, spans: [...spans] };
  render(<Traces state={{ ...initialState, traces: [trace] } as AppState} />);
  expect(screen.getByText("timeout")).toBeTruthy();
  expect(screen.getByText("error")).toBeTruthy();
});

test("sessions show the waiting session first marked waiting", () => {
  render(<Sessions state={{ ...initialState, sessions: [...snap.sessions].reverse(), runs: snap.runs } as AppState} act={makeAct()} />);
  const rows = screen.getAllByRole("row");
  expect(within(rows[1]!).getByText("Waiting for permission")).toBeTruthy();
  expect(within(rows[1]!).getByText("Orchard")).toBeTruthy();
});

test("Sessions shows the banner and every button gives the preview result", async () => {
  const user = userEvent.setup();
  const act = makeAct();
  render(<Sessions state={{ ...initialState, sessions: snap.sessions, runs: snap.runs } as AppState} act={act} />);
  expect(screen.getByRole("note").textContent).toBe("PREVIEW, NOT LIVE");
  const [runStatus, msgStatus] = screen.getAllByRole("status");
  // Only the working run offers Cancel.
  expect(screen.getAllByRole("button", { name: /^Cancel/ })).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Cancel lantern-web" }));
  expect(act).toHaveBeenCalledWith({ kind: "cancel_run", runId: "run-0142" });
  expect(runStatus!.textContent).toBe("Preview: nothing was executed");
  await user.click(screen.getByRole("button", { name: "Send" }));
  expect(act).toHaveBeenCalledTimes(1);
  expect(msgStatus!.textContent).toBe(FIXED.sessions.textNeeded);
  await user.type(screen.getByRole("textbox"), "go on");
  await user.click(screen.getByRole("button", { name: "Send" }));
  expect(act).toHaveBeenLastCalledWith({ kind: "send_session_message", sessionId: snap.sessions[0]!.session_id, text: "go on" });
  expect(msgStatus!.textContent).toBe("Preview: nothing was executed");
  expect(screen.getByText(/claude attach/).textContent).toContain(snap.sessions[0]!.session_id);
});

test("cost never shows a nonzero amount as zero", () => {
  expect(formatCost(0)).toBe("$0.00");
  expect(formatCost(0.00003)).toBe("<$0.0001");
  expect(formatCost(12345.678)).toBe("$12,345.678");
});

test("a 200-span chain renders and caps the indent", () => {
  const spans = Array.from({ length: 200 }, (_, i) => ({ span_id: `n${i}`, parent_span_id: i === 0 ? null : `n${i - 1}`, name: `Step ${i}`, kind: "tool_call", duration_ms: 1, status: "ok" as const }));
  const { container } = render(<Traces state={{ ...initialState, traces: [{ ...snap.traces[0]!, spans }] } as AppState} />);
  expect(screen.getByText("Step 199")).toBeTruthy();
  expect(container.querySelectorAll(".span-flat").length).toBeGreaterThan(150);
  expect(container.querySelectorAll(".span-list:not(.span-flat)").length).toBeLessThanOrEqual(10);
}, 15_000);

test("sessions sort waiting first, then last activity descending", () => {
  const base = snap.sessions[0]!;
  const mk = (id: string, waiting: boolean, at: string) => ({ ...base, session_id: id, waiting, last_activity: at });
  const sorted = sortSessions([mk("old", false, "2026-11-24T07:00:00Z"), mk("new", false, "2026-11-24T09:00:00Z"), mk("wait", true, "2026-11-24T01:00:00Z")]);
  expect(sorted.map((s) => s.session_id)).toEqual(["wait", "new", "old"]);
});

test("Cancel shows for starting, working and waiting runs only, named by repository", () => {
  const runs = RUN_STATUSES.map((status) => ({ run_id: status, repo: `repo-${status}`, mode: "task" as const, status, started: "2026-11-24T08:00:00Z" }));
  render(<Sessions state={{ ...initialState, runs } as AppState} act={makeAct()} />);
  const names = screen.getAllByRole("button", { name: /^Cancel/ }).map((b) => b.getAttribute("aria-label"));
  expect(names).toEqual(["Cancel repo-starting", "Cancel repo-working", "Cancel repo-waiting"]);
});

test("Send carries the id of a non-default session", async () => {
  const user = userEvent.setup();
  const act = makeAct();
  render(<Sessions state={{ ...initialState, sessions: snap.sessions } as AppState} act={act} />);
  await user.selectOptions(screen.getByRole("combobox"), "Session 2");
  await user.type(screen.getByRole("textbox"), "hello");
  await user.click(screen.getByRole("button", { name: "Send" }));
  const second = [...snap.sessions].sort((a, b) => Number(b.waiting) - Number(a.waiting) || Date.parse(b.last_activity) - Date.parse(a.last_activity))[1]!;
  expect(act).toHaveBeenCalledWith({ kind: "send_session_message", sessionId: second.session_id, text: "hello" });
});
