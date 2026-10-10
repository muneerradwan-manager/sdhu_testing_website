"use client";

import Link from "next/link";
import { BadgeCheck, Building2, Contact, Funnel, GraduationCap, Gauge, Layers, ListChecks, Mails, Megaphone, ScrollText, UsersRound } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { classify, type TierResult } from "@/lib/grading";
import { useGraded } from "@/lib/grading-live";
import { groupName } from "@/lib/groups";
import { useSeason } from "@/lib/season-live";
import { useStore } from "@/lib/store";
import { SYSTEMS, useHolders } from "@/lib/systems";
import { cn, formatNumber, formatUSD } from "@/lib/utils";
import { useStructure } from "@/app/administrator/_lib/structure";
import { useAdminCalendar, useCommitments, useEvaluationStages } from "@/app/administrator/_lib/admin-rules";
import { presenceOf } from "@/app/administrator/_lib/cadre";
import { useFormingSeason } from "@/app/administrator/_lib/formation";
import { letterState, useLetters } from "@/app/administrator/_lib/letters";
import { ago, fmtDate, fmtDateTime, Kpi, PageHeader, Panel, useNow, useStaffUser } from "../_components/kit";
import { Chip } from "../_components/ops-ui";
import { Escalate, Todo, useSystemEvents } from "../_components/system";
import { Box, HowItWorks } from "../_components/wp";
import { FunnelTable } from "./_components/applicants";
import { useCadreRows } from "./_components/cadre";
import { StageCoverage } from "./_components/evaluation";
import { useAdminsDesk } from "./desk";

const M = SYSTEMS.admins.manage.href;

/**
 * The dashboard of whoever holds «إدارة الإداريين»: numbers only. How the work goes, in four steps each a link
 * to where it is done; the season's administrators in four numbers; what waits for him, each item one click from
 * the page it is done in; then, in the order the work is done, where each part stands. Nothing is edited here:
 * the work and each part's records are in the file's operations, in the menu.
 */
