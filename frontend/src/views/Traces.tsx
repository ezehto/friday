import { useState } from "react";
import { FIXED } from "../chrome/fixedText";
import { HudFrame } from "../chrome/HudFrame";
import { ToneIcon } from "../chrome/ToneIcon";
import type { SpanView, Tone, TraceView } from "../generated/types";
import { formatNumber, formatTime } from "../lib/format";
import type { AppState } from "../store";
import { EmptyState } from "./EmptyState";
import { PreviewBanner } from "./PreviewBanner";
import { buildSpanTree, type SpanNode } from "./spanTree";
import { VisibleText } from "./VisibleText";

const T = FIXED.traces;
const TONE: Record<SpanView["status"], Tone> = { ok: "good", error: "bad", timeout: "attention" };
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });
/** A nonzero cost below the shown precision is never shown as zero. */
export const formatCost = (c: number): string => (c > 0 && c < 0.0001 ? "<$0.0001" : usd.format(c));
const MAX_INDENT = 8;
const duration = (ms: number): string => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

function SpanItems(props: { nodes: SpanNode[]; depth?: number }) {
  const depth = props.depth ?? 0;
  return (
    <ul className={depth > MAX_INDENT ? "span-list span-flat" : "span-list"}>
      {props.nodes.map((n) => (
        <li key={n.span_id}>
          <div className="span-row">
            <span className="span-name"><VisibleText value={n.name} /></span>
            <span className="label span-kind">{T.kinds[n.kind]}</span>
            <span className="span-num">{duration(n.duration_ms)}</span>
            <span className="span-num">
              {n.tokens_in !== undefined || n.tokens_out !== undefined ? `${formatNumber(n.tokens_in ?? 0)} / ${formatNumber(n.tokens_out ?? 0)}` : ""}
            </span>
            <span className="span-status"><ToneIcon tone={TONE[n.status]} />{T.spanStatus[n.status]}</span>
          </div>
          {n.children.length > 0 ? <SpanItems nodes={n.children} depth={depth + 1} /> : null}
        </li>
      ))}
    </ul>
  );
}

export function SpanTree(props: { spans: SpanView[] }) {
  const c = T.columns;
  return (
    <div className="span-tree">
      <div className="span-row span-head label" aria-hidden="true">
        <span>{c.name}</span>
        <span>{c.kind}</span>
        <span className="span-num">{c.duration}</span>
        <span className="span-num">{c.tokens}</span>
        <span>{c.status}</span>
      </div>
      <SpanItems nodes={buildSpanTree(props.spans)} />
    </div>
  );
}

export function RequestList(props: { traces: TraceView[]; selected: string; onSelect?: (id: string) => void }) {
  return (
    <ul className="proposal-list" aria-label={T.requests}>
      {props.traces.map((t) => (
        <li key={t.trace_id}>
          <button type="button" className="proposal-item" aria-pressed={t.trace_id === props.selected} onClick={() => props.onSelect?.(t.trace_id)}>
            <span><VisibleText value={t.label} /></span>
            <span className="label request-cols">
              <span>{formatTime(t.started)}</span>
              <span>{duration(t.duration_ms)}</span>
              <span>{formatCost(t.cost_usd)}</span>
            </span>
            <span className="label request-cols request-cols-pair">
              <span>{T.tokensIn} {formatNumber(t.tokens_in)}</span>
              <span>{T.tokensOut} {formatNumber(t.tokens_out)}</span>
            </span>
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
      <h2 className="visually-hidden">{FIXED.chrome.views.traces}</h2>
      {current ? (
        <div className="view-split">
          <RequestList traces={traces} selected={current.trace_id} onSelect={setSelected} />
          <HudFrame title={T.tree} kicker={T.list} headingLevel={3}>
            <SpanTree spans={current.spans} />
          </HudFrame>
        </div>
      ) : (
        <EmptyState title={FIXED.chrome.views.traces} text={T.empty} />
      )}
    </div>
  );
}
