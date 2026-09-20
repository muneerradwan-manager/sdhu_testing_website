"use client";

import { CmsImage } from "@/components/cms/image";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowUpLeft, Pin, Search, SearchX, X } from "lucide-react";
import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { useArticles } from "@/lib/cms/content";
import { CATEGORIES, type Category } from "@/lib/data/news";
import { cn } from "@/lib/utils";
import { ArticleMeta, CategoryBadge, NewsCard } from "./news-card";

const ALL = "الكل";
type Filter = Category | typeof ALL;

/** 1:1 character normalisation so match indexes line up with the original title */
const norm1 = (s: string) => s.replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();
const stripMarks = (s: string) => s.replace(/[ً-ْـ]/g, "");

function highlight(text: string, q: string): ReactNode {
  if (!q) return text;
  const i = norm1(text).indexOf(q);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-gold/60 px-0.5 text-ink">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function NewsExplorer() {
  const articles = useArticles();
  const [filter, setFilter] = useState<Filter>(ALL);
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const q = norm1(stripMarks(deferred.trim()));

  const featured = articles.find((a) => a.pinned) ?? articles[0];
  const browsing = filter === ALL && !q;

  const counts = useMemo(() => {
    const c: Record<string, number> = { [ALL]: articles.length };
    for (const a of articles) c[a.category] = (c[a.category] ?? 0) + 1;
    return c;
  }, [articles]);

  const results = useMemo(
    () =>
      articles.filter((a) => {
        if (filter !== ALL && a.category !== filter) return false;
        if (!q) return true;
        return norm1(stripMarks([a.title, a.excerpt, a.tags.join(" "), a.category].join(" "))).includes(q);
      }),
    [articles, filter, q],
  );

  const grid = browsing ? results.filter((a) => a.slug !== featured.slug) : results;

  return (
    <div className="min-w-0">
      {/* Controls */}
      <div className="flex flex-col gap-4 rounded-3xl border border-gold/30 bg-white p-3 shadow-[0_16px_50px_-40px_rgba(2,21,38,.5)] md:flex-row md:items-center md:p-4">
        <label className="relative flex-1 md:max-w-xs">
          <span className="sr-only">ابحث في الأخبار</span>
          <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-hint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث: القرعة، الأعمار، الجواز..."
            className="h-11 w-full rounded-2xl border border-gold/35 bg-sand/60 pl-10 pr-11 text-sm outline-none transition placeholder:text-hint focus:border-green-light focus:bg-white focus:ring-4 focus:ring-green-light/15 [&::-webkit-search-cancel-button]:hidden"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                onClick={() => setQuery("")}
                className="absolute left-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-ink/10 text-ink-soft hover:bg-ink/20"
                aria-label="مسح البحث"
              >
                <X className="size-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </label>

        <LayoutGroup id="news-filter">
          <div role="tablist" aria-label="تصنيف الأخبار" className="scrollbar-none -mx-3 flex gap-1.5 overflow-x-auto px-3 md:mx-0 md:flex-wrap md:px-0">
            {[ALL, ...CATEGORIES].map((c) => {
              const active = filter === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(c as Filter)}
                  className={cn(
                    "relative shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    active ? "text-white" : "text-ink-soft hover:text-green-dark",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="news-chip"
                      className="absolute inset-0 rounded-full bg-green-dark shadow-[0_8px_20px_-8px_rgba(0,89,79,.8)]"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    {c}
                    <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", active ? "bg-gold text-ink" : "bg-ink/5")}>{counts[c] ?? 0}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      {/* Featured */}
      <AnimatePresence initial={false}>
        {browsing && (
          <motion.div
            key="featured"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <Link
              href={`/news/${featured.slug}`}
              className="group relative mt-6 flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-[0_30px_80px_-40px_rgba(2,21,38,.9)] ring-1 ring-gold/30 md:min-h-[30rem] md:p-10"
            >
              <CmsImage
                src={featured.image}
                alt=""
                fill
                priority
                quality={85}
                sizes="(min-width: 1024px) 800px, 100vw"
                className="object-cover opacity-70 transition-transform duration-[2s] ease-out-expo group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
              <div className="bg-pattern absolute inset-0 opacity-10 [mask-image:linear-gradient(to_top,black,transparent_60%)]" />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-maroon px-3 py-1 text-xs font-bold">
                    <Pin className="size-3.5" /> خبر مثبّت
                  </span>
                  <CategoryBadge article={featured} className="bg-white/90" />
                </div>
                <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-snug text-balance md:text-4xl">{featured.title}</h2>
                <p className="mt-3 max-w-2xl text-base leading-8 text-white/80">{featured.excerpt}</p>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <ArticleMeta article={featured} light />
                  <span className="inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-2.5 text-sm font-bold text-ink transition group-hover:bg-white">
                    اقرأ الإعلان
                    <ArrowUpLeft className="size-4 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result line */}
      <div className="mb-4 mt-8 flex items-center justify-between text-sm" aria-live="polite">
        <p className="font-display text-xl font-bold text-green-dark">{browsing ? "أحدث المنشورات" : filter === ALL ? "نتائج البحث" : filter}</p>
        <p className="text-hint">عدد المنشورات: {results.length}</p>
      </div>

      {/* Grid */}
      <motion.ul layout className="grid gap-5 sm:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {grid.map((a, i) => (
            <motion.li
              key={a.slug}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: Math.min(i, 6) * 0.05, duration: 0.55, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
            >
              <NewsCard article={a} title={highlight(a.title, q)} />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      <AnimatePresence>
        {results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center rounded-3xl border border-dashed border-gold/60 bg-white/60 px-6 py-16 text-center"
          >
            <span className="grid size-16 place-items-center rounded-full bg-gold/25 text-gold-dark">
              <SearchX className="size-8" />
            </span>
            <p className="mt-4 font-display text-xl font-bold text-green-dark">لم نجد منشوراً مطابقاً</p>
            <p className="mt-1 text-sm text-ink-soft">جرّب كلمة أخرى أو اختر تصنيفاً مختلفاً.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter(ALL);
              }}
              className="mt-5 rounded-2xl border-2 border-green-dark/20 px-5 py-2 text-sm font-bold text-green-dark transition hover:border-green-dark"
            >
              عرض كل الأخبار
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
