import { FIXED } from "../chrome/fixedText";
import type { Scenario } from "../generated/types";

const GROUPS = ["request", "state", "edge"] as const;

export function ScenarioSwitcher(props: { scenarios: Scenario[]; current: string; onSelect(id: string): void; onRestart(): void }) {
  return (
    <div className="switcher">
      <label className="label switcher-label">
        {FIXED.switcher.scenario}
        <select className="switcher-select" value={props.current} onChange={(e) => props.onSelect(e.target.value)}>
          <option value="">{FIXED.switcher.none}</option>
          {GROUPS.map((group) => (
            <optgroup key={group} label={FIXED.switcher.groups[group]}>
              {props.scenarios
                .filter((s) => s.group === group)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <button type="button" className="switcher-restart label" onClick={props.onRestart}>
        {FIXED.switcher.restart}
      </button>
    </div>
  );
}
