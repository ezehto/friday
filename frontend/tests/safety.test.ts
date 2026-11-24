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
  "https:/\\evil.example",
  "HTTPS://example.com",
  "ht\ntps://example.com",
  "java\tscript:alert(1)",
  "https://example.com/" + "a".repeat(2029),
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

test("safeLink reports the host the browser will use", () => {
  expect(safeLink("https://github.com\\@evil.example")?.host).toBe("github.com");
  expect(safeLink("https://2130706433/")?.host).toBe("127.0.0.1");
});
