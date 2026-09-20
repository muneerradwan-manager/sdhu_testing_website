"use client";

import Link from "next/link";
import { ArrowLeft, BookOpenText } from "lucide-react";
import { CmsIcon, CmsSection, list, str } from "@/components/cms/bits";
import { Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { useSection } from "@/lib/cms/store";

/** تنبيه «الخدمة قيد الإعداد» — نصه ورابطه من لوحة المحتوى */
export function Notice() {
  const v = useSection("umrah", "notice");
  const text = str(v, "text");
  const linkLabel = str(v, "linkLabel");
  // الرابط يُدرج داخل النص عند أول ذكر لنصّه، وإلا أُلحق في آخره
  const [before, after] = linkLabel && text.includes(linkLabel) ? text.split(linkLabel) : [text, ""];

  return (
    <CmsSection page="umrah" section="notice">
      <section className="mx-auto max-w-5xl px-4 pt-16 md:px-8 md:pt-20">
        <Reveal>
          <div className="flex flex-col items-start gap-5 rounded-[2rem] border border-gold/40 bg-white p-6 shadow-[0_30px_70px_-45px_rgba(0,89,79,.5)] md:flex-row md:items-center md:p-8">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gold/25 text-maroon">
              <CmsIcon name={v.icon} className="size-8" fallback="Hourglass" />
            </span>
            <div>
              <p className="font-display text-2xl font-bold text-green-dark">{str(v, "title")}</p>
              <p className="mt-2 leading-8 text-ink-soft">
                {before}
                {linkLabel && (
                  <Link href={str(v, "linkHref", "/verify")} className="font-bold text-green-dark underline decoration-gold-dark underline-offset-4">
                    {linkLabel}
                  </Link>
                )}
                {after}
              </p>
            </div>
          </div>
        </Reveal>
      </section>
    </CmsSection>
  );
}

/** الخدمات المخطط لها */
export function Planned() {
  const v = useSection("umrah", "planned");
  const items = list<{ icon: string; title: string; text: string }>(v, "items");
  const badge = str(v, "badge");

  return (
    <CmsSection page="umrah" section="planned">
      <section className="mx-auto max-w-7xl px-4 pt-20 md:px-8 md:pt-24">
        <SectionHeading eyebrow={str(v, "eyebrow")} title={str(v, "title")} description={str(v, "description")} />
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => (
            <StaggerItem key={`${p.title}-${i}`} className="relative h-full rounded-3xl border border-dashed border-gold-dark/50 bg-white/70 p-6">
              {badge && <span className="absolute left-5 top-5 rounded-full bg-sand px-2.5 py-0.5 text-xs font-bold text-hint">{badge}</span>}
              <span className="grid size-12 place-items-center rounded-2xl bg-green-dark/8 text-green-dark">
                <CmsIcon name={p.icon} className="size-6" fallback="UsersRound" />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold text-green-dark">{p.title}</h3>
              <p className="mt-2 leading-7 text-ink-soft">{p.text}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </CmsSection>
  );
}

/** بطاقة مسار فقه العمرة في الأكاديمية */
export function AcademyCard() {
  const v = useSection("umrah", "academyCard");
  return (
    <CmsSection page="umrah" section="academyCard">
      <Reveal>
        <Link
          href={str(v, "href", "/academy/umrah-fiqh")}
          className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[2rem] bg-green-dark p-7 text-white shadow-2xl md:p-9"
        >
          <div className="bg-pattern absolute inset-0 opacity-15" />
          <div className="relative">
            {str(v, "badge") && (
              <span className="inline-flex items-center gap-2 rounded-full bg-green-light/25 px-3 py-1 text-sm font-bold text-white">
                <span className="size-2 rounded-full bg-green-light" /> {str(v, "badge")}
              </span>
            )}
            <BookOpenText className="mt-5 size-10 text-gold" />
            <p className="mt-3 font-display text-3xl font-bold">{str(v, "title")}</p>
            <p className="mt-2 leading-8 text-white/75">{str(v, "text")}</p>
          </div>
          <span className="relative mt-6 inline-flex items-center gap-2 font-bold text-gold transition group-hover:gap-3">
            {str(v, "ctaLabel")} <ArrowLeft className="size-5" />
          </span>
        </Link>
      </Reveal>
    </CmsSection>
  );
}
