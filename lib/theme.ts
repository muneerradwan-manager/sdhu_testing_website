"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "./theme-script";

/**
 * Light or dark, as the visitor chose it (remembered in this browser), else as the device prefers. The
 * choice is set on <html data-theme> before the first paint by the script in app/layout.tsx (lib/theme-script.ts),
 * so a page never flashes white before turning dark; this module only reads and changes it afterwards.
 */
export type Theme = "light" | "dark";


const EVENT = "sdhu-theme";

function current(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  // Another tab changed it
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    document.documentElement.dataset.theme = e.newValue === "dark" ? "dark" : "light";
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, current, () => "light");
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode: the choice lasts this page */
  }
  window.dispatchEvent(new Event(EVENT));
}
