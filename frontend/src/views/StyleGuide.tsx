import { useState } from "react";
import { Background } from "../chrome/Background";
import { Core } from "../chrome/Core";
import { CORE_STATES, coreLabels, type CoreState } from "../chrome/coreStates";
import { FIXED } from "../chrome/fixedText";
import { HudFrame } from "../chrome/HudFrame";
import { MotionSetting } from "../chrome/MotionSetting";
import { StatusPill } from "../chrome/StatusPill";
import { ToneIcon } from "../chrome/ToneIcon";
import type { Tone } from "../generated/types";

const TOKEN_GROUPS: [string, string[]][] = [
  ["Background", ["bg-canvas", "bg-panel", "bg-raised"]],
  ["Primary accent", ["accent-primary", "accent-primary-strong", "accent-primary-dim"]],
  ["Secondary accent", ["accent-secondary", "accent-secondary-dim"]],
  ["Text", ["text-primary", "text-secondary", "text-muted", "text-on-accent"]],
  ["Lines and frames", ["line-grid", "line-blueprint", "line-panel-border", "line-corner-bracket"]],
  ["Tone", ["tone-good", "tone-bad", "tone-attention", "tone-neutral", "tone-good-bg", "tone-bad-bg", "tone-attention-bg", "tone-neutral-bg"]],
  ["Focus and glow", ["focus-ring", "glow-color"]],
  ["Chart series", ["series-1", "series-2", "series-3", "series-4", "series-5"]],
];
const TONES: Tone[] = ["good", "attention", "bad", "neutral"];

function Swatch({ name }: { name: string }) {
  return (
    <li className="sg-swatch">
      <span className="sg-chip" aria-hidden="true" style={{ background: `var(--${name})` }} />
      <code>--{name}</code>
    </li>
  );
}

export function StyleGuide() {
  const [state, setState] = useState<CoreState>("idle");
  return (
    <>
      <Background />
      <main className="sg">
        <header className="sg-head">
          <h1>Style guide</h1>
          <p>{FIXED.tagline}</p>
        </header>

        <HudFrame title="Tokens" kicker="Colour" stamps="Dark only">
          {TOKEN_GROUPS.map(([group, names]) => (
            <div key={group}>
              <h3 className="label sg-group">{group}</h3>
              <ul className="sg-swatches">
                {names.map((n) => <Swatch key={n} name={n} />)}
              </ul>
            </div>
          ))}
        </HudFrame>

        <HudFrame title="Typography" kicker="Type">
          <div className="sg-type">
            <p className="sg-value">72 bpm</p>
            <p>Body text is set in the system sans stack at a comfortable measure, white on warm black.</p>
            <p className="label">Labels are small uppercase monospace</p>
          </div>
        </HudFrame>

        <HudFrame title="Tones" kicker="Status">
          <div className="sg-tones">
            {TONES.map((tone) => (
              <span key={tone} className={`sg-tone tone-${tone}-chip`}>
                <ToneIcon tone={tone} showWord />
              </span>
            ))}
          </div>
        </HudFrame>

        <HudFrame title="Frame" kicker="Panel" stamps="12:00">
          <p>A specimen panel: thin border, corner brackets, header line and token glow.</p>
        </HudFrame>

        <HudFrame title="Core" kicker="Agent state">
          <div className="sg-core">
            <div className="sg-core-stage">
              <Core state={state} size="full" />
              <StatusPill state={state} />
              <div className="sg-compact">
                <Core state={state} size="compact" />
                <span className="label">Top bar size</span>
              </div>
            </div>
            <fieldset className="sg-core-controls">
              <legend className="label">Core state</legend>
              {CORE_STATES.map((s) => (
                <label key={s} className="sg-radio">
                  <input type="radio" name="core-state" value={s} checked={state === s} onChange={() => setState(s)} />
                  {s.replaceAll("_", " ")} ({coreLabels(s).disc})
                </label>
              ))}
            </fieldset>
          </div>
        </HudFrame>

        <HudFrame title="Motion" kicker="Setting">
          <MotionSetting />
        </HudFrame>
      </main>
    </>
  );
}
