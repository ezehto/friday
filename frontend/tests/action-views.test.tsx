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

test("every action button shows Preview: nothing was executed", async () => {
  const user = userEvent.setup();
  const act = makeAct();
  render(<Approvals state={state} act={act} />);
  const status = () => screen.getByRole("status").textContent;
  await user.click(screen.getByRole("button", { name: "Approve" }));
  expect(status()).toBe("Preview: nothing was executed");
  await user.click(screen.getByRole("button", { name: "Reject" }));
  expect(act).toHaveBeenCalledTimes(2);
  await user.click(screen.getByRole("button", { name: /Record the Orchard/ }));
  expect(screen.getByRole("status").textContent).toBe("");
  await user.click(screen.getByRole("button", { name: "Open confirm page" }));
  expect(status()).toBe("Preview: nothing was executed");
  expect(act).toHaveBeenLastCalledWith({ kind: "open_confirm", proposalId: "prop-vault-note" });
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

test("Deny stays the same DOM element and position across Next and Previous", async () => {
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
