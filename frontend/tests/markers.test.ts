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
  expect(renderVisible("")).toEqual({ segments: [], lines: 0, bytes: 0, nonAscii: false });
});
