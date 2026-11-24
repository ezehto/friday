import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { FIXED } from "../src/chrome/fixedText";
import { initialState, type AppState } from "../src/store";
import views from "../src/mocks/views.json";
import type { StateSnapshot } from "../src/generated/types";
import { Approvals } from "../src/views/Approvals";
import { Permissions } from "../src/views/Permissions";
import { RawField } from "../src/views/RawField";

const snap = views as unknown as StateSnapshot;
const state: AppState = { ...initialState, approvals: snap.approvals, permissions: snap.permissions };
const result = { ok: false, preview: true, message: FIXED.previewResult } as const;
const makeAct = () => vi.fn(async () => result);

test("both views show PREVIEW, NOT LIVE", () => {
  const a = render(<Approvals state={state} act={makeAct()} />);
  expect(screen.getByRole("note").textContent).toBe("PREVIEW, NOT LIVE");
  a.unmount();
  render(<Permissions state={state} act={makeAct()} />);
  expect(screen.getByText("PREVIEW, NOT LIVE").getAttribute("role")).toBe("note");
});

test.each([
  ["Approve", 0],
  ["Reject", 0],
  ["Open confirm page", 1],
])("%s shows Preview: nothing was executed", async (name, which) => {
  const user = userEvent.setup();
  const act = makeAct();
  render(<Approvals state={state} act={act} />);
  if (which === 1) await user.click(screen.getByRole("button", { name: /Record the Orchard/ }));
  expect(screen.getByRole("status").textContent).toBe("");
  await user.click(screen.getByRole("button", { name }));
  expect(screen.getByRole("status").textContent).toBe("Preview: nothing was executed");
  expect(act).toHaveBeenCalledTimes(1);
});

test("Deny requires a reason, then shows the preview result", async () => {
  const user = userEvent.setup();
  const act = makeAct();
  render(<Permissions state={state} act={act} />);
  await user.click(screen.getByRole("button", { name: "Deny" }));
  expect(act).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toBe(FIXED.permissions.reasonNeeded);
  await user.type(screen.getByRole("textbox"), "not requested");
  await user.click(screen.getByRole("button", { name: "Deny" }));
  expect(act).toHaveBeenCalledWith({ kind: "deny", requestId: snap.permissions[0]!.request_id, reason: "not requested" });
  expect(screen.getByRole("status").textContent).toBe("Preview: nothing was executed");
});

test("Deny stays the same DOM element across Next and Previous", async () => {
  const user = userEvent.setup();
  render(<Permissions state={state} act={makeAct()} />);
  expect(screen.getByText("Request 1 of 2")).toBeTruthy();
  const deny = screen.getByRole("button", { name: "Deny" });
  const parent = deny.parentElement;
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Request 2 of 2")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Deny" })).toBe(deny);
  expect(deny.parentElement).toBe(parent);
  expect(screen.getAllByText(/\[BIDI U\+202E\]/).length).toBeGreaterThan(0);
  await user.click(screen.getByRole("button", { name: "Previous" }));
  expect(screen.getByRole("button", { name: "Deny" })).toBe(deny);
});

test("Next and Previous at the ends keep focus and do nothing", async () => {
  const user = userEvent.setup();
  render(<Permissions state={state} act={makeAct()} />);
  const prev = screen.getByRole("button", { name: "Previous" });
  prev.focus();
  await user.click(prev);
  expect(prev.getAttribute("aria-disabled")).toBe("true");
  expect(document.activeElement).toBe(prev);
  expect(screen.getByText("Request 1 of 2")).toBeTruthy();
});

test("every untrusted field beside an action shows its markers", () => {
  const p = { ...snap.approvals[0]!, target: "notes/a\u202eb.md", title: "T\u200bitle" };
  const view = render(<Approvals state={{ ...state, approvals: [p] }} act={makeAct()} />);
  expect(screen.getAllByText("[BIDI U+202E]").length).toBe(1);
  expect(screen.getAllByText("[ZW U+200B]").length).toBe(2);
  view.unmount();
  const r = { ...snap.permissions[0]!, cwd: "/w\u0430rk", input: { "co\u200bmmand": "ls" } };
  render(<Permissions state={{ ...state, permissions: [r] }} act={makeAct()} />);
  expect(screen.getAllByText(FIXED.homoglyph).length).toBeGreaterThan(0);
  expect(screen.getAllByText("[ZW U+200B]").length).toBe(1);
  expect(screen.getByRole("group", { name: "co[ZW U+200B]mmand" })).toBeTruthy();
});

test("a look-alike slash in cwd shows the notice", () => {
  const r = { ...snap.permissions[0]!, cwd: "/work\u2215orchard-api" };
  render(<Permissions state={{ ...state, permissions: [r] }} act={makeAct()} />);
  expect(screen.getAllByText(FIXED.homoglyph).length).toBeGreaterThan(0);
});

test("Permissions has no button whose name matches /allow/i", () => {
  render(<Permissions state={state} act={makeAct()} />);
  expect(screen.queryAllByRole("button", { name: /allow/i })).toHaveLength(0);
});

test("long content is shown in full", () => {
  const { container } = render(<RawField name="big" value={"x".repeat(20000)} />);
  expect(container.querySelector("pre")!.textContent).toHaveLength(20000);
  expect(screen.getByText("1 lines, 20000 bytes")).toBeTruthy();
});

test("a look-alike letter raises the homoglyph warning", () => {
  render(<RawField name="n" value={"pаssword"} />);
  expect(screen.getByText(FIXED.homoglyph)).toBeTruthy();
});
