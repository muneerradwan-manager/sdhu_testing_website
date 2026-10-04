"use client";

import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * The Two Holy Mosques live, as the Saudi Broadcasting Authority streams them on YouTube: the Qur'an
 * channel from Masjid al-Haram and the Sunnah channel from the Prophet's Mosque. Both owners allow
 * embedding. A source is a video id, a channel id (UC…, which follows the channel's live stream on its
 * own) or a YouTube link; the content board holds them, so a restarted stream is fixed without code.
 */

export type LiveSources = { makkah: string; madinah: string };

const MOSQUES = {
  makkah: { label: "المسجد الحرام", channel: "قناة القرآن الكريم", watch: "https://www.youtube.com/@SaudiQuranTv/live" },
  madinah: { label: "المسجد النبوي", channel: "قناة السنة النبوية", watch: "https://www.youtube.com/@SaudiSunnahTv/live" },
} as const;

type Mosque = keyof typeof MOSQUES;

/** The player's address for a source: a channel follows its live stream, anything else is a video */
export function liveEmbed(source: string) {
  const s = source.trim();
  const params = "autoplay=1&playsinline=1&rel=0";
  if (/^UC[\w-]{22}$/.test(s)) return `https://www.youtube.com/embed/live_stream?channel=${s}&${params}`;
  const id = s.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/)([\w-]{11})/)?.[1] ?? s;
  return `https://www.youtube.com/embed/${id}?${params}`;
}

const noop = () => () => {};

export function LiveHaram({ open, onClose, sources }: { open: boolean; onClose: () => void; sources: LiveSources }) {
  const [mosque, setMosque] = useState<Mosque>("makkah");
  // The card floats over every section of the page, so it lives at the end of the document
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return null;
  const m = MOSQUES[mosque];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label={`بث مباشر من ${m.label}`}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          className="fixed bottom-20 left-4 z-[60] w-[min(calc(100vw-2rem),26rem)] md:bottom-4 overflow-hidden rounded-3xl bg-ink text-white shadow-2xl ring-1 ring-white/15"
        >
          <div className="flex items-center gap-2 px-4 pb-2 pt-3">
            <span className="flex items-center gap-1.5 rounded-full bg-maroon px-2.5 py-1 text-xs font-bold">
              <span className="size-1.5 animate-pulse rounded-full bg-white" /> مباشر
            </span>
            <p className="min-w-0 flex-1 truncate font-bold">{m.label}</p>
            <button type="button" onClick={onClose} aria-label="إغلاق البث" className="grid size-8 place-items-center rounded-full bg-white/10 transition hover:bg-white/20">
              <X className="size-4" />
            </button>
          </div>
          <div role="tablist" aria-label="المسجد" className="mx-4 mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-white/10 p-1">
            {(Object.keys(MOSQUES) as Mosque[]).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={k === mosque}
                onClick={() => setMosque(k)}
                className={cn("rounded-xl py-1.5 text-sm font-bold transition", k === mosque ? "bg-gold text-ink" : "text-white/75 hover:text-white")}
              >
                {MOSQUES[k].label}
              </button>
            ))}
          </div>
          <div className="relative aspect-video bg-black">
            <iframe
              key={mosque}
              title={`بث مباشر من ${m.label}`}
              src={liveEmbed(sources[mosque])}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="absolute inset-0 size-full border-0"
            />
          </div>
          <p className="flex items-center justify-between gap-3 px-4 py-2.5 text-[11px] leading-5 text-white/60">
            <span>
              {m.channel} — هيئة الإذاعة والتلفزيون السعودية، عبر يوتيوب
            </span>
            <a href={m.watch} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 font-bold text-gold hover:underline">
              يوتيوب <ExternalLink className="size-3" />
            </a>
          </p>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
