import { useMemo, useState } from "react";
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
import { guarded, voiceLevel } from "../transport/mock";
import type { SessionTransport, VoiceLevelSource } from "../transport/types";
import samplesJson from "../mocks/samples.json";
import { BlockBoundary } from "../blocks/BlockBoundary";
import { BlockRenderer } from "../blocks/BlockRenderer";
import { Approvals, ProposalPreview } from "./Approvals";
import { PermissionCard, Permissions } from "./Permissions";
import { MessagePanel, RUN_STATUSES, RunsList, SessionsTable } from "./Sessions";
import { RequestList, SpanTree } from "./Traces";
import { PreviewBanner } from "./PreviewBanner";
import { RawField } from "./RawField";
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
const SPECIMEN_TRACES = [
  { trace_id: "sp-1", label: "Plan the specimen week", started: "2026-11-24T08:30:00Z", duration_ms: 4200, tokens_in: 5200, tokens_out: 640, cost_usd: 0.031, spans: [] },
  { trace_id: "sp-2", label: "Check the specimen notes", started: "2026-11-24T09:10:00Z", duration_ms: 850, tokens_in: 900, tokens_out: 120, cost_usd: 0.004, spans: [] },
];
const SPECIMEN_SPANS = [
  { span_id: "a", parent_span_id: null, name: "Request", kind: "request", duration_ms: 4200, tokens_in: 5200, tokens_out: 640, status: "ok" },
  { span_id: "b", parent_span_id: "a", name: "Search the notes", kind: "retrieval", duration_ms: 820, status: "ok" },
  { span_id: "c", parent_span_id: "a", name: "Call the calendar", kind: "external_call", duration_ms: 3000, status: "timeout" },
  { span_id: "d", parent_span_id: "c", name: "Retry the calendar", kind: "external_call", duration_ms: 900, status: "error" },
] as const;
const SPECIMEN_SESSIONS = [
  { session_id: "00000000-0000-4000-8000-000000000001", project: "Specimen", data_class: "work", kind: "terminal", state: "waiting", waiting: true, last_activity: "2026-11-24T08:57:00Z" },
  { session_id: "00000000-0000-4000-8000-000000000002", project: "Sample", data_class: "personal", kind: "background", state: "working", waiting: false, last_activity: "2026-11-24T08:40:00Z" },
] as const;
const SPECIMEN_RUNS = [
  { run_id: "r1", repo: "specimen-api", mode: "task", status: "working", started: "2026-11-24T08:20:00Z" },
  { run_id: "r2", repo: "sample-web", mode: "ask", status: "done", started: "2026-11-24T06:00:00Z" },
] as const;
const noop = (): void => undefined;
const SPECIMEN_HIDDEN = "echo start\r\n\tprintf '\u001b[31mdone\u001b[0m'\necho \u202edetaN\u200b noitcurtsed\nexport p\u0430ssword=demo";
const SPECIMEN_PROPOSAL = {
  proposal_id: "specimen-container", host_action: false, tool: "demo_write", title: "Save the specimen checklist", target: "demo/notes/specimen.md",
  data_class: "personal", content: "- First item\n- Second item\n", secret_scan: "clean", created: "2026-11-24T08:35:00Z", expires: "2026-11-24T09:35:00Z",
  args_sha256: "a1d8b9a02f896d31834e7c5b44a403063f1fc724b9d260fd5ae676d47b6bb164",
} as const;
const SPECIMEN_PERMISSION = {
  request_id: "specimen-permission", session_id: "00000000-0000-4000-8000-000000000000", project: "Specimen", data_class: "work", permission_mode: "default",
  friday_started: false, cwd: "/work/specimen", tool: "Bash", input: { command: SPECIMEN_HIDDEN },
} as const;

/** A local stand-in for the voice level, so the specimens move without a transport. One timer for all listeners. */
function demoLevel(kind: "listening" | "speaking"): VoiceLevelSource {
  const listeners = new Set<(level: number) => void>();
  let timer: ReturnType<typeof setInterval> | undefined;
  let n = 0;
  return {
    onLevel(listener) {
      listeners.add(listener);
      timer ??= setInterval(() => {
        const level = voiceLevel(kind, n++);
        for (const l of [...listeners]) guarded(l, level);
      }, 50);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          clearInterval(timer);
          timer = undefined;
        }
      };
    },
  };
}

