import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { displayVersion, versionLabel } from "./version-label.ts";

// The same constant as scripts/tests/test_version_label.py: every repository carries the same bytes.
const VECTORS_SHA256 = "139fe6fa3518f53d4c6ee92a99d0556bbbbba5891ff54a59857fd528067d1a6d";
const vectorsUrl = new URL("./version-labels.v1.json", import.meta.url);

test("the shared vector file is the pinned copy", () => {
  const digest = createHash("sha256").update(readFileSync(vectorsUrl)).digest("hex");
  assert.equal(digest, VECTORS_SHA256);
});

test("every shared vector gives the same label as the Python rule", () => {
  const rows = JSON.parse(readFileSync(vectorsUrl, "utf8")) as [string, string | null][];
  assert.equal(rows.length, 20);
  for (const [text, want] of rows) {
    assert.equal(versionLabel(text), want, `vector ${JSON.stringify(text)}`);
  }
});

test("beta, release, hotfix and the next minor", () => {
  assert.equal(versionLabel("7.0.1"), "V7.0 Beta 1");
  assert.equal(versionLabel("7.0.100"), "V7.0");
  assert.equal(versionLabel("7.0.101"), "V7.0.1");
  assert.equal(versionLabel("7.1.1"), "V7.1 Beta 1");
});

test("below major 7 the number is unchanged", () => {
  assert.equal(versionLabel("6.7.0"), "6.7.0");
  assert.equal(versionLabel("6.2.3"), "6.2.3");
});

test("displayVersion shows the raw text when there is no label, never null", () => {
  assert.equal(displayVersion("7.0.1"), "V7.0 Beta 1");
  assert.equal(displayVersion("7.0.0"), "7.0.0");
  assert.equal(displayVersion("7.0.1.5"), "7.0.1.5");
  assert.notEqual(displayVersion("7.0.200"), "null");
});
