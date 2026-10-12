"use client";

import Link from "next/link";
import { ChevronLeft, Clock, Compass, Layers, ListVideo, PlayCircle, Users } from "lucide-react";
import { CmsImage } from "@/components/cms/image";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { useTracks } from "@/lib/cms/content";
import { useT } from "@/lib/i18n";
import { trackLessons, trackMinutes } from "@/lib/data/academy";
import { TrackLevels, type LevelData } from "../_components/track-levels";
import { Certificate } from "../_components/certificate";
import { TrackIcon } from "../_components/track-icon";
import { useAcademyText } from "../_components/i18n";

/**
 * صفحة المسار. تقرأ المسار ودروسه من لوحة المحتوى، فما يعدّله الموظف يظهر هنا،
 * وما يؤرشفه من دروس يختفي من الخطة ومن حساب المدة والشهادة.
 */
export function TrackView({ slug }: { slug: string }) {
  const x = useAcademyText();
  const { t } = x;
  const tracks = useTracks();
  const track = tracks.find((t) => t.slug === slug) ?? null;

  if (!track) return <MissingTrack />;

  const lessons = trackLessons(track);
  const minutes = trackMinutes(track);
  const hours = Math.round(minutes / 60);
  const lecturerIds = [...new Set(lessons.map((r) => r.lesson.lecturer))];
  const first = lessons[0];

  const levels: LevelData[] = track.levels.map((l) => ({
    title: l.title,
    subtitle: l.subtitle,
    quiz: x.quiz(l.quiz),
    lessons: l.lessons.map((ls) => ({
      slug: ls.slug,
      title: ls.title,
      minutes: ls.minutes,
      media: ls.media,
      lecturer: x.lecturer(ls.lecturer).name,
      hasAudio: ls.hasAudio,
      real: !!ls.videoSrc,
    })),
  }));

  const others = tracks.filter((t) => t.slug !== track.slug);

  return (
    <>
      <PageHero title={track.title} description={track.description} image={track.image} crumbs={[{ label: t("الأكاديمية", "Academy"), href: "/academy" }, { label: track.title }]}>
        <div className="mt-7 flex flex-wrap gap-2.5">
          {[
            { icon: <Layers className="size-4" />, label: x.levels(track.levels.length) },
            { icon: <ListVideo className="size-4" />, label: x.lessons(lessons.length) },
            { icon: <Clock className="size-4" />, label: x.en ? `${hours > 0 ? `${hours} h ` : ""}${minutes % 60} min` : `${hours > 0 ? `${hours} س ` : ""}${minutes % 60} د` },
            { icon: <Users className="size-4" />, label: x.names(lecturerIds.map((id) => x.lecturer(id).name)) },
          ].map((c) => (
            <span key={c.label} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold ring-1 ring-white/15 backdrop-blur">
              <span className="text-gold">{c.icon}</span>
              {c.label}
            </span>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink href={`/academy/${track.slug}/${first.lesson.slug}`} variant="gold" size="lg">
            <PlayCircle className="size-5" /> {t("ابدأ من الدرس الأول", "Start with the first lesson")}
          </ButtonLink>
          <ButtonLink href="#certificate" variant="glass" size="lg">
            {t("شهادة المسار", "Track certificate")}
          </ButtonLink>
        </div>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <SectionHeading
              eyebrow={t("خطة المسار", "Track plan")}
              title={t("المستويات والدروس", "Levels and lessons")}
              description={t("تقدّم خطوة بخطوة: شاهد الدروس بالترتيب، ثم راجع كل مستوى باختبار قصير.", "Go step by step: watch the lessons in order, then review each level with a short quiz.")}
              align="start"
            />
            <TrackLevels trackSlug={track.slug} levels={levels} />
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <Reveal className="relative overflow-hidden rounded-3xl bg-green-dark p-6 text-white">
              <div className="bg-pattern absolute inset-0 opacity-15" />
              <span className="relative grid size-14 place-items-center rounded-2xl bg-gold/20 text-gold">
                <TrackIcon name={track.icon} className="size-7" />
              </span>
              <p className="relative mt-4 font-display text-xl font-bold">{t("ماذا ستتعلم؟", "What will you learn?")}</p>
              <p className="relative mt-2 text-sm leading-7 text-white/80">{track.short}</p>
              <ul className="relative mt-4 space-y-2 text-sm text-white/85">
                <li>• {t("دروس فيديو وصوت مع ملخص مكتوب", "Video and audio lessons with a written summary")}</li>
                <li>• {t("أسئلة معتمدة بعد كل درس", "Approved questions after every lesson")}</li>
                <li>• {t("اختبار قصير لكل مستوى", "A short quiz for each level")}</li>
                <li>• {t("شهادة إتمام برمز تحقق", "A completion certificate with a verification code")}</li>
              </ul>
            </Reveal>
            <Reveal delay={0.1} className="rounded-3xl border border-gold/35 bg-white p-5">
              <p className="mb-3 font-display font-bold text-green-dark">{t("محاضرو المسار", "Track lecturers")}</p>
              <ul className="space-y-3">
                {lecturerIds.map((id) => {
                  const l = x.lecturer(id);
                  return (
                    <li key={id} className="flex items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-dark font-display text-lg font-bold text-ink">{l.initials}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{l.name}</span>
                        <span className="block truncate text-xs text-hint">{l.role}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          </aside>
        </div>
      </section>

      <section id="certificate" className="relative scroll-mt-24 overflow-hidden border-y border-gold/30 bg-gold-light/40 py-16 md:py-24">
        <div className="bg-pattern-dark absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <Certificate trackSlug={track.slug} trackTitle={track.title} lessonSlugs={lessons.map((r) => r.lesson.slug)} hours={hours} lecturer={x.lecturer(lecturerIds[0]).name} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
        <SectionHeading eyebrow={t("تابع التعلّم", "Keep learning")} title={t("مسارات أخرى في الأكاديمية", "Other tracks in the academy")} />
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {others.map((o) => (
            <StaggerItem key={o.slug}>
              <Link href={`/academy/${o.slug}`} className="group relative flex h-44 flex-col justify-end overflow-hidden rounded-3xl p-4 text-white ring-1 ring-gold/30">
                <CmsImage src={o.image} alt="" fill sizes="(min-width: 1024px) 20vw, 50vw" quality={70} className="-z-20 object-cover transition duration-700 group-hover:scale-110" />
                <span className="absolute inset-0 -z-10 bg-gradient-to-t from-green-dark via-green-dark/60 to-transparent" />
                <span className="font-display text-lg font-bold leading-tight">{o.title}</span>
                <span className="mt-1 flex items-center gap-1 text-xs text-gold">
                  {x.lessons(trackLessons(o).length)} <ChevronLeft className="size-3.5 transition group-hover:-translate-x-1" />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </>
  );
}

/** مسار أُرشف من لوحة المحتوى أو لم يعد موجوداً */
function MissingTrack() {
  const t = useT();
  return (
    <section className="mx-auto grid min-h-[calc(70vh/var(--zoom))] max-w-2xl place-content-center px-4 pt-40 text-center">
      <span className="mx-auto grid size-20 place-items-center rounded-3xl bg-gold/20 text-maroon">
        <Compass className="size-10" />
      </span>
      <h1 className="mt-6 font-display text-3xl font-bold text-green-dark md:text-4xl">{t("هذا المسار غير متاح حالياً", "This track is not available right now")}</h1>
      <p className="mt-4 leading-8 text-ink-soft">{t("ربما أوقفته الإدارة مؤقتاً أو غيّرت ترتيب المسارات. تصفّح بقية مسارات الأكاديمية.", "The administration may have paused it or reorganised the tracks. Browse the academy's other tracks.")}</p>
      <div className="mt-8 flex justify-center">
        <ButtonLink href="/academy" size="lg">
          {t("كل المسارات", "All tracks")}
        </ButtonLink>
      </div>
    </section>
  );
}
