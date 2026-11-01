/**
 * Corvus NEXT spring physics.
 *
 * A damped harmonic oscillator, advanced with its exact closed-form solution: the step is
 * unconditionally stable and gives the same trajectory for any partition of time (a 60 Hz and a 120 Hz
 * display land on the same curve), which is what a refresh-rate-independent interface needs.
 * `stepSemiImplicit` is the textbook integrator kept as the cross-check the unit tests compare against.
 *
 * Nothing here touches the DOM and nothing allocates inside `advance`/`Spring.step`.
 */

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
  /** Distance from the target under which the spring may come to rest. */
  restDelta?: number;
  /** Speed under which the spring may come to rest. */
  restSpeed?: number;
}

/** The primary expansion spring (owner's specification, V10174). */
export const SPRING_EXPANSION: Readonly<SpringConfig> = { stiffness: 380, damping: 28, mass: 0.8, restDelta: 0.001 };
/** The micro-tactile press spring (water-droplet squish). */
export const SPRING_PRESS: Readonly<SpringConfig> = { stiffness: 620, damping: 20, mass: 0.45 };

/** Surface-tension deformation on contact and the magnetic pull before detachment. */
export const DROPLET = { scaleX: 1.035, scaleY: 0.965, magnetPx: 4 } as const;

const DEFAULT_REST_DELTA = 0.001;
const DEFAULT_REST_SPEED = 0.01;

/** Undamped angular frequency and damping ratio of a configuration. */
export function characteristics(cfg: SpringConfig): { omega0: number; zeta: number } {
  const omega0 = Math.sqrt(cfg.stiffness / cfg.mass);
  const zeta = cfg.damping / (2 * Math.sqrt(cfg.stiffness * cfg.mass));
  return { omega0, zeta };
}

/** Result slot, reused by callers that must not allocate. */
export interface Kinematics {
  x: number;
  v: number;
}

/**
 * Exact solution of m x'' + c x' + k x = 0 after `t` seconds, from displacement `x0` (value minus target)
 * and velocity `v0`. Writes the displacement and velocity into `out`.
 */
export function solve(cfg: SpringConfig, x0: number, v0: number, t: number, out: Kinematics): Kinematics {
  const { omega0, zeta } = characteristics(cfg);
  if (t <= 0) {
    out.x = x0;
    out.v = v0;
    return out;
  }
  if (zeta < 1 - 1e-9) {
    const a = zeta * omega0;
    const wd = omega0 * Math.sqrt(1 - zeta * zeta);
    const e = Math.exp(-a * t);
    const c = Math.cos(wd * t);
    const s = Math.sin(wd * t);
    const b = (v0 + a * x0) / wd;
    out.x = e * (x0 * c + b * s);
    out.v = e * (v0 * c - ((a * v0 + omega0 * omega0 * x0) / wd) * s);
  } else if (zeta <= 1 + 1e-9) {
    const e = Math.exp(-omega0 * t);
    const b = v0 + omega0 * x0;
    out.x = e * (x0 + b * t);
    out.v = e * (v0 - omega0 * b * t);
  } else {
    const root = omega0 * Math.sqrt(zeta * zeta - 1);
    const r1 = -zeta * omega0 + root;
    const r2 = -zeta * omega0 - root;
    const c2 = (v0 - r1 * x0) / (r2 - r1);
    const c1 = x0 - c2;
    const e1 = Math.exp(r1 * t);
    const e2 = Math.exp(r2 * t);
    out.x = c1 * e1 + c2 * e2;
    out.v = c1 * r1 * e1 + c2 * r2 * e2;
  }
  return out;
}

/** One semi-implicit (symplectic) Euler step. Reference integrator for the tests; the runtime uses `solve`. */
export function stepSemiImplicit(cfg: SpringConfig, k: Kinematics, dt: number): void {
  const a = (-cfg.stiffness * k.x - cfg.damping * k.v) / cfg.mass;
  k.v += a * dt;
  k.x += k.v * dt;
}

const scratch: Kinematics = { x: 0, v: 0 };

/** A single scalar spring. `value` and `velocity` are public so a caller can read or inject momentum. */
export class Spring {
  value: number;
  velocity = 0;
  target: number;
  readonly cfg: SpringConfig;
  private resting: boolean;

  constructor(cfg: SpringConfig, initial = 0) {
    this.cfg = cfg;
    this.value = initial;
    this.target = initial;
    this.resting = true;
  }

  get settled(): boolean {
    return this.resting;
  }

  /** Aim at a new target; the spring keeps its current velocity, so a reversal is continuous. */
  to(target: number): void {
    this.target = target;
    this.resting = false;
  }

  /** Jump to the target with no motion (reduced motion, or the first frame). */
  snap(target = this.target): void {
    this.target = target;
    this.value = target;
    this.velocity = 0;
    this.resting = true;
  }

