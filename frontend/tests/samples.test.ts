import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Block, SampleSet } from "../src/generated/types";
import { RECIPE_BLOCKS } from "../src/mocks/recipeTable";
import { validateAgainst } from "./helpers/schema";

const read = (path: string) => readFileSync(resolve(import.meta.dirname, path), "utf8");
const text = read("../src/mocks/samples.json");
const samples = JSON.parse(text) as SampleSet;
const MOCK = "https://friday.invalid/frontend/src/mocks/mock.schema.json";
const widgetTypes = (JSON.parse(read("../../schema/widgets/widget.schema.json")) as { oneOf: { $ref: string }[] }).oneOf.map((r) =>
  r.$ref.replace(".schema.json", ""),
);

describe("samples", () => {
  it("samples.json validates against SampleSet", () => {
    expect(validateAgainst(`${MOCK}#/$defs/SampleSet`, samples)).toEqual([]);
  });

  it("a text cut by the cut rule ends in … and is exactly at the block cap", () => {
    const cuts: string[] = [];
    const caps = { chips: { label: 60 }, rows: { label: 80 }, facts: { value: 80 } } as const;
    for (const { envelope } of samples.items)
      for (const block of envelope.blocks as Block[]) {
        if (block.kind !== "chips" && block.kind !== "rows" && block.kind !== "facts") continue;
        const field = Object.keys(caps[block.kind])[0] as "label" | "value";
        for (const item of block.items as Record<string, string>[]) {
          const s = item[field] ?? "";
          if (s.endsWith("…")) {
            cuts.push(block.kind);
            expect(s.length).toBe(caps[block.kind][field as never]);
          }
        }
      }
    expect(new Set(cuts)).toEqual(new Set(["chips", "rows", "facts"]));
  });

  it("every widget type schema has exactly one sample", () => {
    expect(samples.items.map((i) => i.widget.type).sort()).toEqual([...widgetTypes].sort());
    expect(Object.keys(RECIPE_BLOCKS).sort()).toEqual([...widgetTypes].sort());
  });

  it("each sample widget validates against its own type schema", () => {
    for (const { widget } of samples.items)
      expect(validateAgainst(`https://friday.invalid/schema/widgets/${widget.type}.schema.json`, widget), widget.type).toEqual([]);
  });

  it("each sample envelope's block kinds equal RECIPE_BLOCKS[type] in order, where only optional entries may be missing", () => {
    for (const { widget, envelope } of samples.items) {
      const recipe = RECIPE_BLOCKS[widget.type];
      const kinds = (envelope.blocks as Block[]).map((b) => b.kind);
      let j = 0;
      for (const r of recipe) {
        if (kinds[j] === r.kind) j++;
        else expect(r.optional, `${widget.type}: ${r.kind} missing`).toBe(true);
      }
      expect(j, widget.type).toBe(kinds.length);
    }
  });

  it("every envelope has source sample and a title equal to the widget title", () => {
    for (const { widget, envelope } of samples.items) {
      expect(envelope.source).toBe("sample");
      expect(widget.title).toBeTruthy();
      expect(envelope.title).toBe(widget.title);
    }
  });

  it("every as_of is within 24 hours before now", () => {
    const now = Date.parse(samples.now);
    for (const { envelope } of samples.items) expect(now - Date.parse(envelope.as_of)).toBeLessThanOrEqual(24 * 3600_000);
  });

  it("all text is synthetic: no string contains an address other than example.com, example.org or github.com/example", () => {
    const urls = text.match(/https?:\/\/[^\s"\\]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toMatch(/^https?:\/\/(example\.com|example\.org|github\.com\/example)(\/|$)/);
  });
});
