import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXED } from "../src/chrome/fixedText";
import type { Block, Scenario, ServerFrame, ViewSet } from "../src/generated/types";
import { BASE_VIEWS, loadScenarios } from "../src/mocks";
import { RECIPE_BLOCKS } from "../src/mocks/recipeTable";
import { MockTransport } from "../src/transport/mock";
import { validateAgainst } from "./helpers/schema";

const MOCK = "https://friday.invalid/frontend/src/mocks/mock.schema.json";
const read = (path: string) => readFileSync(resolve(import.meta.dirname, path), "utf8");
const scenarios = loadScenarios();
const viewsText = read("../src/mocks/views.json");
const scenarioTexts = scenarios.map((s) => JSON.stringify(s));
const requests = scenarios.filter((s) => s.group === "request");

const L2: Record<string, string> = {
  "focus-today": "What should I focus on today?",
  "project-blockers": "What's blocking my projects?",
  standup: "Prepare my standup",
  "jira-attention": "What Jira tickets need my attention?",
  "career-progress": "How am I progressing toward Senior Software Engineer?",
  "learn-next": "What should I learn next?",
  "last-week": "What did I work on last week?",
  "plan-week": "Plan my week",
  "review-implementation": "Review this implementation",
  "email-summary": "Summarize my important emails",
};
const boardSteps = (s: Scenario) => s.script.flatMap((st) => ("board" in st ? [st.board] : []));

