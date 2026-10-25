"use client";

import { useCallback } from "react";
import { uploadEvidence } from "@/lib/evidence";
import { CURRENT_SEASON } from "@/lib/ops";
import { getStaff } from "@/lib/staff";
import { actions, getState, type PeerEvaluation, type StageScores } from "@/lib/store";
import { useEvaluationStages } from "./admin-rules";
import { avgOf, evaluateesOfCluster, raterKey, round1, selfSections } from "./evaluation";
import { useClusterRequests } from "./formation";

/**
 * «محاكاة: تقييم واعتراض» — the demo's way to see the season's evaluation without rating by hand from four accounts, in steps
 * so each side can be tried by hand from where the simulation left off:
 *   ratings   the cluster head of تكتل النور rates himself; two staff rate him (وسام خوري, who was in the tower and the camps,
 *             low in Makkah; هيثم زيدان, a flights supervisor, well in the airport and travel stages) and add points to him
 *             (وسام a negative −20 with evidence, هيثم a positive +10). The demo's day moves into the staff's window.
 *   objection he objects to the Makkah stage and to the negative with evidence and وسام answers with his own. The day moves into
 *             the objection window.
 *   all       both, then the day moves into the committee's window: what is left is the committee's decision.
 *   reset     forgets all of it, to start again.
 * Nothing is simulated twice.
 */
export type EvaluationStep = "ratings" | "objection" | "all" | "reset";

const RATERS = [
  { id: "wissam", place: "فندق أبراج النور، مخيم 42", scores: { makkah: 2, mashaer: 4 } },
  { id: "haitham", place: "الطيران", scores: { airport: 4, travel: 5 } },
] as const;

/** The days the demo moves to: inside each window of the season 1448 (lib/operations.ts) */
const DAY = { ratings: "2027-06-05", objection: "2027-06-12", committee: "2027-06-20" } as const;

/** A small text, as the evidence the two sides hold */
async function evidence(name: string, text: string) {
  return uploadEvidence(new File([text], name, { type: "text/plain" }));
}

