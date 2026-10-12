"use client";

import { useMemo } from "react";
import { useLang, useT } from "@/lib/i18n";
import { CLIPS_EN, LECTURERS_EN, QUIZZES_EN } from "@/lib/cms/en/academy-quiz";
import { CLIP_FORMS, LECTURERS, LESSON_FORMS, arabicCount, minutesLabel, type Clip, type Lecturer, type LecturerId, type QuizQuestion } from "@/lib/data/academy";
import { hijriDate } from "@/lib/utils";

const LEVEL_FORMS = { one: "مستوى واحد", two: "مستويان", few: "مستويات", many: "مستوى" };
const HOUR_FORMS = { one: "ساعة واحدة", two: "ساعتين", few: "ساعات", many: "ساعة" };

const HIJRI_MONTHS_EN = [
  "Muharram",
  "Safar",
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  "Jumada al-Ula",
  "Jumada al-Akhirah",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qa'dah",
  "Dhu al-Hijjah",
];

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** A Hijri date in English: "14 Rabi' al-Thani 1448 AH" */
function hijriDateEn(date: Date) {
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "numeric", year: "numeric" }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const month = HIJRI_MONTHS_EN[Number(get("month")) - 1] ?? get("month");
  return `${get("day")} ${month} ${get("year")} AH`;
}

/**
 * The academy's words in the page's language: counts, lecturers' roles, quizzes and clips.
 * Lessons and tracks come in English from the CMS by themselves; these texts live in code.
 */
export function useAcademyText() {
  const lang = useLang();
  const t = useT();
  return useMemo(() => {
    const en = lang === "en";
    return {
      en,
      t,
      lessons: (n: number) => (en ? count(n, "lesson", "lessons") : arabicCount(n, LESSON_FORMS)),
      levels: (n: number) => (en ? count(n, "level", "levels") : arabicCount(n, LEVEL_FORMS)),
      clips: (n: number) => (en ? count(n, "short clip", "short clips") : arabicCount(n, CLIP_FORMS)),
      hours: (n: number) => (en ? count(n, "hour", "hours") : arabicCount(n, HOUR_FORMS)),
      minutes: (n: number) => (en ? `${n} min` : minutesLabel(n)),
      /** «3 س 20 د» / "3 h 20 min" */
      duration: (minutes: number, dropZeroHours = false) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (en) return `${h > 0 || !dropZeroHours ? `${h} h ` : ""}${m} min`;
        return `${h > 0 || !dropZeroHours ? `${h} س ` : ""}${m} د`;
      },
      /** Names and initials stay Arabic; the role and bio follow the page */
      lecturer: (id: LecturerId): Lecturer => (en ? { ...LECTURERS[id], ...LECTURERS_EN[id] } : LECTURERS[id]),
      names: (names: string[]) => names.join(en ? ", " : "، "),
      quiz: (questions: QuizQuestion[]): QuizQuestion[] => (en ? questions.map((q) => ({ ...q, ...QUIZZES_EN[q.q] })) : questions),
      clip: (c: Clip): Clip => (en && CLIPS_EN[c.slug] ? { ...c, ...CLIPS_EN[c.slug] } : c),
      hijri: (date: Date) => (en ? hijriDateEn(date) : hijriDate(date)),
    };
  }, [lang, t]);
}
