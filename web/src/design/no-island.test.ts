import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";

/**
 * Corvus Island is an abolished feature (owner decision) and is not listed. Its name must not return to the portal's source:
 * the export gate (scripts/check-export.mjs) checks the built pages, and this test checks the source tree.
 * Owner 2026-11-18: the plain word (Island, アイランド) is not forbidden; only the feature's name is, in English and Japanese.
 * "Perch" stays refused as a whole word, not "perché" or "perchlorate".
 */
const SRC = join(import.meta.dirname, "..");
const WORD =
  /(?<!\p{L})(?:corvus|algorab|コルヴス|コルウス|アルゴラブ)[\s\u00a0\u3000・-]*(?:islands?(?!\p{L})|アイランド)|(?<!\p{L})perch(?!\p{L})/giu;
const THIS = "design/no-island.test.ts";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|css)$/.test(name)) out.push(p);
  }
  return out;
}

test("the source tree never names Corvus Island or Perch", () => {
  const hits: string[] = [];
  for (const file of walk(SRC)) {
    const rel = relative(SRC, file).split("\\").join("/");
    if (rel === THIS) continue;
    const text = readFileSync(file, "utf8");
    text.split("\n").forEach((line, i) => {
      for (const m of line.matchAll(WORD)) hits.push(`${rel}:${i + 1}: ${m[0]}`);
    });
  }
  assert.deepEqual(hits, [], `Corvus Island and Perch are abolished; remove:\n${hits.join("\n")}`);
});
