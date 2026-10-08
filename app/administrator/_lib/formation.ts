"use client";

import { loadOf } from "./distribution";
import { useMemo } from "react";
import { groupName, groupShort } from "@/lib/groups";
import { useClockTime, useOperation, useToday, type OperationState } from "@/lib/operations";
import { actions, useStore, type AdminProfile, type ClusterInvite, type ClusterRecord, type ClusterStatus, type GroupInvite, type Seat, type TeamPool } from "@/lib/store";
import { adminName, logAdmin, resultOf } from "./admin";
import { useExamRules } from "./admin-rules";
import { HEADS_POOL, SEED_CLUSTERS, acceptedGroups, asGroup, clusterGroupsOf, type ClusterGroup } from "./cluster";
import { assignedRealFamilies } from "./group";
import { ROSTER } from "./people";
import { BADGES, ageBadge, ageOfId, badgeAgeOf, branchesOf, categoryOf, does, needsOf, roleName, roleOf, seasonRoleKey, seatsOf, structureNow, useCadre, useStructure, weightOf, type Cadre, type Structure } from "./structure";

export type Cluster = ClusterRecord;

/** Where someone serves in a cluster, in words */
export const POOLS: Record<TeamPool, { label: string; one: string; title: string; note: string }> = {
  guide: { label: "الموجّهون والمرشدون", one: "موجّه ديني", title: "موجّه المجموعة", note: "مقعد الموجّه في مجموعة" },
  assistant: { label: "معاونو المجموعات", one: "معاون", title: "معاون المجموعة", note: "مقعد المعاون في مجموعة" },
  tech: { label: "المنسقون التقنيون", one: "منسق تقني", title: "المنسق التقني", note: "للتكتل: يوزّعه رئيسه على مجموعات ضمن حدّه من الوحدات" },
  "guide-f": { label: "الموجّهات والمرشدات", one: "موجّهة دينية", title: "موجّهة التكتل", note: "للتكتل كله: حاجّاته" },
  "cluster-assistant": { label: "معاونو التكتل", one: "معاون التكتل", title: "معاون التكتل", note: "للتكتل كله: المطارات والمخيمات والطوارئ" },
};

export const DEPUTY_TITLE = "نائب رئيس التكتل";
export const ACCOUNTANT_TITLE = "محاسب التكتل";

export const STATUS: Record<ClusterStatus, { label: string; tone: "green" | "gold" | "maroon" | "ink" }> = {
  draft: { label: "مسودة", tone: "ink" },
  pending: { label: "قيد المراجعة", tone: "gold" },
  reviewing: { label: "جاري المراجعة", tone: "gold" },
  approved: { label: "معتمد", tone: "green" },
  rejected: { label: "مرفوض — بملاحظات", tone: "maroon" },
};

/** The request's steps, in the order the administration's form takes them */
export type Step = "tier" | "groups" | "assistants" | "staff" | "deputy" | "accountant" | "report";
export const STEPS: { key: Step; label: string }[] = [
  { key: "tier", label: "المستوى" },
  { key: "groups", label: "المجموعات" },
  { key: "assistants", label: "معاون التكتل" },
  { key: "staff", label: "المنسقون والموجّهات" },
  { key: "deputy", label: "النائب" },
  { key: "accountant", label: "المحاسب" },
  { key: "report", label: "التقرير" },
];

/** A new request, stamped with the season it is filed in: the head's own group, if he heads one, is in it from the start */
export function newCluster(id: string, name: string, at: number, own?: GroupInvite, season?: number): Cluster {
  return { id, name, createdAt: at, status: "draft", season, groups: own ? { [own.number]: own } : {}, seats: own ? { [own.number]: [] } : {}, assistants: [], coordinators: [], femaleGuides: [], sorting: {} };
}

/**
 * A group's seats as its category asks under the tier: the guide seats, the assistant seats and the free
 * seats, keeping whoever already sits in a seat that is still there.
 */
export function fitSeats(s: Structure, tier: string | undefined, category: string, current: Seat[] = []): Seat[] {
  const n = seatsOf(s, tier, category);
  const take = (pick: (x: Seat) => boolean, count: number, make: () => Seat) => {
    const have = current.filter(pick).slice(0, count);
    return [...have, ...Array.from({ length: count - have.length }, make)];
  };
  return [
    ...take((x) => x.kind === "guide" && !x.free, n.guides, () => ({ kind: "guide" })),
    ...take((x) => x.kind === "assistant" && !x.free, n.assistants, () => ({ kind: "assistant" })),
    ...take((x) => !!x.free, n.free, () => ({ kind: "guide", free: true })),
  ];
}

