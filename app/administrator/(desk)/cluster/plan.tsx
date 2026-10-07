"use client";

import Link from "next/link";
import { ClipboardList, Paperclip, Send } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { actions, useStore } from "@/lib/store";
import { nowMs } from "@/lib/utils";
import { logAdmin, useAdmin } from "../../_lib/admin";
import type { ClusterRequest } from "../../_lib/formation";
import { SectionTitle } from "../../_components/ui";

const STATE = {
  submitted: { label: "تنتظر قرار الإدارة", tone: "gold" as const },
  accepted: { label: "مقبولة", tone: "green" as const },
  returned: { label: "أُعيدت بملاحظات", tone: "maroon" as const },
};

const when = (at: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(at);

/**
 * «الخطة التشغيلية»: the head of an approved cluster files his cluster's plan — its housing, transport, meals,
 * dispatch, stages of work and emergencies — with its file. The administration accepts it or sends it back with
 * notes; he fixes and files it again. His deputy reads it.
 */
export function PlanStep({ req, editable }: { req: ClusterRequest; editable: boolean }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const plan = useStore((s) => s.plans[req.cluster.id]);
  const [title, setTitle] = useState(plan?.title ?? `الخطة التشغيلية ل${req.cluster.name}`);
  const [summary, setSummary] = useState(plan?.summary ?? "");
  const [file, setFile] = useState(plan?.file ?? "");
  const canFile = editable && plan?.status !== "submitted" && plan?.status !== "accepted";
  const submit = () => {
    actions.setPlan(req.cluster.id, { clusterId: req.cluster.id, clusterName: req.cluster.name, headId: req.headId, headName: req.headName, title: title.trim(), summary: summary.trim(), file, at: nowMs(), status: "submitted" });
    logAdmin(admin.id, plan ? `إعادة تقديم الخطة التشغيلية ل${req.cluster.name}` : `تقديم الخطة التشغيلية ل${req.cluster.name}`, undefined, file, { area: "clusters", ref: req.cluster.id });
    toast({ title: "قُدّمت الخطة", body: "تصل إدارة الإداريين في «المراجع الإدارية»، ويصلك قرارها هنا وفي الإشعارات.", tone: "success", icon: "📋" });
  };
  return (
    <Card className="md:p-8">
      <SectionTitle icon={ClipboardList} action={plan ? <Badge tone={STATE[plan.status].tone}>{STATE[plan.status].label}</Badge> : undefined}>
        الخطة التشغيلية
      </SectionTitle>
      <p className="mt-3 leading-8 text-ink-soft">
        خطة التكتل للموسم: السكن، والنقل، والإعاشة، والتفويج، وتوزيع الكادر على مراحل العمل، والطوارئ. ما تتضمنه في{" "}
        <Link href="/administrator/plans" className="font-bold text-green-dark underline">
          صفحة الخطط التشغيلية
        </Link>
        .
      </p>
      {plan && (
        <div className="mt-5 rounded-2xl bg-sand p-4">
          <p className="font-bold text-ink">{plan.title}</p>
          <p className="text-xs text-hint">
            قُدّمت {when(plan.at)} — 📎 {plan.file}
          </p>
          <p className="mt-2 whitespace-pre-line leading-8 text-ink-soft">{plan.summary}</p>
          {plan.decision && (
            <p className={plan.status === "returned" ? "mt-3 rounded-xl bg-maroon/10 p-3 text-sm leading-7 text-maroon" : "mt-3 text-sm text-green"}>
              {plan.status === "accepted" ? `قبلتها الإدارة (${plan.decision.by}، ${when(plan.decision.at)}).` : `أعادتها الإدارة (${plan.decision.by}): ${plan.decision.note}`}
            </p>
          )}
        </div>
      )}
      {canFile ? (
        <div className="mt-5 space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="عنوان الخطة" className="h-12 w-full rounded-2xl border-2 border-gold/40 px-4 outline-none focus:border-green-light" />
          <textarea rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} aria-label="خلاصة الخطة" placeholder="خلاصة الخطة: الفنادق ومسافاتها، النقل، الإعاشة، التفويج، توزيع الكادر على المراحل، الطوارئ…" className="w-full rounded-2xl border-2 border-gold/40 p-4 leading-8 outline-none focus:border-green-light" />
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-dashed border-gold/50 px-4 py-3 text-sm font-bold text-green-dark hover:bg-sand">
            <Paperclip className="size-4" /> {file || "ملف الخطة (PDF أو Word)"}
            <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? file)} />
          </label>
          <Button disabled={title.trim().length < 3 || summary.trim().length < 20 || !file} onClick={submit}>
            <Send className="size-4" /> {plan?.status === "returned" ? "إعادة تقديم الخطة" : "تقديم الخطة"}
          </Button>
        </div>
      ) : (
        !plan && <p className="mt-5 rounded-2xl bg-sand p-4 text-sm text-ink-soft">لم يقدّم رئيس التكتل الخطة بعد.</p>
      )}
    </Card>
  );
}
