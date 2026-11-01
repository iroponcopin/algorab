"use client";

import { useEffect, useRef } from "react";
import { frameDriver } from "@/design/spring";

export interface ShowcaseContent {
  title: string;
  body: string;
  caption: string;
  /** Alternative text for the stills: the same footage, so one sentence each. */
  alt: string;
  video: { small: string; large: string };
  stills: { small: string; large: string; lang: string }[];
}

/** Share of the distance to the scroll target covered per 60 Hz frame: scrubbing settles instead of stepping. */
const FOLLOW = 0.2;
/** The file is fetched this far ahead of the section, so nothing pops in. */
const LOAD_AHEAD = "200% 0px";

/**
 * The running macOS app changing language, tied to the scroll position.
 *
 * Content first: the server sends the stills, and that is the whole section without scripts, with reduced motion or with a
 * data saver (html[data-enhanced] decides, before first paint). Enhanced, the file is fetched whole two viewports early
 * (keyframes every 8 frames, so seeking is instant), and only then does scrolling drive currentTime, on the page's one
 * frame driver: layout is read and the video written in the same callback, and only while the section is on screen.
 */
export function LanguageShowcase({ c }: { c: ShowcaseContent }) {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = root.current;
    const v = video.current;
    if (el === null || v === null || !document.documentElement.hasAttribute("data-enhanced")) return;
    const driver = frameDriver();
    const abort = new AbortController();
    let url: string | null = null;
    let ready = false;
    let running = false;
    let shown = false;
    let now = 0;

    const step = (dt: number): boolean => {
      if (!running) return false;
      const r = el.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      const progress = travel <= 0 ? 0 : Math.min(1, Math.max(0, -r.top / travel));
      const target = progress * (v.duration || 0);
      now += (target - now) * (1 - Math.pow(1 - FOLLOW, dt * 60));
      if (!v.seeking && Math.abs(v.currentTime - now) > 1 / 60) v.currentTime = now;
      return true;
    };
    const wake = (): void => {
      if (!ready || running) return;
      running = true;
      driver.add(step);
    };

    const onScreen = new IntersectionObserver((entries) => {
      shown = entries.some((e) => e.isIntersecting);
      if (shown) wake();
      else running = false;
    });
    onScreen.observe(el);

    const load = async (): Promise<void> => {
      const src = window.matchMedia("(max-width: 734px)").matches ? c.video.small : c.video.large;
      const res = await fetch(src, { signal: abort.signal });
      if (!res.ok) return;
      url = URL.createObjectURL(await res.blob());
      v.preload = "auto";
      v.src = url;
      const decoded = new Promise<void>((done, fail) => {
        v.addEventListener("loadeddata", () => done(), { once: true });
        v.addEventListener("error", () => fail(new Error("video")), { once: true });
      });
      v.load();
      // Phones may hold a video's frames back until it has played once; it is muted and paused again at once.
      void v
        .play()
        .then(() => v.pause())
        .catch(() => undefined);
      await decoded;
      ready = true;
      el.dataset.scrub = "ready";
      if (shown) wake();
    };

    const ahead = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          ahead.disconnect();
          // A failed load leaves the still on screen, which is the section's resting state.
          load().catch(() => undefined);
        }
      },
      { rootMargin: LOAD_AHEAD },
    );
    ahead.observe(el);

    return () => {
      abort.abort();
      ahead.disconnect();
      onScreen.disconnect();
      running = false;
      v.removeAttribute("src");
      if (url !== null) URL.revokeObjectURL(url);
    };
  }, [c.video.small, c.video.large]);

  const [first, ...rest] = c.stills;
  return (
    <section className="cn-show" ref={root} aria-labelledby="cn-show-h">
      <div className="cn-show-stage">
        <header className="cn-show-head">
          <h2 id="cn-show-h" className="cn-show-title">
            {c.title}
          </h2>
          <p className="cn-show-body">{c.body}</p>
        </header>
        {first ? (
          <div className="cn-show-window cn-stage-frame">
            <picture>
              <source media="(max-width: 734px)" srcSet={first.small} />
              <img src={first.large} alt={c.alt} width={1416} height={864} fetchPriority="high" />
            </picture>
            <video ref={video} muted playsInline preload="none" aria-hidden="true" tabIndex={-1} />
          </div>
        ) : null}
        <div className="cn-show-more">
          {rest.map((s) => (
            <div key={s.lang} className="cn-show-window cn-stage-frame">
              <picture>
                <source media="(max-width: 734px)" srcSet={s.small} />
                <img src={s.large} alt={c.alt} width={1416} height={864} loading="lazy" lang={s.lang} />
              </picture>
            </div>
          ))}
        </div>
        <p className="cn-show-caption">{c.caption}</p>
      </div>
    </section>
  );
}
