/**
 * Deterministic fake data for the staff portal (الموظفون) and the operations room.
 * Everything here is fictional and only exists to make the demo feel like a live season.
 * Real data created during the demo (applications, tickets, administrators, events) is merged
 * on top of these seeds by the staff pages.
 */
import { withStaffNames } from "@/lib/staff";
import { groupName } from "@/lib/groups";
import { type Person, type Relation, getPerson, personName, phoneOf } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import type { AdminProfile, AuditEvent, Ticket } from "@/lib/store";
import { satAttempt } from "@/lib/data/admin-exam";
import { OFFICIAL_DRAW, drawTotals } from "@/lib/lottery";
import { seeded } from "@/lib/utils";
import STATS from "@/testdata/registration/stats.json";
import DIRECT from "@/testdata/registration/direct-acceptance.json";
import APPLICATIONS from "@/testdata/registration/seed-applications.json";
import ADMINS_RAW from "@/testdata/staff/seed-admins.json";
import INCIDENTS_RAW from "@/testdata/staff/incidents.json";
import TASKS_RAW from "@/testdata/staff/tasks.json";
import EVENTS_RAW from "@/testdata/staff/audit-events.json";
import EXECUTIVE from "@/testdata/staff/executive.json";

const ADMINS = withStaffNames(ADMINS_RAW);
const INCIDENTS = withStaffNames(INCIDENTS_RAW);
const TASKS = withStaffNames(TASKS_RAW);
const EVENTS = withStaffNames(EVENTS_RAW);

/**
 * Local wall-clock timestamps so every viewer sees the same hour: the JSON writes them «2026-10-07T09:02», with no
 * zone, which a Date reads as local time
 */
const at = (local: string) => new Date(local).getTime();
/** A group's name where the JSON writes «{group:27}» */
const withGroups = (s: string) => s.replace(/\{group:(\d+)\}/g, (_, n: string) => groupName(Number(n)));

// ───────────────────────── Registration overview ─────────────────────────

export const REG_STATS: {
  applications: number;
  persons: number;
  eligible: number;
  autoApproved: number;
  needsReview: number;
  rejected: number;
  family: number;
  byGovernorate: { name: string; value: number }[];
  rejectionReasons: { label: string; value: number }[];
} = STATS;

