"use client";

import { useMemo } from "react";
import { actions, getState, useStore, type Letter } from "@/lib/store";

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

/** The demo's letters from before today: invented writers among the season's people, invented staff */
const day = (d: number, h = 10) => Date.UTC(2026, 9, d, h);
export const SEED_LETTERS: Letter[] = [
  {
    id: "lt-1",
    number: "م-1448-0112",
    adminId: "01033300941",
    adminName: "عماد الشامي",
    subject: "تصحيح الفرع في ملفي",
    kind: "طلب",
    at: day(1, 9),
    messages: [
      { id: "lt-1a", from: "admin", name: "عماد الشامي", text: "السلام عليكم، ما زال فرعي في الملف حمص مع أني انتقلت إلى دمشق منذ الموسم الماضي. أرجو التصحيح قبل تشكيل التكتلات.", at: day(1, 9), file: "سند-إقامة.pdf" },
      { id: "lt-1b", from: "staff", name: "مازن الحلبي", text: "وعليكم السلام. فرعك في الملف دمشق منذ 3 تشرين الثاني 1447 بطلبك، وهذا ما يراه رؤساء التكتلات. لا يلزمك شيء آخر.", at: day(1, 13) },
    ],
    readAt: day(1, 12),
    adminReadAt: day(1, 18),
  },
  {
    id: "lt-2",
    number: "م-1448-0127",
    adminId: "01033300982",
    adminName: "سمر الخطيب",
    subject: "موعد الامتحان الشفهي يتعارض مع دوامي",
    kind: "استفسار",
    at: day(5, 11),
    messages: [{ id: "lt-2a", from: "admin", name: "سمر الخطيب", text: "هل يمكن تبديل يوم الشفهي بعد حجزه؟ تعارض مع دوام المدرسة يوم الأربعاء.", at: day(5, 11) }],
    readAt: day(5, 15),
  },
  {
    id: "lt-3",
    number: "م-1448-0131",
    adminId: "01033300972",
    adminName: "حسان المارديني",
    subject: "لم يصلني رمز الدخول على تيليجرام",
    kind: "إبلاغ عن مشكلة",
    at: day(6, 20),
    messages: [{ id: "lt-3a", from: "admin", name: "حسان المارديني", text: "بدأت البوت وأرسلت رقمي، ولم يصلني رمز الدخول. أرفقت صورة الشاشة.", at: day(6, 20), file: "صورة-الشاشة.png" }],
  },
];

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
