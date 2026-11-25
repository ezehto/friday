import { useState } from "react";
import { FIXED } from "../chrome/fixedText";
import { HudFrame } from "../chrome/HudFrame";
import type { ProposalView } from "../generated/types";
import type { AppState } from "../store";
import type { SessionTransport } from "../transport/types";
import { EmptyState } from "./EmptyState";
import { PreviewBanner } from "./PreviewBanner";
import { RawField } from "./RawField";
import { VisibleText } from "./VisibleText";

const T = FIXED.approvals;

export function ProposalPreview(props: { proposal: ProposalView; act: SessionTransport["act"]; initialResult?: string }) {
  const { proposal: p, act } = props;
  const [result, setResult] = useState(props.initialResult ?? "");
  const run = async (kind: "approve" | "reject" | "open_confirm"): Promise<void> => {
    setResult((await act({ kind, proposalId: p.proposal_id })).message);
  };
  return (
    <HudFrame title={T.proposal} kicker={p.host_action ? T.hostAction : T.container} headingLevel={3}>
      <dl className="facts">
        <dt>{T.subject}</dt>
        <dd><VisibleText value={p.title} /></dd>
        <dt>{T.tool}</dt>
        <dd><VisibleText value={p.tool} /></dd>
        <dt>{T.target}</dt>
        <dd>{p.target === undefined ? T.none : <VisibleText value={p.target} />}</dd>
        <dt>{T.targetFolder}</dt>
        <dd>{p.target_folder === undefined ? T.none : <VisibleText value={p.target_folder} />}</dd>
        <dt>{T.dataClass}</dt>
        <dd>{p.data_class}</dd>
        <dt>{T.secretScan}</dt>
        <dd>{p.secret_scan === "clean" ? T.scanClean : T.scanFound}</dd>
        <dt>{T.hash}</dt>
        <dd className="raw-hash">{p.args_sha256}</dd>
      </dl>
      <RawField name={T.content} value={p.content} />
      <div className="action-row">
        {p.host_action ? (
          <button type="button" className="chat-btn" onClick={() => void run("open_confirm")}>{T.openConfirm}</button>
        ) : (
          <>
            <button type="button" className="chat-btn" onClick={() => void run("approve")}>{T.approve}</button>
            <button type="button" className="chat-btn" onClick={() => void run("reject")}>{T.reject}</button>
          </>
        )}
      </div>
      <p className="action-result" role="status">{result}</p>
    </HudFrame>
  );
}

export function Approvals(props: { state: AppState; act: SessionTransport["act"] }) {
  const { approvals } = props.state;
  const [selected, setSelected] = useState<string | null>(null);
  const current = approvals.find((a) => a.proposal_id === selected) ?? approvals[0];
  return (
    <div className="view">
      <PreviewBanner />
      <h2 className="visually-hidden">{FIXED.chrome.views.approvals}</h2>
      {current ? (
        <div className="view-split">
          <ul className="proposal-list" aria-label={T.list}>
            {approvals.map((a) => (
              <li key={a.proposal_id}>
                <button type="button" className="proposal-item" aria-pressed={a.proposal_id === current.proposal_id} onClick={() => setSelected(a.proposal_id)}>
                  <span><VisibleText value={a.title} /></span>
                  <span className="label">{a.host_action ? T.hostAction : T.container}</span>
                </button>
              </li>
            ))}
          </ul>
          <ProposalPreview key={current.proposal_id} proposal={current} act={props.act} />
        </div>
      ) : (
        <EmptyState title={FIXED.chrome.views.approvals} text={T.empty} />
      )}
    </div>
  );
}
