"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ensureLoop } from "@/engine/loop";
import { engine } from "@/engine/store";
import { invalidateLayout } from "@/engine/tracked";

let lastY = 0;

function onScroll(): void {
  const y = window.scrollY;
  engine.scrollVelocity = y - lastY;
  engine.scrollY = y;
  engine.scrollLimit = document.documentElement.scrollHeight - window.innerHeight;
  lastY = y;
}

/** Scroll the page (smoothly unless the visitor prefers reduced motion). */
export function scrollToY(y: number, immediate = false): void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: y, behavior: immediate || reduce ? "auto" : "smooth" });
}

/**
 * The browser scrolls the page; nothing replaces or smooths it. This keeps the engine's copy of the scroll position
 * current for the shared 3D stage, and re-measures everything the stage follows when the page changes.
 */
export function NativeScroll() {
  const pathname = usePathname();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    ensureLoop();
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    invalidateLayout();
    onScroll();
    const id = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      invalidateLayout();
    });
    return () => window.cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
