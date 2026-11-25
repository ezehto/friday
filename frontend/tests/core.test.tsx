import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { Core } from "../src/chrome/Core";
import { CORE_STATES, coreLabels } from "../src/chrome/coreStates";
import { FIXED } from "../src/chrome/fixedText";
import { MotionSetting } from "../src/chrome/MotionSetting";
import { StatusPill } from "../src/chrome/StatusPill";
import { StyleGuide } from "../src/views/StyleGuide";

afterEach(() => delete document.documentElement.dataset.motion);

test("CORE_STATES has the nine states", () => {
  expect(CORE_STATES).toEqual([
    "idle", "listening", "transcribing", "thinking", "running_tools",
    "speaking", "awaiting_approval", "error", "plan_limit",
  ]);
});

test("each state renders its disc and pill label", () => {
  for (const s of CORE_STATES) {
    const { container, unmount } = render(
      <>
        <Core state={s} size="full" />
        <StatusPill state={s} />
      </>,
    );
    expect(container.querySelector(".core-disc-label")?.textContent).toBe(coreLabels(s).disc);
    expect(screen.getByRole("status").textContent).toBe(coreLabels(s).pill);
    expect(container.querySelector("[data-core-state]")?.getAttribute("data-core-state")).toBe(s);
    unmount();
  }
});

test("coreLabels reads FIXED.core", () => {
  for (const s of CORE_STATES) expect(coreLabels(s)).toBe(FIXED.core[s]);
  expect(coreLabels("idle")).toEqual({ disc: "READY", pill: "AWAITING COMMAND" });
});

test("the state radio group changes the core by keyboard", async () => {
  const user = userEvent.setup();
  const { container } = render(<StyleGuide />);
  expect(container.querySelector("[data-core-state]")?.getAttribute("data-core-state")).toBe("idle");
  await user.tab();
  expect(document.activeElement?.getAttribute("type")).toBe("radio");
  await user.keyboard("{ArrowRight}");
  expect(container.querySelector("[data-core-state]")?.getAttribute("data-core-state")).toBe("listening");
});

test("MotionSetting sets data-motion=reduced", async () => {
  const user = userEvent.setup();
  render(<MotionSetting />);
  await user.click(screen.getByRole("checkbox", { name: "Reduce motion" }));
  expect(document.documentElement.dataset.motion).toBe("reduced");
  await user.click(screen.getByRole("checkbox", { name: "Reduce motion" }));
  expect(document.documentElement.dataset.motion).toBeUndefined();
});
