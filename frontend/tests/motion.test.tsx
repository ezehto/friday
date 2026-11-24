import { act, render } from "@testing-library/react";
import { StatusPill } from "../src/chrome/StatusPill";
import { coreLabels } from "../src/chrome/coreStates";
import type { VoiceLevelSource } from "../src/transport/types";
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

const flush = () => act(async () => void (await Promise.resolve()));
function ringAnims() {
  const mk = (animationName: string) => ({ animationName, playbackRate: 1, cancel: vi.fn() });
  const anims = [mk("core-spin"), mk("core-spin"), mk("core-pulse")];
  Object.defineProperty(SVGElement.prototype, "getAnimations", { configurable: true, value: () => anims });
  return anims;
}
const noAnims = () => delete (SVGElement.prototype as { getAnimations?: unknown }).getAnimations;

test("the pill's accessible text is only the current label during the cross-fade", () => {
  stubMatchMedia(false);
  stubComputed();
  tokens["--motion-state-duration"] = "600ms";
  const { container, rerender } = render(<StatusPill state="idle" />);
  rerender(<StatusPill state="error" />);
  const pill = container.querySelector(".status-pill")!;
  expect(pill.querySelector(".pill-ghost")?.getAttribute("aria-hidden")).toBe("true");
  expect(pill.querySelector(".pill-ghost")?.textContent).toBe(coreLabels("idle").pill);
  const readable = [...pill.children].filter((c) => c.getAttribute("aria-hidden") !== "true").map((c) => c.textContent).join("");
  expect(readable).toBe(coreLabels("error").pill);
  expect(css("styles/base.css")).not.toContain("attr(data-ghost)");
});

test("voice parts keep data-live and the level for the state duration after the state leaves", () => {
  vi.useFakeTimers();
  stubMatchMedia(false);
  stubComputed();
  tokens["--motion-state-duration"] = "600ms";
  const listeners = new Set<(v: number) => void>();
  const source: VoiceLevelSource = { onLevel: (l) => (listeners.add(l), () => void listeners.delete(l)) };
  const { container, rerender, unmount } = render(<Core state="speaking" size="full" level={source} />);
  const el = container.querySelector(".core") as SVGElement;
  act(() => listeners.forEach((l) => l(0.5)));
  act(() => listeners.forEach((l) => l(0))); // the source drops to 0 as the state leaves
  rerender(<Core state="thinking" size="full" level={source} />);
  act(() => listeners.forEach((l) => l(0)));
  expect(el.getAttribute("data-live")).toBe("true");
  expect(el.style.getPropertyValue("--voice-level")).toBe("0.5"); // held while the parts fade out
  act(() => void vi.advanceTimersByTime(599));
  expect(el.hasAttribute("data-live")).toBe(true);
  act(() => void vi.advanceTimersByTime(2));
  expect(el.hasAttribute("data-live")).toBe(false);
  expect(el.style.getPropertyValue("--voice-level")).toBe("");
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

test("under reduced motion the voice parts clear at once", () => {
  vi.useFakeTimers();
  stubMatchMedia(true);
  stubComputed();
  tokens["--motion-state-duration"] = "600ms";
  const source: VoiceLevelSource = { onLevel: () => () => undefined };
  const { container, rerender } = render(<Core state="speaking" size="full" level={source} />);
  rerender(<Core state="thinking" size="full" level={source} />);
  expect((container.querySelector(".core") as SVGElement).hasAttribute("data-live")).toBe(false);
});

test("the voice rules key on data-live and fade through the gates", () => {
  const b = css("styles/base.css");
  expect(b).not.toMatch(/data-core-state="(listening|speaking)"\]\[data-live\] \.core-(ripple|halo|pulse|contract)/);
  expect(b).toMatch(/\.core\[data-live\] \.core-ripple[^}]*var\(--gate-l\)/);
  expect(b).toMatch(/\.core\[data-live\] \.core-halo[^}]*var\(--gate-s\)/);
});

test("a changed bar value remounts its bar so bar-grow replays", () => {
  const { container, rerender } = render(<ChartBlock block={bar([4, 2])} />);
  const first = container.querySelectorAll("rect.chart-bar")[0];
  rerender(<ChartBlock block={bar([4, 2])} />);
  expect(container.querySelectorAll("rect.chart-bar")[0]).toBe(first);
  rerender(<ChartBlock block={bar([5, 2])} />);
  expect(container.querySelectorAll("rect.chart-bar")[0]).not.toBe(first);
  expect(container.querySelectorAll("rect.chart-bar")[1]).toBe(container.querySelectorAll("rect.chart-bar")[1]);
});

test("a later board change does not extend a leaving panel's exit", () => {
  vi.useFakeTimers();
  stubMatchMedia(false);
  stubComputed();
  tokens["--motion-exit-duration"] = "250ms";
  const { container, rerender } = render(<Board state={board(["a", "b", "c"])} now={NOW} />);
  rerender(<Board state={board(["a", "c"])} now={NOW} />);
  act(() => void vi.advanceTimersByTime(100));
  rerender(<Board state={{ ...board(["a", "c"]), core: "thinking" }} now={NOW} />);
  rerender(<Board state={board(["a", "c", "d"])} now={NOW} />);
  act(() => void vi.advanceTimersByTime(149));
  expect(container.querySelector('[data-widget-id="b"]')).toBeTruthy();
  act(() => void vi.advanceTimersByTime(2));
  expect(container.querySelector('[data-widget-id="b"]')).toBeNull();
  expect(container.querySelector('[data-widget-id="d"]')).toBeTruthy();
});

