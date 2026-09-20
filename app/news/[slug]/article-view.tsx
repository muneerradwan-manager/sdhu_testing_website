"use client";

import Link from "next/link";
import { Building2, CalendarDays, ChevronLeft, ChevronRight, Clock3, Eye, FileQuestion, Hash, PenLine } from "lucide-react";
import { useEffect } from "react";
import { CmsImage } from "@/components/cms/image";
import { ButtonLink } from "@/components/ui/button";
import { PageHero } from "@/components/ui/page-hero";
import { Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { SpeakButton } from "@/components/ui/widgets";
import { useArticle, useArticles, useRelatedArticles } from "@/lib/cms/content";
import type { Block } from "@/lib/data/news";
import { formatNumber } from "@/lib/utils";
import { ArticleBody, headingId } from "../_components/article-body";
import { Feedback, ShareBar, TableOfContents } from "../_components/article-actions";
import { CategoryBadge, NewsCard } from "../_components/news-card";
import { ReadingProgress } from "../_components/reading-progress";

function plainText(blocks: Block[]) {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "p":
        case "h":
        case "quote":
          return b.text;
        case "list":
          return b.items.join(". ");
        case "callout":
          return `${b.title}: ${b.text}`;
        case "table":
          return "";
      }
    })
    .filter(Boolean)
    .join(". ");
}

/**
 * صفحة المنشور. تقرأ المقال من لوحة المحتوى لا من الشيفرة، فيظهر فيها فوراً كل تعديل
 * أو مقال جديد أدخله الموظف. وإن كان الرابط محجوزاً ولم يُملأ بعد ظهرت رسالة واضحة بدل صفحة فارغة.
 */
