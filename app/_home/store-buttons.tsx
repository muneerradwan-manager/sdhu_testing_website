"use client";

import { motion } from "motion/react";
import { str } from "@/components/cms/bits";
import { useToast } from "@/components/ui/widgets";
import { useSection } from "@/lib/cms/store";
import { useT } from "@/lib/i18n";

/** Google Play's four-coloured triangle */
function PlayMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 shrink-0" aria-hidden>
      <path fill="#32BBFF" d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.25-.84-.76-.84-1.35Z" />
      <path fill="#FF3A44" d="m16.81 15.12-10.76 6.22 8.49-8.49 2.27 2.27Z" />
      <path fill="#FFD500" d="M20.16 10.81c.34.27.59.69.59 1.19s-.22.9-.57 1.18l-2.29 1.32-2.5-2.5 2.5-2.5 2.27 1.31Z" />
      <path fill="#00F076" d="m6.05 2.66 10.76 6.22-2.27 2.27-8.49-8.49Z" />
    </svg>
  );
}

/** The apple */
function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 shrink-0" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11Z" />
    </svg>
  );
}

/**
 * The platform's apps under the hero's buttons: Google Play and the App Store. Neither is published yet, so a tap
 * says it is coming (the hero's «التطبيق» fields in the content panel word it), and leads nowhere
 */
export function StoreButtons() {
  const t = useT();
  const toast = useToast();
  const v = useSection("home", "hero");
  const stores = [
    { key: "play", mark: <PlayMark />, small: t("احصل عليه من", "Get it on"), name: "Google Play" },
    { key: "apple", mark: <AppleMark />, small: t("حمّله من", "Download on the"), name: "App Store" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 0.6 }} className="mt-6 flex flex-wrap items-center gap-3">
      {stores.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => toast({ title: `${str(v, "appSoonTitle")}${t(" على ", " on ")}${s.name}`, body: str(v, "appSoonText"), icon: "📱" })}
          className="group flex items-center gap-2.5 rounded-2xl border border-white/25 bg-black/45 px-4 py-2 text-start text-white backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:bg-black/60"
        >
          {s.mark}
          <span className="leading-tight">
            <span className="block text-[11px] text-white/70">{s.small}</span>
            <span className="block font-sans text-lg font-semibold tracking-tight" dir="ltr">{s.name}</span>
          </span>
        </button>
      ))}
    </motion.div>
  );
}
