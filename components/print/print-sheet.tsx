"use client";

import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useHydrated } from "@/lib/store";

/**
 * A sheet that is all a printer gets while it is on the page. The screen never shows it; on paper — from a
 * «طباعة» button or the browser's own print — the page around it (the portal's frame, menus, buttons) gives
 * way to it, on A4 with its own margins and page numbers, at its real size whatever the screen's zoom.
 * It sits directly in <body>, so globals.css can hide everything beside it (see «Printed sheets»).
 */
export function PrintSheet({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return createPortal(
    <div className="print-sheet" dir="rtl" lang="ar">
      {children}
    </div>,
    document.body,
  );
}