describe("scenarios", () => {
  it("every scenario file validates against Scenario", () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(10);
    for (const s of scenarios) expect(validateAgainst(`${MOCK}#/$defs/Scenario`, s), s.id).toEqual([]);
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(scenarios.length);
  });

  it("every board step references existing widget ids", () => {
    for (const s of scenarios) {
      const ids = new Set(s.widgets.map((w) => w.envelope.widget_id));
      for (const board of boardSteps(s)) for (const id of board) expect(ids.has(id), `${s.id}: ${id}`).toBe(true);
    }
  });

  it("every widget in a scenario is shown by some board step and validates against its type schema", () => {
    for (const s of scenarios) {
      const shown = new Set(boardSteps(s).flat());
      for (const { widget, envelope } of s.widgets) {
        expect(shown.has(envelope.widget_id), `${s.id}: ${envelope.widget_id}`).toBe(true);
        expect(validateAgainst(`https://friday.invalid/schema/widgets/${widget.type}.schema.json`, widget), `${s.id}: ${widget.type}`).toEqual([]);
        expect(envelope.source).toBe("sample");
        expect(envelope.title).toBe(widget.title);
      }
    }
  });

  it("every envelope's block kinds match RECIPE_BLOCKS", () => {
    for (const s of scenarios)
      for (const { widget, envelope } of s.widgets) {
        const kinds = (envelope.blocks as Block[]).map((b) => b.kind);
        let j = 0;
        for (const r of RECIPE_BLOCKS[widget.type]) {
          if (kinds[j] === r.kind) j++;
          else expect(r.optional, `${s.id}/${widget.type}: ${r.kind} missing`).toBe(true);
        }
        expect(j, `${s.id}/${widget.type}`).toBe(kinds.length);
      }
  });

  it("every request scenario has the exact L2 example text", () => {
    expect(requests.map((s) => s.id).sort()).toEqual(Object.keys(L2).sort());
    for (const s of requests) expect(s.request, s.id).toBe(L2[s.id]);
  });

  it("every alert widget text is a FIXED.alert value", () => {
    const allowed = Object.values(FIXED.alert) as string[];
    for (const s of scenarios)
      for (const { widget, envelope } of s.widgets) {
        if (widget.type === "alert") expect(allowed).toContain(widget.text);
        for (const b of envelope.blocks as Block[]) if (b.kind === "alert") expect(allowed).toContain(b.text);
      }
  });

  it("FIXED.alert has one entry per AlertKind", () => {
    const schema = JSON.parse(read("../../schema/frames/server-frame.schema.json")) as { $defs: { AlertKind: { enum: string[] } } };
    expect(Object.keys(FIXED.alert).sort()).toEqual([...schema.$defs.AlertKind.enum].sort());
  });

  it("views.json validates against ViewSet", () => {
    expect(validateAgainst(`${MOCK}#/$defs/ViewSet`, BASE_VIEWS)).toEqual([]);
    expect(BASE_VIEWS).toMatchObject({ approvals: { length: 2 }, runs: { length: 2 }, sessions: { length: 3 }, permissions: { length: 2 }, traces: { length: 3 } });
    expect(BASE_VIEWS.tray.map((t) => t.kind)).toEqual(["approvals_waiting", "session_waiting", "run_finished"]);
  });

  it("no board step shows more than 12", () => {
    for (const s of scenarios) for (const board of boardSteps(s)) expect(board.length, s.id).toBeLessThanOrEqual(12);
  });

  it("only the project-blockers scenario has a stale as_of", () => {
    for (const s of scenarios)
      for (const { envelope } of s.widgets) {
        const age = Date.parse(s.now) - Date.parse(envelope.as_of);
        if (s.id === "project-blockers" && age > 24 * 3600_000) expect(age).toBe(3 * 24 * 3600_000);
        else expect(age, `${s.id}/${envelope.widget_id}`).toBeLessThanOrEqual(24 * 3600_000);
      }
  });

  it("the voice scenarios open on listening and speak for the reply plus 300 ms", () => {
    for (const id of ["focus-today", "standup"]) {
      const s = scenarios.find((x) => x.id === id) as Scenario;
      const cores = s.script.flatMap((st) => ("core" in st ? [st] : []));
      expect(cores.map((c) => c.core), id).toEqual(["listening", "transcribing", "thinking", "speaking", "idle"]);
      expect(cores[0]?.at_ms).toBe(0);
      expect(cores[1]?.at_ms).toBe(1200);
      const reply = s.script.find((st) => "reply" in st) as { at_ms: number; reply: string };
      const words = reply.reply.match(/\s*\S+\s*/g)?.length ?? 0;
      expect(cores[3]?.at_ms).toBe(reply.at_ms);
      expect(cores[4]!.at_ms - reply.at_ms).toBeGreaterThanOrEqual(words * 30 + 300);
      const names = s.script.flatMap((st) => ("event" in st ? [st.event] : []));
      expect(names.at(-1)).toBe("request.finished");
    }
    for (const s of requests.filter((x) => !["focus-today", "standup"].includes(x.id)))
      expect(s.script[0], s.id).toEqual({ at_ms: 0, core: "thinking" });
  });

  it("all URLs are synthetic", () => {
    const text = [viewsText, ...scenarioTexts].join("\n");
    for (const url of text.match(/https?:\/\/[^\s"\\]+/g) ?? [])
      expect(url).toMatch(/^https?:\/\/(example\.com|example\.org|github\.com\/example)(\/|$)/);
    for (const [host, , , path] of text.matchAll(/\b[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|org|net|io|dev|app|co)\b(\/[^\s"\\]*)?/gi)) {
      const name = host.replace(/\/.*$/, "").toLowerCase();
      if (name === "github.com") expect(path ?? "", host).toMatch(/^\/example(\/|$)/);
      else expect(["example.com", "example.org"], host).toContain(name);
    }
  });

  it("every scenario replays through MockTransport and every frame validates against ServerFrame", async () => {
    for (const s of scenarios) {
      const t = new MockTransport(s, BASE_VIEWS as ViewSet, { instant: true, schedule: (fn) => (fn(), 0) });
      const frames: ServerFrame[] = [];
      t.subscribe((f) => frames.push(f));
      await t.connect();
      expect(frames.length, s.id).toBeGreaterThan(0);
      for (const f of frames) expect(validateAgainst("https://friday.invalid/schema/frames/server-frame.schema.json", f), `${s.id}: ${f.name}`).toEqual([]);
      t.close();
    }
  });
});
