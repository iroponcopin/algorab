"use client";

import { type KeyboardEvent, type MouseEvent, type ReactNode, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { chime } from "@/engine/audio";
import type { Fresh } from "@/i18n/fresh";
import { asset } from "@/lib/site";
import type { Lang, RecipeLabels } from "@/lib/wiki-types";
import { Icon } from "../Icon";
import { useReducedMotion, useWide } from "./hooks";
import { buildIndex, buildSearch, type ModelTab, rowFacts, search, type SearchIndex, type Sheet, type SheetItem, type StationOption } from "./recipe-data";
import { type Loaded, RecipeDetail } from "./RecipeDetail";
import { RecipeRowLine } from "./RecipeTable";

/** Rows drawn at a time when a filter is on; the next ones come in two screens before the end. */
const PAGE = 120;

type Ready = Loaded & { find: SearchIndex };

function itemInHash(): string | null {
  const h = decodeURIComponent(window.location.hash.slice(1));
  return h.startsWith("item=") ? h.slice(5) : null;
}

function webgl2(): boolean {
  try {
    return document.createElement("canvas").getContext("webgl2") !== null;
  } catch {
    return false;
  }
}

/**
 * The working half of the page. The table under it is plain HTML from the server. This fetches the sheet once, draws
 * the bar (search, model, station), answers a filter with rows of its own, and shows one item: beside the table on a
 * wide screen, as a sheet on a narrow one. The address is the state: `#item=<id>` is the item, `?model=<id>` the model,
 * and Back walks the items a reader followed. All of it is one native scrolling page.
 */
export function RecipeBrowser({
  lang,
  labels,
  t,
  tabs,
  stations,
  total,
  featured,
  children,
}: {
  lang: Lang;
  labels: RecipeLabels;
  t: Fresh["recipes"];
  tabs: ModelTab[];
  stations: StationOption[];
  total: number;
  featured: string;
  children: ReactNode;
}) {
  const wide = useWide();
  const reduced = useReducedMotion();
  const [ready, setReady] = useState<Ready | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<number | null>(null);
  const [station, setStation] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [trail, setTrail] = useState(0);
  const [shown, setShown] = useState(PAGE);
  const [stuck, setStuck] = useState(false);
  const [solid, setSolid] = useState(false);
  const [keyHint, setKeyHint] = useState("");

  const asked = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const table = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const sheetEl = useRef<HTMLDialogElement>(null);
  const tabsEl = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);

  const stationName = useCallback((id: string) => stations.find((s) => s.id === id)?.name ?? id, [stations]);

  const load = useCallback(() => {
    if (asked.current) return;
    asked.current = true;
    setFailed(false);
    fetch(asset(`recipes/${lang}.json`))
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<{ items: Record<string, Omit<SheetItem, "id">>; recipes: Sheet["recipes"] }>;
      })
      .then((json) => {
        const items = Object.fromEntries(Object.entries(json.items).map(([id, it]) => [id, { ...it, id }]));
        const sheet: Sheet = { items, recipes: json.recipes };
        const index = buildIndex(sheet, (c) => {
          const i = tabs.findIndex((x) => x.cat === c);
          return i < 0 ? tabs.length : i;
        });
        setReady({ sheet, index, find: buildSearch(sheet, index, stationName) });
      })
      .catch(() => {
        asked.current = false;
        setFailed(true);
      });
  }, [lang, tabs, stationName]);

  // The sheet comes down when the browser has a moment, or the instant the reader reaches for the bar. On a data-saving
  // connection only the second: the table is already all there.
  useEffect(() => {
    const save = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (save && !window.location.hash && !window.location.search) return;
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(load, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(load, 300);
    return () => window.clearTimeout(id);
  }, [load]);

  // ---- the address ---------------------------------------------------------------------------------------------

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const h = decodeURIComponent(window.location.hash.slice(1));
    const byModel = tabs.find((x) => x.model === params.get("model"));
    if (byModel) setCat(byModel.cat);
    if (/^\d+$/.test(h)) {
      const byChapter = tabs.find((x) => x.cat === Number(h));
      if (byChapter) setCat(byChapter.cat);
    }
    setPicked(itemInHash());
    const onPop = (): void => {
      setPicked(itemInHash());
      setTrail((n) => Math.max(0, n - 1));
    };
    window.addEventListener("popstate", onPop);
    // The site search can point this page at another item while it is open.
    const onHash = (): void => setPicked(itemInHash());
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onHash);
    };
  }, [tabs]);

  const pick = useCallback(
    (id: string) => {
      if (id !== itemInHash()) {
        window.history.pushState(window.history.state, "", `${window.location.pathname}${window.location.search}#item=${encodeURIComponent(id)}`);
        setTrail((n) => n + 1);
      }
      setPicked(id);
      chime("tick");
    },
    [],
  );

  const setModel = useCallback(
    (next: number | null) => {
      setCat(next);
      setShown(PAGE);
      const params = new URLSearchParams(window.location.search);
      const model = tabs.find((x) => x.cat === next)?.model;
      if (model) params.set("model", model);
      else params.delete("model");
      const qs = params.toString();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
    },
    [tabs],
  );

  const closeSheet = useCallback(() => {
    if (trail > 0) window.history.back();
    else {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
      setPicked(null);
    }
  }, [trail]);

  // ---- the list ------------------------------------------------------------------------------------------------

  const term = useDeferredValue(query);
  const filtering = query.trim() !== "" || cat !== null || station !== null;
  const results = useMemo(() => (ready && filtering ? search(ready.find, { cat, station, query: term }) : null), [ready, filtering, cat, station, term]);

  useEffect(() => {
    setShown(PAGE);
  }, [term, station]);

  // The results start at the top of the list, wherever the reader was in the table.
  useEffect(() => {
    if (!stuck || !shell.current) return;
    const bar = shell.current.querySelector<HTMLElement>(".rx-bar");
    const top = shell.current.getBoundingClientRect().top + window.scrollY - (bar ? bar.offsetTop : 0);
    window.scrollTo({ top: Math.max(0, top - 8) });
    // Only a change of filter moves the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, cat, station]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !results || results.length <= shown) return;
    const io = new IntersectionObserver(
      (e) => {
        if (e[0]?.isIntersecting) setShown((n) => n + PAGE);
      },
      { rootMargin: "200% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [results, shown]);

  const rows = useMemo(() => (ready && results ? results.slice(0, shown).map((id) => rowFacts(ready.sheet, ready.index.byResult, id)) : []), [ready, results, shown]);

  // The bar turns to glass only once it is actually over the table.
  useEffect(() => {
    const root = shell.current;
    if (!root) return;
    const mark = root.querySelector(".rx-top");
    if (!mark) return;
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 72;
    const io = new IntersectionObserver((e) => setStuck(!(e[0]?.isIntersecting ?? true)), { rootMargin: `-${Math.round(top) + 12}px 0px 0px 0px` });
    io.observe(mark);
    return () => io.disconnect();
  }, []);

  // The model control's thumb slides to the chosen one. It is measured, so it holds for any language and for Arabic.
  useEffect(() => {
    const place = (): void => {
      const box = tabsEl.current;
      const th = thumb.current;
      const on = box?.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!box || !th || !on) return;
      th.style.width = `${on.offsetWidth}px`;
      th.style.transform = `translateX(${on.offsetLeft}px)`;
    };
    place();
    const ro = new ResizeObserver(place);
    if (tabsEl.current) ro.observe(tabsEl.current);
    return () => ro.disconnect();
  }, [cat]);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    setKeyHint(coarse ? "" : /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K");
    setSolid(document.documentElement.hasAttribute("data-enhanced") && webgl2());
  }, []);

  // ⌘K / Ctrl K goes to this page's own field; the header's button still opens the site search.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopImmediatePropagation();
        load();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [load]);

  // One tab stop for the whole table: the arrow keys walk it. Thousands of links are not a tab order.
  useEffect(() => {
    const root = table.current;
    if (!root) return;
    let first = true;
    root.querySelectorAll<HTMLAnchorElement>("a[data-id]").forEach((a) => {
      if (a.offsetParent === null) a.tabIndex = -1;
      else {
        a.tabIndex = first ? 0 : -1;
        first = false;
      }
    });
  }, [rows, filtering]);

  const current = picked ?? (wide ? featured : null);

  // The row of the open item is marked, on the server's rows and on the drawn ones alike.
  useEffect(() => {
    const root = table.current;
    if (!root) return;
    root.querySelectorAll('[aria-current="true"]').forEach((el) => el.removeAttribute("aria-current"));
    if (current) root.querySelectorAll(`a[data-id="${CSS.escape(current)}"]`).forEach((el) => el.setAttribute("aria-current", "true"));
  }, [current, rows, filtering]);

  // A link that opens an item brings its row into view once, as the page opens.
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current || picked === null) return;
    landed.current = true;
    table.current?.querySelector(`a[data-id="${CSS.escape(picked)}"]`)?.scrollIntoView({ block: "center" });
  }, [picked]);

  const narrowItem = !wide && picked !== null;
  useEffect(() => {
    const d = sheetEl.current;
    if (!d) return;
    if (narrowItem && ready && !d.open) d.showModal();
    if ((!narrowItem || !ready) && d.open) d.close();
  }, [narrowItem, ready]);

  const onTableClick = (e: MouseEvent<HTMLDivElement>): void => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-id]");
    const id = a?.dataset.id;
    if (!id) return;
    e.preventDefault();
    load();
    pick(id);
  };

  const onTableKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const root = table.current;
    const at = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-id]");
    if (!root || !at) return;
    const all = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[data-id]")).filter((a) => a.offsetParent !== null);
    const next = all[all.indexOf(at) + (e.key === "ArrowDown" ? 1 : -1)];
    if (next) {
      e.preventDefault();
      at.tabIndex = -1;
      next.tabIndex = 0;
      next.focus();
    }
  };

  const firstRow = (): HTMLAnchorElement | null | undefined =>
    Array.from(table.current?.querySelectorAll<HTMLAnchorElement>("a[data-id]") ?? []).find((a) => a.offsetParent !== null);

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Escape" && query !== "") {
      e.preventDefault();
      setQuery("");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      firstRow()?.focus();
    } else if (e.key === "Enter") {
      const id = firstRow()?.dataset.id;
      if (id) {
        e.preventDefault();
        pick(id);
      }
    }
  };

  const seeAll = useCallback(
    (name: string) => {
      setQuery(name);
      setCat(null);
      setStation(null);
      if (!wide) closeSheet();
    },
    [wide, closeSheet],
  );

  const reloadButton = failed ? (
    <p className="rx-status" role="alert">
      {t.loadFailed}{" "}
      <button type="button" className="rx-link" onClick={load}>
        {t.retry}
      </button>
    </p>
  ) : null;

  const detail =
    ready && current ? (
      <RecipeDetail
        key={current}
        loaded={ready}
        id={current}
        labels={labels}
        t={t}
        tabs={tabs}
        stations={stations}
        solid={wide && solid && !reduced}
        onPick={pick}
        onSeeAll={seeAll}
        actions={
          <>
            {trail > (wide ? 0 : 1) ? (
              <button type="button" className="rx-round" onClick={() => window.history.back()} aria-label={t.back} title={t.back}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" className="rx-flip">
                  <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : null}
            {!wide ? (
              <button type="button" className="rx-round" onClick={closeSheet} aria-label={t.close} title={t.close}>
                <Icon name="x" size={18} />
              </button>
            ) : null}
          </>
        }
      />
    ) : null;

  const count = results ? results.length : total;

  return (
    <div ref={shell} className="rx-shell" onPointerEnter={load} onFocusCapture={load}>
      <span className="rx-top" aria-hidden="true" />
      <div className="rx-bar" data-stuck={stuck ? "" : undefined} role="search" aria-label={t.searchTitle}>
        <label className="rx-search">
          <Icon name="search" size={18} />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder={labels.search}
            aria-label={labels.search}
            autoComplete="off"
            spellCheck={false}
          />
          {query !== "" ? (
            <button type="button" className="rx-clear" onClick={() => setQuery("")} aria-label={t.clear} title={t.clear}>
              <Icon name="x" size={14} />
            </button>
          ) : keyHint ? (
            <kbd>{keyHint}</kbd>
          ) : null}
        </label>
        <div className="rx-seg" ref={tabsEl} role="group" aria-label={labels.all}>
          <span ref={thumb} className="rx-seg-thumb" aria-hidden="true" />
          <button type="button" aria-pressed={cat === null} onClick={() => setModel(null)}>
            {labels.all}
          </button>
          {tabs.map((x) => (
            <button key={x.model} type="button" aria-pressed={cat === x.cat} onClick={() => setModel(x.cat)}>
              {x.name}
            </button>
          ))}
        </div>
        <label className="rx-pick">
          <select value={station ?? ""} onChange={(e) => setStation(e.target.value || null)} aria-label={labels.stations}>
            <option value="">{t.anyStation}</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.count})
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={14} />
        </label>
      </div>

      <div className="rx-body">
        <div className="rx-list">
          <p className="rx-count" aria-live="polite">
            {results ? `${count.toLocaleString("en-US")} / ${total.toLocaleString("en-US")} ${t.itemWord}` : `${total.toLocaleString("en-US")} ${t.itemWord}`}
          </p>
          {reloadButton}
          <div ref={table} className="rx-table" onClick={onTableClick} onKeyDown={onTableKey}>
            {filtering && !ready && !failed ? <p className="rx-status">{t.loading}</p> : null}
            {results && results.length === 0 ? <p className="rx-status">{labels.empty}</p> : null}
            {results && rows.length > 0 ? (
              <ul className="rx-rows rx-rows--found">
                {rows.map((row) => (
                  <RecipeRowLine key={row.id} row={row} where={row.station ? stationName(row.station) : undefined} />
                ))}
              </ul>
            ) : null}
            {results && results.length > shown ? <div ref={sentinel} aria-hidden="true" /> : null}
            <div hidden={results !== null}>{children}</div>
          </div>
        </div>
        <aside className="rx-panel">
          {wide && detail ? (
            detail
          ) : (
            <div className="rx-panel-empty">
              <strong className="ac-ltr">{total.toLocaleString("en-US")}</strong>
              <p>{labels.selectPrompt}</p>
            </div>
          )}
        </aside>
      </div>

      <dialog ref={sheetEl} className="rx-sheet" onCancel={(e) => {
        e.preventDefault();
        closeSheet();
      }}>
        {!wide ? detail : null}
      </dialog>
    </div>
  );
}
