"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { IslandEngine, ISLAND_STATES, type IslandState } from "@/design/IslandEngine";
import type { IslandText } from "@/i18n/island";

/** The Corvus Island V10174 simulator: the hero of the home page. Every word of content in it is sample data. */
export function IslandSim({ text }: { text: IslandText }) {
  const rootRef = useRef<HTMLElement>(null);
  const engineRef = useRef<IslandEngine | null>(null);
  const [state, setState] = useState<IslandState>("media");
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const paneId = useId();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const engine = new IslandEngine(root, {
      thinking: text.ai.thinking,
      ready: text.ai.ready,
      downloading: text.download.label,
      done: text.download.done,
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [text]);

  useEffect(() => engineRef.current?.setState(state), [state]);
  useEffect(() => engineRef.current?.setExpanded(open), [open]);
  useEffect(() => engineRef.current?.setPlaying(playing), [playing]);

  const toggle = useCallback(() => {
    if (engineRef.current?.consumeDragged()) return;
    setOpen((v) => !v);
  }, []);

  const onSwitchKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const i = ISLAND_STATES.indexOf(state);
      const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (dir === 0) return;
      e.preventDefault();
      const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
      const next = ISLAND_STATES[(i + (rtl ? -dir : dir) + ISLAND_STATES.length) % ISLAND_STATES.length]!;
      setState(next);
      e.currentTarget.querySelector<HTMLButtonElement>(`[data-state="${next}"]`)?.focus();
    },
    [state],
  );

  const m = text.media;
  return (
    <section ref={rootRef} className="cn-sim" aria-label={text.label} data-state={state} data-open={open ? "true" : "false"}>
      <div className="cn-stage" data-cn="stage">
        <div className="cn-wall" aria-hidden="true" />
        <div className="cn-menubar" aria-hidden="true">
          <span className="cn-menubar-clock">9:41</span>
        </div>

        <div className="cn-goo" data-cn="goo" aria-hidden="true" style={{ filter: "url(#corvus-liquid-metaball)", WebkitFilter: "url(#corvus-liquid-metaball)" }}>
          <i className="cn-anchor" data-cn="anchor" />
          <i className="cn-sat" data-cn="sat" />
          <i className="cn-sat" data-cn="sat" />
        </div>
        <div className="cn-sathi" aria-hidden="true">
          <i className="cn-sathi-dot" data-cn="sathi">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="13" r="7" />
              <path d="M12 9v4l2.5 1.5M10 3h4" />
            </svg>
          </i>
          <i className="cn-sathi-dot" data-cn="sathi">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 10v4M9 6v12M13 9v6M17 4v16M21 11v2" />
            </svg>
          </i>
        </div>

        <div className="cn-island" data-cn="island">
          <div className="cn-shell" data-cn="shell">
            <button type="button" className="cn-toggle" aria-expanded={open} aria-controls={paneId} aria-label={open ? text.collapse : text.expand} onClick={toggle} />
          </div>

          {/* Docked content: what the pill shows while it rests on the notch. */}
          <div className="cn-compact" data-cn="compact" data-state="media" aria-hidden="true">
            <span className="cn-mini-art" />
            <span className="cn-bars">
              {[0, 1, 2, 3, 4].map((i) => (
                <i key={i} data-cn="bar" />
              ))}
            </span>
          </div>
          <div className="cn-compact" data-cn="compact" data-state="ai" aria-hidden="true">
            <span className="cn-orb cn-orb--mini" data-cn="orb" />
            <span className="cn-dots">
              {[0, 1, 2].map((i) => (
                <i key={i} data-cn="dot" />
              ))}
            </span>
          </div>
          <div className="cn-compact" data-cn="compact" data-state="download" aria-hidden="true">
            <svg className="cn-mini-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
            </svg>
            <svg className="cn-ring" viewBox="0 0 24 24" width="20" height="20">
              <circle cx="12" cy="12" r="8" fill="none" stroke="rgb(255 255 255 / 0.16)" strokeWidth="2.6" />
              <circle data-cn="ring" cx="12" cy="12" r="8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset="38" transform="rotate(-90 12 12)" />
            </svg>
          </div>

          {/* Open content, one pane per state. */}
          <div className="cn-pane" data-cn="pane" data-state="media" id={paneId} inert={!(open && state === "media")}>
            <span className="cn-tag">{text.sample}</span>
            <div className="cn-row">
              <span className="cn-art" aria-hidden="true" />
              <span className="cn-meta">
                <b>{m.title}</b>
                <span>{m.artist}</span>
              </span>
            </div>
            <div className="cn-timeline">
              <span data-cn="time-now">1:20</span>
              <span className="cn-track" aria-hidden="true">
                <i data-cn="progress" />
              </span>
              <span>3:32</span>
            </div>
            <div className="cn-controls" data-cn="ctl">
              <button type="button" className="cn-ctl-btn" aria-label={m.previous}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
              </button>
              <button type="button" className="cn-ctl-btn cn-ctl-btn--main" aria-label={playing ? m.pause : m.play} aria-pressed={playing} onClick={() => setPlaying((v) => !v)}>
                {playing ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              <button type="button" className="cn-ctl-btn" aria-label={m.next}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 5h2v14h-2zM4 5l11 7L4 19z" /></svg>
              </button>
            </div>
          </div>

          <div className="cn-pane" data-cn="pane" data-state="ai" inert={!(open && state === "ai")}>
            <span className="cn-tag">{text.sample}</span>
            <div className="cn-row">
              <span className="cn-orb" data-cn="orb" aria-hidden="true" />
              <span className="cn-meta">
                <b>{text.ai.prompt}</b>
                <span className="cn-status">
                  <span data-cn="ai-status">{text.ai.ready}</span>
                  <span className="cn-dots" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <i key={i} data-cn="dot" />
                    ))}
                  </span>
                </span>
              </span>
            </div>
          </div>

          <div className="cn-pane" data-cn="pane" data-state="download" inert={!(open && state === "download")}>
            <span className="cn-tag">{text.sample}</span>
            <div className="cn-row">
              <span className="cn-art cn-art--file" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>
              </span>
              <span className="cn-meta">
                <b>{text.download.file}</b>
                <span className="cn-status">
                  <span data-cn="dl-status">{text.download.label}</span>
                </span>
              </span>
              <span className="cn-pct" data-cn="dl-pct">62%</span>
            </div>
            <span className="cn-bar" aria-hidden="true">
              <i data-cn="dl-fill" />
            </span>
          </div>
        </div>
      </div>

      <div className="cn-switch" role="radiogroup" aria-label={text.stateGroup} onKeyDown={onSwitchKey}>
        {ISLAND_STATES.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={state === s} tabIndex={state === s ? 0 : -1} data-state={s} className="cn-seg cn-btn" onClick={() => setState(s)}>
            {text.states[s]}
          </button>
        ))}
      </div>
      <p className="cn-hint">{text.hint}</p>
      <p className="sr-only" role="status" aria-live="polite">
        {text.announce[state]}
      </p>
    </section>
  );
}
