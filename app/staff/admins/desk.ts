"use client";

import { AlertTriangle, CheckCircle2, Timer } from "lucide-react";
import { createElement, useMemo } from "react";
import type { ExamNumbers } from "@/lib/data/admin-exam";
import { classify } from "@/lib/grading";
import { useGraded } from "@/lib/grading-live";
import { useSeason } from "@/lib/season-live";
import type { StaffUser } from "@/lib/staff";
import { useStore, type AdminProfile, type AdminRecord, type AuditEvent, type VaultDoc } from "@/lib/store";
import { APPLIED_ROLES, docState, levelOf, recordOf, resultOf, type DocType } from "@/app/administrator/_lib/admin";
import { useDocTypes, useEvaluationStages, useExamRules, useRoleRequirements, useRoles } from "@/app/administrator/_lib/admin-rules";
import { HEADS_POOL } from "@/app/administrator/_lib/cluster";
import { useClusterRequests, useFormationWindow, type ClusterRequest } from "@/app/administrator/_lib/formation";
import { DEFAULT_TIER, branchOf, categoryOf, categoryOfId, seatsLabel, seatsOf, useCadre, useStructure } from "@/app/administrator/_lib/structure";
import { roleKeyOf } from "@/app/administrator/_lib/halls";
import { useClusters } from "@/lib/cms/content";
import { useAdminRows, type AdminRow } from "../_components/data";
import { logAs } from "../_components/kit";
import type { Alert, SystemStatus } from "../_components/system";

/**
 * The administrators' file seen whole, for whoever holds «إدارة الإداريين» and for the director: the rules
 * the season runs on, who applied and how far each got, the groups and their approval, the cluster requests
 * and their approval at the deadline, the evaluation and the classification. Every screen of the file reads from
 * here, so a number is the same on the holder's summary, his tabs and the director's board.
 */

/** The parts of the file, each a tab of its management page, in the order the work is done */
export const AREAS = ["rules", "reference", "applicants", "groups", "clusters", "evaluation", "grading"] as const;
export type Area = (typeof AREAS)[number];

/** Every action of the file is recorded under the tab it is done in, and in its record's own history (`ref`) */
export function logAdmins(user: StaffUser, area: Area, e: Omit<AuditEvent, "id" | "at" | "actor" | "role" | "system" | "area">) {
  logAs(user, { ...e, system: "admins", area });
}

/** The rules that belong to «إدارة الامتحانات»: this file neither counts nor resets them */
export const EXAM_KEYS = ["exam", "blueprints", "questionsAdded", "questionsOff", "questionEdits", "questionRoles"] as const;

/**
 * The role he applied for this season, as its exam and requirements count it («مرشد ديني» under the guide's).
 * «رئيس تكتل» is not applied for: the administration grants it over the role he applied with.
 */
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
/** `category`: its head's category as the administration set it (the group's), which approval confirms */
export type GroupRow = { row: AdminRow; g: NonNullable<AdminProfile["group"]>; state: GroupState; checks: { label: string; ok: boolean }[]; complete: boolean; category?: string };

/** A group approved this season that no cluster holds: a request it is in was refused after the final deadline, or none took it */
export type OutsideGroup = { number: number; headId: string; headName: string; branch: string; category?: string; pilgrims: number; from?: string };

