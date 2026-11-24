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
});

test.each([
  "http://127.0.0.1:8741/x",
  "https://2130706433/",
  "https://0x7f.1/",
  "http://localhost:8740/",
  "http://app.localhost/",
  "http://10.1.2.3/",
  "http://172.16.0.1/",
  "http://172.31.255.255/",
  "http://192.168.1.1/",
  "http://169.254.169.254/",
  "http://[::1]/",
  "http://[fd00::1]/",
  "http://[fe80::1]/",
  "http://[::ffff:127.0.0.1]/",
])("safeLink rejects local or private host %j", (url) => {
  expect(safeLink(url)).toBeNull();
});

test("safeLink keeps public hosts next to the private ranges", () => {
  expect(safeLink("https://172.32.0.1/")?.host).toBe("172.32.0.1");
  expect(safeLink("https://example.com")?.host).toBe("example.com");
});

test.each([
  "http://localhost.:8741/",
  "http://app.localhost./",
  "http://LOCALHOST./",
  "http://localhost。/",
  "http://localhost../",
  "http://[::127.0.0.1]/",
  "http://[64:ff9b::127.0.0.1]/",
  "http://[::ffff:0:127.0.0.1]/",
])("safeLink rejects trailing-dot or embedded IPv4 local host %j", (url) => {
  expect(safeLink(url)).toBeNull();
});

test.each(["https://localhost.example.com/", "http://[::ffff:8.8.8.8]/", "https://[2001:db8::1]/"])(
  "safeLink keeps %j",
  (url) => {
    expect(safeLink(url)).not.toBeNull();
  },
);
