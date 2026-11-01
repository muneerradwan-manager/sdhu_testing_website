"use client";

import { withStaffNames } from "@/lib/staff";
import { useMemo } from "react";
import { personName } from "@/lib/registry";
import { actions, getState, useStore, type Letter, type LetterMessage } from "@/lib/store";
import LETTERS_RAW from "@/testdata/admins/letters.json";

const LETTERS = withStaffNames(LETTERS_RAW);

/**
 * The letters between the administrators and the administration («المراسلات» on its platform): an administrator
 * writes with a subject, a kind and an attachment; the staff who hold «إدارة الإداريين» read it, answer it in its
 * thread, and close it. A letter's state is read from its thread, never set by hand.
 */

export const LETTER_KINDS = ["استفسار", "طلب", "شكوى", "اقتراح", "إبلاغ عن مشكلة"] as const;

export type LetterState = "unread" | "waiting" | "answered" | "closed";

export const LETTER_STATE: Record<LetterState, { label: string; tone: "maroon" | "gold" | "green" | "muted" }> = {
  unread: { label: "غير مقروءة", tone: "maroon" },
  waiting: { label: "بدون رد", tone: "gold" },
  answered: { label: "تم الرد", tone: "green" },
  closed: { label: "مغلقة", tone: "muted" },
};

/** Closed; answered (the last word is the administration's); unread since its writer's last message; or read and waiting */
export function letterState(l: Letter): LetterState {
  if (l.closed) return "closed";
  const last = l.messages.at(-1);
  if (last?.from === "staff") return "answered";
  if (!l.readAt || (last && last.at > l.readAt)) return "unread";
  return "waiting";
}

/** Replies the writer has not read yet */
export function unreadReplies(l: Letter) {
  return l.messages.filter((m) => m.from === "staff" && m.at > (l.adminReadAt ?? 0)).length;
}

type RawLetter = Omit<Letter, "adminName" | "at" | "messages" | "readAt" | "adminReadAt"> & {
  at: string;
  readAt?: string;
  adminReadAt?: string;
  /** The administrator's own messages carry no name: his is the letter's writer's */
  messages: (Omit<LetterMessage, "name" | "at"> & { name?: string; at: string })[];
};

/**
 * The demo's letters from before today (testdata/admins/letters.json): invented writers among the season's people,
 * by id, their names from the civil registry; invented staff by name. Times as ISO strings.
 */
export const SEED_LETTERS: Letter[] = (LETTERS as RawLetter[]).map(({ readAt, adminReadAt, ...l }) => {
  const adminName = personName(l.adminId);
  return {
    ...l,
    adminName,
    at: Date.parse(l.at),
    messages: l.messages.map((m) => ({ ...m, name: m.from === "admin" ? adminName : (m.name ?? ""), at: Date.parse(m.at) })),
    ...(readAt && { readAt: Date.parse(readAt) }),
    ...(adminReadAt && { adminReadAt: Date.parse(adminReadAt) }),
  };
});

/** The latest moment in a letter's thread */
export const lastAt = (l: Letter) => l.messages.at(-1)?.at ?? l.at;

/** Every letter, the latest activity first: what was written on this device over the demo's earlier ones */
export function useLetters(): Letter[] {
  const stored = useStore((s) => s.letters);
  return useMemo(() => [...stored, ...SEED_LETTERS.filter((x) => !stored.some((y) => y.id === x.id))].sort((a, b) => lastAt(b) - lastAt(a)), [stored]);
}

/** Writes a letter where it lives: a demo letter is kept on this device the first time it changes */
export function putLetter(l: Letter) {
  if (getState().letters.some((x) => x.id === l.id)) actions.updateLetter(l.id, () => l);
  else actions.addLetter(l);
}

/** The next letter number of the season: «م-1448-0132» */
export function nextLetterNumber(all: Letter[], season: number) {
  const max = Math.max(131, ...all.map((l) => Number(l.number.split("-").at(-1)) || 0));
  return `م-${season}-${String(max + 1).padStart(4, "0")}`;
}
