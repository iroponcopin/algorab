/**
 * The pure geometry and tension rules of the Corvus Island simulator, kept apart from the DOM so they can be tested.
 */

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smooth = (edge0: number, edge1: number, x: number): number => clamp((x - edge0) / (edge1 - edge0), 0, 1);

/** The docked pill: the width of a notch, and a menu bar's height. */
export const COMPACT = { w: 190, h: 36 } as const;
/** Bottom corner radius, docked (a continuous 18 px) and expanded. */
export const RADIUS = { docked: 18, open: 34 } as const;
/** Pointer distance from the anchor, in px, at which a pulled droplet lets go, and the distance that re-attaches it. */
export const TENSION = { detachAt: 112, reattachAt: 56, maxStretch: 76 } as const;

/** Visible size of the island for an expansion progress `p` (0 docked, 1 open) and an open size. */
export function visibleSize(p: number, open: { w: number; h: number }): { w: number; h: number } {
  return { w: lerp(COMPACT.w, open.w, p), h: lerp(COMPACT.h, open.h, p) };
}

/** Bottom radius for an expansion progress. */
export function bottomRadius(p: number): number {
  return lerp(RADIUS.docked, RADIUS.open, clamp(p, 0, 1));
}

/**
 * A box scaled by (sx, sy) draws a radius R as R*sx by R*sy. To show a circular R, the CSS radius is set elliptical,
 * R/sx by R/sy, so the corner stays round while the box is only ever transformed.
 */
export function compensatedRadius(r: number, sx: number, sy: number): { rx: number; ry: number } {
  return { rx: r / Math.max(sx, 1e-3), ry: r / Math.max(sy, 1e-3) };
}

/** Surface tension: the stretch grows with the pull but saturates, so the skin visibly resists. */
export function rubberBand(distance: number, max: number = TENSION.maxStretch): number {
  return max * Math.tanh(distance / max);
}

export interface Tether {
  x: number;
  y: number;
  detached: boolean;
}

/**
 * Where a pulled droplet sits for a pointer at offset (dx, dy) from its anchor. Below `detachAt` the droplet is held by
 * the skin and stretches with a rubber band; beyond it the skin lets go and the droplet follows the pointer. Once free it
 * only re-attaches when the pointer comes back inside `reattachAt` (hysteresis, so it does not flicker at the threshold).
 */
export function tether(dx: number, dy: number, wasDetached: boolean, out: Tether): Tether {
  const d = Math.hypot(dx, dy);
  const detached = wasDetached ? d >= TENSION.reattachAt : d >= TENSION.detachAt;
  if (detached) {
    out.x = dx;
    out.y = dy;
  } else {
    const k = d > 1e-6 ? rubberBand(d) / d : 0;
    out.x = dx * k;
    out.y = dy * k;
  }
  out.detached = detached;
  return out;
}

/** Cursor velocity (px per ms, smoothed) to the island's sideways lean in px, and its stretch factor. */
export function lean(vx: number): { shift: number; stretch: number } {
  return { shift: clamp(vx * 5, -6, 6), stretch: clamp(Math.abs(vx) * 0.012, 0, 0.02) };
}

/** The magnetic pull toward the cursor: at most `limit` px on each axis, never lifting a docked island off the top edge. */
export function magnet(lx: number, ly: number, halfW: number, h: number, limit = 4): { x: number; y: number } {
  return {
    x: clamp((lx / Math.max(halfW, 1)) * limit, -limit, limit),
    y: clamp((ly / Math.max(h, 1)) * limit, 0, limit),
  };
}

/** `m:ss` for a number of seconds. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
