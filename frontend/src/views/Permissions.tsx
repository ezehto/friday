import { useState } from "react";
import { FIXED } from "../chrome/fixedText";
import { HudFrame } from "../chrome/HudFrame";
import type { PermissionView } from "../generated/types";
import type { AppState } from "../store";
import type { SessionTransport } from "../transport/types";
import { EmptyState } from "./EmptyState";
import { PreviewBanner } from "./PreviewBanner";
import { RawField } from "./RawField";
import { VisibleText } from "./VisibleText";

const T = FIXED.permissions;
// Disabled ends use aria-disabled and a no-op, so focus is never lost.
const noop = (): void => undefined;

/**
 * The evidence comes first, then the decision. The details sit in a fixed-height scroll region,
 * so the reason box and the Deny button never move when the details change height.
 */
export function PermissionCard(props: { request: PermissionView; position: string; onPrev?: () => void; onNext?: () => void; act: SessionTransport["act"]; initialResult?: string }) {
  const { request: r, act } = props;
  const [reason, setReason] = useState("");
  const [result, setResult] = useState(props.initialResult ?? "");
  const [seen, setSeen] = useState(r.request_id);
  if (seen !== r.request_id) {
    setSeen(r.request_id);
    setReason("");
    setResult("");
  }
  const deny = async (): Promise<void> => {
    if (reason.trim() === "") return setResult(T.reasonNeeded);
    setResult((await act({ kind: "deny", requestId: r.request_id, reason })).message);
  };
  return (
    <HudFrame title={props.position} kicker={T.request} headingLevel={3}>
      <div className="permission-evidence" role="region" aria-label={T.details} tabIndex={0}>
        <dl className="facts">
          <dt>{T.session}</dt>
          <dd><VisibleText value={r.session_id} /></dd>
          <dt>{T.project}</dt>
          <dd><VisibleText value={r.project} /></dd>
          <dt>{T.dataClass}</dt>
          <dd>{r.data_class}</dd>
          <dt>{T.mode}</dt>
          <dd><VisibleText value={r.permission_mode} /></dd>
          <dt>{T.cwd}</dt>
          <dd><VisibleText value={r.cwd} /></dd>
          <dt>{T.started}</dt>
          <dd>{r.friday_started ? T.yes : T.no}</dd>
          <dt>{T.tool}</dt>
          <dd><VisibleText value={r.tool} /></dd>
        </dl>
        {Object.entries(r.input).map(([name, value]) => (
          <RawField key={name} name={name} value={value} />
        ))}
      </div>
      <label className="reason">
        <span className="label">{T.reason}</span>
        <textarea className="chat-input reason-input" rows={2} required value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <div className="action-row">
        <button type="button" className="chat-btn" onClick={() => void deny()}>{T.deny}</button>
        <button type="button" className="chat-btn" aria-disabled={!props.onPrev} onClick={props.onPrev ?? noop}>{T.previous}</button>
        <button type="button" className="chat-btn" aria-disabled={!props.onNext} onClick={props.onNext ?? noop}>{T.next}</button>
      </div>
      <p className="action-result" role="status">{result}</p>
    </HudFrame>
  );
}

export function Permissions(props: { state: AppState; act: SessionTransport["act"] }) {
  const { permissions } = props.state;
  const [index, setIndex] = useState(0);
  const at = Math.min(index, permissions.length - 1);
  const request = permissions[at];
  return (
    <div className="view">
      <PreviewBanner />
      <h2 className="visually-hidden">{FIXED.chrome.views.permissions}</h2>
      {request ? (
        <PermissionCard
          request={request}
          position={T.position(at + 1, permissions.length)}
          onPrev={at > 0 ? () => setIndex(at - 1) : undefined}
          onNext={at < permissions.length - 1 ? () => setIndex(at + 1) : undefined}
          act={props.act}
        />
      ) : (
        <EmptyState title={FIXED.chrome.views.permissions} text={T.empty} />
      )}
    </div>
  );
}
