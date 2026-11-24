import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { FIXED } from "../src/chrome/fixedText";
import samples from "../src/mocks/samples.json";
import { StyleGuide } from "../src/views/StyleGuide";

const KINDS = ["value", "chart", "table", "rows", "meter", "timeline", "person", "chips", "text", "facts", "alert", "kanban"];

test("every sample renders exactly one panel", () => {
  const { container } = render(<StyleGuide />);
  expect(container.querySelectorAll("[data-widget-id]")).toHaveLength(samples.items.length);
});

test("every block kind appears", () => {
  const { container } = render(<StyleGuide />);
  const section = container.querySelector("#sg-blocks")!.closest("section")!;
  const kinds = new Set([...section.querySelectorAll("[data-block-kind]")].map((e) => e.getAttribute("data-block-kind")));
  expect(kinds).toEqual(new Set(KINDS));
});

test("later packs carry their layer label", () => {
  const { container } = render(<StyleGuide />);
  const titles = [...container.querySelectorAll(".sg-pack-title")].map((e) => e.textContent);
  expect(titles).toContain(FIXED.styleGuide.packs.jira);
  expect(titles).toContain(FIXED.styleGuide.packs.calendar);
  expect(FIXED.styleGuide.packs.jira).toContain("L14");
  expect(FIXED.styleGuide.packs.calendar).toContain("L16");
});

test("every interactive control is reachable by Tab", async () => {
  const user = userEvent.setup();
  const { container } = render(<StyleGuide />);
  const radios = [...container.querySelectorAll<HTMLInputElement>('input[name="core-state"]')];
  const motion = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  const stops: Element[] = [];
  for (let i = 0; i < 80; i++) {
    await user.tab();
    stops.push(document.activeElement!);
    if (document.activeElement === motion) break;
  }
  const radioStop = stops.findIndex((e) => radios.includes(e as HTMLInputElement));
  expect(radioStop).toBeGreaterThanOrEqual(0);
  expect(stops.indexOf(motion)).toBeGreaterThan(radioStop);
});
