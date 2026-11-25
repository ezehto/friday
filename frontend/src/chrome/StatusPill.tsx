import { useGhost } from "../lib/motion";
import { coreLabels, type CoreState } from "./coreStates";

export function StatusPill(props: { state: CoreState }) {
  const label = coreLabels(props.state).pill;
  // The old label stays only as an aria-hidden sibling while it fades, so the live region reads the current label.
  const ghost = useGhost(label);
  return (
    <p role="status" className="status-pill" data-pill-state={props.state}>
      <span key={label} className="pill-text">{label}</span>
      {ghost !== null && <span className="pill-ghost" aria-hidden="true">{ghost}</span>}
    </p>
  );
}
