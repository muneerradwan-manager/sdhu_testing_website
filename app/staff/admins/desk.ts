"use client";

import { AlertTriangle, CheckCircle2, Vote } from "lucide-react";
import { createElement, useMemo } from "react";
import type { ExamNumbers } from "@/lib/data/admin-exam";
import { classify } from "@/lib/grading";
import { useGraded } from "@/lib/grading-live";
import { useSeason } from "@/lib/season-live";
import type { StaffUser } from "@/lib/staff";
import { useStore, type AdminProfile, type AdminRecord, type AuditEvent, type VaultDoc } from "@/lib/store";
import { APPLIED_ROLES, candidacy, docState, lastServed, levelOf, recordOf, resultOf, seasonHistory, type DocType } from "@/app/administrator/_lib/admin";
import { useDocTypes, useEvaluationStages, useExamRules, useRoleRequirements, useRoles } from "@/app/administrator/_lib/admin-rules";
import { DEFAULT_CAPACITY_TIERS, capacityFor, teamLabel, withTeam } from "@/app/administrator/_lib/capacity";
import { HEADS_POOL, clusterGroupsOf, type ClusterGroup } from "@/app/administrator/_lib/cluster";
import { roleKeyOf } from "@/app/administrator/_lib/halls";
import { useClusters } from "@/lib/cms/content";
import { useAdminRows, type AdminRow } from "../_components/data";
import { logAs } from "../_components/kit";
import type { Alert, SystemStatus } from "../_components/system";

/**
 * The administrators' file seen whole, for whoever holds «إدارة الإداريين» and for the director: the rules
 * the season runs on, who applied and how far each got, the groups and their approval, the election and
 * the clusters it produced, the evaluation and the classification. Every screen of the file reads from
 * here, so a number is the same on the holder's summary, his tabs and the director's board.
 */

/** The parts of the file, each a tab of its management page, in the order the work is done */
export const AREAS = ["rules", "applicants", "groups", "clusters", "evaluation", "grading"] as const;
export type Area = (typeof AREAS)[number];

/** Every action of the file is recorded under the tab it is done in, and in its record's own history (`ref`) */
export function logAdmins(user: StaffUser, area: Area, e: Omit<AuditEvent, "id" | "at" | "actor" | "role" | "system" | "area">) {
  logAs(user, { ...e, system: "admins", area });
}

/** The rules that belong to «إدارة الامتحانات»: this file neither counts nor resets them */
export const EXAM_KEYS = ["exam", "blueprints", "questionsAdded", "questionsOff", "questionEdits", "questionRoles"] as const;

/** The role he applied for this season. The cluster roles are not applied for: their holders applied as group heads */
export function appliedRole(r: AdminRow) {
  const key = roleKeyOf(r.profile.positions[0] ?? r.position);
  return key === "cluster-head" || key === "cluster-deputy" ? "group-head" : key;
}

/** Qualified to work this season: his announced result passed, or he renewed his role without exams */
export function qualified(p: AdminProfile, rules: ExamNumbers) {
  const res = resultOf(p, rules);
  return res.passed && !!res.published;
}

/** One role's applicants, step by step: from the choice of the role to the announced result */
export type Funnel = { role: string; label: string; open: boolean; applied: number; eligible: number; paid: number; exempt: number; sitting: number; passed: number; qualified: number };

/** An administrator's permanent file against what his role asks this season */
export type FileState = { row: AdminRow; role: string; record: AdminRecord; expired: VaultDoc[]; missing: DocType[]; flagged: boolean };

export type GroupState = "unpaid" | "waiting" | "returned" | "approved";
/** `tier`: before approval, the capacity category its head falls in now, which approval gives the group */
export type GroupRow = { row: AdminRow; g: NonNullable<AdminProfile["group"]>; state: GroupState; checks: { label: string; ok: boolean }[]; complete: boolean; tier?: import("@/app/administrator/_lib/capacity").CapacityTier };

