"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useCallback, useState } from "react";
import type { Fresh } from "@/i18n/fresh";
import { BRAND_COLOR } from "@/lib/brands";
import { recipeIcon } from "@/lib/site";
import type { RecipeLabels } from "@/lib/wiki-types";
import { ingredientsOf, type ModelTab, type RecipeRow, type Sheet, type SheetIndex, type StationOption, sureRecipe, totalled } from "./recipe-data";

const ItemTurntable = dynamic(() => import("./ItemTurntable"), { ssr: false });

/** Items the "used in" block shows before it hands over to the table. */
const USED_IN_SHOWN = 15;

export interface Loaded {
  sheet: Sheet;
  index: SheetIndex;
}

interface Shared {
  loaded: Loaded;
  onPick: (id: string) => void;
}

function fill(t: string, v: string, w = ""): string {
  return t.replace("{0}", v).replace("{1}", w);
}

/** A percentage or a time as a player reads it: 25, 2.5, 0.25. */
function short(v: number): string {
  return String(Number(v.toPrecision(3)));
}

/** One item in a square: its picture, its count, and the way to open it. */
function Slot({ loaded, id, n, big, index, onPick }: Shared & { id: string; n?: string; big?: boolean; index?: number }) {
  const it = loaded.sheet.items[id];
  const icon = recipeIcon(it?.icon ?? null);
  const name = it?.name ?? id;
  const size = big ? 56 : 36;
  return (
    <button
      type="button"
      className={big ? "rx-slot rx-slot--big" : "rx-slot"}
      style={index === undefined ? undefined : { ["--i" as string]: index }}
      title={name}
      aria-label={n ? `${name} ${n}` : name}
      onClick={() => onPick(id)}
    >
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" width={size} height={size} decoding="async" className="ac-pixel" />
      ) : (
        <span className="ac-noicon" aria-hidden="true">
          ?
        </span>
      )}
      {n ? <span className="rx-slot-n">{n}</span> : null}
    </button>
  );
}

function Arrow() {
  return (
    <svg className="rx-arrow" viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** One line of materials: picture, name, how many, and an optional note. The way to read a recipe on a touch screen. */
function Line({ loaded, id, n, note, onPick }: Shared & { id: string; n: string; note?: string }) {
  const it = loaded.sheet.items[id];
  const icon = recipeIcon(it?.icon ?? null);
  return (
    <li>
      <button type="button" className="rx-line" onClick={() => onPick(id)}>
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" width={24} height={24} loading="lazy" decoding="async" className="ac-pixel" />
        ) : (
          <span className="ac-noicon" aria-hidden="true">
            ?
          </span>
        )}
        <span className="rx-line-name" dir="auto">
          {it?.name ?? id}
          {note ? <small>{note}</small> : null}
        </span>
        <span className="rx-line-n ac-ltr">{n}</span>
      </button>
    </li>
  );
}

function countOf(o: NonNullable<RecipeRow["outputs"]>[number]): string {
  return o.nMax !== undefined && o.nMax !== o.n ? `×${o.n}–${o.nMax}` : `×${o.n}`;
}

function outputNote(o: NonNullable<RecipeRow["outputs"]>[number], m: RecipeLabels["machine"]): string | undefined {
  if (o.chance !== undefined) return fill(m.chance, short(o.chance));
  if (o.every !== undefined) return fill(m.every, String(o.every));
  return undefined;
}

function factsOf(r: RecipeRow, m: RecipeLabels["machine"]): string[] {
  const f = r.facts;
  if (!f) return [];
  const parts: string[] = [];
  if (f.dimension && f.share !== undefined) parts.push(fill(m.vein, m[f.dimension], short(f.share)));
  if (f.time) parts.push(fill(m.time, short(f.time / 20)));
  if (f.water) parts.push(fill(m.water, String(f.water)));
  if (f.xp) parts.push(fill(m.xp, short(f.xp)));
  return parts;
}

