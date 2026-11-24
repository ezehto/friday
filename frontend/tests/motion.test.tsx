import { act, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ChartBlock } from "../src/blocks/Chart";
import { Core } from "../src/chrome/Core";
import { FIXED } from "../src/chrome/fixedText";
import type { ChartBlock as ChartBlockData, WidgetEnvelope } from "../src/generated/types";
import { motionReduced } from "../src/lib/motion";
import { initialState, type AppState } from "../src/store";
import { Board } from "../src/views/Board";
import { StyleGuide } from "../src/views/StyleGuide";

const css = (f: string) => readFileSync(join(import.meta.dirname, "../src", f), "utf8");
const NOW = "2026-11-24T09:00:00Z";
const env = (id: string): WidgetEnvelope =>
  ({ widget_id: id, source: "sample", as_of: NOW, data_class: "personal", title: `Panel ${id}`, blocks: [{ kind: "text", text: "Hi" }] }) as WidgetEnvelope;
const board = (ids: string[]): AppState => ({ ...initialState, board: ids.map(env) });

const tokens: Record<string, string> = {};
function stubComputed() {
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) => {
    const style = real(el, pseudo);
    return new Proxy(style, {
      get: (t, p) => (p === "getPropertyValue" ? (n: string) => tokens[n] ?? t.getPropertyValue(n) : Reflect.get(t, p)),
    });
  });
}
function reset() {
  for (const k of Object.keys(tokens)) delete tokens[k];
  delete document.documentElement.dataset.motion;
  delete document.documentElement.dataset.instant;
  vi.restoreAllMocks();
  vi.useRealTimers();
}
beforeEach(reset);
afterEach(reset);

function stubMatchMedia(reduce: boolean) {
  window.matchMedia = ((q: string) => ({ matches: reduce && q.includes("reduce"), media: q })) as typeof window.matchMedia;
}

test("every new --motion duration is 0s in both reduced blocks", () => {
  const t = css("styles/tokens.css");
  const names = ["--motion-state-duration", "--motion-exit-duration", "--motion-chart-draw-duration", "--motion-stagger"];
  const media = t.match(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*:root\s*\{([^}]*)\}/)![1]!;
  const attr = t.match(/:root\[data-motion="reduced"\]\s*\{([^}]*)\}/)![1]!;
  for (const n of names) {
    expect(t).toMatch(new RegExp(`${n}\\s*:\\s*[0-9.]+m?s;`));
    for (const block of [media, attr]) expect(block).toMatch(new RegExp(`${n}\\s*:\\s*0s\\s*;`));
  }
});

test("motionReduced is true under the media query and under data-motion=reduced", () => {
  stubMatchMedia(false);
  expect(motionReduced()).toBe(false);
  document.documentElement.dataset.motion = "reduced";
  expect(motionReduced()).toBe(true);
  delete document.documentElement.dataset.motion;
  stubMatchMedia(true);
  expect(motionReduced()).toBe(true);
});

test("a removed panel stays mounted for the exit duration, then unmounts", () => {
  vi.useFakeTimers();
  stubMatchMedia(false);
  stubComputed();
  tokens["--motion-exit-duration"] = "250ms";
  const { container, rerender } = render(<Board state={board(["a", "b"])} now={NOW} />);
  rerender(<Board state={board(["a"])} now={NOW} />);
  expect(container.querySelector('[data-widget-id="b"]')).toBeTruthy();
  expect(container.querySelector('[data-widget-id="b"]')!.closest(".board-item")!.hasAttribute("data-leaving")).toBe(true);
  act(() => void vi.advanceTimersByTime(249));
  expect(container.querySelector('[data-widget-id="b"]')).toBeTruthy();
  act(() => void vi.advanceTimersByTime(2));
  expect(container.querySelector('[data-widget-id="b"]')).toBeNull();
  expect(container.querySelector('[data-widget-id="a"]')).toBeTruthy();
});

test("under reduced motion a removed panel unmounts at once", () => {
  stubMatchMedia(true);
  stubComputed();
  tokens["--motion-exit-duration"] = "250ms";
  const { container, rerender } = render(<Board state={board(["a", "b"])} now={NOW} />);
  rerender(<Board state={board(["a"])} now={NOW} />);
  expect(container.querySelector('[data-widget-id="b"]')).toBeNull();
});

