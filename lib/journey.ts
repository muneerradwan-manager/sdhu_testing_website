/**
 * Everything a pilgrim sees after acceptance — taken from the operating document's worked example
 * (Cluster Al-Nour, مجموعة اللطيف (key 27), Abraj Al-Nour hotel, flight RB 507, Mina camp 42...).
 * Assignments (rooms, seats, cards) are derived deterministically from the application members.
 */
import { groupName } from "./groups";
import { MONTHS, birthOf, mainApplicant, matchingPick, type PublishedDraw } from "./lottery";
import { SEASON } from "./season";
import { ageOf, birthYear, personName, phoneOf, type Person } from "./registry";
import { withNames } from "./demo-text";
import type { Member } from "./rules";
import { seeded } from "./utils";
import CLUSTER_DATA from "@/testdata/journey/cluster.json";
import GROUP_DATA from "@/testdata/journey/group.json";
import PLACES_DATA from "@/testdata/journey/places.json";
import FLIGHTS_DATA from "@/testdata/journey/flights.json";
import ITINERARY_DATA from "@/testdata/journey/itinerary.json";
import APPLICATION_NUMBERS from "@/testdata/pilgrims/application-numbers.json";

/** The cluster of the operating document's example (testdata/journey/cluster.json): its head by national number */
const { headId, headTitle, ...cluster } = CLUSTER_DATA;
export const CLUSTER = { ...cluster, head: `${headTitle} ${personName(headId)}` };

/** Its مجموعة اللطيف (testdata/journey/group.json): the team's names and phones are the civil registry's */
export const GROUP = {
  ...GROUP_DATA,
  team: GROUP_DATA.team.map((t) => ({ role: t.role, name: withNames(t.name ?? "{short}", t.id), phone: phoneOf(t.id, true), note: t.note })),
};

/** Its hotels, camps and the places of the rites (testdata/journey/places.json); مزدلفة's point is its group's */
export const PLACES = { ...PLACES_DATA, muzdalifah: { name: `نقطة مبيت ${groupName(GROUP.number)}`, ...PLACES_DATA.muzdalifah } };

export const FLIGHTS = FLIGHTS_DATA;

export const ITINERARY = ITINERARY_DATA;

export type Track = "direct" | "lottery";
export type TrackKey = "submitted" | "checking" | "eligible" | "direct" | "lottery" | "accepted" | "notAccepted";
export type TrackStep = { key: TrackKey; at: number; title: string; text: string };

const COMMON: TrackStep[] = [
  { key: "submitted", at: 0, title: "مُقدَّم", text: "استلمنا طلبك وما دفعته (رسم التسجيل، والدفعة الأولى في القبول المباشر)" },
  { key: "checking", at: 2, title: "تدقيق البيانات", text: "مطابقة الشؤون المدنية وتطبيق شروط الموسم" },
  { key: "eligible", at: 4, title: "مؤهل", text: "جميع أفراد الطلب مستوفون للشروط" },
];

/** The registration an application belongs to (older saved applications were direct-acceptance ones) */
export function trackOf(app: { track?: Track }): Track {
  return app.track ?? "direct";
}

/** Direct acceptance goes by the applicant's age: accepted when at or above the announced cut-off */
export function directAccepted(app: { members: Member[]; announcedDirectAge?: number; simulated?: string[] }, minAge: number = SEASON.acceptedDirectAge) {
  const applicant = app.members.find((m) => m.relation === "self") ?? app.members[0];
  // The demo's tester simulated the direct-acceptance age: accepted as if he were old enough
  if (applicant && app.simulated?.includes(`${applicant.person.id}:direct-age`)) return true;
  return !!applicant && ageOf(applicant.person) >= (app.announcedDirectAge ?? minAge);
}

/**
 * Tracking timeline (seconds after submission in the demo). Each registration has its own:
 * direct → ages announced → accepted directly OR not accepted (nothing moves to the lottery by itself);
 * lottery → live draw of birth years and months → accepted when the main applicant's were drawn, or not.
 * Until the draw's results are published, a lottery application waits at the draw.
 */
