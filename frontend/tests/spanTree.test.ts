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

test("a cycle and duplicate ids visit each span once", () => {
  const tree = buildSpanTree([span("x", "y"), span("y", "x"), span("x", null)]);
  const all: string[] = [];
  const walk = (n: { span_id: string; children: { span_id: string; children: unknown[] }[] }): void => { all.push(n.span_id); n.children.forEach((c) => walk(c as never)); };
  tree.forEach((n) => walk(n));
  expect(all.sort()).toEqual(["x", "y"]);
});
