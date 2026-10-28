/**
 * The Corvus Island V10174 simulator's engine.
 *
 * One requestAnimationFrame subscriber steps every spring of the simulator and then writes the DOM once: transforms,
 * opacities and two or three custom properties. It never reads layout inside the frame (sizes are measured when the
 * element resizes, pointer coordinates come from the event and a cached stage rectangle), so a frame is a pure
 * "compute, then write" pass with no forced reflow.
 *
 * What it simulates, with sample data only:
 *  - the docked pill and its expansion on the primary spring (380 / 28 / 0.8, restDelta 0.001); the pill is a fixed-size
 *    element drawn at the open size and only ever scaled, with its corner radius compensated per frame;
 *  - cursor velocity: the island leans with the pointer and stretches slightly;
 *  - hover: a magnetic pull of up to 4 px toward the cursor, and the cursor caustics on the glass;
 *  - press: the water-droplet squish (1.035 / 0.965) on the press spring;
 *  - drag: surface tension. Pulling the island draws a droplet out through the metaball filter; past the tension limit it
 *    detaches and follows the pointer; released, it springs home and merges back;
 *  - three states (media, AI, download) with live demo content.
 *
 * Reduced motion: every spring snaps, there is no lean, magnet, press or drag, and the demos hold a still frame.
 */
import { bottomRadius, clamp, clock, COMPACT, compensatedRadius, lean, lerp, magnet, smooth, tether, type Tether } from "./island-physics";
import { DROPLET, frameDriver, SPRING_EXPANSION, SPRING_PRESS, Spring, type FrameDriver } from "./spring";

export type IslandState = "media" | "ai" | "download";
export const ISLAND_STATES: readonly IslandState[] = ["media", "ai", "download"] as const;

export interface IslandLabels {
  thinking: string;
  ready: string;
  downloading: string;
  done: string;
}

const TRACK_SECONDS = 212;
const SAT_R = 15;
const ANCHOR_PAD = 4;

const q = (root: HTMLElement, name: string): HTMLElement | null => root.querySelector<HTMLElement>(`[data-cn="${name}"]`);
const qa = (root: HTMLElement, name: string): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>(`[data-cn="${name}"]`));

export class IslandEngine {
  private readonly root: HTMLElement;
  private readonly driver: FrameDriver;
  private readonly labels: IslandLabels;

  private readonly stage: HTMLElement;
  private readonly island: HTMLElement;
  private readonly shell: HTMLElement;
  private readonly goo: HTMLElement | null;
  private readonly anchor: HTMLElement | null;
  private readonly sats: HTMLElement[];
  private readonly satHi: HTMLElement[];
  private readonly panes: HTMLElement[];
  private readonly compacts: HTMLElement[];
  private readonly ctls: HTMLElement[];

  private readonly progress: HTMLElement | null;
  private readonly timeNow: HTMLElement | null;
  private readonly bars: HTMLElement[];
  private readonly orbs: HTMLElement[];
  private readonly dots: HTMLElement[];
  private readonly aiStatus: HTMLElement | null;
  private readonly dlFill: HTMLElement | null;
  private readonly dlPct: HTMLElement[];
  private readonly dlStatus: HTMLElement | null;
  private readonly ring: SVGElement | null;

  // Springs. Distances are in px unless noted; the size springs are in units of 100 px so the specified restDelta
  // (0.001) is a tenth of a pixel.
  private readonly pe = new Spring(SPRING_EXPANSION, 0);
  private readonly mw = new Spring(SPRING_EXPANSION, 4);
  private readonly mh = new Spring(SPRING_EXPANSION, 1.68);
  private readonly pq: Spring[] = [new Spring(SPRING_PRESS, 1), new Spring(SPRING_PRESS, 0), new Spring(SPRING_PRESS, 0)];
  private readonly press = new Spring(SPRING_PRESS, 0);
  private readonly leanX = new Spring(SPRING_PRESS, 0);
  private readonly magX = new Spring(SPRING_PRESS, 0);
  private readonly magY = new Spring(SPRING_PRESS, 0);
  private readonly ctl = new Spring(SPRING_PRESS, 0);
  private readonly caustic = new Spring(SPRING_PRESS, 0);
  private readonly an = new Spring(SPRING_PRESS, 0);
  private readonly satX = [new Spring(SPRING_PRESS, 0), new Spring(SPRING_PRESS, 0)];
  private readonly satY = [new Spring(SPRING_PRESS, 0), new Spring(SPRING_PRESS, 0)];
  private readonly satS = [new Spring(SPRING_PRESS, 0), new Spring(SPRING_PRESS, 0)];