export function trackSteps(track: Track, accepted: boolean, lottery?: { published: boolean; line?: string }, minAge: number = SEASON.acceptedDirectAge): TrackStep[] {
  if (track === "direct") {
    return [
      ...COMMON,
      { key: "direct", at: 6, title: "اعتماد القبول المباشر", text: `صاحب الطلب ضمن الأعمار المقبولة (${minAge}+) — ${SEASON.windows.direct.announce}` },
      accepted
        ? { key: "accepted", at: 8, title: "مقبول مباشرة", text: "قُبل طلبك وفق الأكبر سناً" }
        : { key: "notAccepted", at: 8, title: "لم يُقبل مباشرة", text: `التسجيل الأولي على القرعة ${SEASON.windows.lottery.hijri}` },
    ];
  }
  const draw: TrackStep = { key: "lottery", at: 6.5, title: "القرعة العلنية", text: `بث مباشر — ${SEASON.windows.lottery.draw}: تُسحب سنوات ميلاد، ولبعضها أشهر` };
  if (lottery && !lottery.published) return [...COMMON, { ...draw, text: "انتهى السحب — بانتظار نشر النتائج" }];
  return [
    ...COMMON,
    draw,
    accepted
      ? { key: "accepted", at: 10, title: "مقبول بالقرعة", text: lottery?.line ?? "سُحبت سنة ميلاد صاحب الطلب" }
      : { key: "notAccepted", at: 10, title: "لم يُقبل بالقرعة", text: "لم تُسحب سنة ميلاد صاحب الطلب وشهره هذا الموسم" },
  ];
}

/** The drawn line a lottery application matched: "سُحبت مواليد 1980 كاملة" / "سُحب مواليد شباط 1972" */
export function drawLine(app: { members: Member[] }, draw: PublishedDraw | null) {
  const main = mainApplicant(app);
  const pick = draw && main ? matchingPick(main, draw.picks) : null;
  if (!main || !pick) return null;
  const b = birthOf(main);
  return pick.months === "all" ? `سُحبت مواليد ${b.year} كاملة` : `سُحب مواليد ${MONTHS[b.month - 1]} ${b.year}`;
}

/**
 * Where an application stands: whether it is accepted, and its timeline — direct ones by the announced
 * age, lottery ones by the published draw (none published yet: waiting at the draw).
 */
export function outcomeOf(app: { track?: Track; members: Member[]; announcedDirectAge?: number; simulated?: string[] }, draw: PublishedDraw | null, minAge: number = SEASON.acceptedDirectAge) {
  const track = trackOf(app);
  if (track === "direct") {
    const age = app.announcedDirectAge ?? minAge;
    const accepted = directAccepted(app, age);
    return { track, accepted, steps: trackSteps("direct", accepted, undefined, age) };
  }
  const line = drawLine(app, draw);
  return { track, accepted: !!line, steps: trackSteps("lottery", !!line, { published: !!draw, line: line ?? undefined }) };
}

export function stageAt(steps: TrackStep[], elapsed: number) {
  const stage = [...steps].reverse().find((t) => elapsed >= t.at) ?? steps[0];
  return { stage, index: steps.indexOf(stage) };
}

/** After acceptance, the file fills in piece by piece — seconds after submission */
export const REVEAL = { group: 11.5, makkah: 13, madinah: 14, flights: 15, camps: 16, card: 17 } as const;

/** Applications whose number the demo fixed (testdata/pilgrims/application-numbers.json); the others are drawn from the applicant's */
const FIXED_NUMBERS: Record<string, string> = APPLICATION_NUMBERS;

export function applicationNumberFor(applicantId: string) {
  if (FIXED_NUMBERS[applicantId]) return FIXED_NUMBERS[applicantId];
  return String(4000 + Math.floor(seeded(applicantId)() * 5000));
}

export type Assignment = {
  person: Person;
  relationLabel: string;
  room: string;
  madinahRoom: string;
  seat: string;
  returnSeat: string;
  bus: number;
  tent: number;
  bracelet: string;
  needs: string[];
};

export function assign(members: Member[], labelFor: (m: Member) => string): Assignment[] {
  const letters = ["C", "D", "E", "F", "A", "B"];
  let menIdx = 0;
  let womenIdx = 0;
  return members.map((m, i) => {
    const woman = m.person.gender === "F";
    const needsLift = m.needs.length > 0 || birthYear(m.person) <= SEASON.rules.elderlyNeedsCompanionMaxBirthYear;
    const room = woman ? `12${String(16 + Math.floor(womenIdx++ / 3) * 2).padStart(2, "0")}` : `12${String(14 - Math.floor(menIdx++ / 3) * 2).padStart(2, "0")}`;
    return {
      person: m.person,
      relationLabel: labelFor(m),
      room,
      madinahRoom: woman ? "806" : "804",
      seat: `23${letters[i] ?? "A"}`,
      returnSeat: `31${letters[i] ?? "A"}`,
      bus: woman ? 8 : 7,
      tent: woman ? PLACES.mina.tents.women : PLACES.mina.tents.men,
      bracelet: `NR27-${m.person.id.slice(-4)}`,
      needs: needsLift && m.needs.length === 0 && ageOf(m.person) >= 69 ? ["مرافقة كبير سن"] : m.needs,
    };
  });
}
