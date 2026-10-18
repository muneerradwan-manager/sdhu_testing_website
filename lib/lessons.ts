import { actions, getState, setState, useStore, type AdminProfile } from "./store";
import { seeded } from "./utils";

/**
 * الدروس الدينية — what the religious guides teach their groups' pilgrims, and who came.
 *
 * A group's guide (the man in its guide seat) gives lessons to its men or to all of it; a cluster's female guide
 * to the women of the groups sorted to her, and to them only. Each lesson has its topic, its stage of the
 * season, its time, place and length, and a word for the pilgrims. The pilgrims see the lessons of their group
 * meant for them, and say they will come; at the lesson its guide ticks off who is there, as at a muster, and
 * closes it. Its group's head and its cluster's head follow them. Kept apart from the administrators' profiles,
 * since both portals read them.
 */

export type LessonAudience = "all" | "men" | "women";
export type LessonRole = "guide" | "guide-f";
export type LessonStage = "pretravel" | "makkah" | "mashaer" | "madinah";

export type GroupLesson = {
  id: string;
  clusterId?: string;
  /** The groups it is for: one, or several of a female guide's */
  groups: number[];
  byId: string;
  byName: string;
  byRole: LessonRole;
  title: string;
  topic: string;
  stage: LessonStage;
  at: number;
  minutes: number;
  place: string;
  audience: LessonAudience;
  /** What the pilgrims read of it: what to bring, what to read before */
  summary?: string;
  createdAt: number;
  updatedAt?: number;
  /** The pilgrims who said they will come, by their national number */
  interested: string[];
  /** Ticked off at the lesson; absent on a seeded lesson, whose attendance is drawn from its rate */
  present?: string[];
  openedAt?: number;
  closedAt?: number;
  cancelledAt?: number;
  cancelReason?: string;
  /** A seeded lesson's share of its audience that came */
  seedRate?: number;
};

export type LessonsState = { list?: GroupLesson[] };

export const AUDIENCE_LABEL: Record<LessonAudience, string> = { all: "للجميع", men: "للرجال", women: "للنساء" };
export const STAGE_LABEL: Record<LessonStage, string> = { pretravel: "قبل السفر", makkah: "في مكة", mashaer: "في المشاعر", madinah: "في المدينة" };
export const ROLE_LABEL: Record<LessonRole, string> = { guide: "موجّه المجموعة", "guide-f": "موجّهة التكتل" };

export const TOPICS = [
  "أحكام الإحرام ومحظوراته",
  "العمرة: الطواف والسعي",
  "يوم التروية ويوم عرفة",
  "مزدلفة ورمي الجمرات",
  "النحر والحلق وطواف الإفاضة",
  "أيام التشريق وطواف الوداع",
  "أحكام خاصة بالمرأة في الحج",
  "آداب زيارة المسجد النبوي",
  "السيرة والمعالم",
  "الأدعية والأذكار",
  "التوبة وآداب الرحلة",
];

/** Who may give lessons: the guide in a group's seat, and a cluster's female guide — each to his audience */
export function lessonRoleOf(p: AdminProfile | undefined): LessonRole | null {
  if (p?.servesIn?.role === "guide") return "guide";
  if (p?.servesIn?.role === "guide-f") return "guide-f";
  return null;
}
/** The audiences a role may choose: a female guide teaches the women only; a guide the men, or everyone */
export const AUDIENCES: Record<LessonRole, LessonAudience[]> = { guide: ["men", "all"], "guide-f": ["women"] };

/** Whether a pilgrim of this gender is among a lesson's audience */
export const fits = (audience: LessonAudience, gender: "M" | "F") => audience === "all" || (audience === "men" ? gender === "M" : gender === "F");

export type LessonState = "upcoming" | "open" | "unrecorded" | "done" | "cancelled";
export const STATE_LABEL: Record<LessonState, string> = { upcoming: "قادم", open: "الحضور مفتوح", unrecorded: "لم يُسجَّل حضوره", done: "انتهى", cancelled: "ملغى" };
export function stateOf(l: GroupLesson, now: number): LessonState {
  if (l.cancelledAt) return "cancelled";
  if (l.closedAt) return "done";
  if (l.openedAt) return "open";
  return l.at + l.minutes * 60_000 < now ? "unrecorded" : "upcoming";
}

/** Whether he was there: as ticked off, or, on a seeded lesson, as its rate draws it for him */
export function attended(l: GroupLesson, personId: string) {
  if (!l.closedAt) return false;
  if (l.present) return l.present.includes(personId);
  return seeded(`${l.id}-${personId}`)() < (l.seedRate ?? 0.85);
}

// ───────────────────────── Seeds ─────────────────────────

