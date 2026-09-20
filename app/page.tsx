"use client";

import Link from "next/link";
import { ArrowLeft, BadgeCheck, CalendarDays, Landmark, Megaphone } from "lucide-react";
import { CmsIcon, CmsSection, list, str, tone, toneClass } from "@/components/cms/bits";
import { CmsImage } from "@/components/cms/image";
import { ButtonLink } from "@/components/ui/button";
import { Counter, Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { useArticles } from "@/lib/cms/content";
import { useSection } from "@/lib/cms/store";
import { Hero } from "./_home/hero";
import { Journey } from "./_home/journey";
import { AcademyTeaser, PrayerWidget } from "./_home/widgets";

/**
 * الصفحة الرئيسية. لا نص ثابتاً هنا: كل عنوان وفقرة وبطاقة ورقم وصورة يقرأ من لوحة المحتوى
 * (صفحة «الرئيسية»)، ويستطيع موظف الإدارة تعديله أو إخفاء قسمه كاملاً دون لمس الشيفرة.
 */
export default function Home() {
  return (
    <>
      <CmsSection page="home" section="hero">
        <Hero />
      </CmsSection>
      <Ticker />
      <Services />
      <CmsSection page="home" section="journey">
        <Journey />
      </CmsSection>
      <Numbers />
      <AcademyAndPrayer />
      <Verse />
      <News />
      <SeasonCalendar />
      <Cta />
    </>
  );
}

// ───────────────────────── الشريط العاجل ─────────────────────────

function Ticker() {
  const v = useSection("home", "ticker");
  const items = list<{ text: string }>(v, "items")
    .map((i) => i.text)
    .filter(Boolean);
  if (!items.length) return null;

  return (
    <CmsSection page="home" section="ticker">
      <div className="relative z-10 overflow-hidden border-y border-gold/40 bg-gold-light">
        <div className="flex items-stretch">
          <span className="z-10 flex shrink-0 items-center gap-2 bg-maroon px-5 py-3 font-bold text-white shadow-[8px_0_20px_rgba(0,0,0,.15)]">
            <Megaphone className="size-4 text-gold" /> {str(v, "label", "عاجل")}
          </span>
          <div className="flex overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_6%,black_94%,transparent)]">
            <div className="flex shrink-0 animate-marquee items-center gap-12 whitespace-nowrap py-3 pr-12 font-semibold text-green-dark hover:[animation-play-state:paused]">
              {[...items, ...items].map((t, i) => (
                <span key={i} className="flex items-center gap-3">
                  <span className="size-1.5 rotate-45 bg-gold-dark" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </CmsSection>
  );
}

// ───────────────────────── الخدمات + بطاقة العمرة ─────────────────────────

type ServiceItem = { href: string; icon: string; title: string; text: string; tone: string };

function Services() {
  const v = useSection("home", "services");
  const u = useSection("home", "umrahTeaser");
  const items = list<ServiceItem>(v, "items");

  return (
    <section id="services" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-24 md:px-8">
      <CmsSection page="home" section="services">
        <SectionHeading eyebrow={str(v, "eyebrow")} title={str(v, "title")} description={str(v, "description")} />
        <Stagger className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
          {items.map((s, i) => {
            const t = tone(s.tone);
            const featured = t === "gold";
            return (
              <StaggerItem key={`${s.href}-${i}`}>
                <Link
                  href={s.href || "/"}
                  className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border p-5 transition duration-500 hover:-translate-y-1.5 md:p-7 ${
                    featured
                      ? "border-transparent bg-green-dark text-white shadow-[0_24px_50px_-24px_rgba(0,89,79,.8)]"
                      : "border-gold/30 bg-white hover:border-gold-dark/50 hover:shadow-[0_24px_50px_-30px_rgba(2,21,38,.35)]"
                  }`}
                >
                  {featured && <div className="bg-pattern absolute inset-0 opacity-20" />}
                  <span
                    className={`relative grid size-13 place-items-center rounded-2xl transition duration-500 group-hover:scale-110 group-hover:rotate-[-6deg] ${
                      featured ? "bg-gold text-ink" : toneClass[t].chip
                    }`}
                  >
                    <CmsIcon name={s.icon} className="size-6" fallback="UsersRound" />
                  </span>
                  <h3 className={`relative mt-5 font-display text-lg font-bold md:text-xl ${featured ? "" : "text-green-dark"}`}>{s.title}</h3>
                  <p className={`relative mt-1 text-sm ${featured ? "text-white/70" : "text-ink-soft"}`}>{s.text}</p>
                  <ArrowLeft className={`relative mt-4 size-5 transition duration-500 group-hover:-translate-x-2 ${featured ? "text-gold" : "text-gold-dark"}`} />
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </CmsSection>

      <CmsSection page="home" section="umrahTeaser">
        <Reveal delay={0.1} className="mt-5">
          <Link
            href={str(u, "href", "/umrah")}
            className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-3xl border border-dashed border-gold-dark/60 bg-gold-light/50 p-5 transition duration-500 hover:border-gold-dark hover:bg-gold-light md:flex-row md:items-center md:p-6"
          >
            <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-white text-maroon shadow-sm">
              <CmsIcon name={str(u, "icon")} className="size-6" fallback="Hourglass" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-display text-xl font-bold text-green-dark">
                {str(u, "title")}
                {str(u, "badge") && <span className="rounded-full bg-maroon px-2.5 py-0.5 text-xs font-bold text-white">{str(u, "badge")}</span>}
              </p>
              <p className="mt-1 text-ink-soft">{str(u, "text")}</p>
            </div>
            <span className="flex items-center gap-1.5 font-bold text-green-dark transition group-hover:gap-3">
              {str(u, "ctaLabel")} <ArrowLeft className="size-5" />
            </span>
          </Link>
        </Reveal>
      </CmsSection>
    </section>
  );
}

// ───────────────────────── الموسم بالأرقام ─────────────────────────

function Numbers() {
  const v = useSection("home", "numbers");
  const items = list<{ value: number; label: string; sub: string }>(v, "items");

  return (
    <CmsSection page="home" section="numbers">
      <section className="relative isolate overflow-hidden bg-green-dark py-20 text-white">
        <div className="absolute inset-0 -z-20">
          <CmsImage src={v.image} alt="" fill sizes="100vw" quality={70} className="object-cover opacity-20" />
        </div>
        <div className="bg-pattern absolute inset-0 -z-10 opacity-20" />
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <Reveal className="mb-12 text-center">
            <p className="text-sm font-bold text-gold">{str(v, "eyebrow")}</p>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">{str(v, "title")}</h2>
          </Reveal>
          <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {items.map((s, i) => (
              <StaggerItem key={`${s.label}-${i}`} className="rounded-3xl border border-white/10 bg-white/[.06] p-6 text-center backdrop-blur">
                <Counter to={Number(s.value) || 0} className="font-display text-4xl font-bold text-gold md:text-5xl" />
                <p className="mt-2 font-bold">{s.label}</p>
                <p className="text-sm text-white/60">{s.sub}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </CmsSection>
  );
}

// ───────────────────────── الأكاديمية + مواقيت الصلاة ─────────────────────────

function AcademyAndPrayer() {
  const v = useSection("home", "academy");
  const stats = list<{ n: string; l: string }>(v, "stats");

  return (
    <CmsSection page="home" section="academy">
      {/* على الشاشات الكبيرة يتشارك العنوانان صفاً، وتبدأ البطاقتان وتنتهيان معاً؛ وعلى الهاتف تتراصّان */}
      <section className="mx-auto grid max-w-7xl gap-x-10 gap-y-6 px-4 py-24 md:px-8 lg:grid-cols-[1.3fr_1fr]">
        <SectionHeading
          align="start"
          eyebrow={str(v, "eyebrow")}
          title={str(v, "title")}
          description={str(v, "description")}
          className="!mb-0 lg:col-start-1 lg:row-start-1"
        />
        <Reveal className="flex flex-col gap-4 lg:col-start-1 lg:row-start-2">
          <AcademyTeaser />
          <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_auto] items-stretch gap-3 max-sm:grid-cols-3">
            {stats.map((x, i) => (
              <div key={`${x.l}-${i}`} className="grid place-content-center rounded-2xl border border-gold/30 bg-white p-3 text-center">
                <p className="font-display text-2xl font-bold text-green-dark">{x.n}</p>
                <p className="text-xs text-ink-soft">{x.l}</p>
              </div>
            ))}
            <ButtonLink href={str(v, "ctaHref", "/academy")} size="lg" className="max-sm:col-span-3 sm:h-full">
              {str(v, "ctaLabel")} <ArrowLeft className="size-5" />
            </ButtonLink>
          </div>
        </Reveal>

        <SectionHeading
          align="start"
          eyebrow={str(v, "prayerEyebrow")}
          title={str(v, "prayerTitle")}
          description={str(v, "prayerDescription")}
          className="!mb-0 mt-10 lg:col-start-2 lg:row-start-1 lg:mt-0"
        />
        <Reveal delay={0.1} className="lg:col-start-2 lg:row-start-2">
          <PrayerWidget className="h-full" />
        </Reveal>
      </section>
    </CmsSection>
  );
}

// ───────────────────────── شريط الآية ─────────────────────────

function Verse() {
  const v = useSection("home", "verse");
  return (
    <CmsSection page="home" section="verse">
      <section className="relative isolate flex min-h-[calc(70vh/var(--zoom))] items-center overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-20">
          <CmsImage
            src={v.image}
            alt={str(v, "alt")}
            fill
            sizes="100vw"
            quality={70}
            className="object-cover object-center opacity-60 [transform:translateZ(0)]"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/80 via-green-dark/60 to-ink/90" />
        <Reveal className="mx-auto max-w-4xl px-4 text-center">
          <Landmark className="mx-auto size-10 text-gold" />
          <p className="mt-6 font-quran text-3xl leading-[2] md:text-5xl md:leading-[1.9]">{str(v, "text")}</p>
          <p className="mt-4 text-gold">{str(v, "source")}</p>
        </Reveal>
      </section>
    </CmsSection>
  );
}

// ───────────────────────── آخر الأخبار ─────────────────────────

function News() {
  const v = useSection("home", "news");
  const articles = useArticles();
  const picked = list<{ slug: string }>(v, "slugs")
    .map((s) => articles.find((a) => a.slug === s.slug))
    .filter((a) => a !== undefined);
  if (!picked.length) return null;

  return (
    <CmsSection page="home" section="news">
      <section className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading align="start" eyebrow={str(v, "eyebrow")} title={str(v, "title")} className="mb-10" />
          <Reveal className="mb-10">
            <ButtonLink href="/news" variant="outline">
              {str(v, "ctaLabel")} <ArrowLeft className="size-4" />
            </ButtonLink>
          </Reveal>
        </div>
        <Stagger className="grid gap-6 md:grid-cols-3">
          {picked.map((n) => (
            <StaggerItem key={n.slug}>
              <Link
                href={`/news/${n.slug}`}
                className="group block h-full overflow-hidden rounded-3xl border border-gold/30 bg-white transition duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-35px_rgba(2,21,38,.45)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <CmsImage src={n.image} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" quality={70} className="object-cover transition duration-[1.2s] group-hover:scale-110" />
                  <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-maroon backdrop-blur">{n.category}</span>
                </div>
                <div className="p-6">
                  <p className="flex items-center gap-1.5 text-xs text-hint">
                    <CalendarDays className="size-3.5" /> {n.hijri}
                  </p>
                  <h3 className="mt-2 font-display text-xl font-bold leading-8 text-green-dark transition group-hover:text-green">{n.title}</h3>
                  <p className="mt-2 line-clamp-2 leading-7 text-ink-soft">{n.excerpt}</p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </CmsSection>
  );
}

// ───────────────────────── تقويم الموسم ─────────────────────────

function SeasonCalendar() {
  const v = useSection("home", "calendar");
  const dates = list<{ hijri: string; gregorian: string; title: string; who: string }>(v, "dates");

  return (
    <CmsSection page="home" section="calendar">
      <section className="relative overflow-hidden bg-white py-24">
        <div className="bg-pattern-dark absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow={str(v, "eyebrow")} title={str(v, "title")} description={str(v, "description")} />
          <div className="scrollbar-none -mx-4 overflow-x-auto px-4 pb-4">
            <Stagger className="flex w-max gap-4">
              {dates.map((d, i) => (
                <StaggerItem key={`${d.title}-${i}`} className="relative w-64 shrink-0 rounded-3xl border border-gold/30 bg-sand p-5">
                  <span className="font-display text-5xl font-bold text-gold/60">{String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-2 font-bold text-maroon">{d.hijri}</p>
                  <p className="text-xs text-hint">{d.gregorian}</p>
                  <p className="mt-3 font-display text-lg font-bold leading-7 text-green-dark">{d.title}</p>
                  {d.who && <span className="mt-3 inline-block rounded-full bg-green-dark/8 px-2.5 py-1 text-xs font-bold text-green-dark">{d.who}</span>}
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>
    </CmsSection>
  );
}

// ───────────────────────── دعوة التسجيل ─────────────────────────

function Cta() {
  const v = useSection("home", "cta");
  const points = list<{ text: string }>(v, "points");

  return (
    <CmsSection page="home" section="cta">
      <section className="mx-auto max-w-7xl px-4 pt-24 md:px-8">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-maroon-dark px-6 py-14 text-white md:px-16 md:py-20">
            <div className="absolute inset-0 -z-20">
              <CmsImage src={v.image} alt="" fill sizes="100vw" quality={70} className="object-cover opacity-25" />
            </div>
            <div className="absolute inset-0 -z-10 bg-gradient-to-l from-maroon-dark via-maroon-dark/90 to-maroon/60" />
            <div className="bg-pattern absolute inset-0 -z-10 opacity-15" />
            <div className="grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 className="font-display text-3xl font-bold leading-[1.4] md:text-5xl">
                  {str(v, "title")} <br />
                  <span className="text-gold-shine">{str(v, "titleHighlight")}</span>
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-white/80">{str(v, "text")}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink href={str(v, "primaryHref", "/register")} variant="gold" size="lg">
                    {str(v, "primaryLabel")} <ArrowLeft className="size-5" />
                  </ButtonLink>
                  <ButtonLink href={str(v, "secondaryHref", "/conditions")} variant="glass" size="lg">
                    <BadgeCheck className="size-5" /> {str(v, "secondaryLabel")}
                  </ButtonLink>
                </div>
              </div>
              <ul className="space-y-3">
                {points.map((t, i) => (
                  <li key={`${t.text}-${i}`} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
                    <span className="grid size-8 place-items-center rounded-full bg-gold font-bold text-ink">{i + 1}</span>
                    {t.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>
    </CmsSection>
  );
}
