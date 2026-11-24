import { Component, type ReactNode } from "react";
import { Core } from "../chrome/Core";
import { FIXED } from "../chrome/fixedText";
import { StatusPill } from "../chrome/StatusPill";
import type { WidgetEnvelope } from "../generated/types";
import type { AppState } from "../store";
import { WidgetPanel } from "../widgets/WidgetPanel";

const PANEL_MAX = 12;

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

function Column(props: { name: string; items: WidgetEnvelope[]; indexes: number[]; now: string }) {
  return (
    <div className={`board-col board-col-${props.name}`}>
      {props.items.map((envelope, i) => (
        // order keeps board order when the columns collapse into one.
        <div key={envelope?.widget_id ?? `bad-${props.indexes[i]}`} className="board-item" style={{ order: props.indexes[i] }}>
          <PanelBoundary>
            <WidgetPanel envelope={envelope} now={props.now} headingLevel={2} />
          </PanelBoundary>
        </div>
      ))}
    </div>
  );
}

export function Board(props: { state: AppState; now: string }) {
  const { state, now } = props;
  const board = state.board.slice(0, PANEL_MAX);
  const { left, right } = splitColumns(board);
  const note = board.length > 0 ? null : state.requestOpen ? FIXED.loadingBoard : FIXED.emptyBoard;
  return (
    <div className="board">
      <Column name="left" items={left} indexes={left.map((_, i) => i * 2)} now={now} />
      <div className="board-core">
        <div className="core-full-wrap">
          <Core state={state.core} size="full" />
        </div>
        <StatusPill state={state.core} />
        {note && <p className="board-note">{note}</p>}
      </div>
      <Column name="right" items={right} indexes={right.map((_, i) => i * 2 + 1)} now={now} />
    </div>
  );
}
