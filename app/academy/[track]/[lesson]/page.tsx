import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, FileAudio, Headphones, Layers, PlayCircle, Tag } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { Reveal } from "@/components/ui/motion";
import { LECTURERS, TRACKS, getLesson, lessonKey, minutesLabel, trackLessons } from "@/lib/data/academy";
import { LessonPlayer } from "../../_components/lesson-player";
import { LessonTabs } from "../../_components/lesson-tabs";
import { LessonActions } from "../../_components/lesson-actions";
import { Playlist } from "../../_components/playlist";

type Params = { track: string; lesson: string };

export function generateStaticParams(): Params[] {
  return TRACKS.flatMap((t) => trackLessons(t).map((r) => ({ track: t.slug, lesson: r.lesson.slug })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { track, lesson } = await params;
  const found = getLesson(track, lesson);
  if (!found) return { title: "درس غير موجود" };
  return {
    title: `${found.lesson.title} — ${found.track.title}`,
    description: found.lesson.summary[0],
  };
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { track: trackSlug, lesson: lessonSlug } = await params;
  const found = getLesson(trackSlug, lessonSlug);
  if (!found) notFound();

  const { track, level, levelIndex, lesson, index, prev, next, list } = found;
  const lecturer = LECTURERS[lesson.lecturer];
  const levels = track.levels.map((l) => ({
    title: l.title,
    lessons: l.lessons.map((x) => ({ slug: x.slug, title: x.title, minutes: x.minutes, media: x.media })),
  }));
  const href = (slug: string) => `/academy/${track.slug}/${slug}`;

  return (
    <>
      <PageHero
        title={lesson.title}
        image={lesson.poster}
        crumbs={[{ label: "الأكاديمية", href: "/academy" }, { label: track.title, href: `/academy/${track.slug}` }, { label: `الدرس ${index + 1}` }]}
        className="pb-28 md:pb-36"
      >
        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <Chip icon={<Layers className="size-4" />}>{level.title}</Chip>
          <Chip icon={<Clock className="size-4" />}>{minutesLabel(lesson.minutes)}</Chip>
          <Chip icon={lesson.media === "audio" ? <Headphones className="size-4" /> : <PlayCircle className="size-4" />}>
            {lesson.media === "audio" ? "درس صوتي" : "فيديو"}
            {lesson.hasAudio ? " + ملف صوتي" : ""} + ملخص مكتوب
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

            <nav aria-label="التنقل بين الدروس" className="grid grid-cols-2 gap-3">
              {prev ? (
                <Link href={href(prev.lesson.slug)} className="group flex items-center gap-3 rounded-3xl border border-gold/35 bg-white p-4 transition hover:-translate-y-0.5 hover:border-gold-dark/60 hover:shadow-lg">
                  <ChevronRight className="size-5 shrink-0 text-gold-dark transition group-hover:translate-x-1" />
                  <span className="min-w-0">
                    <span className="block text-xs text-hint">الدرس السابق</span>
                    <span className="block truncate font-bold text-green-dark">{prev.lesson.title}</span>
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link href={href(next.lesson.slug)} className="group flex items-center justify-end gap-3 rounded-3xl bg-green-dark p-4 text-left text-white transition hover:-translate-y-0.5 hover:bg-green hover:shadow-lg">
                  <span className="min-w-0">
                    <span className="block text-xs text-gold">الدرس التالي</span>
                    <span className="block truncate font-bold">{next.lesson.title}</span>
                  </span>
                  <ChevronLeft className="size-5 shrink-0 text-gold transition group-hover:-translate-x-1" />
                </Link>
              ) : (
                <Link href={`/academy/${track.slug}#certificate`} className="flex items-center justify-end gap-3 rounded-3xl bg-gold p-4 text-left font-bold text-ink transition hover:bg-gold-dark hover:text-white">
                  شهادة المسار <ChevronLeft className="size-5" />
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
                  <FileAudio className="size-3.5" /> متوفر ملف صوتي للاستماع دون إنترنت
                </span>
              )}
            </Reveal>

            <Reveal className="relative overflow-hidden rounded-3xl bg-green-dark p-6 text-white sm:p-8">
              <div className="bg-pattern absolute inset-0 opacity-15" />
              <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold to-gold-dark font-display text-3xl font-bold text-ink">{lecturer.initials}</span>
                <div>
                  <p className="text-xs font-semibold text-gold">عن المحاضر</p>
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
              المستوى {levelIndex + 1} من {track.levels.length} • بعد إتمام دروس المستوى يُفتح اختبار قصير من خمسة أسئلة للمراجعة.
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
