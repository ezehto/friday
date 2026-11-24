import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { ChatLine, PushToTalk } from "../src/chrome/ChatLine";
import { FIXED } from "../src/chrome/fixedText";
import { TopBar } from "../src/chrome/TopBar";
import { Tray } from "../src/chrome/Tray";
import type { AlertKind, TrayItem } from "../src/generated/types";
import { BASE_VIEWS, loadScenarios } from "../src/mocks";
import { createStore, initialState, type AppState } from "../src/store";
import { MockTransport } from "../src/transport/mock";
import type { SessionTransport } from "../src/transport/types";

afterEach(() => {
  Reflect.deleteProperty(navigator, "mediaDevices");
});

const KINDS = Object.keys(FIXED.tray) as AlertKind[];
const act: SessionTransport["act"] = async () => ({ ok: false, preview: true, message: FIXED.previewResult });
const topBar = (state: AppState = initialState, extra: { nowMs?: number; timeZone?: string } = {}) =>
  render(<TopBar state={state} nowMs={extra.nowMs ?? 0} timeZone={extra.timeZone} onNavigate={() => undefined} />);

test("tray shows only fixed strings with count, kind chip and source chip", () => {
  const items: TrayItem[] = KINDS.map((kind) => ({ kind, source: "health", ...(kind === "approvals_waiting" ? { count: 3 } : {}) }));
  render(<Tray items={items} />);
  const rows = screen.getAllByRole("listitem");
  expect(rows).toHaveLength(KINDS.length);
  rows.forEach((row, i) => {
    const kind = KINDS[i]!;
    const expected = kind === "approvals_waiting" ? "Friday: 3 approvals waiting" : FIXED.tray[kind];
    expect(row.querySelector(".tray-text")?.textContent).toBe(expected);
    const chips = [...row.querySelectorAll(".chip")].map((c) => c.textContent);
    expect(chips).toEqual([kind.replaceAll("_", " "), "health"]);
  });
});

test("bell shows the approvals and permissions counts", () => {
  const state = {
    ...initialState,
    approvals: [1, 2] as unknown as AppState["approvals"],
    permissions: [1] as unknown as AppState["permissions"],
  };
  topBar(state);
  const bell = screen.getByRole("button", { name: "Notifications Approvals 2 Permissions 1" });
  expect(within(bell).getByText("Approvals 2")).toBeTruthy();
  expect(within(bell).getByText("Permissions 1")).toBeTruthy();
  expect(bell.getAttribute("aria-controls")).toBeNull();
});

test("chat submit shows Preview: nothing was executed and the store is unchanged", async () => {
  const user = userEvent.setup();
  const transport = new MockTransport(loadScenarios()[0]!, BASE_VIEWS, { instant: true });
  const store = createStore(transport, transport);
  await vi.waitFor(() => expect(store.getState().done).toBe(true));
  const before = store.getState();
  const spy = vi.fn(store.act);
  render(<ChatLine state={before} request="What is due today?" onAct={spy} />);
  await user.click(screen.getByRole("button", { name: FIXED.chat.open }));
  await user.type(screen.getByLabelText(FIXED.chat.input), "hello");
  await user.click(screen.getByRole("button", { name: FIXED.chat.send }));
  expect((await screen.findByRole("status")).textContent).toBe("Preview: nothing was executed");
  expect(spy).toHaveBeenCalledWith({ kind: "send_message", text: "hello" });
  expect(store.getState()).toBe(before);
  store.dispose();
});

test("an empty submit shows a hint and a failing act still shows the preview status", async () => {
  const user = userEvent.setup();
  const failing = vi.fn(async () => {
    throw new Error("boom");
  });
  render(<ChatLine state={initialState} request={null} onAct={failing as unknown as SessionTransport["act"]} defaultOpen />);
  await user.click(screen.getByRole("button", { name: FIXED.chat.send }));
  expect(screen.getByRole("status").textContent).toBe(FIXED.chat.emptyHint);
  expect(failing).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText(FIXED.chat.input), "hi");
  await user.click(screen.getByRole("button", { name: FIXED.chat.send }));
  expect((await screen.findByText(FIXED.previewResult)).getAttribute("role")).toBe("status");
});

