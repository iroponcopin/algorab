"use client";

import { useEffect } from "react";
import { installPointerField } from "@/design/field";

/** Installs the document-level caustics, press and magnetic layer (design/field.ts). Renders nothing. */
export function PointerField() {
  useEffect(() => installPointerField(), []);
  return null;
}
