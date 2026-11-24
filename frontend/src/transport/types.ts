import type { ServerFrame, StateSnapshot } from "../generated/types";

export type TransportAction =
  | { kind: "approve" | "reject" | "open_confirm"; proposalId: string }
  | { kind: "deny"; requestId: string; reason: string }
  | { kind: "cancel_run"; runId: string }
  | { kind: "send_session_message"; sessionId: string; text: string }
  | { kind: "send_message"; text: string };
export type ActionResult = { ok: false; preview: true; message: "Preview: nothing was executed" };
export interface SessionTransport {
  connect(): Promise<StateSnapshot>; // L8: GET /api/state, then /ws/session
  subscribe(listener: (frame: ServerFrame) => void): () => void;
  act(action: TransportAction): Promise<ActionResult>; // L8: the HTTP routes of section 15
  close(): void;
}
/** The seam L11 implements from real audio: level is finite, 0 to 1. */
export type VoiceLevelSource = { onLevel(listener: (level: number) => void): () => void };
