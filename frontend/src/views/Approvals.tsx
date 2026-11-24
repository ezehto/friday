import { useState } from "react";
import { FIXED } from "../chrome/fixedText";
import { HudFrame } from "../chrome/HudFrame";
import type { ProposalView } from "../generated/types";
import type { AppState } from "../store";
import type { SessionTransport } from "../transport/types";
import { PreviewBanner } from "./PreviewBanner";
import { RawField } from "./RawField";

const T = FIXED.approvals;

export function ProposalPreview(props: { proposal: ProposalView; act: SessionTransport["act"] }) {
  const { proposal: p, act } = props;
  const [result, setResult] = useState("");
  const run = async (kind: "approve" | "reject" | "open_confirm"): Promise<void> => {
    setResult((await act({ kind, proposalId: p.proposal_id })).message);
  };
  return (
    <HudFrame title={p.title} kicker={p.tool} headingLevel={3}>
      <dl className="facts">
        <dt>{T.target}</dt>
        <dd>{p.target ?? T.none}</dd>
        <dt>{T.targetFolder}</dt>
        <dd>{p.target_folder ?? T.none}</dd>
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
      {current ? (
        <div className="view-split">
          <ul className="proposal-list" aria-label={T.list}>
            {approvals.map((a) => (
              <li key={a.proposal_id}>
                <button type="button" className="proposal-item" aria-pressed={a.proposal_id === current.proposal_id} onClick={() => setSelected(a.proposal_id)}>
                  <span>{a.title}</span>
                  <span className="label">{a.host_action ? T.hostAction : T.container}</span>
                </button>
              </li>
            ))}
          </ul>
          <ProposalPreview key={current.proposal_id} proposal={current} act={props.act} />
        </div>
      ) : (
        <p className="board-note">{T.empty}</p>
      )}
    </div>
  );
}
