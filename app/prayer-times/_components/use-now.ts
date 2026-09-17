"use client";

import { useSyncExternalStore } from "react";

/** One shared 1-second ticker for every live clock on the page. Server snapshot is 0. */
let now = typeof window === "undefined" ? 0 : Date.now();
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function tick() {
  now = Date.now();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    setTimeout(tick, 0);
    // Align ticks with the wall-clock second so countdowns flip together
    timer = setInterval(tick, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

export function useNow() {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => 0,
  );
}
