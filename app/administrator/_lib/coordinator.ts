"use client";

/**
 * التسجيل على الحج عن مواطن: يقوم به كل من يملك صلاحيته — إداري تملكها صفته (رئيس المجموعة،
 * المنسق التقني، المعاون…) أو موظف إدخال بيانات — ولا يضع الحاج في أي مجموعة.
 *
 * المبدأ الحاكم: من يسجّل لا «ينوب» عن المواطن بلا إذنه. لكل طلب رمز تحقق يصل إلى هاتف
 * المواطن المسجّل في الشؤون المدنية، ولا يكتمل التسجيل قبل إدخاله. ويُختم كل طلب باسم من
 * سجّله (`submittedBy`) فيظهر في الطلب وفي سجل الأحداث، ولا يمكن حذفه.
 */

import { groupInfo } from "@/lib/assignment";
import { firstPayment, planLabel, seasonPlan, type Plan } from "@/lib/installments";
import { applicationNumberFor } from "@/lib/journey";
import { fullName, getPerson, type Person } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { actions, type Application } from "@/lib/store";
import { officeFor } from "@/lib/season";
import { POSITIONS, TECH_POSTING } from "./admin";

/** لماذا لا يمكن تسجيل هذا المواطن */
export type Block =
  | { kind: "ok" }
  | { kind: "admin"; text: string }
  | { kind: "applied"; text: string; number: string }
  | { kind: "self"; text: string };

/**
 * يفحص أهلية المواطن للتسجيل قبل فتح الطلب: لا يسجَّل من له طلب هذا الموسم،
 * ولا من يملك حساباً إدارياً (نوع حساب واحد لكل شخص)، ولا يسجّل المنسق لنفسه من هنا.
 */
export function blockFor(
  citizenId: string,
  coordinatorId: string,
  state: { applications: Record<string, Application>; admins: Record<string, unknown> },
): Block {
  if (citizenId === coordinatorId) return { kind: "self", text: "هذا رقمك الوطني. حسابك إداري، ولا يُسجَّل الإداري حاجاً من مكتبه." };
  if (state.admins[citizenId]) return { kind: "admin", text: "هذا الرقم الوطني يملك حساباً إدارياً. لكل شخص نوع حساب واحد في المنصة." };
  const existing = state.applications[citizenId];
  if (existing) return { kind: "applied", text: `لهذا المواطن طلب مقدَّم هذا الموسم برقم ${existing.number}.`, number: existing.number };
  return { kind: "ok" };
}

export function positionLabel(key: string) {
  return POSITIONS.find((p) => p.key === key)?.label ?? key;
}

/** A phone as the desk shows it when it is the citizen's own account's: masked but for its last three digits */
export function maskedPhone(phone: string) {
  return `${phone.slice(0, 2)}•• ••• ${phone.slice(-3)}`;
}

/** A Syrian mobile number: 09 and eight digits, as the pilgrim's own sign-up asks */
export const isMobile = (phone: string) => /^09\d{8}$/.test(phone);

export type FiledApplication = { number: string; receipt: string };

/**
 * المكتب الذي يتبعه الطلب. تسجيل عادي لا يضع أحداً في مجموعة: إلحاق الحاج بمجموعة عملية مستقلة لاحقة،
 * بعقد بينه وبين المجموعة يرفعه رئيسها أو المنسق الموزَّع عليها.
 */
export function coordinatorPosting() {
  const info = groupInfo(TECH_POSTING.clusterId, TECH_POSTING.groupNumber);
  return { group: { clusterId: info.clusterId, number: info.number }, area: info.area, office: officeFor(info.area), clusterName: info.clusterName };
}

/**
 * يفتح حساب المواطن (إن لم يكن موجوداً) ويحفظ الطلب في ملفه، مختوماً باسم المنسق.
 * الحساب يُفتح دون تبديل الجلسة، فيبقى المنسق داخلاً بحسابه هو. صاحب الطلب هو الأكبر سناً بين
 * الأفراد، وقد يكون غير المواطن الذي راجع المكتب (والده مثلاً).
 */
