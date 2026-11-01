"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Product, StoreText } from "@/lib/wiki-types";
import { asset } from "@/lib/site";

type Phase = "get" | "downloading" | "open" | "update" | "soon" | "archived";

export interface NextStoreLabels {
  text: StoreText;
  fresh: { speed: string; timeLeft: string };
  /** The sample account shown in the window. A label, never a real person. */
  account: string;
}

/** The sizes (MB) of the real files, so the simulated speed reads like the real thing. */
const SIZE_MB: Record<string, number> = { ouka: 4.7, cherry: 3.7, aureum: 0.03, tsubomi: 1.9, halia: 10.2 };
const SECONDS = 3.6;

function fill(t: string, ...v: (string | number)[]): string {
  return t.replace(/\{(\d+)\}/g, (_, i: string) => String(v[Number(i)] ?? ""));
}

function speed(template: string, id: string): string {
  const s = (SIZE_MB[id] ?? 2) / SECONDS;
  return fill(template, s >= 1 ? `${s.toFixed(1)} MB` : `${Math.round(s * 1024)} KB`);
}

/**
 * The Corvus Store, simulated in the page: a spatial bento instead of a sidebar window. Nothing is downloaded and nothing
 * is installed: every state change, every progress bar and the account are sample data, and the page says so.
 */
export function NextStoreSim({ products, hrefs, labels }: { products: Product[]; hrefs: Record<string, string>; labels: NextStoreLabels }) {
  const t = labels.text;
  const start = useCallback(
    (): Record<string, Phase> =>
      Object.fromEntries(products.map((p) => [p.id, p.availability === "soon" ? "soon" : p.availability === "archived" ? "archived" : "get"])) as Record<string, Phase>,
    [products],
  );
  const [phase, setPhase] = useState<Record<string, Phase>>(start);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const timers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const id of map.values()) window.clearInterval(id);
      map.clear();
    };
  }, []);

  const run = (id: string): void => {
    setPhase((p) => ({ ...p, [id]: "downloading" }));
    setProgress((p) => ({ ...p, [id]: 0 }));
    const began = performance.now();
    const timer = window.setInterval(() => {
      const f = Math.min(1, (performance.now() - began) / (SECONDS * 1000));
      setProgress((p) => ({ ...p, [id]: f }));
      if (f >= 1) {
        window.clearInterval(timer);
        timers.current.delete(id);
        setPhase((p) => ({ ...p, [id]: "open" }));
      }
    }, 100);
    timers.current.set(id, timer);
  };

  const act = (id: string): void => {
    const ph = phase[id];
    if (ph === "get" || ph === "update") run(id);
    else if (ph === "open") setNote(t.demoOpen);
  };

  const reset = (): void => {
    for (const id of timers.current.values()) window.clearInterval(id);
    timers.current.clear();
    setPhase(start());
    setProgress({});
    setNote("");
  };

  const simulate = (): void => setPhase((p) => Object.fromEntries(Object.entries(p).map(([id, v]) => [id, v === "open" ? "update" : v])) as Record<string, Phase>);
  const pending = Object.values(phase).filter((v) => v === "update").length;
  const updateAll = (): void => {
    for (const [id, v] of Object.entries(phase)) if (v === "update") run(id);
  };

  const word = (id: string): string => {
    const ph = phase[id];
    return ph === "get" ? t.get : ph === "update" ? t.update : ph === "open" ? t.open : ph === "soon" ? t.comingSoon : ph === "archived" ? t.archived : "";
  };

  return (
    <div className="cn-store cn-glass" data-glass="" role="group" aria-label="Corvus Store">
      <div className="cn-store-top">
        <span className="cn-store-title">Corvus Store</span>
        <span className="cn-store-account">
          <span className="cn-store-avatar" aria-hidden="true">
            {labels.account
              .split(" ")
              .map((w) => w[0])
              .join("")}
          </span>
          {labels.account}
        </span>
      </div>
      <div className="cn-store-grid">
        {products.map((p, i) => {
          const ph = phase[p.id] ?? "get";
          const busy = ph === "downloading";
          const f = progress[p.id] ?? 0;
          const disabled = ph === "soon" || ph === "archived" || busy;
          return (
            <article key={p.id} className="cn-store-card cn-glass cn-glass--lite" data-glass="" data-feature={i === 0 ? "true" : undefined} data-phase={ph}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset(p.icon)} alt="" width={i === 0 ? 72 : 48} height={i === 0 ? 72 : 48} className="cn-store-icon" data-dim={ph === "archived" ? "true" : undefined} />
              <h3 className="cn-store-name">{p.name}</h3>
              <p className="cn-store-line">{p.tagline}</p>
              {busy ? (
                <div className="cn-store-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(f * 100)} aria-label={p.name}>
                  <span className="cn-store-bar">
                    <i style={{ transform: `scaleX(${f.toFixed(3)})` }} />
                  </span>
                  <span className="cn-store-meta">
                    {speed(labels.fresh.speed, p.id)} · {fill(labels.fresh.timeLeft, Math.max(0, Math.ceil(SECONDS * (1 - f))))}
                  </span>
                </div>
              ) : (
                <button type="button" className="ac-btn ac-btn--small cn-store-act" data-primary={ph === "get" || ph === "update" ? "true" : undefined} disabled={disabled} onClick={() => act(p.id)}>
                  {word(p.id)}
                </button>
              )}
              {hrefs[p.id] && ph !== "soon" ? (
                <Link className="cn-store-more" href={hrefs[p.id] ?? "#"}>
                  {t.readMore}
                </Link>
              ) : null}
            </article>
          );
        })}

        <article className="cn-store-card cn-glass cn-glass--lite" data-glass="">
          <h3 className="cn-store-name">{t.updates}</h3>
          <p className="cn-store-big">{pending}</p>
          <p className="cn-store-line">{pending > 0 ? t.updatesAvailable : t.updatesEmptyTitle}</p>
          <div className="cn-store-row">
            <button type="button" className="ac-btn ac-btn--small" onClick={simulate}>
              {t.simulate}
            </button>
            <button type="button" className="ac-btn ac-btn--small ac-btn--primary" disabled={pending === 0} onClick={updateAll}>
              {t.updateAll}
            </button>
          </div>
        </article>

      </div>
      <div className="cn-store-foot">
        <p className="cn-store-note" role="status">
          {note || t.demoNote}
        </p>
        <button type="button" className="ac-btn ac-btn--small ac-btn--ghost" onClick={reset}>
          {t.reset}
        </button>
      </div>
    </div>
  );
}
