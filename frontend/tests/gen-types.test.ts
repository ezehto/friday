import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("no duplicate numbered type names", () => {
  const types = readFileSync(resolve(import.meta.dirname, "../src/generated/types.ts"), "utf8");
  expect(types).not.toMatch(/export (type|interface) [A-Z]\w*\d\b/);
});
