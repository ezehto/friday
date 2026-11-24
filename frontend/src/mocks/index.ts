import type { Scenario, ViewSet } from "../generated/types";
import views from "./views.json";

const GROUP_ORDER: Scenario["group"][] = ["request", "state", "edge"];
const files = import.meta.glob<Scenario>("./scenarios/*.json", { eager: true, import: "default" });
// Git-ignored local overlay (see local.README.md); both globs are empty when the folder is absent.
const localFiles = import.meta.glob<Scenario>("./local/scenarios/*.json", { eager: true, import: "default" });
const localViews = import.meta.glob<Partial<ViewSet>>("./local/views.json", { eager: true, import: "default" });

/** Local scenarios replace committed ones with the same id; new ids are added. Order is group, then label. */
export function mergeScenarios(base: Scenario[], local: Scenario[]): Scenario[] {
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
