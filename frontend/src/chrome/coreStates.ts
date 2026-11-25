import { FIXED } from "./fixedText";

export const CORE_STATES = [
  "idle", "listening", "transcribing", "thinking", "running_tools",
  "speaking", "awaiting_approval", "error", "plan_limit",
] as const;
export type CoreState = (typeof CORE_STATES)[number];

export function coreLabels(s: CoreState): { disc: string; pill: string } {
  return FIXED.core[s];
}
