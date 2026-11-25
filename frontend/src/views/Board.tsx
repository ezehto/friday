import { Component, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Core } from "../chrome/Core";
import type { CoreState } from "../chrome/coreStates";
import { FIXED } from "../chrome/fixedText";
import { StatusPill } from "../chrome/StatusPill";
import type { WidgetEnvelope } from "../generated/types";
import { motionOff, tokenMs, useFlip } from "../lib/motion";
import type { AppState } from "../store";
import type { VoiceLevelSource } from "../transport/types";
import { WidgetPanel } from "../widgets/WidgetPanel";

const PANEL_MAX = 12;
// A request is in progress while the core is busy, even before request.started arrives.
const BUSY: readonly CoreState[] = ["listening", "transcribing", "thinking", "running_tools", "speaking"];

/** Board index 0 is newest; even indexes go left, odd right, order kept. */
export function splitColumns(board: WidgetEnvelope[]): { left: WidgetEnvelope[]; right: WidgetEnvelope[] } {
  return { left: board.filter((_, i) => i % 2 === 0), right: board.filter((_, i) => i % 2 === 1) };
}

// One broken envelope must not unmount the board or the core.
class PanelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p className="panel-failed label">{FIXED.panelFailed}</p> : this.props.children;
  }
}

// Expiry is stamped when the board update arrives, so it is read from one place.
const clock = (): number => Date.now();

type Leaving = { envelope: WidgetEnvelope; index: number; until: number };

/**
 * Keeps an envelope that left the board mounted for the exit duration so it can fade out.
 * Returns the board with the leaving envelopes spliced back at their old index, and their ids.
 */
function useLeaving(board: WidgetEnvelope[]): { items: WidgetEnvelope[]; leaving: Set<string> } {
  const [track, setTrack] = useState<{ board: WidgetEnvelope[]; leaving: Leaving[] }>({ board, leaving: [] });
  if (track.board !== board) {
    const ids = new Set(board.slice(0, PANEL_MAX).map((e) => e?.widget_id));
    const kept = track.leaving.filter((l) => !ids.has(l.envelope.widget_id));
    const gone = motionOff() || tokenMs("--motion-exit-duration") <= 0
      ? []
      : track.board.slice(0, PANEL_MAX).flatMap((envelope, index) => (envelope && !ids.has(envelope.widget_id) && !kept.some((l) => l.envelope.widget_id === envelope.widget_id) ? [{ envelope, index, until: clock() + tokenMs("--motion-exit-duration") }] : []));
    // Entries keep their own expiry, so a later board change never extends a panel's exit.
    setTrack({ board, leaving: gone.length === 0 && kept.length === track.leaving.length ? track.leaving : [...kept, ...gone] });
  }
  const { leaving } = track;
  useEffect(() => {
    if (leaving.length === 0) return;
    const next = Math.min(...leaving.map((l) => l.until));
    const timer = setTimeout(() => setTrack((s) => ({ ...s, leaving: s.leaving.filter((l) => l.until > clock()) })), Math.max(0, next - clock()));
    return () => clearTimeout(timer);
  }, [leaving]);
  const items = board.slice(0, PANEL_MAX);
  // The 12 panel cap holds while panels exit: only as many leaving panels as there is room for.
  const shown = [...leaving].sort((a, b) => a.index - b.index).slice(0, PANEL_MAX - items.length);
  for (const l of shown) items.splice(Math.min(l.index, items.length), 0, l.envelope);
  return { items, leaving: new Set(shown.map((l) => l.envelope.widget_id)) };
}

function Column(props: { name: string; items: WidgetEnvelope[]; indexes: number[]; now: string; leaving: Set<string> }) {
  return (
    <div className={`board-col board-col-${props.name}`}>
      {props.items.map((envelope, i) => {
        const gone = envelope ? props.leaving.has(envelope.widget_id) : false;
        return (
          // order keeps board order when the columns collapse into one; --i staggers the entry.
          <div
            key={envelope?.widget_id ?? `bad-${props.indexes[i]}`}
            className="board-item"
            data-flip={envelope?.widget_id}
            data-leaving={gone ? "" : undefined}
            aria-hidden={gone ? true : undefined}
            inert={gone}
            style={{ order: props.indexes[i], "--i": props.indexes[i] } as CSSProperties}
          >
            <PanelBoundary>
              <WidgetPanel envelope={envelope} now={props.now} headingLevel={2} />
            </PanelBoundary>
          </div>
        );
      })}
    </div>
  );
}

export function Board(props: { state: AppState; now: string; level?: VoiceLevelSource }) {
  const { state, now } = props;
  const { items, leaving } = useLeaving(state.board);
  const host = useRef<HTMLDivElement>(null);
  useFlip(host, items.map((e) => e?.widget_id ?? "").join("|"));
  const { left, right } = splitColumns(items);
  const note = items.length > 0 ? null : state.requestOpen || BUSY.includes(state.core) ? FIXED.loadingBoard : FIXED.emptyBoard;
  return (
    <div className="board" ref={host}>
      <Column name="left" items={left} indexes={left.map((_, i) => i * 2)} now={now} leaving={leaving} />
      <div className="board-core">
        <div className="core-full-wrap">
          <Core state={state.core} size="full" level={props.level} />
        </div>
        <StatusPill state={state.core} />
        {note && <p className="board-note">{note}</p>}
      </div>
      <Column name="right" items={right} indexes={right.map((_, i) => i * 2 + 1)} now={now} leaving={leaving} />
    </div>
  );
}
