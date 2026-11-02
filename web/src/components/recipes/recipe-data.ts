import type { RecipeShared } from "@/lib/wiki-types";

/**
 * The recipe table's data: pure functions over the sheet. Server-safe (no window, no document, no three.js), so the
 * rows the server writes and the rows the browser draws come from the same code and cannot disagree.
 */

export type RecipeRow = Omit<RecipeShared["recipes"][number], "search" | "how" | "howText">;

export interface SheetItem {
  id: string;
  name: string;
  sub?: string;
  icon: string | null;
  /** The file of the item's shape as the game draws it (web/scripts/build_item_models.py). */
  shape?: string;
  /** How the shape is posed: a flat item faces the viewer, a solid one turns a corner to them. */
  kind?: string;
  /** The item's name and reading as the Japanese sheet gives them (for search). */
  read?: string;
}

export interface Sheet {
  items: Record<string, SheetItem>;
  recipes: RecipeRow[];
}

/** A model as the filter names it. */
export interface ModelTab {
  /** The chapter of the sheet. */
  cat: number;
  /** The model's id ("ouka", "halia"...): the value `?model=` takes. */
  model: string;
  name: string;
  count: number;
}

export interface StationOption {
  id: string;
  name: string;
  /** The item that is this station. */
  item: string | null;
  count: number;
}

/** The sheet, indexed once. */
export interface SheetIndex {
  /** Every result item, the models in the owner's order, each in the sheet's order. */
  order: string[];
  /** Recipes per result item, in the sheet's order. */
  byResult: Map<string, RecipeRow[]>;
  /** The chapter an item is listed under: the chapter of its first recipe. */
  catOf: Map<string, number>;
  /** Which results each item goes into, in table order. */
  usedIn: Map<string, string[]>;
}

export interface Ingredient {
  id: string;
  name: string;
  icon: string | null;
  /** Crafting-grid slot 0..8 (row-major), or -1 for a counted input. */
  slot: number;
  /** How many of it the recipe takes (grid cells are 1). */
  n: number;
  /** Counted inputs may be "any of its kind" (a tag or alternatives). */
  any: boolean;
}

