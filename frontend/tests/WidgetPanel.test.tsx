import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { FIXED } from "../src/chrome/fixedText";
import type { WidgetEnvelope } from "../src/generated/types";
import { WidgetPanel } from "../src/widgets/WidgetPanel";

const now = "2026-11-20T12:00:00Z";
const base: WidgetEnvelope = {
  widget_id: "w1",
  source: "git",
  as_of: "2026-11-20T10:00:00Z",
  data_class: "personal",
  title: "Panel",
  blocks: [{ kind: "text", text: "hello" }],
};
const panel = (e: Partial<WidgetEnvelope>) =>
  render(<WidgetPanel envelope={{ ...base, ...e } as WidgetEnvelope} now={now} timeZone="UTC" />);

test("sample envelope shows the Sample data stamp", () => {
  const { container } = panel({ source: "sample" });
  expect(container.textContent).toContain("Sample data");
  expect(panel({}).container.textContent).not.toContain("Sample data");
});

test("work envelope shows the Work chip", () => {
  expect(panel({ data_class: "work" }).container.textContent).toContain("Work");
});

test("as_of 30 h before now shows Stale", () => {
  expect(panel({ as_of: "2026-11-19T06:00:00Z" }).container.textContent).toContain("Stale");
  expect(panel({}).container.textContent).not.toContain("Stale");
});

test("an unknown block kind shows the fixed text and the other blocks still render", () => {
  const blocks = [{ kind: "text", text: "before" }, { kind: "mystery" }, { kind: "text", text: "after" }];
  const { container } = panel({ blocks: blocks as unknown as WidgetEnvelope["blocks"] });
  expect(container.textContent).toContain(FIXED.unsupportedBlock);
  expect(container.textContent).toContain("before");
  expect(container.textContent).toContain("after");
});

test("the wire example of section 16 renders its timeline", () => {
  const env = JSON.parse(readFileSync(`${import.meta.dirname}/../../schema/examples/last-week.envelope.json`, "utf8"));
  const { container } = panel(env);
  expect(container.querySelector('[data-block-kind="timeline"]')).not.toBeNull();
  expect(container.textContent).toContain("Natsu webhooks");
  expect(container.textContent).toContain("as of 08:14");
});

test("a known kind with missing fields shows the fixed line and siblings survive", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const blocks = [{ kind: "text", text: "before" }, { kind: "rows" }, { kind: "text", text: "after" }];
    const { container } = panel({ blocks: blocks as unknown as WidgetEnvelope["blocks"] });
    expect(container.textContent).toContain("before");
    expect(container.textContent).toContain("after");
    expect(container.textContent).toContain(FIXED.unsupportedBlock);
  } finally {
    spy.mockRestore();
  }
});

test("a null block shows the fixed line", () => {
  const { container } = panel({ blocks: [null, { kind: "text", text: "after" }] as unknown as WidgetEnvelope["blocks"] });
  expect(container.textContent).toContain(FIXED.unsupportedBlock);
  expect(container.textContent).toContain("after");
});

test("timeZone shifts the as of time", () => {
  expect(panel({ as_of: "2026-11-20T08:14:00Z" }).container.textContent).toContain("as of 08:14");
  const { container } = render(<WidgetPanel envelope={{ ...base, as_of: "2026-11-20T08:14:00Z" }} now={now} timeZone="Asia/Manila" />);
  expect(container.textContent).toContain("as of 16:14");
});

test("an envelope whose blocks is not an array still renders its title", () => {
  const { container } = panel({ blocks: null as unknown as WidgetEnvelope["blocks"] });
  expect(container.textContent).toContain("Panel");
});
