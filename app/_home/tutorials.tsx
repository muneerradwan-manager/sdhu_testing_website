"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Clapperboard, Play } from "lucide-react";
import { useState } from "react";
import { list, str } from "@/components/cms/bits";
import { CmsImage } from "@/components/cms/image";
import { Reveal, SectionHeading } from "@/components/ui/motion";
import { useMediaUrl } from "@/lib/cms/media";
import { useSection } from "@/lib/cms/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Tab = { label: string; title: string; duration: string; text: string; points: string; poster: string; video: string };

/**
 * How to use the platform, one video per user in its own tab: the visitor who then becomes a pilgrim, and the
 * administrator. Until a tab's video is uploaded from the content board, its picture shows with «قريباً».
 */
export function Tutorials() {
  const v = useSection("home", "tutorials");
  const tabs = list<Tab>(v, "tabs").filter((x) => x.label);
  const [i, setI] = useState(0);
  const tab = tabs[Math.min(i, tabs.length - 1)];
  if (!tab) return null;

  return (
    <section id="tutorials" className="relative scroll-mt-28 overflow-hidden py-24">
      <div className="bg-pattern-dark absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4 md:px-8">
        <SectionHeading eyebrow={str(v, "eyebrow")} title={str(v, "title")} description={str(v, "description")} />
        <Reveal>
          {tabs.length > 1 && (
            <div role="tablist" aria-label={str(v, "title")} className="mx-auto mb-8 flex w-fit max-w-full gap-1.5 overflow-x-auto rounded-2xl bg-sand p-1.5">
              {tabs.map((x, k) => (
                <button
                  key={`${x.label}-${k}`}
                  type="button"
                  role="tab"
                  id={`tutorial-tab-${k}`}
                  aria-selected={k === i}
                  aria-controls="tutorial-panel"
                  onClick={() => setI(k)}
                  className={cn("whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-bold transition md:px-7 md:text-base", k === i ? "bg-green-dark text-white shadow" : "text-ink-soft hover:bg-white hover:text-ink")}
                >
                  {x.label}
                </button>
              ))}
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              id="tutorial-panel"
              role="tabpanel"
              aria-labelledby={`tutorial-tab-${i}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid items-center gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-10"
            >
              <Player tab={tab} />
              <div>
                <h3 className="font-display text-2xl font-bold text-green-dark md:text-3xl">{tab.title}</h3>
                {tab.text && <p className="mt-3 leading-8 text-ink-soft">{tab.text}</p>}
                {tab.points && (
                  <ul className="mt-5 space-y-2">
                    {tab.points
                      .split("\n")
                      .map((p) => p.trim())
                      .filter(Boolean)
                      .map((p) => (
                        <li key={p} className="flex items-start gap-3 font-semibold text-ink">
                          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-gold/30 text-green-dark">
                            <Check className="size-3.5" />
                          </span>
                          {p}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  );
}

/** The tab's video, played in place; its picture with «قريباً» while none is uploaded */
function Player({ tab }: { tab: Tab }) {
  const t = useT();
  const video = useMediaUrl(tab.video);
  const poster = useMediaUrl(tab.poster);
  const [playing, setPlaying] = useState(false);

  if (playing && video) {
    return <video src={video} poster={poster} controls autoPlay playsInline className="aspect-video w-full rounded-[2rem] bg-black shadow-2xl" />;
  }
  return (
    <button
      type="button"
      disabled={!video}
      onClick={() => setPlaying(true)}
      aria-label={video ? t(`تشغيل الفيديو: ${tab.title}`, `Play the video: ${tab.title}`) : undefined}
      className="group relative block aspect-video w-full overflow-hidden rounded-[2rem] text-start shadow-2xl disabled:cursor-default"
    >
      <CmsImage src={tab.poster} alt={tab.title} fill sizes="(min-width: 1024px) 60vw, 100vw" quality={70} className="object-cover transition duration-[1.2s] group-enabled:group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
      <span
        className={cn(
          "absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-white backdrop-blur-md transition duration-500",
          video ? "bg-white/20 group-hover:scale-110 group-hover:bg-gold group-hover:text-ink" : "bg-white/15",
        )}
      >
        {video && <span className="absolute inset-0 animate-ping rounded-full bg-white/20" />}
        {video ? <Play className="size-8 translate-x-[-2px] fill-current" /> : <Clapperboard className="size-8" />}
      </span>
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 p-5 text-white md:p-6">
        {video ? (
          tab.duration && <span className="rounded-full bg-maroon px-2.5 py-1 text-xs font-bold">{tab.duration}</span>
        ) : (
          <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-ink">{t("قريباً — الفيديو قيد الإعداد", "Coming soon — the video is being prepared")}</span>
        )}
        <span className="font-display text-lg font-bold md:text-xl">{tab.label}</span>
      </div>
    </button>
  );
}
