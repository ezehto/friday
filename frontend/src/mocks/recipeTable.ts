import type { Block, Widget } from "../generated/types";

type Recipe = { kind: Block["kind"]; optional?: true }[];

/** Block kinds each widget type expands to, in order. The reference the L8 server recipes must match. */
export const RECIPE_BLOCKS: Record<Widget["type"], Recipe> = {
  stat: [{ kind: "value" }],
  chart: [{ kind: "chart" }],
  table: [{ kind: "table" }],
  task_list: [{ kind: "rows" }, { kind: "chips" }],
  progress: [{ kind: "meter" }],
  daily_focus: [{ kind: "rows" }, { kind: "text", optional: true }],
  project_status: [{ kind: "chips" }, { kind: "facts" }, { kind: "rows", optional: true }],
  career_progress: [{ kind: "value" }, { kind: "meter" }],
  work_timeline: [{ kind: "timeline" }],
  learning_roadmap: [{ kind: "timeline" }, { kind: "rows" }],
  standup: [{ kind: "rows" }, { kind: "rows" }, { kind: "rows", optional: true }, { kind: "chips" }],
  alert: [{ kind: "alert" }],
  task_queue: [{ kind: "rows" }, { kind: "chips" }],
  claude_run: [{ kind: "chips" }, { kind: "facts" }, { kind: "text", optional: true }],
  jira_ticket: [{ kind: "chips" }, { kind: "facts" }, { kind: "person" }],
  // person has no source field until the L14 pack adds assignees.
  jira_attention: [{ kind: "rows" }, { kind: "chips" }, { kind: "person", optional: true }],
  sprint: [{ kind: "facts" }, { kind: "kanban" }],
  sprint_burndown: [{ kind: "chart" }],
  schedule: [{ kind: "timeline" }],
  meeting: [{ kind: "facts" }, { kind: "person" }],
  focus_time: [{ kind: "timeline" }, { kind: "meter" }],
};
