import { ageOf, fullName } from "@/lib/registry";
import type { AdminProfile, Application, PostAcceptance } from "@/lib/store";
import { seeded } from "@/lib/utils";

/**
 * Members of group 27 already enrolled before this demo (38 + the three seeded families = 44;
 * + عائلة محمد الخطيب = 48). Families join in the assignment window only: they read the group
 * directory, contact the group, and the group's coordinator enrolls them (a family moves as one).
 */
export const BASE_ACTIVE = 38;

export type JoinMember = { id: string; name: string; age: number; gender: "M" | "F"; relation: string; needs: string[] };
export type JoinRequest = {
  id: string;
  real: boolean;
  applicant: string;
  number: string;
  /** A new enrollment, or a family that moved here from another group */
  kind: "enrolled" | "transfer";
  receivedLabel: string;
  note?: string;
  members: JoinMember[];
};

/** Needs that call for a room near the lift — forwarded to the tower supervisor automatically */
export const LIFT_NEEDS = ["كرسي متحرك", "صعوبة في المشي", "أكسجين ليلي", "مرافقة كبير سن"];

export const SEED_REQUESTS: JoinRequest[] = [
  {
    id: "seed-salim",
    real: false,
    applicant: "سليم حسن",
    number: "5130",
    kind: "enrolled",
    receivedLabel: "سجّله المنسق سامر نجار — قبل يومين",
    note: "اختار المجموعة ليكون مع جيرانه من حي المزة.",
    members: [{ id: "01011105130", name: "سليم حسن", age: 66, gender: "M", relation: "صاحب الطلب", needs: ["ضغط الدم"] }],
  },
  {
    id: "seed-saadi",
    real: false,
    applicant: "هشام عبد الكريم السعدي",
    number: "4877",
    kind: "enrolled",
    receivedLabel: "سجّله المنسق سامر نجار ووقّع العقد — قبل 5 ساعات",
    members: [
      { id: "01044404877", name: "هشام عبد الكريم السعدي", age: 71, gender: "M", relation: "صاحب الطلب", needs: ["كرسي متحرك", "سكري"] },
      { id: "01044404878", name: "بلال هشام السعدي", age: 38, gender: "M", relation: "ابن — مرافق", needs: [] },
    ],
  },
  {
    id: "seed-hourani",
    real: false,
    applicant: "طارق محمود الحوراني",
    number: "6215",
    kind: "transfer",
    receivedLabel: "انتقل من المجموعة 31 بطلبه — سجّله المنسق سامر نجار — قبل يوم",
    note: "انتقلت العائلة كاملة (3 أفراد) من المجموعة 31 لتكون مع أقاربها.",
    members: [
      { id: "01055506215", name: "طارق محمود الحوراني", age: 52, gender: "M", relation: "صاحب الطلب", needs: [] },
      { id: "01055506216", name: "هالة جميل الشيخ", age: 47, gender: "F", relation: "زوجة", needs: [] },
      { id: "01055506217", name: "أنس طارق الحوراني", age: 19, gender: "M", relation: "ابن", needs: [] },
    ],
  },
];

const RELATIONS: Record<string, string> = {
  self: "صاحب الطلب",
  spouse: "زوج / زوجة",
  parent: "أب / أم",
  child: "ابن / ابنة",
  sibling: "أخ / أخت",
  grandparent: "جد / جدة",
  grandchild: "حفيد / حفيدة",
  other: "قريب / مرافق",
};

export function requestFromApplication(sid: string, app: Application, post: PostAcceptance): JoinRequest {
  const hours = post.groupApprovedAt ? Math.max(0, Math.round((Date.now() - post.groupApprovedAt) / 3_600_000)) : 0;
  const applicant = app.members.find((m) => m.relation === "self")?.person ?? app.members[0]?.person;
  const moved = post.transfers?.at(-1);
  const when = hours > 0 ? `قبل ${hours} ساعة` : "الآن";
  return {
    id: sid,
    real: true,
    applicant: applicant ? fullName(applicant) : sid,
    number: app.number,
    kind: moved ? "transfer" : "enrolled",
    receivedLabel: `${moved ? `انتقل من المجموعة ${moved.from} — ` : ""}سجّله ${post.enrolledBy?.name ?? "المنسق التقني"} ووقّع العقد — ${when}`,
    members: app.members.map((m) => ({
      id: m.person.id,
      name: fullName(m.person),
      age: ageOf(m.person),
      gender: m.person.gender,
      relation: RELATIONS[m.relation] ?? m.relation,
      needs: m.needs,
    })),
  };
}

