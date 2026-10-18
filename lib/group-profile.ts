"use client";

import { useStore } from "./store";

/**
 * A group's public page, the group's own: its picture, a word about it, and a gallery. Its head (or his assistant)
 * writes it once the group is approved, and — as the cluster's page — nothing reaches the pilgrims before the
 * administration approves it. Its head, its seats and its people are not written here: they come from the
 * cluster's approved request. Keyed by the group's number.
 */
export type GroupProfileFields = {
  /** The group's picture, on its card and at the top of its window */
  cover: string;
  about: string;
  gallery: string[];
};

export type GroupProfileChange = { fields: GroupProfileFields; at: number; by: string; note?: string };

export type GroupProfileState = {
  pending?: GroupProfileChange;
  approved?: GroupProfileChange & { approvedAt: number; approvedBy: string };
  rejected?: { at: number; by: string; reason: string; fields: GroupProfileFields };
};

export const EMPTY_GROUP_PROFILE: GroupProfileFields = { cover: "", about: "", gallery: [] };

/** The site's own pictures, which the demo's groups start with until their heads upload theirs */
const SEED_PICTURES = [
  "/images/mina-tents.jpg",
  "/images/kaaba-hajj.jpg",
  "/images/haram-2022.jpg",
  "/images/jabal-rahmah.jpg",
  "/images/nabawi.jpg",
  "/images/tawaf-night.jpg",
  "/images/muzdalifah.jpg",
  "/images/clock-tower.jpg",
  "/images/quba.jpg",
  "/images/jamarat.jpg",
  "/images/mina-arrive.jpg",
  "/images/nabawi-2.jpg",
  "/images/kaaba-panoramio.jpg",
  "/images/farewell-tawaf.jpg",
  "/images/pilgrim-dua.jpg",
  "/images/aisha-mosque.jpg",
  "/images/quba-quran.jpg",
  "/images/pilgrim-elder.jpg",
];

/**
 * A group's page before its head wrote one: a picture and a gallery of four from the site's pictures, each group
 * its own (by its number), and no word about it — that is his to write.
 */
export function groupSeed(no: number): GroupProfileFields {
  const n = SEED_PICTURES.length;
  const first = (no * 7) % n;
  const gallery = Array.from({ length: 4 }, (_, i) => SEED_PICTURES[(first + 1 + i * 3) % n]);
  return { cover: SEED_PICTURES[first], about: "", gallery };
}

export const GROUP_PROFILE_LABELS: Record<keyof GroupProfileFields, string> = {
  cover: "صورة المجموعة",
  about: "نبذة عن المجموعة",
  gallery: "معرض الصور",
};

/** «4 صور» — a gallery as a change list reads it */
export function photosLabel(n: number) {
  if (!n) return "";
  if (n === 1) return "صورة واحدة";
  if (n === 2) return "صورتان";
  return `${n} ${n <= 10 ? "صور" : "صورة"}`;
}

/** What changed between what the pilgrims see now and what was submitted */
export function diffGroupFields(before: GroupProfileFields, after: GroupProfileFields) {
  return (Object.keys(GROUP_PROFILE_LABELS) as (keyof GroupProfileFields)[])
    .map((k) => {
      const show = (v: GroupProfileFields[typeof k]) => (k === "gallery" ? photosLabel((v as string[]).length) : k === "cover" ? (v ? "صورة مرفوعة" : "") : String(v));
      const a = show(before[k]);
      const b = show(after[k]);
      const changed = JSON.stringify(before[k]) !== JSON.stringify(after[k]);
      return { key: k, label: GROUP_PROFILE_LABELS[k], before: a, after: b === a && changed ? `${b} (صورة جديدة)` : b, changed };
    })
    .filter((x) => x.changed);
}

/** The group's page as the pilgrims see it: what the administration approved, else the pictures it starts with */
export function useGroupProfile(no: number): GroupProfileFields {
  const approved = useStore((s) => s.groupProfiles[String(no)]?.approved?.fields);
  return approved ?? groupSeed(no);
}