  private state: IslandState = "media";
  private expanded = false;
  private playing = true;
  private sizes: { w: number; h: number }[] = [
    { w: 400, h: 168 },
    { w: 360, h: 132 },
    { w: 380, h: 124 },
  ];
  private wMax = 400;
  private hMax = 168;

  // Pointer.
  private stageRect: DOMRect | null = null;
  private inside = false;
  private lx = 0;
  private ly = 0;
  private lastX = 0;
  private lastT = 0;
  private vx = 0;
  private pointerDirty = false;
  private focusWithin = false;
  private coarse = false;
  private down = false;
  private downX = 0;
  private downY = 0;
  private moved = false;
  private dragged = false;
  private dragIndex = 0;
  private pointerId = -1;
  private detached = false;
  private readonly tetherOut: Tether = { x: 0, y: 0, detached: false };
  private returning = [false, false];

  // Demo clocks.
  private visible = true;
  private docVisible = true;
  private prog = 0.38;
  private phase = 0;
  private pct = 62;
  private hold = 0;
  private aiClock = 0;
  private lastSecond = -1;
  private lastPct = -1;
  private lastAi = "";
  private lastDl = "";

  private active = false;
  private destroyed = false;
  private unsub: (() => void) | null = null;
  private readonly cleanup: (() => void)[] = [];
  private gooShown = false;

  constructor(root: HTMLElement, labels: IslandLabels, driver: FrameDriver = frameDriver()) {
    this.root = root;
    this.driver = driver;
    this.labels = labels;
    const need = (name: string): HTMLElement => {
      const el = q(root, name);
      if (!el) throw new Error(`IslandEngine: [data-cn="${name}"] is missing`);
      return el;
    };
    this.stage = need("stage");
    this.island = need("island");
    this.shell = need("shell");
    this.goo = q(root, "goo");
    this.anchor = q(root, "anchor");
    this.sats = qa(root, "sat");
    this.satHi = qa(root, "sathi");
    this.panes = qa(root, "pane");
    this.compacts = qa(root, "compact");
    this.ctls = qa(root, "ctl");
    this.progress = q(root, "progress");
    this.timeNow = q(root, "time-now");
    this.bars = qa(root, "bar");
    this.orbs = qa(root, "orb");
    this.dots = qa(root, "dot");
    this.aiStatus = q(root, "ai-status");
    this.dlFill = q(root, "dl-fill");
    this.dlPct = qa(root, "dl-pct");
    this.dlStatus = q(root, "dl-status");
    this.ring = root.querySelector<SVGElement>('[data-cn="ring"]');

    this.coarse = window.matchMedia("(hover: none)").matches;
    this.shell.dataset.live = "";
    this.measure();
    this.attach();
    this.settleAll();
    this.wake();
  }

  /* ------------------------------------------------------------------------------------------------------- API */

  setState(next: IslandState): void {
    if (next === this.state) return;
    this.state = next;
    this.root.dataset.state = next;
    const i = ISLAND_STATES.indexOf(next);
    const size = this.sizes[i] ?? this.sizes[0]!;
    this.go(this.mw, size.w / 100);
    this.go(this.mh, size.h / 100);
    ISLAND_STATES.forEach((_, k) => this.go(this.pq[k]!, k === i ? 1 : 0));
    this.syncInert();
    if (next === "download") {
      this.pct = 0;
      this.hold = 0;
    }
    this.lastAi = "";
    this.lastDl = "";
    this.wake();
  }

