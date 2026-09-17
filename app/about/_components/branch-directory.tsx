"use client";

import { AnimatePresence, motion } from "motion/react";
import { Building2, Clock3, MapPin, Navigation2, Phone, Star } from "lucide-react";
import { useState } from "react";
import { BRANCHES } from "@/lib/data/about";
import { MapEmbed } from "@/components/ui/widgets";
import { cn } from "@/lib/utils";

export function BranchDirectory() {
  const [slug, setSlug] = useState(BRANCHES[0].slug);
  const branch = BRANCHES.find((b) => b.slug === slug) ?? BRANCHES[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <div role="listbox" aria-label="الفروع" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {BRANCHES.map((b) => {
          const active = b.slug === slug;
          return (
            <button
              key={b.slug}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => setSlug(b.slug)}
              className={cn(
                "group relative flex shrink-0 items-center gap-3 rounded-2xl p-3 text-start transition-colors lg:w-full",
                active ? "text-white" : "bg-white text-ink ring-1 ring-gold/30 hover:ring-gold/70",
              )}
            >
              {active && (
                <motion.span
                  layoutId="branch-active"
                  className="absolute inset-0 rounded-2xl bg-green-dark shadow-[0_14px_30px_-14px_rgba(0,89,79,.9)]"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span
                className={cn(
                  "relative grid size-10 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-110",
                  active ? "bg-gold text-green-dark" : "bg-green-dark/[.06] text-green-dark",
                )}
              >
                {b.head ? <Star className="size-4" /> : <MapPin className="size-4" />}
              </span>
              <span className="relative min-w-0">
                <span className="block whitespace-nowrap font-bold">{b.city}</span>
                <span className={cn("block whitespace-nowrap text-xs", active ? "text-white/70" : "text-hint")}>{b.head ? "الإدارة العامة" : "فرع المحافظة"}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_18rem]">
        <MapEmbed key={branch.slug} lat={branch.lat} lng={branch.lng} label={branch.name} zoom={0.01} className="h-80 lg:h-full lg:min-h-[26rem]" />
        <AnimatePresence mode="wait">
          <motion.div
            key={branch.slug}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col overflow-hidden rounded-3xl bg-white p-5 ring-1 ring-gold/35"
          >
            <div className="bg-pattern-dark absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
            <p className="relative flex items-center gap-2 font-display text-xl font-bold text-green-dark">
              <Building2 className="size-5 text-gold-dark" />
              {branch.name}
            </p>
            <dl className="relative mt-5 space-y-4 text-sm">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-maroon" />
                <div>
                  <dt className="text-xs text-hint">العنوان</dt>
                  <dd className="leading-7 text-ink">{branch.address}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-maroon" />
                <div>
                  <dt className="text-xs text-hint">أوقات الدوام</dt>
                  <dd className="text-ink">{branch.hours}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-maroon" />
                <div>
                  <dt className="text-xs text-hint">الهاتف</dt>
                  <dd dir="ltr" className="text-end font-semibold tabular-nums text-ink">
                    {branch.phone}
                  </dd>
                </div>
              </div>
            </dl>
            <div className="relative mt-auto flex flex-col gap-2 pt-6">
              <a
                href={`tel:${branch.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-dark px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green"
              >
                <Phone className="size-4" /> اتصل بالفرع
              </a>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${branch.lat},${branch.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-green-dark/15 px-4 py-2 text-sm font-bold text-green-dark transition hover:border-green-dark"
              >
                <Navigation2 className="size-4" /> احصل على الاتجاهات
              </a>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