test("the 12 panel cap holds while panels exit", () => {
  vi.useFakeTimers();
  stubMatchMedia(false);
  stubComputed();
  tokens["--motion-exit-duration"] = "250ms";
  const ids = (p: string) => Array.from({ length: 12 }, (_, i) => `${p}${i}`);
  const { container, rerender } = render(<Board state={board(ids("o"))} now={NOW} />);
  rerender(<Board state={board(ids("n"))} now={NOW} />);
  expect(container.querySelectorAll("[data-widget-id]").length).toBeLessThanOrEqual(12);
  rerender(<Board state={board(ids("n").slice(0, 6))} now={NOW} />);
  expect(container.querySelectorAll("[data-widget-id]").length).toBeLessThanOrEqual(12);
});

test("the ring rate eases through an intermediate value, then settles", () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance", "Date"] });
  stubMatchMedia(false);
  stubComputed();
  tokens["--motion-state-duration"] = "600ms";
  const anims = ringAnims();
  tokens["--core-speed"] = "1";
  const { rerender } = render(<Core state="idle" size="full" />);
  tokens["--core-speed"] = "0.2";
  rerender(<Core state="thinking" size="full" />);
  act(() => void vi.advanceTimersByTime(300));
  expect(anims[0]!.playbackRate).toBeGreaterThan(1.2);
  expect(anims[0]!.playbackRate).toBeLessThan(4.8);
  act(() => void vi.advanceTimersByTime(400));
  expect(anims[0]!.playbackRate).toBeCloseTo(5);
  noAnims();
});

test("reduce on, a state change, then reduce off leaves the rate of the current state", async () => {
  stubMatchMedia(false);
  stubComputed();
  const anims = ringAnims();
  tokens["--core-speed"] = "1";
  const { rerender } = render(<Core state="idle" size="full" />);
  document.documentElement.dataset.motion = "reduced";
  await flush();
  tokens["--core-speed"] = "0.5";
  rerender(<Core state="transcribing" size="full" />);
  expect(anims[0]!.playbackRate).toBeCloseTo(2);
  delete document.documentElement.dataset.motion;
  await flush();
  expect(anims[0]!.playbackRate).toBeCloseTo(2);
  noAnims();
});

test("panels glide only when the order or identity changes", () => {
  stubMatchMedia(false);
  stubComputed();
  tokens["--motion-state-duration"] = "600ms";
  const animate = vi.fn(() => ({}));
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const all = [...document.querySelectorAll("[data-flip]")];
    const top = all.indexOf(this) * 100;
    return { left: 0, top, right: 10, bottom: top + 50, width: 10, height: 50, x: 0, y: top, toJSON: () => ({}) };
  });
  const { rerender } = render(<Board state={board(["a", "b", "c"])} now={NOW} />);
  expect(animate).not.toHaveBeenCalled();
  rerender(<Board state={board(["b", "a", "c"])} now={NOW} />);
  expect(animate).toHaveBeenCalled();
  animate.mockClear();
  rerender(<Board state={{ ...board(["b", "a", "c"]), core: "thinking" }} now={NOW} />);
  expect(animate).not.toHaveBeenCalled();
  delete (HTMLElement.prototype as { animate?: unknown }).animate;
});

test("a ring that starts later gets the state's rate (core shown after a resize)", () => {
  stubMatchMedia(false);
  stubComputed();
  tokens["--core-speed"] = "0.5";
  const anims: { animationName: string; playbackRate: number; cancel: () => void }[] = [];
  Object.defineProperty(SVGElement.prototype, "getAnimations", { configurable: true, value: () => anims });
  const { container } = render(<Core state="thinking" size="full" />);
  // The core was display:none, so no ring existed when the rate effect ran.
  anims.push({ animationName: "core-spin", playbackRate: 1, cancel: vi.fn() });
  const event = new Event("animationstart");
  Object.defineProperty(event, "animationName", { value: "core-spin" });
  container.querySelector(".core")!.dispatchEvent(event);
  expect(anims[0]!.playbackRate).toBeCloseTo(2);
  noAnims();
});

test("instant mode eases nothing: ring rate and labels change at once", () => {
  vi.useFakeTimers();
  stubMatchMedia(false);
  stubComputed();
  document.documentElement.dataset.instant = "1";
  tokens["--motion-state-duration"] = "600ms";
  const anims = ringAnims();
  tokens["--core-speed"] = "1";
  const { container, rerender } = render(<Core state="idle" size="full" />);
  tokens["--core-speed"] = "0.2";
  rerender(<Core state="thinking" size="full" />);
  expect(anims[0]!.playbackRate).toBeCloseTo(5);
  expect(container.querySelector(".core-disc-ghost")).toBeNull();
  noAnims();
});

test("a held voice level is cleared when the hook turns active again", () => {
  vi.useFakeTimers();
  stubMatchMedia(false);
  stubComputed();
  tokens["--motion-state-duration"] = "600ms";
  const listeners = new Set<(v: number) => void>();
  const source: VoiceLevelSource = { onLevel: (l) => (listeners.add(l), () => void listeners.delete(l)) };
  const { container, rerender } = render(<Core state="speaking" size="full" level={source} />);
  const el = container.querySelector(".core") as SVGElement;
  act(() => listeners.forEach((l) => l(0.7)));
  rerender(<Core state="idle" size="full" level={source} />);
  expect(el.style.getPropertyValue("--voice-level")).toBe("0.7");
  rerender(<Core state="listening" size="full" level={source} />);
  expect(el.style.getPropertyValue("--voice-level")).toBe("");
});
