/* Generated from schema/ by scripts/gen-types.mjs. Do not edit. */

/**
 * This interface was referenced by `Common`'s JSON-Schema
 * via the `definition` "DataClass".
 */
export type DataClass = "personal" | "work";
export type Block =
  | ValueBlock
  | ChartBlock
  | TableBlock
  | RowsBlock
  | MeterBlock
  | TimelineBlock
  | PersonBlock
  | ChipsBlock
  | TextBlock
  | FactsBlock
  | AlertBlock
  | KanbanBlock;
/**
 * This interface was referenced by `Common`'s JSON-Schema
 * via the `definition` "Tone".
 */
export type Tone = "good" | "bad" | "attention" | "neutral";
/**
 * This interface was referenced by `Common`'s JSON-Schema
 * via the `definition` "AlertView".
 */
export type AlertView = "sessions" | "permissions" | "traces" | "modules";
/**
 * This interface was referenced by `Friday`'s JSON-Schema
 * via the `definition` "widget".
 */
export type Widget =
  | StatWidget
  | ChartWidget
  | TableWidget
  | TaskListWidget
  | ProgressWidget
  | DailyFocusWidget
  | ProjectStatusWidget
  | CareerProgressWidget
  | WorkTimelineWidget
  | LearningRoadmapWidget
  | StandupWidget
  | AlertWidget
  | TaskQueueWidget
  | ClaudeRunWidget
  | JiraTicketWidget
  | JiraAttentionWidget
  | SprintWidget
  | SprintBurndownWidget
  | ScheduleWidget
  | MeetingWidget
  | FocusTimeWidget;
/**
 * This interface was referenced by `ClaudeRunWidget`'s JSON-Schema
 * via the `definition` "RunStatus".
 */
export type RunStatus =
  | "proposed"
  | "starting"
  | "working"
  | "waiting"
  | "done"
  | "failed"
  | "stopped"
  | "timed_out"
  | "cancelled"
  | "unlinked";
/**
 * This interface was referenced by `Friday`'s JSON-Schema
 * via the `definition` "server_frame".
 */
export type ServerFrame = {
  v: 1;
  type: "event" | "error" | "ack";
  id: FrameId;
  ts: string;
  name?: EventName;
  data: {};
};
/**
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "Id".
 */
export type FrameId = string;
/**
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "EventName".
 */
export type EventName =
  | "message.delta"
  | "message.done"
  | "request.started"
  | "request.finished"
  | "board.updated"
  | "approval.created"
  | "approval.updated"
  | "run.updated"
  | "session.updated"
  | "permission.pending"
  | "permission.resolved"
  | "session_message.sent"
  | "research.finished"
  | "alert.raised";
/**
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "AlertKind".
 */
export type AlertKind =
  | "approvals_waiting"
  | "run_finished"
  | "run_failed"
  | "run_timed_out"
  | "run_over_tokens"
  | "session_waiting"
  | "plan_limit"
  | "login_expiring"
  | "adapter_degraded"
  | "companion_degraded"
  | "over_budget"
  | "proposal_expiring";
/**
 * This interface was referenced by `undefined`'s JSON-Schema
 * via the `definition` "ProposalStatus".
 */
export type ProposalStatus = "pending" | "rejected" | "expired" | "executing" | "executed" | "verified" | "failed";
/**
 * This interface was referenced by `Mock`'s JSON-Schema
 * via the `definition` "ScriptCoreState".
 */
export type ScriptCoreState =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "running_tools"
  | "speaking"
  | "awaiting_approval"
  | "error"
  | "plan_limit";
/**
 * This interface was referenced by `Mock`'s JSON-Schema
 * via the `definition` "ScriptStep".
 */
export type ScriptStep =
  | {
      at_ms: number;
      event: EventName;
      data: {};
    }
  | {
      at_ms: number;
      /**
       * @maxItems 12
       */
      board: string[];
    }
  | {
      at_ms: number;
      reply: string;
    }
  | {
      at_ms: number;
      core: ScriptCoreState;
    };

export interface HttpsFridayInvalidFrontendScriptsGenRootJson {
  [k: string]: unknown;
}
/**
 * This interface was referenced by `HttpsFridayInvalidFrontendScriptsGenRootJson`'s JSON-Schema
 * via the `definition` "contract".
 */
