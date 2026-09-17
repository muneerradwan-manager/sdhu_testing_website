import { ageOf, fullName } from "@/lib/registry";
import type { AdminProfile, Application, PostAcceptance } from "@/lib/store";
import { seeded } from "@/lib/utils";

/** Active members of group 27 before this demo's requests arrive (43 + سليم = 44, + عائلة محمد = 48) */
export const BASE_ACTIVE = 43;

export type JoinMember = { id: string; name: string; age: number; gender: "M" | "F"; relation: string; needs: string[] };
export type JoinRequest = {
  id: string;
  real: boolean;
  applicant: string;
  number: string;
  kind: "request" | "assignment";
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
    kind: "assignment",
    receivedLabel: "إسناد من رنا حداد (إدارة التسجيل) — وافق الحاج من تطبيقه",
    note: "إسناد لتجميع حجاج حي المزة معاً.",
    members: [{ id: "01011105130", name: "سليم حسن", age: 66, gender: "M", relation: "صاحب الطلب", needs: ["ضغط الدم"] }],
  },
  {
    id: "seed-saadi",
    real: false,
    applicant: "هشام عبد الكريم السعدي",
    number: "4877",
    kind: "request",
    receivedLabel: "طلب انتساب — قبل 5 ساعات",
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
    kind: "request",
    receivedLabel: "طلب انتساب — قبل يوم",
    note: "أبلغ صاحب الطلب لاحقاً برغبته في الانتقال إلى مجموعة أقاربه (المجموعة 31).",
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
  const hours = post.groupRequestedAt ? Math.max(0, Math.round((post.groupRequestedAt - app.submittedAt) / 3_600_000)) : 0;
  const applicant = app.members[0]?.person;
  return {
    id: sid,
    real: true,
    applicant: applicant ? fullName(applicant) : sid,
    number: app.number,
    kind: "request",
    receivedLabel: hours > 0 ? `طلب انتساب من بوابة الحاج — قبل ${hours} ساعة` : "طلب انتساب من بوابة الحاج — الآن",
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

/** Real pilgrim requests for this group that still need a decision */
export function pendingRealRequests(
  groupNumber: number,
  post: Record<string, PostAcceptance>,
  applications: Record<string, Application>,
  decisions: Record<string, "accepted" | "rejected">,
) {
  return Object.entries(post)
    .filter(([sid, p]) => p.groupNumber === groupNumber && p.groupRequestedAt && !p.groupApprovedAt && !decisions[sid] && applications[sid])
    .map(([sid, p]) => requestFromApplication(sid, applications[sid], p));
}

export function memberCountOf(id: string, applications: Record<string, Application>) {
  const seed = SEED_REQUESTS.find((r) => r.id === id);
  if (seed) return seed.members.length;
  return applications[id]?.members.length ?? 0;
}

export function activeCount(profile: AdminProfile | undefined, applications: Record<string, Application>) {
  const accepted = Object.entries(profile?.joinDecisions ?? {}).filter(([, d]) => d === "accepted");
  return BASE_ACTIVE + accepted.reduce((n, [id]) => n + memberCountOf(id, applications), 0);
}

// ───────────────────────── Field roster ─────────────────────────

export type RosterEntry = { id: string; name: string; age: number; gender: "M" | "F"; room: string; needs: string[]; real?: boolean; phone: string };

const MEN = ["خالد", "بلال", "أنس", "طارق", "مصطفى", "إبراهيم", "علي", "نزار", "وائل", "هشام", "زياد", "عماد", "فراس", "ماهر", "عدنان", "رياض"];
const WOMEN = ["سلمى", "رغد", "نور", "ميساء", "لبنى", "دعاء", "سمر", "إيمان", "هالة", "بشرى", "وفاء", "منى", "ريم", "سوسن"];
const LASTS = ["الأحمد", "الحموي", "الدمشقي", "السعدي", "العلي", "الحسين", "الشيخ", "الإدلبي", "الحوراني", "المصري", "القباني", "الطباع", "الخياط", "النحاس"];

export const MISSING_ID = "01011105130";

/**
 * 48 pilgrims of group 27: real accepted families from the pilgrim portal first, then stable
 * generated members. سليم حسن is always on the list — he is the one who is late at the muster.
 */
export function buildRoster(profile: AdminProfile | undefined, applications: Record<string, Application>): RosterEntry[] {
  const real: RosterEntry[] = [];
  for (const [sid, d] of Object.entries(profile?.joinDecisions ?? {})) {
    if (d !== "accepted") continue;
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
  const target = Math.max(48, real.length + 1);
  const rnd = seeded("group-27-roster");
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
