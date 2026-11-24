import type { ChartBlock } from "../generated/types";

type Series = ChartBlock["series"];

export const safe = (v: number): number => (Number.isFinite(v) ? v : 0);

export function scale(v: number, d0: number, d1: number, r0: number, r1: number): number {
  const span = d1 - d0;
  if (!Number.isFinite(span) || span === 0) return (r0 + r1) / 2;
  const out = r0 + ((safe(v) - d0) / span) * (r1 - r0);
  return Number.isFinite(out) ? out : (r0 + r1) / 2;
}

export function yDomain(series: Series): [number, number] {
  let min = 0;
  let max = 0;
  for (const s of series) {
    for (const p of s.points) {
      const y = safe(p.y);
      if (y < min) min = y;
      if (y > max) max = y;
    }
  }
  return min === max ? [min - 1, max + 1] : [min, max];
}

export function xCategories(series: Series): string[] {
  const seen = new Set<string>();
  for (const s of series) for (const p of s.points) seen.add(p.x);
  return [...seen];
}

/** start and end are fractions of a full turn, 0 to 1. */
export function donutSlices(series: Series): { name: string; value: number; start: number; end: number }[] {
  const pts = (series[0]?.points ?? []).map((p) => ({ name: p.x, value: Math.max(0, safe(p.y)) }));
  const total = pts.reduce((a, p) => a + p.value, 0);
  if (!(total > 0) || !Number.isFinite(total)) return [];
  let acc = 0;
  return pts
    .filter((p) => p.value > 0)
    .map((p) => {
      const start = acc / total;
      acc += p.value;
      return { ...p, start, end: acc / total };
    });
}