export interface Friday {
  [k: string]: unknown;
}
/**
 * This interface was referenced by `Friday`'s JSON-Schema
 * via the `definition` "envelope".
 */
export interface WidgetEnvelope {
  widget_id: string;
  source: string;
  as_of: string;
  data_class: DataClass;
  title: string;
  /**
   * @minItems 1
   * @maxItems 6
   */
  blocks: [Block, ...Block[]];
}
export interface ValueBlock {
  kind: "value";
  label: string;
  value: string;
  unit?: string;
  change?: string;
  hint?: string;
  tone?: Tone;
}
export interface ChartBlock {
  kind: "chart";
  chart: "line" | "bar" | "area" | "donut";
  /**
   * @maxItems 5
   */
  series: {
    name: string;
    /**
     * @maxItems 500
     */
    points: {
      x: string;
      y: number;
    }[];
  }[];
  y_label?: string;
}
export interface TableBlock {
  kind: "table";
  /**
   * @maxItems 8
   */
  columns: string[];
  /**
   * @maxItems 50
   */
  rows: string[][];
}
export interface RowsBlock {
  kind: "rows";
  variant?: "list" | "log";
  heading?: string;
  /**
   * @maxItems 30
   */
  items: RowsItem[];
}
export interface RowsItem {
  label: string;
  detail?: string;
  meta?: string;
  tone?: Tone;
  link?: Link;
  source_ref?: string;
}
/**
 * This interface was referenced by `Common`'s JSON-Schema
 * via the `definition` "Link".
 */