  /** Add momentum, in value units per second. */
  kick(velocity: number): void {
    this.velocity += velocity;
    this.resting = false;
  }

  /** Advance by `dt` seconds. Returns true while the spring is still moving. */
  step(dt: number): boolean {
    if (this.resting) return false;
    solve(this.cfg, this.value - this.target, this.velocity, dt, scratch);
    this.value = this.target + scratch.x;
    this.velocity = scratch.v;
    const delta = this.cfg.restDelta ?? DEFAULT_REST_DELTA;
    const speed = this.cfg.restSpeed ?? DEFAULT_REST_SPEED;
    if (Math.abs(scratch.x) < delta && Math.abs(scratch.v) < speed) {
      this.value = this.target;
      this.velocity = 0;
      this.resting = true;
      return false;
    }
    return true;
  }
}

/** Time of the first settle of a configuration from a unit step, in seconds, sampled at `dt`. */
export function settleTime(cfg: SpringConfig, dt = 1 / 240, limit = 10): number {
  const s = new Spring(cfg, 0);
  s.to(1);
  let t = 0;
  while (t < limit && s.step(dt)) t += dt;
  return t;
}

/* ---------------------------------------------------------------------------------------------------------------- */

export interface FrameEnv {
  raf: (cb: (time: number) => void) => number;
  caf: (id: number) => void;
}

/** A subscriber returns true while it still has motion to render. */
export type Subscriber = (dt: number, time: number) => boolean;

/**
 * One requestAnimationFrame loop for every spring on the page. It sleeps (no frame is requested) when no
 * subscriber is moving, and clamps long frames so a background tab cannot fire a huge step on return.
 */
export class FrameDriver {
  /** Reduced motion: springs snap instead of travelling. Read by `Tween`, set from the media query. */
  reduced = false;
  private readonly subs = new Set<Subscriber>();
  private readonly env: FrameEnv;
  private id = 0;
  private last = -1;
  private readonly maxStep: number;
  /** Frame time stamps of the last run, kept only while `trace` is on (the performance harness). */
  trace: number[] | null = null;

  constructor(env: FrameEnv, maxStep = 1 / 30) {
    this.env = env;
    this.maxStep = maxStep;
  }

  get running(): boolean {
    return this.id !== 0;
  }

  get size(): number {
    return this.subs.size;
  }

  add(sub: Subscriber): () => void {
    this.subs.add(sub);
    if (this.id === 0) {
      this.last = -1;
      this.id = this.env.raf(this.tick);
    }
    return () => {
      this.subs.delete(sub);
    };
  }

  private readonly tick = (time: number): void => {
    const dt = this.last < 0 ? 1 / 60 : Math.min((time - this.last) / 1000, this.maxStep);
    this.last = time;
    if (this.trace) this.trace.push(time);
    for (const sub of this.subs) {
      if (!sub(dt, time)) this.subs.delete(sub);
    }
    this.id = this.subs.size > 0 ? this.env.raf(this.tick) : 0;
  };
}

/**
 * A spring bound to a render callback and a driver. `to()` starts (or redirects) the motion; under reduced motion
 * it renders the destination at once.
 */
export class Tween {
  readonly spring: Spring;
  private readonly driver: FrameDriver;
  private readonly render: (value: number) => void;
  private running = false;

  constructor(driver: FrameDriver, cfg: SpringConfig, initial: number, render: (value: number) => void) {
    this.driver = driver;
    this.spring = new Spring(cfg, initial);
    this.render = render;
  }

  get value(): number {
    return this.spring.value;
  }

  to(target: number): void {
    if (this.driver.reduced) {
      this.spring.snap(target);
      this.render(target);
      return;
    }
    this.spring.to(target);
    this.wake();
  }

  kick(velocity: number): void {
    if (this.driver.reduced) return;
    this.spring.kick(velocity);
    this.wake();
  }

  snap(target: number): void {
    this.spring.snap(target);
    this.render(target);
  }

  private wake(): void {
    if (this.running) return;
    this.running = true;
    this.driver.add(this.advance);
  }

  private readonly advance = (dt: number): boolean => {
    const moving = this.spring.step(dt);
    this.render(this.spring.value);
    if (!moving) this.running = false;
    return moving;
  };
}

/* ---------------------------------------------------------------------------------------------------------------- */

let shared: FrameDriver | null = null;

/** The page's driver (browser only). */
export function frameDriver(): FrameDriver {
  if (shared) return shared;
  shared = new FrameDriver({ raf: (cb) => window.requestAnimationFrame(cb), caf: (id) => window.cancelAnimationFrame(id) });
  if (typeof window.matchMedia === "function") {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    shared.reduced = mq.matches;
    mq.addEventListener("change", (e) => {
      if (shared) shared.reduced = e.matches;
    });
  }
  return shared;
}
