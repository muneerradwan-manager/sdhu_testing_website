import { ADHKAR, NAWAWI, juzOf, juzPages, pageLabel } from "./data/quran";
import type { LessonAudience, LessonRole } from "./lessons";
import { actions, getState, setState, useStore } from "./store";
import { seeded } from "./utils";

/**
 * النشاطات الدينية — what the guides follow pilgrim by pilgrim, beyond a lesson: memorising the Quran (which page,
 * which surah, which part), memorising hadith (which of the forty), learning the supplications of Hajj and Umrah,
 * and a shared reading of the whole Quran (who read which part). Each activity has its units to master, its
 * audience as its guide's role allows (a female guide's for the women), and its participants: a pilgrim joins it
 * from his portal, or his guide adds him. At each sitting the guide records what each one recited, with a grade;
 * both portals show where each one is.
 */

export type ActivityKind = "quran" | "hadith" | "adhkar" | "khatma";
export type Grade = "excellent" | "vgood" | "good" | "review";

export type Done = { at: number; grade: Grade };
export type Sitting = { at: number; personId: string; units: string[]; grade: Grade; note?: string; by: string };

export type Activity = {
  id: string;
  clusterId?: string;
  groups: number[];
  byId: string;
  byName: string;
  byRole: LessonRole;
  kind: ActivityKind;
  title: string;
  /** What it covers, in words: «جزء عمّ»، «الأحاديث 1 – 20» */
  goal: string;
  /** Its units in the order they are learnt: pages «p604», hadith «h1», supplications by key, parts «j1» */
  units: string[];
  audience: LessonAudience;
  schedule: string;
  place: string;
  startAt: number;
  createdAt: number;
  /** Who joined beyond the seed, and who left it */
  joined: string[];
  left: string[];
  /** What each one mastered, unit by unit: the latest grade */
  progress: Record<string, Record<string, Done>>;
  sittings: Sitting[];
  closedAt?: number;
  /** A seeded activity: the share of its audience in it, and how far they got */
  seed?: { join: number; reach: number };
};

export type ActivitiesState = { list?: Activity[] };

export const KIND_LABEL: Record<ActivityKind, string> = { quran: "تحفيظ القرآن", hadith: "تحفيظ الحديث", adhkar: "حفظ أدعية الحج والعمرة", khatma: "ختمة جماعية" };
export const KIND_HINT: Record<ActivityKind, string> = {
  quran: "كل حاج بصفحاته: أي صفحة وأي سورة وأي جزء سمّعه",
  hadith: "من الأربعين النووية: أي حديث حفظه كل حاج",
  adhkar: "أدعية الحج والعمرة: أيها حفظ كل حاج",
  khatma: "يقرأ المشاركون القرآن معاً: كل جزء ومن قرأه",
};
export const GRADE_LABEL: Record<Grade, string> = { excellent: "ممتاز", vgood: "جيد جداً", good: "جيد", review: "يحتاج مراجعة" };

/** A unit as it reads: a page with its surah and part, a hadith with its opening, a supplication, a part */
export function unitLabel(kind: ActivityKind, unit: string) {
  const n = Number(unit.slice(1));
  if (kind === "quran") return pageLabel(n);
  if (kind === "hadith") return `الحديث ${n}: ${NAWAWI[n - 1] ?? ""}`;
  if (kind === "khatma") return `الجزء ${n}`;
  return ADHKAR.find((a) => a.key === unit)?.title ?? unit;
}

/** The units of a new activity from what its guide chose */
export function unitsFor(kind: ActivityKind, from: number, to: number, shortFirst = true): string[] {
  if (kind === "adhkar") return ADHKAR.map((a) => a.key);
  if (kind === "khatma") return Array.from({ length: 30 }, (_, i) => `j${i + 1}`);
  if (kind === "hadith") return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => `h${from + i}`);
  // the Quran by parts: from part `from` to part `to`; the short surahs first, as one memorises juz' عمّ
  const [a] = juzPages(Math.min(from, to));
  const [, b] = juzPages(Math.max(from, to));
  const pages = Array.from({ length: b - a + 1 }, (_, i) => `p${a + i}`);
  return shortFirst ? pages.reverse() : pages;
}

// ───────────────────────── Who is in it, and how far ─────────────────────────

const draw = (a: Activity, personId: string, what: string) => seeded(`${a.id}-${personId}-${what}`)();