/** Every group's seats again, after the tier changed */
export function refit(s: Structure, c: Cluster): Cluster {
  return { ...c, seats: Object.fromEntries(Object.values(c.groups).map((g) => [g.number, fitSeats(s, c.tier, g.category, c.seats[g.number])])) };
}

/** A person's role this season: the seasonal one, else his application's, else the season's records */
export function roleOfPerson(id: string, admins: Record<string, AdminProfile>, cadre: Cadre) {
  const applied = admins[id]?.positions[0] ?? ROSTER.find((c) => c.id === id)?.roleKey ?? (HEADS_POOL.some((h) => h.id === id) ? "group-head" : undefined);
  return seasonRoleKey(id, applied, cadre);
}

export type Check = { key: string; step: Step; label: string; ok: boolean; warn?: boolean };

/** Everyone the cluster holds: its head, its groups' heads, its seats, its assistants, coordinators and female guides */
export function cadreOf(headId: string, c: Cluster) {
  const ids = new Set<string>([headId]);
  for (const g of acceptedGroups(c)) {
    ids.add(g.id);
    for (const x of c.seats[g.number] ?? []) if (x.who?.status === "accepted") ids.add(x.who.id);
  }
  for (const x of [...c.assistants, ...c.coordinators, ...c.femaleGuides]) if (x.status === "accepted") ids.add(x.id);
  return [...ids];
}

/** A request as the season sees it, with what the administration's rules say of it */
export type ClusterRequest = {
  headId: string;
  headName: string;
  headGroup?: number;
  branches: string[];
  cluster: Cluster;
  /** Filed by a head who is not on this device (or created by the administration on his behalf) */
  seed: boolean;
  /** The season it was formed in, and whether the administration set it aside in the archive */
  season: number;
  archived?: { season: number; at: number; by: string };
  status: ClusterStatus;
  groups: ClusterGroup[];
  weight: number;
  needs: ReturnType<typeof needsOf>;
  checks: Check[];
  /** Every blocking check passes: it may be sent */
  complete: boolean;
  stepOk: Record<Step, boolean>;
  /** Its pilgrims by the categories (and the «معاون بعدد»), and those its groups hold now */
  pilgrims: number;
  enrolled: number;
  cadre: number;
  age: { avg: number | null; ok: boolean };
  badges: { age: boolean; guidance: boolean; timeliness: boolean };
};

