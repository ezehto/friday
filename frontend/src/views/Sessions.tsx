import { useState } from "react";
import { FIXED } from "../chrome/fixedText";
import { HudFrame } from "../chrome/HudFrame";
import { ToneIcon } from "../chrome/ToneIcon";
import type { RunView, SessionView, Tone } from "../generated/types";
import { formatTime } from "../lib/format";
import type { AppState } from "../store";
import type { SessionTransport } from "../transport/types";
import { EmptyState } from "./EmptyState";
import { PreviewBanner } from "./PreviewBanner";
import { VisibleText, visibleString } from "./VisibleText";

const T = FIXED.sessions;
// Working and starting are neutral progress; waiting needs the owner; unlinked lost its session.
const RUN_TONE: Record<RunView["status"], Tone> = {
  proposed: "neutral", starting: "neutral", working: "neutral", waiting: "attention", done: "good",
  failed: "bad", stopped: "neutral", timed_out: "bad", cancelled: "neutral", unlinked: "attention",
};
const CANCELABLE: readonly RunView["status"][] = ["starting", "working", "waiting"];

/** Waiting sessions first, then the most recent activity. */
export const sortSessions = (sessions: SessionView[]): SessionView[] =>
  [...sessions].sort((a, b) => Number(b.waiting) - Number(a.waiting) || Date.parse(b.last_activity) - Date.parse(a.last_activity));

export function SessionsTable(props: { sessions: SessionView[] }) {
  return (
    <div className="block-table">
      <table>
        <caption className="visually-hidden">{T.sessions}</caption>
        <thead>
          <tr>
            <th scope="col" className="label">{T.project}</th>
            <th scope="col" className="label">{T.dataClass}</th>
            <th scope="col" className="label">{T.kind}</th>
            <th scope="col" className="label">{T.state}</th>
            <th scope="col" className="label">{T.waiting}</th>
            <th scope="col" className="label">{T.lastActivity}</th>
          </tr>
        </thead>
        <tbody>
          {props.sessions.map((s) => (
            <tr key={s.session_id}>
              <td><VisibleText value={s.project} /></td>
              <td><span className="chip">{s.data_class}</span></td>
              <td><VisibleText value={s.kind} /></td>
              <td><VisibleText value={s.state} /></td>
              <td>{s.waiting ? <><ToneIcon tone="attention" />{T.yes}</> : T.no}</td>
              <td>{formatTime(s.last_activity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const RUN_STATUSES = Object.keys(RUN_TONE) as RunView["status"][];

export function RunsList(props: { runs: RunView[]; act: SessionTransport["act"]; initialResult?: string }) {
  const [result, setResult] = useState(props.initialResult ?? "");
  const cancel = async (runId: string): Promise<void> => setResult((await props.act({ kind: "cancel_run", runId })).message);
  return (
    <>
      {props.runs.length === 0 ? (
        <p className="block-empty">{T.noRuns}</p>
      ) : (
        <div className="block-table">
          <table>
            <caption className="visually-hidden">{T.runs}</caption>
            <thead>
              <tr>
                <th scope="col" className="label">{T.repo}</th>
                <th scope="col" className="label">{T.mode}</th>
                <th scope="col" className="label">{T.status}</th>
                <th scope="col" className="label">{T.started}</th>
                <th scope="col" className="label"><span className="visually-hidden">{T.actions}</span></th>
              </tr>
            </thead>
            <tbody>
              {props.runs.map((r) => (
                <tr key={r.run_id}>
                  <td><VisibleText value={r.repo} /></td>
                  <td>{r.mode}</td>
                  <td><ToneIcon tone={RUN_TONE[r.status]} />{r.status}</td>
                  <td>{formatTime(r.started)}</td>
                  <td>
                    {CANCELABLE.includes(r.status) ? (
                      <button type="button" className="chat-btn" aria-label={`${T.cancel} ${visibleString(r.repo)}`} onClick={() => void cancel(r.run_id)}>{T.cancel}</button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="action-result" role="status">{result}</p>
    </>
  );
}

export function MessagePanel(props: { sessions: SessionView[]; act: SessionTransport["act"]; initialResult?: string; initialText?: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState(props.initialText ?? "");
  const [result, setResult] = useState(props.initialResult ?? "");
  const current = props.sessions.find((s) => s.session_id === selected) ?? props.sessions[0];
  if (!current) return <p className="block-empty">{T.empty}</p>;
  const send = async (): Promise<void> => {
    if (text.trim() === "") return setResult(T.textNeeded);
    setResult((await props.act({ kind: "send_session_message", sessionId: current.session_id, text })).message);
  };
  return (
    <>
      <label className="reason">
        <span className="label">{T.session}</span>
        <select className="chat-input" value={current.session_id} onChange={(e) => setSelected(e.target.value)}>
          {props.sessions.map((s, i) => (
            <option key={s.session_id} value={s.session_id}>{T.option(i + 1)}</option>
          ))}
        </select>
      </label>
      <p className="attach-hint"><VisibleText value={current.project} /></p>
      <p className="attach-hint">{T.attach}<VisibleText value={current.session_id} /></p>
      <label className="reason">
        <span className="label">{T.text}</span>
        <textarea className="chat-input reason-input" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="action-row">
        <button type="button" className="chat-btn" onClick={() => void send()}>{T.send}</button>
      </div>
      <p className="action-result" role="status">{result}</p>
    </>
  );
}

export function Sessions(props: { state: AppState; act: SessionTransport["act"] }) {
  const { runs, sessions } = props.state;
  const sorted = sortSessions(sessions);
  return (
    <div className="view">
      <PreviewBanner />
      {sorted.length === 0 ? (
        <EmptyState title={T.sessions} text={T.empty} />
      ) : (
        <HudFrame title={T.sessions} headingLevel={2}>
          <SessionsTable sessions={sorted} />
        </HudFrame>
      )}
      <HudFrame title={T.runs} headingLevel={2}>
        <RunsList runs={runs} act={props.act} />
      </HudFrame>
      <HudFrame title={T.message} headingLevel={2}>
        <MessagePanel sessions={sorted} act={props.act} />
      </HudFrame>
    </div>
  );
}
