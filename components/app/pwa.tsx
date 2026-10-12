"use client";

import { AnimatePresence, motion } from "motion/react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Emblem } from "@/components/brand/logo";
import { useT } from "@/lib/i18n";
import { asset } from "@/lib/utils";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "sdhu-install-dismissed";

/** Registers the service worker (production only) and offers installation on phones */
export function PwaSupport() {
  const t = useT();
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register(asset("/sw.js"), { scope: asset("/"), updateViaCache: "none" }).catch(() => {});
    } else if ("serviceWorker" in navigator) {
      // Development: a worker left behind by a production run on the same address would serve stale
      // cached scripts (and make the page rebuild itself on load) — remove it and its caches
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
      caches?.keys().then((keys) => keys.filter((k) => k.startsWith("sdhu-")).forEach((k) => caches.delete(k))).catch(() => {});
    }

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* storage blocked */
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    // Phones only, and never on the staff desk — desktops get the browser's own install button
    const phone = window.matchMedia("(max-width: 767px) and (pointer: coarse)").matches;
    if (dismissed || standalone || !phone || location.pathname.startsWith(asset("/staff"))) return;

    let promptTimer: ReturnType<typeof setTimeout> | undefined;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      promptTimer = setTimeout(() => setDeferred(e as InstallEvent), 20000);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !("MSStream" in window);
    const iosTimer = isIos ? setTimeout(() => setIos(true), 20000) : undefined;
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      clearTimeout(iosTimer);
      clearTimeout(promptTimer);
    };
  }, []);

  const dismiss = () => {
    setDeferred(null);
    setIos(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  const open = !!deferred || ios;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-md overflow-hidden rounded-3xl bg-green-dark text-white shadow-2xl ring-1 ring-gold/30 md:bottom-6"
          role="dialog"
          aria-label={t("تثبيت التطبيق", "Install the app")}
        >
          <div className="bg-pattern absolute inset-0 opacity-15" />
          <div className="relative flex items-start gap-4 p-4">
            <Emblem className="size-14" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold">{t("ثبّت منصة الحج على هاتفك", "Install the Hajj platform on your phone")}</p>
              {deferred ? (
                <p className="mt-1 text-sm leading-6 text-white/75">
                  {t("تفتح كتطبيق مستقل، وتبقى دروسك المسموعة وصفحاتك متاحة دون إنترنت.", "It opens as an app of its own, and your audio lessons and pages stay available offline.")}
                </p>
              ) : (
                <p className="mt-1 flex flex-wrap items-center gap-1 text-sm leading-6 text-white/75">
                  {t("اضغط", "Tap")} <Share className="inline size-4 text-gold" /> {t("مشاركة، ثم", "Share, then")} <SquarePlus className="inline size-4 text-gold" />{" "}
                  {t("«إضافة إلى الشاشة الرئيسية».", "“Add to Home Screen”.")}
                </p>
              )}
              {deferred && (
                <button onClick={install} className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-2 font-bold text-ink">
                  <Download className="size-4" /> {t("تثبيت", "Install")}
                </button>
              )}
            </div>
            <button onClick={dismiss} className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label={t("إغلاق", "Close")}>
              <X className="size-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
