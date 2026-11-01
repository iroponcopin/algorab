"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { isHomePath } from "@/lib/site";

const NativeScroll = dynamic(() => import("../NativeScroll").then((m) => m.NativeScroll), { ssr: false });

/** The scroll service of the pages that draw to the shared 3D stage. The home page has no stage, so it never loads that code. */
export function ScrollGate() {
  const pathname = usePathname() ?? "/";
  return isHomePath(pathname) ? null : <NativeScroll />;
}