function analyse(s: Structure, cadre: Cadre, admins: Record<string, AdminProfile>, r: { headId: string; headName: string; headGroup?: number; cluster: Cluster; seed: boolean; season: number; archived?: ClusterRequest["archived"] }): ClusterRequest {
  const c = r.cluster;
  const groups = acceptedGroups(c).map((g) => asGroup(s, c, g, g.number === r.headGroup));
  const weight = acceptedGroups(c).reduce((n, g) => n + weightOf(s, g.category), 0);
  const needs = needsOf(s, c.tier, weight, groups.map((g) => g.units));
  const units = groups.map((g) => ({ number: g.number, units: g.units }));
  const role = (id: string) => roleOfPerson(id, admins, cadre);
  const yes = (x?: ClusterInvite) => x?.status === "accepted";
  const counted = c.assistants.filter((x) => yes(x) && !roleOf(s, role(x.id))?.multiplier);
  const extra = c.assistants.filter((x) => yes(x) && roleOf(s, role(x.id))?.multiplier);
  const coords = c.coordinators.filter(yes);
  const guides = c.femaleGuides.filter(yes);
  const people = cadreOf(r.headId, c);
  const pendingAny = [...Object.values(c.groups), ...Object.values(c.seats).flat().map((x) => x.who).filter((x): x is ClusterInvite => !!x), ...c.assistants, ...c.coordinators, ...c.femaleGuides, c.deputy, c.accountant].some((x) => x?.status === "pending");
  const clusterWord = c.name.replace(/^تكتل\s+/, "").trim();
  const sameName = groups.find((g) => groupShort(g.number).trim() === clusterWord);

  const checks: Check[] = [
    { key: "name", step: "tier", label: c.name.trim() ? `اسم التكتل: ${c.name}` : "اسم التكتل", ok: !!c.name.trim() },
    { key: "tier", step: "tier", label: c.tier ? `مستواه: ${s.tiers.find((t) => t.id === c.tier)?.name ?? c.tier}` : "مستوى التكتل لم يُختر", ok: !!c.tier && s.tiers.some((t) => t.id === c.tier) },
    { key: "groups", step: "groups", label: `${groups.length} مجموعات قبلت`, ok: groups.length > 0 },
    { key: "weight", step: "groups", label: `مجموع الفئات ${weight} — المطلوب بين ${needs.min} و${needs.max}`, ok: weight >= needs.min && weight <= needs.max },
    ...(sameName ? [{ key: "names", step: "groups" as Step, label: `اسم ${groupName(sameName.number)} مطابق لاسم التكتل — يجب أن يختلف`, ok: false }] : []),
    // A group holds no more pilgrims than its category takes under the cluster's tier
    ...groups.filter((g) => g.pilgrims > g.capacity).map((g): Check => ({ key: `full-${g.number}`, step: "groups", label: `${groupName(g.number)}: فيها ${g.pilgrims} حاجاً، وسعة ${g.categoryName} في هذا المستوى ${g.capacity}`, ok: false })),
    ...groups.map((g): Check => {
      const seats = c.seats[g.number] ?? [];
      const filled = seats.filter((x) => yes(x.who)).length;
      return { key: `seats-${g.number}`, step: "groups", label: `${groupName(g.number)} (${g.categoryName}): ${filled} من ${seats.length} مقاعد`, ok: filled === seats.length && seats.length === seatsOf(s, c.tier, g.category).total };
    }),
    { key: "assistants", step: "assistants", label: `معاون التكتل: ${counted.length} من ${needs.assistants}${extra.length ? ` — ومعهم ${extra.length} «معاون بعدد»` : ""}`, ok: counted.length === needs.assistants },
    { key: "coordinators", step: "staff", label: `المنسقون: ${coords.length} من ${needs.coordinators} (منسق لكل ${needs.perCoordinator} وحدات)`, ok: coords.length === needs.coordinators },
    ...(needs.coordinators > 0 ? [{ key: "combo", step: "staff" as Step, label: `أحد المنسقين بصفة «${roleName("assistant-tech", s)}»`, ok: coords.some((x) => does(s, role(x.id), "assistantSeat") && does(s, role(x.id), "coordinatorPool")) }] : []),
    { key: "female", step: "staff", label: `الموجّهات والمرشدات: ${guides.length} من ${needs.femaleGuides} (واحدة لكل ${needs.perGuide} وحدات)`, ok: guides.length === needs.femaleGuides },
    // Nobody distributed on more units than his quota
    ...[...coords.map((x) => ({ x, map: c.sorting, quota: needs.perCoordinator })), ...guides.map((x) => ({ x, map: c.guideSorting ?? {}, quota: needs.perGuide }))]
      .map(({ x, map, quota }) => ({ x, quota, load: loadOf(units, map, x.id) }))
      .filter((r) => r.load > r.quota)
      .map((r): Check => ({ key: `over-${r.x.id}`, step: "staff", label: `${r.x.name}: موزَّع على ${r.load} وحدات، وحدّه ${r.quota}`, ok: false })),
    { key: "deputy", step: "deputy", label: yes(c.deputy) ? `${DEPUTY_TITLE}: ${c.deputy!.name}` : `${DEPUTY_TITLE} من رؤساء المجموعات لم يقبل بعد`, ok: yes(c.deputy) && groups.some((g) => g.headId === c.deputy!.id) },
    { key: "accountant", step: "accountant", label: yes(c.accountant) ? `${ACCOUNTANT_TITLE}: ${c.accountant!.name}` : `${ACCOUNTANT_TITLE} لم يقبل بعد`, ok: yes(c.accountant) && people.includes(c.accountant!.id) && !c.femaleGuides.some((x) => x.id === c.accountant!.id) },
    { key: "answers", step: "report", label: pendingAny ? "دعوات لم يُرد عليها بعد" : "رُدّ على كل الدعوات", ok: !pendingAny },
  ];
  // A guide's grade counts at its fixed age («عمر مثبَّت»), whatever his own
  const ages = people.map((id) => badgeAgeOf(id, role(id), s)).filter((a): a is number => a !== undefined);
  const age = ageBadge(ages);
  // The administrative system's age rule: the cadre's average no more than 50 — shown, not blocking
  if (age.avg !== null) checks.push({ key: "age", step: "report", label: `متوسط أعمار الكادر ${age.avg} سنة (الموجّهون بأعمارهم المثبّتة) — الحد في النظام الإداري 50`, ok: age.avg <= 50, warn: true });
  const blocking = checks.filter((x) => !x.warn);
  const stepOk = Object.fromEntries(STEPS.map((st) => [st.key, blocking.filter((x) => x.step === st.key).every((x) => x.ok)])) as Record<Step, boolean>;
  const early = new Date(`${s.earlyDeadline}T${s.earlyTime}:59`).getTime();
  return {
    ...r,
    branches: branchesOf(r.headId, cadre),
    status: c.status,
    groups,
    weight,
    needs,
    checks,
    complete: blocking.every((x) => x.ok),
    stepOk,
    pilgrims: groups.reduce((n, g) => n + g.capacity, 0) + extra.reduce((n, x) => n + (roleOf(s, role(x.id))?.multiplier ?? 0), 0),
    enrolled: groups.reduce((n, g) => n + g.pilgrims, 0),
    cadre: people.length,
    age,
    badges: { age: age.ok, guidance: people.some((id) => does(s, role(id), "guidance")), timeliness: !!c.firstSentAt && c.firstSentAt <= early },
  };
}

