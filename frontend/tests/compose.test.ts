import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");

describe("compose files", () => {
  it.each(["compose.yaml", "compose.dev.yaml"])("%s publishes ports on 127.0.0.1 only", (file) => {
    const text = readFileSync(join(root, file), "utf8");
    const ports = [...text.matchAll(/^\s*ports:\s*\n((?:\s+-\s*.+\n?)+)/gm)]
      .flatMap((m) => m[1]!.split("\n"))
      .map((l) => l.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
    expect(ports.length).toBeGreaterThan(0);
    for (const p of ports) expect(p).toMatch(/^"?127\.0\.0\.1:\d+:\d+"?$/);
  });

  it(".dockerignore keeps secrets, host modules and local state out of the build", () => {
    const lines = readFileSync(join(root, ".dockerignore"), "utf8").split("\n").map((l) => l.trim());
    for (const e of [".git", ".beads", ".superpowers", ".playwright-cli", "CLAUDE.md", "docs/design-references", "secrets", "**/node_modules", "**/dist", "**/.env*", "**/*.env"])
      expect(lines).toContain(e);
  });
});
