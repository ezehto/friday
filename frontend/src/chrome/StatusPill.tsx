import { useGhost } from "../lib/motion";
import { coreLabels, type CoreState } from "./coreStates";

export function StatusPill(props: { state: CoreState }) {
  const label = coreLabels(props.state).pill;
  // The old label is drawn by CSS (::before from data-ghost) while it fades, so the text content stays the current label.
  const ghost = useGhost(label);
  return (
    <p role="status" className="status-pill" data-pill-state={props.state} data-ghost={ghost ?? undefined}>
      <span key={label} className="pill-text">{label}</span>
    </p>
  );
}
