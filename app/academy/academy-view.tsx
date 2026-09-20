"use client";

import Link from "next/link";
import { BadgeCheck, BookOpen, CalendarDays, ChevronLeft, Clock, Layers, PlayCircle, Users } from "lucide-react";
import { CmsPageHero } from "@/components/cms/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Counter, Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { useAcademyStats, useAllLessons, useLessonRef, useTracks } from "@/lib/cms/content";
import { LECTURERS, minutesLabel, trackLessons, trackMinutes } from "@/lib/data/academy";
import { AcademySearch } from "./_components/academy-search";
import { GuestBanner } from "./_components/guest-banner";
import { LessonPlayer } from "./_components/lesson-player";
import { TrackGrid } from "./_components/track-grid";

/** درس الأسبوع؛ إن أُرشف من اللوحة عُرض أول درس متاح بدلاً منه */
const FEATURED = { track: "hajj-fiqh", lesson: "tawaf-steps" };

/**
 * واجهة الأكاديمية. المسارات والدروس تُقرأ من لوحة المحتوى، فيظهر فيها فوراً
 * كل عنوان أو ملخص عدّله الموظف، ويختفي ما أرشفه.
 */
export function AcademyView() {
  const tracks = useTracks();
  const allLessons = useAllLessons();
  const stats = useAcademyStats();
  const featuredRef = useLessonRef(FEATURED.track, FEATURED.lesson);
  const featured = featuredRef ?? allLessons[0] ?? null;
  const lecturer = featured ? LECTURERS[featured.lesson.lecturer] : null;
  const lecturerLessons = (id: string) => allLessons.filter((r) => r.lesson.lecturer === id).length;

  const counters = [
    { icon: Layers, value: stats.tracks, label: "مسارات تعليمية" },
    { icon: BookOpen, value: stats.lessons, label: "درساً مصوّراً وصوتياً" },
    { icon: Clock, value: stats.hours, label: "ساعة من المحتوى" },
    { icon: Users, value: stats.learners, label: "متعلّماً هذا العام" },
  ];

  return (
    <>
      <CmsPageHero page="academy" className="pb-32 md:pb-40">
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ButtonLink href={`/academy/${tracks[0]?.slug ?? FEATURED.track}`} variant="gold" size="lg">
            <PlayCircle className="size-5" /> ابدأ بمسار {tracks[0]?.title ?? "فقه الحج"}
          </ButtonLink>
          <ButtonLink href="#search" variant="glass" size="lg">
            ابحث عن مسألة
          </ButtonLink>
          <span className="flex items-center gap-2 text-sm text-white/75">
            <CalendarDays className="size-4 text-gold" /> متاحة طوال السنة • بدون حساب
          </span>
        </div>
      </CmsPageHero>

      {/* العدّادات */}
      <section className="relative z-10 mx-auto -mt-20 max-w-6xl px-4 md:-mt-24 md:px-8">
        <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {counters.map((s) => (
            <StaggerItem key={s.label}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-gold/40 bg-white/90 p-5 text-center shadow-[0_24px_60px_-30px_rgba(2,21,38,.45)] backdrop-blur-xl transition hover:-translate-y-1 md:p-6">
                <span className="absolute -left-6 -top-6 size-20 rounded-full bg-gold/20 blur-xl transition group-hover:scale-150" />
                <s.icon className="relative mx-auto size-7 text-gold-dark" />
                <Counter to={s.value} className="relative mt-2 block font-display text-3xl font-bold text-green-dark md:text-4xl" />
                <p className="relative mt-1 text-sm font-semibold text-ink-soft">{s.label}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* البحث */}
      <section id="search" className="mx-auto max-w-5xl scroll-mt-28 px-4 pt-20 md:px-8">
        <SectionHeading eyebrow="بحث فوري" title="عندك سؤال؟ ابحث في كل الدروس" description="نبحث لك في العناوين والملخصات والأسئلة المعتمدة والمقاطع القصيرة." />
        <Reveal data-tour-target>
          <AcademySearch />
        </Reveal>
      </section>

      {/* درس الأسبوع */}
      {featured && lecturer && (
        <section className="relative mt-20 overflow-hidden bg-green-dark py-16 text-white md:py-24">
          <div className="bg-pattern absolute inset-0 opacity-15" />
          <div className="absolute -right-40 top-10 size-96 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 md:px-8 lg:grid-cols-[1fr_1.5fr]">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-gold">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-gold" />
                  <span className="relative size-2 rounded-full bg-gold" />
                </span>
                درس الأسبوع
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold md:text-5xl">{featured.lesson.title}</h2>
              <p className="mt-3 text-white/70">
                {featured.track.title} • {featured.level.title} • {minutesLabel(featured.lesson.minutes)}
              </p>
              <p className="mt-5 leading-8 text-white/85">{featured.lesson.summary[0]}</p>
              <ul className="mt-6 space-y-2.5">
                {featured.lesson.points.slice(0, 4).map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-white/85">
                    <BadgeCheck className="mt-0.5 size-5 shrink-0 text-gold" />
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-dark font-display text-xl font-bold text-ink">{lecturer.initials}</span>
                <span>
                  <span className="block font-bold">{lecturer.name}</span>
                  <span className="block text-sm text-white/60">{lecturer.role}</span>
                </span>
                <Link href={`/academy/${featured.track.slug}/${featured.lesson.slug}`} className="ms-auto inline-flex items-center gap-1 text-sm font-bold text-gold hover:underline">
                  صفحة الدرس <ChevronLeft className="size-4" />
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <LessonPlayer
                lesson={{
                  slug: featured.lesson.slug,
                  title: featured.lesson.title,
                  minutes: featured.lesson.minutes,
                  media: featured.lesson.media,
                  poster: featured.lesson.poster,
                  gallery: featured.lesson.gallery,
                  videoSrc: featured.lesson.videoSrc,
                  summary: featured.lesson.summary,
                  points: featured.lesson.points,
                  hasAudio: featured.lesson.hasAudio,
                }}
                lecturer={{ name: lecturer.name, role: lecturer.role, initials: lecturer.initials }}
                fallbackGallery={featured.track.gallery}
                narration={`/audio/lessons/${featured.track.slug}/${featured.lesson.slug}`}
                nextHref={`/academy/${featured.track.slug}/${featured.lesson.slug}`}
                nextLabel="افتح صفحة الدرس كاملة"
              />
            </Reveal>
          </div>
        </section>
      )}

      {/* المسارات */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <SectionHeading eyebrow="المسارات" title="مسارات لرحلة مطمئنة" description="ابدأ بفقه الحج، ثم أكمل بما يناسبك. كل مسار مقسم إلى مستويات قصيرة." />
        <TrackGrid
          tracks={tracks.map((t) => ({
            slug: t.slug,
            title: t.title,
            short: t.short,
            image: t.image,
            icon: t.icon,
            tone: t.tone,
            levels: t.levels.length,
            minutes: trackMinutes(t),
            lessonSlugs: trackLessons(t).map((r) => r.lesson.slug),
          }))}
        />
      </section>

      {/* شريط الزائر */}
      <section className="mx-auto max-w-7xl px-4 md:px-8">
        <GuestBanner path={allLessons.map((r) => ({ track: r.track.slug, slug: r.lesson.slug, title: r.lesson.title, trackTitle: r.track.title }))} />
      </section>

      {/* المحاضرون */}
      <section className="overflow-hidden py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow="المحاضرون" title="نخبة من المشايخ والمختصين" description="كل درس يراجعه الموظف المختص بالمحتوى الديني ويعتمده قبل نشره." />
        </div>
        <div className="group relative [mask-image:linear-gradient(to_left,transparent,black_8%,black_92%,transparent)]">
          <div className="flex w-max animate-marquee gap-4 group-hover:[animation-play-state:paused]">
            {[...Object.values(LECTURERS), ...Object.values(LECTURERS)].map((l, i) => (
              <div
                key={`${l.id}-${i}`}
                aria-hidden={i >= Object.keys(LECTURERS).length}
                className="flex w-80 shrink-0 items-start gap-4 rounded-3xl border border-gold/35 bg-white p-5 shadow-[0_16px_40px_-30px_rgba(2,21,38,.4)]"
              >
                <span className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-green-dark to-green font-display text-3xl font-bold text-gold">
                  {l.initials}
                  <span className="absolute -bottom-1.5 -left-1.5 grid size-6 place-items-center rounded-full bg-gold text-ink ring-2 ring-white">
                    <BadgeCheck className="size-3.5" />
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-lg font-bold text-green-dark">{l.name}</span>
                  <span className="block text-xs font-semibold text-maroon">{l.role}</span>
                  <span className="mt-2 line-clamp-2 block text-sm leading-6 text-ink-soft">{l.bio}</span>
                  <span className="mt-2 block text-xs font-bold text-gold-dark">{lecturerLessons(l.id)} من الدروس</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