/** Applications per day over the 14 days of the direct registration (12 – 25 August) — an opening rush and a closing one */
export const DAILY_REGISTRATIONS: number[] = (() => {
  const rnd = seeded("daily-registrations-1448");
  const raw = Array.from({ length: 14 }, (_, i) => {
    const opening = Math.max(0, 4 - i) * 0.35;
    const closing = Math.max(0, i - 10) * 0.3;
    return 1 + opening + closing + rnd() * 0.35;
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  const scaled = raw.map((v) => Math.round((v / sum) * REG_STATS.applications));
  scaled[scaled.length - 1] += REG_STATS.applications - scaled.reduce((a, b) => a + b, 0);
  return scaled;
})();

// ───────────────────────── Applications that need human review ─────────────────────────

export type ReviewFlag = { title: string; detail: string; tone: "maroon" | "gold" };
export type ReviewDoc = { name: string; status: "ok" | "issue" | "missing"; note?: string };

export type SeedApplication = {
  id: string;
  number: string;
  office: string;
  governorate: string;
  submittedAt: number;
  mode: "booklet" | "national" | "manual";
  members: Member[];
  flags: ReviewFlag[];
  documents: ReviewDoc[];
  evidence: string;
  /** Short case label shown in the queue */
  caseLabel: string;
};

/** A citizen of the demo by national number (testdata/people/citizens.json) */
const person = (id: string): Person => getPerson(id)!;

const member = (p: Person, relation: Relation, relationVerified = true, extra: Partial<Member> = {}): Member => ({
  person: p,
  relation,
  relationVerified,
  needs: [],
  ...extra,
});

type ApplicationRecord = Omit<SeedApplication, "submittedAt" | "members"> & {
  submittedAt: string;
  members: { id: string; relation: Relation; relationVerified?: boolean; companionId?: string; needs?: string[] }[];
};

/**
 * Applications the checks could not settle (testdata/registration/seed-applications.json). What a registration
 * carries: identity and the fee. No passport, photo or health information — those come after acceptance. A bank
 * payment carries the uploaded payment slip.
 */
export const SEED_APPLICATIONS: SeedApplication[] = (APPLICATIONS as ApplicationRecord[]).map((a) => ({
  ...a,
  submittedAt: at(a.submittedAt),
  members: a.members.map(({ id, relation, relationVerified = true, ...extra }) => member(person(id), relation, relationVerified, extra)),
}));

// ───────────────────────── Direct acceptance & lottery ─────────────────────────
// Two SEPARATE registrations. Direct acceptance ranks its own applications by age; the lottery's are
// counted by the main applicant's birth year and month (lib/lottery.ts) — nothing moves over automatically.

export const LOTTERY: {
  /** Eligible applications from the direct-acceptance registration (12 – 25 August), ranked by age */
  directEligible: number;
  directSeats: number;
} = { directEligible: DIRECT.directEligible, directSeats: DIRECT.directSeats };

/** Seats requested by eligible DIRECT-ACCEPTANCE applications, grouped by applicant age (oldest first) */
export const AGE_BUCKETS: { label: string; minAge: number; seats: number }[] = DIRECT.ageBuckets;

// ───────────────────────── Administrators ─────────────────────────

export type SeedAdmin = { profile: AdminProfile; name: string; position: string; previous?: string };

const admin = (id: string, p: Partial<AdminProfile>): AdminProfile => ({
  nationalId: id,
  createdAt: at("2026-09-20T09:00"),
  phone: phoneOf(id),
  positions: [],
  languages: ["العربية"],
  skills: [],
  documents: ["الهوية", "الصورة", "لا حكم عليه"],
  joinDecisions: {},
  musters: [],
  ...p,
});

/** The test he sat as testdata/staff/seed-admins.json writes it (lib/data/admin-exam.ts satAttempt) */
type SatRecord = Omit<Parameters<typeof satAttempt>[0], "id" | "startedAt" | "submittedAt"> & { startedAt: string; submittedAt: string };
type AdminRecord = Omit<AdminProfile, "nationalId" | "feePaidAt" | "eligibleAt" | "exam" | "oral" | "group"> & {
  nationalId: string;
  position: string;
  previous?: string;
  feePaidAt?: string;
  eligibleAt?: string;
  exam?: SatRecord;
  oral?: Omit<NonNullable<AdminProfile["oral"]>, "bookedAt" | "at"> & { bookedAt: string; at?: string };
  group?: Omit<NonNullable<AdminProfile["group"]>, "requestedAt" | "feePaidAt" | "approvedAt"> & { requestedAt: string; feePaidAt?: string; approvedAt?: string };
};

const timedOral = ({ bookedAt, at: on, ...o }: NonNullable<AdminRecord["oral"]>): NonNullable<AdminProfile["oral"]> => ({ ...o, bookedAt: at(bookedAt), ...(on !== undefined && { at: at(on) }) });
const timedGroup = ({ requestedAt, feePaidAt, approvedAt, ...g }: NonNullable<AdminRecord["group"]>): NonNullable<AdminProfile["group"]> => ({
  ...g,
  requestedAt: at(requestedAt),
  ...(feePaidAt !== undefined && { feePaidAt: at(feePaidAt) }),
  ...(approvedAt !== undefined && { approvedAt: at(approvedAt) }),
});

/**
 * The season's applicants for the administrators' posts (testdata/staff/seed-admins.json): each one's sat test is
 * marked from the question bank by satAttempt; his name and phone are his civil record's.
 */
export const SEED_ADMINS: SeedAdmin[] = (ADMINS as unknown as AdminRecord[]).map(({ nationalId, position, previous, feePaidAt, eligibleAt, exam, oral, group, ...p }) => ({
  name: personName(nationalId, "full"),
  position,
  ...(previous !== undefined && { previous }),
  profile: admin(nationalId, {
    ...p,
    ...(feePaidAt !== undefined && { feePaidAt: at(feePaidAt) }),
    ...(eligibleAt !== undefined && { eligibleAt: at(eligibleAt) }),
    ...(exam && { exam: satAttempt({ ...exam, id: nationalId, startedAt: at(exam.startedAt), submittedAt: at(exam.submittedAt) }) }),
    ...(oral && { oral: timedOral(oral) }),
    ...(group && { group: timedGroup(group) }),
  }),
}));

export const EVALUATION_ITEMS = ["دقة التجمّعات والحضور", "التعامل مع البلاغات", "الالتزام بالمواعيد", "سلامة كبار السن", "التقرير اليومي"];

/**
 * The administrator is not scored once at the end: he is scored stage by stage through the season,
 * because his work differs from one stage to the next. Each stage takes a score, a note, and a piece
 * of evidence when the staff have one — a photo or a document from that stage itself.
 */
export const EVALUATION_STAGES: { key: string; label: string; hint: string }[] = [
  { key: "pretravel", label: "مرحلة ما قبل السفر", hint: "التدريب، وتجهيز الحجاج ووثائقهم، والاستعداد للرحلة" },
  { key: "airport", label: "مرحلة المطار", hint: "التجمّع، والإجراءات، والأمتعة، والصعود إلى الطائرة" },
  { key: "travel", label: "مرحلة السفر", hint: "الرحلة، والوصول، والانتقال إلى السكن" },
  { key: "makkah", label: "مرحلة مكة", hint: "السكن، والعمرة، والصلوات في المسجد الحرام" },
  { key: "madinah", label: "مرحلة المدينة", hint: "السكن، والزيارة، والصلاة في المسجد النبوي" },
  { key: "mashaer", label: "مرحلة المشاعر", hint: "منى وعرفة ومزدلفة، والجمرات، وطواف الإفاضة" },
];

// ───────────────────────── Operations room ─────────────────────────

export type Zone = "arafat" | "mina" | "muzdalifah" | "jamarat" | "makkah";

export type SeedIncident = Omit<Ticket, "at"> & { minutesAgo: number; zone: Zone };

/** The operations room's open tickets (testdata/staff/incidents.json) */
export const SEED_INCIDENTS: SeedIncident[] = (INCIDENTS as SeedIncident[]).map((i) => ({ ...i, name: withGroups(i.name) }));

/** Target response time per ticket kind, in minutes (0 = immediate) */
export const SLA_MINUTES: Record<Ticket["kind"], number> = {
  missing: 0,
  health: 10,
  transport: 30,
  meal: 120,
  room: 120,
  lost: 120,
  complaint: 240,
};

export const KIND_LABELS: Record<Ticket["kind"], string> = {
  missing: "حاج مفقود",
  health: "حالة صحية",
  transport: "نقل / تأخر حافلة",
  meal: "وجبة / ماء",
  room: "خيمة / غرفة",
  lost: "مفقودات",
  complaint: "شكوى",
};

export type TaskColumn = "todo" | "doing" | "done" | "verified";

export const SEED_TASKS: { id: string; title: string; by: string; to: string; column: TaskColumn; evidence: string; due: string }[] = TASKS as { id: string; title: string; by: string; to: string; column: TaskColumn; evidence: string; due: string }[];

// ───────────────────────── Audit trail (historic) ─────────────────────────

/** The historic audit trail (testdata/staff/audit-events.json) */
export const SEED_EVENTS: AuditEvent[] = (EVENTS as (Omit<AuditEvent, "at"> & { at: string })[]).map((e) => ({ ...e, at: at(e.at), ...(e.target !== undefined && { target: withGroups(e.target) }) }));

/** The objection example (4.5) — application number to trace */
export const OBJECTION_APP = "51877";

// ───────────────────────── Executive (end of season) ─────────────────────────

/** People (not applications) the 1448 draw accepted, and the lottery's others */
const OFFICIAL_LOTTERY = drawTotals(OFFICIAL_DRAW);

/** The end-of-season dashboard (testdata/staff/executive.json): the lottery's two parts of the split are the draw's */
export const EXEC = {
  ...EXECUTIVE,
  split: EXECUTIVE.split.map(({ draw, ...p }) => ({ ...p, value: draw ? OFFICIAL_LOTTERY[draw as "seats" | "notAcceptedSeats"] : p.value! })),
};
