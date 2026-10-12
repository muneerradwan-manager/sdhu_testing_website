"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { ARABIC_ONLY, LANG_KEY } from "./lang-script";

/**
 * Arabic or English for the public site (the portals stay Arabic for now). The choice is kept in this browser
 * and set on <html lang dir data-lang> before the first paint (lib/lang-script.ts); this module reads it and
 * changes it. Text in a page: `const t = useT(); t("عربي", "English")`. The site's content (lib/cms) reads its
 * English from lib/cms/en/* by itself, so `useSection`, `useArticles`… return the visitor's language.
 */
export type Lang = "ar" | "en";

const EVENT = "sdhu-lang";
const portal = new RegExp(ARABIC_ONLY);

/** The language the page is shown in now */
export function langNow(): Lang {
  return typeof document !== "undefined" && document.documentElement.dataset.lang === "en" ? "en" : "ar";
}

function chosen(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

function apply(lang: Lang) {
  const d = document.documentElement;
  if (d.dataset.lang === lang && d.lang === lang) return;
  d.lang = lang;
  d.dir = lang === "en" ? "ltr" : "rtl";
  d.dataset.lang = lang;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  // Another tab chose the other language
  const onStorage = (e: StorageEvent) => {
    if (e.key !== LANG_KEY) return;
    if (!portal.test(location.pathname)) apply(e.newValue === "en" ? "en" : "ar");
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The language of the page (Arabic on the server and while hydrating, as the static HTML is) */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, langNow, () => "ar");
}

/** The visitor's own choice, whatever the page he is on */
export function useChosenLang(): Lang {
  return useSyncExternalStore(subscribe, chosen, () => "ar");
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* private mode: the choice lasts this page */
  }
  if (!portal.test(location.pathname)) apply(lang);
  else window.dispatchEvent(new Event(EVENT));
}

/** `t("عربي", "English")`: the text in the page's language */
export function useT() {
  const lang = useLang();
  return useCallback((ar: string, en: string) => (lang === "en" ? en : ar), [lang]);
}

/** Whether a path is one of the Arabic-only portals */
export const isArabicOnly = (path: string) => portal.test(path);

/**
 * Keeps <html> in the visitor's language as he moves between pages: the portals in Arabic, the public site in
 * his choice. And shows the page once it is drawn in English (the body waits hidden until then).
 */
export function LangSync() {
  const path = usePathname();
  useEffect(() => {
    apply(portal.test(path) ? "ar" : chosen());
  }, [path]);
  useEffect(() => {
    delete document.documentElement.dataset.langPending;
  }, []);
  return null;
}
