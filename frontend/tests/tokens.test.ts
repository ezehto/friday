import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { contrastRatio, hueDistance, parseTokens } from "../src/styles/contrast";

const css = readFileSync(join(import.meta.dirname, "../src/styles/tokens.css"), "utf8");
const t = parseTokens(css);

const required = [
  "bg-canvas", "bg-panel", "bg-raised",
  "accent-primary", "accent-primary-strong", "accent-primary-dim",
  "accent-secondary", "accent-secondary-dim",
  "text-primary", "text-secondary", "text-muted", "text-on-accent",
  "line-grid", "line-blueprint", "line-panel-border", "line-corner-bracket",
  "glow-color", "glow-radius", "glow-strength",
  "tone-good", "tone-bad", "tone-attention", "tone-neutral",
  "tone-good-bg", "tone-bad-bg", "tone-attention-bg", "tone-neutral-bg",
  "focus-ring",
  "series-1", "series-2", "series-3", "series-4", "series-5",
  "font-body", "font-label", "size-label", "size-body", "size-value", "tracking-label",
  "motion-ring-duration", "motion-pulse-duration", "motion-panel-entry-duration", "motion-easing",
];
const v = (name: string) => t[`--${name}`]!;
const grounds = ["bg-canvas", "bg-panel", "bg-raised"];
const tones = ["tone-good", "tone-bad", "tone-attention", "tone-neutral"];

test("every listed token name is defined", () => {
  for (const name of required) expect(t[`--${name}`], name).toBeTruthy();
});

test("readable colours have at least 4.5:1 against every background", () => {
  const fgs = ["text-primary", "text-secondary", "text-muted", "accent-primary", "accent-secondary", ...tones];
  for (const fg of fgs)
    for (const bg of grounds)
      expect(contrastRatio(v(fg), v(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
});

test("text-on-accent has 4.5:1 on accent-primary", () => {
  expect(contrastRatio(v("text-on-accent"), v("accent-primary"))).toBeGreaterThanOrEqual(4.5);
});

test("focus-ring has 3:1 on bg-canvas and bg-panel", () => {
  for (const bg of ["bg-canvas", "bg-panel"])
    expect(contrastRatio(v("focus-ring"), v(bg)), bg).toBeGreaterThanOrEqual(3);
});

test("text-primary has 4.5:1 on each tone background", () => {
  for (const tone of tones)
    expect(contrastRatio(v("text-primary"), v(`${tone}-bg`)), tone).toBeGreaterThanOrEqual(4.5);
});

test("tone-attention differs from accent-primary by at least 20 degrees of hue", () => {
  expect(hueDistance(v("tone-attention"), v("accent-primary"))).toBeGreaterThanOrEqual(20);
});

test("every --motion duration is redefined to 0s in both reduced-motion blocks", () => {
  const durations = Object.keys(t).filter((k) => k.startsWith("--motion-") && k.endsWith("-duration"));
  expect(durations.length).toBe(3);
  const media = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*:root\s*\{([^}]*)\}/);
  const attr = css.match(/:root\[data-motion="reduced"\]\s*\{([^}]*)\}/);
  for (const block of [media, attr]) {
    expect(block).not.toBeNull();
    for (const d of durations)
      expect(block![1]).toMatch(new RegExp(`${d}\\s*:\\s*0s\\s*;`));
  }
});