export function isIn(a: Activity, personId: string) {
  if (a.joined.includes(personId)) return true;
  if (a.left.includes(personId)) return false;
  return !!a.seed && draw(a, personId, "join") < a.seed.join;
}

const GRADES: Grade[] = ["excellent", "vgood", "vgood", "good", "good", "review"];
/** What he mastered: as recorded, or, on a seeded activity he is in, as far as its reach draws him */
export function progressOf(a: Activity, personId: string): Record<string, Done> {
  if (a.progress[personId]) return a.progress[personId];
  if (!a.seed || !isIn(a, personId) || a.joined.includes(personId)) return {};
  // a shared reading: each takes a part or two of his own, in turn
  if (a.kind === "khatma") {
    const k = Math.floor(draw(a, personId, "part") * 30);
    return draw(a, personId, "read") < a.seed.reach ? { [`j${k + 1}`]: { at: a.startAt + 4 * 86_400_000, grade: "excellent" } } : {};
  }
  const n = Math.floor(draw(a, personId, "reach") * a.seed.reach * a.units.length);
  return Object.fromEntries(a.units.slice(0, n).map((u, i) => [u, { at: a.startAt + (i + 1) * 2 * 86_400_000, grade: GRADES[Math.floor(draw(a, personId, u) * GRADES.length)] }]));
}

/** Where he is: how many units of how many, the last he recited, and the next one */
export function standing(a: Activity, personId: string) {
  const done = progressOf(a, personId);
  const keys = a.units.filter((u) => done[u]);
  const last = Object.entries(done).sort((x, y) => y[1].at - x[1].at)[0];
  const next = a.kind === "khatma" ? undefined : a.units.find((u) => !done[u]);
  return { count: keys.length, total: a.kind === "khatma" ? undefined : a.units.length, last: last && { unit: last[0], ...last[1] }, next };
}

/** A shared reading: which parts are read, by anyone */
export function khatmaRead(a: Activity, people: string[]) {
  const read = new Set<string>();
  for (const id of people) if (isIn(a, id)) Object.keys(progressOf(a, id)).forEach((u) => read.add(u));
  return read;
}

/** The part a page belongs to, for the summaries («الجزء 30») */
export const partOfUnit = (unit: string) => (unit.startsWith("p") ? juzOf(Number(unit.slice(1))) : undefined);

// ───────────────────────── Seeds ─────────────────────────

const at = (iso: string) => new Date(`${iso}T12:00:00+03:00`).getTime();
const KHALED = { byId: "01033300873", byName: "الشيخ خالد الرفاعي", byRole: "guide" as const };
const HALA = { byId: "01033300981", byName: "هالة الدقر", byRole: "guide-f" as const };
const base = { clusterId: "al-nour", joined: [], left: [], progress: {}, sittings: [] };

/** تكتل النور's activities for مجموعة اللطيف (27) and its female guide's three groups, begun before travel */
export const ACTIVITIES_SEED: Activity[] = [
  { ...base, id: "ac-27-quran", groups: [27], ...KHALED, kind: "quran", title: "تحفيظ جزء عمّ", goal: "جزء عمّ (الجزء 30)، من السور القصيرة", units: unitsFor("quran", 30, 30), audience: "all", schedule: "الأحد والأربعاء بعد العصر", place: "مكتب دمشق — القاعة 2، ثم قاعة الفندق", startAt: at("2027-03-07"), createdAt: at("2027-03-01"), seed: { join: 0.45, reach: 0.9 } },
  { ...base, id: "ac-27-hadith", groups: [27], ...KHALED, kind: "hadith", title: "الأربعون النووية: الأحاديث 1 – 20", goal: "الأحاديث 1 – 20 من الأربعين النووية", units: unitsFor("hadith", 1, 20), audience: "men", schedule: "بعد درس الأحد", place: "مكتب دمشق — القاعة 2", startAt: at("2027-03-14"), createdAt: at("2027-03-10"), seed: { join: 0.35, reach: 0.8 } },
  { ...base, id: "ac-f-adhkar", groups: [31, 27, 18], ...HALA, kind: "adhkar", title: "أدعية الحج والعمرة للحاجّات", goal: "عشرة أدعية يحتاجها الحاج بترتيبها", units: unitsFor("adhkar", 0, 0), audience: "women", schedule: "السبت بعد العصر", place: "مكتب دمشق — قاعة السيدات", startAt: at("2027-03-20"), createdAt: at("2027-03-15"), seed: { join: 0.6, reach: 0.85 } },
  { ...base, id: "ac-f-khatma", groups: [31, 27, 18], ...HALA, kind: "khatma", title: "ختمة الحاجّات في مكة", goal: "ختمة كاملة قبل يوم التروية", units: unitsFor("khatma", 0, 0), audience: "women", schedule: "كل حاجّة جزءاً أو أكثر بحسب وقتها", place: "في الفندق والحرم", startAt: at("2027-05-02"), createdAt: at("2027-04-25"), seed: { join: 0.5, reach: 0.7 } },
];