const at = (iso: string, hhmm: string) => new Date(`${iso}T${hhmm}:00+03:00`).getTime();
const KHALED = { byId: "01033300873", byName: "الشيخ خالد الرفاعي", byRole: "guide" as const };
const HALA = { byId: "01033300981", byName: "هالة الدقر", byRole: "guide-f" as const };
const seed = (x: Omit<GroupLesson, "createdAt" | "interested" | "clusterId"> & { interested?: string[] }): GroupLesson => ({ clusterId: "al-nour", createdAt: x.at - 7 * 86_400_000, interested: [], ...x });

/**
 * تكتل النور's lessons for مجموعة اللطيف (27): its guide's to all of it and to its men, and its female guide's to
 * the women of her three groups — the season before travel and in it, given and recorded (the demo's guides
 * finished their season), and still to come: two in the first days in Makkah, two in Madinah.
 */
export const LESSONS_SEED: GroupLesson[] = [
  seed({ id: "ls-27-1", groups: [27], ...KHALED, title: "كيف نستعد للحج: النية والتوبة وآداب الرحلة", topic: "التوبة وآداب الرحلة", stage: "pretravel", at: at("2027-03-13", "18:00"), minutes: 60, place: "مكتب دمشق — القاعة 2", audience: "all", summary: "اللقاء الأول للمجموعة. أحضروا دفتراً صغيراً للأدعية.", closedAt: at("2027-03-13", "19:10"), seedRate: 0.9 }),
  seed({ id: "ls-27-2", groups: [27], ...KHALED, title: "أحكام الإحرام ومحظوراته", topic: "أحكام الإحرام ومحظوراته", stage: "pretravel", at: at("2027-03-27", "18:00"), minutes: 75, place: "مكتب دمشق — القاعة 2", audience: "all", summary: "نتدرب على لبس الإحرام للرجال. أحضروا قطعتي الإحرام إن وُجدتا.", closedAt: at("2027-03-27", "19:20"), seedRate: 0.86 }),
  seed({ id: "ls-f-1", groups: [31, 27, 18], ...HALA, title: "أحكام خاصة بالمرأة في الإحرام والطواف", topic: "أحكام خاصة بالمرأة في الحج", stage: "pretravel", at: at("2027-04-03", "17:00"), minutes: 60, place: "مكتب دمشق — قاعة السيدات", audience: "women", summary: "لباس المرأة في الإحرام، والحيض والطواف، والمحرم.", closedAt: at("2027-04-03", "18:05"), seedRate: 0.82 }),
  seed({ id: "ls-27-3", groups: [27], ...KHALED, title: "العمرة خطوة بخطوة: الطواف والسعي", topic: "العمرة: الطواف والسعي", stage: "pretravel", at: at("2027-04-17", "18:00"), minutes: 75, place: "مكتب دمشق — القاعة 2", audience: "all", closedAt: at("2027-04-17", "19:25"), seedRate: 0.88 }),
  // the first days in Makkah: still to give, the families say who will come
  seed({ id: "ls-27-m1", groups: [27], ...KHALED, title: "آداب المسجد الحرام والطواف في الزحام", topic: "العمرة: الطواف والسعي", stage: "makkah", at: at("2027-05-03", "20:30"), minutes: 45, place: "فندق روضة طيبة — قاعة الطابق (م)", audience: "all", summary: "بعد صلاة العشاء. كبار السن مع مرافقيهم في الصف الأول." }),
  seed({ id: "ls-f-m1", groups: [31, 27, 18], ...HALA, title: "صلاة المرأة في الحرم وأماكن مصليات السيدات", topic: "أحكام خاصة بالمرأة في الحج", stage: "makkah", at: at("2027-05-04", "17:00"), minutes: 30, place: "فندق روضة طيبة — قاعة السيدات", audience: "women" }),
  seed({ id: "ls-27-4", groups: [27], ...KHALED, title: "أعمال يوم التروية وعرفة", topic: "يوم التروية ويوم عرفة", stage: "makkah", at: at("2027-05-12", "20:30"), minutes: 60, place: "فندق روضة طيبة — قاعة الطابق (م)", audience: "all", closedAt: at("2027-05-12", "21:40"), seedRate: 0.93 }),
  seed({ id: "ls-27-5", groups: [27], ...KHALED, title: "رمي الجمرات والتعجّل للرجال", topic: "مزدلفة ورمي الجمرات", stage: "mashaer", at: at("2027-05-16", "16:00"), minutes: 45, place: "منى — الخيمة 12", audience: "men", summary: "التوكيل في الرمي لكبار السن، ومن يرمي عن النساء.", closedAt: at("2027-05-16", "16:50"), seedRate: 0.9 }),
  seed({ id: "ls-f-2", groups: [31, 27, 18], ...HALA, title: "طواف الإفاضة والوداع للحاجّات", topic: "أيام التشريق وطواف الوداع", stage: "mashaer", at: at("2027-05-17", "10:00"), minutes: 45, place: "منى — خيمة السيدات 13", audience: "women", closedAt: at("2027-05-17", "10:50"), seedRate: 0.84 }),
  seed({ id: "ls-27-6", groups: [27], ...KHALED, title: "آداب زيارة المسجد النبوي والسلام على النبي ﷺ", topic: "آداب زيارة المسجد النبوي", stage: "madinah", at: at("2027-05-23", "21:00"), minutes: 45, place: "فندق المدينة — قاعة الطابق الأول", audience: "all" }),
  seed({ id: "ls-f-3", groups: [31, 27, 18], ...HALA, title: "زيارة الروضة للسيدات: موعدها وآدابها", topic: "آداب زيارة المسجد النبوي", stage: "madinah", at: at("2027-05-24", "08:30"), minutes: 30, place: "فندق المدينة — بهو السيدات", audience: "women", summary: "التجمّع للروضة بعد الدرس مباشرة، ومعكن بطاقة الموعد في «نسك»." }),
];

