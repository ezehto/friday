import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import { ChartBlock } from "../src/blocks/Chart";
import { scale } from "../src/blocks/chartMath";
import type { ChartBlock as ChartBlockData } from "../src/generated/types";

type Kind = ChartBlockData["chart"];
const mk = (chart: Kind, ys: number[], name = "Alpha"): ChartBlockData => ({
  kind: "chart",
  chart,
  series: [{ name, points: ys.map((y, i) => ({ x: `x${i}`, y })) }],
});

const degenerate: [string, ChartBlockData][] = [
  ["single point line", mk("line", [3])],
  ["single point bar", mk("bar", [3])],
  ["single point area", mk("area", [3])],
  ["single point donut", mk("donut", [3])],
  ["all equal line", mk("line", [4, 4, 4])],
  ["all equal bar", mk("bar", [4, 4, 4])],
  ["all zero line", mk("line", [0, 0, 0])],
  ["all zero donut", mk("donut", [0, 0])],
  ["negative bar", mk("bar", [-5, -2, 3])],
  ["negative line", mk("line", [-5, -2, -9])],
  ["negative donut", mk("donut", [-5, 2])],
  ["huge area", mk("area", [1e12, 2e12, 1e12])],
  ["huge bar", mk("bar", [1e12, 1e12])],
  ["no points", mk("line", [])],
  ["no series", { kind: "chart", chart: "bar", series: [] }],
];

test.each(degenerate)("degenerate data renders without NaN: %s", (_n, block) => {
  const { container } = render(<ChartBlock block={block} />);
  for (const el of container.querySelectorAll("path, rect, circle, line, text")) {
    for (const a of Array.from(el.attributes)) expect(a.value).not.toMatch(/NaN|Infinity/);
    expect(el.textContent ?? "").not.toMatch(/NaN|Infinity/);
  }
});

test("all-zero donut shows Nothing to show", () => {
  const { container } = render(<ChartBlock block={mk("donut", [0, 0])} />);
  expect(container.textContent).toContain("Nothing to show");
});

test("five series of 500 points render", () => {
  const series = Array.from({ length: 5 }, (_, s) => ({
    name: `S${s}`,
    points: Array.from({ length: 500 }, (_, i) => ({ x: `p${i}`, y: Math.sin(i / 20 + s) * 100 })),
  }));
  const { container } = render(<ChartBlock block={{ kind: "chart", chart: "line", series }} />);
  expect(container.querySelectorAll("svg path").length).toBe(5);
});

test("the hidden table lists every value", () => {
  const block: ChartBlockData = {
    kind: "chart",
    chart: "bar",
    series: [
      { name: "Alpha", points: [{ x: "Mon", y: 1200 }, { x: "Tue", y: 7 }] },
      { name: "Beta", points: [{ x: "Mon", y: 3 }] },
    ],
  };
  const { container } = render(<ChartBlock block={block} />);
  const table = container.querySelector("table")!;
  expect(table.closest(".visually-hidden")).not.toBeNull();
  const text = table.textContent ?? "";
  for (const t of ["Alpha", "Beta", "Mon", "Tue", "1.2K", "7", "3"]) expect(text).toContain(t);
});

test("the root carries data-block-kind=chart", () => {
  const { container } = render(<ChartBlock block={mk("line", [1, 2])} />);
  const root = container.firstElementChild!;
  expect(root.tagName).toBe("FIGURE");
  expect(root.getAttribute("data-block-kind")).toBe("chart");
  expect(container.querySelector("svg")!.getAttribute("role")).toBe("img");
});

test("scale returns the midpoint for an empty domain", () => {
  expect(scale(5, 5, 5, 0, 100)).toBe(50);
  expect(scale(5, 0, 10, 0, 100)).toBe(50);
});
