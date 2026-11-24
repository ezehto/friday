import { coreLabels, type CoreState } from "./coreStates";

export function StatusPill(props: { state: CoreState }) {
  return (
    <p role="status" className="status-pill" data-pill-state={props.state}>
      {coreLabels(props.state).pill}
    </p>
  );
}
