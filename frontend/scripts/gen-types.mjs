import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { compile } from "json-schema-to-typescript";

const here = import.meta.dirname;
const out = resolve(here, "../src/generated/types.ts");
const mock = "../src/mocks/mock.schema.json";

const root = {
  $id: "https://friday.invalid/frontend/scripts/gen-root.json",
  $defs: {
    contract: { $ref: "../../schema/friday.schema.json" },
    ...(existsSync(resolve(here, mock)) ? { mock: { $ref: mock } } : {}),
  },
};

const ts = await compile(root, "GenRoot", {
  cwd: here,
  unreachableDefinitions: true,
  additionalProperties: false,
  bannerComment: "/* Generated from schema/ by scripts/gen-types.mjs. Do not edit. */",
});

if (process.argv.includes("--check")) {
  if (!existsSync(out) || readFileSync(out, "utf8") !== ts) {
    console.error("generated types are stale: run npm run gen:types");
    process.exit(1);
  }
} else {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, ts);
}
