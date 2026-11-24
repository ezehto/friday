import { useState } from "react";
import { Background } from "../chrome/Background";
import { Core } from "../chrome/Core";
import { ChatLine, PushToTalk } from "../chrome/ChatLine";
import { CORE_STATES, coreLabels, type CoreState } from "../chrome/coreStates";
import { FIXED } from "../chrome/fixedText";
import { HudFrame } from "../chrome/HudFrame";
import { MotionSetting } from "../chrome/MotionSetting";
import { StatusPill } from "../chrome/StatusPill";
import { TopBar } from "../chrome/TopBar";
import { Tray } from "../chrome/Tray";
import { ToneIcon } from "../chrome/ToneIcon";
import type { AlertKind, Block, ChartBlock, SampleSet, Tone } from "../generated/types";
import { initialState, type AppState } from "../store";
import type { SessionTransport } from "../transport/types";
import samplesJson from "../mocks/samples.json";
import { BlockBoundary } from "../blocks/BlockBoundary";
import { BlockRenderer } from "../blocks/BlockRenderer";
import { WidgetPanel } from "../widgets/WidgetPanel";

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
const samples = samplesJson as SampleSet;

const PACKS = FIXED.styleGuide.packs;
const PACK_TYPES: [string, string[]][] = [
  [PACKS.core, ["stat", "chart", "table", "task_list", "progress", "daily_focus"]],
  [PACKS.projects, ["project_status", "work_timeline", "standup"]],
  [PACKS.career, ["career_progress", "learning_roadmap"]],
  [PACKS.server, ["alert", "task_queue", "claude_run"]],
  [PACKS.jira, ["jira_ticket", "jira_attention", "sprint", "sprint_burndown"]],
  [PACKS.calendar, ["schedule", "meeting", "focus_time"]],
];

// First sample that uses each block kind, in sample order.
const BLOCK_SPECIMENS: { block: Block; from: string }[] = [];
for (const { envelope } of samples.items) {
  for (const block of envelope.blocks) {
    if (!BLOCK_SPECIMENS.some((s) => s.block.kind === block.kind)) BLOCK_SPECIMENS.push({ block, from: envelope.widget_id });
  }
}

// The samples use only some chart kinds, so show all four from the chart sample.
const CHART_KINDS: ChartBlock["chart"][] = ["line", "bar", "area", "donut"];
const chartSample = BLOCK_SPECIMENS.find((s) => s.block.kind === "chart")!;
const chartBlock = (chart: ChartBlock["chart"]): ChartBlock => {
  const base = chartSample.block as ChartBlock;
  return { ...base, chart, series: chart === "donut" ? base.series.slice(0, 1) : base.series };
};

