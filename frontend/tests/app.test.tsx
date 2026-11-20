import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { App } from "../src/app";

test("empty renderer smoke: App renders the Friday shell with no panels", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "Friday" })).toBeTruthy();
  expect(document.querySelectorAll("[data-widget-id]").length).toBe(0);
});
