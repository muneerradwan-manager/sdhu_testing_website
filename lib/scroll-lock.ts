"use client";

import { useEffect } from "react";

let locks = 0;

/**
 * Keeps the page behind a menu, sheet or dialog still while it is open, so a swipe scrolls what is on
 * top instead of the page underneath. Both <html> and <body> are locked (on phones the page scrolls on
 * <html>), and overlays are counted, so closing a dialog opened over a sheet does not free the page
 * while the sheet is still open. Pair it with `overscroll-contain` on the overlay's own scroll area.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (locks++ === 0) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
    return () => {
      if (--locks === 0) {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }
    };
  }, [active]);
}