  setExpanded(open: boolean): void {
    this.expanded = open;
    this.go(this.pe, open ? 1 : 0);
    this.syncInert();
    this.wake();
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    this.wake();
  }

  /** True once after a drag, so the click that ends a drag does not also toggle the island. */
  consumeDragged(): boolean {
    const d = this.dragged;
    this.dragged = false;
    return d;
  }

  destroy(): void {
    for (const fn of this.cleanup) fn();
    this.cleanup.length = 0;
    this.destroyed = true;
    this.active = false;
    this.unsub?.();
    this.unsub = null;
  }

  /* ------------------------------------------------------------------------------------------------- plumbing */

  private go(s: Spring, target: number): void {
    if (this.driver.reduced) s.snap(target);
    else s.to(target);
  }

  private measure(): void {
    this.wMax = this.island.offsetWidth || 400;
    this.hMax = this.island.offsetHeight || 168;
    this.sizes = this.panes.map((p, i) => ({ w: p.offsetWidth || this.sizes[i]!.w, h: p.offsetHeight || this.sizes[i]!.h }));
    const i = ISLAND_STATES.indexOf(this.state);
    const size = this.sizes[i] ?? this.sizes[0]!;
    this.mw.snap(size.w / 100);
    this.mh.snap(size.h / 100);
    this.stageRect = null;
  }

  private settleAll(): void {
    this.syncInert();
    this.staticFrame();
  }

  private syncInert(): void {
    this.panes.forEach((p, i) => {
      p.inert = !(this.expanded && ISLAND_STATES[i] === this.state);
    });
  }

  private wake(): void {
    if (this.active || this.destroyed) return;
    this.active = true;
    this.unsub = this.driver.add(this.tick);
  }

  private get demoOn(): boolean {
    return this.visible && this.docVisible && !this.driver.reduced;
  }

