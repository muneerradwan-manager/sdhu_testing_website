"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { BadgeCheck, ExternalLink, FileClock, Inbox, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { useClusters } from "@/lib/cms/content";
import { diffFields, fieldsOf } from "@/lib/cluster-profile";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Empty, Gate, Kpi, PageHeader, Panel, fmtDateTime, logAs, textareaClass, useStaffUser } from "../_components/kit";

const CHIP = {
  green: "bg-green-light/25 text-white ring-green-light/40",
  gold: "bg-gold/20 text-gold ring-gold/40",
  maroon: "bg-maroon/40 text-white ring-maroon/60",
} as const;

function Chip({ tone = "gold", children }: { tone?: keyof typeof CHIP; children: React.ReactNode }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", CHIP[tone])}>{children}</span>;
}

const REASONS = ["الوصف لا يطابق العقد الموقّع مع الفندق", "المسافة المذكورة غير دقيقة", "خدمة موصوفة دون تعاقد يثبتها", "صياغة دعائية لا تصف خدمة"];

/**
 * A cluster's public page carries the administration's approval, so the head writes his programme and
 * the administration decides. This is that queue: what changed, from what to what, and a decision with
 * a reason. Nothing reaches the pilgrims before it is approved.
 */
export function ClusterProfilesView() {
  return (
    <Gate perms={["groups.approve", "content.manage"]}>
      <ClusterProfiles />
    </Gate>
  );
}

