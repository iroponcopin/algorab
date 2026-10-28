import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/** WCAG contrast of the theme tokens, parsed from styles/tokens.css, in both themes, with a planted-defect control. */
const css = readFileSync(new URL("../styles/tokens.css", import.meta.url), "utf8");

function block(start: string): string {
  const i = css.indexOf(start);
  assert.ok(i >= 0, `${start} not found`);
  const open = css.indexOf("{", i);
  let depth = 1;
  let j = open + 1;
  while (depth > 0) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}") depth--;
    j++;
  }
  return css.slice(open + 1, j - 1);
}

function tokens(b: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of b.matchAll(/(--cn-[a-z-]+):\s*([^;]+);/g)) out[m[1] as string] = (m[2] as string).trim();
  return out;
}

type RGB = [number, number, number];
const hex = (h: string): RGB => {
  const v = h.replace("#", "");
  return [0, 2, 4].map((i) => Number.parseInt(v.slice(i, i + 2), 16)) as RGB;
};
const lum = ([r, g, b]: RGB): number => {
  const f = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export const ratio = (a: RGB, b: RGB): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
/** rgb(r g b / a) over an opaque background. */
function over(tint: string, bg: RGB): RGB {
  const m = /rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/.exec(tint);
  assert.ok(m, `cannot read ${tint}`);
  const a = Number(m[4]);
  return [1, 2, 3].map((i) => Math.round(Number(m[i + 0]) * a + bg[i - 1]! * (1 - a))) as RGB;
}

const themes: Record<string, Record<string, string>> = {
  dark: tokens(block(":root {")),
  light: tokens(block(':root[data-theme="light"]')),
};

function failures(t: Record<string, string>): string[] {
  const bad: string[] = [];
  const void_ = hex(t["--cn-void"]!);
  const surface = hex(t["--cn-surface"]!);
  const glassOnVoid = over(t["--cn-glass-tint"]!, void_);
  const liteOnVoid = over(t["--cn-lite-tint"]!, void_);
  const check = (name: string, fg: RGB, bg: RGB, min: number): void => {
    const r = ratio(fg, bg);
    if (r < min) bad.push(`${name} ${r.toFixed(2)} < ${min}`);
  };
  for (const [bgName, bg] of [["void", void_], ["surface", surface], ["glass", glassOnVoid], ["lite", liteOnVoid]] as const) {
    for (const k of ["--cn-ink", "--cn-titanium", "--cn-muted", "--cn-accent", "--cn-ok", "--cn-warn", "--cn-bad"]) check(`${k} on ${bgName}`, hex(t[k]!), bg, 4.5);
    check(`--cn-faint on ${bgName}`, hex(t["--cn-faint"]!), bg, 3);
  }
  check("primary button (void on ink)", void_, hex(t["--cn-ink"]!), 4.5);
  return bad;
}

for (const name of ["dark", "light"]) {
  test(`${name}: text tokens hold 4.5:1 (body, secondary) and 3:1 (tertiary) on the substrate, surface and glass`, () => {
    assert.deepEqual(failures(themes[name]!), []);
  });
}

test("control: a planted defect (muted text almost the colour of the substrate) is caught in both themes", () => {
  for (const name of ["dark", "light"]) {
    const t = { ...themes[name]! };
    t["--cn-muted"] = t["--cn-void"]!;
    assert.ok(failures(t).some((f) => f.startsWith("--cn-muted")), `${name}: defect not caught`);
  }
});
