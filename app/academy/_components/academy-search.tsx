"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, Clapperboard, Headphones, PlayCircle, Search, SearchX, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useAllLessons, useTracks } from "@/lib/cms/content";
import { CLIPS, formatClock, normalizeArabic, searchAcademy, snippetFor, wordMatches, type Clip } from "@/lib/data/academy";
import { cn } from "@/lib/utils";
import { useAcademyText } from "./i18n";

const SUGGESTIONS = ["تغطية الرأس للمرأة في الإحرام", "رمي الجمرات عن كبار السن", "طواف الوداع", "ضربة الشمس", "الروضة الشريفة"];
const SUGGESTIONS_EN = ["Women's head covering in Ihram", "Stoning the Jamarat for the elderly", "Farewell Tawaf", "Heatstroke", "The Rawdah"];

/** Small English words left out of a search, as the Arabic search leaves out «في» and «من» */
const STOP_WORDS_EN = new Set(
  "a an the in on of for to at by and or is are be do does did how what when where which who whom can could should may i my me we our you your it its with from about into if not no".split(" "),
);

/** English search: the query without its small words, so every remaining word must be found */
const englishQuery = (query: string) =>
  query
    .split(/[^\p{L}\p{N}']+/u)
    .filter((w) => w && !STOP_WORDS_EN.has(w.toLowerCase()))
    .join(" ");

/** The clips' English titles and tags searched like the lessons: every token starts a word */
function englishClips(tokens: string[], clip: (c: Clip) => Clip) {
  if (!tokens.length) return [];
  return CLIPS.map(clip).filter((c) => {
    const words = normalizeArabic([c.title, ...c.tags].join(" ")).split(/[^\p{L}\p{N}]+/u);
    return tokens.every((t) => words.some((w) => w.startsWith(t)));
  });
}

/** Wraps every word that matches a search token in a gold <mark> */
function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length) return <>{text}</>;
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) =>
        part.trim() && tokens.some((t) => wordMatches(part, t)) ? (
          <mark key={i} className="rounded-md bg-gold/55 px-0.5 text-ink [box-decoration-break:clone]">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export function AcademySearch() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query);
      setShowAll(false);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const x = useAcademyText();
  const { t, en } = x;
  const tracks = useTracks();
  const allLessons = useAllLessons();
  const getTrack = (slug: string) => tracks.find((tr) => tr.slug === slug);
  const result = useMemo(() => {
    if (!en) return searchAcademy(debounced, allLessons);
    // The lessons come in English from the CMS; the clips are matched on their English titles
    const r = searchAcademy(englishQuery(debounced), allLessons);
    return { ...r, clips: englishClips(r.tokens, x.clip) };
  }, [debounced, allLessons, en, x]);
  const pending = query.trim() !== debounced.trim();
  const active = debounced.trim().length > 0;
  const count = [result.lessons.length && x.lessons(result.lessons.length), result.clips.length && x.clips(result.clips.length)]
    .filter(Boolean)
    .join(en ? " and " : " و");
  const suggestions = en ? SUGGESTIONS_EN : SUGGESTIONS;
  const lessons = showAll ? result.lessons : result.lessons.slice(0, 6);

  return (
    <div>
      <div className="relative">
        <label htmlFor="academy-search" className="sr-only">
          {t("ابحث في دروس الأكاديمية", "Search the academy's lessons")}
        </label>
        <Search className="pointer-events-none absolute start-5 top-1/2 size-6 -translate-y-1/2 text-gold-dark" />
        <input
          id="academy-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("ابحث عن مسألة… مثل: تغطية الرأس للمرأة في الإحرام", "Search for a question… e.g. women's head covering in Ihram")}
          autoComplete="off"
          className="h-16 w-full rounded-3xl border-2 border-gold/40 bg-white pe-14 ps-14 text-lg shadow-[0_20px_50px_-30px_rgba(2,21,38,.35)] outline-none transition placeholder:text-hint focus:border-green-light focus:ring-8 focus:ring-green-light/10 [&::-webkit-search-cancel-button]:hidden"
        />
        <span className="absolute end-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
          {pending && <span className="size-5 animate-spin rounded-full border-2 border-gold/40 border-t-green-dark" aria-label={t("جارٍ البحث", "Searching")} />}
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label={t("مسح البحث", "Clear search")} className="grid size-8 place-items-center rounded-full bg-sand text-ink-soft hover:bg-gold-light">
              <X className="size-4" />
            </button>
          )}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-hint">{t("جرّب:", "Try:")}</span>
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setQuery(s)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5",
              query === s ? "border-green-dark bg-green-dark text-white" : "border-gold/40 bg-white text-ink-soft hover:border-gold-dark hover:text-green-dark",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={debounced}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
            aria-live="polite"
          >
            {count ? (
              <>
                <p className="mb-4 text-sm text-ink-soft">
                  {t("نتائج", "Results for")} «<strong className="text-green-dark">{debounced.trim()}</strong>»: <strong className="text-maroon">{count}</strong>
                </p>

                {result.clips.length > 0 && (
                  <div className="scrollbar-none -mx-4 mb-5 flex gap-3 overflow-x-auto px-4 pb-1">
                    {result.clips.map((c, i) => {
                      const track = getTrack(c.track);
                      const lesson = track?.levels.flatMap((l) => l.lessons).find((l) => l.slug === c.lesson);
                      return (
                        <motion.div key={c.slug} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}>
                          <Link
                            href={`/academy/${c.track}/${c.lesson}`}
                            className="group flex w-64 shrink-0 items-center gap-3 rounded-2xl bg-maroon p-3 text-white shadow-lg transition hover:-translate-y-1 hover:bg-maroon-dark"
                          >
                            <span className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-white/15">
                              <Clapperboard className="size-5 text-gold" />
                              <span className="absolute -bottom-1.5 rounded-md bg-ink px-1 text-[10px] font-bold tabular-nums" dir="ltr">
                                {formatClock(c.seconds)}
                              </span>
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[10px] font-semibold text-gold">
                                {t("مقطع قصير", "Short clip")}
                                {lesson ? t(` • من «${lesson.title}»`, ` • from «${lesson.title}»`) : ""}
                              </span>
                              <span className="line-clamp-2 text-sm font-bold leading-6">
                                <Highlight text={c.title} tokens={result.tokens} />
                              </span>
                            </span>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                <ul className="grid gap-3 md:grid-cols-2">
                  {lessons.map((r, i) => (
                    <motion.li key={`${r.track.slug}/${r.lesson.slug}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                      <Link
                        href={`/academy/${r.track.slug}/${r.lesson.slug}`}
                        className="group flex h-full gap-4 rounded-3xl border border-gold/35 bg-white p-4 transition hover:-translate-y-0.5 hover:border-gold-dark/50 hover:shadow-[0_20px_40px_-24px_rgba(2,21,38,.35)]"
                      >
                        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-green-dark text-gold transition group-hover:rotate-6">
                          {r.lesson.media === "audio" ? <Headphones className="size-5" /> : <PlayCircle className="size-5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-hint">
                            <span className="text-maroon">{r.track.title}</span>•<span>{x.minutes(r.lesson.minutes)}</span>•<span>{x.lecturer(r.lesson.lecturer).name}</span>
                          </span>
                          <span className="mt-1 block font-display text-lg font-bold text-green-dark">
                            <Highlight text={r.lesson.title} tokens={result.tokens} />
                          </span>
                          <span className="mt-1 line-clamp-2 text-sm leading-7 text-ink-soft">
                            <Highlight text={snippetFor(r.lesson, result.tokens)} tokens={result.tokens} />
                          </span>
                        </span>
                        <ChevronLeft className="size-5 shrink-0 self-center text-gold-dark transition group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
                      </Link>
                    </motion.li>
                  ))}
                </ul>
                {result.lessons.length > 6 && (
                  <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-4 text-sm font-bold text-green-dark underline-offset-4 hover:underline">
                    {showAll ? t("عرض أقل", "Show fewer") : t(`عرض كل النتائج (${result.lessons.length})`, `Show all results (${result.lessons.length})`)}
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center rounded-3xl border border-dashed border-gold/50 bg-white/60 p-8 text-center">
                <SearchX className="size-10 text-gold-dark" />
                <p className="mt-3 font-bold text-green-dark">{t("لا توجد دروس تطابق", "No lessons match")} «{debounced.trim()}»</p>
                <p className="mt-1 text-sm text-ink-soft">{t("جرّب كلمات أقل أو أبسط، أو اختر أحد الاقتراحات أعلاه.", "Try fewer or simpler words, or pick one of the suggestions above.")}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