export function AdminsSummary() {
  const user = useStaffUser()!;
  // His grant of the permission: by whom and since when
  const grant = useHolders().admins.find((h) => h.staffId === user.id);
  const desk = useAdminsDesk();
  const season = useSeason();
  const grading = useStore((s) => s.grading);
  const requirementsEdited = useStore((s) => !!s.adminRules.requirements);
  const presence = useStore((s) => s.presence);
  const now = useNow(30_000);
  const commitments = useCommitments();
  const stages = useEvaluationStages();
  const calendar = useAdminCalendar();
  const [escalating, setEscalating] = useState(false);
  const s = useStructure();
  const closed = s.roles.filter((r) => r.applied && !r.active);
  const appliedTotal = s.roles.filter((r) => r.applied).length;
  const atHeads = desk.groups.filter((x) => x.state === "unpaid" || x.state === "returned").length;
  const cadre = useCadreRows();
  const online = cadre.filter((r) => presenceOf(r.id, presence, now).online).length;
  const formingSeason = useFormingSeason();
  const letters = useLetters();
  const gradedGroups = useGraded("groups");
  const gradedClusters = useGraded("clusters");
  const shares = { promoteShare: season.grading.promoteShare, demoteShare: season.grading.demoteShare, honorTop: season.grading.honorTop };
  const tierSplit = useMemo(
    () => ({ groups: classify(gradedGroups, shares), clusters: classify(gradedClusters, shares) }),
    [gradedGroups, gradedClusters, shares.promoteShare, shares.demoteShare, shares.honorTop], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`صلاحيتك: ${SYSTEMS.admins.label}${grant?.by ? ` — منحتك إياها ${grant.by}` : ""}${grant?.at ? ` في ${fmtDate(grant.at)}` : ""}`}
        title={SYSTEMS.admins.summary.label}
        icon={<Gauge />}
        description="أرقام الإداريين هذا الموسم وما ينتظرك. العمل نفسه في عمليات الملف من القائمة الجانبية."
        actions={
          <Button size="sm" variant="glass" onClick={() => setEscalating(true)}>
            <Megaphone className="size-4" /> رفع أمر إلى المدير
          </Button>
        }
      />

      <HowItWorks
        steps={[
          { title: "جهّز القواعد", text: "المواعيد والصلاحيات وشروط الصفات، والقوائم المرجعية، قبل أن يتقدم أحد.", href: M, link: "قواعد الإداريين" },
          { title: "تابع المتقدمين", text: "ملفاتهم ووثائقهم، ثم شكّل مجموعة كل رئيس مجموعة مؤهل في المكتب.", href: `${M}/groups`, link: "تشكيل المجموعات" },
          { title: "راجع التكتلات", text: "اعتمد كل طلب تكتل أو أعده بملاحظات، ثم برامج التكتلات.", href: `${M}/clusters`, link: "طلبات التكتلات" },
          { title: "قيّم وصنّف", text: "قيّم من عمل مرحلةً مرحلة، ثم اعتمد التصنيف وانشره في ختام الموسم.", href: `${M}/evaluation`, link: "التقييم" },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="المتقدمون" value={desk.totals.applied} icon={<UsersRound />} hint={`${formatNumber(desk.totals.paid)} سددوا الرسم${desk.noRole ? ` · ${desk.noRole} لم يختاروا صفة` : ""}`} />
        <Kpi label="مؤهَّلون للعمل" value={desk.totals.qualified} icon={<GraduationCap />} tone="teal" delay={0.05} hint={`${desk.totals.passed} نجحوا · ${desk.totals.exempt} بالتجديد دون اختبار`} />
        <Kpi label="مجموعات معتمدة" value={desk.approved.length} icon={<BadgeCheck />} tone="maroon" delay={0.1} pulse={desk.waiting.length > 0} hint={desk.waiting.length ? `${desk.waiting.length} طلبات تنتظر قرارك` : `من ${desk.groups.length} طلبات تشكيل`} />
        <Kpi label="تكتلات معتمدة" value={desk.approvedClusters.length} icon={<Building2 />} tone="gold" delay={0.15} hint={`من ${desk.live.length} طلبات تشكيل`} />
      </div>

      <Todo alerts={desk.alerts} empty="الصفات مفتوحة، وطلبات المجموعات والتكتلات مراجَعة، ولا مجموعة خارج التكتلات، ولا برنامج أو تقييم معلّق." />

      {/* In the order the work is done: the rules, who applied, the groups, the clusters, the evaluation, the classification */}
      <Panel icon={<ScrollText />} title="القواعد" action={<ManageLink href={M} />}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Stat k="الصفات المفتوحة للتقدم" v={`${desk.openRoles.length} من ${appliedTotal}`} tone={desk.openRoles.length ? undefined : "maroon"} />
          <Stat k="الالتزامات" v={commitments.length} />
          <Stat k="شروط الصفات" v={requirementsEdited ? "معدَّلة" : "الافتراضية"} />
          <Stat k="مراحل التقييم" v={stages.length} />
          <Stat k="مواعيد الرزنامة" v={calendar.length} />
        </div>
        <p className="mt-3 text-xs leading-6 text-white/60">
          {desk.rulesEdited ? `عُدّل ${desk.rulesEdited} من قواعد الموسم` : "القواعد كما تطلقها المنصة"}
          {closed.length ? ` · معطّلة: ${closed.map((r) => r.name).join("، ")}` : ""} · من «إعدادات الموسم»: رسم التسجيل {formatUSD(season.fees.administratorRegistration)}، والتشكيل {formatUSD(season.fees.groupFormation)}، وإنشاء التكتل {formatUSD(season.fees.clusterFormation)}.
        </p>
      </Panel>

      <Panel icon={<Contact />} title="الكادر الإداري والمراجع" action={<ManageLink href={`${M}/cadre`} />}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <Stat k="الكادر" v={cadre.filter((r) => r.status?.state !== "deleted").length} />
          <Stat k="في تكتلات معتمدة" v={cadre.filter((r) => r.place).length} tone="green" />
          <Stat k="حسابات موقوفة" v={cadre.filter((r) => r.status?.state === "disabled").length} tone={cadre.some((r) => r.status?.state === "disabled") ? "maroon" : undefined} />
          <Stat k="مربوطون بتيليجرام" v={cadre.filter((r) => r.chatId).length} />
          <Stat k="متصلون الآن" v={online} tone={online ? "green" : undefined} />
          <Stat k="خطط تشغيلية تنتظر قرارك" v={desk.plansWaiting.length} tone={desk.plansWaiting.length ? "gold" : undefined} />
        </div>
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
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <Stat k="الطلبات" v={desk.live.length} />
          <Stat k="مسودات" v={desk.drafts.length} />
          <Stat k="قيد المراجعة" v={desk.sent.length + desk.reviewing.length} tone={desk.sent.length + desk.reviewing.length ? (desk.deadlinePassed ? "maroon" : "gold") : undefined} />
          <Stat k="معتمدة" v={desk.approvedClusters.length} tone="green" />
          <Stat k="أُعيدت بملاحظات" v={desk.rejected.length} />
          <Stat k="برامج تنتظر اعتمادك" v={desk.pendingProgrammes.length} tone={desk.pendingProgrammes.length ? "gold" : undefined} />
        </div>
        {desk.outside.length > 0 && <p className="mt-3 text-xs font-bold text-gold">{desk.outside.length} مجموعات معتمدة خارج كل تكتل.</p>}
      </Panel>

      <Panel icon={<Mails />} title="التكتلات والمجموعات والمراسلات" action={<ManageLink href={`${M}/letters`} />}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <Stat k="الموسم الحالي" v={formingSeason} />
          <Stat k="تشكيلات مؤرشفة" v={desk.archivedClusters.length} />
          <Stat k="مراسلات غير مقروءة" v={desk.unreadLetters.length} tone={desk.unreadLetters.length ? "gold" : undefined} />
          <Stat k="مراسلات بلا رد" v={desk.waitingLetters.length} tone={desk.waitingLetters.length ? "gold" : undefined} />
          <Stat k="تم الرد عليها" v={letters.filter((l) => letterState(l) === "answered").length} />
          <Stat k="مغلقة" v={letters.filter((l) => letterState(l) === "closed").length} />
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
              <TierSplit tiers={label === "المجموعات" ? tierSplit.groups : tierSplit.clusters} />
            </div>
          ))}
        </div>
      </Panel>

      <RaisedBox onRaise={() => setEscalating(true)} />

      <Escalate system="admins" open={escalating} onClose={() => setEscalating(false)} example="مثال: طلب تكتل أُعيد بملاحظات قبل الموعد النهائي بيوم، ورئيسه يطلب مهلة يومين ليستبدل منسقاً. نحتاج قراراً قبل إغلاق الطلبات." />
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

