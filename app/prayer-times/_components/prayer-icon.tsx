import { CloudMoon, Moon, Sun, Sunrise, Sunset, SunDim } from "lucide-react";
import type { PrayerKey } from "@/lib/prayer";

const ICONS = {
  fajr: CloudMoon,
  sunrise: Sunrise,
  dhuhr: Sun,
  asr: SunDim,
  maghrib: Sunset,
  isha: Moon,
} satisfies Record<PrayerKey, unknown>;

export function PrayerIcon({ prayer, className }: { prayer: PrayerKey; className?: string }) {
  const Icon = ICONS[prayer];
  return <Icon className={className} aria-hidden />;
}
