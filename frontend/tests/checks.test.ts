import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkDashes } from "../scripts/check-dashes.mjs";
import { checkHex } from "../scripts/check-hex.mjs";

const EN = "\u2013";
const EM = "\u2014";
let dir: string;

function put(rel: string, text: string) {
  const p = join(dir, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "friday-checks-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("check:hex", () => {
  it("fails a planted #ff7a1a in a .tsx", () => {
    put("a.tsx", 'const c = "#ff7a1a";\n');
    expect(checkHex(dir)).toEqual(["a.tsx:1"]);
  });
  it("fails rgb( and hsl( literals", () => {
    put("a.css", "a{color:rgb(1,2,3)}\nb{color:hsl(1,2%,3%)}\n");
    expect(checkHex(dir)).toEqual(["a.css:1", "a.css:2"]);
  });
  it("passes the same value in styles/tokens.css", () => {
    put("styles/tokens.css", ":root{--a:#ff7a1a}\n");
    expect(checkHex(dir)).toEqual([]);
  });
  it('passes href="#/board" (not a colour)', () => {
    put("a.tsx", '<a href="#/board">x</a>\n');
    expect(checkHex(dir)).toEqual([]);
  });
});

describe("check:dashes", () => {
  it("fails a U+2014 in a .md", () => {
    put("a.md", `x ${EM} y\n`);
    expect(checkDashes(dir)).toEqual(["a.md:1"]);
  });
  it("fails a U+2013 in a .tsx string", () => {
    put("a.tsx", `const s = "1${EN}2";\n`);
    expect(checkDashes(dir)).toEqual(["a.tsx:1"]);
  });
  it("skips .superpowers/ and docs/design-references/", () => {
    put(".superpowers/n.md", EM);
    put("docs/design-references/n.md", EM);
    expect(checkDashes(dir)).toEqual([]);
  });
  it("fails a U+2014 in docs/guides/x.md", () => {
    put("docs/guides/x.md", EM);
    expect(checkDashes(dir)).toEqual(["docs/guides/x.md:1"]);
  });
});
