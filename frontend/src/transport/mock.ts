import type { CoreState } from "../chrome/coreStates";
import { FIXED } from "../chrome/fixedText";
import type { Scenario, ServerFrame, StateSnapshot, ViewSet } from "../generated/types";
import type { ActionResult, SessionTransport, TransportAction } from "./types";

type Schedule = (fn: () => void, ms: number) => unknown;

const WORD_GAP_MS = 30;
const REPLY_CAP = 400;

function fanOut<T>(set: Set<(v: T) => void>, value: T): void {
  for (const l of [...set]) l(value);
}

function subscribeTo<T>(set: Set<(v: T) => void>, listener: (v: T) => void): () => void {
  set.add(listener);
  return () => void set.delete(listener);
}

/** Replays a scenario script as /ws/session frames. Preview only: sends nothing anywhere. */
export class MockTransport implements SessionTransport {
  private readonly frameListeners = new Set<(frame: ServerFrame) => void>();
  private readonly coreListeners = new Set<(s: CoreState) => void>();
  private readonly doneListeners = new Set<() => void>();
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

  act(action: TransportAction): Promise<ActionResult> {
    void action;
    return Promise.resolve({ ok: false, preview: true, message: FIXED.previewResult });
  }

  close(): void {
    this.closed = true;
    for (const h of this.handles) clearTimeout(h as ReturnType<typeof setTimeout>);
    this.handles.length = 0;
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
        this.at(t, () => fanOut(this.coreListeners, step.core));
      }
    }
    this.at(end, () => fanOut(this.doneListeners, undefined as void));
  }
}