  private attach(): void {
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions): void => {
      el.addEventListener(type, fn as EventListener, opts);
      this.cleanup.push(() => el.removeEventListener(type, fn as EventListener));
    };
    on(this.stage, "pointermove", this.onMove, { passive: true });
    on(this.stage, "pointerleave", this.onLeave, { passive: true });
    on(this.island, "pointerdown", this.onDown);
    on(this.island, "pointerup", this.onUp, { passive: true });
    on(this.island, "pointercancel", this.onUp, { passive: true });
    on(this.island, "focusin", () => {
      this.focusWithin = true;
      this.wake();
    });
    on(this.island, "focusout", (e) => {
      if (!(e.relatedTarget instanceof Node) || !this.island.contains(e.relatedTarget)) this.focusWithin = false;
      this.wake();
    });
    const ro = new ResizeObserver(() => {
      this.measure();
      this.wake();
    });
    ro.observe(this.island);
    this.cleanup.push(() => ro.disconnect());
    const io = new IntersectionObserver((entries) => {
      this.visible = entries.some((e) => e.isIntersecting);
      if (this.visible) this.wake();
    });
    io.observe(this.root);
    this.cleanup.push(() => io.disconnect());
    const vis = (): void => {
      this.docVisible = document.visibilityState === "visible";
      if (this.docVisible) this.wake();
    };
    document.addEventListener("visibilitychange", vis);
    this.cleanup.push(() => document.removeEventListener("visibilitychange", vis));
    const inv = (): void => {
      this.stageRect = null;
    };
    window.addEventListener("scroll", inv, { passive: true });
    window.addEventListener("resize", inv, { passive: true });
    this.cleanup.push(() => {
      window.removeEventListener("scroll", inv);
      window.removeEventListener("resize", inv);
    });
  }

  /* --------------------------------------------------------------------------------------------------- pointer */

  private local(e: PointerEvent): void {
    if (!this.stageRect) this.stageRect = this.stage.getBoundingClientRect();
    this.lx = e.clientX - this.stageRect.left - this.stageRect.width / 2;
    this.ly = e.clientY - this.stageRect.top;
  }

  private readonly onMove = (e: PointerEvent): void => {
    this.local(e);
    const dt = Math.max(1, e.timeStamp - this.lastT);
    if (this.lastT > 0 && e.pointerType !== "touch") this.vx += ((e.clientX - this.lastX) / dt - this.vx) * 0.35;
    this.lastX = e.clientX;
    this.lastT = e.timeStamp;
    this.inside = true;
    this.pointerDirty = true;
    if (this.down && !this.moved && Math.hypot(e.clientX - this.downX, e.clientY - this.downY) > 6) {
      this.moved = true;
      this.dragged = true;
      try {
        this.island.setPointerCapture(e.pointerId);
      } catch {
        /* a synthetic or already-released pointer: the drag still works through the stage listener */
      }
      if (!this.driver.reduced) {
        this.go(this.satS[this.dragIndex]!, 1);
        this.go(this.an, 1);
        this.returning[this.dragIndex] = false;
      }
    }
    this.wake();
  };

  private readonly onLeave = (): void => {
    this.inside = false;
    this.vx = 0;
    this.wake();
  };

  private readonly onDown = (e: PointerEvent): void => {
    if (e.button !== 0 || (e.target instanceof Element && e.target.closest('[data-cn="ctl"]'))) return;
    this.local(e);
    this.down = true;
    this.moved = false;
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.dragIndex = this.lx < 0 ? 0 : 1;
    this.detached = false;
    this.pointerId = e.pointerId;
    this.go(this.press, 1);
    this.wake();
  };

  private readonly onUp = (): void => {
    if (!this.down) return;
    this.down = false;
    this.go(this.press, 0);
    if (this.moved) {
      const i = this.dragIndex;
      this.go(this.satX[i]!, 0);
      this.go(this.satY[i]!, 0);
      this.returning[i] = true;
      this.detached = false;
    }
    this.moved = false;
    this.wake();
  };

  /* ----------------------------------------------------------------------------------------------- frame loop */

  private readonly tick = (dt: number): boolean => {
    let moving = false;
    const step = (s: Spring): void => {
      if (s.step(dt)) moving = true;
    };

    // Targets that follow the pointer.
    const reduced = this.driver.reduced;
    const h = lerp(COMPACT.h, this.mh.value * 100, this.pe.value);
    const w = lerp(COMPACT.w, this.mw.value * 100, this.pe.value);
    const hover = this.inside && !reduced && Math.abs(this.lx) <= w / 2 + 10 && this.ly >= 0 && this.ly <= h + 10;
    if (!reduced) {
      this.vx *= Math.exp(-dt * 9);
      if (Math.abs(this.vx) < 1e-3) this.vx = 0;
      const l = lean(this.vx);
      this.leanX.to(this.inside || this.vx !== 0 ? l.shift : 0);
      const m = hover ? magnet(this.lx, this.ly, w / 2, h, DROPLET.magnetPx) : { x: 0, y: 0 };
      this.magX.to(m.x);
      this.magY.to(m.y);
      this.caustic.to(hover ? 1 : 0);
    }
    const showCtl = this.expanded && (hover || this.focusWithin || this.coarse || reduced);
    this.go(this.ctl, showCtl ? 1 : 0);

    // Drag: surface tension.
    if (this.down && this.moved && !reduced) {
      const i = this.dragIndex;
      const ax = i === 0 ? -14 : 14;
      const ay = h + ANCHOR_PAD;
      tether(this.lx - ax, this.ly - ay, this.detached, this.tetherOut);
      if (this.tetherOut.detached && !this.detached) {
        // The skin lets go: the island recoils.
        this.mh.kick(-1.4);
        this.pe.kick(-0.5);
      }
      this.detached = this.tetherOut.detached;
      // The neck that held the droplet recoils into the island once it has let go.
      this.go(this.an, this.detached ? 0 : 1);
      this.satX[i]!.to(this.tetherOut.x);
      this.satY[i]!.to(this.tetherOut.y);
    }

    // Springs.
    step(this.pe);
    step(this.mw);
    step(this.mh);
    for (const s of this.pq) step(s);
    step(this.press);
    step(this.leanX);
    step(this.magX);
    step(this.magY);
    step(this.ctl);
    step(this.caustic);
    step(this.an);
    for (let i = 0; i < 2; i++) {
      step(this.satX[i]!);
      step(this.satY[i]!);
      step(this.satS[i]!);
      if (this.returning[i] && !this.down) {
        const near = Math.hypot(this.satX[i]!.value, this.satY[i]!.value) < 5 && Math.abs(this.satX[i]!.velocity) + Math.abs(this.satY[i]!.velocity) < 60;
        if (near) {
          this.returning[i] = false;
          this.go(this.satS[i]!, 0);
          if (!this.returning[1 - i] && this.satS[1 - i]!.target === 0) this.go(this.an, 0);
        }
      }
    }

    const demo = this.demoOn;
    if (demo) this.advanceDemo(dt);
    this.render(w, h);
    this.pointerDirty = false;
    const keep = !this.destroyed && (moving || demo);
    if (!keep) this.active = false;
    return keep;
  };

  private render(w: number, h: number): void {
    const pe = this.pe.value;
    const sx = w / this.wMax;
    const sy = h / this.hMax;
    const { rx, ry } = compensatedRadius(bottomRadius(pe), sx, sy);
    const shell = this.shell.style;
    shell.transform = `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    shell.borderRadius = `0 0 ${rx.toFixed(2)}px ${rx.toFixed(2)}px / 0 0 ${ry.toFixed(2)}px ${ry.toFixed(2)}px`;
    this.stage.style.setProperty("--cn-p", clamp(pe, 0, 1).toFixed(3));

    const pr = this.press.value;
    const l = lean(this.vx);
    const px = 1 + (DROPLET.scaleX - 1) * pr + l.stretch * clamp(Math.abs(this.leanX.value) / 6, 0, 1);
    const py = 1 + (DROPLET.scaleY - 1) * pr;
    this.island.style.transform = `translate3d(${(this.leanX.value + this.magX.value).toFixed(2)}px, ${this.magY.value.toFixed(2)}px, 0) scale(${px.toFixed(4)}, ${py.toFixed(4)})`;

    // Cursor caustics: two custom properties, in the shell's own (unscaled) coordinates.
    if (this.pointerDirty && this.inside) {
      shell.setProperty("--pointer-x", `${(this.lx / Math.max(sx, 0.01) + this.wMax / 2).toFixed(1)}px`);
      shell.setProperty("--pointer-y", `${(this.ly / Math.max(sy, 0.01)).toFixed(1)}px`);
    }
    shell.setProperty("--cn-caustic", clamp(this.caustic.value, 0, 1).toFixed(3));

    // Content crossfades.
    const open = smooth(0.55, 0.95, pe);
    const closed = 1 - smooth(0, 0.35, pe);
    const ctl = clamp(this.ctl.value, 0, 1);
    for (let i = 0; i < this.panes.length; i++) {
      const qv = clamp(this.pq[i]!.value, 0, 1);
      this.panes[i]!.style.opacity = (qv * open).toFixed(3);
      this.compacts[i]!.style.opacity = (qv * closed).toFixed(3);
    }
    for (const c of this.ctls) {
      c.style.opacity = ctl.toFixed(3);
      c.style.transform = `translate3d(0, ${((1 - ctl) * 5).toFixed(2)}px, 0)`;
    }

    // Satellites and their neck, in the metaball layer; highlights sit above the glass-free goo.
    const sat0 = this.satS[0]!.value;
    const sat1 = this.satS[1]!.value;
    const an = this.an.value;
    const gooOn = sat0 > 0.02 || sat1 > 0.02 || an > 0.02;
    if (this.goo && gooOn !== this.gooShown) {
      this.goo.style.visibility = gooOn ? "visible" : "hidden";
      this.gooShown = gooOn;
    }
    if (gooOn) {
      const ay = h + ANCHOR_PAD;
      if (this.anchor) this.anchor.style.transform = `translate3d(-50%, ${(ay - 8).toFixed(1)}px, 0) scale(${clamp(an, 0, 1.4).toFixed(3)}, ${clamp(an, 0, 1.4).toFixed(3)})`;
      for (let i = 0; i < 2; i++) {
        const ax = i === 0 ? -14 : 14;
        const s = clamp(this.satS[i]!.value, 0, 1.3);
        const tx = ax + this.satX[i]!.value - SAT_R;
        const ty = ay + this.satY[i]!.value - SAT_R;
        const t = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
        const sat = this.sats[i];
        if (sat) sat.style.transform = t;
        const hi = this.satHi[i];
        if (hi) {
          hi.style.transform = t;
          hi.style.opacity = clamp((s - 0.4) / 0.6, 0, 1).toFixed(3);
        }
      }
    }
  }

  /* -------------------------------------------------------------------------------------------------- demos */

  private staticFrame(): void {
    this.prog = 0.38;
    this.pct = 62;
    this.writeMedia(true);
    this.writeDownload();
    this.writeAi("ready");
  }

  private advanceDemo(dt: number): void {
    this.phase += dt;
    if (this.state === "media") {
      if (this.playing) {
        this.prog += dt / TRACK_SECONDS;
        if (this.prog >= 1) this.prog = 0;
      }
      this.writeMedia(false);
    } else if (this.state === "ai") {
      this.aiClock += dt;
      const t = this.aiClock % 7;
      this.writeAi(t < 3.6 ? "thinking" : "ready");
    } else {
      if (this.pct < 100) this.pct = Math.min(100, this.pct + dt * 14);
      else {
        this.hold += dt;
        if (this.hold > 1.8) {
          this.hold = 0;
          this.pct = 0;
        }
      }
      this.writeDownload();
    }
  }

  private writeMedia(still: boolean): void {
    if (this.progress) this.progress.style.transform = `scaleX(${this.prog.toFixed(4)})`;
    const sec = Math.floor(this.prog * TRACK_SECONDS);
    if (this.timeNow && sec !== this.lastSecond) {
      this.timeNow.textContent = clock(sec);
      this.lastSecond = sec;
    }
    const live = !still && this.playing;
    for (let i = 0; i < this.bars.length; i++) {
      const v = live ? 0.28 + 0.72 * Math.abs(Math.sin(this.phase * (3.1 + i * 0.9) + i * 1.7)) : 0.3 + 0.1 * (i % 3);
      this.bars[i]!.style.transform = `scaleY(${v.toFixed(3)})`;
    }
  }

  private writeAi(status: "thinking" | "ready"): void {
    const breathe = this.driver.reduced ? 1 : 1 + 0.07 * Math.sin(this.phase * 2.4);
    for (const o of this.orbs) o.style.transform = `scale(${breathe.toFixed(3)})`;
    for (let i = 0; i < this.dots.length; i++) {
      const on = status === "thinking" && !this.driver.reduced ? 0.25 + 0.75 * Math.max(0, Math.sin(this.phase * 5 - i * 0.9)) : 0.35;
      this.dots[i]!.style.opacity = on.toFixed(3);
    }
    if (this.aiStatus && status !== this.lastAi) {
      this.aiStatus.textContent = status === "thinking" ? this.labels.thinking : this.labels.ready;
      this.lastAi = status;
    }
  }

  private writeDownload(): void {
    const pct = Math.floor(this.pct);
    if (this.dlFill) this.dlFill.style.transform = `scaleX(${(this.pct / 100).toFixed(4)})`;
    if (pct !== this.lastPct) {
      for (const el of this.dlPct) el.textContent = `${pct}%`;
      this.lastPct = pct;
    }
    if (this.ring) this.ring.style.strokeDashoffset = `${(100 - this.pct).toFixed(2)}`;
    const label = this.pct >= 100 ? this.labels.done : this.labels.downloading;
    if (this.dlStatus && label !== this.lastDl) {
      this.dlStatus.textContent = label;
      this.lastDl = label;
    }
  }
}