export { BADGES };

/** The season's requests: on this device, or seeded (as the administration's review left them) */
export function useClusterRequests(): ClusterRequest[] {
  const admins = useStore((s) => s.admins);
  const formation = useStore((s) => s.formation);
  const cadre = useCadre();
  const s = useStructure();
  return useMemo(() => {
    const { overrides, created, archived } = formation;
    const stamp = (c: Cluster) => ({ season: c.season ?? SEASON_FORMED, archived: archived[c.id] });
    const live = Object.values(admins)
      .filter((a) => a.cluster)
      .map((a) => ({ headId: a.nationalId, headName: adminName(a.nationalId), headGroup: a.group?.number, cluster: a.cluster!, seed: false, ...stamp(a.cluster!) }));
    // The season's story, then what the administration created on a leader's behalf: both live in the overrides once touched
    const seeds = [...SEED_CLUSTERS, ...created]
      .filter((x) => !live.some((l) => l.cluster.id === x.cluster.id))
      .map((x) => {
        const cluster = overrides[x.cluster.id] ?? x.cluster;
        return { ...x, cluster, seed: true, ...stamp(cluster) };
      });
    return [...live, ...seeds].map((r) => analyse(s, cadre, admins, r));
  }, [admins, formation, cadre, s]);
}

/** The season the demo's formations belong to, before the administration begins another */
export const SEASON_FORMED = 1448;

/** The season new formations are stamped with: the one the administration began last, else the demo's */
export function useFormingSeason() {
  return useStore((s) => s.formation.season) ?? SEASON_FORMED;
}

export function useClusterRequest(id: string | undefined) {
  return useClusterRequests().find((r) => r.cluster.id === id);
}

// ───────────────────────── The window ─────────────────────────

/**
 * Where the requests stand against their dates: not open yet, open before the early deadline (a request sent
 * now earns «شارة الالتزام بالمواعيد»), open after it, or closed — nothing is sent or edited after the final deadline.
 */
export type Window = { state: "before" | "early" | "open" | "closed"; op: OperationState; early: string; earlyTime: string };

export function useFormationWindow(): Window {
  const op = useOperation("cluster-formation");
  const today = useToday();
  const time = useClockTime();
  const { earlyDeadline: early, earlyTime } = useStructure();
  const state = op.open ? (`${today}T${time}` <= `${early}T${earlyTime}` ? "early" : "open") : op.status === "upcoming" ? "before" : "closed";
  return { state, op, early, earlyTime };
}

/** Whether its head may still change it: a draft, one waiting for review, or one sent back — while the window is open */
export function editableBy(status: ClusterStatus, w: Window) {
  return (status === "draft" || status === "pending" || status === "rejected") && (w.state === "early" || w.state === "open");
}

// ───────────────────────── Who may be picked ─────────────────────────

/** Someone a cluster head may invite: qualified this season, in his branches, free of every other cluster */
export type PickPerson = { id: string; name: string; role: string; branch: string; age?: number; note: string; takenBy?: string };

