"use client";

import Link from "next/link";
import { ArrowLeft, BadgeCheck, Building2, Funnel, Gauge, GraduationCap, Layers, ListChecks, Megaphone, ScrollText, UsersRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { groupName } from "@/lib/groups";
import { useSeason } from "@/lib/season-live";
import { useStore } from "@/lib/store";
import { SYSTEMS, useHolders } from "@/lib/systems";
import { cn, formatNumber, formatUSD } from "@/lib/utils";
import { APPLIED_ROLES } from "@/app/administrator/_lib/admin";
import { useAdminCalendar, useCommitments, useEvaluationStages } from "@/app/administrator/_lib/admin-rules";
import { fmtDate, fmtDateTime, Kpi, PageHeader, Panel, useStaffUser } from "../_components/kit";
import { Chip } from "../_components/ops-ui";
import { Escalate, Raised, Todo } from "../_components/system";
import { FunnelTable } from "./_components/applicants";
import { StageCoverage } from "./_components/evaluation";
import { useAdminsDesk } from "./desk";

const M = SYSTEMS.admins.manage.href;

/**
 * The dashboard of whoever holds «إدارة الإداريين», in place of a general «لوحتي»: the season's
 * administrators in four numbers, what waits for him — each item one click from the tab it is done in —
 * then, in the order the work is done, where each part stands: the rules, the applicants role by role,
 * the groups, the cluster requests, the evaluation and the classification. The records stay in
 * the management tabs.
 */
export function AdminsSummary() {
  const user = useStaffUser()!;
  // His grant of the permission: by whom and since when
  const grant = useHolders().admins.find((h) => h.staffId === user.id);
  const desk = useAdminsDesk();
  const season = useSeason();
  const grading = useStore((s) => s.grading);
  const requirementsEdited = useStore((s) => !!s.adminRules.requirements);
  const commitments = useCommitments();
  const stages = useEvaluationStages();
  const calendar = useAdminCalendar();
  const [escalating, setEscalating] = useState(false);
  const closed = APPLIED_ROLES.filter((r) => !desk.openRoles.includes(r));
  const atHeads = desk.groups.filter((x) => x.state === "unpaid" || x.state === "returned").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`صلاحيتك: ${SYSTEMS.admins.label}${grant?.by ? ` — منحتك إياها ${grant.by}` : ""}${grant?.at ? ` في ${fmtDate(grant.at)}` : ""}`}
        title={SYSTEMS.admins.summary.label}
        icon={<Gauge />}
        description="حال الإداريين الموسميين الآن، وما ينتظرك فيهم. العمل نفسه وسجلّ كل جزء في «إدارة الإداريين». ولا يصل إلى مديرة الموسم إلا ما يعطّل العمل، وفتح الصفات وإغلاقها، وحسم طلبات التكتلات عند موعدها وتوزيع المجموعات، ونشر التصنيف، وما ترفعه إليها."
        actions={
          <>
            <Button size="sm" variant="glass" onClick={() => setEscalating(true)}>
              <Megaphone className="size-4" /> رفع أمر إلى المدير
            </Button>
            <ButtonLink href={M} size="sm" variant="gold">
              {SYSTEMS.admins.manage.label} <ArrowLeft className="size-4" />
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="المتقدمون" value={desk.totals.applied} icon={<UsersRound />} hint={`${formatNumber(desk.totals.paid)} سددوا الرسم${desk.noRole ? ` · ${desk.noRole} لم يختاروا صفة` : ""}`} />
        <Kpi label="مؤهَّلون للعمل" value={desk.totals.qualified} icon={<GraduationCap />} tone="teal" delay={0.05} hint={`${desk.totals.passed} نجحوا · ${desk.totals.exempt} بالتجديد دون امتحان`} />
        <Kpi label="مجموعات معتمدة" value={desk.approved.length} icon={<BadgeCheck />} tone="maroon" delay={0.1} pulse={desk.waiting.length > 0} hint={desk.waiting.length ? `${desk.waiting.length} طلبات تنتظر قرارك` : `من ${desk.groups.length} طلبات تشكيل`} />
        <Kpi label="تكتلات معتمدة" value={desk.approvedClusters.length} icon={<Building2 />} tone="gold" delay={0.15} hint={`من ${desk.requests.length} طلبات تشكيل`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Todo alerts={desk.alerts} empty="الصفات مفتوحة، والطلبات مبتوت فيها، ولكل تكتل منشأ معاونه، ولا برنامج أو تقييم معلّق." />
        <Raised system="admins" onRaise={() => setEscalating(true)} hint="ما لا تحسمه وحدك — طلب تكتل يحتاج استثناء، رسم يحتاج مراجعة، قرار خارج القواعد — ارفعه إلى مديرة الموسم، فيظهر عندها طلبَ تدخّل." />
      </div>

      {/* In the order the work is done: the rules, who applied, the groups, the clusters, the evaluation, the classification */}
      <Panel icon={<ScrollText />} title="القواعد" action={<ManageLink href={M} />}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Stat k="الصفات المفتوحة" v={`${desk.openRoles.length} من ${APPLIED_ROLES.length}`} tone={desk.openRoles.length ? undefined : "maroon"} />
          <Stat k="الالتزامات" v={commitments.length} />
          <Stat k="شروط الصفات" v={requirementsEdited ? "معدَّلة" : "الافتراضية"} />
          <Stat k="مراحل التقييم" v={stages.length} />
          <Stat k="مواعيد الرزنامة" v={calendar.length} />
        </div>
        <p className="mt-3 text-xs leading-6 text-white/60">
          {desk.rulesEdited ? `عُدّل ${desk.rulesEdited} من قواعد الموسم` : "القواعد كما تطلقها المنصة"}
          {closed.length ? ` · مغلقة: ${closed.map((r) => r.label).join("، ")}` : ""} · من «إعدادات الموسم»: رسم التسجيل {formatUSD(season.fees.administratorRegistration)}، والتشكيل {formatUSD(season.fees.groupFormation)}، وإنشاء التكتل {formatUSD(season.fees.clusterFormation)}.
        </p>
      </Panel>

      <Panel icon={<Funnel />} title="المتقدمون صفةً صفة" action={<ManageLink href={`${M}/applicants`} />} bodyClass="-mx-5 md:-mx-6">
        <FunnelTable funnel={desk.funnel} totals={desk.totals} />
        {desk.flaggedFiles.length > 0 && (
          <p className="mt-3 px-5 text-xs font-bold text-gold md:px-6">
            {desk.flaggedFiles.length} ملفات ممن سددوا الرسم ينقصها ما تطلبه صفاتهم أو انتهى. <Link href={`${M}/applicants?f=docs`} className="underline">راجعها</Link>
          </p>
        )}
      </Panel>

      <Panel icon={<BadgeCheck />} title="المجموعات" action={<ManageLink href={`${M}/groups`} />}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat k="تنتظر قرارك" v={desk.waiting.length} tone={desk.waiting.length ? "gold" : undefined} />
          <Stat k="عند رؤسائها" v={atHeads} />
          <Stat k="معتمدة" v={desk.approved.length} tone="green" />
          <Stat k="لم تنضم إلى تكتل" v={desk.outside.length} />
        </div>
        {desk.waiting.length > 0 && (
          <ul className="mt-3 space-y-2">
            {desk.waiting.slice(0, 4).map((x) => (
              <li key={x.g.number} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/[.06] px-3 py-2 text-sm ring-1 ring-white/10">
                <span className="min-w-0 flex-1 font-bold text-white">
                  {groupName(x.g.number)} — {x.row.name}
                </span>
                <Chip tone={x.complete ? "green" : "gold"}>{x.complete ? "مكتملة الشروط" : "ناقصة"}</Chip>
                <span className="text-xs text-white/60">قُدّمت {fmtDateTime(x.g.requestedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel icon={<Building2 />} title="طلبات تشكيل التكتلات" action={<ManageLink href={`${M}/clusters`} />}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat k="طلبات التشكيل" v={desk.requests.length} />
          <Stat k="مكتملة الآن" v={desk.requests.filter((r) => r.complete).length} tone="green" />
          <Stat k={desk.deadlinePassed ? "تنتظر قرارك" : "معتمدة"} v={desk.deadlinePassed ? desk.undecided.length : desk.approvedClusters.length} tone={desk.deadlinePassed && desk.undecided.length ? "maroon" : undefined} />
          <Stat k="برامج تنتظر اعتمادك" v={desk.pendingProgrammes.length} tone={desk.pendingProgrammes.length ? "gold" : undefined} />
        </div>
      </Panel>

      <Panel icon={<ListChecks />} title="التقييم" action={<ManageLink href={`${M}/evaluation`} />}>
        <p className="mb-3 text-sm text-white/70">
          قُيّم {desk.evaluated.length} من {desk.toEvaluate.length} ممن تأهّلوا للعمل هذا الموسم.
        </p>
        <StageCoverage coverage={desk.coverage} />
      </Panel>

      <Panel
        icon={<Layers />}
        title="التصنيف"
        action={
          <span className="flex flex-wrap items-center gap-2">
            {grading.publishedAt ? <Chip tone="green">منشور — {grading.publishedBy}</Chip> : <Chip tone="gold">لم يُنشر</Chip>}
            {desk.stale && <Chip tone="maroon">تقييمات بعد نشره</Chip>}
            <ManageLink href={`${M}/grading`} />
          </span>
        }
      >
        <div className="grid gap-2 md:grid-cols-2">
          {(
            [
              ["المجموعات", "مجموعة", desk.classified.groups],
              ["التكتلات", "تكتلاً", desk.classified.clusters],
            ] as const
          ).map(([label, unit, c]) => (
            <div key={label} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <p className="font-bold text-white">{label}</p>
              <p className="mt-1 text-sm text-white/70">
                {formatNumber(c.total)} {unit} في {c.tiers} فئات — <b className="text-green-light">{c.up} ترقية</b> و<b className="text-gold">{c.down} تخفيض</b>
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Escalate system="admins" open={escalating} onClose={() => setEscalating(false)} example="مثال: طلب تكتل ينقصه معاون واحد عند الموعد النهائي ورئيسه يطلب مهلة يومين. نحتاج قراراً قبل توزيع المجموعات." />
    </div>
  );
}

function ManageLink({ href }: { href: string }) {
  return (
    <Link href={href} className="text-sm font-bold text-gold hover:underline">
      إدارتها
    </Link>
  );
}

/** One number of a part, with what it counts */
function Stat({ k, v, tone }: { k: string; v: ReactNode; tone?: "green" | "gold" | "maroon" }) {
  return (
    <div className={cn("rounded-2xl p-3 ring-1", tone === "maroon" ? "bg-maroon/20 ring-maroon/50" : "bg-white/[.06] ring-white/10")}>
      <p className="text-xs text-white/65">{k}</p>
      <p className={cn("mt-0.5 font-display text-xl font-bold tabular-nums", tone === "green" ? "text-green-light" : tone === "gold" ? "text-gold" : "text-white")}>{v}</p>
    </div>
  );
}
