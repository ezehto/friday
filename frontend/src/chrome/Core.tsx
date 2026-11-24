import { useEffect, useRef, type RefObject } from "react";
import type { VoiceLevelSource } from "../transport/types";
import { easePlaybackRate, motionReduced, tokenMs, useGhost, useMotionReduced } from "../lib/motion";
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

/**
 * Writes the source's level to --voice-level on the element, via ref (never React state). While
 * subscribed and `active`, data-live marks the element; a level of 0 does not clear it.
 */
export function useVoiceLevel(ref: RefObject<Element | null>, level: VoiceLevelSource | undefined, active: boolean): void {
  const hold = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const recent = useRef(0); // last level above 0: the source often drops to 0 in the same tick the state leaves
  useEffect(() => {
    const el = ref.current as SVGElement | HTMLElement | null;
    if (!level || !el) return;
    if (active) {
      clearTimeout(hold.current);
      el.setAttribute("data-live", "true");
    }
    const off = level.onLevel((v) => {
      // While the parts fade out after the state left, the last level is held (the source usually drops to 0).
      if (!active && el.hasAttribute("data-live")) return;
      if (!Number.isFinite(v)) return;
      const clamped = Math.min(1, Math.max(0, v));
      if (clamped > 0) recent.current = clamped;
      el.style.setProperty("--voice-level", String(clamped));
    });
    return () => {
      off();
      const clear = (): void => {
        el.style.removeProperty("--voice-level");
        el.removeAttribute("data-live");
      };
      // Leaving a live state keeps the level and data-live for the state duration, so the voice parts fade out.
      const ms = active && !motionReduced() ? tokenMs("--motion-state-duration") : 0;
      if (ms > 0) {
        el.style.setProperty("--voice-level", String(recent.current));
        hold.current = setTimeout(clear, ms);
      } else clear();
    };
  }, [ref, level, active]);
  useEffect(() => () => clearTimeout(hold.current), []);
}

const VOICE_STATES: readonly CoreState[] = ["listening", "speaking"];

/**
 * The rings spin on one CSS animation at the base rate. The state's --core-speed becomes the
 * animation's playbackRate, eased, so a state change never restarts it or jumps the angle.
 */
function useRingSpeed(ref: RefObject<SVGSVGElement | null>, state: CoreState): void {
  const settled = useRef(false);
  const reduced = useMotionReduced();
  useEffect(() => {
    const svg = ref.current;
    if (!svg || typeof svg.getAnimations !== "function") return;
    const speed = parseFloat(getComputedStyle(svg).getPropertyValue("--core-speed"));
    const rings = svg.getAnimations({ subtree: true }).filter((a) => (a as CSSAnimation).animationName === "core-spin");
    const to = 1 / (Number.isFinite(speed) && speed > 0 ? speed : 1);
    const ms = settled.current && !reduced ? tokenMs("--motion-state-duration") : 0;
    settled.current = true;
    return easePlaybackRate(rings, to, ms);
  }, [ref, state, reduced]);
}

export function Core(props: { state: CoreState; size: "full" | "compact"; level?: VoiceLevelSource }) {
  const root = useRef<SVGSVGElement>(null);
  useVoiceLevel(root, props.level, VOICE_STATES.includes(props.state));
  useRingSpeed(root, props.state);
  const { disc, pill } = coreLabels(props.state);
  const ghost = useGhost(disc);
  const compact = props.size === "compact";
  return (
    <svg
      ref={root}
      className={`core core-${props.size}`}
      data-core-state={props.state}
      viewBox="0 0 400 400"
      role="img"
      aria-label={pill}
    >
      <circle className="core-line core-hair" cx={C} cy={C} r="192" />
      {/* Voice-level parts: hidden unless the core listens or speaks with a live level. */}
      <g aria-hidden="true">
        <circle className="core-ripple" cx={C} cy={C} r="172" />
        <circle className="core-halo" cx={C} cy={C} r="76" />
        <circle className="core-pulse" cx={C} cy={C} r="72" />
        <circle className="core-pulse core-pulse-late" cx={C} cy={C} r="72" />
      </g>
      <g className="core-contract">
        <g className="core-ring core-ring-a">
          {OUTER_SEGMENTS.map(([a, b]) => (
            <path key={a} className="core-seg" d={arc(172, a, b)} />
          ))}
          {NOTCH_DOTS.map((d) => {
            const [x, y] = point(172, d);
            return <circle key={d} className="core-dot" cx={x} cy={y} r="3.2" />;
          })}
        </g>
      </g>
      <path className="core-tick" d={TICKS} />
      <g className="core-ring core-ring-b">
        <path className="core-arc-secondary" d={arc(126, 196, 292)} />
        <circle className="core-band" cx={C} cy={C} r="106" pathLength="100" />
      </g>
      <circle className="core-line core-inner" cx={C} cy={C} r="86" />
      <circle className="core-disc" cx={C} cy={C} r="68" />
      {compact ? null : (
        <>
          <text key={disc} className="core-disc-label" x={C} y={C} textAnchor="middle" dominantBaseline="central">
            {disc}
          </text>
          {ghost !== null && (
            <text className="core-disc-ghost" x={C} y={C} textAnchor="middle" dominantBaseline="central" aria-hidden="true">
              {ghost}
            </text>
          )}
        </>
      )}
    </svg>
  );
}
