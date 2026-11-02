/**
 * The English of the guide's fixed texts (lib/data/guide), by the same order and ids, from
 * testdata/content/guide-en.json. The duas stay in Arabic, as they are recited; only what explains them is here.
 */
import type { NUSUK } from "@/lib/data/guide";
import GUIDE_EN from "@/testdata/content/guide-en.json";

type NusukId = (typeof NUSUK)[number]["id"];

export const NUSUK_EN: Record<NusukId, { name: string; tagline: string; how: string }> = GUIDE_EN.nusuk;

/** NUSUK_ROWS in English, row by row (the values in the order Tamattu', Qiran, Ifrad) */
export const NUSUK_ROWS_EN = GUIDE_EN.nusukRows as { label: string; values: [string, string, string] }[];

/** PROHIBITIONS in English, in the same order */
export const PROHIBITIONS_EN: { title: string; body: string }[] = GUIDE_EN.prohibitions;

export const WHO_EN: Record<string, string> = GUIDE_EN.who;

/** The hint of each Tawaf round in English (the duas stay in Arabic) */
export const TAWAF_HINTS_EN: string[] = GUIDE_EN.tawafHints;

/** Each Sa'i lap in English */
export const SAI_LAPS_EN: string[] = GUIDE_EN.saiLaps;

/** The packing list's groups, items and notes in English, by group order and item id */
export const PACKING_GROUPS_EN: string[] = GUIDE_EN.packingGroups;
export const PACKING_EN: Record<string, { label: string; note?: string }> = GUIDE_EN.packing;

/** HEALTH_TIPS in English, in the same order */
export const HEALTH_TIPS_EN: { title: string; body: string }[] = GUIDE_EN.healthTips;

export const HEATSTROKE_SIGNS_EN: string[] = GUIDE_EN.heatstrokeSigns;