test("in instant mode a removed panel unmounts at once and no entry rule applies", () => {
  stubMatchMedia(false);
  stubComputed();
  tokens["--motion-exit-duration"] = "250ms";
  document.documentElement.dataset.instant = "1";
  const { container, rerender } = render(<Board state={board(["a", "b"])} now={NOW} />);
  rerender(<Board state={board(["a"])} now={NOW} />);
  expect(container.querySelector('[data-widget-id="b"]')).toBeNull();
  const base = css("styles/base.css");
  expect(base).toMatch(/html\[data-instant\] \.hud-frame\s*\{\s*animation:\s*none/);
  // Every entry animation added for motion sits behind :not([data-instant]).
  const second = base.slice(base.lastIndexOf("@media (prefers-reduced-motion: no-preference) {")).replace(/\/\*[^]*?\*\//g, "");
  for (const rule of second.split("}")) {
    if (!/animation:\s*(item-in|chart-|bar-grow|meter-grow|fade-in)/.test(rule)) continue;
    for (const sel of rule.slice(0, rule.indexOf("{")).split(",")) {
      if (!/core|pill/.test(sel)) expect(sel.trim()).toContain(":not([data-instant])");
    }
  }
});

test("a core state change does not restart the ring animation", () => {
  stubMatchMedia(false);
  stubComputed();
  const ring = () => ({ animationName: "core-spin", playbackRate: 1, cancel: vi.fn(), updatePlaybackRate: vi.fn() });
  const anims = [ring(), ring(), { ...ring(), animationName: "core-pulse" }];
  Object.defineProperty(SVGElement.prototype, "getAnimations", { configurable: true, value: () => anims });
  tokens["--core-speed"] = "1";
  const { rerender } = render(<Core state="idle" size="full" />);
  tokens["--core-speed"] = "0.2";
  rerender(<Core state="thinking" size="full" />);
  expect(anims[0]!.playbackRate).toBeCloseTo(5);
  expect(anims[1]!.playbackRate).toBeCloseTo(5);
  expect(anims[2]!.playbackRate).toBe(1);
  expect(anims[0]!.cancel).not.toHaveBeenCalled();
  delete (SVGElement.prototype as { getAnimations?: unknown }).getAnimations;
});

const bar = (ys: number[]): ChartBlockData => ({ kind: "chart", chart: "bar", series: [{ name: "A", points: ys.map((y, i) => ({ x: `x${i}`, y })) }] });

test("chart bars scale from the zero line", () => {
  const { container } = render(<ChartBlock block={bar([4, -2, 6])} />);
  const bars = [...container.querySelectorAll<SVGRectElement>("rect.chart-bar")];
  expect(bars).toHaveLength(3);
  const zero = container.querySelector<SVGLineElement>(".chart-axes line")!.getAttribute("y1")!;
  for (const b of bars) expect(b.style.transformOrigin).toBe(`0px ${zero}px`);
});

test("line, area and donut marks carry draw-in hooks", () => {
  const mk = (chart: ChartBlockData["chart"]): ChartBlockData => ({ kind: "chart", chart, series: [{ name: "A", points: [{ x: "a", y: 1 }, { x: "b", y: 3 }] }] });
  expect(render(<ChartBlock block={mk("line")} />).container.querySelector("path.chart-line[pathLength='1']")).toBeTruthy();
  const area = render(<ChartBlock block={mk("area")} />).container;
  expect(area.querySelector("path.chart-line")).toBeTruthy();
  expect(area.querySelector("path.chart-area-fill")).toBeTruthy();
  expect(render(<ChartBlock block={mk("donut")} />).container.querySelector(".chart-slice[pathLength='1']")).toBeTruthy();
});

test("the style guide Motion section has a Replay button", () => {
  const { container } = render(<StyleGuide />);
  const section = container.querySelector("#sg-motion")!.closest("section")!;
  expect([...section.querySelectorAll("button")].some((b) => b.textContent === FIXED.styleGuide.replay)).toBe(true);
  expect(container.querySelectorAll("h1")).toHaveLength(1);
});

test("the app marks the page instant only for ?instant=1", async () => {
  const { App } = await import("../src/app");
  window.location.hash = "#/board?scenario=focus-today&instant=1";
  const first = render(<App />);
  expect(document.documentElement.dataset.instant).toBe("1");
  first.unmount();
  expect(document.documentElement.dataset.instant).toBeUndefined();
  window.location.hash = "#/board?scenario=focus-today";
  render(<App />);
  expect(document.documentElement.dataset.instant).toBeUndefined();
});
