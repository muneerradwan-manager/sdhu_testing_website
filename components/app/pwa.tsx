"use client";

import { AnimatePresence, motion } from "motion/react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Emblem } from "@/components/brand/logo";
import { asset } from "@/lib/utils";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "sdhu-install-dismissed";

/** Registers the service worker (production only) and offers installation on phones */
export function PwaSupport() {
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
    const t = isIos ? setTimeout(() => setIos(true), 20000) : undefined;
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      clearTimeout(t);
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
          aria-label="تثبيت التطبيق"
        >
          <div className="bg-pattern absolute inset-0 opacity-15" />
          <div className="relative flex items-start gap-4 p-4">
            <Emblem className="size-14" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold">ثبّت منصة الحج على هاتفك</p>
              {deferred ? (
                <p className="mt-1 text-sm leading-6 text-white/75">تفتح كتطبيق مستقل، وتبقى دروسك المسموعة وصفحاتك متاحة دون إنترنت.</p>
              ) : (
                <p className="mt-1 flex flex-wrap items-center gap-1 text-sm leading-6 text-white/75">
                  اضغط <Share className="inline size-4 text-gold" /> مشاركة، ثم <SquarePlus className="inline size-4 text-gold" /> «إضافة إلى الشاشة الرئيسية».
                </p>
              )}
              {deferred && (
                <button onClick={install} className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-2 font-bold text-ink">
                  <Download className="size-4" /> تثبيت
                </button>
              )}
            </div>
            <button onClick={dismiss} className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="إغلاق">
              <X className="size-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