export function normalise(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/**
 * Which model a chapter belongs to: the id prefix of the items it makes ("ouka:ouka_caster" is OUKA). A chapter also
 * holds recipes whose result is a vanilla item, and one of those can come first, so "minecraft" never names a
 * chapter: the most common other prefix does.
 */
export function modelOfCat(data: { recipes: readonly { cat: number; result: string }[] }, cat: number): string {
  const counts = new Map<string, number>();
  for (const r of data.recipes) {
    if (r.cat !== cat) continue;
    const ns = r.result.split(":")[0] ?? "";
    if (ns === "" || ns === "minecraft") continue;
    counts.set(ns, (counts.get(ns) ?? 0) + 1);
  }
  let best = "";
  let n = 0;
  for (const [ns, c] of counts) if (c > n) [best, n] = [ns, c];
  return best;
}

/** `rank` is the chapter's place in the owner's order of the models. */
export function buildIndex(sheet: Sheet, rank: (cat: number) => number): SheetIndex {
  const byResult = new Map<string, RecipeRow[]>();
  const catOf = new Map<string, number>();
  for (const r of sheet.recipes) {
    const list = byResult.get(r.result);
    if (list) list.push(r);
    else {
      byResult.set(r.result, [r]);
      catOf.set(r.result, r.cat);
    }
  }
  const sheetAt = new Map(Array.from(byResult.keys(), (id, i) => [id, i]));
  const order = Array.from(byResult.keys()).sort(
    (a, b) => rank(catOf.get(a) ?? 0) - rank(catOf.get(b) ?? 0) || (sheetAt.get(a) ?? 0) - (sheetAt.get(b) ?? 0),
  );
  const at = new Map(order.map((id, i) => [id, i]));
  const uses = new Map<string, Set<string>>();
  for (const r of sheet.recipes) {
    for (const ing of ingredientsOf(sheet, r)) {
      if (ing.id === r.result) continue;
      const s = uses.get(ing.id);
      if (s) s.add(r.result);
      else uses.set(ing.id, new Set([r.result]));
    }
  }
  const usedIn = new Map(Array.from(uses, ([id, s]) => [id, Array.from(s).sort((a, b) => (at.get(a) ?? 0) - (at.get(b) ?? 0))]));
  return { order, byResult, catOf, usedIn };
}

/** The recipe a row, the tree and the first tab show: the first one that reliably makes the item. */
export function sureRecipe(byResult: SheetIndex["byResult"], id: string): RecipeRow | undefined {
  return (byResult.get(id) ?? []).find(
    (r) => !(r.outputs ?? []).some((o) => o.chance !== undefined || o.nMax !== undefined || (o.id === id && o.every !== undefined)),
  );
}

/** The inputs of a recipe, in grid order or in the order the recipe lists them. */
export function ingredientsOf(sheet: Pick<Sheet, "items">, r: RecipeRow): Ingredient[] {
  if (r.grid) {
    return r.grid.flatMap((cell, slot) => {
      if (cell === 0) return [];
      const it = sheet.items[cell];
      return [{ id: cell, name: it?.name ?? cell, icon: it?.icon ?? null, slot, n: 1, any: false }];
    });
  }
  return (r.inputs ?? r.fusion ?? []).map((f) => {
    const it = sheet.items[f.id];
    return { id: f.id, name: it?.name ?? f.id, icon: it?.icon ?? null, slot: -1, n: f.n, any: "any" in f && f.any === true };
  });
}

/** The same ingredient added up: three cells of wool are one line, ×3. */
export function totalled(ingredients: readonly Ingredient[]): Ingredient[] {
  const m = new Map<string, Ingredient>();
  for (const ing of ingredients) {
    const had = m.get(ing.id);
    if (had) m.set(ing.id, { ...had, n: had.n + ing.n });
    else m.set(ing.id, ing);
  }
  return Array.from(m.values());
}

/** What a row of the table says about an item: its materials in one line, and the station when it is not the workbench. */
export interface RowFacts {
  id: string;
  name: string;
  sub?: string;
  icon: string | null;
  materials: string;
  /** The station's id, unless the item is made at the workbench. */
  station: string | null;
}

export function rowFacts(sheet: Pick<Sheet, "items">, byResult: SheetIndex["byResult"], id: string): RowFacts {
  const it = sheet.items[id];
  const r = sureRecipe(byResult, id) ?? byResult.get(id)?.[0];
  const parts = r ? totalled(ingredientsOf(sheet, r)) : [];
  const materials = parts.map((p) => (p.n > 1 ? `${p.name} ×${p.n}` : p.name)).join(" · ");
  return {
    id,
    name: it?.name ?? id,
    ...(it?.sub ? { sub: it.sub } : {}),
    icon: it?.icon ?? null,
    materials,
    station: r && r.station !== "workbench" ? r.station : null,
  };
}

/**
 * What search reads. `own` is what an item is called (its name in this language, its English name, its reading, its
 * id), `made` what it is made of and where. One array per field, in table order: a keystroke walks strings it does
 * not have to build.
 */
export interface SearchIndex {
  ids: string[];
  name: string[];
  own: string[];
  made: string[];
  cat: number[];
  stations: Set<string>[];
}

function spoken(sheet: Sheet, id: string): string {
  const it = sheet.items[id];
  return normalise([it?.name, it?.sub, it?.read].filter(Boolean).join(" "));
}

export function buildSearch(sheet: Sheet, index: SheetIndex, stationName: (id: string) => string): SearchIndex {
  const ids = index.order;
  const name: string[] = [];
  const own: string[] = [];
  const made: string[] = [];
  const cat: number[] = [];
  const stations: Set<string>[] = [];
  for (const id of ids) {
    const recipes = index.byResult.get(id) ?? [];
    name.push(normalise(sheet.items[id]?.name ?? id));
    own.push(`${spoken(sheet, id)} ${normalise(id).replace(/[_:]/g, " ")}`);
    const words: string[] = [];
    const seen = new Set<string>();
    for (const r of recipes) {
      if (!seen.has(`@${r.station}`)) {
        seen.add(`@${r.station}`);
        words.push(normalise(stationName(r.station)));
      }
      if (r.howLine) words.push(normalise(r.howLine.text));
      for (const ing of ingredientsOf(sheet, r)) {
        if (seen.has(ing.id)) continue;
        seen.add(ing.id);
        words.push(spoken(sheet, ing.id));
      }
    }
    made.push(words.join(" "));
    cat.push(index.catOf.get(id) ?? 0);
    stations.push(new Set(recipes.map((r) => r.station)));
  }
  return { ids, name, own, made, cat, stations };
}

export interface Filter {
  /** The chapter, or null for every model. */
  cat: number | null;
  station: string | null;
  query: string;
}

/**
 * The items a filter keeps. With a query the best matches come first: the exact name, a name that starts with it, a
 * name that holds it, what the item is otherwise called, then what it is made of. Every word of the query must match.
 */
export function search(s: SearchIndex, f: Filter): string[] {
  const words = normalise(f.query).split(/\s+/).filter(Boolean);
  const whole = words.join(" ");
  const out: { at: number; score: number }[] = [];
  for (let i = 0; i < s.ids.length; i++) {
    if (f.cat !== null && s.cat[i] !== f.cat) continue;
    if (f.station !== null && !s.stations[i]?.has(f.station)) continue;
    if (words.length === 0) {
      out.push({ at: i, score: 0 });
      continue;
    }
    const name = s.name[i] ?? "";
    const own = s.own[i] ?? "";
    const made = s.made[i] ?? "";
    if (!words.every((w) => own.includes(w) || made.includes(w))) continue;
    const score = name === whole ? 0 : name.startsWith(whole) ? 1 : name.includes(whole) ? 2 : words.every((w) => own.includes(w)) ? 3 : 4;
    out.push({ at: i, score });
  }
  out.sort((a, b) => a.score - b.score || a.at - b.at);
  return out.map((r) => s.ids[r.at] as string);
}