function ClusterProfiles() {
  const user = useStaffUser()!;
  const toast = useToast();
  const clusters = useClusters();
  const profiles = useStore((s) => s.clusterProfiles);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState(REASONS[0]);

  const rows = clusters
    .map((c) => ({ cluster: c, state: profiles[c.slug] }))
    .filter((r) => r.state?.pending || r.state?.approved || r.state?.rejected);
  const pending = rows.filter((r) => r.state?.pending);
  const published = rows.filter((r) => r.state?.approved);

  const decide = (slug: string, name: string, decision: "approved" | "rejected", why?: string) => {
    actions.decideClusterProfile(slug, decision, user.name, why);
    logAs(user, {
      action: decision === "approved" ? "اعتماد برنامج تكتل ونشره للحجاج" : "إعادة برنامج تكتل إلى رئيسه",
      target: name,
      detail: why,
    });
    toast(
      decision === "approved"
        ? { title: "اعتُمد البرنامج ونُشر", body: `${name} — يراه الحجاج الآن في دليل الخدمات.`, tone: "success", icon: "✅" }
        : { title: "أُعيد إلى رئيس التكتل", body: why, tone: "info", icon: "↩️" },
    );
    setRejecting(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="دليل الخدمات"
        icon={<ShieldCheck />}
        title="برامج التكتلات"
        description="صفحة كل تكتل في دليل الخدمات يكتبها رئيسه، لأنه من تعاقد على الفنادق والنقل والإعاشة. وتحمل الصفحة ختم «معتمد من الإدارة»، فلا يصل أي تعديل إلى الحجاج قبل أن تعتمده هنا."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="بانتظار الاعتماد" value={pending.length} icon={<Inbox />} tone="gold" pulse={pending.length > 0} hint="تعديلات أرسلها رؤساء التكتلات" />
        <Kpi label="برامج منشورة" value={published.length} icon={<BadgeCheck />} tone="teal" delay={0.05} hint="يراها الحجاج الآن" />
        <Kpi label="تكتلات الدليل" value={clusters.length} icon={<ShieldCheck />} delay={0.1} hint="المعتمدة لموسم 1448" />
        <Kpi label="أُعيدت لأصحابها" value={rows.filter((r) => r.state?.rejected).length} icon={<FileClock />} tone="maroon" delay={0.15} hint="بانتظار تعديل رئيس التكتل" />
      </div>

      <Panel icon={<Inbox />} title="تعديلات بانتظار قرارك" action={<Chip tone={pending.length ? "gold" : "green"}>{pending.length}</Chip>}>
        {pending.length === 0 ? (
          <Empty icon={<BadgeCheck />} title="لا تعديلات معلّقة" text="حين يعدّل رئيس تكتل صفحته العامة يصل التعديل هنا قبل أن يراه أحد." />
        ) : (
          <ul className="space-y-4">
            {pending.map(({ cluster: c, state }, i) => {
              const live = state!.approved ? { ...fieldsOf(c), ...state!.approved.fields } : fieldsOf(c);
              const changes = diffFields(live, state!.pending!.fields);
              return (
                <motion.li key={c.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-xl font-bold text-white">{c.name}</p>
                      <p className="text-xs text-white/65">
                        أرسله {state!.pending!.by} — {fmtDateTime(state!.pending!.at)} — {changes.length} حقلاً
                      </p>
                      {state!.pending!.note && <p className="mt-1 text-sm text-gold">ملاحظته: {state!.pending!.note}</p>}
                    </div>
                    <Link href={`/verify/clusters/${c.slug}`} target="_blank" className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/20">
                      <ExternalLink className="size-3.5" /> الصفحة الحالية
                    </Link>
                  </div>

                  <ul className="mt-3 space-y-2">
                    {changes.map((ch) => (
                      <li key={ch.key} className="rounded-xl bg-white/5 p-3 text-sm ring-1 ring-white/10">
                        <p className="font-bold text-gold">{ch.label}</p>
                        <p className="mt-1 text-white/50 line-through">{ch.before || "—"}</p>
                        <p className="font-semibold text-white">{ch.after || "—"}</p>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="gold" onClick={() => decide(c.slug, c.name, "approved")}>
                      <BadgeCheck className="size-4" /> اعتماد ونشر
                    </Button>
                    <Button size="sm" variant="outline" className="border-white/25 text-white hover:bg-maroon/40" onClick={() => setRejecting(c.slug)}>
                      <X className="size-4" /> إعادة مع السبب
                    </Button>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </Panel>

      {published.length > 0 && (
        <Panel icon={<BadgeCheck />} title="البرامج المنشورة" action={<Chip tone="green">{published.length}</Chip>}>
          <ul className="grid gap-3 md:grid-cols-2">
            {published.map(({ cluster: c, state }) => (
              <li key={c.slug} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="font-bold text-white">{c.name}</p>
                <p className="mt-1 text-xs text-white/65">
                  اعتمده {state!.approved!.approvedBy} — {fmtDateTime(state!.approved!.approvedAt)}
                </p>
                <p className="mt-1 text-xs text-white/50">كتبه {state!.approved!.by}</p>
                <Link href={`/verify/clusters/${c.slug}`} target="_blank" className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-gold">
                  <ExternalLink className="size-3.5" /> الصفحة كما يراها الحاج
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Modal open={!!rejecting} onClose={() => setRejecting(null)}>
        {rejecting && (
          <div>
            <h3 className="font-display text-2xl font-bold text-green-dark">إعادة البرنامج إلى رئيس التكتل</h3>
            <p className="mt-1 text-sm text-ink-soft">يصل السبب إليه ليعدّل ويعيد الإرسال. الصفحة تبقى على نسختها المعتمدة.</p>
            <div className="mt-4 space-y-2">
              {REASONS.map((r) => (
                <label key={r} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-sm font-semibold", reason === r ? "border-maroon bg-maroon/5" : "border-gold/40")}>
                  <input type="radio" name="why" checked={reason === r} onChange={() => setReason(r)} className="accent-maroon" /> {r}
                </label>
              ))}
              <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} aria-label="سبب الإعادة" className={cn(textareaClass, "text-ink")} />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setRejecting(null)}>
                إلغاء
              </Button>
              <Button variant="maroon" onClick={() => decide(rejecting, clusters.find((c) => c.slug === rejecting)?.name ?? "", "rejected", reason)}>
                إعادة مع السبب
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
