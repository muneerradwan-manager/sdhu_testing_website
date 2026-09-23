"use client";

import { useMemo } from "react";
import { EXAM_QUESTIONS, EXAM_RULES, type ExamQuestion } from "@/lib/data/admin-exam";
import { useStore } from "@/lib/store";
import { EVALUATION_STAGES } from "@/lib/data/staff-seed";
import { ADMIN_CALENDAR, COMMITMENTS, POSITIONS } from "./admin";

/**
 * The administrators' rules as the administration left them this season. The platform ships defaults;
 * whatever the administration edits in the staff portal wins. Every screen of the administrator
 * portal reads through these hooks, so a change in the staff portal shows up the same season.
 */

export type ExamRules = Omit<typeof EXAM_RULES, "minutes" | "questions" | "passMark" | "writtenMin" | "writtenWeight" | "oralWeight"> & {
  minutes: number;
  questions: number;
  passMark: number;
  writtenMin: number;
  writtenWeight: number;
  oralWeight: number;
};

export function useExamRules(): ExamRules {
  const o = useStore((s) => s.adminRules.exam);
  return useMemo(() => {
    const writtenWeight = o?.writtenWeight ?? EXAM_RULES.writtenWeight;
    return {
      ...EXAM_RULES,
      minutes: o?.minutes ?? EXAM_RULES.minutes,
      questions: o?.questions ?? EXAM_RULES.questions,
      passMark: o?.passMark ?? EXAM_RULES.passMark,
      writtenMin: o?.writtenMin ?? EXAM_RULES.writtenMin,
      writtenWeight,
      oralWeight: Math.round((1 - writtenWeight) * 100) / 100,
    };
  }, [o]);
}

/** One question as the administration left it */
export function mergeQuestion(q: ExamQuestion, edit?: { text?: string; options?: string[]; answer?: number; explanation?: string }): ExamQuestion {
  if (!edit) return q;
  return {
    ...q,
    text: edit.text ?? q.text,
    options: edit.options ?? q.options,
    answer: edit.answer ?? q.answer,
    explanation: edit.explanation ?? q.explanation,
  };
}

/** The bank this season: the questions still in it, with the administration's wording, cut to the season's count */
export function useExamQuestions(): ExamQuestion[] {
  const off = useStore((s) => s.adminRules.questionsOff);
  const edits = useStore((s) => s.adminRules.questionEdits);
  const rules = useExamRules();
  return useMemo(() => {
    const live = EXAM_QUESTIONS.filter((q) => !off?.includes(q.id)).map((q) => mergeQuestion(q, edits?.[q.id]));
    return live.slice(0, rules.questions);
  }, [off, edits, rules.questions]);
}

/** The roles open for application this season, with the administration's description */
export function useRoles() {
  const off = useStore((s) => s.adminRules.rolesOff);
  const desc = useStore((s) => s.adminRules.roleDesc);
  return useMemo(
    () =>
      POSITIONS.filter((p) => !off?.includes(p.key)).map((p) => ({
        ...p,
        desc: desc?.[p.key] ?? p.desc,
      })),
    [off, desc],
  );
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

/** Final score with the season's weights */
export function finalScoreWith(written: number, oral: number, rules: { writtenWeight: number; oralWeight: number }) {
  return Math.round(written * rules.writtenWeight + oral * rules.oralWeight);
}

/** The stages an administrator is evaluated through this season */
export function useEvaluationStages() {
  const rows = useStore((s) => s.adminRules.stages);
  return useMemo(() => rows ?? EVALUATION_STAGES.map((st) => ({ key: st.key, label: st.label, hint: st.hint })), [rows]);
}
