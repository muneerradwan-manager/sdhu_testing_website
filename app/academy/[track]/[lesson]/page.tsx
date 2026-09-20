import type { Metadata } from "next";
import { TRACKS, getLesson, trackLessons } from "@/lib/data/academy";
import { LessonView } from "./lesson-view";

type Params = { track: string; lesson: string };

export function generateStaticParams(): Params[] {
  return TRACKS.flatMap((t) => trackLessons(t).map((r) => ({ track: t.slug, lesson: r.lesson.slug })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { track, lesson } = await params;
  const found = getLesson(track, lesson);
  if (!found) return { title: "درس غير موجود" };
  return { title: `${found.lesson.title} — ${found.track.title}`, description: found.lesson.summary[0] };
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { track, lesson } = await params;
  return <LessonView trackSlug={track} lessonSlug={lesson} />;
}