export type Phase = "closed" | "open" | "announced";
export type Candidate = { id: string; name: string; group: number; seasons: number; rating: number | null; votes: number; real: boolean };
/** A cluster an elected head created, with every group in it */
export type ClusterRow = { row: AdminRow; c: NonNullable<AdminProfile["cluster"]>; groups: ClusterGroup[] };

export const GROUP_STATE: Record<GroupState, { label: string; tone: "green" | "gold" | "maroon" | "muted" }> = {
  unpaid: { label: "بانتظار رسم التشكيل", tone: "muted" },
  waiting: { label: "تنتظر قرارك", tone: "gold" },
  returned: { label: "أُعيدت إلى رئيسها", tone: "maroon" },
  approved: { label: "معتمدة", tone: "green" },
};

export function useAdminsDesk() {
  const rows = useAdminRows();
  const examRules = useExamRules();
  const season = useSeason();
  const roles = useRoles();
  const stages = useEvaluationStages();
  const table = useRoleRequirements();
  const { types, validity } = useDocTypes();
  const adminRules = useStore((s) => s.adminRules);
  const election = useStore((s) => s.election);
  const evaluations = useStore((s) => s.evaluations);
  const grading = useStore((s) => s.grading);
  const profiles = useStore((s) => s.clusterProfiles);
  const directory = useClusters();
  const gradedGroups = useGraded("groups");
  const gradedClusters = useGraded("clusters");

  return useMemo(() => {
    const A = season.administrators;

    // ── Rules ── (the exam's keys belong to «إدارة الامتحانات», which resets them on its own)
    const openRoles = APPLIED_ROLES.filter((r) => roles.some((x) => x.key === r.key));
    const rulesEdited = Object.entries(adminRules).filter(([k, v]) => v !== undefined && !EXAM_KEYS.includes(k as (typeof EXAM_KEYS)[number])).length;

    // ── Applicants ──
    const withRole = rows.filter((r) => appliedRole(r));
    const isQualified = (r: AdminRow) => qualified(r.profile, examRules);
    const funnel: Funnel[] = APPLIED_ROLES.map((role) => {
      const mine = withRole.filter((r) => appliedRole(r) === role.key);
      const paid = mine.filter((r) => r.profile.feePaidAt);
      const sitting = paid.filter((r) => !r.profile.examExempt);
      return {
        role: role.key,
        label: role.label,
        open: openRoles.includes(role),
        applied: mine.length,
        // The fee is paid only once eligibility is proven, so a paid file was found eligible
        eligible: mine.filter((r) => r.profile.eligibleAt || r.profile.feePaidAt).length,
        paid: paid.length,
        exempt: paid.length - sitting.length,
        sitting: sitting.length,
        passed: sitting.filter(isQualified).length,
        qualified: paid.filter(isQualified).length,
      };
    });
    const sum = (k: keyof Omit<Funnel, "role" | "label" | "open">) => funnel.reduce((n, f) => n + f[k], 0);
    const totals = { applied: sum("applied"), eligible: sum("eligible"), paid: sum("paid"), exempt: sum("exempt"), sitting: sum("sitting"), passed: sum("passed"), qualified: sum("qualified") };

    const files: FileState[] = withRole.map((row) => {
      const role = appliedRole(row);
      const record = recordOf(row.profile, row.id);
      const expired = record.documents.filter((d) => !docState(d, undefined, validity).ok);
      const missing = types.filter((d) => levelOf(table, role, `doc:${d.key}`) === "required" && !record.documents.some((x) => x.key === d.key));
      const requiredExpired = expired.filter((d) => levelOf(table, role, `doc:${d.key}`) === "required");
      // Only a file already in the season can fall short: before paying, the portal itself holds him back
      return { row, role, record, expired, missing, flagged: !!row.profile.feePaidAt && (missing.length > 0 || requiredExpired.length > 0) };
    });
    const flaggedFiles = files.filter((f) => f.flagged);

    // ── Groups ──
    const groups: GroupRow[] = rows
      .filter((r) => r.profile.group)
      .map((row) => {
        const g = row.profile.group!;
        // The team is not part of the request: the head invites it once the group is approved. The capacity
        // is given on approval, by the category the head falls in
        const tier = g.approvedAt ? undefined : capacityFor(row.id, adminRules.capacityTiers?.map(withTeam) ?? DEFAULT_CAPACITY_TIERS).tier;
        const checks = [
          { label: "رئيسها مؤهل: نجح وأُعلنت نتيجته أو جدّد صفته", ok: isQualified(row) },
          { label: `رسم التشكيل ${season.fees.groupFormation} $`, ok: !!g.feePaidAt },
          ...(g.approvedAt ? [] : [{ label: tier ? `فئته: ${tier.label} — ${tier.capacity} حاجاً، وفريق: ${teamLabel(tier.team)}` : "لا تنطبق على رئيسها أي فئة", ok: !!tier }]),
        ];
        const state: GroupState = g.approvedAt ? "approved" : g.returned ? "returned" : g.feePaidAt ? "waiting" : "unpaid";
        return { row, g, state, checks, complete: checks.every((c) => c.ok), tier };
      })
      .sort((a, b) => a.g.number - b.g.number);
    const waiting = groups.filter((x) => x.state === "waiting");
    const approved = groups.filter((x) => x.state === "approved");
    const outside = approved.filter((x) => !x.g.clusterId);

    // ── The election and the clusters ──
    const phase: Phase = !election.openedAt ? "closed" : !election.closedAt ? "open" : "announced";
    const admins = rows.map((r) => r.profile);
    const votesFor = (id: string) => admins.filter((a) => a.vote === id).length;
    const candidates: Candidate[] = [
      ...rows
        .filter((r) => r.profile.candidate && appliedRole(r) === "group-head")
        .map((r) => ({ id: r.id, name: r.name, group: r.profile.group?.number ?? 0, seasons: seasonHistory(r.id).filter((h) => h.roleKey === "group-head").length, rating: lastServed(r.id)?.rating ?? null, votes: votesFor(r.id), real: true })),
      ...HEADS_POOL.filter((h) => h.candidate).map((h) => ({ id: h.id, name: h.name, group: h.group, seasons: h.seasons, rating: h.rating, votes: h.votes + votesFor(h.id), real: false })),
    ].sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, "ar"));
    const votes = candidates.reduce((n, c) => n + c.votes, 0);
    // Counted as the administrator portal counts them: the season's other group heads, and the group heads on the platform
    const voters = 12 + rows.filter((r) => !r.seed && r.profile.positions[0] === "group-head").length;
    const standing = rows.filter((r) => appliedRole(r) === "group-head" && candidacy(r.id, A).ok).length + HEADS_POOL.filter((h) => h.seasons >= A.clusterHeadSeasons).length;
    const elected = election.elected ?? [];

    const clusters: ClusterRow[] = rows.filter((r) => r.profile.cluster).map((row) => ({ row, c: row.profile.cluster!, groups: clusterGroupsOf(row.profile, row.name) }));
    const pool = new Set(HEADS_POOL.map((h) => h.id));
    const electedRows = elected.map((id) => ({ id, name: candidates.find((c) => c.id === id)?.name ?? rows.find((r) => r.id === id)?.name ?? id, cluster: clusters.find((c) => c.row.id === id) }));
    // The pool's heads are the season's other group heads, whose own steps the demo does not play: the
    // holder chases only the heads on the platform, who can create their cluster
    const notCreated = electedRows.filter((e) => !e.cluster && !pool.has(e.id));
    const noDeputy = clusters.filter((x) => !x.c.deputyId);
    const programmes = directory.map((c) => ({ cluster: c, state: profiles[c.slug] })).filter((x) => x.state?.pending || x.state?.approved || x.state?.rejected);
    const pendingProgrammes = programmes.filter((x) => x.state?.pending);

    // ── Evaluation ── of everyone who works this season, stage by stage
    const toEvaluate = rows.filter(isQualified);
    const coverage = stages.map((st) => ({ stage: st, done: toEvaluate.filter((r) => evaluations[r.id]?.stages[st.key]).length, total: toEvaluate.length }));
    // A stage counts as reached once anyone was scored in it; the ones nobody has reached yet wait for the season
    const behind = coverage.filter((c) => c.done > 0 && c.done < c.total);
    const evaluated = toEvaluate.filter((r) => evaluations[r.id]);

    // ── Classification ──
    const shares = { promoteShare: season.grading.promoteShare, demoteShare: season.grading.demoteShare, honorTop: season.grading.honorTop };
    const tally = (entries: typeof gradedGroups) => {
      const tiers = classify(entries, shares);
      return { total: entries.length, tiers: tiers.length, up: tiers.reduce((n, t) => n + t.rows.filter((r) => r.outcome === "promote").length, 0), down: tiers.reduce((n, t) => n + t.rows.filter((r) => r.outcome === "demote").length, 0) };
    };
    const classified = { groups: tally(gradedGroups), clusters: tally(gradedClusters) };
    const lastEvaluation = Math.max(0, ...Object.values(evaluations).map((e) => e.at));
    const stale = !!grading.publishedAt && lastEvaluation > grading.publishedAt;

    // Each part's alerts, in the order the work is done; on the page, the blockers of every part come first
    const M = "/staff/admins/manage";
    const byArea: Record<Area, Alert[]> = {
      rules: openRoles.length
        ? []
        : [{ id: "no-role", level: "high", title: "لا صفة مفتوحة للتقدم هذا الموسم", hint: "أُغلقت الصفات كلها، فلا يستطيع أحد تقديم طلب المشاركة.", href: M, action: "افتح صفة" }],
      applicants: flaggedFiles.length
        ? [{ id: "files", level: "work", title: `${flaggedFiles.length} إداريين في ملفاتهم وثائق مطلوبة ناقصة أو منتهية`, hint: "سددوا رسم التسجيل، وما تطلبه صفاتهم ليس كله سارياً في ملفاتهم.", href: `${M}/applicants?f=docs`, action: "راجع ملفاتهم" }]
        : [],
      groups: waiting.length
        ? [{ id: "requests", level: "work", title: `${waiting.length} طلبات تشكيل تنتظر قرارك`, hint: `${waiting.filter((x) => x.complete).length} منها مكتملة الشروط: اعتمدها، أو أعد الناقص إلى رئيسه مع ما يصلحه.`, href: `${M}/groups`, action: "قرّر" }]
        : [],
      clusters: [
        ...notCreated.map((e) => ({ id: `create-${e.id}`, level: "high" as const, title: `${e.name} انتُخب ولم ينشئ تكتله`, hint: "لا تنضم مجموعة إلى تكتل لم يُنشأ بعد. ينشئه الرئيس المنتخب ويدفع رسمه ويختار معاونه.", href: `${M}/clusters#clusters`, action: "تابعه" })),
        ...noDeputy.map((x) => ({ id: `deputy-${x.c.id}`, level: "high" as const, title: `${x.c.name} بلا معاون`, hint: `يختار رئيسه ${x.row.name} معاونه من رؤساء المجموعات السابقين، ولا يكتمل التكتل دونه.`, href: `${M}/clusters#clusters`, action: "تابعه" })),
        ...(phase === "closed" && approved.length
          ? [{ id: "open", level: "work" as const, title: "باب الترشح لرئاسة التكتلات لم يُفتح", hint: `${approved.length} مجموعات معتمدة${waiting.length ? `، و${waiting.length} طلبات لم يُبتّ فيها بعد` : ""}. يرشّح المستوفون أنفسهم ويصوّت رؤساء المجموعات.`, href: `${M}/clusters`, action: "افتح الترشح" }]
          : []),
        ...(phase === "open" ? [{ id: "vote", level: "work" as const, title: `التصويت جارٍ: ${votes} صوتاً من ${voters}`, hint: `أغلقه في نهاية نافذته وأعلن أعلى ${A.clusterCount} مرشحين.`, href: `${M}/clusters`, action: "أغلق وأعلن" }] : []),
        ...(phase === "announced" && outside.length
          ? [{ id: "outside", level: "work" as const, title: `${outside.length} مجموعات معتمدة لم تنضم إلى تكتل`, hint: "تطلب كل مجموعة الانضمام، ويقرر رئيس التكتل بحسب سعته.", href: `${M}/groups#approved`, action: "تابعها" }]
          : []),
        ...(pendingProgrammes.length
          ? [{ id: "programmes", level: "work" as const, title: `${pendingProgrammes.length} برامج تكتلات تنتظر اعتمادك`, hint: "لا يصل تعديل إلى الحجاج في دليل الخدمات قبل أن يُعتمد.", href: `${M}/clusters#programmes`, action: "راجعها" }]
          : []),
      ],
      evaluation: behind.length
        ? [{ id: "behind", level: "work", title: `${behind.length} مراحل تقييم لم تكتمل`, hint: behind.map((c) => `${c.stage.label}: بقي ${c.total - c.done}`).join(" · "), href: `${M}/evaluation`, action: "أكمل التقييم" }]
        : [],
      grading: stale
        ? [{ id: "stale", level: "work", title: "تقييمات حُفظت بعد نشر التصنيف", hint: "تغيّرت درجات بعض المجموعات أو التكتلات، والتصنيف المنشور لا يراها.", href: `${M}/grading`, action: "أعد اعتماده" }]
        : !grading.publishedAt && evaluated.length
          ? [{ id: "publish", level: "work", title: "التصنيف جاهز للنشر", hint: `${classified.groups.total} مجموعة و${classified.clusters.total} تكتلاً في فئاتها، محتسبة من تقييم ${evaluated.length} إداريين.`, href: `${M}/grading`, action: "اعتمده وانشره" }]
          : [],
    };
    const all = AREAS.flatMap((a) => byArea[a]);
    const alerts = [...all.filter((a) => a.level === "high"), ...all.filter((a) => a.level === "work")];

    return {
      rows,
      openRoles,
      rulesEdited,
      funnel,
      totals,
      noRole: rows.length - withRole.length,
      files,
      flaggedFiles,
      groups,
      waiting,
      approved,
      outside,
      phase,
      candidates,
      votes,
      voters,
      standing,
      elected,
      electedRows,
      clusters,
      notCreated,
      noDeputy,
      programmes,
      pendingProgrammes,
      toEvaluate,
      coverage,
      evaluated,
      classified,
      stale,
      alerts,
      high: alerts.filter((a) => a.level === "high"),
      badges: Object.fromEntries(AREAS.map((a) => [a, byArea[a].length])) as Record<Area, number>,
    };
  }, [rows, examRules, season, roles, stages, table, types, validity, adminRules, election, evaluations, grading, profiles, directory, gradedGroups, gradedClusters]);
}

