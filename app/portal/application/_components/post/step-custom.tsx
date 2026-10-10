"use client";

import { ArrowLeft, FileSignature } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { StageFields, setAnswer } from "@/components/registration/stage-view";
import { trackOf } from "@/lib/journey";
import { stageErrors, type AnswerError } from "@/lib/registration/engine";
import { run } from "@/lib/registration/run";
import { completePostStep } from "@/lib/registration/service";
import type { Answers, StageDef } from "@/lib/registration/types";
import { useSeason } from "@/lib/season-live";
import { cn } from "@/lib/utils";
import { Question } from "../../../apply/_components/ui";
import { useRoomCost } from "./model";
import { logPilgrim, type StepProps } from "./shared";

/**
 * A step the administration added after acceptance: something to read and agree to, or questions to
 * answer. It is recorded by the service — which checks the steps before it are complete and the answers
 * valid — never by this page.
 */
export function StepCustom({ app, post, sessionId, def, stepLabel }: StepProps) {
  const toast = useToast();
  const season = useSeason();
  const room = useRoomCost(app, post);
  const [ack, setAck] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [memberAnswers, setMemberAnswers] = useState<Record<string, Answers>>({});
  const [errors, setErrors] = useState<AnswerError[]>([]);
  const [message, setMessage] = useState("");
  if (!def) return null;
  const ctx = { members: app.members, answers, memberAnswers, track: trackOf(app), elderlyMaxBirthYear: (app.policy?.rules ?? season.rules).elderlyNeedsCompanionMaxBirthYear };

  const send = () => {
    if (def.kind === "form") {
      const pseudo: StageDef = { id: def.id, kind: "form", name: def.title, title: def.title, phase: "", blocks: [], fields: def.fields, enabled: true, gates: [] };
      const errs = stageErrors(pseudo, ctx);
      setErrors(errs);
      if (errs.length) return;
    }
    const r = run((s) => completePostStep(s, sessionId, def.id, { ack, answers, memberAnswers }, room, Date.now()));
    if (!r.ok) {
      setMessage(r.errors[0].message);
      return;
    }
    logPilgrim(app, `إكمال خطوة «${def.title}»`);
    toast({ title: `اكتملت خطوة «${def.title}»`, icon: "✅", tone: "success" });
  };

  return (
    <Question step={stepLabel} title={def.title} hint={def.instructions || def.short} speak={def.title}>
      {def.kind === "acknowledge" && (
        <label className={cn("flex cursor-pointer items-start gap-4 rounded-3xl border-2 p-5 text-lg leading-8", ack ? "border-green-dark bg-green-light/10" : "border-gold/50 bg-white")}>
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-2 size-5 accent-[#00594F]" />
          <span className="whitespace-pre-line">{def.ackText}</span>
        </label>
      )}
      {def.kind === "form" && (
        <StageFields
          fields={def.fields}
          ctx={ctx}
          errors={errors}
          onAnswer={(k, v) => setAnswers((a) => setAnswer(a, k, v))}
          onMemberAnswer={(id, k, v) => setMemberAnswers((ma) => ({ ...ma, [id]: setAnswer(ma[id] ?? {}, k, v) }))}
        />
      )}
      {message && <p className="mt-5 rounded-2xl bg-maroon/8 p-4 font-bold text-maroon">{message}</p>}
      <Button size="xl" className="mt-8" disabled={def.kind === "acknowledge" && !ack} onClick={send}>
        {def.kind === "acknowledge" ? (
          <>
            <FileSignature className="size-6" /> أقرّ وأتابع
          </>
        ) : (
          <>
            إرسال الإجابات <ArrowLeft className="size-6" />
          </>
        )}
      </Button>
    </Question>
  );
}
