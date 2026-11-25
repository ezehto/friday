import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FIXED } from "../src/chrome/fixedText";
import type { WidgetEnvelope } from "../src/generated/types";
import { initialState, type AppState } from "../src/store";
import { Board, splitColumns } from "../src/views/Board";

const NOW = "2026-11-24T09:00:00Z";
const env = (id: string): WidgetEnvelope => ({
  widget_id: id,
  source: "sample",
  as_of: NOW,
  data_class: "personal",
  title: `Panel ${id}`,
  blocks: [{ kind: "text", text: "Hello" }],
}) as WidgetEnvelope;
const withBoard = (board: WidgetEnvelope[], extra: Partial<AppState> = {}): AppState => ({ ...initialState, board, ...extra });

test("splitColumns alternates left and right, keeping order", () => {
  const b = [0, 1, 2, 3, 4].map((i) => env(`w${i}`));
  const { left, right } = splitColumns(b);
  expect(left.map((e) => e.widget_id)).toEqual(["w0", "w2", "w4"]);
  expect(right.map((e) => e.widget_id)).toEqual(["w1", "w3"]);
});

test("renders at most 12 panels and keeps the core mounted", () => {
  const b = Array.from({ length: 13 }, (_, i) => env(`w${i}`));
  const { container } = render(<Board state={withBoard(b)} now={NOW} />);
  expect(container.querySelectorAll("[data-widget-id]").length).toBe(12);
  expect(container.querySelector(".core-full")).toBeTruthy();
});

test("empty and loading texts", () => {
  const { rerender } = render(<Board state={withBoard([])} now={NOW} />);
  expect(screen.getByText(FIXED.emptyBoard)).toBeTruthy();
  rerender(<Board state={withBoard([], { requestOpen: true })} now={NOW} />);
  expect(screen.getByText(FIXED.loadingBoard)).toBeTruthy();
  expect(screen.queryByText(FIXED.emptyBoard)).toBeNull();
  // A busy core means a request is in progress even before request.started arrives.
  rerender(<Board state={withBoard([], { core: "thinking" })} now={NOW} />);
  expect(screen.getByText(FIXED.loadingBoard)).toBeTruthy();
  expect(screen.queryByText(FIXED.emptyBoard)).toBeNull();
});

test("a broken envelope leaves its neighbours and the core standing", () => {
  const bad = null as unknown as WidgetEnvelope;
  const b = [env("a"), bad, env("c")];
  const { container } = render(<Board state={withBoard(b)} now={NOW} />);
  expect(container.querySelectorAll("[data-widget-id]").length).toBe(2);
  expect(screen.getByText(FIXED.panelFailed)).toBeTruthy();
  expect(container.querySelector(".core-full")).toBeTruthy();
});

test("board panels use level 2 headings", () => {
  render(<Board state={withBoard([env("a")])} now={NOW} />);
  expect(screen.getByRole("heading", { level: 2, name: "Panel a" })).toBeTruthy();
});
