import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { renderVisible } from "../src/views/markers";

test("every hidden class becomes a visible marker with line and byte counts", () => {
  const raw = "a\rb\tc\x1b[31m‮d​e pаssword";
  const v = renderVisible(raw);
  expect(v.segments.filter((s) => s.marker).map((s) => s.text)).toEqual(["[CR]", "[TAB]", "[ESC]", "[BIDI U+202E]", "[ZW U+200B]"]);
  expect(v.nonAscii).toBe(true);
  expect(v.bytes).toBe(new TextEncoder().encode(raw).length);
  expect(v.lines).toBe(1);
  expect(v.segments.map((s) => s.text).join("").includes("\r")).toBe(false);
});

test("other controls and invisible formats are marked", () => {
  const v = renderVisible("\x00\x7f\x85؜﻿⁦");
  expect(v.segments.map((s) => s.text)).toEqual(["[U+0000]", "[U+007F]", "[U+0085]", "[BIDI U+061C]", "[ZW U+FEFF]", "[BIDI U+2066]"]);
});

test("LF is a line break, not a marker", () => {
  const v = renderVisible("a\nb");
  expect(v.segments).toEqual([{ text: "a\nb", marker: false }]);
  expect(v.lines).toBe(2);
});

test("a code point above U+FFFF stays whole", () => {
  const v = renderVisible("a\u{1F600}b");
  expect(v.segments).toEqual([{ text: "a\u{1F600}b", marker: false }]);
  expect(v.bytes).toBe(6);
  expect(v.nonAscii).toBe(true);
});

test("empty string has 0 lines and 0 bytes", () => {
  expect(renderVisible("")).toEqual({ segments: [], lines: 0, bytes: 0, nonAscii: false, hidden: false });
});

const marked = (raw: string): string[] => renderVisible(raw).segments.filter((s) => s.marker).map((s) => s.text);

test.each([
  ["\u2028", "[U+2028]"],
  ["\u00ad", "[U+00AD]"],
  ["\u034f", "[U+034F]"],
  ["\u3164", "[U+3164]"],
  ["\u180e", "[U+180E]"],
  ["\ufe0f", "[U+FE0F]"],
  ["\u{E0041}", "[U+E0041]"],
  ["\ue000", "[U+E000]"],
  ["\ud800", "[U+D800]"],
  ["\ufffe", "[U+FFFE]"],
])("%j is marked as %s", (raw, label) => {
  expect(marked(`a${raw}b`)).toEqual([label]);
});

test("30 stacked combining marks become one marker; two stay plain", () => {
  expect(marked("a" + "\u0301".repeat(30))).toEqual(["[MARKS x30]"]);
  expect(marked("a" + "\u0301".repeat(2))).toEqual([]);
  expect(renderVisible("a" + "\u0301".repeat(30)).segments.map((s) => s.text).join("")).toBe("a[MARKS x30]");
});

test("U+2028 and U+2029 count as line breaks", () => {
  expect(renderVisible("a\u2028b\u2029c").lines).toBe(3);
});

test("ordinary text and astral emoji are not marked or split", () => {
  expect(marked("a \u00e9 \u0430 \u{1F600}")).toEqual([]);
  expect(renderVisible("\u{1F600}").segments).toEqual([{ text: "\u{1F600}", marker: false }]);
  expect(renderVisible("abc").nonAscii).toBe(false);
  expect(renderVisible("\u00e9").nonAscii).toBe(true);
  const hidden = renderVisible("\u200b");
  expect(hidden.hidden).toBe(true);
  expect(hidden.nonAscii).toBe(false);
});

test("raw text is forced to storage order", () => {
  const css = readFileSync(`${import.meta.dirname}/../src/styles/base.css`, "utf8");
  for (const sel of [".raw-value", ".visible-text"]) {
    const rule = css.split("\n").find((l) => l.startsWith(`${sel} {`) || l.startsWith(`${sel},`))!;
    expect(rule).toContain("unicode-bidi: bidi-override");
    expect(rule).toContain("direction: ltr");
  }
  expect(css).toMatch(/\.raw-marker \{ unicode-bidi: isolate/);
});

test.each(["\u00a0", "\u2000", "\u200a", "\u202f", "\u205f", "\u3000", "\u2800"])("space %j is marked", (sp) => {
  expect(marked(`a${sp}b`)).toHaveLength(1);
  expect(marked("a b")).toEqual([]);
});

test.each(["/etc\u2215passwd", "notes\uff0fx.md", "\uff11\uff12", "\u00e9", "e\u0301", "\u2024"])("look-alike %j sets nonAscii", (raw) => {
  expect(renderVisible(raw).nonAscii).toBe(true);
});
