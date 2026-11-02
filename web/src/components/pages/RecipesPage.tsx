import { FRESH } from "@/i18n/fresh";
import { modelRank } from "@/lib/models";
import { langData, recipeModelList, wiki } from "@/lib/wiki";
import type { Lang } from "@/lib/wiki-types";
import { buildIndex, modelOfCat, type ModelTab, rowFacts, type Sheet, type StationOption } from "../recipes/recipe-data";
import { RecipeBrowser } from "../recipes/RecipeBrowser";
import { type RecipeGroup, RecipeTable } from "../recipes/RecipeTable";

/** The item the page opens on, beside the table. Any item with a recipe works; the first item stands in if it goes. */
const FEATURED = "halia:halia_blade[item.halia.gale_fang]";

/**
 * The recipes page. The server writes the whole table as plain rows: every item and what it is made of, readable with
 * no script at all and findable with the browser's own search. The sheet itself (every recipe in full) is one file per
 * language, fetched by RecipeBrowser, which turns those rows into a searchable table and opens an item beside it.
 */
export function RecipesPage({ lang }: { lang: Lang }) {
  const d = langData(lang);
  const shared = wiki().recipes;
  const r = d.recipes;
  const f = FRESH[lang].recipes;

  const sheet: Sheet = {
    items: Object.fromEntries(
      Object.entries(shared.items).map(([id, it]) => [id, { id, name: r.names[id] ?? it.en, ...(r.subs[id] ? { sub: r.subs[id] } : {}), icon: it.icon }]),
    ),
    recipes: shared.recipes,
  };
  const modelOf = new Map(shared.cats.map((c) => [c.index, modelOfCat(shared, c.index)]));
  const index = buildIndex(sheet, (cat) => modelRank(modelOf.get(cat) ?? ""));

  const stationName = (id: string): string => {
    const item = shared.stations.find((s) => s.id === id)?.item;
    return (item ? sheet.items[item]?.name : undefined) ?? id;
  };

  // One unit everywhere: the number of items, each counted once, under the chapter of its first recipe.
  const members = new Map<number, string[]>();
  for (const id of index.order) {
    const cat = index.catOf.get(id) ?? 0;
    const list = members.get(cat);
    if (list) list.push(id);
    else members.set(cat, [id]);
  }
  const tabs: ModelTab[] = Array.from(members, ([cat, ids]) => ({
    cat,
    model: modelOf.get(cat) ?? "",
    name: r.catNames[cat] ?? shared.cats[cat]?.name ?? "",
    count: ids.length,
  }));
  const groups: RecipeGroup[] = tabs.map((tab) => ({ ...tab, rows: (members.get(tab.cat) ?? []).map((id) => rowFacts(sheet, index.byResult, id)) }));

  const atStation = new Map<string, Set<string>>();
  for (const rec of shared.recipes) {
    const s = atStation.get(rec.station);
    if (s) s.add(rec.result);
    else atStation.set(rec.station, new Set([rec.result]));
  }
  const stations: StationOption[] = Array.from(atStation, ([id, s]) => ({ id, name: stationName(id), item: shared.stations.find((x) => x.id === id)?.item ?? null, count: s.size })).sort(
    (a, b) => b.count - a.count,
  );

  const names: Record<string, string> = Object.fromEntries(stations.map((s) => [s.id, s.name]));
  return (
    <section className="rx">
      <noscript>
        <style>{".rx-bar,.rx-panel,.rx-count{display:none}.rx-body{grid-template-columns:minmax(0,1fr)}"}</style>
      </noscript>
      <div className="ac-wrap rx-head">
        <h1 className="rx-title">{r.title}</h1>
        <p className="rx-lead">{f.intro.replace("{count}", index.order.length.toLocaleString(lang === "pt-br" ? "pt-BR" : lang)).replace("{models}", recipeModelList(lang))}</p>
      </div>
      <div className="ac-wrap">
        <RecipeBrowser
          lang={lang}
          labels={r.labels}
          t={f}
          tabs={tabs}
          stations={stations}
          total={index.order.length}
          featured={index.byResult.has(FEATURED) ? FEATURED : (index.order[0] ?? "")}
        >
          <RecipeTable groups={groups} stationNames={names} />
        </RecipeBrowser>
      </div>
    </section>
  );
}