/** Real families enrolled in this group by its coordinator */
/**
 * The families waiting in one group. A cluster head manages every group of his cluster the same way,
 * so each group carries its own families, not one shared demo list.
 */
export function seedRequestsFor(groupNumber: number | undefined, homeNumber: number | undefined): JoinRequest[] {
  if (groupNumber === undefined || groupNumber === homeNumber) return SEED_REQUESTS;
  const rnd = seeded(`group-${groupNumber}-families`);
  const count = 2 + Math.floor(rnd() * 2);
  const out: JoinRequest[] = [];
  for (let i = 0; i < count; i++) {
    const woman = rnd() < 0.4;
    const first = woman ? WOMEN[Math.floor(rnd() * WOMEN.length)] : MEN[Math.floor(rnd() * MEN.length)];
    const last = LASTS[Math.floor(rnd() * LASTS.length)];
    const age = 55 + Math.floor(rnd() * 20);
    const id = `010${String(groupNumber).padStart(2, "0")}${String(41000 + i * 131).padStart(6, "0")}`;
    const withCompanion = rnd() < 0.55;
    const members = [{ id, name: `${first} ${last}`, age, gender: woman ? ("F" as const) : ("M" as const), relation: "صاحب الطلب", needs: age > 70 ? ["مرافقة كبير سن"] : rnd() < 0.3 ? ["سكري"] : [] }];
    if (withCompanion) {
      const cFirst = rnd() < 0.5 ? WOMEN[Math.floor(rnd() * WOMEN.length)] : MEN[Math.floor(rnd() * MEN.length)];
      members.push({ id: id + "1", name: `${cFirst} ${last}`, age: 30 + Math.floor(rnd() * 18), gender: rnd() < 0.5 ? ("F" as const) : ("M" as const), relation: "مرافق", needs: [] });
    }
    out.push({
      id: `seed-g${groupNumber}-${i}`,
      real: false,
      applicant: `${first} ${last}`,
      number: String(4000 + groupNumber * 13 + i),
      kind: rnd() < 0.25 ? "transfer" : "enrolled",
      receivedLabel: `سجّله منسق المجموعة ${groupNumber} — قبل ${1 + Math.floor(rnd() * 4)} أيام`,
      note: withCompanion ? "طلب عائلي — يُنقل كاملاً أو لا يُنقل." : "اختار المجموعة ليكون مع أهل منطقته.",
      members,
    });
  }
  return out;
}

export function assignedRealFamilies(groupNumber: number, post: Record<string, PostAcceptance>, applications: Record<string, Application>) {
  return Object.entries(post)
    .filter(([sid, p]) => p.groupNumber === groupNumber && p.groupApprovedAt && applications[sid])
    .map(([sid, p]) => requestFromApplication(sid, applications[sid], p));
}

/** Seeded families count as assigned; the leader's acknowledgement does not change membership */
export function memberCountOf(id: string, applications: Record<string, Application>) {
  const seed = SEED_REQUESTS.find((r) => r.id === id);
  if (seed) return seed.members.length;
  return applications[id]?.members.length ?? 0;
}

export function activeCount(groupNumber: number | undefined, post: Record<string, PostAcceptance>, applications: Record<string, Application>, base = BASE_ACTIVE, homeNumber = groupNumber) {
  if (groupNumber === undefined) return base;
  const seeds = seedRequestsFor(groupNumber, homeNumber).reduce((n, r) => n + r.members.length, 0);
  const real = assignedRealFamilies(groupNumber, post, applications).reduce((n, r) => n + r.members.length, 0);
  return base + seeds + real;
}