export type AdminsDesk = ReturnType<typeof useAdminsDesk>;

/** How the file stands on the director's board: a state line, four numbers in the order the work is done, its blockers */
export function useAdminsStatus(): SystemStatus {
  const desk = useAdminsDesk();
  const clusterCount = useSeason().administrators.clusterCount;
  return {
    state:
      desk.phase === "open"
        ? { label: `انتخاب رؤساء التكتلات جارٍ: ${desk.votes} صوتاً`, tone: "green", icon: createElement(Vote, { className: "size-4" }) }
        : desk.high.length
          ? { label: `تحتاج متابعة (${desk.high.length})`, tone: "maroon", icon: createElement(AlertTriangle, { className: "size-4" }) }
          : { label: "تسير بانتظام", tone: "green", icon: createElement(CheckCircle2, { className: "size-4" }) },
    numbers: [
      { k: "المتقدمون", v: desk.totals.applied, hint: `${desk.totals.paid} سددوا الرسم` },
      { k: "مؤهَّلون للعمل", v: desk.totals.qualified, hint: `${desk.totals.exempt} بالتجديد دون امتحان` },
      { k: "مجموعات معتمدة", v: desk.approved.length, hint: desk.waiting.length ? `${desk.waiting.length} طلبات تنتظر` : undefined },
      { k: "تكتلات منشأة", v: `${desk.clusters.length} من ${clusterCount}`, hint: desk.phase === "announced" ? `أُعلن ${desk.elected.length} رؤساء` : undefined },
    ],
    high: desk.high,
  };
}
