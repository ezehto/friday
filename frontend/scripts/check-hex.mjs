import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const exts = new Set([".ts", ".tsx", ".css", ".svg", ".html"]);
const allow = new Set(["styles/tokens.css"]);
const patterns = [
  /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b(?![\w-])/,
  /\b(?:rgb|rgba|hsl|hsla)\(/,
];

function* files(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules") yield* files(p);
    } else if (exts.has(extname(e.name))) yield p;
  }
}

/** Returns "path:line" for each raw colour literal outside the token file. */
export function checkHex(root) {
  const found = [];
  for (const file of files(root)) {
    const rel = relative(root, file).split("\\").join("/");
    if (allow.has(rel)) continue;
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (patterns.some((re) => re.test(line))) found.push(`${rel}:${i + 1}`);
      });
  }
  return found;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const found = checkHex(resolve(import.meta.dirname, "../src"));
  if (found.length) {
    console.error(`raw colour literals (use design tokens):\n${found.join("\n")}`);
    process.exit(1);
  }
}
