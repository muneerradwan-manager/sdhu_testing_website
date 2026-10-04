"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Box, CalendarDays, ExternalLink, Hand, Maximize, MousePointer2, Wifi } from "lucide-react";
import { useState } from "react";
import { MODELS_3D, embedUrl } from "@/lib/data/tour-3d";
import { cn } from "@/lib/utils";

/**
 * Pick a place, then ask for its model: one player at a time, and none until the visitor presses the
 * button — the two mosques run to millions of faces, too much to load on a phone uninvited.
 */
export function Tour3D() {
  const [sel, setSel] = useState(0);
  const [loaded, setLoaded] = useState<string | null>(null);
  const m = MODELS_3D[sel];
  const on = loaded === m.uid;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
      <div role="tablist" aria-label="المجسمات" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {MODELS_3D.map((x, i) => (
          <button
            key={x.uid}
            type="button"
            role="tab"
            aria-selected={i === sel}
            onClick={() => setSel(i)}
            className={cn(
              "group relative h-36 overflow-hidden rounded-3xl text-right shadow-sm ring-2 transition md:h-44",
              i === sel ? "ring-green-dark shadow-xl" : "ring-transparent hover:ring-gold",
            )}
          >
            <Image src={x.image} alt="" fill sizes="(min-width: 1024px) 33vw, 50vw" quality={70} style={{ objectPosition: x.focus }} className="object-cover transition duration-500 group-hover:scale-105" />
            <span className={cn("absolute inset-0 bg-gradient-to-t transition", i === sel ? "from-green-dark via-green-dark/60 to-transparent" : "from-ink/85 via-ink/40 to-transparent")} />
            <span className="absolute inset-x-0 bottom-0 p-4 text-white">
              <span className="block font-display text-lg font-bold md:text-xl">{x.title}</span>
              <span className="block text-xs text-white/75">{x.place}</span>
            </span>
            <span className={cn("absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold", x.heavy ? "bg-gold text-ink" : "bg-white/90 text-green-dark")}>
              {x.heavy ? "مجسم كبير" : "مجسم خفيف"}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div role="tabpanel" aria-label={m.title} className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-ink shadow-[0_30px_80px_-40px_rgba(2,21,38,.6)] md:aspect-video">
          {on ? (
            <iframe
              key={m.uid}
              title={`مجسم ${m.title} ثلاثي الأبعاد`}
              src={embedUrl(m.uid)}
              allow="autoplay; fullscreen; xr-spatial-tracking"
              allowFullScreen
              className="absolute inset-0 size-full border-0"
            />
          ) : (
            <>
              <Image key={m.image} src={m.image} alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" quality={70} style={{ objectPosition: m.focus }} className="object-cover opacity-45" />
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
                <div>
                  <p className="font-display text-3xl font-bold md:text-4xl">{m.title}</p>
                  <p className="mt-1 text-white/75">{m.place}</p>
                  <button
                    type="button"
                    onClick={() => setLoaded(m.uid)}
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gold px-6 py-3.5 font-bold text-ink shadow-lg transition hover:bg-gold-light active:scale-95"
                  >
                    <Box className="size-5" /> عرض المجسم ثلاثي الأبعاد
                  </button>
                  <p className={cn("mx-auto mt-3 flex max-w-sm items-center justify-center gap-1.5 text-sm", m.heavy ? "text-gold" : "text-white/75")}>
                    {m.heavy && <Wifi className="size-4 shrink-0" />}
                    {m.heavy ? `مجسم كبير (${m.size}): يُفضَّل الاتصال بشبكة Wi-Fi` : `مجسم خفيف (${m.size}) يعمل جيداً على الهاتف`}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.aside key={m.uid} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="rounded-3xl border border-gold/40 bg-white p-5">
              <h2 className="font-display text-2xl font-bold text-green-dark">{m.title}</h2>
              <p className="text-sm text-hint">{m.place}</p>
              <p className="mt-3 flex items-start gap-2 rounded-2xl bg-sand p-3 text-sm leading-6">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-gold-dark" />
                <span>
                  <b className="text-green-dark">متى تأتيه: </b>
                  {m.when}
                </span>
              </p>
              <p className="mt-3 leading-7 text-ink-soft">{m.about}</p>
              <p className="mt-4 text-sm font-bold text-green-dark">أبرز ما في المكان</p>
              <ul className="mt-2 space-y-1.5">
                {m.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2 text-sm">
                    <span className="size-1.5 shrink-0 rotate-45 bg-gold-dark" /> {pt}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-green-dark/6 p-5 text-sm leading-7 text-green-dark">
              <p className="font-bold">كيف تتحكم بالمجسم</p>
              <ul className="mt-2 space-y-1.5">
                <li className="flex items-start gap-2"><Hand className="mt-1 size-4 shrink-0" /> على الهاتف: اسحب بإصبع لتدوير المجسم، وباعد بين إصبعين للتقريب.</li>
                <li className="flex items-start gap-2"><MousePointer2 className="mt-1 size-4 shrink-0" /> على الحاسوب: اسحب بالفأرة للتدوير، والعجلة للتقريب، والنقر المزدوج للتركيز على موضع.</li>
                <li className="flex items-start gap-2"><Maximize className="mt-1 size-4 shrink-0" /> زر ملء الشاشة في زاوية المجسم.</li>
              </ul>
            </div>
            <p className="text-xs leading-6 text-hint">
              المجسم من إعداد <b className="font-semibold text-ink-soft">{m.author}</b> على Sketchfab، وحقوقه لصاحبه.{m.photoCredit && ` ${m.photoCredit}.`}{" "}
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-green-dark underline underline-offset-4">
                صفحة المجسم <ExternalLink className="size-3" />
              </a>
            </p>
          </motion.aside>
        </AnimatePresence>
      </div>

      <p className="mt-8 rounded-2xl bg-gold/20 p-4 text-sm leading-7 text-ink">
        المجسمات للتعرّف على المكان قبل أن تصل إليه، وليست مخططات رسمية؛ قد تختلف بعض تفاصيلها عن الواقع اليوم. وفي المشاعر اتبع دائماً إرشادات مجموعتك ومواعيدها.
      </p>
    </section>
  );
}
