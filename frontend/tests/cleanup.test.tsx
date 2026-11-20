import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import { App } from "../src/app";

test("first render", () => {
  render(<App />);
});

test("DOM is clean before the next test", () => {
  expect(document.querySelectorAll("h1").length).toBe(0);
});
