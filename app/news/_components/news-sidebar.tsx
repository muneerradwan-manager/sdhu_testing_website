"use client";

import Link from "next/link";
import { BadgeCheck, Flame, Megaphone, ShieldAlert } from "lucide-react";
import { CmsImage } from "@/components/cms/image";
import { useArticles, useMostRead } from "@/lib/cms/content";
import { Reveal } from "@/components/ui/motion";
import { formatNumber } from "@/lib/utils";

export function NewsSidebar() {
  const articles = useArticles();
  const mostRead = useMostRead();
  const official = articles.filter((a) => a.category === "إعلانات رسمية" || a.category === "قرارات").slice(0, 5);

  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
      <Reveal>
        <section className="rounded-3xl border border-gold/30 bg-white p-5" aria-labelledby="most-read">
          <h2 id="most-read" className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
            <Flame className="size-5 text-maroon" /> الأكثر قراءة
          </h2>
          <ol className="mt-4 space-y-1">
            {mostRead.map((a, i) => (
              <li key={a.slug}>
                <Link href={`/news/${a.slug}`} className="group flex items-center gap-3 rounded-2xl p-2 transition hover:bg-sand">
                  <span className="font-display text-3xl font-bold leading-none text-gold transition-colors group-hover:text-gold-dark">{i + 1}</span>
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                    <CmsImage src={a.image} alt="" fill sizes="56px" quality={70} className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm font-semibold leading-6 text-ink transition-colors group-hover:text-green-dark">{a.title}</span>
                    <span className="text-[11px] text-hint">{formatNumber(a.views)} قراءة</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>

      <Reveal delay={0.1}>
        <section className="relative overflow-hidden rounded-3xl bg-green-dark p-5 text-white" aria-labelledby="official">
          <div className="bg-pattern absolute inset-0 opacity-15" />
          <h2 id="official" className="relative flex items-center gap-2 font-display text-lg font-bold text-gold">
            <Megaphone className="size-5" /> الإعلانات الرسمية
          </h2>
          <ul className="relative mt-4 divide-y divide-white/10">
            {official.map((a) => (
              <li key={a.slug}>
                <Link href={`/news/${a.slug}`} className="group flex gap-3 py-3">
                  <BadgeCheck className="mt-1 size-4 shrink-0 text-gold" />
                  <span>
                    <span className="block text-sm font-semibold leading-6 transition-colors group-hover:text-gold">{a.title}</span>
                    <span className="text-[11px] text-white/55">
                      {a.category} · {a.hijri}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      <Reveal delay={0.15}>
        <section className="relative overflow-hidden rounded-3xl border border-maroon/25 bg-maroon/[.06] p-5">
          <ShieldAlert className="absolute -left-4 -top-4 size-24 text-maroon/10" />
          <p className="relative font-display text-lg font-bold text-maroon">لا توجد مقاعد مضمونة</p>
          <p className="relative mt-2 text-sm leading-7 text-ink-soft">وصلك عرض من «حملة» تعدك بالقبول مقابل مبلغ؟ تحقق منها قبل أن تدفع أي شيء.</p>
          <Link
            href="/verify"
            className="relative mt-4 inline-flex items-center gap-2 rounded-2xl bg-maroon px-4 py-2 text-sm font-bold text-white transition hover:bg-maroon-dark"
          >
            تحقق من جهة الآن
          </Link>
        </section>
      </Reveal>
    </aside>
  );
}
