import { useState } from "react";
import { FIXED } from "../chrome/fixedText";
import { HudFrame } from "../chrome/HudFrame";
import { ToneIcon } from "../chrome/ToneIcon";
import type { SpanView, Tone, TraceView } from "../generated/types";
import { formatNumber, formatTime } from "../lib/format";
import type { AppState } from "../store";
import { PreviewBanner } from "./PreviewBanner";
import { buildSpanTree, type SpanNode } from "./spanTree";
import { VisibleText } from "./VisibleText";

const T = FIXED.traces;
const TONE: Record<SpanView["status"], Tone> = { ok: "good", error: "bad", timeout: "attention" };
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });
const duration = (ms: number): string => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

function SpanItems(props: { nodes: SpanNode[] }) {
  return (
    <ul className="span-list">
      {props.nodes.map((n) => (
        <li key={n.span_id}>
          <div className="span-row">
            <span className="label">{n.kind}</span>
            <span className="span-name"><VisibleText value={n.name} /></span>
            <span>{duration(n.duration_ms)}</span>
            {n.tokens_in !== undefined || n.tokens_out !== undefined ? (
              <span>{T.tokens} {formatNumber(n.tokens_in ?? 0)} / {formatNumber(n.tokens_out ?? 0)}</span>
            ) : null}
            <span className="span-status"><ToneIcon tone={TONE[n.status]} />{T.spanStatus[n.status]}</span>
          </div>
          {n.children.length > 0 ? <SpanItems nodes={n.children} /> : null}
        </li>
      ))}
    </ul>
  );
}

export function SpanTree(props: { spans: SpanView[] }) {
  return <SpanItems nodes={buildSpanTree(props.spans)} />;
}

export function RequestList(props: { traces: TraceView[]; selected: string; onSelect?: (id: string) => void }) {
  return (
    <ul className="proposal-list" aria-label={T.requests}>
      {props.traces.map((t) => (
        <li key={t.trace_id}>
          <button type="button" className="proposal-item" aria-pressed={t.trace_id === props.selected} onClick={() => props.onSelect?.(t.trace_id)}>
            <span><VisibleText value={t.label} /></span>
            <span className="label">{formatTime(t.started)} / {duration(t.duration_ms)}</span>
            <span className="label">{T.tokensIn} {formatNumber(t.tokens_in)} / {T.tokensOut} {formatNumber(t.tokens_out)} / {usd.format(t.cost_usd)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Traces(props: { state: AppState }) {
  const { traces } = props.state;
  const [selected, setSelected] = useState<string | null>(null);
  const current = traces.find((t) => t.trace_id === selected) ?? traces[0];
  return (
    <div className="view">
      <PreviewBanner />
      {current ? (
        <div className="view-split">
          <RequestList traces={traces} selected={current.trace_id} onSelect={setSelected} />
          <HudFrame title={T.tree} kicker={T.list} headingLevel={3}>
            <SpanTree spans={current.spans} />
          </HudFrame>
        </div>
      ) : (
        <p className="board-note">{T.empty}</p>
      )}
    </div>
  );
}