function VoiceSpecimen(props: { kind: "listening" | "speaking" }) {
  const level = useMemo(() => demoLevel(props.kind), [props.kind]);
  return (
    <div className="sg-voice">
      <Core state={props.kind} size="full" level={level} />
      <PushToTalk pressed={false} onChange={noop} level={level} core={props.kind} />
    </div>
  );
}

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

        <HudFrame title="Voice level" kicker="Listening and speaking">
          <p>Listening draws inward in teal and speaking radiates outward in orange. The core and the waveform follow one level. Reduce motion shows the static core.</p>
          <div className="sg-voice-pair">
            <VoiceSpecimen kind="listening" />
            <VoiceSpecimen kind="speaking" />
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

        <section className="sg-section" aria-labelledby="sg-actions">
          <h2 id="sg-actions" className="sg-section-title">Approvals, permissions, traces and sessions</h2>
          <HudFrame title="Raw field" kicker="Hidden characters and a look-alike letter" headingLevel={3}>
            <div className="sg-raw">
              <RawField name="command" value={SPECIMEN_HIDDEN} />
              <RawField name="plain" value="pytest -x" />
            </div>
          </HudFrame>
          <HudFrame title="Preview banner" kicker="Sticky at the top of a view" headingLevel={3}>
            <PreviewBanner />
          </HudFrame>
          <ProposalPreview proposal={SPECIMEN_PROPOSAL} act={specimenAct} />
          <ProposalPreview proposal={{ ...SPECIMEN_PROPOSAL, proposal_id: "specimen-result", title: "Save the specimen checklist, result shown" }} act={specimenAct} initialResult={FIXED.previewResult} />
          <ProposalPreview proposal={{ ...SPECIMEN_PROPOSAL, proposal_id: "specimen-host", host_action: true, title: "Record the specimen decision", target_folder: "Specimen/Decisions" }} act={specimenAct} />
          <PermissionCard request={SPECIMEN_PERMISSION} position="Request 1 of 1" act={specimenAct} />
          <PermissionCard request={SPECIMEN_PERMISSION} position="Request 2 of 3" onPrev={noop} onNext={noop} act={specimenAct} />
          <PermissionCard request={SPECIMEN_PERMISSION} position="Deny without a reason" act={specimenAct} initialResult={FIXED.permissions.reasonNeeded} />
          <PermissionCard request={SPECIMEN_PERMISSION} position="Deny result" act={specimenAct} initialResult={FIXED.previewResult} />
          <HudFrame title="Approvals, empty" kicker="No proposals" headingLevel={3}>
            <Approvals state={initialState} act={specimenAct} />
          </HudFrame>
          <HudFrame title="Permissions, empty" kicker="No requests" headingLevel={3}>
            <Permissions state={initialState} act={specimenAct} />
          </HudFrame>
          <HudFrame title="Traces, request list" kicker="Selected request pressed" headingLevel={3}>
            <RequestList traces={SPECIMEN_TRACES} selected="sp-1" />
          </HudFrame>
          <HudFrame title="Traces, span tree" kicker="With error and timeout spans" headingLevel={3}>
            <SpanTree spans={[...SPECIMEN_SPANS]} />
          </HudFrame>
          <HudFrame title="Sessions, table" kicker="Waiting session first" headingLevel={3}>
            <SessionsTable sessions={[...SPECIMEN_SESSIONS]} />
          </HudFrame>
          <HudFrame title="Sessions, runs" kicker="Cancel on a live run" headingLevel={3}>
            <RunsList runs={[...SPECIMEN_RUNS]} act={specimenAct} />
          </HudFrame>
          <HudFrame title="Sessions, runs, every status" kicker="One run per status" headingLevel={3}>
            <RunsList runs={RUN_STATUSES.map((status) => ({ run_id: `s-${status}`, repo: `specimen-${status}`, mode: "task" as const, status, started: "2026-11-24T08:20:00Z" }))} act={specimenAct} />
          </HudFrame>
          <HudFrame title="Sessions, runs, result" kicker="After Cancel" headingLevel={3}>
            <RunsList runs={[...SPECIMEN_RUNS]} act={specimenAct} initialResult={FIXED.previewResult} />
          </HudFrame>
          <HudFrame title="Sessions, runs, empty" kicker="No runs" headingLevel={3}>
            <RunsList runs={[]} act={specimenAct} />
          </HudFrame>
          <HudFrame title="Sessions, message panel" kicker="With the attach hint" headingLevel={3}>
            <MessagePanel sessions={[...SPECIMEN_SESSIONS]} act={specimenAct} />
          </HudFrame>
          <HudFrame title="Sessions, message panel, empty text" kicker="Hint after Send" headingLevel={3}>
            <MessagePanel sessions={[...SPECIMEN_SESSIONS]} act={specimenAct} initialResult={FIXED.sessions.textNeeded} />
          </HudFrame>
          <HudFrame title="Sessions, message panel, result" kicker="After Send" headingLevel={3}>
            <MessagePanel sessions={[...SPECIMEN_SESSIONS]} act={specimenAct} initialText="Continue with the plan." initialResult={FIXED.previewResult} />
          </HudFrame>
          <HudFrame title="Sessions, message panel, no sessions" kicker="Empty" headingLevel={3}>
            <MessagePanel sessions={[]} act={specimenAct} />
          </HudFrame>
        </section>
      </main>
    </>
  );
}
