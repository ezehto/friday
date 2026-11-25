import { useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

const root = (): HTMLElement => document.documentElement;

/** True under the operating-system preference or the in-page "Reduce motion" setting. */
export function motionReduced(): boolean {
  return root().dataset.motion === "reduced" || (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/** Instant mode (?instant=1) skips entry, exit and draw-in so the smoke test sees the final layout. */
export const motionOff = (): boolean => motionReduced() || root().dataset.instant !== undefined;

/** A duration token in milliseconds; 0 when the token is missing or 0s. */
export function tokenMs(name: string): number {
  const raw = getComputedStyle(root()).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 0;
  return raw.endsWith("ms") ? n : n * 1000;
}

/**
 * Eases each animation's playbackRate to `to`. Changing the rate keeps the current time, so a
 * spinning ring never jumps in angle. Returns a cancel function.
 */
export function easePlaybackRate(anims: Animation[], to: number, ms: number): () => void {
  if (ms <= 0) {
    for (const a of anims) a.playbackRate = to;
    return () => undefined;
  }
  const from = anims.map((a) => a.playbackRate);
  const t0 = performance.now();
  let id = 0;
  const tick = (now: number): void => {
    const k = Math.min(1, (now - t0) / ms);
    const e = k * k * (3 - 2 * k);
    anims.forEach((a, i) => {
      a.playbackRate = from[i]! + (to - from[i]!) * e;
    });
    if (k < 1) id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}

/**
 * Returns the previous value for the length of the state transition after `value` changes, so the
 * old text can fade out while the new one fades in. Null at rest, and always null when motion is reduced.
 */
export function useGhost<T>(value: T): T | null {
  const [track, setTrack] = useState<{ value: T; ghost: T | null }>({ value, ghost: null });
  if (track.value !== value) setTrack({ value, ghost: motionOff() || tokenMs("--motion-state-duration") <= 0 ? null : track.value });
  const { ghost } = track;
  useLayoutEffect(() => {
    if (ghost === null) return;
    const timer = setTimeout(() => setTrack((s) => ({ ...s, ghost: null })), tokenMs("--motion-state-duration"));
    return () => clearTimeout(timer);
  }, [ghost, track.value]);
  return ghost;
}

/** motionReduced() as a subscription, so effects rerun when the setting or the OS preference changes. */
export function useMotionReduced(): boolean {
  return useSyncExternalStore(subscribeMotion, motionReduced);
}

// At module scope, so the subscription is stable and no observer is made per render.
function subscribeMotion(onChange: () => void): () => void {
  const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  mq?.addEventListener?.("change", onChange);
  const mo = new MutationObserver(onChange);
  mo.observe(root(), { attributes: true, attributeFilter: ["data-motion"] });
  return () => {
    mq?.removeEventListener?.("change", onChange);
    mo.disconnect();
  };
}

/** The translation a running glide adds to the element, read from its computed transform. */
function translation(el: HTMLElement): [number, number] {
  const m = /matrix\(([^)]+)\)/.exec(getComputedStyle(el).transform);
  const p = m?.[1]?.split(",").map(parseFloat);
  return p && p.length === 6 ? [p[4]!, p[5]!] : [0, 0];
}

/**
 * FLIP: when `key` (the order and identity of the panels) changes, panels marked data-flip that
 * moved glide from where they were drawn to the new place with the Web Animations API. A glide
 * still running starts the next one from its in-flight position. New panels have no old place
 * and enter by CSS instead.
 */
export function useFlip(ref: RefObject<HTMLElement | null>, key: string): void {
  const before = useRef(new Map<string, { left: number; top: number }>());
  const lastKey = useRef(key);
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    const changed = lastKey.current !== key;
    lastKey.current = key;
    const ms = tokenMs("--motion-state-duration");
    const easing = getComputedStyle(root()).getPropertyValue("--motion-easing").trim() || "ease";
    const after = new Map<string, { left: number; top: number }>();
    for (const el of host.querySelectorAll<HTMLElement>("[data-flip]")) {
      const id = el.dataset.flip!;
      const r = el.getBoundingClientRect();
      const [tx, ty] = translation(el);
      const settled = { left: r.left - tx, top: r.top - ty };
      after.set(id, settled);
      const old = before.current.get(id);
      if (!changed || !old || typeof el.animate !== "function" || motionOff() || ms <= 0 || el.hasAttribute("data-leaving")) continue;
      const dx = old.left + tx - settled.left;
      const dy = old.top + ty - settled.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      for (const a of el.getAnimations?.() ?? []) if (a.id === "flip") a.cancel();
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: ms, easing, id: "flip" });
    }
    before.current = after;
  });
}
