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
 * «محاكاة: تقييم واعتراض» — the demo's way to see the whole of the season's evaluation at once without rating by hand from
 * four accounts: the cluster head of تكتل النور rates himself; two staff rate him (وسام خوري, who was in the tower and the camps,
 * low in Makkah; هيثم زيدان, a flights supervisor, well in the airport and travel stages); he objects to the Makkah stage with a
 * piece of evidence, and وسام answers with his own. What is left is the committee's decision. Nothing is simulated twice.
 */
const RATERS = [
  { id: "wissam", place: "فندق أبراج النور، مخيم 42", scores: { makkah: 2, mashaer: 4 } },
  { id: "haitham", place: "الطيران", scores: { airport: 4, travel: 5 } },
] as const;

/** A tiny picture and a text, as the evidence the two sides hold */
async function evidence(name: string, text: string) {
  return uploadEvidence(new File([text], name, { type: "text/plain" }));
}

export function useSimulateEvaluation() {
  const requests = useClusterRequests();
  const stages = useEvaluationStages();
  return useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    const r = requests.find((x) => x.cluster.id === "al-nour" && x.status === "approved");
    if (!r) return { ok: false, message: "تكتل النور غير معتمد في هذه النسخة." };
    const head = evaluateesOfCluster(r.cluster.id, r.cluster.name, r.headId, r.headName, r.cluster)[0];
    if (getState().evaluationObjections[head.id]) return { ok: false, message: `اعتراض ${head.name} موجود: افتحه من «اعتراضات الإداريين».` };

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

    // 3. he objects to the Makkah stage, with evidence; 4. وسام answers with his own
    const proof = await evidence("كشف-حضور-التجمع.txt", "كشف حضور تجمّع الفوج الأول — فندق أبراج النور — الساعة 06:30: الحضور 48 من 48.");
    actions.objectToEvaluation(head.id, { stages: ["makkah"], reason: "كنت مع الحجاج في الحرم صباح ذلك اليوم، وكشف الحضور المرفق يثبت أن التجمع تم في موعده وبحضور الجميع.", evidence: [proof] });
    const answer = await evidence("سجل-دخول-الفندق.txt", "سجل بوابة الفندق: لم يصل رئيس التكتل إلى البهو قبل الساعة 07:15.");
    const wissam = getStaff("wissam")!;
    actions.replyToObjection(head.id, raterKey("wissam"), { by: { id: wissam.id, name: wissam.name, title: wissam.title, place: RATERS[0].place }, text: "سجل بوابة الفندق يبيّن أنه لم يحضر التجمع في ساعته، وهذا ما بنيت عليه درجتي.", evidence: [answer], at: Date.now() });
    return { ok: true, message: `جاهز: ${head.name} قيّم نفسه، وقيّمه موظفان، واعترض على «مرحلة مكة»، وردّ وسام. الاعتراض أمام لجنة التقييم (${CURRENT_SEASON}).` };
  }, [requests, stages]);
}
