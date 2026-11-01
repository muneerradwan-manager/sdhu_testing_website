/**
 * دليل المناسك — مركز المعرفة (بيانات تجريبية، والمحتوى الشرعي عام ومعتمد لدى جمهور العلماء)
 */

import DAYS_DATA from "@/testdata/content/guide-days.json";
import HARAM_DATA from "@/testdata/content/guide-haram.json";
import NUSUK_DATA from "@/testdata/content/guide-nusuk.json";
import NUSUK_ROWS_DATA from "@/testdata/content/guide-nusuk-comparison.json";
import PROHIBITIONS_DATA from "@/testdata/content/guide-prohibitions.json";
import TAWAF_DATA from "@/testdata/content/guide-tawaf.json";
import SAI_DATA from "@/testdata/content/guide-sai.json";
import GUIDE_DUAS_DATA from "@/testdata/content/guide-duas.json";
import PACKING_DATA from "@/testdata/content/guide-packing.json";
import HEALTH_TIPS_DATA from "@/testdata/content/guide-health-tips.json";
import HEATSTROKE_SIGNS_DATA from "@/testdata/content/guide-heatstroke-signs.json";

export type GuideDay = {
  id: string;
  day: string;
  name: string;
  hijri: string;
  image: string;
  place: { label: string; lat: number; lng: number; zoom?: number };
  intro: string;
  tasks: string[];
  times: { time: string; label: string }[];
  dua: { title: string; text: string };
  lesson: { track: string; lesson: string; title: string };
};

export const DAYS: GuideDay[] = DAYS_DATA;

export const HARAM: { label: string; lat: number; lng: number } = HARAM_DATA;

// ───────────────────────── Nusuk comparison ─────────────────────────

export const NUSUK = NUSUK_DATA as readonly {
  readonly id: "tamattu" | "qiran" | "ifrad";
  readonly name: string;
  readonly tagline: string;
  readonly recommended: boolean;
  readonly how: string;
}[];

export const NUSUK_ROWS = NUSUK_ROWS_DATA as { label: string; values: [string, string, string] }[];

// ───────────────────────── Ihram prohibitions ─────────────────────────

export type ProhibitionIcon = "scissors" | "hand" | "spray" | "head" | "shirt" | "bird" | "ring" | "heart" | "veil";

export const PROHIBITIONS = PROHIBITIONS_DATA as { icon: ProhibitionIcon; title: string; body: string; who: "الجميع" | "الرجال" | "النساء" }[];

// ───────────────────────── Tawaf & Sa'i ─────────────────────────

export const TAWAF_ROUNDS: { hint: string; dua: string }[] = TAWAF_DATA.rounds;

export const TAWAF_BETWEEN_CORNERS: string = TAWAF_DATA.betweenCorners;

export const SAI_SAFA_DUA: string = SAI_DATA.safaDua;

export const SAI_LAPS: string[] = SAI_DATA.laps;

// ───────────────────────── Dua cards ─────────────────────────

/** The Safa supplication is written once, in guide-sai.json: its card says «{safaDua}» */
export const GUIDE_DUAS: { title: string; when: string; text: string; source: string }[] = GUIDE_DUAS_DATA.map((d) => (d.text === "{safaDua}" ? { ...d, text: SAI_SAFA_DUA } : d));

// ───────────────────────── Packing list ─────────────────────────

export const PACKING: { group: string; items: { id: string; label: string; note?: string }[] }[] = PACKING_DATA;

// ───────────────────────── Health & heat ─────────────────────────

export type HealthIcon = "water" | "sun" | "feet" | "pill" | "food" | "sleep";

export const HEALTH_TIPS = HEALTH_TIPS_DATA as { icon: HealthIcon; title: string; body: string }[];

export const HEATSTROKE_SIGNS: string[] = HEATSTROKE_SIGNS_DATA;
