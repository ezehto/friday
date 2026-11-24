import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { App } from "../src/app";
import { FIXED } from "../src/chrome/fixedText";
import { MockTransport } from "../src/transport/mock";

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

test("no scenario in the route shows the empty board", () => {
  render(<App />);
  expect(screen.getByText(FIXED.emptyBoard)).toBeTruthy();
  expect(document.querySelectorAll("[data-widget-id]").length).toBe(0);
});

test("selecting focus-today shows its widgets after the board step", async () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText(FIXED.switcher.scenario), { target: { value: "focus-today" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20000);
  });
  expect(document.querySelectorAll("[data-widget-id]").length).toBeGreaterThan(0);
  expect(document.body.dataset.scenarioDone).toBe("true");
});

test("switching scenario closes the previous transport and clears scenarioDone", async () => {
  const close = vi.spyOn(MockTransport.prototype, "close");
  render(<App />);
  await go("#/board?scenario=focus-today&instant=1");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(50);
  });
  expect(document.body.dataset.scenarioDone).toBe("true");
  const before = close.mock.calls.length;
  await go("#/board?scenario=standup&instant=1");
  expect(close.mock.calls.length).toBeGreaterThan(before);
  expect(document.body.dataset.scenarioDone).toBeUndefined();
  close.mockRestore();
});
