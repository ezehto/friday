import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

// import.meta.dirname, not new URL + fileURLToPath: the jsdom environment replaces the URL class and fileURLToPath rejects it.
const dirs = [resolve(import.meta.dirname, "../../../schema"), resolve(import.meta.dirname, "../../src/mocks")];

/** Absolute paths of every *.schema.json under schema/ and src/mocks/. */
export function schemaFiles(): string[] {
  return dirs
    .filter((dir) => existsSync(dir))
    .flatMap((dir) => readdirSync(dir, { recursive: true, encoding: "utf8" }).map((f) => join(dir, f)))
    .filter((file) => file.endsWith(".schema.json"))
    .sort();
}

export function loadSchemas(): Ajv2020 {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);
  for (const file of schemaFiles()) ajv.addSchema(JSON.parse(readFileSync(file, "utf8")));
  return ajv;
}

let cached: Ajv2020 | undefined;

/** Error messages (with instance path), empty when valid. `id` is a file $id or `<$id>#/$defs/<Name>`. */
export function validateAgainst(id: string, data: unknown): string[] {
  cached ??= loadSchemas();
  const validate = cached.getSchema(id);
  if (!validate) throw new Error(`unknown schema id: ${id}`);
  return validate(data) ? [] : (validate.errors ?? []).map((e) => `${e.instancePath} ${e.message}`);
}
