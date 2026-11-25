import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import { ChipsBlock } from "../src/blocks/Chips";
import { FactsBlock } from "../src/blocks/Facts";
import { KanbanBlock } from "../src/blocks/Kanban";
import { MeterBlock } from "../src/blocks/Meter";
import { PersonBlock } from "../src/blocks/Person";
import { RowsBlock } from "../src/blocks/Rows";
import { TableBlock } from "../src/blocks/Table";
import { TimelineBlock } from "../src/blocks/Timeline";

const cases: [string, () => ReturnType<typeof render>][] = [
  ["rows", () => render(<RowsBlock block={{ kind: "rows", items: [] }} />)],
  ["table", () => render(<TableBlock block={{ kind: "table", columns: ["A"], rows: [] }} />)],
  ["timeline", () => render(<TimelineBlock block={{ kind: "timeline", items: [] }} />)],
  ["chips", () => render(<ChipsBlock block={{ kind: "chips", items: [] }} />)],
  ["facts", () => render(<FactsBlock block={{ kind: "facts", items: [] }} />)],
  ["person", () => render(<PersonBlock block={{ kind: "person", people: [] }} />)],
  ["meter", () => render(<MeterBlock block={{ kind: "meter", items: [] }} />)],
  ["kanban without columns", () => render(<KanbanBlock block={{ kind: "kanban", columns: [] }} />)],
  ["kanban empty column", () => render(<KanbanBlock block={{ kind: "kanban", columns: [{ title: "Done", items: [] }] }} />)],
];

test.each(cases)("%s renders Nothing to show", (_name, draw) => {
  const { container } = draw();
  expect(container.textContent).toContain("Nothing to show");
});
