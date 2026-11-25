import type { SpanView } from "../generated/types";

export type SpanNode = SpanView & { children: SpanNode[] };

/** Roots have no parent, a missing parent or themselves as parent. Each span is visited once, so cycles end. */
export function buildSpanTree(spans: SpanView[]): SpanNode[] {
  const byId = new Map<string, SpanView>();
  for (const s of spans) if (!byId.has(s.span_id)) byId.set(s.span_id, s);
  const kids = new Map<string, SpanView[]>();
  const roots: SpanView[] = [];
  for (const s of byId.values()) {
    const p = s.parent_span_id;
    if (p === null || p === s.span_id || !byId.has(p)) roots.push(s);
    else kids.set(p, [...(kids.get(p) ?? []), s]);
  }
  const seen = new Set<string>();
  const build = (s: SpanView): SpanNode => {
    seen.add(s.span_id);
    return { ...s, children: (kids.get(s.span_id) ?? []).filter((c) => !seen.has(c.span_id)).map(build) };
  };
  const tree = roots.map(build);
  // A cycle has no root: the first unvisited span of each one becomes a root.
  for (const s of byId.values()) if (!seen.has(s.span_id)) tree.push(build(s));
  return tree;
}
