/**
 * Deterministic fake data for the staff portal (الموظفون) and the operations room.
 * Everything here is fictional and only exists to make the demo feel like a live season.
 * Real data created during the demo (applications, tickets, administrators, events) is merged
 * on top of these seeds by the staff pages.
 */
import type { Person, Relation } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import type { AdminProfile, AuditEvent, Ticket } from "@/lib/store";
import { seeded } from "@/lib/utils";

/** Local wall-clock timestamps so every viewer sees the same hour */
const at = (y: number, m: number, d: number, h = 9, min = 0) => new Date(y, m - 1, d, h, min).getTime();

// ───────────────────────── Registration overview ─────────────────────────

export const REG_STATS = {
  applications: 72_420,
  persons: 118_640,
  eligible: 61_830,
  autoApproved: 59_214,
  needsReview: 1_284,
  rejected: 10_590,
  family: 31_870,
  byGovernorate: [
    { name: "دمشق", value: 18_940 },
    { name: "ريف دمشق", value: 12_310 },
    { name: "حلب", value: 11_870 },
    { name: "حمص", value: 7_420 },
    { name: "حماة", value: 5_980 },
    { name: "إدلب", value: 4_950 },
    { name: "درعا", value: 3_870 },
    { name: "اللاذقية", value: 3_610 },
    { name: "دير الزور", value: 3_470 },
  ],
  rejectionReasons: [
    { label: "أدى الحج سابقاً", value: 4_210 },
    { label: "المرافق دون السن", value: 2_380 },
    { label: "امرأة دون 44 بلا محرم", value: 1_640 },
    { label: "اسم مكرر في طلبين", value: 1_320 },
    { label: "أسباب أخرى", value: 1_040 },
  ],
};