// ───────────────────────── Store access ─────────────────────────

export const useActivities = () => useStore((s) => s.activities.list) ?? ACTIVITIES_SEED;
const list = () => getState().activities.list ?? ACTIVITIES_SEED;
function patch(fn: (all: Activity[]) => Activity[]) {
  setState((s) => ({ ...s, activities: { ...s.activities, list: fn(s.activities.list ?? ACTIVITIES_SEED) } }));
}
const edit = (id: string, fn: (a: Activity) => Activity) => patch((all) => all.map((a) => (a.id === id ? fn(a) : a)));
const log = (actor: { name: string; role: string }, action: string, a: Activity, detail?: string) => actions.logEvent({ actor: actor.name, role: actor.role, action, target: a.title, detail, system: "admins", area: "activities", ref: a.id });

export const activitiesOfGroups = (all: Activity[], groups: number[], clusterId?: string) =>
  all.filter((a) => a.groups.some((g) => groups.includes(g)) && (!clusterId || !a.clusterId || a.clusterId === clusterId)).sort((x, y) => x.startAt - y.startAt);

export const activitiesActions = {
  save(a: Activity, actor: { name: string; role: string }) {
    const fresh = !list().some((x) => x.id === a.id);
    patch((all) => (fresh ? [...all, a] : all.map((x) => (x.id === a.id ? a : x))));
    log(actor, fresh ? "نشاط ديني جديد" : "تعديل نشاط ديني", a, `${KIND_LABEL[a.kind]} — ${a.goal}`);
  },
  /** Add pilgrims to it, or take them off (a joined one may leave) */
  setIn(id: string, people: string[], inIt: boolean, actor: { name: string; role: string; target?: string }) {
    const a = list().find((x) => x.id === id);
    if (!a) return;
    edit(id, (x) => ({
      ...x,
      joined: inIt ? [...new Set([...x.joined, ...people])] : x.joined.filter((p) => !people.includes(p)),
      left: inIt ? x.left.filter((p) => !people.includes(p)) : [...new Set([...x.left, ...people])],
    }));
    actions.logEvent({ actor: actor.name, role: actor.role, action: inIt ? `انضمام إلى نشاط: ${a.title}` : `انسحاب من نشاط: ${a.title}`, target: actor.target ?? a.title, detail: `${people.length} مشاركاً`, ...(actor.target ? {} : { system: "admins", area: "activities", ref: a.id }) });
  },
  /** One sitting: what one pilgrim recited, with its grade (a seeded record is kept, and grows) */
  record(id: string, personId: string, units: string[], grade: Grade, note: string | undefined, actor: { name: string; role: string }, personName: string) {
    const a = list().find((x) => x.id === id);
    if (!a || !units.length) return;
    const now = Date.now();
    const before = progressOf(a, personId);
    edit(id, (x) => ({
      ...x,
      joined: isIn(x, personId) ? x.joined : [...x.joined, personId],
      progress: { ...x.progress, [personId]: { ...before, ...Object.fromEntries(units.map((u) => [u, { at: now, grade }])) } },
      sittings: [...x.sittings, { at: now, personId, units, grade, note, by: actor.name }],
    }));
    log(actor, "تسجيل تسميع", a, `${personName}: ${units.length === 1 ? unitLabel(a.kind, units[0]) : `${units.length} من ${a.kind === "quran" ? "الصفحات" : a.kind === "hadith" ? "الأحاديث" : a.kind === "khatma" ? "الأجزاء" : "الأدعية"}`} — ${GRADE_LABEL[grade]}`);
  },
  close(id: string, actor: { name: string; role: string }) {
    const a = list().find((x) => x.id === id);
    if (!a) return;
    edit(id, (x) => ({ ...x, closedAt: Date.now() }));
    log(actor, "إنهاء نشاط ديني", a);
  },
};
