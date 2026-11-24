import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSchemas, schemaFiles, validateAgainst } from "./helpers/schema";

const repoRoot = resolve(import.meta.dirname, "../..") + "/";
const read = (rel: string) => JSON.parse(readFileSync(repoRoot + rel, "utf8"));
const ENV = "https://friday.invalid/schema/envelope.schema.json";
const WIDGET = "https://friday.invalid/schema/widgets/widget.schema.json";
const envelope = (blocks: unknown[]) => ({ ...read("schema/examples/last-week.envelope.json"), blocks });

describe("schema contract", () => {
  it("every schema file has an $id matching its path and a title", () => {
    const files = schemaFiles();
    expect(files.length).toBeGreaterThan(30);
    for (const file of files) {
      const schema = JSON.parse(readFileSync(file, "utf8"));
      expect(schema.$id).toBe(`https://friday.invalid/${relative(repoRoot, file)}`);
      expect(schema.title).toMatch(/^[A-Z][A-Za-z0-9]*$/);
    }
    expect(loadSchemas()).toBeDefined();
  });

  it("the section 16 wire example validates", () => {
    expect(validateAgainst(ENV, read("schema/examples/last-week.envelope.json"))).toEqual([]);
  });

  it("version.json holds a semver schema_version", () => {
    expect(read("schema/version.json").schema_version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("an 81-character title fails", () => {
    const errors = validateAgainst(ENV, { ...envelope([{ kind: "text", text: "x" }]), title: "t".repeat(81) });
    expect(errors.join("\n")).toContain("/title");
  });

  it("a timeline item without title fails", () => {
    const errors = validateAgainst(ENV, envelope([{ kind: "timeline", items: [{ when: "Mon" }] }]));
    expect(errors.join("\n")).toContain("title");
  });

  it("an unknown block kind fails", () => {
    expect(validateAgainst(ENV, envelope([{ kind: "carousel", items: [] }]))).not.toEqual([]);
  });

  it("a link with javascript: fails the pattern", () => {
    const block = { kind: "facts", items: [{ label: "a", value: "b", link: { text: "x", url: "javascript:alert(1)" } }] };
    expect(validateAgainst(ENV, envelope([block])).join("\n")).toContain("pattern");
  });

  it("an envelope with no blocks fails but an empty list inside a block is valid", () => {
    expect(validateAgainst(ENV, envelope([]))).not.toEqual([]);
    expect(validateAgainst(ENV, envelope([{ kind: "chips", items: [] }]))).toEqual([]);
  });

  const widgetCases: [string, Record<string, unknown>, string, unknown][] = [
    ["stat", { label: "a", value: "1" }, "value", 1],
    ["chart", { kind: "line", series: [] }, "kind", "pie"],
    ["table", { columns: ["a"], rows: [] }, "rows", "none"],
    ["task_list", { items: [] }, "items", "none"],
    ["progress", { label: "a", done: 1, total: 2 }, "total", 0],
    ["daily_focus", { items: [] }, "items", "none"],
    ["project_status", { name: "a", status: "active" }, "blockers", "none"],
    ["career_progress", { target: "a", week: 1, skills: [] }, "week", 17],
    ["work_timeline", { items: [] }, "items", "none"],
    ["learning_roadmap", { target: "a", week: 1, weeks: [] }, "weeks", "none"],
    ["standup", { yesterday: [], today: [] }, "today", "none"],
    ["alert", { level: "good", text: "a" }, "level", "warning"],
    ["task_queue", { items: [] }, "items", "none"],
    ["claude_run", { run_id: "r", repo: "a", mode: "ask", status: "done" }, "mode", "chat"],
  ];
  it.each(widgetCases)("%s: a valid widget passes and a wrong %s fails", (type, base, field, bad) => {
    expect(validateAgainst(WIDGET, { type, ...base })).toEqual([]);
    expect(validateAgainst(WIDGET, { type, ...base, [field]: bad }).join("\n")).toContain(`/${field}`);
  });
});