export type { ClusterRequest };

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
  const requests = useClusterRequests();
  const formationWindow = useFormationWindow();
  const s = useStructure();
  const cadre = useCadre();
  const evaluations = useStore((s) => s.evaluations);
  const grading = useStore((s) => s.grading);
  const profiles = useStore((s) => s.clusterProfiles);
  const directory = useClusters();
  const gradedGroups = useGraded("groups");
  const gradedClusters = useGraded("clusters");

  return useMemo(() => {

    // ── Rules ── (the exam's keys belong to «إدارة الامتحانات», which resets them on its own)
    // The roles open for application (the structure's active, applied-for ones); an exam family is open while one of its roles is
    const openRoles = roles;
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
        open: openRoles.some((x) => x.key === role.key || x.examAs === role.key),
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
        // The team is not part of the request: its seats are filled by the head of the cluster it enters. Its
        // category is its head's, which the holder sets (or confirms) on approval
        const category = categoryOf(row.id, cadre);
        const n = seatsOf(s, DEFAULT_TIER, category);
        const checks = [
          { label: "رئيسها مؤهل: نجح وأُعلنت نتيجته أو جدّد صفته", ok: isQualified(row) },
          { label: `رسم التشكيل ${season.fees.groupFormation} $`, ok: !!g.feePaidAt },
          ...(g.approvedAt ? [] : [{ label: category ? `فئته: ${categoryOfId(s, category)?.name} — ${n.pilgrims} حاجاً في الاقتصادي، ${seatsLabel(n)}` : "لا فئة له بعد: تحددها عند الاعتماد", ok: true }]),
        ];
        const state: GroupState = g.approvedAt ? "approved" : g.returned ? "returned" : g.feePaidAt ? "waiting" : "unpaid";
        return { row, g, state, checks, complete: checks.every((c) => c.ok), category };
      })
      .sort((a, b) => a.g.number - b.g.number);
    const waiting = groups.filter((x) => x.state === "waiting");
    const approved = groups.filter((x) => x.state === "approved");

    // ── The cluster requests ── filed by whoever holds a cluster-leading role, reviewed one by one once sent
    const deadlinePassed = formationWindow.state === "closed";
    const sent = requests.filter((r) => r.status === "pending");
    const reviewing = requests.filter((r) => r.status === "reviewing");
    const approvedClusters = requests.filter((r) => r.status === "approved");
    const rejected = requests.filter((r) => r.status === "rejected");
    const drafts = requests.filter((r) => r.status === "draft");
    // A request holds its groups until it is refused for good: sent back after the final deadline, nobody fixes it
    const holding = requests.filter((r) => !(r.status === "rejected" && deadlinePassed) && !(r.status === "draft" && deadlinePassed));
    const held = new Set(holding.flatMap((r) => r.groups.map((g) => g.number)));
    const outside: OutsideGroup[] = [
      ...approved.map((x) => ({ headId: x.row.id, headName: x.row.name, number: x.g.number, branch: branchOf(x.row.id, cadre), category: categoryOf(x.row.id, cadre), pilgrims: 0 })),
      ...HEADS_POOL.filter((h) => !approved.some((x) => x.g.number === h.group)).map((h) => ({ headId: h.id, headName: h.name, number: h.group, branch: branchOf(h.id, cadre), category: categoryOf(h.id, cadre), pilgrims: h.pilgrims })),
    ]
      .filter((g) => !held.has(g.number))
      .map((g) => ({ ...g, from: requests.find((r) => r.groups.some((x) => x.number === g.number))?.cluster.name }))
      .sort((a, b) => a.number - b.number);
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
      rules: [],
      reference: openRoles.length
        ? []
        : [{ id: "no-role", level: "high", title: "لا صفة مفتوحة للتقدم هذا الموسم", hint: "عُطّلت الصفات كلها، فلا يستطيع أحد تقديم طلب المشاركة.", href: `${M}/reference`, action: "فعّل صفة" }],
      applicants: flaggedFiles.length
        ? [{ id: "files", level: "work", title: `${flaggedFiles.length} إداريين في ملفاتهم وثائق مطلوبة ناقصة أو منتهية`, hint: "سددوا رسم التسجيل، وما تطلبه صفاتهم ليس كله سارياً في ملفاتهم.", href: `${M}/applicants?f=docs`, action: "راجع ملفاتهم" }]
        : [],
      groups: waiting.length
        ? [{ id: "requests", level: "work", title: `${waiting.length} طلبات تشكيل تنتظر قرارك`, hint: `${waiting.filter((x) => x.complete).length} منها مكتملة الشروط: اعتمدها، أو أعد الناقص إلى رئيسه مع ما يصلحه.`, href: `${M}/groups`, action: "قرّر" }]
        : [],
      clusters: [
        ...(sent.length
          ? [{ id: "sent", level: (deadlinePassed ? "high" : "work") as Alert["level"], title: `${sent.length} طلبات تكتل أُرسلت للمراجعة`, hint: `ابدأ مراجعة كل طلب، ثم اعتمده أو أعده إلى رئيسه بملاحظات${deadlinePassed ? " — انتهى الموعد النهائي، فلا تعديل بعد إعادته" : ""}.`, href: `${M}/clusters#requests`, action: "راجعها" }]
          : []),
        ...(reviewing.length
          ? [{ id: "reviewing", level: "work" as const, title: `${reviewing.length} طلبات قيد مراجعتك`, hint: "اعتمد الطلب أو أعده بملاحظات يصلحها رئيسه ويعيد إرساله.", href: `${M}/clusters#requests`, action: "أكمل المراجعة" }]
          : []),
        ...(deadlinePassed && outside.length
          ? [{ id: "outside", level: "work" as const, title: `${outside.length} مجموعات معتمدة خارج كل تكتل`, hint: "لم يأخذها طلب، أو رُفض طلبها بعد الموعد النهائي: أضفها إلى تكتل بتعديل استثنائي بسببه.", href: `${M}/clusters#outside`, action: "أضفها" }]
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
      requests,
      sent,
      reviewing,
      approvedClusters,
      rejected,
      drafts,
      deadlinePassed,
      formationWindow,
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
  }, [rows, examRules, season, roles, stages, table, types, validity, adminRules, requests, formationWindow, s, cadre, evaluations, grading, profiles, directory, gradedGroups, gradedClusters]);
}

export type AdminsDesk = ReturnType<typeof useAdminsDesk>;

/** How the file stands on the director's board: a state line, four numbers in the order the work is done, its blockers */
export function useAdminsStatus(): SystemStatus {
  const desk = useAdminsDesk();
  return {
    state:
      desk.sent.length + desk.reviewing.length
        ? { label: `طلبات تكتل تنتظر المراجعة: ${desk.sent.length + desk.reviewing.length}`, tone: "maroon", icon: createElement(Timer, { className: "size-4" }) }
        : desk.high.length
          ? { label: `تحتاج متابعة (${desk.high.length})`, tone: "maroon", icon: createElement(AlertTriangle, { className: "size-4" }) }
          : { label: "تسير بانتظام", tone: "green", icon: createElement(CheckCircle2, { className: "size-4" }) },
    numbers: [
      { k: "المتقدمون", v: desk.totals.applied, hint: `${desk.totals.paid} سددوا الرسم` },
      { k: "مؤهَّلون للعمل", v: desk.totals.qualified, hint: `${desk.totals.exempt} بالتجديد دون امتحان` },
      { k: "مجموعات معتمدة", v: desk.approved.length, hint: desk.waiting.length ? `${desk.waiting.length} طلبات تنتظر` : undefined },
      { k: "تكتلات معتمدة", v: desk.approvedClusters.length, hint: desk.requests.length ? `من ${desk.requests.length} طلبات — ${desk.sent.length + desk.reviewing.length} قيد المراجعة` : undefined },
    ],
    high: desk.high,
  };
}
