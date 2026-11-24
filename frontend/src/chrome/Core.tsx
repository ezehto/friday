import { coreLabels, type CoreState } from "./coreStates";

const C = 200;

function point(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

/** Arc path from deg0 to deg1, clockwise, 0 degrees at the top. */
function arc(r: number, deg0: number, deg1: number): string {
  const [x0, y0] = point(r, deg0);
  const [x1, y1] = point(r, deg1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${deg1 - deg0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

const TICKS = Array.from({ length: 72 }, (_, i) => {
  const long = i % 6 === 0;
  const [x0, y0] = point(long ? 138 : 143, i * 5);
  const [x1, y1] = point(152, i * 5);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}L${x1.toFixed(2)} ${y1.toFixed(2)}`;
}).join("");

const OUTER_SEGMENTS = [[14, 104], [118, 196], [226, 292], [304, 338]] as const;
const NOTCH_DOTS = [346, 352, 358] as const;

export function Core(props: { state: CoreState; size: "full" | "compact" }) {
  const { disc, pill } = coreLabels(props.state);
  const compact = props.size === "compact";
  return (
    <svg
      className={`core core-${props.size}`}
      data-core-state={props.state}
      viewBox="0 0 400 400"
      role="img"
      aria-label={pill}
    >
      <circle className="core-line core-hair" cx={C} cy={C} r="192" />
      <g className="core-ring core-ring-a">
        {OUTER_SEGMENTS.map(([a, b]) => (
          <path key={a} className="core-seg" d={arc(172, a, b)} />
        ))}
        {NOTCH_DOTS.map((d) => {
          const [x, y] = point(172, d);
          return <circle key={d} className="core-dot" cx={x} cy={y} r="3.2" />;
        })}
      </g>
      <path className="core-tick" d={TICKS} />
      <g className="core-ring core-ring-b">
        <path className="core-arc-secondary" d={arc(126, 196, 292)} />
        <circle className="core-band" cx={C} cy={C} r="106" pathLength="100" />
      </g>
      <circle className="core-line core-inner" cx={C} cy={C} r="86" />
      <circle className="core-disc" cx={C} cy={C} r="68" />
      {compact ? null : (
        <text className="core-disc-label" x={C} y={C} textAnchor="middle" dominantBaseline="central">
          {disc}
        </text>
      )}
    </svg>
  );
}
