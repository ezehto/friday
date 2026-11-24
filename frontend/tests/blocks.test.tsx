import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { AlertBlock } from "../src/blocks/Alert";
import { ChipsBlock } from "../src/blocks/Chips";
import { FactsBlock } from "../src/blocks/Facts";
import { KanbanBlock } from "../src/blocks/Kanban";
import { MeterBlock } from "../src/blocks/Meter";
import { PersonBlock } from "../src/blocks/Person";
import { RowsBlock } from "../src/blocks/Rows";
import { TableBlock } from "../src/blocks/Table";
import { TextBlock } from "../src/blocks/Text";
import { TimelineBlock } from "../src/blocks/Timeline";
import { ValueBlock } from "../src/blocks/Value";

const cases: [string, () => ReturnType<typeof render>, string[]][] = [
  ["value", () => render(<ValueBlock block={{ kind: "value", label: "Open items", value: "42", unit: "tasks", change: "+3", hint: "since Monday", tone: "good" }} />), ["Open items", "42", "tasks", "+3", "since Monday"]],
  ["table", () => render(<TableBlock block={{ kind: "table", columns: ["Name", "State"], rows: [["Alpha", "ready"]] }} />), ["Name", "State", "Alpha", "ready"]],
  ["rows", () => render(<RowsBlock block={{ kind: "rows", heading: "Recent", items: [{ label: "Backup", detail: "nightly", meta: "09:05", tone: "good", source_ref: "notes/backup.md" }] }} />), ["Recent", "Backup", "nightly", "09:05", "notes/backup.md"]],
  ["meter", () => render(<MeterBlock block={{ kind: "meter", items: [{ label: "Chapters", done: 3, total: 8, tone: "attention" }] }} />), ["Chapters", "3 / 8"]],
  ["timeline", () => render(<TimelineBlock block={{ kind: "timeline", items: [{ when: "Mon", title: "Kickoff", detail: "with Ana", tone: "neutral" }] }} />), ["Mon", "Kickoff", "with Ana"]],
  ["person", () => render(<PersonBlock block={{ kind: "person", people: [{ name: "Ana Reyes", role: "Reviewer" }] }} />), ["Ana Reyes", "Reviewer"]],
  ["chips", () => render(<ChipsBlock block={{ kind: "chips", items: [{ label: "draft", tone: "attention" }] }} />), ["draft"]],
  ["text", () => render(<TextBlock block={{ kind: "text", text: "All quiet today.", tone: "good" }} />), ["All quiet today."]],
  ["facts", () => render(<FactsBlock block={{ kind: "facts", items: [{ label: "Repo", value: "friday" }] }} />), ["Repo", "friday"]],
  ["alert", () => render(<AlertBlock block={{ kind: "alert", level: "bad", text: "Backup failed", view: "traces" }} />), ["Backup failed", "Open traces"]],
  ["kanban", () => render(<KanbanBlock block={{ kind: "kanban", columns: [{ title: "Doing", items: [{ label: "Write docs", meta: "2d" }] }] }} />), ["Doing", "Write docs", "2d"]],
];

test.each(cases)("%s block renders its texts", (kind, draw, texts) => {
  const { container } = draw();
  expect(container.firstElementChild?.getAttribute("data-block-kind")).toBe(kind);
  for (const t of texts) expect(container.textContent).toContain(t);
});

test("onerror text renders literally", () => {
  const evil = "<img src=x onerror=alert(1)>";
  const { container } = render(<ValueBlock block={{ kind: "value", label: evil, value: "1" }} />);
  expect(screen.getByText(evil)).toBeTruthy();
  expect(container.querySelector("img")).toBeNull();
});

test("every toned element has an icon and a tone word", () => {
  const { container } = render(
    <>
      <ValueBlock block={{ kind: "value", label: "a", value: "1", tone: "bad" }} />
      <TextBlock block={{ kind: "text", text: "t", tone: "attention" }} />
      <ChipsBlock block={{ kind: "chips", items: [{ label: "c", tone: "good" }] }} />
      <AlertBlock block={{ kind: "alert", level: "neutral", text: "n" }} />
    </>,
  );
  const toned = container.querySelectorAll("[data-tone]");
  expect(toned.length).toBe(4);
  for (const el of toned) {
    expect(el.querySelector(".tone-icon svg")).not.toBeNull();
    expect(el.querySelector(".tone-icon")?.textContent).toBe(el.getAttribute("data-tone"));
  }
});

test("meter with done 12 total 10 shows 12 / 10 and a 100 percent bar", () => {
  const { container } = render(<MeterBlock block={{ kind: "meter", items: [{ label: "Over", done: 12, total: 10 }] }} />);
  expect(container.textContent).toContain("12 / 10");
  expect(container.querySelector<HTMLElement>(".meter-bar-fill")?.style.width).toBe("100%");
});

test("rows log variant shows meta then label", () => {
  const { container } = render(<RowsBlock block={{ kind: "rows", variant: "log", items: [{ label: "sync done", meta: "09:05", tone: "good" }] }} />);
  const li = container.querySelector("li")!;
  const text = li.textContent!;
  expect(text.indexOf("09:05")).toBeGreaterThanOrEqual(0);
  expect(text.indexOf("09:05")).toBeLessThan(text.indexOf("sync done"));
});

test("facts link shows the host", () => {
  render(<FactsBlock block={{ kind: "facts", items: [{ label: "Docs", value: "guide", link: { text: "Read", url: "https://example.com/guide" } }] }} />);
  expect(screen.getByRole("link").textContent).toContain("example.com");
});

test("alert view links to its hash route", () => {
  render(<AlertBlock block={{ kind: "alert", level: "attention", text: "x", view: "modules" }} />);
  expect(screen.getByRole("link").getAttribute("href")).toBe("#/modules");
});
