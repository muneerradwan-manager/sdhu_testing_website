import type { Metadata } from "next";
import { TRACKS, getTrack } from "@/lib/data/academy";
import { TrackView } from "./track-view";

type Params = { track: string };

export function generateStaticParams(): Params[] {
  return TRACKS.map((t) => ({ track: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { track } = await params;
  const t = getTrack(track);
  if (!t) return { title: "مسار غير موجود" };
  return { title: `مسار ${t.title} — الأكاديمية`, description: t.description };
}

export default async function TrackPage({ params }: { params: Promise<Params> }) {
  const { track } = await params;
  return <TrackView slug={track} />;
}
