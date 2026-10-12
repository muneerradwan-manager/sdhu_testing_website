"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, FileAudio, Headphones, Layers, PlayCircle, Tag } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { useLessonRef } from "@/lib/cms/content";
import { lessonKey } from "@/lib/data/academy";
import { useT } from "@/lib/i18n";
import { LessonPlayer } from "../../_components/lesson-player";
import { LessonTabs } from "../../_components/lesson-tabs";
import { LessonActions } from "../../_components/lesson-actions";
import { Playlist } from "../../_components/playlist";
import { useAcademyText } from "../../_components/i18n";

/**
 * صفحة الدرس. نصوص الدرس وملخصه وأسئلته وأدعيته تأتي من لوحة المحتوى،
 * وإن أُرشف الدرس ظهرت رسالة تعيد الزائر إلى مساره.
 */
export function LessonView({ trackSlug, lessonSlug }: { trackSlug: string; lessonSlug: string }) {
  const x = useAcademyText();
  const { t } = x;
  const found = useLessonRef(trackSlug, lessonSlug);

  if (!found) return <MissingLesson trackSlug={trackSlug} />;

  const { track, level, levelIndex, lesson, index, prev, next, list } = found;
  const lecturer = x.lecturer(lesson.lecturer);
  const levels = track.levels.map((l) => ({
    title: l.title,
    lessons: l.lessons.map((ls) => ({ slug: ls.slug, title: ls.title, minutes: ls.minutes, media: ls.media })),
  }));
  const href = (slug: string) => `/academy/${track.slug}/${slug}`;

  return (
    <>
      <PageHero
        title={lesson.title}
        image={lesson.poster}
        crumbs={[{ label: t("الأكاديمية", "Academy"), href: "/academy" }, { label: track.title, href: `/academy/${track.slug}` }, { label: t(`الدرس ${index + 1}`, `Lesson ${index + 1}`) }]}
        className="pb-28 md:pb-36"
      >
        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <Chip icon={<Layers className="size-4" />}>{level.title}</Chip>
          <Chip icon={<Clock className="size-4" />}>{x.minutes(lesson.minutes)}</Chip>
          <Chip icon={lesson.media === "audio" ? <Headphones className="size-4" /> : <PlayCircle className="size-4" />}>
            {lesson.media === "audio" ? t("درس صوتي", "Audio lesson") : t("فيديو", "Video")}
            {lesson.hasAudio ? t(" + ملف صوتي", " + audio file") : ""}
            {t(" + ملخص مكتوب", " + written summary")}
          </Chip>
          <span className="flex items-center gap-2 rounded-full bg-white/10 py-1 pe-3 ps-1 backdrop-blur">
            <span className="grid size-7 place-items-center rounded-full bg-gold font-display font-bold text-ink">{lecturer.initials}</span>
            <span className="font-semibold">{lecturer.name}</span>
          </span>
        </div>
      </PageHero>

      <div className="relative z-10 mx-auto -mt-20 max-w-7xl px-4 pb-20 md:-mt-28 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <div className="min-w-0 space-y-6">
            <Reveal y={40}>
              <LessonPlayer
                lesson={{
                  slug: lesson.slug,
                  title: lesson.title,
                  minutes: lesson.minutes,
                  media: lesson.media,
                  poster: lesson.poster,
                  gallery: lesson.gallery,
                  videoSrc: lesson.videoSrc,
                  summary: lesson.summary,
                  points: lesson.points,
                  hasAudio: lesson.hasAudio,
                }}
                lecturer={{ name: lecturer.name, role: lecturer.role, initials: lecturer.initials }}
                fallbackGallery={track.gallery}
                narration={`/audio/lessons/${track.slug}/${lesson.slug}`}
                nextHref={next ? href(next.lesson.slug) : undefined}
                nextTitle={next?.lesson.title}
              />
            </Reveal>

            <LessonActions lessonKey={lessonKey(track.slug, lesson.slug)} lessonTitle={lesson.title} isLastInTrack={index === list.length - 1} />

            <nav aria-label={t("التنقل بين الدروس", "Lesson navigation")} className="grid grid-cols-2 gap-3">
              {prev ? (
                <Link href={href(prev.lesson.slug)} className="group flex items-center gap-3 rounded-3xl border border-gold/35 bg-white p-4 transition hover:-translate-y-0.5 hover:border-gold-dark/60 hover:shadow-lg">
                  <ChevronRight className="size-5 shrink-0 text-gold-dark transition group-hover:translate-x-1 ltr:group-hover:-translate-x-1" />
                  <span className="min-w-0">
                    <span className="block text-xs text-hint">{t("الدرس السابق", "Previous lesson")}</span>
                    <span className="block truncate font-bold text-green-dark">{prev.lesson.title}</span>
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link href={href(next.lesson.slug)} className="group flex items-center justify-end gap-3 rounded-3xl bg-green-dark p-4 text-end text-white transition hover:-translate-y-0.5 hover:bg-green hover:shadow-lg">
                  <span className="min-w-0">
                    <span className="block text-xs text-gold">{t("الدرس التالي", "Next lesson")}</span>
                    <span className="block truncate font-bold">{next.lesson.title}</span>
                  </span>
                  <ChevronLeft className="size-5 shrink-0 text-gold transition group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
                </Link>
              ) : (
                <Link href={`/academy/${track.slug}#certificate`} className="flex items-center justify-end gap-3 rounded-3xl bg-gold p-4 text-end font-bold text-ink transition hover:bg-gold-dark hover:text-white">
                  {t("شهادة المسار", "Track certificate")} <ChevronLeft className="size-5" />
                </Link>
              )}
            </nav>

            <LessonTabs
              lesson={{ title: lesson.title, summary: lesson.summary, points: lesson.points, faq: lesson.faq, duas: lesson.duas }}
              lecturerName={lecturer.name}
            />

            <Reveal className="flex flex-wrap items-center gap-2">
              <Tag className="size-4 text-gold-dark" />
              {lesson.tags.map((t) => (
                <span key={t} className="rounded-full border border-gold/40 bg-white px-3 py-1 text-xs font-semibold text-ink-soft">
                  {t}
                </span>
              ))}
              {lesson.hasAudio && (
                <span className="flex items-center gap-1 rounded-full bg-maroon/10 px-3 py-1 text-xs font-bold text-maroon">
                  <FileAudio className="size-3.5" /> {t("متوفر ملف صوتي للاستماع دون إنترنت", "Audio file available for offline listening")}
                </span>
              )}
            </Reveal>

            <Reveal className="relative overflow-hidden rounded-3xl bg-green-dark p-6 text-white sm:p-8">
              <div className="bg-pattern absolute inset-0 opacity-15" />
              <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold to-gold-dark font-display text-3xl font-bold text-ink">{lecturer.initials}</span>
                <div>
                  <p className="text-xs font-semibold text-gold">{t("عن المحاضر", "About the lecturer")}</p>
                  <p className="font-display text-xl font-bold">{lecturer.name}</p>
                  <p className="text-sm text-white/70">{lecturer.role}</p>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-white/80">{lecturer.bio}</p>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="min-w-0">
            <Playlist trackSlug={track.slug} trackTitle={track.title} levels={levels} current={lesson.slug} />
            <p className="mt-3 px-2 text-xs leading-6 text-hint">
              {t(
                `المستوى ${levelIndex + 1} من ${track.levels.length} • بعد إتمام دروس المستوى يُفتح اختبار قصير من خمسة أسئلة للمراجعة.`,
                `Level ${levelIndex + 1} of ${track.levels.length} • Once you finish the level's lessons, a short five-question review quiz opens.`,
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white/90 ring-1 ring-white/15 backdrop-blur">
      <span className="text-gold">{icon}</span>
      {children}
    </span>
  );
}

/** درس أُرشف من لوحة المحتوى أو لم يعد ضمن المسار */
function MissingLesson({ trackSlug }: { trackSlug: string }) {
  const t = useT();
  return (
    <section className="mx-auto grid min-h-[calc(70vh/var(--zoom))] max-w-2xl place-content-center px-4 pt-40 text-center">
      <span className="mx-auto grid size-20 place-items-center rounded-3xl bg-gold/20 text-maroon">
        <Layers className="size-10" />
      </span>
      <h1 className="mt-6 font-display text-3xl font-bold text-green-dark md:text-4xl">{t("هذا الدرس غير متاح حالياً", "This lesson is not available right now")}</h1>
      <p className="mt-4 leading-8 text-ink-soft">{t("ربما سحبته الإدارة للمراجعة أو أعادت ترتيب دروس المسار. تابع بقية دروس المسار.", "The administration may have withdrawn it for review or reorganised the track's lessons. Continue with the track's other lessons.")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href={`/academy/${trackSlug}`} size="lg">
          {t("دروس المسار", "Track lessons")}
        </ButtonLink>
        <ButtonLink href="/academy" size="lg" variant="outline">
          {t("الأكاديمية", "Academy")}
        </ButtonLink>
      </div>
    </section>
  );
}
