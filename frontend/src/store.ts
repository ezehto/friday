import { useSyncExternalStore } from "react";
import type { CoreState } from "./chrome/coreStates";
import type { AlertKind, ServerFrame, StateSnapshot, TrayItem, WidgetEnvelope } from "./generated/types";
import type { MockTransport } from "./transport/mock";
import type { SessionTransport } from "./transport/types";

export type AppState = StateSnapshot & {
  core: CoreState;
  reply: { requestId: string; text: string; done: boolean } | null;
  requestOpen: boolean;
  done: boolean;
};

const BOARD_MAX = 12;

/** The one table from alert kind to tray source. A pending permission arrives as permission.pending, so no kind maps to permissions. */
const ALERT_SOURCE: Record<AlertKind, TrayItem["source"]> = {
  approvals_waiting: "approvals",
  proposal_expiring: "approvals",
  session_waiting: "sessions",
  run_finished: "health",
  run_failed: "health",
  run_timed_out: "health",
  run_over_tokens: "health",
  plan_limit: "health",
  login_expiring: "health",
  adapter_degraded: "health",
  companion_degraded: "health",
  over_budget: "health",
};

export const initialState: AppState = {
  approvals: [], runs: [], sessions: [], permissions: [], traces: [], tray: [], board: [],
  core: "idle", reply: null, requestOpen: false, done: false,
};

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

export function applyFrame(state: AppState, frame: ServerFrame): AppState {
  const data = frame.data as Record<string, unknown>;
  switch (frame.name) {
    case "board.updated":
      return Array.isArray(data.board)
        ? { ...state, board: (data.board as WidgetEnvelope[]).slice(0, BOARD_MAX) }
        : state;
    case "message.delta": {
      const requestId = str(data.request_id);
      const text = str(data.text);
      if (requestId === undefined || text === undefined) return state;
      const same = state.reply?.requestId === requestId;
      return { ...state, reply: { requestId, text: (same ? state.reply!.text : "") + text, done: false } };
    }
    case "message.done": {
      const requestId = str(data.request_id);
      if (!state.reply || state.reply.requestId !== requestId) return state;
      return { ...state, reply: { ...state.reply, done: true } };
    }
    case "request.started":
      return { ...state, requestOpen: true };
    case "request.finished":
      return { ...state, requestOpen: false };
    case "alert.raised": {
      const kind = data.kind as AlertKind;
      const source = ALERT_SOURCE[kind];
      return source ? { ...state, tray: [...state.tray, { kind, source }] } : state;
    }
    default:
      return state;
  }
}

export type PreviewFeed = Pick<MockTransport, "onCore" | "onDone">;

export function createStore(transport: SessionTransport, preview?: PreviewFeed) {
  let state = initialState;
  const listeners = new Set<() => void>();
  const set = (next: AppState): void => {
    if (next === state) return;
    state = next;
    for (const l of [...listeners]) l();
  };
  const unsubs = [
    transport.subscribe((frame) => set(applyFrame(state, frame))),
    preview?.onCore((core) => set({ ...state, core })),
    preview?.onDone(() => set({ ...state, done: true })),
  ];
  void transport.connect().then((snap) => set({ ...state, ...snap }));
  return {
    getState: (): AppState => state,
    subscribe(l: () => void): () => void {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    act: ((action) => transport.act(action)) as SessionTransport["act"],
    dispose(): void {
      for (const u of unsubs) u?.();
      listeners.clear();
      transport.close();
    },
  };
}

export function useStore<T>(store: ReturnType<typeof createStore>, select: (s: AppState) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(store.getState()));
}
