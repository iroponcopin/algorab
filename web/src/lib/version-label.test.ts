import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { betaTag, displayVersion, platformTag, versionLabel } from "./version-label.ts";
import { NEXT_RELEASE } from "../i18n/next-release.ts";

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

test("a beta tile never says Beta twice", () => {
  assert.equal(betaTag("Beta", "7.0.1"), "V7.0 Beta 1");
  assert.equal(betaTag("ベータ版", "7.0.2"), "V7.0 Beta 2");
  assert.equal(betaTag("ベータ版", "7.0.100"), "ベータ版 V7.0");
  assert.equal(betaTag("Beta", "6.3.0"), "Beta 6.3.0");
  assert.equal(betaTag("Beta", "7.0.0"), "Beta 7.0.0");
});

test("each Algorab app tile shows its own system's version", () => {
  assert.equal(platformTag("Windows", "7.0.100", "msi"), "Windows · V7.0 · .msi");
  assert.equal(platformTag("macOS", "6.2.2", "dmg"), "macOS · 6.2.2 · .dmg");
  assert.equal(platformTag("Linux", undefined, "AppImage"), "Linux · .AppImage");
});

// Windows-first V7.0 (owner 2026-11-18): the page's own copy says "Algorab 6" in 13 languages
// (src/i18n/next-release.ts). The day the stable manifest offers a V7 build on any system, that copy is no longer true:
// this test turns red until it is rewritten, so the promotion cannot ship it unnoticed.
test("no copy says Algorab 6 once the stable manifest offers a V7 build", () => {
  const manifest = JSON.parse(readFileSync(new URL("../../../glimpse_manifest.json", import.meta.url), "utf8"));
  const natives = Object.values(manifest.corvus6?.native ?? {}) as { version?: string }[];
  const v7 = natives.some((n) => /^([7-9]|[1-9][0-9]+)\./.test(n.version ?? ""));
  if (!v7) return;
  for (const [lang, copy] of Object.entries(NEXT_RELEASE)) {
    for (const [key, value] of Object.entries(copy)) {
      const texts = Array.isArray(value) ? value : [value];
      for (const t of texts) assert.ok(!/Algorab 6(?![.0-9])/.test(String(t)), `${lang}.${key}: ${t}`);
    }
  }
});
