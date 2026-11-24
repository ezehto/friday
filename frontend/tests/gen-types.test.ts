import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("no duplicate numbered type names", () => {
  const types = readFileSync(resolve(import.meta.dirname, "../src/generated/types.ts"), "utf8");
  expect(types).not.toMatch(/export (type|interface) [A-Z]\w*\d\b/);
});

it("array caps generate plain arrays, not tuples", () => {
  const lines = readFileSync(resolve(import.meta.dirname, "../src/generated/types.ts"), "utf8").split("\n");
  expect(lines.filter((l) => /\|\s*\[\]|\[\] \|/.test(l))).toEqual([]);
  // A plain-array build is a few hundred lines; the tuple build was 47,824.
  expect(lines.length).toBeLessThan(1500);
});
