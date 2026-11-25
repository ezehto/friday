import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { LinkText } from "../src/blocks/LinkText";
import { formatNumber, formatTime, isStale } from "../src/lib/format";

test("formatNumber compacts and guards non-finite values", () => {
  expect(formatNumber(1e12)).toBe("1T");
  expect(formatNumber(1500)).toBe("1.5K");
  expect(formatNumber(NaN)).toBe("-");
  expect(formatNumber(Infinity)).toBe("-");
});

test("formatTime gives 24 h HH:MM in the given zone", () => {
  expect(formatTime("2026-11-20T09:05:00Z", "UTC")).toBe("09:05");
  expect(formatTime("2026-11-20T23:59:00Z", "UTC")).toBe("23:59");
  expect(formatTime("not a date", "UTC")).toBe("-");
});

test("isStale boundary is strictly more than 24 h", () => {
  const now = "2026-11-21T12:00:00Z";
  expect(isStale("2026-11-20T12:00:00Z", now)).toBe(false);
  expect(isStale("2026-11-20T11:59:59Z", now)).toBe(true);
  expect(isStale("2026-11-21T11:00:00Z", now)).toBe(false);
});

test("isStale treats an unparseable date as not stale", () => {
  expect(isStale("garbage", "2026-11-21T12:00:00Z")).toBe(false);
  expect(isStale("2026-11-20T12:00:00Z", "garbage")).toBe(false);
});

test("LinkText renders a safe link with its host", () => {
  render(<LinkText link={{ text: "Natsu README", url: "https://github.com/example/natsu" }} />);
  const a = screen.getByRole("link");
  expect(a.getAttribute("href")).toBe("https://github.com/example/natsu");
  expect(a.getAttribute("rel")).toBe("noopener noreferrer");
  expect(a.getAttribute("target")).toBe("_blank");
  expect(a.textContent).toBe("Natsu README (github.com)");
});

test("LinkText renders an unsafe link as plain text", () => {
  const { container } = render(<LinkText link={{ text: "click me", url: "javascript:alert(1)" }} />);
  expect(container.querySelector("a")).toBeNull();
  expect(container.textContent).toBe("click me");
});
