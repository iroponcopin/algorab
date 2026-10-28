/**
 * The site's tactile layer, installed once for the whole document.
 *
 *  - Optical Glass layer 4 (cursor caustics): for the glass surface under a fine pointer, exactly two CSS custom
 *    properties (`--pointer-x`, `--pointer-y`) are written, coalesced to one write per animation frame. No React state
 *    is involved in a pointer move. The caustic's fade (`--cn-caustic`) is a spring and runs on the frame loop, not on
 *    pointer events.
 *  - Water-droplet press: a pressed control compresses along the axis of force and widens across it
 *    (scaleX 1.035 / scaleY 0.965 at the specified press spring), scaled down for large surfaces so a card never
 *    moves more than a few pixels.
 *  - Magnetic pull: a `[data-magnetic]` control leans up to 4 px toward the cursor.
 *
 * Transforms are written inline from the spring solver; there is no CSS transition on any of it.
 */
import { DROPLET, frameDriver, SPRING_PRESS, Tween, type FrameDriver } from "./spring";

export const PRESS_SELECTOR = "[data-spring], .ac-btn, .ac-chip, .ac-iconbtn, .ac-nav-link, .ac-model-cta, .cn-btn";
const GLASS_SELECTOR = "[data-glass], .ac-card, .ac-glass, .ac-header-pill";
const MAGNET_SELECTOR = "[data-magnetic]";
/** A surface wider than this deforms by at most `MAX_SQUISH_PX` instead of 3.5 percent. */
const MAX_SQUISH_PX = 5;

interface Body {
  el: HTMLElement;
  press: Tween;
  mx: Tween;
  my: Tween;
  caustic: Tween;
  squish: number;
}

export function installPointerField(root: Document = document, driver: FrameDriver = frameDriver()): () => void {
  const bodies = new WeakMap<HTMLElement, Body>();
  const pressed = new Set<Body>();
  let version = 0;
  const rects = new WeakMap<HTMLElement, { v: number; r: DOMRect }>();

  const rectOf = (el: HTMLElement): DOMRect => {
    const c = rects.get(el);
    if (c && c.v === version) return c.r;
    const r = el.getBoundingClientRect();
    rects.set(el, { v: version, r });
    return r;
  };

  const compose = (b: Body): void => {
    const p = b.press.value;
    const sx = 1 + (DROPLET.scaleX - 1) * p * b.squish;
    const sy = 1 + (DROPLET.scaleY - 1) * p * b.squish;
    const x = b.mx.value;
    const y = b.my.value;
    if (Math.abs(p) < 1e-3 && Math.abs(x) < 0.01 && Math.abs(y) < 0.01 && b.press.spring.settled && b.mx.spring.settled && b.my.spring.settled) {
      b.el.style.removeProperty("transform");
    } else {
      b.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    }
  };

  const bodyOf = (el: HTMLElement): Body => {
    let b = bodies.get(el);
    if (b) return b;
    const made: Body = {
      el,
      squish: 1,
      press: new Tween(driver, SPRING_PRESS, 0, () => compose(made)),
      mx: new Tween(driver, SPRING_PRESS, 0, () => compose(made)),
      my: new Tween(driver, SPRING_PRESS, 0, () => compose(made)),
      caustic: new Tween(driver, SPRING_PRESS, 0, (v) => el.style.setProperty("--cn-caustic", v.toFixed(3))),
    };
    bodies.set(el, made);
    b = made;
    return b;
  };

  let glass: HTMLElement | null = null;
  let magnet: HTMLElement | null = null;
  let px = 0;
  let py = 0;
  let queued = 0;

  const flush = (): void => {
    queued = 0;
    if (glass) {
      const r = rectOf(glass);
      glass.style.setProperty("--pointer-x", `${(px - r.left).toFixed(1)}px`);
      glass.style.setProperty("--pointer-y", `${(py - r.top).toFixed(1)}px`);
    }
    if (magnet && !driver.reduced) {
      const r = rectOf(magnet);
      const b = bodyOf(magnet);
      const lim = DROPLET.magnetPx;
      b.mx.to(Math.max(-lim, Math.min(lim, ((px - (r.left + r.width / 2)) / Math.max(r.width, 1)) * lim * 2)));
      b.my.to(Math.max(-lim, Math.min(lim, ((py - (r.top + r.height / 2)) / Math.max(r.height, 1)) * lim * 2)));
    }
  };

  const releaseMagnet = (el: HTMLElement | null): void => {
    if (!el) return;
    const b = bodies.get(el);
    if (!b) return;
    b.mx.to(0);
    b.my.to(0);
  };

  const onMove = (e: PointerEvent): void => {
    if (e.pointerType === "touch") return;
    const t = e.target instanceof Element ? e.target : null;
    const g = t?.closest<HTMLElement>(GLASS_SELECTOR) ?? null;
    const m = t?.closest<HTMLElement>(MAGNET_SELECTOR) ?? null;
    if (g !== glass) {
      if (glass) bodyOf(glass).caustic.to(0);
      glass = g;
      if (glass) bodyOf(glass).caustic.to(1);
    }
    if (m !== magnet) {
      releaseMagnet(magnet);
      magnet = m;
    }
    px = e.clientX;
    py = e.clientY;
    if (queued === 0 && (glass || magnet)) queued = window.requestAnimationFrame(flush);
  };

  const onLeave = (e: PointerEvent): void => {
    if (e.relatedTarget) return;
    if (glass) bodyOf(glass).caustic.to(0);
    releaseMagnet(magnet);
    glass = null;
    magnet = null;
  };

  const onDown = (e: PointerEvent): void => {
    if (driver.reduced) return;
    const el = e.target instanceof Element ? e.target.closest<HTMLElement>(PRESS_SELECTOR) : null;
    if (!el || (el instanceof HTMLButtonElement && el.disabled)) return;
    const b = bodyOf(el);
    const w = rectOf(el).width;
    b.squish = Math.min(1, MAX_SQUISH_PX / Math.max(1, w * (DROPLET.scaleX - 1)));
    b.press.to(1);
    pressed.add(b);
  };

  const onUp = (): void => {
    for (const b of pressed) b.press.to(0);
    pressed.clear();
  };

  const invalidate = (): void => {
    version++;
  };

  root.addEventListener("pointermove", onMove, { passive: true });
  root.addEventListener("pointerdown", onDown, { passive: true });
  root.addEventListener("pointerup", onUp, { passive: true });
  root.addEventListener("pointercancel", onUp, { passive: true });
  root.addEventListener("pointerout", onLeave, { passive: true });
  window.addEventListener("scroll", invalidate, { passive: true, capture: true });
  window.addEventListener("resize", invalidate, { passive: true });
  return () => {
    root.removeEventListener("pointermove", onMove);
    root.removeEventListener("pointerdown", onDown);
    root.removeEventListener("pointerup", onUp);
    root.removeEventListener("pointercancel", onUp);
    root.removeEventListener("pointerout", onLeave);
    window.removeEventListener("scroll", invalidate, { capture: true });
    window.removeEventListener("resize", invalidate);
    if (queued) window.cancelAnimationFrame(queued);
  };
}
