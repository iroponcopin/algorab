"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { frameDriver, SPRING_EXPANSION, Tween } from "@/design/spring";

/**
 * One IntersectionObserver for the page. Every `.ac-reveal` enters on the expansion spring as a three-property
 * harmonic reveal: the baseline lifts (18 px to 0), the focus pulls (10 px of blur to 0) and the luminance rises
 * (opacity 0 to 1), each element delayed by its --ac-i step. Under reduced motion it simply appears. The motion is
 * written inline from the solver; CSS holds only the resting (hidden) state.
 */
export function Reveal() {
  const pathname = usePathname();
  useEffect(() => {
    const driver = frameDriver();
    const els = Array.from(document.querySelectorAll<HTMLElement>(".ac-reveal:not([data-in='true'])"));
    const show = (el: HTMLElement): void => {
      el.style.removeProperty("opacity");
      el.style.removeProperty("transform");
      el.style.removeProperty("filter");
      el.dataset.in = "true";
    };
    if (!("IntersectionObserver" in window) || driver.reduced) {
      for (const el of els) show(el);
      return;
    }
    const timers: number[] = [];
    const play = (el: HTMLElement): void => {
      const delay = Number.parseFloat(getComputedStyle(el).getPropertyValue("--ac-i") || "0") * 70;
      const start = (): void => {
        const tw = new Tween(driver, SPRING_EXPANSION, 0, (v) => {
          const t = Math.min(1, Math.max(0, v));
          el.style.opacity = t.toFixed(3);
          el.style.transform = `translate3d(0, ${((1 - v) * 18).toFixed(2)}px, 0)`;
          el.style.filter = t > 0.995 ? "none" : `blur(${((1 - t) * 10).toFixed(2)}px)`;
          if (tw.spring.settled) show(el);
        });
        tw.to(1);
      };
      if (delay > 0) timers.push(window.setTimeout(start, delay));
      else start();
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            play(e.target as HTMLElement);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.1 },
    );
    for (const el of els) io.observe(el);
    return () => {
      io.disconnect();
      for (const t of timers) window.clearTimeout(t);
    };
  }, [pathname]);
  return null;
}
