import { advance, type RootState } from "@react-three/fiber";
import { gsap } from "gsap";
import { updateMusic, updateSound } from "./audio";
import { clamp, damp } from "./math";
import { engine } from "./store";

/**
 * The one frame loop of the site. GSAP's ticker owns requestAnimationFrame; on each tick it
 * advances the engine clock, then renders the WebGL root by hand (`frameloop="never"`). The page
 * scrolls natively, so the browser's scroll position is the only one there is, and scroll, triggers
 * and pixels can never drift apart. Nothing in `tick` allocates.
 */

let root: RootState | null = null;
/** DOM-side per-frame work (scroll-driven parameters), run before the render. */
const hooks: ((dt: number) => void)[] = [];

export function addFrameHook(fn: (dt: number) => void): () => void {
  hooks.push(fn);
  install();
  return () => {
    const i = hooks.indexOf(fn);
    if (i >= 0) hooks.splice(i, 1);
  };
}
let installed = false;
let lastTickMs = 0;

function tick(_time: number, deltaMs: number): void {
  const start = performance.now();
  // Display refresh estimate (ignores hitches so a dropped frame doesn't lower the target).
  if (deltaMs > 2 && deltaMs < 40) engine.refreshMs = damp(engine.refreshMs, deltaMs, 2.5, deltaMs / 1000);

  engine.dt = clamp(deltaMs / 1000, 1 / 240, 1 / 20);
  engine.time += engine.dt;
  engine.frame += 1;
  // Backwards, so a hook may remove itself while the list is being walked.
  for (let i = hooks.length - 1; i >= 0; i--) hooks[i]?.(engine.dt);

  if (root !== null) {
    advance(engine.time, false, root);
    const spent = performance.now() - start;
    engine.cpuMs = damp(engine.cpuMs, spent, 4, engine.dt);
    if (spent > engine.refreshMs) engine.longFrames += 1;
  }
  updateSound();
  updateMusic();
  lastTickMs = start;
}

function install(): void {
  if (installed) return;
  installed = true;
  // A long pause (a background tab) must not turn into one giant step on return.
  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add(tick);
}

export function attachRoot(state: RootState): void {
  root = state;
  install();
}

export function detachRoot(state: RootState): void {
  if (root === state) root = null;
}

/** For the debug overlay: the timestamp of the last tick (ms, performance.now()). */
export function lastTick(): number {
  return lastTickMs;
}

export function ensureLoop(): void {
  install();
}
