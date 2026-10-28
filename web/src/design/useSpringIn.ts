"use client";

import { useEffect, type RefObject } from "react";
import { frameDriver, SPRING_EXPANSION, Tween } from "./spring";

/**
 * Brings a popover, sheet or panel in on the expansion spring when `open` becomes true: it grows from 94 percent and
 * rises from opacity 0, anchored at its transform origin. It is the replacement for a CSS entrance keyframe.
 * Under reduced motion it simply appears. Only transform and opacity are written.
 */
export function useSpringIn(ref: RefObject<HTMLElement | null>, open: boolean): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !open) return;
    const driver = frameDriver();
    if (driver.reduced) return;
    const tw = new Tween(driver, SPRING_EXPANSION, 0, (v) => {
      const t = Math.min(1, Math.max(0, v));
      el.style.opacity = t.toFixed(3);
      el.style.transform = `scale(${(0.94 + 0.06 * v).toFixed(4)})`;
      if (tw.spring.settled) {
        el.style.removeProperty("opacity");
        el.style.removeProperty("transform");
      }
    });
    el.style.opacity = "0";
    el.style.transform = "scale(0.94)";
    tw.to(1);
    return () => {
      el.style.removeProperty("opacity");
      el.style.removeProperty("transform");
    };
  }, [ref, open]);
}
