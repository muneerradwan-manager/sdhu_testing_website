"use client";

import { Ban, CheckCircle2, ShieldQuestion } from "lucide-react";
import type { CivilClaim } from "@/lib/store";
import { cn } from "@/lib/utils";

/** The pilgrim's correction of his civil details: waiting for the registration officer, or his decision and its reason */
export function CivilNotice({ claim }: { claim: CivilClaim }) {
  const fields = claim.fields.map((f) => `${f.label}: «${f.claimed}»`).join("، ");
  const view = {
    pending: {
      icon: ShieldQuestion,
      cls: "bg-gold/15 ring-gold/50",
      title: "بياناتك المدنية «غير مؤكدة»",
      text: `أرسلت تصحيحاً (${fields}) مع ${claim.doc.kind}. يراجعه موظف التسجيل، ويظهر قراره هنا. حتى ذلك الحين تبقى هذه الحقول كما في السجل المدني.`,
    },
    approved: {
      icon: CheckCircle2,
      cls: "bg-green-light/12 ring-green-light/40",
      title: "اعتُمد تصحيح بياناتك",
      text: `${fields}. ${claim.decision?.note ?? ""}`,
    },
    rejected: {
      icon: Ban,
      cls: "bg-maroon/8 ring-maroon/30",
      title: "لم يُعتمد تصحيح بياناتك",
      text: `السبب: ${claim.decision?.note ?? ""} تبقى بياناتك كما في السجل المدني، ويمكنك مراجعة مكتب التسجيل في محافظتك ومعك الوثائق الأصلية.`,
    },
  }[claim.status];
  return (
    <div role="status" className={cn("flex items-start gap-3 rounded-[1.5rem] p-5 ring-1", view.cls)}>
      <view.icon className={cn("mt-1 size-6 shrink-0", claim.status === "rejected" ? "text-maroon" : claim.status === "approved" ? "text-green" : "text-gold-dark")} />
      <div>
        <p className="font-display text-lg font-bold text-ink">{view.title}</p>
        <p className="mt-1 leading-7 text-ink-soft">{view.text}</p>
        {claim.decision && <p className="mt-1 text-xs text-hint">قرار {claim.decision.by}</p>}
      </div>
    </div>
  );
}