export function ArticleView({ slug }: { slug: string }) {
  const article = useArticle(slug);
  const articles = useArticles();
  const related = useRelatedArticles(article);

  // عنوان التبويب يتبع المقال المعروض، حتى للمقالات التي أُدخلت بعد بناء الموقع
  useEffect(() => {
    if (article?.title) document.title = `${article.title} | المنصة الوطنية للحج`;
  }, [article?.title]);

  if (!article) return <MissingArticle />;

  const index = articles.findIndex((a) => a.slug === slug);
  const newer = articles[index - 1];
  const older = articles[index + 1];
  const toc = article.body.flatMap((b, i) => (b.type === "h" ? [{ id: headingId(i), text: b.text }] : []));

  return (
    <>
      <ReadingProgress />
      <PageHero
        title={<span className="block max-w-4xl leading-tight">{article.title}</span>}
        image={article.image}
        crumbs={[{ label: "الأخبار", href: "/news" }, { label: article.category }]}
      >
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-white/80">
          <CategoryBadge article={article} className="bg-white/95" />
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-gold" />
            {article.hijri} <span className="text-white/50">({article.gregorian})</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-4 text-gold" />
            {article.readingMinutes} دقائق قراءة
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="size-4 text-gold" />
            {formatNumber(article.views)} قراءة
          </span>
        </div>
      </PageHero>

      <div className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_19rem]">
          <article className="min-w-0">
            <Reveal>
              <div className="relative -mt-4 aspect-[16/8] overflow-hidden rounded-3xl shadow-[0_30px_70px_-40px_rgba(2,21,38,.7)] ring-1 ring-gold/30 md:-mt-8">
                <CmsImage src={article.image} alt="" fill priority quality={85} sizes="(min-width: 1024px) 860px, 100vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
              </div>
            </Reveal>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-gold/30 pb-6 print:hidden">
              <SpeakButton text={`${article.title}. ${plainText(article.body)}`} label="استمع إلى المنشور" />
              <ShareBar title={article.title} />
            </div>

            <div className="mx-auto max-w-[46rem]">
              {article.excerpt && (
                <p className="mt-8 rounded-3xl bg-green-dark/[.04] p-5 text-lg font-semibold leading-9 text-green-dark ring-1 ring-green-dark/10">{article.excerpt}</p>
              )}
              <ArticleBody blocks={article.body} />

              {article.tags.length > 0 && (
                <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-gold/30 pt-6">
                  <Hash className="size-4 text-gold-dark" />
                  {article.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-green-dark ring-1 ring-gold/40 transition hover:bg-green-dark hover:text-white hover:ring-green-dark"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 ring-1 ring-gold/30 print:hidden">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-dark font-display text-lg font-bold text-green-dark ring-4 ring-gold/25">
                    <PenLine className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs text-hint">نُشر بواسطة</p>
                    <p className="font-bold text-green-dark">{article.author}</p>
                  </div>
                </div>
                <ShareBar title={article.title} />
              </div>

              <div className="mt-8 print:hidden">
                <Feedback />
              </div>

              <nav aria-label="التنقل بين المنشورات" className="mt-8 grid gap-3 sm:grid-cols-2 print:hidden">
                {newer ? (
                  <Link href={`/news/${newer.slug}`} className="group rounded-3xl border border-gold/30 bg-white p-5 transition hover:border-green-dark/40 hover:shadow-lg">
                    <span className="flex items-center gap-1 text-xs font-semibold text-hint">
                      <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" /> منشور أحدث
                    </span>
                    <span className="mt-2 line-clamp-2 block font-semibold leading-7 text-green-dark">{newer.title}</span>
                  </Link>
                ) : (
                  <span className="hidden sm:block" />
                )}
                {older && (
                  <Link href={`/news/${older.slug}`} className="group rounded-3xl border border-gold/30 bg-white p-5 transition hover:border-green-dark/40 hover:shadow-lg sm:text-left">
                    <span className="flex items-center justify-end gap-1 text-xs font-semibold text-hint">
                      منشور أقدم <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                    </span>
                    <span className="mt-2 line-clamp-2 block font-semibold leading-7 text-green-dark">{older.title}</span>
                  </Link>
                )}
              </nav>
            </div>
          </article>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start print:hidden">
            <TableOfContents items={toc} />
            <div className="relative overflow-hidden rounded-3xl bg-green-dark p-5 text-white">
              <div className="bg-pattern absolute inset-0 opacity-15" />
              <dl className="relative space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 size-4 text-gold" />
                  <div>
                    <dt className="text-white/55">الجهة المختصة</dt>
                    <dd className="font-semibold">{article.department}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 size-4 text-gold" />
                  <div>
                    <dt className="text-white/55">تاريخ النشر</dt>
                    <dd className="font-semibold">{article.hijri}</dd>
                    <dd className="text-white/70">{article.gregorian}</dd>
                  </div>
                </div>
              </dl>
              <p className="relative mt-5 rounded-2xl bg-white/10 p-3 text-xs leading-6 text-white/75">
                هذا المنشور صادر عن الإدارة ومعتمد قبل نشره. المصدر الرسمي الوحيد لإعلانات الإدارة هو هذه المدونة.
              </p>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-24 print:hidden">
            <SectionHeading eyebrow="تابع القراءة" title="منشورات ذات صلة" />
            <Stagger className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {related.map((a) => (
                <StaggerItem key={a.slug} className="h-full">
                  <NewsCard article={a} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}
      </div>
    </>
  );
}

/** رابط محجوز لم يُنشر فيه منشور بعد، أو منشور أُرشف من لوحة المحتوى */
function MissingArticle() {
  return (
    <section className="mx-auto grid min-h-[calc(70vh/var(--zoom))] max-w-2xl place-content-center px-4 pt-40 text-center">
      <span className="mx-auto grid size-20 place-items-center rounded-3xl bg-gold/20 text-maroon">
        <FileQuestion className="size-10" />
      </span>
      <h1 className="mt-6 font-display text-3xl font-bold text-green-dark md:text-4xl">لا يوجد منشور على هذا الرابط</h1>
      <p className="mt-4 leading-8 text-ink-soft">
        قد يكون المنشور قد أُرشف، أو أن هذا الرابط محجوز لمنشور لم تنشره الإدارة بعد. تصفّح آخر الإعلانات في مدونة الإدارة.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/news" size="lg">
          كل الأخبار والإعلانات
        </ButtonLink>
        <ButtonLink href="/" size="lg" variant="outline">
          الصفحة الرئيسية
        </ButtonLink>
      </div>
    </section>
  );
}
