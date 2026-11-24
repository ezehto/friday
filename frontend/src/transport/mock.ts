import type { CoreState } from "../chrome/coreStates";
import { FIXED } from "../chrome/fixedText";
import type { Scenario, ServerFrame, StateSnapshot, ViewSet } from "../generated/types";
import type { ActionResult, SessionTransport, TransportAction, VoiceLevelSource } from "./types";

type Schedule = (fn: () => void, ms: number) => unknown;

const WORD_GAP_MS = 30;
const REPLY_CAP = 400;
const LEVEL_TICK_MS = 50;

type VoiceKind = "listening" | "speaking";

/**
 * Deterministic scripted level, 0..1, for tick n. Two or three sines plus seeded noise; the
 * listening curve is slow and uneven, the speaking curve is a syllable beat under a phrase envelope.
 */
export function voiceLevel(kind: VoiceKind, n: number, seed = 1): number {
  const t = (n * LEVEL_TICK_MS) / 1000;
  const h = Math.imul(n + 1, 0x9e3779b1) ^ Math.imul(seed + (kind === "speaking" ? 7 : 3), 0x85ebca6b);
  const noise = (((h ^ (h >>> 15)) >>> 0) % 1000) / 1000 - 0.5;
  const w = Math.PI * 2;
  const raw =
    kind === "listening"
      ? 0.4 + 0.22 * Math.sin(w * 0.9 * t + seed) + 0.14 * Math.sin(w * 2.1 * t + 1.1 * seed) + 0.12 * noise
      : 0.5 + 0.3 * Math.sin(w * 2.4 * t + seed) * (0.6 + 0.4 * Math.sin(w * 0.55 * t)) + 0.1 * Math.sin(w * 4.6 * t) + 0.08 * noise;
  return Math.min(1, Math.max(0, raw));
}

/** One throwing listener must not skip the rest: the error is rethrown outside this call. */
function guarded<T>(l: (v: T) => void, value: T): void {
  try {
    l(value);
  } catch (e) {
    queueMicrotask(() => {
      throw e;
    });
  }
}

function fanOut<T>(set: Set<(v: T) => void>, value: T): void {
  for (const l of [...set]) guarded(l, value);
}

function subscribeTo<T>(set: Set<(v: T) => void>, listener: (v: T) => void): () => void {
  set.add(listener);
  return () => void set.delete(listener);
}

/** Replays a scenario script as /ws/session frames. Preview only: sends nothing anywhere. */
export class MockTransport implements SessionTransport, VoiceLevelSource {
  private readonly frameListeners = new Set<(frame: ServerFrame) => void>();
  private readonly coreListeners = new Set<(s: CoreState) => void>();
  private readonly doneListeners = new Set<() => void>();
  private readonly levelListeners = new Set<(level: number) => void>();
  private levelKind: VoiceKind | null = null;
  private levelHandle: unknown;
  private readonly handles: unknown[] = [];
  private readonly schedule: Schedule;
  private readonly instant: boolean;
  private seq = 0;
  private closed = false;

  constructor(
    private readonly scenario: Scenario,
    private readonly baseViews: ViewSet,
    opts: { schedule?: Schedule; instant?: boolean } = {},
  ) {
    this.schedule = opts.schedule ?? ((fn, ms) => setTimeout(fn, ms));
    this.instant = opts.instant ?? false;
  }

  connect(): Promise<StateSnapshot> {
    this.play();
    return Promise.resolve({ ...this.baseViews, ...this.scenario.views, board: [] });
  }

  subscribe(listener: (frame: ServerFrame) => void): () => void {
    return subscribeTo(this.frameListeners, listener);
  }

  onCore(listener: (s: CoreState) => void): () => void {
    return subscribeTo(this.coreListeners, listener);
  }

  onDone(listener: () => void): () => void {
    return subscribeTo(this.doneListeners, listener);
  }

  onLevel(listener: (level: number) => void): () => void {
    return subscribeTo(this.levelListeners, listener);
  }

  act(action: TransportAction): Promise<ActionResult> {
    void action;
    return Promise.resolve({ ok: false, preview: true, message: FIXED.previewResult });
  }

  close(): void {
    this.closed = true;
    for (const h of this.handles) clearTimeout(h as ReturnType<typeof setTimeout>);
    this.handles.length = 0;
    clearTimeout(this.levelHandle as ReturnType<typeof setTimeout>);
    this.levelKind = null;
  }

  /** Emits a level every tick while the core listens or speaks, and 0 once on leaving. No levels in instant mode. */
  private setCore(state: CoreState): void {
    if (this.instant) return;
    const kind = state === "listening" || state === "speaking" ? state : null;
    if (kind === this.levelKind) return;
    clearTimeout(this.levelHandle as ReturnType<typeof setTimeout>);
    const was = this.levelKind;
    this.levelKind = kind;
    if (kind === null) {
      if (was !== null) fanOut(this.levelListeners, 0);
      return;
    }
    let n = 0;
    const tick = (): void => {
      if (this.closed || this.levelKind !== kind) return;
      fanOut(this.levelListeners, voiceLevel(kind, n++));
      this.levelHandle = this.schedule(tick, LEVEL_TICK_MS);
    };
    tick();
  }

  private at(ms: number, fn: () => void): void {
    this.handles.push(
      this.schedule(() => {
        if (!this.closed) fn();
      }, this.instant ? 0 : ms),
    );
  }

  private emit(name: ServerFrame["name"], data: object, atMs: number): void {
    this.seq += 1;
    const frame: ServerFrame = {
      v: 1,
      type: "event",
      id: `f${String(this.seq).padStart(6, "0")}`,
      ts: new Date(Date.parse(this.scenario.now) + atMs).toISOString(),
      name,
      data,
    };
    fanOut(this.frameListeners, frame);
  }

  private play(): void {
    const { script, widgets } = this.scenario;
    let requestId = "r1";
    let end = 0;
    for (const step of script) {
      const t = step.at_ms;
      end = Math.max(end, t);
      if ("event" in step) {
        const rid = (step.data as { request_id?: unknown }).request_id;
        if (step.event === "request.started" && typeof rid === "string") requestId = rid;
        this.at(t, () => this.emit(step.event, step.data, t));
      } else if ("board" in step) {
        // An id with no widget is skipped silently; the board shows the rest.
        const board = step.board
          .map((id) => widgets.find((w) => w.envelope.widget_id === id)?.envelope)
          .filter((e) => e !== undefined);
        this.at(t, () => this.emit("board.updated", { board }, t));
      } else if ("reply" in step) {
        const rid = requestId;
        const words = Array.from(step.reply).slice(0, REPLY_CAP).join("").match(/\s*\S+\s*/g) ?? [];
        words.forEach((text, i) => {
          const when = t + i * WORD_GAP_MS;
          this.at(when, () => this.emit("message.delta", { request_id: rid, text }, when));
        });
        const doneAt = t + words.length * WORD_GAP_MS;
        end = Math.max(end, doneAt);
        this.at(doneAt, () => this.emit("message.done", { request_id: rid }, doneAt));
      } else {
        this.at(t, () => {
          fanOut(this.coreListeners, step.core);
          this.setCore(step.core);
        });
      }
    }
    this.at(end, () => fanOut(this.doneListeners, undefined as void));
  }
}
