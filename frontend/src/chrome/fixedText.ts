/** The single home of every fixed UI string. Later tasks add their own keys. */
export const FIXED = {
  core: {
    idle: { disc: "READY", pill: "AWAITING COMMAND" },
    listening: { disc: "LISTENING", pill: "LISTENING" },
    transcribing: { disc: "TRANSCRIBING", pill: "TRANSCRIBING" },
    thinking: { disc: "THINKING", pill: "THINKING" },
    running_tools: { disc: "TOOLS", pill: "RUNNING TOOLS" },
    speaking: { disc: "SPEAKING", pill: "SPEAKING" },
    awaiting_approval: { disc: "APPROVAL", pill: "AWAITING APPROVAL" },
    error: { disc: "ERROR", pill: "ERROR" },
    plan_limit: { disc: "LIMIT", pill: "CLAUDE PLAN LIMIT REACHED" },
  },
  // Placeholder: the owner picks the final line at the checkpoint (F14).
  tagline: "Quiet help, close at hand.",
  motionLabel: "Reduce motion",
  chartOther: "Other",
  emptyBlock: "Nothing to show",
  unsupportedBlock: "This block cannot be shown",
  stamps: { sample: "Sample data", work: "Work", asOf: "as of", stale: "Stale" },
  styleGuide: {
    blocks: "Blocks",
    widgets: "Widgets",
    packs: {
      core: "Core",
      projects: "Projects",
      career: "Career",
      server: "Server-made",
      jira: "Jira (later pack, L14)",
      calendar: "Calendar (later pack, L16)",
    },
  },
  alertView: {
    sessions: "Open sessions",
    permissions: "Open permissions",
    traces: "Open traces",
    modules: "Open modules",
  },
} as const;