export function useSimulateEvaluation() {
  const requests = useClusterRequests();
  const stages = useEvaluationStages();
  return useCallback(
    async (step: EvaluationStep): Promise<{ ok: boolean; message: string }> => {
      const r = requests.find((x) => x.cluster.id === "al-nour" && x.status === "approved");
      if (!r) return { ok: false, message: "تكتل النور غير معتمد في هذه النسخة." };
      const head = evaluateesOfCluster(r.cluster.id, r.cluster.name, r.headId, r.headName, r.cluster)[0];
      const who = `${head.name} (رئيس تكتل النور): من صفحة الدخول، تبويب «إداريون»`;

      if (step === "reset") {
        actions.resetEvaluation(head.id);
        actions.setToday(undefined);
        return { ok: true, message: `نُسي تقييم ${head.name} كله، وعاد تاريخ التجربة إلى أول الموسم. ابدأ من «١ التقييم والنقاط».` };
      }

      const state = getState();
      const rated = !!state.peerEvaluations[head.id];
      const objected = !!state.evaluationObjections[head.id];

      if (step === "ratings" || step === "all") {
        if (rated && step === "ratings") return { ok: false, message: "جرت هذه الخطوة. أعد المحاكاة من «البدء من جديد»." };
        if (!rated) {
          // 1. his own evaluation, every question scored 4 or 5, sent
          const sections = selfSections(stages, head.role).filter((x) => x.items);
          const sectionScores: Record<string, StageScores> = Object.fromEntries(sections.map((x) => [x.key, Object.fromEntries(x.items!.map((q, i) => [q.key, { score: i % 2 ? 4 : 5 }]))]));
          actions.saveSelfEvaluation(
            head.id,
            {
              stages: Object.fromEntries(Object.entries(sectionScores).map(([k, v]) => [k, { score: round1(avgOf(v))! }])),
              sections: sectionScores,
              answers: { achieved: "استقبلنا الفوج كاملاً في موعده ونظّمنا التجمعات.", needs: "دعم أكبر للتجمع في الأيام الأولى." },
            },
            { submit: true },
          );

          // 2. two staff rate him, each in the stages he saw: one low, to be objected to
          for (const x of RATERS) {
            const staff = getStaff(x.id)!;
            const secs: Record<string, StageScores> = {};
            const stageScores: StageScores = {};
            for (const [key, score] of Object.entries(x.scores)) {
              const sec = sections.find((s) => s.key === key);
              if (!sec) continue;
              secs[key] = Object.fromEntries(sec.items!.map((q) => [q.key, { score, ...(score < 3 ? { note: "تأخّر في الاستقبال وغاب عن التجمع صباحاً" } : {}) }]));
              stageScores[key] = { score };
            }
            const value: PeerEvaluation = { by: { id: staff.id, name: staff.name, title: staff.title, place: x.place }, stages: stageScores, sections: secs, at: Date.now() };
            actions.setPeerEvaluation(head.id, raterKey(x.id), value);
          }

          // 3. two of them add points: وسام a negative (−20) with evidence, هيثم a positive (+10)
          const wissam = getStaff("wissam")!;
          const haitham = getStaff("haitham")!;
          const lateProof = await evidence("صورة-الفوج-المنتظر.txt", "صورة الفوج الأول واقفاً في البهو من 06:30 إلى 07:15 دون رئيس التكتل.");
          const goodProof = await evidence("شكر-شركة-الطيران.txt", "كتاب شكر من مشرف المطار على تنظيم أول استقبال للفوج.");
          actions.setEvaluationPoint(head.id, { id: "pt-sim-neg", points: -20, reason: "تأخّر عن تجمّع الفوج الأول ثلاثة أرباع الساعة، فوقف الحجاج ينتظرون في البهو.", evidence: [lateProof], by: { id: wissam.id, name: wissam.name, title: wissam.title, place: RATERS[0].place }, at: Date.now() });
          actions.setEvaluationPoint(head.id, { id: "pt-sim-pos", points: 10, reason: "نظّم استقبال الفوج في المطار بلا أي تأخير.", evidence: [goodProof], by: { id: haitham.id, name: haitham.name, title: haitham.title, place: RATERS[1].place }, at: Date.now() });
        }
        if (step === "ratings") {
          actions.setToday(DAY.ratings);
          return { ok: true, message: `جاهز، ونُقل تاريخ التجربة إلى ${DAY.ratings} (نافذة تقييم الموظفين). قيّم رئيس التكتل نفسه، وقيّمه وسام وهيثم، وأضاف وسام سلبية (−20) بدليل وهيثم إيجابية (+10). جرّب بنفسك: ادخل كموظف (wissam أو haitham، كلمة المرور 1448) من «تقييم الإداريين» لتعدّل نقاطك، أو كـ${who} لترى نتيجتك. ثم اضغط «٢ الاعتراض».` };
        }
      }

      if (step === "objection" || step === "all") {
        if (objected && step === "objection") return { ok: false, message: "جرت هذه الخطوة. أعد المحاكاة من «البدء من جديد»." };
        if (!getState().peerEvaluations[head.id]) return { ok: false, message: "ابدأ بالخطوة «١ التقييم والنقاط»: لا اعتراض قبل التقييم." };
        if (!objected) {
          // 4. he objects to the Makkah stage and to the negative, with evidence; 5. وسام answers with his own
          const wissam = getStaff("wissam")!;
          const proof = await evidence("كشف-حضور-التجمع.txt", "كشف حضور تجمّع الفوج الأول — فندق أبراج النور — الساعة 06:30: الحضور 48 من 48.");
          actions.objectToEvaluation(head.id, { stages: ["makkah"], points: ["pt-sim-neg"], reason: "كنت مع الحجاج في الحرم صباح ذلك اليوم، وكشف الحضور المرفق يثبت أن التجمع تم في موعده وبحضور الجميع، فلا مرحلة مكة ولا السلبية تصح.", evidence: [proof] });
          const answer = await evidence("سجل-دخول-الفندق.txt", "سجل بوابة الفندق: لم يصل رئيس التكتل إلى البهو قبل الساعة 07:15.");
          actions.replyToObjection(head.id, raterKey("wissam"), { by: { id: wissam.id, name: wissam.name, title: wissam.title, place: RATERS[0].place }, text: "سجل بوابة الفندق يبيّن أنه لم يحضر التجمع في ساعته، وهذا ما بنيت عليه درجتي وسلبيتي.", evidence: [answer], at: Date.now() });
        }
        if (step === "objection") {
          actions.setToday(DAY.objection);
          return { ok: true, message: `جاهز، ونُقل تاريخ التجربة إلى ${DAY.objection} (نافذة الاعتراض). اعترض رئيس التكتل على «مرحلة مكة» وعلى السلبية بدليل، وردّ وسام. جرّب: ادخل كوسام لتعدّل ردّك، أو كـ${who}. ثم انقل التاريخ إلى نافذة اللجنة بـ«٣ إلى اللجنة».` };
        }
      }

      actions.setToday(DAY.committee);
      return { ok: true, message: `جاهز، ونُقل تاريخ التجربة إلى ${DAY.committee} (نافذة لجنة التقييم، ${CURRENT_SEASON}): ${head.name} قيّم نفسه، وقيّمه موظفان وأضافا له سلبية (−20) وإيجابية (+10)، فاعترض على «مرحلة مكة» وعلى السلبية، وردّ وسام. ادخل كعضو لجنة (tarek أو yousef أو rana، كلمة المرور 1448) من «لجنة التقييم» لتقرّر وتعتمد النتيجة النهائية.` };
    },
    [requests, stages],
  );
}
