import type { Scenario, ViewSet } from "../generated/types";
import views from "./views.json";

export const BASE_VIEWS = views as ViewSet;

const GROUP_ORDER: Scenario["group"][] = ["request", "state", "edge"];
const files = import.meta.glob<Scenario>("./scenarios/*.json", { eager: true, import: "default" });

/** Every scenario file, ordered by group then label. Adding a file needs no list edit. */
export function loadScenarios(): Scenario[] {
  return Object.values(files).sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.label.localeCompare(b.label));
}
