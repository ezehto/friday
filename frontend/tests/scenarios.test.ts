import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXED } from "../src/chrome/fixedText";
import type { Block, Scenario, ServerFrame, ViewSet } from "../src/generated/types";
import { BASE_VIEWS, loadScenarios } from "../src/mocks";
import samples from "../src/mocks/samples.json";
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
    const pairs = [...scenarios.flatMap((s) => s.widgets), ...(samples.items as unknown as Scenario["widgets"])];
    let checked = 0;
    for (const { widget, envelope } of pairs) {
      const texts = [...(widget.type === "alert" ? [widget.text] : []), ...(envelope.blocks as Block[]).flatMap((b) => (b.kind === "alert" ? [b.text] : []))];
      for (const text of texts) expect(allowed).toContain(text);
      checked += texts.length;
    }
    expect(checked).toBeGreaterThanOrEqual(8);
  });

  it("chip counts read with the right plural", () => {
    const text = [...scenarioTexts, JSON.stringify(samples)].join("\n");
    for (const [, n, word] of text.matchAll(/"label": "(\d+) ([a-z]+)"/g)) {
      if (n === "1") expect(word, `1 ${word}`).not.toMatch(/^(proposals|runs|sessions|tasks|blockers)$/);
      else expect(word, `${n} ${word}`).not.toMatch(/^(proposal|run|session|task|blocker)$/);
    }
  });

  it("views.json permission inputs keep every control and lookalike character the marker rendering needs", () => {
    const inputs = BASE_VIEWS.permissions.flatMap((p) => Object.values(p.input)).join("");
    for (const ch of ["\r", "\t", "\u001b", "\u202e", "\u200b", "\u0430"]) expect(inputs, JSON.stringify(ch)).toContain(ch);
  });

  it("the review-implementation Orchard widgets are work data and the queue is no older than its items", () => {
    const s = scenarios.find((x) => x.id === "review-implementation") as Scenario;
    for (const id of ["ri-run", "ri-queue"]) expect(s.widgets.find((w) => w.envelope.widget_id === id)?.envelope.data_class, id).toBe("work");
    const queue = s.widgets.find((w) => w.envelope.widget_id === "ri-queue") as Scenario["widgets"][number];
    const since = (queue.widget as { items: { since: string }[] }).items.map((i) => Date.parse(i.since));
    expect(Date.parse(queue.envelope.as_of)).toBeGreaterThanOrEqual(Math.max(...since));
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

  it("only the project-blockers and edge-slow-source scenarios have a stale as_of", () => {
    for (const s of scenarios)
      for (const { envelope } of s.widgets) {
        const age = Date.parse(s.now) - Date.parse(envelope.as_of);
        if (s.id === "project-blockers" && age > 24 * 3600_000) expect(age).toBe(3 * 24 * 3600_000);
        else if (s.id === "edge-slow-source") expect(age).toBe(30 * 3600_000);
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

  const byId = (id: string) => scenarios.find((s) => s.id === id) as Scenario;
  const cps = (s: string) => Array.from(s).length;
  const strings = (v: unknown): string[] => (typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);
  const maxLengths = (v: unknown): number[] =>
    v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => (k === "maxLength" && typeof x === "number" ? [x] : maxLengths(x))) : [];

  it("edge-board-full shows exactly 12", () => {
    const s = byId("edge-board-full");
    expect(boardSteps(s).map((b) => b.length)).toEqual([12]);
    expect(new Set(s.widgets.map((w) => w.widget.type)).size).toBeGreaterThanOrEqual(10);
  });

  it("edge-caps contains at least one string at each cap of section 16", () => {
    const blockDir = resolve(import.meta.dirname, "../../schema/blocks");
    const common = JSON.parse(read("../../schema/common.schema.json")) as { $defs: { Link: unknown } };
    const envelope = JSON.parse(read("../../schema/envelope.schema.json")) as { properties: { title: unknown } };
    const caps = new Set([
      ...readdirSync(blockDir).flatMap((f) => maxLengths(JSON.parse(readFileSync(resolve(blockDir, f), "utf8")))),
      ...maxLengths(common.$defs.Link),
      ...maxLengths(envelope.properties.title),
    ]);
    expect([...caps].sort((a, b) => a - b)).toEqual([40, 60, 80, 200, 400, 2048]);
    const lengths = new Set(byId("edge-caps").widgets.flatMap((w) => strings(w.envelope.blocks).concat(w.envelope.title)).map(cps));
    for (const cap of caps) expect(lengths.has(cap), `a string of ${cap} code points`).toBe(true);
    const sc = byId("edge-caps");
    expect(sc.widgets.some((w) => w.envelope.title.length === 80 && !/\s/.test(w.envelope.title))).toBe(true);
    const chart = sc.widgets.flatMap((w) => w.envelope.blocks as Block[]).find((b) => b.kind === "chart");
    expect(chart?.kind === "chart" && chart.series.map((x) => x.points.length)).toEqual([500, 500, 500, 500, 500]);
    const table = sc.widgets.flatMap((w) => w.envelope.blocks as Block[]).find((b) => b.kind === "table");
    expect(table?.kind === "table" && [table.rows.length, table.columns.length, table.rows[0]?.length]).toEqual([50, 8, 8]);
  });

  it("state-error and state-plan-limit drive the matching core state", () => {
    for (const [id, state, kind] of [["state-error", "error", "adapter_degraded"], ["state-plan-limit", "plan_limit", "plan_limit"]] as const) {
      const s = byId(id);
      const cores = s.script.flatMap((st) => ("core" in st ? [st.core] : []));
      expect(cores.at(-1), id).toBe(state);
      const raised = s.script.find((st) => "event" in st && st.event === "alert.raised") as unknown as { data: { kind: string } };
      expect(raised.data.kind).toBe(kind);
      const alert = s.widgets.find((w) => w.widget.type === "alert")?.widget as { text: string };
      expect(alert.text).toBe(FIXED.alert[kind]);
    }
    expect(byId("state-waiting-approval").script.some((st) => "core" in st && st.core === "awaiting_approval")).toBe(true);
    expect(byId("state-waiting-approval").views?.tray).toEqual([{ kind: "approvals_waiting", count: 1, source: "approvals" }]);
    expect(byId("state-empty-board").widgets).toEqual([]);
  });

  it("edge-slow-source envelope is stale relative to scenario now", () => {
    const s = byId("edge-slow-source");
    for (const { envelope } of s.widgets) expect(Date.parse(s.now) - Date.parse(envelope.as_of)).toBe(30 * 3600_000);
    expect(s.script.find((st) => "board" in st)?.at_ms).toBe(4000);
  });

  it("edge-work-class shows personal and work project_status side by side", () => {
    const s = byId("edge-work-class");
    expect(s.widgets.map((w) => [w.widget.type, w.envelope.data_class])).toEqual([["project_status", "personal"], ["project_status", "work"]]);
  });

  it("edge-empty-widgets has one widget per MVP type with no list items", () => {
    const s = byId("edge-empty-widgets");
    expect(new Set(s.widgets.map((w) => w.widget.type)).size).toBe(14);
    expect(s.widgets.every((w) => (w.envelope.blocks as Block[]).length >= 1)).toBe(true);
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