/** Each tier of the classification as one bar: promoted, holding, moved down */
function TierSplit({ tiers }: { tiers: TierResult[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {tiers.map((t) => (
        <li key={t.tier}>
          <p className="flex flex-wrap justify-between gap-2 text-xs text-white/70">
            <span className="font-bold text-white">{t.label}</span>
            <span>
              <b className="text-green-light">{t.promoteCount}</b> ترقية · <b className="text-gold">{t.holdCount}</b> ثبات · <b className="text-[#ffb4c8]">{t.demoteCount}</b> {t.tier === 1 ? "إنذار" : "تخفيض"}
            </span>
          </p>
          <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`توزيع ${t.label}`}>
            <span className="bg-green-light" style={{ width: `${(t.promoteCount / (t.total || 1)) * 100}%` }} />
            <span className="bg-gold/70" style={{ width: `${(t.holdCount / (t.total || 1)) * 100}%` }} />
            <span className="bg-maroon" style={{ width: `${(t.demoteCount / (t.total || 1)) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** What he raised to the director, closed at the end of the dashboard until it is wanted */
function RaisedBox({ onRaise }: { onRaise: () => void }) {
  const user = useStaffUser()!;
  const raised = useSystemEvents("admins", true).filter((e) => e.action === "رفع أمر إلى المدير" && e.actor === user.name);
  const now = useNow(30_000);
  return (
    <Box title={`ما رفعته إلى مديرة الموسم (${raised.length})`} open={false}>
      {raised.length === 0 ? (
        <p className="text-white/65">ما لا تحسمه وحدك — طلب تكتل يحتاج استثناء، رسم يحتاج مراجعة، قرار خارج القواعد — ارفعه إليها، فيظهر عندها طلبَ تدخّل.</p>
      ) : (
        <ol className="space-y-2">
          {raised.slice(0, 5).map((e) => (
            <li key={e.id} className="rounded-xl bg-white/[.05] p-3 ring-1 ring-white/10">
              <p className="leading-6 text-white">{e.detail}</p>
              <p className="mt-1 text-[11px] text-white/50">{e.live ? ago(e.at, now) : fmtDateTime(e.at)}</p>
            </li>
          ))}
        </ol>
      )}
      <button type="button" onClick={onRaise} className="text-sm font-bold text-gold hover:underline">
        رفع أمر جديد
      </button>
    </Box>
  );
}
