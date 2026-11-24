import { expect, test } from "vitest";
import { parseHash, toHash } from "../src/router";

test("empty hash is the board", () => {
  expect(parseHash("")).toEqual({ view: "board", scenario: null, instant: false });
});

test("style guide view", () => {
  expect(parseHash("#/style-guide")).toEqual({ view: "style-guide", scenario: null, instant: false });
});

test("scenario id is kept", () => {
  expect(parseHash("#/board?scenario=focus-today").scenario).toBe("focus-today");
});

test("instant flag round-trips", () => {
  const route = parseHash("#/board?scenario=edge-caps&instant=1");
  expect(route.instant).toBe(true);
  expect(toHash(route)).toBe("#/board?scenario=edge-caps&instant=1");
});

test("unknown view falls back to board", () => {
  expect(parseHash("#/nope").view).toBe("board");
});

test("invalid scenario id becomes null", () => {
  expect(parseHash("#/board?scenario=Bad_ID").scenario).toBeNull();
  expect(parseHash(`#/board?scenario=${"a".repeat(41)}`).scenario).toBeNull();
});

test("canonical forms round-trip", () => {
  for (const h of ["#/board", "#/approvals", "#/traces?scenario=a-1", "#/style-guide", "#/sessions?instant=1"]) {
    expect(toHash(parseHash(h))).toBe(h);
  }
});
