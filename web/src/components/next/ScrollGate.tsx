"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { isHomePath } from "@/lib/site";

const SmoothScroll = dynamic(() => import("../SmoothScroll").then((m) => m.SmoothScroll), { ssr: false });

/**
 * Smooth scrolling (Lenis, synced with GSAP) is a service of the pages that draw to the shared 3D stage. The home page
 * scrolls natively, so it never loads that code.
 */
export function ScrollGate() {
  const pathname = usePathname() ?? "/";
  return isHomePath(pathname) ? null : <SmoothScroll />;
}
