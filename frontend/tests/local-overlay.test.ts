import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Scenario, ViewSet } from "../src/generated/types";
import { BASE_VIEWS, loadScenarios, mergeScenarios, mergeViews } from "../src/mocks";
import views from "../src/mocks/views.json";

const sc = (id: string, group: Scenario["group"], label: string) => ({ id, group, label }) as Scenario;
const base = [sc("b", "request", "Beta"), sc("a", "request", "Alpha"), sc("s", "state", "State")];

describe("local mock overlay", () => {
  it("local scenarios replace committed ones by id and new ids are added", () => {
    const merged = mergeScenarios(base, [sc("a", "request", "Local alpha"), sc("z", "edge", "Zed")]);
    expect(merged.map((s) => s.id)).toEqual(["b", "a", "s", "z"]);
    expect(merged.find((s) => s.id === "a")?.label).toBe("Local alpha");
  });

  it("keeps the order by group, then label", () => {
    const merged = mergeScenarios(base, [sc("c", "request", "Aardvark")]);
    expect(merged.map((s) => s.label)).toEqual(["Aardvark", "Alpha", "Beta", "State"]);
  });

  it("local views replace whole keys and leave the others alone", () => {
    const local = { runs: [] } as Partial<ViewSet>;
    const merged = mergeViews(BASE_VIEWS, local);
    expect(merged.runs).toEqual([]);
    expect(merged.sessions).toBe(BASE_VIEWS.sessions);
  });

  it("with no local overlay the committed set loads unchanged", () => {
    expect(mergeScenarios(base, [])).toHaveLength(base.length);
    expect(mergeViews(BASE_VIEWS, {})).toEqual(BASE_VIEWS);
    expect(Object.keys(views).length).toBeGreaterThan(0);
  });

  it("every loaded scenario has a unique id", () => {
    const ids = loadScenarios().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no file under mocks/local is tracked by git", (ctx) => {
    let tracked: string;
    try {
      tracked = execFileSync("git", ["ls-files", "frontend/src/mocks/local", "src/mocks/local"], {
        cwd: resolve(import.meta.dirname, ".."),
        encoding: "utf8",
      });
    } catch {
      ctx.skip("git is not available here, so tracked files cannot be listed");
      return;
    }
    expect(tracked.trim()).toBe("");
  });
});