/** Everyone a request holds or invited (not those who declined), to keep each person in one place in the season */
export function placedIn(c: Cluster) {
  const ids = new Set<string>();
  const add = (x?: ClusterInvite) => x && x.status !== "declined" && ids.add(x.id);
  Object.values(c.groups).forEach(add);
  Object.values(c.seats).flat().forEach((x) => add(x.who));
  [...c.assistants, ...c.coordinators, ...c.femaleGuides].forEach(add);
  return ids;
}

/**
 * The season's qualified people a head may invite, each with the role he works in this season: the roster,
 * then the administrators on this device who qualified. Filtered by a behavior of their role, by the head's
 * branches, and marked when another request already holds them.
 */
export function usePicks(req: ClusterRequest | undefined) {
  const admins = useStore((s) => s.admins);
  const cadre = useCadre();
  const s = useStructure();
  const exam = useExamRules();
  const requests = useClusterRequests();
  return useMemo(() => {
    const takenBy = new Map<string, string>();
    for (const r of requests) if (r.cluster.id !== req?.cluster.id) for (const id of placedIn(r.cluster)) takenBy.set(id, r.cluster.name);
    const roster = ROSTER.map((x) => ({ id: x.id, name: x.name, role: seasonRoleKey(x.id, x.roleKey, cadre), branch: branchesOf(x.id, cadre)[0], age: x.age, note: `${x.area} — نتيجة التأهيل ${x.score}` }));
    const device = Object.values(admins)
      .filter((a) => a.positions[0] && !ROSTER.some((x) => x.id === a.nationalId) && resultOf(a, exam).passed)
      .map((a) => ({ id: a.nationalId, name: adminName(a.nationalId), role: roleOfPerson(a.nationalId, admins, cadre), branch: branchesOf(a.nationalId, cadre)[0], age: ageOfId(a.nationalId), note: "مؤهل هذا الموسم" }));
    // Whoever the administration added to the cadre by hand is offered like the qualified roster
    const added = Object.values(cadre.added ?? {})
      .filter((x) => !ROSTER.some((y) => y.id === x.id) && !admins[x.id])
      .map((x) => ({ id: x.id, name: x.name, role: seasonRoleKey(x.id, x.role, cadre), branch: branchesOf(x.id, cadre)[0], age: ageOfId(x.id), note: "أضافته الإدارة إلى الكادر" }));
    // A stopped or deleted account is offered to nobody
    const all = [...roster, ...device, ...added].filter((x) => x.id !== req?.headId && !cadre.status?.[x.id]);
    const mine = new Set(req?.branches ?? []);
    return (b: "guideSeat" | "assistantSeat" | "assistantPool" | "coordinatorPool" | "guidePool"): PickPerson[] =>
      all
        .filter((x) => does(s, x.role, b) && (!mine.size || mine.has(x.branch)))
        .map((x) => ({ ...x, takenBy: takenBy.get(x.id) }))
        .sort((a, b2) => Number(!!a.takenBy) - Number(!!b2.takenBy) || a.name.localeCompare(b2.name, "ar"));
  }, [admins, cadre, s, exam, requests, req]);
}

/** A group a head may invite: an approved group, its head's category and branch, and where it stands */
export type PoolGroup = { headId: string; headName: string; number: number; branch: string; category?: string; pilgrims: number; onDevice: boolean; takenBy?: string };

/** The season's approved groups other than the inviter's, in his branches; a group another request holds says which */
export function useGroupPool(req: ClusterRequest | undefined): PoolGroup[] {
  const admins = useStore((s) => s.admins);
  const post = useStore((s) => s.post);
  const applications = useStore((s) => s.applications);
  const cadre = useCadre();
  const requests = useClusterRequests();
  return useMemo(() => {
    const takenBy = (n: number) => requests.find((r) => r.cluster.id !== req?.cluster.id && Object.values(r.cluster.groups).some((g) => g.number === n && g.status !== "declined"))?.cluster.name;
    const live = Object.values(admins)
      .filter((a) => a.nationalId !== req?.headId && a.group?.approvedAt)
      .map((a) => {
        const n = a.group!.number;
        const pilgrims = assignedRealFamilies(n, post, applications).reduce((k, f) => k + f.members.length, 0);
        return { headId: a.nationalId, headName: adminName(a.nationalId), number: n, branch: branchesOf(a.nationalId, cadre)[0], category: categoryOf(a.nationalId, cadre), pilgrims, onDevice: true };
      });
    const seeds = HEADS_POOL.filter((h) => h.id !== req?.headId && !live.some((l) => l.number === h.group)).map((h) => ({ headId: h.id, headName: h.name, number: h.group, branch: branchesOf(h.id, cadre)[0], category: categoryOf(h.id, cadre), pilgrims: h.pilgrims, onDevice: false }));
    const mine = new Set(req?.branches ?? []);
    return [...live, ...seeds]
      .filter((g) => !mine.size || mine.has(g.branch))
      .map((g) => ({ ...g, takenBy: takenBy(g.number) }))
      .sort((a, b) => Number(!!a.takenBy) - Number(!!b.takenBy) || a.number - b.number);
  }, [admins, post, applications, cadre, requests, req]);
}

