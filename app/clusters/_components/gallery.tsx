"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CmsImage } from "@/components/cms/image";
import { useT } from "@/lib/i18n";
import { useScrollLock } from "@/lib/scroll-lock";
import { cn } from "@/lib/utils";

/**
 * A cluster's or a group's photo gallery: a grid whose first picture is the largest, each opening in a viewer that
 * takes the whole screen and steps through them (the side arrows, the strip below, or the keyboard's arrows).
 */
export function Gallery({ images, title, compact = false }: { images: string[]; title: string; compact?: boolean }) {
  const t = useT();
  const [at, setAt] = useState<number | null>(null);
  const n = images.length;
  if (!n) return null;
  const shown = compact ? images.slice(0, 6) : images;

  return (
    <>
      <ul className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4")}>
        {shown.map((src, i) => (
          <li key={`${src}-${i}`} className={cn(!compact && i === 0 && n > 2 && "col-span-2 row-span-2")}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAt(i);
              }}
              aria-label={t(`عرض الصورة ${i + 1} من ${n}`, `View picture ${i + 1} of ${n}`)}
              className="group/pic relative block aspect-[4/3] size-full overflow-hidden rounded-2xl bg-sand"
            >
              <CmsImage src={src} alt={`${title} — ${i + 1}`} fill sizes={compact ? "(min-width: 768px) 15vw, 30vw" : "(min-width: 768px) 25vw, 50vw"} quality={65} className="object-cover transition duration-700 group-hover/pic:scale-110" />
              {compact && i === shown.length - 1 && n > shown.length && (
                <span className="absolute inset-0 grid place-items-center bg-ink/55 font-display text-xl font-bold text-white">+{n - shown.length}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <Viewer images={images} title={title} at={at} setAt={setAt} />
    </>
  );
}

/** The whole screen for one picture: dark around it, the arrows on its sides, the count and the strip below */
function Viewer({ images, title, at, setAt }: { images: string[]; title: string; at: number | null; setAt: (v: number | null) => void }) {
  const t = useT();
  const n = images.length;
  const open = at !== null;
  useScrollLock(open);
  const step = (d: number) => at !== null && setAt((at + d + n) % n);
  useEffect(() => {
    if (!open) return;
    // In Arabic the pictures run right to left: the right arrow goes back
    const rtl = document.dir === "rtl" || document.documentElement.dir === "rtl";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // The viewer may sit over a group's window: it closes alone
        e.stopImmediatePropagation();
        setAt(null);
      }
      if (e.key === "ArrowLeft") step(rtl ? 1 : -1);
      if (e.key === "ArrowRight") step(rtl ? -1 : 1);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal
          aria-label={t(`صور ${title}`, `Pictures of ${title}`)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            setAt(null);
          }}
          className="fixed inset-0 z-[90] flex flex-col bg-black/95 text-white"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="min-w-0 truncate text-sm text-white/80">
              <bdi className="font-bold text-white">{title}</bdi> · {(at ?? 0) + 1} / {n}
            </p>
            <button type="button" onClick={() => setAt(null)} aria-label={t("إغلاق", "Close")} className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <X className="size-6" />
            </button>
          </div>

          <div className="relative min-h-0 flex-1" onClick={(e) => e.stopPropagation()}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={at} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 sm:inset-x-20">
                <CmsImage src={images[at ?? 0]} alt={`${title} — ${(at ?? 0) + 1}`} fill sizes="100vw" quality={85} priority className="object-contain" />
              </motion.div>
            </AnimatePresence>
            {n > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label={t("الصورة السابقة", "Previous picture")} className="absolute start-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/25 sm:start-4 sm:size-14">
                  <ChevronRight className="size-7 ltr:rotate-180" />
                </button>
                <button type="button" onClick={() => step(1)} aria-label={t("الصورة التالية", "Next picture")} className="absolute end-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/25 sm:end-4 sm:size-14">
                  <ChevronLeft className="size-7 ltr:rotate-180" />
                </button>
              </>
            )}
          </div>

          {n > 1 && (
            <div className="scrollbar-none flex shrink-0 justify-center gap-2 overflow-x-auto px-4 py-3" onClick={(e) => e.stopPropagation()}>
              {images.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setAt(i)}
                  aria-label={t(`الصورة ${i + 1}`, `Picture ${i + 1}`)}
                  aria-current={i === at ? "true" : undefined}
                  className={cn("relative h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition sm:h-16 sm:w-24", i === at ? "opacity-100 ring-gold" : "opacity-50 ring-transparent hover:opacity-90")}
                >
                  <CmsImage src={src} alt="" fill sizes="96px" quality={50} className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
