import assert from "node:assert/strict";
import { test } from "node:test";
import { bottomRadius, clock, COMPACT, compensatedRadius, lean, magnet, rubberBand, tether, TENSION, visibleSize, type Tether } from "./island-physics.ts";

test("the visible size runs from the notch pill to the open size", () => {
  assert.deepEqual(visibleSize(0, { w: 400, h: 168 }), { w: COMPACT.w, h: COMPACT.h });
  assert.deepEqual(visibleSize(1, { w: 400, h: 168 }), { w: 400, h: 168 });
});

test("a scaled box with a compensated radius draws a circular corner", () => {
  const sx = 190 / 400;
  const sy = 36 / 168;
  const { rx, ry } = compensatedRadius(18, sx, sy);
  assert.ok(Math.abs(rx * sx - 18) < 1e-9);
  assert.ok(Math.abs(ry * sy - 18) < 1e-9);
  assert.equal(bottomRadius(0), 18);
  assert.equal(bottomRadius(1), 34);
});

test("the rubber band is linear at first, saturates, and is monotone", () => {
  assert.ok(Math.abs(rubberBand(1) - 1) < 1e-3);
  assert.ok(rubberBand(1000) <= TENSION.maxStretch);
  let prev = 0;
  for (let d = 0; d < 400; d += 5) {
    const v = rubberBand(d);
    assert.ok(v >= prev);
    prev = v;
  }
});

test("the droplet is held below the threshold, lets go beyond it, and re-attaches with hysteresis", () => {
  const t: Tether = { x: 0, y: 0, detached: false };
  tether(60, 0, false, t);
  assert.equal(t.detached, false);
  assert.ok(t.x < 60 && t.x > 0, "held and stretched");
  tether(TENSION.detachAt + 1, 0, false, t);
  assert.equal(t.detached, true);
  assert.equal(t.x, TENSION.detachAt + 1, "free: follows the pointer");
  tether(TENSION.detachAt - 10, 0, true, t);
  assert.equal(t.detached, true, "still free between the two thresholds");
  tether(TENSION.reattachAt - 1, 0, true, t);
  assert.equal(t.detached, false, "re-attached");
});

test("velocity leans the island by a bounded amount", () => {
  assert.equal(lean(0).shift, 0);
  assert.equal(lean(100).shift, 6);
  assert.equal(lean(-100).shift, -6);
  assert.ok(lean(100).stretch <= 0.02);
});

test("the magnetic pull is at most 4 px and never lifts the island", () => {
  const m = magnet(-9999, -9999, 95, 36);
  assert.equal(m.x, -4);
  assert.equal(m.y, 0);
  const n = magnet(9999, 9999, 95, 36);
  assert.deepEqual(n, { x: 4, y: 4 });
});

test("clock formats m:ss", () => {
  assert.equal(clock(0), "0:00");
  assert.equal(clock(83.9), "1:23");
  assert.equal(clock(212), "3:32");
});