// ───────────────────────── Invitations ─────────────────────────

export type InviteKind = "group" | "deputy" | "accountant" | TeamPool;
export type Inbound = { req: ClusterRequest; kind: InviteKind; invite: ClusterInvite; number?: number; seat?: number };

/** «موجّه ديني في مجموعة اللطيف»، «منسق تقني» — what an invitation asks of him */
export function inviteWhat(x: { kind: InviteKind; number?: number }) {
  if (x.kind === "group") return `${groupName(x.number!)} وحجاجها`;
  if (x.kind === "deputy") return DEPUTY_TITLE;
  if (x.kind === "accountant") return ACCOUNTANT_TITLE;
  if (x.kind === "guide" || x.kind === "assistant") return `${POOLS[x.kind].one} في ${groupName(x.number!)}`;
  return POOLS[x.kind].one;
}

/** Every invitation this administrator received: to bring his group into a cluster, or to serve in one */
export function invitationsFor(id: string, requests: ClusterRequest[]): Inbound[] {
  return requests.flatMap((req) => {
    const c = req.cluster;
    if (req.headId === id) return [];
    const out: Inbound[] = [];
    for (const g of Object.values(c.groups)) if (g.id === id) out.push({ req, kind: "group", invite: g, number: g.number });
    for (const [n, seats] of Object.entries(c.seats)) seats.forEach((x, i) => x.who?.id === id && out.push({ req, kind: x.kind, invite: x.who, number: Number(n), seat: i }));
    for (const x of c.assistants) if (x.id === id) out.push({ req, kind: "cluster-assistant", invite: x });
    for (const x of c.coordinators) if (x.id === id) out.push({ req, kind: "tech", invite: x });
    for (const x of c.femaleGuides) if (x.id === id) out.push({ req, kind: "guide-f", invite: x });
    if (c.deputy?.id === id) out.push({ req, kind: "deputy", invite: c.deputy });
    if (c.accountant?.id === id) out.push({ req, kind: "accountant", invite: c.accountant });
    return out;
  });
}

export function useMyInvitations(id: string) {
  const requests = useClusterRequests();
  return useMemo(() => invitationsFor(id, requests), [id, requests]);
}

/** The groups a coordinator works in: those its head distributed him on */
export function sortedTo(c: Cluster, id: string) {
  return acceptedGroups(c)
    .map((g) => g.number)
    .filter((n) => c.sorting[n] === id);
}

/** The groups a female guide or murshida serves: those its head distributed her on */
export function guidedBy(c: Cluster, id: string) {
  return acceptedGroups(c)
    .map((g) => g.number)
    .filter((n) => c.guideSorting?.[n] === id);
}

/**
 * Writes a request where it lives — the head's record on this device, or the seeded request's override — and
 * tells everyone on this device where he now works: the deputy and the accountant their secondary role, a
 * seat's holder his group, a coordinator the groups sorted to him, a female guide or a cluster assistant the
 * cluster. Whoever left loses his post; a group head whose group joined sees its cluster.
 */
