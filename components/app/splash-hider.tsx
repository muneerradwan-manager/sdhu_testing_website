"use client";

import { useEffect, useLayoutEffect } from "react";

/** Long enough for the emblem to finish drawing, short enough not to keep anyone waiting */
const MIN_VISIBLE_MS = 1300;

declare global {
  interface Window {
    /** Set once the splash has been dismissed for this page load */
    __sdhuSplashDone?: boolean;
  }
}

// useLayoutEffect warns during server rendering; this component only matters in the browser
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Fades the splash out once the page is interactive and the brand font is ready — once per page load.
 * If React re-creates the page after that (a hydration mismatch caused by a browser extension, or a
 * stale cached script), the re-created splash is hidden before it is painted, so it never flashes again.
 */
export function SplashHider() {
  useIsoLayoutEffect(() => {
    const el = document.getElementById("sdhu-splash");
    if (!el) return;
    if (window.__sdhuSplashDone) {
      el.setAttribute("data-hidden", "");
      el.style.display = "none";
      return;
    }
    let done = false;
    const hide = () => {
      if (done) return;
      done = true;
      window.__sdhuSplashDone = true;
      el.setAttribute("data-hidden", "");
      // Hidden, not removed: the element belongs to the React tree of the root layout
      setTimeout(() => (el.style.display = "none"), 700);
    };
    // Measured from the start of the page load, so a slow load does not add extra waiting on top
    const wait = Math.max(0, MIN_VISIBLE_MS - performance.now());
    const fonts = document.fonts?.ready ?? Promise.resolve();
    const timer = setTimeout(() => void fonts.then(hide), wait);
    // Never longer than this, whatever the fonts do
    const cap = setTimeout(hide, 3500);
    return () => {
      clearTimeout(timer);
      clearTimeout(cap);
    };
  }, []);
  return null;
}
