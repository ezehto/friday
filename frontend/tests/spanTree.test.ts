import { expect, test } from "vitest";
import type { SpanView } from "../src/generated/types";
import { buildSpanTree } from "../src/views/spanTree";

const span = (id: string, parent: string | null): SpanView => ({ span_id: id, parent_span_id: parent, name: id, kind: "request", duration_ms: 1, status: "ok" });
const ids = (n: { span_id: string; children: unknown[] }[]): string[] => n.map((x) => x.span_id);

test("nests children under parents in input order", () => {
  const tree = buildSpanTree([span("a", null), span("c", "a"), span("b", "a"), span("d", "c")]);
  expect(ids(tree)).toEqual(["a"]);
  expect(ids(tree[0]!.children)).toEqual(["c", "b"]);
  expect(ids(tree[0]!.children[0]!.children)).toEqual(["d"]);
});

test("an orphan and a self-parented span become roots", () => {
  expect(ids(buildSpanTree([span("a", null), span("o", "missing"), span("s", "s")]))).toEqual(["a", "o", "s"]);
});

test("a duplicate id keeps the first span", () => {
  const tree = buildSpanTree([{ ...span("d", null), name: "first" }, { ...span("d", null), name: "second" }]);
  expect(tree).toHaveLength(1);
  expect(tree[0]!.name).toBe("first");
});

test("a 200-span chain builds one deep branch", () => {
  const chain = Array.from({ length: 200 }, (_, i) => span(`n${i}`, i === 0 ? null : `n${i - 1}`));
  let node = buildSpanTree(chain)[0]!;
  let depth = 1;
  while (node.children[0]) { node = node.children[0]; depth++; }
  expect(depth).toBe(200);
});

test("a cycle visits each span once", () => {
  const tree = buildSpanTree([span("x", "y"), span("y", "x")]);
  const all: string[] = [];
  const walk = (n: { span_id: string; children: { span_id: string; children: unknown[] }[] }): void => { all.push(n.span_id); n.children.forEach((c) => walk(c as never)); };
  tree.forEach((n) => walk(n));
  expect(all.sort()).toEqual(["x", "y"]);
});
