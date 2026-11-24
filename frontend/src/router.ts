import { useSyncExternalStore } from "react";

export type View = "board" | "approvals" | "traces" | "sessions" | "permissions" | "style-guide";
export type Route = { view: View; scenario: string | null; instant: boolean };

export const VIEWS: readonly View[] = ["board", "approvals", "traces", "sessions", "permissions", "style-guide"];
const SCENARIO_ID = /^[a-z0-9-]{1,40}$/;

export function parseHash(hash: string): Route {
  const [path = "", query = ""] = hash.replace(/^#/, "").split("?");
  const params = new URLSearchParams(query);
  const name = path.replace(/^\//, "");
  const scenario = params.get("scenario");
  return {
    view: VIEWS.find((v) => v === name) ?? "board",
    scenario: scenario !== null && SCENARIO_ID.test(scenario) ? scenario : null,
    instant: params.get("instant") === "1",
  };
}

export function toHash(route: Route): string {
  const params = new URLSearchParams();
  if (route.scenario) params.set("scenario", route.scenario);
  if (route.instant) params.set("instant", "1");
  const query = params.toString();
  return `#/${route.view}${query ? `?${query}` : ""}`;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

const getHash = (): string => window.location.hash;

export function useRoute(): Route {
  // Subscribe to the raw string (stable snapshot); parse per render.
  return parseHash(useSyncExternalStore(subscribe, getHash));
}
