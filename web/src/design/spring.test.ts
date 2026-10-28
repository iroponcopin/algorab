import assert from "node:assert/strict";
import { test } from "node:test";
import {
  characteristics,
  DROPLET,
  FrameDriver,
  SPRING_EXPANSION,
  SPRING_PRESS,
  settleTime,
  solve,
  Spring,
  stepSemiImplicit,
  Tween,
  type Kinematics,
  type SpringConfig,
} from "./spring.ts";

const near = (a: number, b: number, eps: number, msg?: string): void => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ""} ${a} vs ${b} (eps ${eps})`);

test("the specified constants are exactly the owner's", () => {
  assert.deepEqual({ ...SPRING_EXPANSION }, { stiffness: 380, damping: 28, mass: 0.8, restDelta: 0.001 });
  assert.equal(SPRING_PRESS.stiffness, 620);
  assert.equal(SPRING_PRESS.damping, 20);
  assert.equal(SPRING_PRESS.mass, 0.45);
  assert.deepEqual({ ...DROPLET }, { scaleX: 1.035, scaleY: 0.965, magnetPx: 4 });
});

test("both springs are under-damped; the expansion overshoots about 1.5 percent", () => {
  const e = characteristics(SPRING_EXPANSION);
  assert.ok(e.zeta > 0.79 && e.zeta < 0.81, `zeta ${e.zeta}`);
  const p = characteristics(SPRING_PRESS);
  assert.ok(p.zeta > 0.59 && p.zeta < 0.61, `zeta ${p.zeta}`);
  // Peak of a unit step: 1 + exp(-pi zeta / sqrt(1 - zeta^2)).
  const peak = 1 + Math.exp((-Math.PI * e.zeta) / Math.sqrt(1 - e.zeta * e.zeta));
  const s = new Spring(SPRING_EXPANSION, 0);
  s.to(1);
  let max = 0;
  for (let t = 0; t < 2; t += 1 / 1000) {
    s.step(1 / 1000);
    max = Math.max(max, s.value);
  }
  near(max, peak, 2e-4, "overshoot");
});

test("the analytic step matches the closed form for any partition of time", () => {
  for (const cfg of [SPRING_EXPANSION, SPRING_PRESS]) {
    const ref: Kinematics = { x: 0, v: 0 };
    solve(cfg, -1, 0, 0.25, ref);
    for (const dt of [1 / 30, 1 / 60, 1 / 120, 1 / 240, 1 / 144]) {
      const s = new Spring({ ...cfg, restDelta: 0, restSpeed: 0 }, 0);
      s.to(1);
      const n = Math.round(0.25 / dt);
      for (let i = 0; i < n; i++) s.step(dt);
      // The partition lands at n*dt, which is within one dt of 0.25: compare against the closed form at n*dt.
      const exact: Kinematics = { x: 0, v: 0 };
      solve(cfg, -1, 0, n * dt, exact);
      near(s.value, 1 + exact.x, 1e-12, `dt ${dt}`);
      near(s.velocity, exact.v, 1e-9, `dt ${dt} v`);
    }
    near(1 + ref.x, new Spring(cfg, 0).value + 1 + ref.x, 0);
  }
});

test("the closed form agrees with the semi-implicit integrator at 0.1 ms", () => {
  for (const cfg of [SPRING_EXPANSION, SPRING_PRESS]) {
    const k: Kinematics = { x: -1, v: 0 };
    const out: Kinematics = { x: 0, v: 0 };
    for (let i = 0; i < 4000; i++) {
      stepSemiImplicit(cfg, k, 1 / 10000);
      solve(cfg, -1, 0, (i + 1) / 10000, out);
      near(k.x, out.x, 1.5e-3, `step ${i}`);
    }
  }
});

test("critical and over-damped configurations are continuous and decay without oscillation", () => {
  const cases: SpringConfig[] = [
    { stiffness: 400, damping: 2 * Math.sqrt(400), mass: 1 },
    { stiffness: 100, damping: 60, mass: 1 },
  ];
  for (const cfg of cases) {
    const s = new Spring({ ...cfg, restDelta: 0, restSpeed: 0 }, 0);
    s.to(1);
    let prev = 0;
    for (let i = 0; i < 600; i++) {
      s.step(1 / 120);
      assert.ok(s.value <= 1 + 1e-9, "no overshoot");
      assert.ok(s.value >= prev - 1e-12, "monotone");
      prev = s.value;
    }
    near(s.value, 1, 1e-2);
  }
});

test("a spring converges, rests exactly on its target, and then costs nothing", () => {
  const s = new Spring(SPRING_EXPANSION, 0);
  s.to(1);
  let frames = 0;
  while (s.step(1 / 60)) frames++;
  assert.equal(s.value, 1);
  assert.equal(s.velocity, 0);
  assert.ok(s.settled);
  assert.ok(frames > 10 && frames < 120, `settled after ${frames} frames`);
  const t = settleTime(SPRING_EXPANSION);
  assert.ok(t > 0.3 && t < 1.2, `settle ${t}s`);
  assert.equal(s.step(1 / 60), false);
});

test("a reversal keeps the velocity, so the motion is continuous", () => {
  const s = new Spring(SPRING_EXPANSION, 0);
  s.to(1);
  for (let i = 0; i < 6; i++) s.step(1 / 60);
  const v = s.velocity;
  const x = s.value;
  assert.ok(v > 0);
  s.to(0);
  assert.equal(s.velocity, v);
  assert.equal(s.value, x);
  s.step(1 / 240);
  near(s.value, x + v / 240, 0.02);
});

test("the driver steps every subscriber on one frame loop and sleeps when they are done", () => {
  let queued: ((t: number) => void) | null = null;
  let requests = 0;
  const driver = new FrameDriver({
    raf: (cb) => {
      queued = cb;
      requests++;
      return requests;
    },
    caf: () => {
      queued = null;
    },
  });
  const frames: number[] = [];
  const a = new Tween(driver, SPRING_EXPANSION, 0, (v) => frames.push(v));
  const b = new Tween(driver, SPRING_PRESS, 0, () => undefined);
  a.to(1);
  b.to(1);
  assert.equal(driver.size, 2);
  assert.equal(requests, 1, "one frame request for both springs");
  let t = 0;
  let guard = 0;
  while (queued && guard++ < 1000) {
    const cb: (time: number) => void = queued;
    queued = null;
    t += 1000 / 60;
    cb(t);
  }
  assert.equal(a.value, 1);
  assert.equal(b.value, 1);
  assert.equal(driver.running, false, "the loop sleeps once everything rests");
  assert.equal(driver.size, 0);
});

test("a long frame is clamped so a returning background tab does not fire a huge step", () => {
  let queued: ((t: number) => void) | null = null;
  const driver = new FrameDriver({ raf: (cb) => ((queued = cb), 1), caf: () => undefined });
  const seen: number[] = [];
  driver.add((dt) => {
    seen.push(dt);
    return seen.length < 3;
  });
  (queued as unknown as (t: number) => void)(0);
  (queued as unknown as (t: number) => void)(60_000);
  assert.ok((seen[1] ?? 99) <= 1 / 30 + 1e-9);
});

test("reduced motion: the tween lands on the target at once, with no frame requested", () => {
  let requests = 0;
  const driver = new FrameDriver({ raf: () => ++requests, caf: () => undefined });
  driver.reduced = true;
  const out: number[] = [];
  const tw = new Tween(driver, SPRING_EXPANSION, 0, (v) => out.push(v));
  tw.to(1);
  assert.deepEqual(out, [1]);
  assert.equal(tw.value, 1);
  assert.equal(requests, 0);
  tw.kick(50);
  assert.equal(requests, 0);
});
