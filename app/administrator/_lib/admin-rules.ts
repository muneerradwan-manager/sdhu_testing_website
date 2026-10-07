"use client";

import { useMemo } from "react";
import { EXAM_QUESTIONS, EXAM_RULES, isServable, type ExamNumbers, type ExamQuestion } from "@/lib/data/admin-exam";
import { dateOf, shiftDay, useOperation } from "@/lib/operations";
import { useStore } from "@/lib/store";
import { gregorianDate } from "@/lib/utils";
import { EVALUATION_STAGES } from "@/lib/data/staff-seed";
import { useSeason } from "@/lib/season-live";
import { ADMIN_CALENDAR, COMMITMENTS, DOCUMENTS, LANGUAGES, ROLE_REQUIREMENTS, SKILLS, type DocType, type RoleRequirements } from "./admin";
import { useStructure } from "./structure";

/**
 * The administrators' rules as the administration left them this season. The platform ships defaults;
 * whatever the administration edits in the staff portal wins. Every screen of the administrator
 * portal reads through these hooks, so a change in the staff portal shows up the same season.
 */

export type ExamRules = Omit<typeof EXAM_RULES, keyof ExamNumbers> & ExamNumbers;

/** What each oral day holds unless the exams' staff change it */
export const ORAL_DEFAULTS = { perDay: 30, time: "09:00 – 14:00", place: "مبنى مديرية الحج — دمشق، لجان الامتحان الشفهي" };

/**
 * The oral as the exams' staff set it: its days are those of the operation «الامتحان الشفهي» (from its first
 * day to its last), each with its seats, hours and place, and how many booked each day so far.
 */
export function useOral() {
  const op = useOperation("admin-oral");
  const o = useStore((s) => s.adminRules.oral);
  const admins = useStore((s) => s.admins);
  return useMemo(() => {
    const days: string[] = [];
    // Friday is the weekend: no committee sits unless the exams' staff open it
    if (op.start && op.end) for (let d = op.start; d <= op.end && days.length < 60; d = shiftDay(d, 1)) if (o?.fridays || dateOf(d).getDay() !== 5) days.push(d);
    const booked: Record<string, number> = {};
    for (const p of Object.values(admins)) if (p.oralBooking && !p.oral) booked[p.oralBooking.day] = (booked[p.oralBooking.day] ?? 0) + 1;
    return { op, days, booked, perDay: o?.perDay ?? ORAL_DEFAULTS.perDay, time: o?.time ?? ORAL_DEFAULTS.time, place: o?.place ?? ORAL_DEFAULTS.place, fridays: !!o?.fridays };
  }, [op, o, admins]);
}

/** «الأحد 18 تشرين الأول» */
export function oralDayLabel(day: string, withYear = false) {
  return gregorianDate(dateOf(day), { weekday: "long", day: "numeric", month: "long", ...(withYear ? {} : { year: undefined }) });
}

export function useExamRules(): ExamRules {
  const o = useStore((s) => s.adminRules.exam);
  return useMemo(() => {
    const writtenWeight = o?.writtenWeight ?? EXAM_RULES.writtenWeight;
    return {
      ...EXAM_RULES,
      passMark: o?.passMark ?? EXAM_RULES.passMark,
      writtenMin: o?.writtenMin ?? EXAM_RULES.writtenMin,
      writtenWeight,
      oralWeight: Math.round((1 - writtenWeight) * 100) / 100,
    };
  }, [o]);
}

/** One question as the administration left it */
export function mergeQuestion(q: ExamQuestion, edit?: { text?: string; options?: string[]; answer?: number; explanation?: string; points?: number }): ExamQuestion {
  if (!edit) return q;
  return {
    ...q,
    text: edit.text ?? q.text,
    options: edit.options ?? q.options,
    answer: edit.answer ?? q.answer,
    explanation: edit.explanation ?? q.explanation,
  };
}

/** Every question this season, the platform's and those the administration wrote, withdrawn ones included */
export function useAllQuestions(): ExamQuestion[] {
  const added = useStore((s) => s.adminRules.questionsAdded);
  const edits = useStore((s) => s.adminRules.questionEdits);
  const roles = useStore((s) => s.adminRules.questionRoles);
  return useMemo(
    // A written question the administration wrote before has no place in an exam marked by the platform alone
    () => [...EXAM_QUESTIONS, ...(added ?? []).filter(isServable)].map((q) => ({ ...mergeQuestion(q, edits?.[q.id]), roles: roles?.[q.id] ?? q.roles })),
    [added, edits, roles],
  );
}

/** The bank this season: the questions still in it, with the administration's wording and the roles it gave each */
export function useExamBank(): ExamQuestion[] {
  const all = useAllQuestions();
  const off = useStore((s) => s.adminRules.questionsOff);
  return useMemo(() => all.filter((q) => !off?.includes(q.id)), [all, off]);
}

