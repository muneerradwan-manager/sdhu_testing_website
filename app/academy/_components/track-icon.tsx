import { BookHeart, HandHeart, Landmark, Luggage, Moon, type LucideProps } from "lucide-react";
import type { TrackIcon as TrackIconName } from "@/lib/data/academy";

/** A tiny Kaaba glyph (lucide has none) */
function KaabaGlyph(props: LucideProps) {
  const { className, strokeWidth = 1.8 } = props;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 7.5 12 4l8 3.5v10L12 21l-8-3.5z" />
      <path d="M4 7.5 12 11l8-3.5M12 11v10" />
      <path d="M4 10.5 12 14l8-3.5" strokeWidth={2.6} className="text-gold" stroke="currentColor" />
    </svg>
  );
}

export function TrackIcon({ name, className }: { name: TrackIconName; className?: string }) {
  switch (name) {
    case "kaaba":
      return <KaabaGlyph className={className} />;
    case "umrah":
      return <Moon className={className} />;
    case "heart":
      return <HandHeart className={className} />;
    case "madinah":
      return <Landmark className={className} />;
    case "dua":
      return <BookHeart className={className} />;
    case "bag":
      return <Luggage className={className} />;
  }
}
