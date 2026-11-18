/**
 * The Algorab version label (VERSION_DESIGN.md section 1). The same rule as scripts/version_label.py, and the same
 * shared vectors (src/lib/version-labels.v1.json, pinned by version-label.test.ts). The label is computed from the
 * number when it is shown; it is never stored in a manifest.
 *
 *   exactly X.Y.P (no leading zeros)          else null
 *   major below 7                             the number unchanged
 *   major 7 or more, P = 0 or P >= 200        null
 *   P 1..99   -> "VX.Y Beta P"     P = 100 -> "VX.Y"     P 101..199 -> "VX.Y.(P-100)"
 */

// Explicit [0-9]: \d would also accept other digit characters. JavaScript "$" never matches before a trailing newline.
const CANON = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

/** The label people see, or null when the text has no label. */
export function versionLabel(text: string): string | null {
  const m = CANON.exec(text);
  if (!m) return null;
  const major = m[1];
  const minor = m[2];
  const patch = m[3];
  if (Number(major) < 7) return text;
  const p = Number(patch);
  if (p === 0 || p >= 200) return null;
  if (p <= 99) return `V${major}.${minor} Beta ${patch}`;
  if (p === 100) return `V${major}.${minor}`;
  return `V${major}.${minor}.${p - 100}`;
}

/** What a page shows for a version: its label when it has one, otherwise the text as it is. Never "null". */
export function displayVersion(text: string): string {
  return versionLabel(text) ?? text;
}

/**
 * A beta tile's tag: the section's word for Beta, then the version. A V7 beta label already says "Beta"
 * ("V7.0 Beta 1"), so the word is not said twice ("Beta V7.0 Beta 1", "ベータ版 V7.0 Beta 1").
 */
export function betaTag(betaWord: string, version: string): string {
  const shown = displayVersion(version);
  const label = versionLabel(version);
  return label !== null && label !== version && label.includes(" Beta ") ? shown : `${betaWord} ${shown}`;
}

/**
 * One system's tile of the Algorab app: system, its own version, file type ("Windows · V7.0 · .msi",
 * "macOS · 6.2.2 · .dmg"). Each system has its own version, so a Windows-first V7.0 never reads as macOS or Linux 7.0.
 */
export function platformTag(system: string, version: string | undefined, ext: string): string {
  return version ? `${system} · ${displayVersion(version)} · .${ext}` : `${system} · .${ext}`;
}
