import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const skipDirs = new Set(["node_modules", "dist", ".git", ".beads", ".superpowers", ".playwright-cli"]);
const skipPaths = new Set(["docs/design-references"]);
const dash = /[\u2013\u2014]/;

function* files(root, dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      const rel = relative(root, p).split("\\").join("/");
      if (!skipDirs.has(e.name) && !skipPaths.has(rel)) yield* files(root, p);
    } else if (e.isFile()) yield p;
  }
}

/** Returns "path:line" for each en or em dash in a text file under root. */
export function checkDashes(root) {
  const found = [];
  for (const file of files(root, root)) {
    const buf = readFileSync(file);
    if (buf.includes(0)) continue; // binary
    buf
      .toString("utf8")
      .split("\n")
      .forEach((line, i) => {
        if (dash.test(line)) found.push(`${relative(root, file).split("\\").join("/")}:${i + 1}`);
      });
  }
  return found;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const found = checkDashes(process.argv[2] ?? resolve(import.meta.dirname, "../.."));
  if (found.length) {
    console.error(`en or em dashes found:\n${found.join("\n")}`);
    process.exit(1);
  }
}
