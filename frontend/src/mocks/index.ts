import type { Scenario, ViewSet } from "../generated/types";
import views from "./views.json";

const GROUP_ORDER: Scenario["group"][] = ["request", "state", "edge"];
const files = import.meta.glob<Scenario>("./scenarios/*.json", { eager: true, import: "default" });
// Git-ignored local overlay (see local.README.md). Empty when the folder is absent, and always empty in
// production builds: keyed on DEV so the overlay never reaches dist.
const localFiles: Record<string, Scenario> = import.meta.env.DEV ? import.meta.glob<Scenario>("./local/scenarios/*.json", { eager: true, import: "default" }) : {};
const localViews: Record<string, Partial<ViewSet>> = import.meta.env.DEV ? import.meta.glob<Partial<ViewSet>>("./local/views.json", { eager: true, import: "default" }) : {};

/** Local scenarios replace committed ones with the same id; new ids are added. Order is group, then label. */
export function mergeScenarios(base: Scenario[], local: Scenario[]): Scenario[] {
  for (const list of [base, local]) if (new Set(list.map((s) => s.id)).size !== list.length) throw new Error("Duplicate scenario id within one scenario set");
  const byId = new Map([...base, ...local].map((s) => [s.id, s]));
  return [...byId.values()].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.label.localeCompare(b.label));
}

/** A key present in the local views replaces that whole list. */
export function mergeViews(base: ViewSet, local: Partial<ViewSet>): ViewSet {
  return { ...base, ...local };
}

export const BASE_VIEWS = mergeViews(views as ViewSet, Object.values(localViews)[0] ?? {});

/** Every scenario file, ordered by group then label. Adding a file needs no list edit. */
export function loadScenarios(): Scenario[] {
  return mergeScenarios(Object.values(files), Object.values(localFiles));
}