export function fileApplication(opts: {
  /** المواطن الذي راجع المكتب ووافق برمز التحقق — يُحفظ الطلب في حسابه */
  citizen: Person;
  /**
   * The phone the code reached: the one he gave at the desk (the civil registry holds no phone), saved in
   * the account opened for him — or the one his own account already has, which stays as it is
   */
  phone: string;
  members: Member[];
  payMethod: "shamcash" | "bank";
  feePerPerson: number;
  /** التسجيل على القبول المباشر (الرسم + الدفعة الأولى) أو على القرعة (الرسم فقط) */
  track: "direct" | "lottery";
  /** خطة تسديد تكلفة الحج التي حددتها الإدارة للموسم (دفعة واحدة أو دفعتان) */
  plan?: Plan;
  /** Who filed it: an administrator (his role's key) or a staff member (`role`: his title) */
  coordinator: { id: string; name: string; position: string; role?: string };
  /** لحظة التقديم — تُمرَّر من معالج الحدث */
  at: number;
}): FiledApplication {
  const { citizen, phone, members, payMethod, feePerPerson, track, plan, coordinator, at } = opts;
  const first = track === "direct" && plan ? firstPayment(plan, members.length) : 0;
  const posting = coordinatorPosting();
  const applicant = members.find((m) => m.relation === "self")?.person ?? citizen;
  const number = applicationNumberFor(citizen.id);
  const receipt = `1448-R-${number.padStart(6, "0")}`;

  actions.createAccountFor({
    nationalId: citizen.id,
    phone,
    password: "",
    createdAt: at,
  });

  actions.saveApplication({
    number,
    applicantId: citizen.id,
    createdAt: at,
    submittedAt: at,
    mode: members.length === 1 ? "solo" : "booklet",
    track,
    forWhom: applicant.id === citizen.id ? "me" : "other",
    members,
    governorate: posting.area,
    office: posting.office,
    receipt,
    paid: members.length * feePerPerson + first,
    plan: track === "direct" ? plan : undefined,
    firstPaid: first ? { amount: first, at, receipt: `1448-P-${number.padStart(6, "0")}-1` } : undefined,
    payMethod,
    ratings: {},
    submittedBy: { id: coordinator.id, name: coordinator.name, position: coordinator.position },
  });

  actions.logEvent({
    actor: coordinator.name,
    role: coordinator.role ?? `إداري — ${positionLabel(coordinator.position)}`,
    action: "تسجيل طلب حج عن مواطن",
    target: `طلب ${number} — ${fullName(applicant)}`,
    detail: `${members.length} أفراد — ${track === "direct" ? `القبول المباشر — رسم التسجيل + الدفعة الأولى (${planLabel(plan ?? seasonPlan())})` : "القرعة — رسم التسجيل"} — بموافقة المواطن برمز تحقق — ${posting.office} — لا يضعه في أي مجموعة — الإيصال ${receipt}`,
  });

  return { number, receipt };
}

/** كل ما سجّله هذا المنسق، الأحدث أولاً */
export function filedBy(coordinatorId: string, applications: Record<string, Application>) {
  return Object.values(applications)
    .filter((a) => a.submittedBy?.id === coordinatorId)
    .sort((a, b) => b.submittedAt - a.submittedAt);
}

// ───────────────────────── مثال جاهز عند الدخول التجريبي ─────────────────────────

const member = (id: string, relation: Member["relation"], extra: Partial<Member> = {}): Member | null => {
  const person = getPerson(id);
  return person ? { person, relation, relationVerified: true, needs: [], ...extra } : null;
};

/**
 * طلبان سبق أن سجّلهما المنسق، حتى يفتح المكتب على مثال كامل بدل جدول فارغ:
 * حسان القاسم مع والدته (76 عاماً، تحتاج مرافقاً)، وسامر النجار مع زوجته.
 */
export function seedCoordinatorWork(coordinator: { id: string; name: string; position: string }, now: number, feePerPerson: number) {
  const cases: { applicantId: string; members: (Member | null)[]; track: "direct" | "lottery"; minutesAgo: number }[] = [
    {
      applicantId: "06055500711",
      members: [member("06055500711", "self"), member("06055500701", "parent", { companionId: "06055500711" })],
      track: "direct",
      minutesAgo: 210,
    },
    {
      applicantId: "02033300550",
      members: [member("02033300550", "self"), member("02033300551", "spouse")],
      track: "lottery",
      minutesAgo: 75,
    },
  ];

  for (const c of cases) {
    const applicant = getPerson(c.applicantId);
    const members = c.members.filter((m): m is Member => m !== null);
    if (!applicant || members.length !== c.members.length) continue;
    fileApplication({
      citizen: applicant,
      // The phone each gave at the desk (made up for the demo)
      phone: `0944${applicant.id.slice(-6)}`,
      members,
      payMethod: "shamcash",
      feePerPerson,
      track: c.track,
      plan: seasonPlan(),
      coordinator,
      at: now - c.minutesAgo * 60_000,
    });
  }
}
