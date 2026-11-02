/**
 * The one order every model list follows (the Models menu, the lineup, the Tome's chapters, the launcher ring):
 * the owner's order, Halia, OUKA, Cherry, Tsubomi, then the rest. A model not listed sorts last.
 */
// ASTRAEA is no longer offered (owner decision): it is not in any Next product list. Its retirement page stays.
export const MODEL_ORDER: readonly string[] = ["halia", "ouka", "cherry", "tsubomi", "noctua", "aureum"];

/** A model's place in MODEL_ORDER (unlisted models come after every listed one). */
export function modelRank(id: string): number {
  const i = MODEL_ORDER.indexOf(id);
  return i < 0 ? MODEL_ORDER.length : i;
}

/**
 * The Models menu of the header and the footer, in the owner's order: the id (its icon is
 * icons/<id>.png and its availability the Store's), the name, and its page relative to the
 * language root. Every model has a page of its own.
 */
/** Each model's name as the copy spells it in every language. */
export const MODEL_NAMES: Readonly<Record<string, string>> = {
  halia: "Halia",
  ouka: "OUKA",
  cherry: "Cherry",
  tsubomi: "Tsubomi",
  noctua: "Noctua",
  aureum: "Aureum",
  // ASTRAEA's service ended on 2026-10-16: it stays in the menu, last, with its service-ended label.
  astraea: "ASTRAEA",
};

/** The tier each model is sold as on the site (owner, 2026-11-02). The mod keeps its own name on its page. */
export const MODEL_TIERS: Readonly<Record<string, string>> = { halia: "Ultra", ouka: "Max", cherry: "Pro", tsubomi: "Free" };

const TIER_FORM: Readonly<Record<string, string>> = {
  ja: "{0} モデル", en: "{0} model", de: "{0}-Modell", fr: "Modèle {0}", es: "Modelo {0}", it: "Modello {0}", "pt-br": "Modelo {0}",
  ru: "Модель {0}", ko: "{0} 모델", zh: "{0} 型号", ar: "طراز {0}", tr: "{0} modeli", id: "Model {0}",
};

/** A model's name in the site's lists: its tier ("Ultra モデル"), or its own name when it has no tier. */
export function modelListName(id: string, lang: string): string {
  const tier = MODEL_TIERS[id];
  return tier ? (TIER_FORM[lang] ?? "{0} model").replace("{0}", tier) : (MODEL_NAMES[id] ?? id);
}

/** The models whose service has ended: they keep their page and their place (last), but not a live slot. */
export const ENDED_MODELS: readonly string[] = ["astraea"];

/** Any list of model ids, in MODEL_ORDER (ids it does not list keep their relative order, after the rest). */
export function inModelOrder<T extends string>(ids: readonly T[]): T[] {
  return ids
    .map((id, i) => ({ id, i }))
    .sort((a, b) => modelRank(a.id) - modelRank(b.id) || a.i - b.i)
    .map((x) => x.id);
}

export const MODELS: readonly (readonly [id: string, name: string, href: string])[] = MODEL_ORDER.map(
  (id) => [id, MODEL_NAMES[id] ?? id, `${id}/`] as const,
);