/** Group composition for the capacity board: men, women and elderly (69+) — nobody under 17 travels */
export function compositionOf(roster: { age: number; gender: "M" | "F" }[]) {
  const elderly = roster.filter((r) => r.age >= 69).length;
  const men = roster.filter((r) => r.age < 69 && r.gender === "M").length;
  const women = roster.filter((r) => r.age < 69 && r.gender === "F").length;
  return { men, women, elderly };
}
// ───────────────────────── Field roster ─────────────────────────

export type RosterEntry = { id: string; name: string; age: number; gender: "M" | "F"; room: string; needs: string[]; real?: boolean; phone: string };

const MEN = ["خالد", "بلال", "أنس", "طارق", "مصطفى", "إبراهيم", "علي", "نزار", "وائل", "هشام", "زياد", "عماد", "فراس", "ماهر", "عدنان", "رياض"];
const WOMEN = ["سلمى", "رغد", "نور", "ميساء", "لبنى", "دعاء", "سمر", "إيمان", "هالة", "بشرى", "وفاء", "منى", "ريم", "سوسن"];
const LASTS = ["الأحمد", "الحموي", "الدمشقي", "السعدي", "العلي", "الحسين", "الشيخ", "الإدلبي", "الحوراني", "المصري", "القباني", "الطباع", "الخياط", "النحاس"];

export const MISSING_ID = "01011105130";

/**
 * 48 pilgrims of group 27: real assigned families first, then stable generated members.
 * سليم حسن is always on the list — he is the one who is late at the muster.
 */
export function buildRoster(
  profile: AdminProfile | undefined,
  applications: Record<string, Application>,
  post: Record<string, PostAcceptance> = {},
  opts: { groupNumber?: number; size?: number } = {},
): RosterEntry[] {
  const real: RosterEntry[] = [];
  const groupNumber = opts.groupNumber ?? profile?.group?.number;
  for (const [sid, p] of Object.entries(post)) {
    if (groupNumber === undefined || p.groupNumber !== groupNumber || !p.groupApprovedAt) continue;
    const app = applications[sid];
    if (!app) continue;
    app.members.forEach((m, i) => {
      real.push({
        id: m.person.id,
        name: fullName(m.person),
        age: ageOf(m.person),
        gender: m.person.gender,
        room: m.person.gender === "F" ? `12${16 + i}` : `12${14 - i}`,
        needs: m.needs,
        real: true,
        phone: `09${m.person.id.slice(-8)}`,
      });
    });
  }
  const salim: RosterEntry = { id: MISSING_ID, name: "سليم حسن", age: 66, gender: "M", room: "1211", needs: ["ضغط الدم"], phone: "0933105130" };
  const target = Math.max(opts.size ?? 48, real.length + 1);
  const rnd = seeded(`group-${groupNumber ?? 27}-roster`);
  const filler: RosterEntry[] = [];
  let i = 0;
  while (real.length + 1 + filler.length < target) {
    const woman = rnd() < 0.48;
    const first = woman ? WOMEN[Math.floor(rnd() * WOMEN.length)] : MEN[Math.floor(rnd() * MEN.length)];
    const age = 42 + Math.floor(rnd() * 34);
    const id = `0104${String(270000 + i * 37).padStart(7, "0")}`;
    filler.push({
      id,
      name: `${first} ${LASTS[Math.floor(rnd() * LASTS.length)]}`,
      age,
      gender: woman ? "F" : "M",
      room: `12${String(1 + Math.floor(rnd() * 24)).padStart(2, "0")}`,
      needs: age > 70 && rnd() < 0.5 ? ["مرافقة كبير سن"] : rnd() < 0.12 ? ["سكري"] : [],
      phone: `09${id.slice(-8)}`,
    });
    i++;
  }
  // سليم sits in the middle of the list, like in real life
  const all = [...real, ...filler];
  all.splice(Math.min(all.length, 23), 0, salim);
  return all;
}