// ───────────────────────── Store access ─────────────────────────

export const useLessons = () => useStore((s) => s.lessons.list) ?? LESSONS_SEED;

/** The lessons of the groups he works in (all their lessons, by whoever gave them) */
export const lessonsOfGroups = (list: GroupLesson[], groups: number[], clusterId?: string) =>
  list.filter((l) => l.groups.some((g) => groups.includes(g)) && (!clusterId || !l.clusterId || l.clusterId === clusterId)).sort((a, b) => a.at - b.at);

function patch(fn: (list: GroupLesson[]) => GroupLesson[]) {
  setState((s) => ({ ...s, lessons: { ...s.lessons, list: fn(s.lessons.list ?? LESSONS_SEED) } }));
}
const edit = (id: string, fn: (l: GroupLesson) => GroupLesson) => patch((list) => list.map((l) => (l.id === id ? fn(l) : l)));
const log = (actor: string, role: string, action: string, l: Pick<GroupLesson, "title" | "id">, detail?: string) => actions.logEvent({ actor, role, action, target: l.title, detail, system: "admins", area: "lessons", ref: l.id });

export const lessonsActions = {
  /** A new lesson, or one changed before it is given */
  save(l: GroupLesson, actor: { name: string; role: string }) {
    const fresh = !getList().some((x) => x.id === l.id);
    patch((list) => (fresh ? [...list, l] : list.map((x) => (x.id === l.id ? { ...l, updatedAt: Date.now() } : x))));
    log(actor.name, actor.role, fresh ? "درس ديني جديد" : "تعديل درس ديني", l, `${AUDIENCE_LABEL[l.audience]} — ${new Date(l.at).toLocaleString("ar-SY-u-nu-latn")}`);
  },
  cancel(id: string, reason: string, actor: { name: string; role: string }) {
    const l = getList().find((x) => x.id === id);
    if (!l) return;
    edit(id, (x) => ({ ...x, cancelledAt: Date.now(), cancelReason: reason, openedAt: undefined }));
    log(actor.name, actor.role, "إلغاء درس ديني", l, reason);
  },
  /** Open the attendance at the lesson: the list of its audience to tick off */
  open(id: string) {
    edit(id, (x) => ({ ...x, openedAt: x.openedAt ?? Date.now(), present: x.present ?? [] }));
  },
  setPresent(id: string, present: string[]) {
    edit(id, (x) => ({ ...x, present }));
  },
  /** Close it with who came: the pilgrims see it on their side */
  close(id: string, actor: { name: string; role: string }, expected: number) {
    const l = getList().find((x) => x.id === id);
    if (!l) return;
    edit(id, (x) => ({ ...x, closedAt: Date.now() }));
    log(actor.name, actor.role, "تسجيل حضور درس ديني", l, `حضر ${l.present?.length ?? 0} من ${expected}`);
  },
  /** Abandon an attendance opened by mistake */
  discard(id: string) {
    edit(id, (x) => ({ ...x, openedAt: undefined, present: undefined }));
  },
  /** A pilgrim says the members of his family he names will come, or will not */
  setInterest(id: string, people: string[], coming: boolean, by: { name: string; target: string }) {
    const l = getList().find((x) => x.id === id);
    if (!l) return;
    edit(id, (x) => ({ ...x, interested: coming ? [...new Set([...x.interested, ...people])] : x.interested.filter((p) => !people.includes(p)) }));
    actions.logEvent({ actor: by.name, role: "حاج", action: coming ? `سنحضر درس: ${l.title}` : `لن نحضر درس: ${l.title}`, target: by.target, detail: `${people.length} من العائلة` });
  },
};

const getList = () => getState().lessons.list ?? LESSONS_SEED;