export interface Link {
  text: string;
  url: string;
}
export interface MeterBlock {
  kind: "meter";
  /**
   * @maxItems 10
   */
  items: {
    label: string;
    done: number;
    total: number;
    tone?: Tone;
  }[];
}
export interface TimelineBlock {
  kind: "timeline";
  /**
   * @maxItems 30
   */
  items: {
    when: string;
    title: string;
    detail?: string;
    tone?: Tone;
  }[];
}
export interface PersonBlock {
  kind: "person";
  /**
   * @maxItems 12
   */
  people: {
    name: string;
    role?: string;
  }[];
}
export interface ChipsBlock {
  kind: "chips";
  /**
   * @maxItems 12
   */
  items: {
    label: string;
    tone?: Tone;
  }[];
}
export interface TextBlock {
  kind: "text";
  text: string;
  tone?: Tone;
}
export interface FactsBlock {
  kind: "facts";
  /**
   * @maxItems 12
   */
  items: {
    label: string;
    value: string;
    link?: Link;
  }[];
}
export interface AlertBlock {
  kind: "alert";
  level: Tone;
  text: string;
  view?: AlertView;
}
export interface KanbanBlock {
  kind: "kanban";
  /**
   * @maxItems 6
   */
  columns: {
    title: string;
    /**
     * @maxItems 20
     */
    items: {
      label: string;
      meta?: string;
    }[];
  }[];
}
export interface StatWidget {
  type: "stat";
  title?: string;
  label: string;
  value: string;
  change?: string;
  hint?: string;
  tone?: Tone;
}
export interface ChartWidget {
  type: "chart";
  title?: string;
  kind: "line" | "bar" | "area" | "donut";
  /**
   * @maxItems 5
   */
  series: {
    name: string;
    /**
     * @maxItems 500
     */
    points: {
      x: string;
      y: number;
    }[];
  }[];
}
export interface TableWidget {
  type: "table";
  title?: string;
  /**
   * @maxItems 8
   */
  columns: string[];
  /**
   * @maxItems 50
   */
  rows: string[][];
}
export interface TaskListWidget {
  type: "task_list";
  title?: string;
  /**
   * @maxItems 20
   */
  items: {
    title: string;
    status: "todo" | "doing" | "done" | "blocked";
    due?: string;
  }[];
}
export interface ProgressWidget {
  type: "progress";
  title?: string;
  label: string;
  done: number;
  total: number;
  tone?: Tone;
}
export interface DailyFocusWidget {
  type: "daily_focus";
  title?: string;
  /**
   * @maxItems 5
   */
  items: {
    title: string;
    why: string;
    source_ref: string;
  }[];
  note?: string;
}
export interface ProjectStatusWidget {
  type: "project_status";
  title?: string;
  name: string;
  status: "active" | "blocked" | "paused" | "done";
  /**
   * @maxItems 5
   */
  blockers?: string[];
  /**
   * @maxItems 5
   */
  risks?: string[];
  /**
   * @maxItems 6
   */
  milestones?: {
    name: string;
    due?: string;
    status: "planned" | "at_risk" | "done";
  }[];
  next?: string;
  last_commit?: string;
}
export interface CareerProgressWidget {
  type: "career_progress";
  title?: string;
  target: string;
  week: number;
  /**
   * @maxItems 10
   */
  skills: {
    name: string;
    done: number;
    total: number;
  }[];
}
export interface WorkTimelineWidget {
  type: "work_timeline";
  title?: string;
  /**
   * @maxItems 30
   */
  items: {
    when: string;
    title: string;
    detail?: string;
  }[];
}
export interface LearningRoadmapWidget {
  type: "learning_roadmap";
  title?: string;
  target: string;
  week: number;
  /**
   * @maxItems 16
   */
  weeks: {
    week: number;
    theme: string;
    status: "done" | "current" | "next" | "later";
  }[];
  /**
   * @maxItems 3
   */
  next?: {
    topic: string;
    why: string;
    source_ref: string;
  }[];
}
export interface StandupWidget {
  type: "standup";
  title?: string;
  /**
   * @maxItems 8
   */
  yesterday: {
    text: string;
    source_ref: string;
  }[];
  /**
   * @maxItems 8
   */
  today: {
    text: string;
    source_ref: string;
  }[];
  /**
   * @maxItems 8
   */
  blockers?: {
    text: string;
    source_ref: string;
  }[];
}
export interface AlertWidget {
  type: "alert";
  title?: string;
  level: Tone;
  text: string;
  view?: "sessions" | "permissions" | "traces" | "modules";
}
export interface TaskQueueWidget {
  type: "task_queue";
  title?: string;
  /**
   * @maxItems 20
   */
  items: {
    kind: "proposal" | "run" | "session" | "task";
    title: string;
    status: string;
    since: string;
    view: "approvals" | "sessions" | "permissions" | "board";
  }[];
}
export interface ClaudeRunWidget {
  type: "claude_run";
  title?: string;
  run_id: string;
  repo: string;
  mode: "ask" | "task";
  status: RunStatus;
  started?: string;
  duration?: string;
  usage?: string;
  excerpt?: string;
}
export interface JiraTicketWidget {
  type: "jira_ticket";
  title?: string;
  key: string;
  summary: string;
  status: string;
  priority: string;
  assignee: string;
  updated: string;
  url?: string;
}
export interface JiraAttentionWidget {
  type: "jira_attention";
  title?: string;
  /**
   * @maxItems 20
   */
  items: {
    key: string;
    summary: string;
    status: string;
    priority: string;
    reason: "blocked" | "assigned" | "mentioned" | "due";
  }[];
}
export interface SprintWidget {
  type: "sprint";
  title?: string;
  name: string;
  goal?: string;
  start: string;
  end: string;
  /**
   * @maxItems 6
   */
  columns: {
    status: string;
    /**
     * @maxItems 20
     */
    items: {
      key: string;
      summary: string;
    }[];
  }[];
}
export interface SprintBurndownWidget {
  type: "sprint_burndown";
  title?: string;
  sprint: string;
  /**
   * @maxItems 31
   */
  days: {
    date: string;
    remaining: number;
  }[];
}
export interface ScheduleWidget {
  type: "schedule";
  title?: string;
  day: string;
  /**
   * @maxItems 20
   */
  items: {
    start: string;
    end: string;
    title: string;
    kind: string;
  }[];
}
export interface MeetingWidget {
  type: "meeting";
  title: string;
  start: string;
  end: string;
  /**
   * @maxItems 12
   */
  attendees?: string[];
  location?: string;
  prep_ref?: string;
}
export interface FocusTimeWidget {
  type: "focus_time";
  title?: string;
  day: string;
  /**
   * @maxItems 20
   */
  blocks: {
    start: string;
    end: string;
    label: string;
  }[];
  total_minutes: number;
}
/**
 * This interface was referenced by `Friday`'s JSON-Schema
 * via the `definition` "common".
 */
export interface Common {
  [k: string]: unknown;
}
/**
 * This interface was referenced by `HttpsFridayInvalidFrontendScriptsGenRootJson`'s JSON-Schema
 * via the `definition` "mock".
 */
