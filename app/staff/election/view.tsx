"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { BadgeCheck, Building2, Crown, Lock, Megaphone, Settings2, UserCheck, Vote } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { SEASON } from "@/lib/season";
import { useSeason } from "@/lib/season-live";
import { actions, useStore, type AdminProfile } from "@/lib/store";
import { cn, formatNumber, formatUSD } from "@/lib/utils";
import { adminName, candidacy, lastServed, seasonHistory } from "@/app/administrator/_lib/admin";
import { HEADS_POOL } from "@/app/administrator/_lib/cluster";
import { Empty, Gate, Kpi, PageHeader, Panel, fmtDateTime, logAs, useStaffUser } from "../_components/kit";

const CHIP = {
  green: "bg-green-light/25 text-white ring-green-light/40",
  gold: "bg-gold/20 text-gold ring-gold/40",
  maroon: "bg-maroon/40 text-white ring-maroon/60",
} as const;

function Chip({ tone = "gold", children }: { tone?: keyof typeof CHIP; children: React.ReactNode }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", CHIP[tone])}>{children}</span>;
}

type Candidate = { id: string; name: string; group: number; seasons: number; rating: number | null; votes: number; real: boolean };

/**
 * The administration runs the cluster election. It decides how many clusters the season has and what
 * it takes to stand (both in the season settings), opens candidacy, watches the group heads vote, then
 * closes the vote and announces the heads. Nobody applies for the role, and the administration does
 * not pick the winners: it only opens, closes and announces.
 */
export function ElectionView() {
  return (
    <Gate perms={["season.settings", "groups.approve"]}>
      <Election />
    </Gate>
  );
}