// Fixed specimen data for the Chrome section. Only the lengths of the two lists are read.
const CHROME_STATE: AppState = {
  ...initialState,
  approvals: Array.from({ length: 2 }) as AppState["approvals"],
  permissions: Array.from({ length: 1 }) as AppState["permissions"],
  tray: [{ kind: "approvals_waiting", count: 2, source: "approvals" }],
  reply: { requestId: "specimen", text: "Three things are due today. The first is the weekly review.", done: true },
};
const TRAY_KINDS = Object.keys(FIXED.tray) as AlertKind[];
const TRAY_SPECIMEN = TRAY_KINDS.map((kind) => ({ kind, source: "health" as const, ...(kind === "approvals_waiting" ? { count: 3 } : {}) }));
const SPECIMEN_NOW_MS = Date.UTC(2026, 10, 24, 9, 30);
const specimenAct: SessionTransport["act"] = async () => ({ ok: false, preview: true, message: FIXED.previewResult });
const noop = (): void => undefined;

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

        <section className="sg-section" aria-labelledby="sg-blocks">
          <h2 id="sg-blocks" className="sg-section-title">{FIXED.styleGuide.blocks}</h2>
          <div className="sg-grid">
            {BLOCK_SPECIMENS.map(({ block, from }) => (
              <HudFrame key={block.kind} title={block.kind} kicker={from} headingLevel={3}>
                <BlockBoundary>
                  <BlockRenderer block={block} />
                </BlockBoundary>
              </HudFrame>
            ))}
            {CHART_KINDS.map((chart) => (
              <HudFrame key={chart} title={`chart: ${chart}`} kicker={chartSample.from} headingLevel={3}>
                <BlockBoundary>
                  <BlockRenderer block={chartBlock(chart)} />
                </BlockBoundary>
              </HudFrame>
            ))}
          </div>
        </section>

        <section className="sg-section" aria-labelledby="sg-widgets">
          <h2 id="sg-widgets" className="sg-section-title">{FIXED.styleGuide.widgets}</h2>
          {PACK_TYPES.map(([pack, types]) => (
            <div key={pack} className="sg-pack">
              <h3 className="sg-pack-title">{pack}</h3>
              <div className="sg-grid">
                {samples.items.filter((i) => types.includes(i.widget.type)).map((i) => (
                  <WidgetPanel key={i.envelope.widget_id} envelope={i.envelope} now={samples.now} headingLevel={4} />
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="sg-section" aria-labelledby="sg-chrome">
          <h2 id="sg-chrome" className="sg-section-title">{FIXED.styleGuide.chrome}</h2>
          <HudFrame title={FIXED.chrome.specimens.topBar} kicker="Chrome" headingLevel={3}>
            <TopBar state={CHROME_STATE} nowMs={SPECIMEN_NOW_MS} timeZone="UTC" onNavigate={noop} headingLevel={4} />
          </HudFrame>
          <HudFrame title={FIXED.chrome.specimens.menuTray} kicker="Chrome" headingLevel={3}>
            <div className="sg-menu-open">
              <TopBar state={CHROME_STATE} nowMs={SPECIMEN_NOW_MS} timeZone="UTC" onNavigate={noop} headingLevel={4} open="tray" />
            </div>
          </HudFrame>
          <HudFrame title={FIXED.chrome.specimens.menuSettings} kicker="Chrome" headingLevel={3}>
            <div className="sg-menu-open">
              <TopBar state={initialState} nowMs={SPECIMEN_NOW_MS} timeZone="UTC" onNavigate={noop} headingLevel={4} open="settings" />
            </div>
          </HudFrame>
          <HudFrame title="Tray" kicker="Every alert kind" headingLevel={3}>
            <Tray items={TRAY_SPECIMEN} />
          </HudFrame>
          <HudFrame title={FIXED.chrome.specimens.trayEmpty} kicker="Tray" headingLevel={3}>
            <Tray items={[]} />
          </HudFrame>
          <HudFrame title={FIXED.chrome.specimens.chatClosed} kicker="Chat" headingLevel={3}>
            <ChatLine state={initialState} request={null} onAct={specimenAct} />
          </HudFrame>
          <HudFrame title="Chat line" kicker="Open" headingLevel={3}>
            <ChatLine state={CHROME_STATE} request="What is due today?" onAct={specimenAct} defaultOpen />
          </HudFrame>
          <HudFrame title={FIXED.chrome.specimens.chatEmpty} kicker="Chat" headingLevel={3}>
            <ChatLine state={initialState} request={null} onAct={specimenAct} defaultOpen />
          </HudFrame>
          <HudFrame title={FIXED.chrome.specimens.chatResult} kicker="Chat" headingLevel={3}>
            <ChatLine state={CHROME_STATE} request="What is due today?" onAct={specimenAct} defaultOpen initialResult={FIXED.previewResult} />
          </HudFrame>
          <HudFrame title={FIXED.chrome.specimens.ptt} kicker="Chat" headingLevel={3}>
            <div className="sg-ptt">
              <PushToTalk pressed={false} onChange={noop} />
              <PushToTalk pressed onChange={noop} />
            </div>
          </HudFrame>
        </section>
      </main>
    </>
  );
}