/**
 * The roles open for application this season (applied for and active in the administration's structure),
 * with its wording. `elected` stays false: a role that is not applied for is granted, not listed here.
 */
export function useRoles() {
  const roles = useStructure().roles;
  return useMemo(() => roles.filter((r) => r.applied && r.active).map((r) => ({ key: r.key, label: r.name, desc: r.desc, elected: false, examAs: r.examAs })), [roles]);
}

/** The commitments an applicant must accept this season */
export function useCommitments() {
  const off = useStore((s) => s.adminRules.commitmentsOff);
  const edits = useStore((s) => s.adminRules.commitmentEdits);
  return useMemo(
    () =>
      COMMITMENTS.filter((c) => !off?.includes(c.key)).map((c) => ({
        key: c.key,
        label: edits?.[c.key]?.label ?? c.label,
        detail: edits?.[c.key]?.detail ?? c.detail,
      })),
    [off, edits],
  );
}

/** The administrators' calendar for the season */
export function useAdminCalendar() {
  const rows = useStore((s) => s.adminRules.calendar);
  return useMemo(() => rows ?? ADMIN_CALENDAR.map((r) => ({ hijri: r.hijri, title: r.title, detail: r.detail })), [rows]);
}

/** The stages an administrator is evaluated through this season */
export function useEvaluationStages() {
  const rows = useStore((s) => s.adminRules.stages);
  return useMemo(() => rows ?? EVALUATION_STAGES.map((st) => ({ key: st.key, label: st.label, hint: st.hint })), [rows]);
}

/** The season's table of what each role asks of the administrator, as the administration left it */
export function useRoleRequirements(): RoleRequirements {
  const t = useStore((s) => s.adminRules.requirements);
  return t ?? ROLE_REQUIREMENTS;
}

/** Documents whose validity is a number in the season settings: the lists page edits it there, so both pages show one value */
export const SEASON_VALIDITY = { "first-aid": "firstAidValidSeasons", record: "recordValidSeasons", recommendation: "recommendationValidSeasons" } as const;

/**
 * The documents and certificates this season, as the holder of «إدارة الإداريين» left them: the
 * platform's list (reworded, with its validity, or set aside this season), then the certificates the
 * administration added. `types` is what an application can ask for; `all` includes what was set aside,
 * for the lists page; `validity` is what docState() needs, for every type a file may still hold.
 */
export function useDocTypes(): { types: DocType[]; all: DocType[]; validity: Record<string, number> } {
  const added = useStore((s) => s.adminRules.docTypes);
  const edits = useStore((s) => s.adminRules.docEdits);
  const off = useStore((s) => s.adminRules.docsOff);
  const season = useSeason();
  return useMemo(() => {
    const all: DocType[] = [
      ...DOCUMENTS.map((d) => {
        const e = edits?.[d.key];
        const validSeasons = d.key in SEASON_VALIDITY ? (season.documents[d.key] ?? d.validSeasons) : (e?.validSeasons ?? d.validSeasons);
        return { ...d, label: e?.label ?? d.label, hint: e?.hint ?? d.hint, validSeasons, off: !!off?.includes(d.key) };
      }),
      ...(added ?? []).map((d) => ({ ...d, file: "certificate.pdf", custom: true, off: !!off?.includes(d.key) })),
    ];
    return { types: all.filter((d) => !d.off), all, validity: Object.fromEntries(all.map((d) => [d.key, d.validSeasons])) };
  }, [added, edits, off, season.documents]);
}

export type SkillType = { key: string; label: string; emoji: string; custom?: boolean; off?: boolean };

/** The skills an administrator is asked about this season: the platform's, less those set aside, then those added */
export function useSkills(): { skills: SkillType[]; all: SkillType[] } {
  const added = useStore((s) => s.adminRules.skillsAdded);
  const off = useStore((s) => s.adminRules.skillsOff);
  return useMemo(() => {
    const all: SkillType[] = [
      ...SKILLS.map((k) => ({ ...k, off: !!off?.includes(k.key) })),
      ...(added ?? []).map((k) => ({ ...k, custom: true, off: !!off?.includes(k.key) })),
    ];
    return { skills: all.filter((k) => !k.off), all };
  }, [added, off]);
}

/** The languages offered this season; Arabic is always there */
export function useLanguages(): { languages: string[]; all: { name: string; custom?: boolean; off?: boolean }[] } {
  const added = useStore((s) => s.adminRules.languagesAdded);
  const off = useStore((s) => s.adminRules.languagesOff);
  return useMemo(() => {
    const all = [
      ...LANGUAGES.map((name) => ({ name, off: name !== "العربية" && !!off?.includes(name) })),
      ...(added ?? []).map((name) => ({ name, custom: true, off: !!off?.includes(name) })),
    ];
    return { languages: all.filter((l) => !l.off).map((l) => l.name), all };
  }, [added, off]);
}
