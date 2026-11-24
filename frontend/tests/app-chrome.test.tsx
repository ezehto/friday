import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { App } from "../src/app";
import { FIXED } from "../src/chrome/fixedText";
import { MockTransport } from "../src/transport/mock";

// Fails any render that reads a store after it was disposed.
vi.mock("../src/store", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/store")>();
  const disposed = new WeakSet<object>();
  const patched = new WeakSet<object>();
  return {
    ...real,
    useStore: ((store: ReturnType<typeof real.createStore>, select: never) => {
      if (!patched.has(store)) {
        patched.add(store);
        const dispose = store.dispose;
        store.dispose = () => {
          disposed.add(store);
          dispose();
        };
      }
      if (disposed.has(store)) throw new Error("rendered with a disposed store");
      return real.useStore(store, select);
    }) as typeof real.useStore,
  };
});

beforeEach(() => {
  vi.useFakeTimers();
  window.location.hash = "";
});
afterEach(() => {
  vi.useRealTimers();
  window.location.hash = "";
  delete document.body.dataset.scenarioDone;
});

const go = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
const settle = (ms = 50) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
const widgets = () => document.querySelectorAll("[data-widget-id]").length;

test("nav links keep the scenario and instant", async () => {
  window.location.hash = "#/board?scenario=focus-today&instant=1";
  render(<App />);
  const nav = screen.getByRole("navigation", { name: FIXED.chrome.navLabel });
  const hrefs = [...nav.querySelectorAll("a")].map((a) => a.getAttribute("href"));
  expect(hrefs).toContain("#/approvals?scenario=focus-today&instant=1");
  expect(hrefs).toContain("#/board?scenario=focus-today&instant=1");
});

test("the page has one h1 on the board and on the style guide", async () => {
  render(<App />);
  expect(document.querySelectorAll("h1").length).toBe(1);
  await go("#/style-guide");
  expect(document.querySelectorAll("h1").length).toBe(1);
});

test("navigating between views keeps the scenario running", async () => {
  const close = vi.spyOn(MockTransport.prototype, "close");
  window.location.hash = "#/board?scenario=focus-today&instant=1";
  render(<App />);
  await settle();
  const count = widgets();
  expect(count).toBeGreaterThan(0);
  expect(document.body.dataset.scenarioDone).toBe("true");
  const before = close.mock.calls.length;
  await go("#/approvals?scenario=focus-today&instant=1");
  await go("#/board?scenario=focus-today&instant=1");
  expect(close.mock.calls.length).toBe(before);
  expect(widgets()).toBe(count);
  expect(document.body.dataset.scenarioDone).toBe("true");
  close.mockRestore();
});

test("a scenario switch and a restart never render a disposed store", async () => {
  render(<App />);
  await go("#/board?scenario=focus-today&instant=1");
  await settle();
  await go("#/board?scenario=standup&instant=1");
  await settle();
  act(() => screen.getByRole("button", { name: FIXED.switcher.restart }).click());
  await settle();
  expect(widgets()).toBeGreaterThan(0);
});

test("scenarioDone is cleared on unmount", async () => {
  window.location.hash = "#/board?scenario=focus-today&instant=1";
  const { unmount } = render(<App />);
  await settle();
  expect(document.body.dataset.scenarioDone).toBe("true");
  unmount();
  expect(document.body.dataset.scenarioDone).toBeUndefined();
});

test("the clock ticks and its interval is cleared on unmount", async () => {
  vi.setSystemTime(new Date("2026-11-24T09:00:00Z"));
  const { unmount } = render(<App />);
  const before = document.querySelector("time")!.getAttribute("datetime");
  await settle(60_000);
  expect(document.querySelector("time")!.getAttribute("datetime")).not.toBe(before);
  expect(vi.getTimerCount()).toBeGreaterThan(0);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

test("holding push-to-talk shows the listening core and releasing restores the scenario state", async () => {
  window.location.hash = "#/board?scenario=focus-today&instant=1";
  render(<App />);
  await settle();
  const core = (): string | undefined => document.querySelector<SVGElement>(".core-full")?.dataset.coreState;
  const before = core();
  expect(before).not.toBe("listening");
  fireEvent.click(screen.getByRole("button", { name: FIXED.chat.open }));
  const ptt = screen.getByRole("button", { name: FIXED.chat.pushToTalk });
  fireEvent.keyDown(ptt, { key: " " });
  expect(core()).toBe("listening");
  expect(document.querySelector(".status-pill")?.textContent).toContain(FIXED.core.listening.pill);
  fireEvent.keyUp(ptt, { key: " " });
  expect(core()).toBe(before);
});
