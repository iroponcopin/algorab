import { recipeIcon } from "@/lib/site";
import type { ModelTab, RowFacts } from "./recipe-data";

export interface RecipeGroup extends ModelTab {
  rows: RowFacts[];
}

/** Rows per block. The browser lays out a block only when it nears the screen (content-visibility, recipes.css). */
const BLOCK = 48;

/**
 * One row of the table: a link, so it opens in a new tab and reads as what it is. The server's rows carry the anchor the
 * link points at, so `#item=<id>` lands on the row with no script at all; the rows a filter draws repeat them and do not.
 */
export function RecipeRowLine({ row, where, anchor }: { row: RowFacts; where?: string; anchor?: boolean }) {
  const icon = recipeIcon(row.icon);
  return (
    <li>
      <a id={anchor ? `item=${row.id}` : undefined} className="rx-row" href={`#item=${encodeURIComponent(row.id)}`} data-id={row.id}>
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" width={36} height={36} loading="lazy" decoding="async" className="ac-pixel" />
        ) : (
          <span className="ac-noicon" aria-hidden="true">
            ?
          </span>
        )}
        <span className="rx-row-text">
          <span className="rx-row-name" dir="auto">
            {row.name}
          </span>
          {row.materials ? (
            <span className="rx-row-mats" dir="auto">
              {row.materials}
            </span>
          ) : null}
        </span>
        {where ? (
          <span className="rx-row-where" dir="auto">
            {where}
          </span>
        ) : null}
      </a>
    </li>
  );
}

/** The whole table, model by model, as the server writes it. */
export function RecipeTable({ groups, stationNames }: { groups: RecipeGroup[]; stationNames: Record<string, string> }) {
  return (
    <>
      {groups.map((g) => {
        const blocks: RowFacts[][] = [];
        for (let i = 0; i < g.rows.length; i += BLOCK) blocks.push(g.rows.slice(i, i + BLOCK));
        return (
          <section key={g.model} className="rx-group" aria-labelledby={`rx-g-${g.model}`}>
            <h2 id={`rx-g-${g.model}`} className="rx-group-title">
              {g.name}
              <span className="ac-ltr">{g.count.toLocaleString("en-US")}</span>
            </h2>
            {blocks.map((rows, i) => (
              <ul key={i} className="rx-rows" style={rows.length === BLOCK ? undefined : { ["--rows" as string]: rows.length }}>
                {rows.map((row) => (
                  <RecipeRowLine key={row.id} row={row} anchor where={row.station ? stationNames[row.station] : undefined} />
                ))}
              </ul>
            ))}
          </section>
        );
      })}
    </>
  );
}
