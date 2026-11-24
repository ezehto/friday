import type { ReactElement } from "react";
import type { ChartBlock as ChartBlockData } from "../generated/types";
import { formatNumber } from "../lib/format";
import { Empty } from "./Empty";
import { donutSlices, safe, scale, xCategories, yDomain } from "./chartMath";

const W = 320;
const H = 160;
const PAD = { l: 40, r: 8, t: 8, b: 22 };
const color = (i: number) => `var(--series-${(i % 5) + 1})`;
const n = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);

type Series = ChartBlockData["series"];

function Axes({ y0, y1, cats, base }: { y0: number; y1: number; cats: string[]; base: number }): ReactElement {
  const top = PAD.t;
  const bottom = H - PAD.b;
  return (
    <g className="chart-axes">
      <line x1={PAD.l} x2={W - PAD.r} y1={n(base)} y2={n(base)} stroke="var(--line-panel-border)" />
      <line x1={PAD.l} x2={PAD.l} y1={top} y2={bottom} stroke="var(--line-blueprint)" />
      <text x={PAD.l - 4} y={top + 8} textAnchor="end" fill="var(--text-muted)" fontSize="9">{formatNumber(y1)}</text>
      <text x={PAD.l - 4} y={bottom} textAnchor="end" fill="var(--text-muted)" fontSize="9">{formatNumber(y0)}</text>
      {cats.length > 0 && (
        <text x={PAD.l} y={H - 6} fill="var(--text-muted)" fontSize="9">{cats[0]}</text>
      )}
      {cats.length > 1 && (
        <text x={W - PAD.r} y={H - 6} textAnchor="end" fill="var(--text-muted)" fontSize="9">{cats[cats.length - 1]}</text>
      )}
    </g>
  );
}

function Cartesian({ block }: { block: ChartBlockData }): ReactElement {
  const { series, chart } = block;
  const cats = xCategories(series);
  const [y0, y1] = yDomain(series);
  const yOf = (v: number) => n(scale(v, y0, y1, H - PAD.b, PAD.t));
  const base = yOf(0);
  const band = (W - PAD.l - PAD.r) / Math.max(cats.length, 1);

  const body =
    chart === "bar"
      ? series.map((s, si) => {
          const bw = Math.max((band * 0.8) / series.length, 0.5);
          return s.points.map((p) => {
            const ci = cats.indexOf(p.x);
            const y = yOf(p.y);
            return (
              <rect
                key={`${si}-${ci}`}
                x={n(PAD.l + ci * band + band * 0.1 + si * bw)}
                y={Math.min(y, base)}
                width={n(bw)}
                height={n(Math.abs(base - y))}
                fill={color(si)}
              />
            );
          });
        })
      : series.map((s, si) => {
          const pts = s.points.map((p) => {
            const ci = cats.indexOf(p.x);
            const x = n(cats.length > 1 ? scale(ci, 0, cats.length - 1, PAD.l, W - PAD.r) : (PAD.l + W - PAD.r) / 2);
            return [x, yOf(p.y)] as const;
          });
          const first = pts[0];
          const last = pts[pts.length - 1];
          if (!first || !last) return null;
          const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join("");
          const [fx, fy] = first;
          const [lx] = last;
          return (
            <g key={si}>
              {chart === "area" && (
                <path d={`${line}L${lx} ${base}L${fx} ${base}Z`} fill={color(si)} fillOpacity="0.18" stroke="none" />
              )}
              <path d={line} fill="none" stroke={color(si)} strokeWidth="1.5" strokeLinejoin="round" />
              {pts.length === 1 && <circle cx={fx} cy={fy} r="2.5" fill={color(si)} />}
            </g>
          );
        });

  return (
    <>
      <Axes y0={y0} y1={y1} cats={cats} base={base} />
      {body}
    </>
  );
}

function Donut({ series }: { series: Series }): ReactElement | null {
  const slices = donutSlices(series);
  if (slices.length === 0) return null;
  const r = 52;
  const cx = W / 2;
  const cy = H / 2;
  const pt = (t: number) => `${n(cx + r * Math.sin(t * 2 * Math.PI))} ${n(cy - r * Math.cos(t * 2 * Math.PI))}`;
  return (
    <>
      {slices.map((s, i) =>
        s.end - s.start > 0.9999 ? (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={color(i)} strokeWidth="18" />
        ) : (
          <path
            key={i}
            d={`M${pt(s.start)}A${r} ${r} 0 ${s.end - s.start > 0.5 ? 1 : 0} 1 ${pt(s.end)}`}
            fill="none"
            stroke={color(i)}
            strokeWidth="18"
          />
        ),
      )}
    </>
  );
}

export function ChartBlock({ block }: { block: ChartBlockData }): ReactElement {
  const donut = block.chart === "donut";
  const empty = donut ? donutSlices(block.series).length === 0 : block.series.every((s) => s.points.length === 0);
  const cats = donut ? (block.series[0]?.points.map((p) => p.x) ?? []) : xCategories(block.series);
  const names = block.series.map((s) => s.name);
  const label = `${block.chart} chart: ${names.join(", ") || "no series"}${block.y_label ? `, ${block.y_label}` : ""}`;
  const legend = donut ? donutSlices(block.series).map((s) => s.name) : names;

  return (
    <figure className="block block-chart" data-block-kind="chart">
      {empty ? (
        <Empty />
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
            {donut ? <Donut series={block.series} /> : <Cartesian block={block} />}
          </svg>
          <figcaption className="chart-legend">
            {block.y_label && <span className="row-meta">{block.y_label}</span>}
            {legend.map((name, i) => (
              <span key={i} className="chart-key">
                <i className="chart-swatch" style={{ background: color(i) }} aria-hidden="true" />
                {name}
              </span>
            ))}
          </figcaption>
          <div className="visually-hidden">
            <table>
              <thead>
                <tr>
                  <th />
                  {names.map((name, i) => (
                    <th key={i}>{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cats.map((x) => (
                  <tr key={x}>
                    <th>{x}</th>
                    {block.series.map((s, i) => {
                      const p = s.points.find((q) => q.x === x);
                      return <td key={i}>{p ? formatNumber(safe(p.y)) : ""}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </figure>
  );
}
