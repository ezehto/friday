import { expect, test } from "vitest";
import { safeLink } from "../src/lib/safety";

test.each([
  "JavaScript:alert(1)",
  " javascript:alert(1)",
  "https://example.com ",
  "data:text/html,x",
  "//evil.example/x",
  "ftp://example.com",
  "https://user:pw@example.com",
  "https://github.com@evil.example/",
  "not a url",
  "",
])("safeLink rejects %j", (url) => {
  expect(safeLink(url)).toBeNull();
});

test("safeLink keeps a plain https link", () => {
  expect(safeLink("https://github.com/example/orchard")).toEqual({
    href: "https://github.com/example/orchard",
    host: "github.com",
  });
});

test("safeLink shows an IDN host as punycode", () => {
  expect(safeLink("https://exаmple.com")?.host).toMatch(/^xn--/);
});