export function writeCluster(req: Pick<ClusterRequest, "headId" | "headName" | "headGroup" | "seed">, next: Cluster, admins: Record<string, AdminProfile>) {
  if (req.seed) actions.setClusterOverride(next.id, next);
  else actions.upsertAdmin(req.headId, { cluster: next });
  const base = { clusterId: next.id, clusterName: next.name, headId: req.headId, headName: req.headName };
  const yes = (x?: ClusterInvite) => x?.status === "accepted";
  for (const [id, a] of Object.entries(admins)) {
    if (id === req.headId) continue;
    const patch: Partial<AdminProfile> = {};
    const deputy = next.deputy?.id === id && yes(next.deputy);
    if (deputy || a.deputyOf?.clusterId === next.id) patch.deputyOf = deputy ? { ...base, headGroup: req.headGroup ?? 0 } : undefined;
    const accountant = next.accountant?.id === id && yes(next.accountant);
    if (accountant || a.accountantOf?.clusterId === next.id) patch.accountantOf = accountant ? base : undefined;
    const coordinator = next.coordinators.find((x) => x.id === id && yes(x));
    if (coordinator || a.coordinatorIn?.clusterId === next.id) patch.coordinatorIn = coordinator ? { ...base, groups: sortedTo(next, id) } : undefined;
    const seat = Object.entries(next.seats).flatMap(([n, seats]) => seats.filter((x) => x.who?.id === id && yes(x.who)).map((x) => ({ n: Number(n), kind: x.kind })))[0];
    const female = next.femaleGuides.some((x) => x.id === id && yes(x));
    const assistant = next.assistants.some((x) => x.id === id && yes(x));
    const serves = seat ? { ...base, role: seat.kind, groups: [seat.n] } : female ? { ...base, role: "guide-f" as const, groups: guidedBy(next, id) } : assistant ? { ...base, role: "cluster-assistant" as const, groups: [] } : undefined;
    if (serves || a.servesIn?.clusterId === next.id) patch.servesIn = serves;
    // A group head who accepted brings his group into the cluster
    const g = Object.values(next.groups).find((x) => x.id === id);
    if (a.group && (g?.number === a.group.number || a.group.clusterId === next.id)) {
      const inIt = !!g && yes(g);
      if (inIt ? a.group.clusterId !== next.id : a.group.clusterId === next.id) patch.group = { ...a.group, clusterId: inIt ? next.id : undefined };
    }
    if (Object.keys(patch).length) actions.upsertAdmin(id, patch);
  }
}

/** Sets one invitation's answer wherever it sits in the request */
function answered(c: Cluster, x: Inbound, id: string, status: ClusterInvite["status"], at: number, reason?: string): Cluster {
  const mark = <T extends ClusterInvite>(v: T): T => (v.id === id ? { ...v, status, at, reason } : v);
  switch (x.kind) {
    case "group":
      return { ...c, groups: Object.fromEntries(Object.entries(c.groups).map(([n, g]) => [n, mark(g)])) };
    case "guide":
    case "assistant":
      return { ...c, seats: { ...c.seats, [x.number!]: (c.seats[x.number!] ?? []).map((s, i) => (i === x.seat && s.who ? { ...s, who: mark(s.who) } : s)) } };
    case "cluster-assistant":
      return { ...c, assistants: c.assistants.map(mark) };
    case "tech":
      return { ...c, coordinators: c.coordinators.map(mark) };
    case "guide-f":
      return { ...c, femaleGuides: c.femaleGuides.map(mark) };
    case "deputy":
      return { ...c, deputy: c.deputy && mark(c.deputy) };
    case "accountant":
      return { ...c, accountant: c.accountant && mark(c.accountant) };
  }
}

/**
 * The invited person answers. Accepting a place declines whatever else is pending for the same: a group
 * joins one cluster, a person serves in one place in the season. The deputy's and the accountant's roles are
 * secondary — given to someone already in the same cluster — and decline nothing.
 */
export function answerInvitation(me: { id: string; name: string }, inbound: Inbound, status: "accepted" | "declined", admins: Record<string, AdminProfile>, requests: ClusterRequest[], reason?: string) {
  const at = Date.now();
  const touched = new Map<string, { req: ClusterRequest; c: Cluster }>();
  const apply = (x: Inbound, s: ClusterInvite["status"], why?: string) => {
    const cur = touched.get(x.req.cluster.id)?.c ?? x.req.cluster;
    touched.set(x.req.cluster.id, { req: x.req, c: answered(cur, x, me.id, s, at, why) });
  };
  apply(inbound, status, reason);
  const secondary = (k: InviteKind) => k === "deputy" || k === "accountant";
  if (status === "accepted" && !secondary(inbound.kind)) {
    for (const other of invitationsFor(me.id, requests)) {
      if (other.invite.status !== "pending" || secondary(other.kind)) continue;
      if (other.req.cluster.id === inbound.req.cluster.id && other.kind === inbound.kind && other.number === inbound.number && other.seat === inbound.seat) continue;
      if ((other.kind === "group") !== (inbound.kind === "group")) continue;
      apply(other, "declined", `قبِل ${inviteWhat(inbound)} في ${inbound.req.cluster.name}`);
    }
  }
  for (const { req, c } of touched.values()) writeCluster(req, c, admins);
  logAdmin(me.id, status === "accepted" ? `قبول دعوة: ${inviteWhat(inbound)} في ${inbound.req.cluster.name}` : `اعتذار عن دعوة: ${inviteWhat(inbound)} في ${inbound.req.cluster.name}`, inbound.req.headName, reason, { area: "clusters", ref: inbound.req.cluster.id });
}