/** A crafting-grid recipe: the 3 × 3 as the game lays it out, left to right in every language, and the result beside it. */
function GridRecipe({ loaded, recipe, onPick, gridLabel }: Shared & { recipe: RecipeRow; gridLabel: string }) {
  return (
    <div className="rx-craft" dir="ltr" role="group" aria-label={gridLabel}>
      <div className="rx-grid">
        {(recipe.grid ?? []).map((cell, i) =>
          cell === 0 ? (
            <span key={i} className="rx-slot rx-slot--empty" style={{ ["--i" as string]: i }} />
          ) : (
            <Slot key={i} loaded={loaded} id={cell} index={i} onPick={onPick} />
          ),
        )}
      </div>
      <Arrow />
      <Slot loaded={loaded} id={recipe.result} big index={10} n={recipe.count > 1 ? `×${recipe.count}` : undefined} onPick={onPick} />
    </div>
  );
}

/** A station recipe: no grid, because it has none. What goes in, where, and what comes out. */
function StationRecipe({ loaded, recipe, station, labels, t, onPick }: Shared & { recipe: RecipeRow; station: StationOption | undefined; labels: RecipeLabels; t: Fresh["recipes"] }) {
  const m = labels.machine;
  const inputs = totalled(ingredientsOf(loaded.sheet, recipe));
  const outputs = recipe.outputs ?? [{ id: recipe.result, n: recipe.count }];
  return (
    <>
      <div className="rx-flow" dir="ltr">
        {station?.item ? <Slot loaded={loaded} id={station.item} big index={0} onPick={onPick} /> : null}
        <Arrow />
        <Slot loaded={loaded} id={recipe.result} big index={2} n={recipe.count > 1 ? `×${recipe.count}` : undefined} onPick={onPick} />
      </div>
      <p className="rx-made-in" dir="auto">
        {fill(labels.madeIn, station?.name ?? recipe.station)}
      </p>
      {inputs.length > 0 ? (
        <>
          <h3 className="rx-label">{t.inputs}</h3>
          <ul className="rx-lines">
            {inputs.map((ing) => (
              <Line key={ing.id} loaded={loaded} id={ing.id} n={`×${ing.n}`} note={ing.any ? m.any : undefined} onPick={onPick} />
            ))}
          </ul>
        </>
      ) : recipe.outputs ? (
        <p className="rx-note">{m.drill}</p>
      ) : null}
      {outputs.length > 1 || outputs.some((o) => "chance" in o || "nMax" in o || "every" in o) ? (
        <>
          <h3 className="rx-label">{t.outputs}</h3>
          <ul className="rx-lines">
            {outputs.map((o) => (
              <Line key={o.id} loaded={loaded} id={o.id} n={countOf(o)} note={outputNote(o, m)} onPick={onPick} />
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

/** What an item is made of, three levels down. A part with no recipe of its own ends its branch. */
function Tree({ loaded, id, root, seen, depth, onPick }: Shared & { id: string; root?: RecipeRow; seen: ReadonlySet<string>; depth: number }) {
  const { sheet, index } = loaded;
  const r = root ?? sureRecipe(index.byResult, id);
  if (!r || depth >= 3 || seen.has(id)) return null;
  const next = new Set(seen).add(id);
  return (
    <ul className="rx-tree">
      {totalled(ingredientsOf(sheet, r)).map((part) => (
        <li key={part.id}>
          <ul className="rx-lines">
            <Line loaded={loaded} id={part.id} n={`×${part.n}`} onPick={onPick} />
          </ul>
          <Tree loaded={loaded} id={part.id} seen={next} depth={depth + 1} onPick={onPick} />
        </li>
      ))}
    </ul>
  );
}

function Hero({ id, url, kind, accent, solid }: { id: string; url: string | null; kind: Sheet["items"][string]["kind"]; accent: string; solid: boolean }) {
  const [ready, setReady] = useState(false);
  const onReady = useCallback((r: boolean) => setReady(r), []);
  return (
    <div className="rx-hero-picture" data-solid={solid && ready ? "" : undefined}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={id} src={url} alt="" width={128} height={128} decoding="async" className="ac-pixel rx-hero-still" />
      ) : (
        <span className="ac-noicon" aria-hidden="true">
          ?
        </span>
      )}
      {solid && url ? <ItemTurntable url={url} kind={kind} accent={accent} onReady={onReady} /> : null}
    </div>
  );
}

/**
 * One item: what it is, how to make it, what it is made of all the way down, and what it goes into. Every picture
 * opens the item it shows, so a recipe can be followed by hand. `actions` are the sheet's back and close buttons.
 */
export function RecipeDetail({
  loaded,
  id,
  labels,
  t,
  tabs,
  stations,
  solid,
  actions,
  onPick,
  onSeeAll,
}: {
  loaded: Loaded;
  id: string;
  labels: RecipeLabels;
  t: Fresh["recipes"];
  tabs: readonly ModelTab[];
  stations: readonly StationOption[];
  /** Draw the turning model (wide screen, WebGL 2, motion welcome). */
  solid: boolean;
  actions: ReactNode;
  onPick: (id: string) => void;
  onSeeAll: (name: string) => void;
}) {
  const { sheet, index } = loaded;
  const item = sheet.items[id];
  const recipes = index.byResult.get(id) ?? [];
  const first = sureRecipe(index.byResult, id);
  const [at, setAt] = useState(first ? recipes.indexOf(first) : 0);
  const [treeOpen, setTreeOpen] = useState(false);
  const recipe = recipes[at];
  const cat = index.catOf.get(id);
  const tab = tabs.find((x) => x.cat === cat);
  const accent = (tab && BRAND_COLOR[tab.model]) || "#8e8e93";
  const used = index.usedIn.get(id) ?? [];
  const ingredients = recipe ? totalled(ingredientsOf(sheet, recipe)) : [];

  return (
    <article className="rx-item" style={{ ["--rx-accent" as string]: accent }}>
      {actions ? <div className="rx-item-actions">{actions}</div> : null}
      <header className="rx-hero">
        <Hero id={id} url={recipeIcon(item?.icon ?? null)} kind={item?.kind ?? "none"} accent={accent} solid={solid} />
        <h2 className="rx-item-name" dir="auto">
          {item?.name ?? id}
        </h2>
        {item?.sub ? (
          <p className="rx-item-sub" lang="en">
            {item.sub}
          </p>
        ) : null}
        {tab ? <p className="rx-item-model">{tab.name}</p> : null}
      </header>

      {recipes.length > 1 ? (
        <div className="rx-versions" role="group" aria-label={fill(labels.recipeN, "")}>
          {recipes.map((r, i) => (
            <button key={r.key} type="button" aria-pressed={i === at} aria-label={fill(labels.recipeN, String(i + 1))} onClick={() => setAt(i)}>
              {i + 1}
            </button>
          ))}
        </div>
      ) : null}

      {!recipe ? (
        <p className="rx-note">{labels.noRecipe}</p>
      ) : (
        <section key={recipe.key} className="rx-recipe">
          {recipe.grid ? (
            <>
              <GridRecipe loaded={loaded} recipe={recipe} gridLabel={t.gridLabel} onPick={onPick} />
              <h3 className="rx-label">{t.inputs}</h3>
              <ul className="rx-lines">
                {ingredients.map((ing) => (
                  <Line key={ing.id} loaded={loaded} id={ing.id} n={`×${ing.n}`} onPick={onPick} />
                ))}
              </ul>
            </>
          ) : (
            <StationRecipe loaded={loaded} recipe={recipe} station={stations.find((s) => s.id === recipe.station)} labels={labels} t={t} onPick={onPick} />
          )}
          {recipe.howLine ? (
            <p className="rx-note" lang={recipe.howLine.lang}>
              {recipe.howLine.text}
            </p>
          ) : null}
          {factsOf(recipe, labels.machine).length > 0 ? <p className="rx-note">{factsOf(recipe, labels.machine).join(" · ")}</p> : null}
        </section>
      )}

      {recipe && ingredients.some((ing) => sureRecipe(index.byResult, ing.id)) ? (
        <details className="rx-more" onToggle={(e) => setTreeOpen(e.currentTarget.open)}>
          <summary>{labels.tree}</summary>
          {treeOpen ? <Tree loaded={loaded} id={id} root={recipe} seen={new Set()} depth={0} onPick={onPick} /> : null}
        </details>
      ) : null}

      {used.length > 0 ? (
        <section className="rx-used">
          <h3 className="rx-label">
            {t.usedIn}
            <span className="ac-ltr">{used.length}</span>
          </h3>
          <div className="rx-used-grid">
            {used.slice(0, USED_IN_SHOWN).map((u) => (
              <Slot key={u} loaded={loaded} id={u} onPick={onPick} />
            ))}
          </div>
          {used.length > USED_IN_SHOWN ? (
            <button type="button" className="rx-link" onClick={() => onSeeAll(item?.name ?? id)}>
              {fill(t.showAll, String(used.length))}
            </button>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