test("a tray row without a count uses a fixed string", () => {
  render(<Tray items={[{ kind: "approvals_waiting", source: "approvals" }]} />);
  expect(screen.getByText(FIXED.trayNoCount)).toBeTruthy();
});

test("an empty tray shows the fixed empty text", () => {
  render(<Tray items={[]} />);
  expect(screen.getByText(FIXED.chrome.trayEmpty)).toBeTruthy();
});

test("push-to-talk toggles aria-pressed by Space and makes no media call", async () => {
  const user = userEvent.setup();
  const spy = vi.fn(() => undefined);
  Object.defineProperty(navigator, "mediaDevices", { get: spy, configurable: true });
  render(<ChatLine state={initialState} request={null} onAct={act} defaultOpen />);
  const ptt = screen.getByRole("button", { name: FIXED.chat.pushToTalk });
  expect(ptt.getAttribute("aria-pressed")).toBe("false");
  ptt.focus();
  await user.keyboard("{ >}");
  expect(ptt.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText(FIXED.chat.listening)).toBeTruthy();
  await user.keyboard("{/ }");
  expect(ptt.getAttribute("aria-pressed")).toBe("false");
  await user.pointer({ keys: "[MouseLeft>]", target: ptt });
  expect(ptt.getAttribute("aria-pressed")).toBe("true");
  await user.pointer({ keys: "[/MouseLeft]", target: ptt });
  expect(ptt.getAttribute("aria-pressed")).toBe("false");
  expect(spy).not.toHaveBeenCalled();
});

test("push-to-talk ignores a secondary pointer button", async () => {
  const user = userEvent.setup();
  render(<ChatLine state={initialState} request={null} onAct={act} defaultOpen />);
  const ptt = screen.getByRole("button", { name: FIXED.chat.pushToTalk });
  await user.pointer({ keys: "[MouseRight>]", target: ptt });
  expect(ptt.getAttribute("aria-pressed")).toBe("false");
});

test("a repeat Space keydown does not toggle twice", () => {
  const onChange = vi.fn();
  render(<PushToTalk pressed={false} onChange={onChange} />);
  const ptt = screen.getByRole("button", { name: FIXED.chat.pushToTalk });
  fireEvent.keyDown(ptt, { key: " " });
  fireEvent.keyDown(ptt, { key: " ", repeat: true });
  fireEvent.keyDown(ptt, { key: " ", repeat: true });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith(true);
});

test("Escape closes the drawer and returns focus to its button", async () => {
  const user = userEvent.setup();
  render(<ChatLine state={initialState} request={null} onAct={act} />);
  const toggle = screen.getByRole("button", { name: FIXED.chat.open });
  await user.click(toggle);
  await user.click(screen.getByLabelText(FIXED.chat.input));
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("region", { name: FIXED.chat.region })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: FIXED.chat.open }));
});

test("Escape closes the settings menu and returns focus to its button", async () => {
  const user = userEvent.setup();
  topBar();
  const button = screen.getByRole("button", { name: FIXED.chrome.settings });
  await user.click(button);
  expect(button.getAttribute("aria-expanded")).toBe("true");
  await user.click(screen.getByLabelText(FIXED.motionLabel));
  await user.keyboard("{Escape}");
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(button);
});

test("clock renders HH:MM from nowMs with timeZone UTC", () => {
  topBar(initialState, { nowMs: Date.UTC(2026, 10, 24, 9, 5), timeZone: "UTC" });
  expect(screen.getByText("09:05")).toBeTruthy();
  expect(screen.getByText(FIXED.chrome.clock, { exact: false })).toBeTruthy();
});

test("the h1 text is exactly Friday", () => {
  topBar();
  const h1s = screen.getAllByRole("heading", { level: 1 });
  expect(h1s).toHaveLength(1);
  expect(h1s[0]!.textContent).toBe("Friday");
  expect(screen.getByText(FIXED.tagline).closest("h1")).toBeNull();
  expect(screen.getByText(FIXED.previewStatus)).toBeTruthy();
});