// ───────────────────────── Sending and the review ─────────────────────────

/** Its head sends it for review once complete; sent again after it was sent back */
export function sendCluster(req: ClusterRequest, admins: Record<string, AdminProfile>) {
  const at = Date.now();
  writeCluster(req, { ...req.cluster, status: "pending", sentAt: at, firstSentAt: req.cluster.firstSentAt ?? at, review: undefined, decision: undefined }, admins);
  logAdmin(req.headId, req.cluster.decision?.status === "rejected" ? `إعادة إرسال ${req.cluster.name} بعد ملاحظات الإدارة` : `إرسال طلب ${req.cluster.name} للمراجعة`, undefined, `${req.groups.length} مجموعات — مجموع الفئات ${req.weight} — ${req.cadre} من الكادر`, { area: "clusters", ref: req.cluster.id });
}

export type ReviewAction = "review" | "approve" | "reject" | "reopen";

/** The administration's step on a request: opens its review, approves it, sends it back with notes, or opens an approved one again */
export function reviewCluster(req: ClusterRequest, action: ReviewAction, by: string, admins: Record<string, AdminProfile>, note?: string) {
  const at = Date.now();
  const c = req.cluster;
  const next: Cluster =
    action === "review"
      ? { ...c, status: "reviewing", review: { at, by } }
      : action === "approve"
        ? { ...c, status: "approved", decision: { status: "approved", at, by } }
        : action === "reject"
          ? { ...c, status: "rejected", decision: { status: "rejected", at, by, note } }
          : { ...c, status: "pending", decision: undefined, review: undefined, reopened: { at, by } };
  writeCluster(req, next, admins);
}

/**
 * An edit the administration makes on a request outside the usual rules («تعديل استثنائي»), always with
 * its reason: it is written to the request and to the record of everyone it touches.
 */
export function exceptionalEdit(req: ClusterRequest, next: Cluster, admins: Record<string, AdminProfile>) {
  writeCluster(req, next, admins);
}

export type { ClusterGroup };

/** «سامر نجار — منسق تقني» */
export function personLine(id: string, name: string, admins: Record<string, AdminProfile>, cadre: Cadre) {
  return `${name} — ${roleName(roleOfPerson(id, admins, cadre), structureNow())}`;
}

/** The cluster's groups for its head or its deputy, as the cluster's screens show them */
export function useClusterGroupsOf(p: AdminProfile | undefined) {
  const admins = useStore((s) => s.admins);
  const overrides = useStore((s) => s.formation.overrides);
  const s = useStructure();
  return useMemo(() => clusterGroupsOf(s, p, admins, overrides), [s, p, admins, overrides]);
}

/** Every invitation of a request through one function: its groups, its seats, its lists, its deputy and accountant */
export function mapInvites(c: Cluster, fn: <T extends ClusterInvite>(x: T) => T): Cluster {
  return {
    ...c,
    groups: Object.fromEntries(Object.entries(c.groups).map(([n, g]) => [n, fn(g)])),
    seats: Object.fromEntries(Object.entries(c.seats).map(([n, seats]) => [n, seats.map((x) => (x.who ? { ...x, who: fn(x.who) } : x))])),
    assistants: c.assistants.map(fn),
    coordinators: c.coordinators.map(fn),
    femaleGuides: c.femaleGuides.map(fn),
    deputy: c.deputy && fn(c.deputy),
    accountant: c.accountant && fn(c.accountant),
  };
}

/** A fresh invitation */
export function invite(id: string, name: string): ClusterInvite {
  return { id, name, at: Date.now(), status: "pending" };
}