export interface Mock {
  [k: string]: unknown;
}
/**
 * This interface was referenced by `Mock`'s JSON-Schema
 * via the `definition` "MockWidget".
 */
export interface MockWidget {
  widget: Widget;
  envelope: WidgetEnvelope & {
    source?: "sample";
  };
}
/**
 * This interface was referenced by `Mock`'s JSON-Schema
 * via the `definition` "SampleSet".
 */
export interface SampleSet {
  now: string;
  items: MockWidget[];
}
/**
 * This interface was referenced by `Mock`'s JSON-Schema
 * via the `definition` "ProposalView".
 */
export interface ProposalView {
  proposal_id: string;
  host_action: boolean;
  tool: string;
  title: string;
  target?: string;
  target_folder?: string;
  data_class: DataClass;
  content: string;
  secret_scan: "clean" | "found";
  created: string;
  expires: string;
  args_sha256: string;
}
/**
 * This interface was referenced by `Mock`'s JSON-Schema
 * via the `definition` "RunView".
 */
export interface RunView {
  run_id: string;
  repo: string;
  mode: "ask" | "task";
  status: RunStatus;
  started: string;
}
/**
 * This interface was referenced by `Mock`'s JSON-Schema
 * via the `definition` "SessionView".
 */
export interface SessionView {
  session_id: string;
  project: string;
  data_class: DataClass;
  kind: "terminal" | "background" | "friday";
  state: "working" | "idle" | "waiting" | "done";
  waiting: boolean;
  last_activity: string;
}
/**
 * This interface was referenced by `Mock`'s JSON-Schema
 * via the `definition` "PermissionView".
 */
export interface PermissionView {
  request_id: string;
  session_id: string;
  project: string;
  data_class: DataClass;
  permission_mode: string;
  friday_started: boolean;
  cwd: string;
  tool: string;
  input: {
    [k: string]: string;
  };
}
/**
 * This interface was referenced by `Mock`'s JSON-Schema
 * via the `definition` "SpanView".
 */
export interface SpanView {
  span_id: string;
  parent_span_id: string | null;
  name: string;
  kind:
    | "request"
    | "decision"
    | "model_turn"
    | "tool_call"
    | "retrieval"
    | "subagent"
    | "approval"
    | "external_call"
    | "summary"
    | "handoff"
    | "claude_run"
    | "hook_event"
    | "permission_decision";
  duration_ms: number;
  tokens_in?: number;
  tokens_out?: number;
  status: "ok" | "error" | "timeout";
}
/**
 * This interface was referenced by `Mock`'s JSON-Schema
 * via the `definition` "TraceView".
 */
export interface TraceView {
  trace_id: string;
  label: string;
  started: string;
  duration_ms: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  /**
   * @maxItems 200
   */
  spans: SpanView[];
}
/**
 * This interface was referenced by `Mock`'s JSON-Schema
 * via the `definition` "TrayItem".
 */
export interface TrayItem {
  kind: AlertKind;
  count?: number;
  source: "approvals" | "permissions" | "sessions" | "traces" | "health";
}
/**
 * This interface was referenced by `Mock`'s JSON-Schema
 * via the `definition` "ViewSet".
 */
export interface ViewSet {
  approvals: ProposalView[];
  runs: RunView[];
  sessions: SessionView[];
  permissions: PermissionView[];
  traces: TraceView[];
  tray: TrayItem[];
}
/**
 * This interface was referenced by `Mock`'s JSON-Schema
 * via the `definition` "StateSnapshot".
 */
export interface StateSnapshot {
  approvals: ProposalView[];
  runs: RunView[];
  sessions: SessionView[];
  permissions: PermissionView[];
  traces: TraceView[];
  tray: TrayItem[];
  /**
   * @maxItems 12
   */
  board: WidgetEnvelope[];
}
/**
 * This interface was referenced by `Mock`'s JSON-Schema
 * via the `definition` "Scenario".
 */
export interface Scenario {
  id: string;
  group: "request" | "state" | "edge";
  label: string;
  request?: string;
  now: string;
  /**
   * @maxItems 20
   */
  widgets: MockWidget[];
  /**
   * @maxItems 200
   */
  script: ScriptStep[];
  views?: {
    approvals?: ProposalView[];
    runs?: RunView[];
    sessions?: SessionView[];
    permissions?: PermissionView[];
    traces?: TraceView[];
    tray?: TrayItem[];
  };
}