function Election() {
  const user = useStaffUser()!;
  const toast = useToast();
  const season = useSeason();
  const election = useStore((s) => s.election);
  const admins = useStore((s) => s.admins);
  const rules = season.administrators;

  const candidates = useMemo<Candidate[]>(() => {
    const real = Object.values(admins)
      .filter((a) => a.candidate && a.positions[0] === "group-head")
      .map((a) => ({
        id: a.nationalId,
        name: adminName(a.nationalId),
        group: a.group?.number ?? 0,
        seasons: seasonHistory(a.nationalId).filter((h) => h.roleKey === "group-head").length,
        rating: lastServed(a.nationalId)?.rating ?? null,
        votes: Object.values(admins).filter((v) => v.vote === a.nationalId).length,
        real: true,
      }));
    const seeded = HEADS_POOL.filter((s) => s.candidate).map((s) => ({
      id: s.id,
      name: s.name,
      group: s.group,
      seasons: s.seasons,
      rating: s.rating,
      votes: s.votes + Object.values(admins).filter((v) => v.vote === s.id).length,
      real: false,
    }));
    return [...real, ...seeded].sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, "ar"));
  }, [admins]);

  const elected = election.elected ?? [];
  const phase = !election.openedAt ? "closed" : !election.closedAt ? "open" : "announced";
  const votesCast = candidates.reduce((n, c) => n + c.votes, 0);
  const voters = 12 + Object.values(admins).filter((a) => a.positions[0] === "group-head").length;
  const eligible = Object.values(admins).filter((a) => a.positions[0] === "group-head" && candidacy(a.nationalId, rules).ok).length + HEADS_POOL.filter((h) => h.seasons >= rules.clusterHeadSeasons).length;

  const open = () => {
    actions.setElection({ openedAt: Date.now(), closedAt: undefined, elected: undefined });
    logAs(user, {
      action: "فتح باب الترشح لرئاسة التكتلات",
      target: `${rules.clusterCount} تكتلات`,
      detail: `الشرط: ${rules.clusterHeadSeasons} مواسم متتالية رئيساً لمجموعة بتقييم ${rules.clusterHeadMinRating} فأكثر — يصوّت رؤساء المجموعات`,
    });
    toast({ title: "فُتح باب الترشح", body: `${rules.clusterCount} تكتلات هذا الموسم. يرشّح المستوفون أنفسهم ويصوّت رؤساء المجموعات.`, tone: "gold", icon: "📣" });
  };

  const close = () => {
    const winners = candidates.slice(0, rules.clusterCount);
    actions.setElection({ closedAt: Date.now(), elected: winners.map((c) => c.id) });
    logAs(user, {
      action: "إغلاق التصويت وإعلان رؤساء التكتلات",
      target: `${winners.length} رؤساء من ${candidates.length} مرشحاً`,
      detail: winners.map((c) => `${c.name} (${c.votes})`).join("، "),
    });
    toast({ title: "أُعلنت النتيجة", body: `${winners.length} رؤساء تكتلات. ينشئ كل منهم تكتله ويختار معاونه.`, tone: "success", icon: "🏛️" });
  };

  const reopen = () => {
    actions.setElection({ openedAt: undefined, closedAt: undefined, elected: undefined });
    logAs(user, { action: "إلغاء انتخاب رؤساء التكتلات وإعادته من البداية", target: "موسم 1448" });
    toast({ title: "أُعيد الانتخاب إلى نقطة البداية", tone: "warning", icon: "↩️" });
  };

  const clusters = Object.values(admins).filter((a) => a.cluster);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الجزء الثاني — الإداريون الموسميون"
        icon={<Vote />}
        title="انتخاب رؤساء التكتلات"
        description={`رئاسة التكتل لا يُتقدَّم إليها: تعلن الإدارة عدد التكتلات وشروط الترشح، ويرشّح رؤساء المجموعات المستوفون أنفسهم، ويصوّت رؤساء المجموعات. الإدارة تفتح الباب وتغلقه وتعلن النتيجة، ولا تختار الفائزين.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/staff/season" className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/20">
              <Settings2 className="size-4" /> شروط الترشح والعدد
            </Link>
            {phase === "closed" && (
              <Button size="sm" variant="gold" onClick={open}>
                <Megaphone className="size-4" /> فتح باب الترشح
              </Button>
            )}
            {phase === "open" && (
              <Button size="sm" variant="gold" onClick={close}>
                <BadgeCheck className="size-4" /> إغلاق التصويت وإعلان الرؤساء
              </Button>
            )}
            {phase === "announced" && (
              <Button size="sm" variant="outline" className="border-white/25 text-white hover:bg-white/10" onClick={reopen}>
                إعادة الانتخاب من البداية
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="تكتلات الموسم" value={rules.clusterCount} icon={<Building2 />} hint="بقرار الإدارة في إعدادات الموسم" />
        <Kpi label="المرشحون" value={candidates.length} icon={<Crown />} tone="gold" delay={0.05} hint={`المستوفون للشروط ${eligible}`} />
        <Kpi label="الأصوات" value={votesCast} icon={<Vote />} tone="teal" delay={0.1} hint={`من ${voters} رئيس مجموعة`} pulse={phase === "open"} />
        <Kpi label="التكتلات المنشأة" value={clusters.length} icon={<BadgeCheck />} tone="maroon" delay={0.15} hint={`رسم الإنشاء ${formatUSD(season.fees.clusterFormation)}`} />
      </div>

      <Panel
        icon={<Megaphone />}
        title="حالة الانتخاب"
        action={
          <Chip tone={phase === "announced" ? "green" : phase === "open" ? "gold" : "maroon"}>
            {phase === "closed" ? "لم يُفتح بعد" : phase === "open" ? "الترشح والتصويت مفتوحان" : "أُغلق وأُعلنت النتيجة"}
          </Chip>
        }
      >
        <ol className="grid gap-3 md:grid-cols-3">
          {[
            { t: "فتح باب الترشح", d: election.openedAt ? fmtDateTime(election.openedAt) : `النافذة: ${SEASON.administrators.clusters.window}`, on: !!election.openedAt },
            { t: "ترشّح وتصويت رؤساء المجموعات", d: `${votesCast} صوتاً حتى الآن`, on: phase === "open" || phase === "announced" },
            { t: "إغلاق التصويت وإعلان الرؤساء", d: election.closedAt ? fmtDateTime(election.closedAt) : "بانتظار الإغلاق", on: phase === "announced" },
          ].map((s, i) => (
            <li key={s.t} className={cn("rounded-2xl p-4 ring-1", s.on ? "bg-green-light/10 ring-green-light/30" : "bg-white/5 ring-white/10")}>
              <p className="flex items-center gap-2 font-bold text-white">
                <span className={cn("grid size-6 place-items-center rounded-lg text-xs font-bold", s.on ? "bg-green-light text-white" : "bg-white/10 text-white/60")}>{i + 1}</span>
                {s.t}
              </p>
              <p className="mt-1 text-xs text-white/65">{s.d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm leading-7 text-white/70">
          شرط الترشح المعتمد: {rules.clusterHeadSeasons} مواسم متتالية رئيساً لمجموعة بتقييم {rules.clusterHeadMinRating} فأكثر. ويشترط في المعاون الذي يختاره الرئيس المنتخب أن يكون رئيس مجموعة منذ{" "}
          {rules.deputySeasons} {rules.deputySeasons === 1 ? "موسم" : "مواسم"} فأكثر.
        </p>
      </Panel>

      {phase === "closed" ? (
        <Empty icon={<Lock />} title="لم يُفتح باب الترشح بعد" text="تُشكَّل المجموعات وتُعتمد أولاً، ثم يُفتح الترشح لرئاسة التكتلات." />
      ) : (
        <Panel icon={<Vote />} title={phase === "announced" ? "النتيجة النهائية" : "المرشحون والأصوات"} action={<Chip>{formatNumber(candidates.length)} مرشحاً</Chip>}>
          <ul className="space-y-2">
            {candidates.map((c, i) => {
              const won = phase === "announced" ? elected.includes(c.id) : i < rules.clusterCount;
              return (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 12) * 0.03 }}
                  className={cn("flex flex-wrap items-center gap-3 rounded-2xl p-3 ring-1", won ? "bg-gold/10 ring-gold/40" : "bg-white/5 ring-white/10")}
                >
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-display text-lg font-bold", won ? "bg-gold text-ink" : "bg-white/10 text-white/80")}>{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-bold text-white">
                      {c.name}
                      {c.real && <Chip tone="green">من بوابة الإداريين</Chip>}
                    </span>
                    <span className="block text-xs text-white/65">
                      رئيس المجموعة {c.group} — {c.seasons} مواسم رئاسة{c.rating !== null && ` — تقييم ${c.rating}`}
                    </span>
                  </span>
                  <span className="font-display text-xl font-bold text-gold tabular-nums">{c.votes}</span>
                  <span className="w-20 text-left text-xs font-bold">
                    {phase === "announced" ? (won ? <Chip tone="green">رئيس تكتل</Chip> : <span className="text-white/45">لم يفز</span>) : won ? <Chip>ضمن العدد</Chip> : <span className="text-white/45">خارج العدد</span>}
                  </span>
                </motion.li>
              );
            })}
          </ul>
          {phase === "open" && (
            <p className="mt-4 rounded-2xl bg-white/5 p-3 text-xs leading-6 text-white/60">
              الترتيب يتغير مع كل صوت. عند الإغلاق يفوز أعلى {rules.clusterCount} مرشحين أصواتاً، ويُسجَّل القرار باسمك في سجل الأحداث.
            </p>
          )}
        </Panel>
      )}

      {phase === "announced" && (
        <Panel icon={<Building2 />} title="التكتلات بعد الانتخاب" action={<Chip tone={clusters.length ? "green" : "maroon"}>{clusters.length} من {elected.length} أنشأ تكتله</Chip>}>
          {clusters.length === 0 ? (
            <p className="rounded-2xl bg-white/5 p-4 text-sm text-white/70">لم ينشئ أي رئيس منتخب تكتله بعد. يدفع كل منهم رسم الإنشاء ويختار معاونه من رؤساء المجموعات السابقين.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {clusters.map((a: AdminProfile) => (
                <li key={a.nationalId} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="font-display text-xl font-bold text-gold">{a.cluster!.name}</p>
                  <p className="mt-1 text-sm text-white/85">
                    <Crown className="mb-0.5 inline size-4 text-gold" /> الرئيس: {adminName(a.nationalId)} — المجموعة {a.group?.number}
                  </p>
                  <p className="text-sm text-white/85">
                    <UserCheck className="mb-0.5 inline size-4 text-green-light" /> المعاون: {a.cluster!.deputyName ?? "لم يُختر بعد"}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
                    <Chip>السعة {a.cluster!.capacityGroups} مجموعات</Chip>
                    <Chip tone="green">{1 + Object.values(a.cluster!.decisions).filter((d) => d.status === "accepted").length} مجموعات انضمت</Chip>
                    {a.cluster!.feePaidAt && <span>رسم الإنشاء مسدد</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
