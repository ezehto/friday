import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { FIXED } from "../src/chrome/fixedText";
import { initialState, type AppState } from "../src/store";
import views from "../src/mocks/views.json";
import type { StateSnapshot } from "../src/generated/types";
import { Sessions } from "../src/views/Sessions";
import { Traces } from "../src/views/Traces";

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
  expect(screen.getByText(first.spans[0]!.name)).toBeTruthy();
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
  expect(screen.getAllByRole("button", { name: "Cancel" })).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Cancel" }));
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