/** Applications per day over the 22 registration days — a gentle curve with a closing rush */
export const DAILY_REGISTRATIONS: number[] = (() => {
  const rnd = seeded("daily-registrations-1448");
  const raw = Array.from({ length: 22 }, (_, i) => {
    const opening = Math.max(0, 5 - i) * 0.35;
    const closing = Math.max(0, i - 16) * 0.3;
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

const person = (
  p: Pick<Person, "id" | "firstName" | "fatherName" | "motherName" | "lastName" | "gender" | "birthDate" | "governorate"> & Partial<Person>,
): Person => ({
  birthPlace: p.governorate,
  registry: `${p.governorate} ${p.id.slice(-4)}`,
  maritalStatus: p.gender === "M" ? "متزوج" : "متزوجة",
  religion: "مسلم",
  nationality: "سورية",
  familyBookNo: p.id.slice(2, 10),
  phoneTail: p.id.slice(-3),
  ...p,
});

const member = (p: Person, relation: Relation, relationVerified = true, extra: Partial<Member> = {}): Member => ({
  person: p,
  relation,
  relationVerified,
  needs: [],
  ...extra,
});

const passportDocs = (note?: string): ReviewDoc[] => [
  { name: "صورة الهوية الوطنية", status: "ok" },
  { name: "جواز السفر", status: note ? "issue" : "ok", note },
  { name: "الصورة الشخصية", status: "ok" },
  { name: "إيصال رسم التسجيل", status: "ok" },
];

export const SEED_APPLICATIONS: SeedApplication[] = [
  (() => {
    const self = person({ id: "01044412208", firstName: "بلال", fatherName: "حسن", motherName: "سعدى", lastName: "الدمشقي", gender: "M", birthDate: "1971-05-02", governorate: "دمشق" });
    const wife = person({ id: "01044412209", firstName: "نهى", fatherName: "جميل", motherName: "وداد", lastName: "السعدي", gender: "F", birthDate: "1975-09-18", governorate: "دمشق", spouseIds: ["01044412208"] });
    return {
      id: "seed-50211",
      number: "50211",
      office: "دمشق – الميدان",
      governorate: "دمشق",
      submittedAt: at(2026, 11, 24, 18, 12),
      mode: "national",
      caseLabel: "اسم الأم غير مطابق",
      members: [member(self, "self"), member(wife, "spouse")],
      flags: [
        { title: "اختلاف اسم الأم", detail: "أدخل المتقدم «سعاد»، وسجل الشؤون المدنية يذكر «سعدى». غالباً خطأ كتابي، لكنه يحتاج تأكيداً قبل الاعتماد.", tone: "gold" },
      ],
      documents: passportDocs(),
      evidence: "الزوجة مسجلة في وثيقة العائلة نفسها رقم 44412208 — الصلة مؤكدة آلياً.",
    } satisfies SeedApplication;
  })(),
  (() => {
    const self = person({ id: "02077300414", firstName: "رغد", fatherName: "ماجد", motherName: "ليلى", lastName: "الحموي", gender: "F", birthDate: "1988-02-11", governorate: "حماة", maritalStatus: "عزباء" });
    const sister = person({ id: "02077300416", firstName: "سمر", fatherName: "ماجد", motherName: "ليلى", lastName: "الحموي", gender: "F", birthDate: "1979-07-30", governorate: "حماة", maritalStatus: "أرملة" });
    return {
      id: "seed-50348",
      number: "50348",
      office: "حماة – المركز",
      governorate: "حماة",
      submittedAt: at(2026, 11, 27, 21, 40),
      mode: "national",
      caseLabel: "امرأة دون 44 بلا محرم",
      members: [member(self, "self"), member(sister, "sibling")],
      flags: [
        { title: "لا يوجد محرم في الطلب", detail: "رغد من مواليد 1988 (38 عاماً). المرافقة الوحيدة أختها، والأخت لا تُعد محرماً. يمكن للمتقدمة إضافة أخ أو أب قبل الاعتماد.", tone: "maroon" },
      ],
      documents: passportDocs(),
      evidence: "الأختان في دفتر العائلة نفسه — الصلة مؤكدة. المشكلة في شرط المحرم لا في الصلة.",
    } satisfies SeedApplication;
  })(),
  (() => {
    const self = person({ id: "09031100751", firstName: "مصطفى", fatherName: "فايز", motherName: "صباح", lastName: "الحوراني", gender: "M", birthDate: "1963-10-05", governorate: "درعا" });
    const friend = person({ id: "09031100863", firstName: "وائل", fatherName: "نبيل", motherName: "رجاء", lastName: "الشيخ", gender: "M", birthDate: "1966-03-22", governorate: "درعا" });
    return {
      id: "seed-50402",
      number: "50402",
      office: "درعا – المحطة",
      governorate: "درعا",
      submittedAt: at(2026, 11, 29, 11, 5),
      mode: "manual",
      caseLabel: "بيانات يدوية غير مؤكدة",
      members: [member(self, "self"), member(friend, "sibling", false)],
      flags: [
        { title: "إدخال يدوي", detail: "تعذّر الربط مع الشؤون المدنية وقت التقديم، فأُدخلت بيانات المرافق يدوياً في مكتب درعا.", tone: "gold" },
        { title: "صلة «أخ» غير مؤكدة", detail: "اسما الأب مختلفان (فايز / نبيل) رغم التصريح بأنهما أخوان. قد تكون الصلة «قريب آخر».", tone: "maroon" },
      ],
      documents: [...passportDocs(), { name: "بيان عائلي ورقي", status: "missing", note: "لم يُرفع" }],
      evidence: "لا يوجد دليل على الصلة — مطلوب بيان عائلي أو تعديل الصلة إلى «قريب آخر».",
    } satisfies SeedApplication;
  })(),
  (() => {
    const self = person({ id: "03062200517", firstName: "علي", fatherName: "حسن", motherName: "عائشة", lastName: "العلي", gender: "M", birthDate: "1960-12-14", governorate: "حلب" });
    const brother = person({ id: "03062200519", firstName: "إبراهيم", fatherName: "حسن", motherName: "عائشة", lastName: "العلي", gender: "M", birthDate: "1958-06-01", governorate: "حلب", otherApplication: "47730" });
    return {
      id: "seed-50519",
      number: "50519",
      office: "حلب – الشعار",
      governorate: "حلب",
      submittedAt: at(2026, 11, 30, 9, 50),
      mode: "national",
      caseLabel: "رقم وطني مكرر",
      members: [member(self, "self"), member(brother, "sibling")],
      flags: [
        { title: "الرقم الوطني مكرر", detail: "إبراهيم مدرج أيضاً في الطلب 47730 (مقدّم من ابنه). لا يظهر الشخص في طلبين، ويجب حذفه من أحدهما.", tone: "maroon" },
      ],
      documents: passportDocs(),
      evidence: "الأخوان في دفتر العائلة نفسه — الصلة مؤكدة.",
    } satisfies SeedApplication;
  })(),
  (() => {
    const self = person({ id: "05018800903", firstName: "هشام", fatherName: "عبد الرزاق", motherName: "فاطمة", lastName: "المصري", gender: "M", birthDate: "1969-01-27", governorate: "حمص" });
    return {
      id: "seed-50627",
      number: "50627",
      office: "حمص – الوعر",
      governorate: "حمص",
      submittedAt: at(2026, 12, 2, 16, 20),
      mode: "national",
      caseLabel: "جواز ينتهي قريباً",
      members: [member(self, "self")],
      flags: [
        { title: "صلاحية الجواز", detail: "ينتهي الجواز في 3 آذار 2027، أي قبل السفر. يُشترط أن يكون صالحاً 6 أشهر بعد العودة (29 أيار 2027).", tone: "gold" },
      ],
      documents: passportDocs("ينتهي 03/03/2027"),
      evidence: "طلب فردي — لا توجد صلات للتحقق.",
    } satisfies SeedApplication;
  })(),
  (() => {
    const self = person({ id: "06090400311", firstName: "زياد", fatherName: "محمود", motherName: "نهى", lastName: "الإدلبي", gender: "M", birthDate: "1974-08-08", governorate: "إدلب", hajjBefore: 1444 });
    const mother = person({ id: "06090400300", firstName: "نهى", fatherName: "عبد الكريم", motherName: "صباح", lastName: "الشيخ", gender: "F", birthDate: "1951-04-19", governorate: "إدلب", maritalStatus: "أرملة" });
    return {
      id: "seed-50733",
      number: "50733",
      office: "إدلب – المركز",
      governorate: "إدلب",
      submittedAt: at(2026, 12, 4, 20, 2),
      mode: "national",
      caseLabel: "حج سابق — محرم لوالدته",
      members: [member(self, "self", true, { companionId: "06090400300" }), member(mother, "parent", false, { companionId: "06090400311", needs: ["كرسي متحرك"] })],
      flags: [
        { title: "أدى الحج في 1444", detail: "يُستثنى فقط إذا كان محرماً لأمه. الصلة مصرّح بها ولم تؤكدها الشؤون المدنية بعد (الأم مسجلة في قيد آخر).", tone: "gold" },
      ],
      documents: [...passportDocs(), { name: "بيان قيد الأم", status: "ok", note: "مرفوع — يحتاج مطابقة" }],
      evidence: "بيان قيد مرفوع يذكر اسم الأم «نهى عبد الكريم الشيخ» ويطابق اسم الأم في هوية زياد.",
    } satisfies SeedApplication;
  })(),
  (() => {
    const self = person({ id: "01088700125", firstName: "خالد", fatherName: "جميل", motherName: "وداد", lastName: "الأحمد", gender: "M", birthDate: "1955-11-11", governorate: "ريف دمشق" });
    const nephew = person({ id: "01088700347", firstName: "أنس", fatherName: "طارق", motherName: "سمر", lastName: "الأحمد", gender: "M", birthDate: "1992-02-02", governorate: "ريف دمشق", maritalStatus: "عازب" });
    return {
      id: "seed-50846",
      number: "50846",
      office: "دوما",
      governorate: "ريف دمشق",
      submittedAt: at(2026, 12, 6, 13, 34),
      mode: "national",
      caseLabel: "كبير سن ومرافقه ابن أخ",
      members: [member(self, "self", true, { companionId: "01088700347", needs: ["مشاية"] }), member(nephew, "other", false)],
      flags: [
        { title: "مرافق كبير السن ليس من الدرجة الأولى", detail: "خالد 71 عاماً ومرافقه ابن أخيه. مسموح، لكن الصلة «قريب آخر» تُراجع يدوياً.", tone: "gold" },
      ],
      documents: [...passportDocs(), { name: "الصورة الشخصية للمرافق", status: "issue", note: "الإضاءة ضعيفة — طُلب رفع جديد" }],
      evidence: "إقرار عائلي موقّع من مختار دوما مرفوع كصورة.",
    } satisfies SeedApplication;
  })(),
  (() => {
    const self = person({ id: "08050600422", firstName: "دعاء", fatherName: "فايز", motherName: "رجاء", lastName: "الحسين", gender: "F", birthDate: "1984-06-16", governorate: "دير الزور" });
    const husband = person({ id: "08050600421", firstName: "نزار", fatherName: "حسن", motherName: "ليلى", lastName: "العلي", gender: "M", birthDate: "1980-01-05", governorate: "دير الزور" });
    return {
      id: "seed-50958",
      number: "50958",
      office: "دير الزور – المركز",
      governorate: "دير الزور",
      submittedAt: at(2026, 12, 8, 22, 51),
      mode: "national",
      caseLabel: "عقد زواج غير مسجل",
      members: [member(self, "self"), member(husband, "spouse", false)],
      flags: [
        { title: "الزواج غير مثبت في السجل", detail: "دعاء (42) محرمها زوجها نزار، لكن الزواج غير مسجل بعد في الشؤون المدنية. مرفق عقد زواج شرعي.", tone: "maroon" },
      ],
      documents: [...passportDocs(), { name: "عقد الزواج", status: "ok", note: "صادر عن المحكمة الشرعية 2025" }],
      evidence: "عقد زواج صادر عن المحكمة الشرعية بدير الزور برقم 2025/1184.",
    } satisfies SeedApplication;
  })(),
];

// ───────────────────────── Direct acceptance & lottery ─────────────────────────
// Two SEPARATE registrations. Direct acceptance ranks its own applications by age; the lottery list is
// whatever was registered (and found eligible) in the lottery window — nothing moves over automatically.

export const LOTTERY = {
  /** Eligible applications from the direct-acceptance registration (9 جمادى الآخرة – 1 رجب), ranked by age */
  directEligible: 61_830,
  directSeats: 7_875,
  /** Eligible applications registered in the separate lottery window (16 – 25 رجب) */
  lotteryEligible: 53_955,
  familyInList: 16_900,
  accepted: 14_625,
  acceptedFamily: 4_020,
  reserve: 3_000,
  notAccepted: 36_330,
  rows: 17_634,
  file: "نتائج-القرعة-1448-معتمد.xlsx",
};

/** Seats requested by eligible DIRECT-ACCEPTANCE applications, grouped by applicant age (oldest first) */
export const AGE_BUCKETS: { label: string; minAge: number; seats: number }[] = [
  { label: "80+", minAge: 80, seats: 1_210 },
  { label: "75–79", minAge: 75, seats: 1_480 },
  { label: "70–74", minAge: 70, seats: 2_350 },
  { label: "69", minAge: 69, seats: 690 },
  { label: "68", minAge: 68, seats: 720 },
  { label: "67", minAge: 67, seats: 760 },
  { label: "66", minAge: 66, seats: 665 },
  { label: "65", minAge: 65, seats: 910 },
  { label: "64", minAge: 64, seats: 980 },
  { label: "63", minAge: 63, seats: 1_040 },
  { label: "62", minAge: 62, seats: 1_120 },
  { label: "61", minAge: 61, seats: 1_190 },
  { label: "60", minAge: 60, seats: 1_260 },
  { label: "50–59", minAge: 50, seats: 14_300 },
  { label: "40–49", minAge: 40, seats: 19_800 },
  { label: "29–39", minAge: 29, seats: 13_355 },
];

export type UnmatchedRow = { row: number; application: string; fileId: string; suggestion: string; issue: string };

export const UNMATCHED_ROWS: UnmatchedRow[] = [
  { row: 4_102, application: "51877", fileId: "01058221438", suggestion: "01058221483", issue: "رقمان متبادلان في آخر الرقم الوطني" },
  { row: 6_311, application: "52940", fileId: "0203311875", suggestion: "02033118750", issue: "الرقم الوطني ناقص خانة" },
  { row: 7_054, application: "48122", fileId: "05112208841", suggestion: "05112208847", issue: "خطأ في الخانة الأخيرة" },
  { row: 9_480, application: "55310", fileId: "01099410026", suggestion: "01099140026", issue: "رقمان متبادلان" },
  { row: 11_236, application: "46615", fileId: "03077520193", suggestion: "03077502193", issue: "رقمان متبادلان" },
  { row: 13_907, application: "57002", fileId: "07044130558", suggestion: "07041130558", issue: "خطأ في خانة واحدة" },
  { row: 16_218, application: "49871", fileId: "09010337264", suggestion: "09010337246", issue: "رقمان متبادلان" },
];

export const DUPLICATE_ROWS = [
  { row: 8_812, duplicateOf: 8_811, application: "53318" },
  { row: 15_402, duplicateOf: 15_401, application: "44780" },
];

// ───────────────────────── Administrators ─────────────────────────

export type SeedAdmin = { profile: AdminProfile; name: string; position: string; previous?: string };

const admin = (id: string, p: Partial<AdminProfile>): AdminProfile => ({
  nationalId: id,
  createdAt: at(2026, 9, 20),
  phone: `09${id.slice(-8)}`,
  positions: [],
  languages: ["العربية"],
  skills: [],
  documents: ["الهوية", "الصورة", "لا حكم عليه"],
  joinDecisions: {},
  musters: [],
  ...p,
});

export const SEED_ADMINS: SeedAdmin[] = [
  {
    name: "أحمد سليمان الحمصي",
    position: "رئيس مجموعة",
    profile: admin("01033300871", {
      positions: ["رئيس مجموعة"],
      languages: ["العربية", "الإنكليزية"],
      skills: ["إسعافات أولية"],
      feePaidAt: at(2026, 9, 21),
      receipt: "1448-A-000871",
      eligibleAt: at(2026, 9, 28),
      exam: { startedAt: at(2026, 10, 7, 9), submittedAt: at(2026, 10, 7, 10, 18), answers: {}, score: 84 },
      group: { number: 27, clusterId: "al-nour", capacity: 50, requestedAt: at(2026, 11, 3, 12), feePaidAt: at(2026, 11, 3, 12, 20) },
    }),
  },
  {
    name: "ياسر عبد الله العبد الله",
    position: "معاون رئيس مجموعة",
    previous: "1447 — معاون — تقييم 4.6",
    profile: admin("01033300872", {
      positions: ["معاون رئيس مجموعة"],
      feePaidAt: at(2026, 9, 22),
      exam: { startedAt: at(2026, 10, 7, 9), submittedAt: at(2026, 10, 7, 10, 5), answers: {}, score: 78 },
      oral: { score: 80, by: "ماهر عيسى", at: at(2026, 10, 23, 18), note: "هادئ ومنظم" },
      finalScore: 78.8,
      resultPublishedAt: at(2026, 11, 1, 10),
    }),
  },
  {
    name: "الشيخ خالد الرفاعي",
    position: "موجّه ديني",
    profile: admin("01033301105", {
      positions: ["موجّه ديني"],
      feePaidAt: at(2026, 9, 23),
      exam: { startedAt: at(2026, 10, 7, 9), submittedAt: at(2026, 10, 7, 10, 30), answers: {}, score: 91 },
    }),
  },
  {
    name: "سامر نجار",
    position: "منسق تقني",
    profile: admin("01033301217", {
      positions: ["منسق تقني"],
      feePaidAt: at(2026, 9, 24),
      exam: { startedAt: at(2026, 10, 7, 9), submittedAt: at(2026, 10, 7, 9, 58), answers: {}, score: 73 },
    }),
  },
  {
    name: "وليد السعدي",
    position: "رئيس مجموعة",
    profile: admin("05022400319", {
      positions: ["رئيس مجموعة"],
      feePaidAt: at(2026, 9, 25),
      exam: { startedAt: at(2026, 10, 7, 9), submittedAt: at(2026, 10, 7, 10, 29), answers: {}, score: 61 },
      oral: { score: 70, by: "ماهر عيسى", at: at(2026, 10, 23, 17, 20) },
      finalScore: 64.6,
    }),
  },
  {
    name: "لؤي حمدان",
    position: "رئيس مجموعة",
    profile: admin("02041700533", {
      positions: ["رئيس مجموعة"],
      feePaidAt: at(2026, 9, 21),
      exam: { startedAt: at(2026, 10, 7, 9), submittedAt: at(2026, 10, 7, 10), answers: {}, score: 88 },
      oral: { score: 90, by: "ماهر عيسى", at: at(2026, 10, 22, 16) },
      finalScore: 88.8,
      resultPublishedAt: at(2026, 11, 1, 10),
      group: { number: 8, clusterId: "al-shahba", capacity: 45, requestedAt: at(2026, 11, 4, 15), feePaidAt: at(2026, 11, 4, 15, 12) },
    }),
  },
  {
    name: "بسام درويش",
    position: "معاون رئيس تكتل",
    previous: "1446، 1447 — معتمد (معفى من الكتابي)",
    profile: admin("01033300955", {
      positions: ["معاون رئيس تكتل"],
      feePaidAt: at(2026, 9, 21),
      oral: { score: 86, by: "ماهر عيسى", at: at(2026, 10, 21, 11) },
      finalScore: 86,
      resultPublishedAt: at(2026, 11, 1, 10),
      group: { number: 31, clusterId: "al-nour", capacity: 50, requestedAt: at(2026, 11, 2, 10), feePaidAt: at(2026, 11, 2, 10, 5), approvedAt: at(2026, 11, 20, 12), approvedBy: "مازن الحلبي" },
    }),
  },
];

export const EVALUATION_ITEMS = ["دقة التجمّعات والحضور", "التعامل مع البلاغات", "الالتزام بالمواعيد", "سلامة كبار السن", "التقرير اليومي"];

// ───────────────────────── Operations room ─────────────────────────

export type Zone = "arafat" | "mina" | "muzdalifah" | "jamarat" | "makkah";

export type SeedIncident = Omit<Ticket, "at"> & { minutesAgo: number; zone: Zone };

export const SEED_INCIDENTS: SeedIncident[] = [
  {
    id: "OR-1207",
    minutesAgo: 3,
    zone: "mina",
    name: "سليم حسن (66) — المجموعة 27",
    kind: "missing",
    severity: "critical",
    location: "منى — بوابة الجمرات الشرقية",
    text: "غاب عن تجمّع العودة من الجمرات. هاتفه مغلق. آخر مسح لبطاقته عند البوابة الشرقية 15:20. سوار أخضر رقم 27-044.",
    status: "open",
    assignee: "",
    updates: [],
  },
  {
    id: "OR-1204",
    minutesAgo: 6,
    zone: "arafat",
    name: "حاجة من المجموعة 14 — تكتل النور",
    kind: "health",
    severity: "critical",
    location: "عرفة — مخيم تكتل النور، خيمة 12",
    text: "إجهاد حراري: دوار وتعرّق شديد. نُقلت إلى الظل وأُعطيت ماء.",
    status: "in_progress",
    assignee: "د. ليلى شمس",
    updates: [{ at: 0, by: "فادي سلوم", text: "أُسند إلى د. ليلى — الفريق في الطريق" }],
  },
  {
    id: "OR-1201",
    minutesAgo: 12,
    zone: "arafat",
    name: "حاج من المجموعة 31",
    kind: "health",
    severity: "high",
    location: "عرفة — قرب مسجد نمرة، الجهة الشرقية",
    text: "إجهاد حراري بعد المشي من موقف الحافلات. الحاج واعٍ.",
    status: "open",
    assignee: "",
    updates: [],
  },
  {
    id: "OR-1199",
    minutesAgo: 17,
    zone: "arafat",
    name: "حاج من المجموعة 8 — تكتل الشهباء",
    kind: "health",
    severity: "critical",
    location: "عرفة — مخيم تكتل الشهباء",
    text: "إجهاد حراري وهبوط ضغط. نُقل إلى العيادة الميدانية.",
    status: "in_progress",
    assignee: "د. ليلى شمس",
    updates: [{ at: 0, by: "د. ليلى شمس", text: "وصلنا — محلول وريدي — الحالة مستقرة" }],
  },
  {
    id: "OR-1196",
    minutesAgo: 24,
    zone: "muzdalifah",
    name: "حافلة 14 — تكتل العاصي",
    kind: "transport",
    severity: "medium",
    location: "طريق عرفة ← مزدلفة — نقطة التجمّع 3",
    text: "السائق لم يؤكد الحضور. الحافلة متأخرة 25 دقيقة عن موعد الجاهزية.",
    status: "open",
    assignee: "",
    updates: [],
  },
  {
    id: "OR-1190",
    minutesAgo: 41,
    zone: "arafat",
    name: "المجموعة 19 — تكتل اليقين",
    kind: "meal",
    severity: "low",
    location: "عرفة — مخيم تكتل اليقين",
    text: "الماء المقدّم غير بارد في ثلاث خيام.",
    status: "in_progress",
    assignee: "مشرف الإعاشة",
    updates: [{ at: 0, by: "فادي سلوم", text: "طُلبت شحنة ثلج إضافية" }],
  },
  {
    id: "OR-1184",
    minutesAgo: 58,
    zone: "arafat",
    name: "المجموعة 27 — تكتل النور",
    kind: "room",
    severity: "medium",
    location: "عرفة — مخيم تكتل النور، خيمة 7",
    text: "مكيف الخيمة معطل.",
    status: "resolved",
    assignee: "صيانة المخيم",
    updates: [{ at: 0, by: "صيانة المخيم", text: "استُبدل المكيف — تم التحقق" }],
  },
];

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

export const SEED_TASKS: { id: string; title: string; by: string; to: string; column: TaskColumn; evidence: string; due: string }[] = [
  { id: "T-31", title: "مراجعة خط إنتاج الوجبات في البرج (ب) بعد 11 شكوى", by: "نادر قاسم", to: "مقدّم خدمة الإعاشة", column: "doing", evidence: "تقرير + صورة", due: "اليوم 18:00" },
  { id: "T-29", title: "إعداد قائمة كبار السن لحافلات مزدلفة المبكرة", by: "فادي سلوم", to: "هيثم زيدان + رؤساء المجموعات", column: "done", evidence: "القائمة في المنصة", due: "اليوم 16:00" },
  { id: "T-33", title: "توزيع صورة سليم حسن على نقاط الإرشاد في الجمرات", by: "فادي سلوم", to: "الفريق الميداني", column: "todo", evidence: "تأكيد الاستلام من كل نقطة", due: "فوري" },
  { id: "T-34", title: "تجهيز شحنة ثلج إضافية لمخيمات عرفة", by: "فادي سلوم", to: "مشرف الإعاشة", column: "todo", evidence: "صورة التسليم", due: "15:30" },
  { id: "T-22", title: "تركيب مقابض في حمامات الغرف المهيأة (1216 و1203 و1220)", by: "وسام خوري", to: "صيانة الفندق", column: "verified", evidence: "صور", due: "منجزة" },
  { id: "T-18", title: "تجهيز البرج (ب): فحص الغرف والمصاعد والمطعم", by: "نادر قاسم", to: "وسام خوري", column: "verified", evidence: "صور الغرف + قائمة فحص موقّعة", due: "منجزة" },
];

// ───────────────────────── Audit trail (historic) ─────────────────────────

export const SEED_EVENTS: AuditEvent[] = [
  { id: "h-01", at: at(2026, 9, 1, 9, 12), actor: "سامي حلاق (أبو سامي)", role: "الموارد البشرية", action: "إنشاء حساب موظف", target: "نادر قاسم", detail: "بالرقم الوطني ورقم الهاتف — كلمة مرور مؤقتة" },
  { id: "h-02", at: at(2026, 9, 1, 9, 15), actor: "سامي حلاق (أبو سامي)", role: "الموارد البشرية", action: "منح صلاحية", target: "نادر قاسم", after: "الإسكان — نطاق القطاع" },
  { id: "h-03", at: at(2026, 9, 1, 9, 16), actor: "سامي حلاق (أبو سامي)", role: "الموارد البشرية", action: "منح صلاحية", target: "نادر قاسم", after: "إدارة المهام" },
  { id: "h-04", at: at(2026, 9, 3, 11, 0), actor: "سهى مراد", role: "مديرة الموسم", action: "تعديل إعدادات الموسم", target: "الحصة الإجمالية", before: "21,000", after: "22,500", detail: "قرار لجنة الخطة التشغيلية 14/1448" },
  { id: "h-05", at: at(2026, 9, 3, 11, 4), actor: "سهى مراد", role: "مديرة الموسم", action: "تعديل إعدادات الموسم", target: "نسبة القبول المباشر", before: "30%", after: "35%" },
  { id: "h-06", at: at(2026, 10, 23, 18, 40), actor: "ماهر عيسى", role: "شؤون الإداريين", action: "تعديل نتيجة الشفهي", target: "متقدم 01033301422", before: "12 من 20", after: "14 من 20", detail: "خطأ في الجمع — تصويب اللجنة رقم 5" },
  { id: "h-07", at: at(2026, 11, 20, 12, 0), actor: "مازن الحلبي", role: "مدير المكتب", action: "اعتماد مجموعة", target: "المجموعة 31 — تكتل النور" },
  { id: "h-08", at: at(2026, 12, 10, 14, 30), actor: "رنا حداد", role: "إدارة التسجيل", action: "اعتماد طلب بعد المراجعة", target: "الطلب 49120", detail: "اسم الأم: خطأ كتابي مؤكد من بيان القيد" },
  { id: "h-09", at: at(2026, 12, 24, 9, 40), actor: "رنا حداد", role: "إدارة التسجيل", action: "إصدار الأعمار المقبولة", target: "القبول المباشر", after: "66 عاماً فأكثر — 7,875 مقعداً", detail: "ترتيب طلبات التسجيل على القبول المباشر من الأكبر سناً" },
  { id: "h-10", at: at(2026, 12, 24, 10, 0), actor: "سهى مراد", role: "مديرة الموسم", action: "اعتماد الأعمار المقبولة", target: "القبول المباشر", after: "66 عاماً فأكثر" },
  { id: "h-11", at: at(2027, 1, 6, 17, 5), actor: "رنا حداد", role: "إدارة التسجيل", action: "تصدير قائمة طلبات القرعة المؤهلة", target: "53,955 طلباً", detail: "طلبات التسجيل على القرعة (16 – 25 رجب) بعد إغلاقه — منها 16,900 طلب عائلي — بإشراف لجنة تنظيم القرعة" },
  { id: "h-12", at: at(2027, 1, 9, 23, 40), actor: "رنا حداد", role: "إدارة التسجيل", action: "استيراد نتائج القرعة", target: "الطلب 51877", detail: "الصف 4,102: رقم وطني غير مطابق (خطأ رقم واحد) — الحالة: غير مطابق" },
  { id: "h-13", at: at(2027, 1, 9, 23, 58), actor: "رنا حداد", role: "إدارة التسجيل", action: "تصحيح صف غير مطابق", target: "الطلب 51877", before: "010-•••••38", after: "010-•••••83", detail: "خطأ كتابي مؤكد من اللجنة، مرفق تصويب اللجنة" },
  { id: "h-14", at: at(2027, 1, 10, 9, 5), actor: "سهى مراد", role: "مديرة الموسم", action: "اعتماد ونشر نتائج القرعة", target: "14,625 مقبولاً — 3,000 احتياط" },
  { id: "h-15", at: at(2027, 1, 12, 11, 20), actor: "رنا حداد", role: "إدارة التسجيل", action: "تحويل تذكرة اعتراض", target: "الطلب 51877", detail: "«كنت مقبولاً في الملف المعلن ولم يظهر اسمي» — حُوّلت إلى التدقيق" },
  { id: "h-16", at: at(2027, 1, 12, 11, 48), actor: "طارق مصطفى", role: "التدقيق", action: "الاطلاع على سجل الأحداث", target: "تصفية: الطلب 51877" },
  { id: "h-17", at: at(2027, 1, 12, 12, 10), actor: "طارق مصطفى", role: "التدقيق", action: "الرد على الاعتراض", target: "الطلب 51877", detail: "الطلب مقبول فعلاً — صاحبه بحث باسمه لا برقمه الوطني" },
];

/** The objection example (4.5) — application number to trace */
export const OBJECTION_APP = "51877";

// ───────────────────────── Executive (end of season) ─────────────────────────

export const EXEC = {
  headline: [
    { label: "المتقدمون", value: 72_420 },
    { label: "المؤهلون", value: 61_830 },
    { label: "المقبولون", value: 22_500 },
    { label: "الاحتياط", value: 3_000 },
    { label: "أدّوا الحج فعلاً", value: 22_318 },
  ],
  split: [
    { label: "قبول مباشر (66+)", value: 7_875, color: "#AD9E6E" },
    { label: "القرعة", value: 14_625, color: "#00594F" },
    { label: "احتياط", value: 3_000, color: "#289E92" },
    { label: "لم يُقبل في القرعة", value: 36_330, color: "#E4DDD3" },
  ],
  stages: [
    { stage: "إنشاء الحساب", y1447: 4.2, y1448: 4.5 },
    { stage: "تقديم الطلب", y1447: 3.8, y1448: 4.2 },
    { stage: "القرعة والنتيجة", y1447: 4.1, y1448: 4.7 },
    { stage: "الدفع", y1447: 3.4, y1448: 3.9 },
    { stage: "الوثائق", y1447: 3.7, y1448: 4.1 },
    { stage: "السفر", y1447: 4.0, y1448: 4.4 },
    { stage: "الفندق", y1447: 3.9, y1448: 4.2 },
    { stage: "الوجبات", y1447: 3.3, y1448: 3.6 },
    { stage: "النقل", y1447: 3.5, y1448: 3.8 },
    { stage: "المشاعر", y1447: 4.1, y1448: 4.5 },
    { stage: "المدينة", y1447: 4.4, y1448: 4.6 },
    { stage: "العودة", y1447: 4.0, y1448: 4.3 },
  ],
  complaints: { total: 4_870, avgHours: 3.2, parts: [
    { label: "الوجبات", value: 31, color: "#672146" },
    { label: "النقل", value: 24, color: "#AD9E6E" },
    { label: "الفندق", value: 19, color: "#00594F" },
    { label: "الدفع / المصرف", value: 11, color: "#289E92" },
    { label: "أخرى", value: 15, color: "#D9C89E" },
  ] },
  clusters: [
    { name: "تكتل النور", evaluators: 4.6, self: 4.8 },
    { name: "تكتل الصفا والمروة", evaluators: 4.5, self: 4.6 },
    { name: "تكتل بوابة الحرمين", evaluators: 4.4, self: 4.5 },
    { name: "تكتل الشهباء", evaluators: 4.2, self: 4.7 },
    { name: "تكتل سهل حوران", evaluators: 4.1, self: 4.3 },
    { name: "تكتل اليقين", evaluators: 3.9, self: 4.2 },
    { name: "تكتل العاصي", evaluators: 3.7, self: 4.9 },
  ],
  compare: [
    { label: "التقييم العام للحجاج", y1447: "4.0", y1448: "4.3", better: true },
    { label: "متوسط زمن إغلاق الشكوى", y1447: "5.1 س", y1448: "3.2 س", better: true },
    { label: "متوسط زمن العثور على مفقود", y1447: "84 د", y1448: "52 د", better: true },
    { label: "الحالات الحرجة", y1447: "74", y1448: "61", better: true },
    { label: "متوسط أداء الإداريين", y1447: "82", y1448: "86", better: true },
    { label: "رضا الحجاج عن الوجبات", y1447: "3.3", y1448: "3.6", better: true },
    { label: "إداريون تحت 70", y1447: "71", y1448: "92", better: false },
  ],
  people: { admins: 1_240, adminsCompleted: 1_180, travellingStaff: 210, critical: 61, missing: 38, missingMinutes: 52, adminAvg: 86, adminsBelow: 92 },
  providers: [
    { name: "شركة (س) للنقل", kind: "نقل", rating: 4.7 },
    { name: "شركة (ع) للنقل", kind: "نقل", rating: 4.1 },
    { name: "شركة (ف) للإعاشة", kind: "إعاشة", rating: 4.3 },
    { name: "شركة (ص) للإعاشة", kind: "إعاشة", rating: 3.1 },
  ],
};
