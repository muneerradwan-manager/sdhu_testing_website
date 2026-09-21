"use client";

/**
 * مكتب المنسق التقني: تسجيل طلب حج عن مواطن.
 *
 * المبدأ الحاكم: المنسق لا «ينوب» عن المواطن بلا إذنه. لكل طلب يسجّله المنسق رمز تحقق
 * يصل إلى هاتف المواطن المسجّل في الشؤون المدنية، ولا يكتمل التسجيل قبل إدخاله. ويُختم كل
 * طلب باسم المنسق (`submittedBy`) فيظهر في الطلب وفي سجل الأحداث، ولا يمكن حذفه.
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

/** رقم هاتف المواطن كما يظهر للمنسق — مقنّع إلا آخر ثلاثة أرقام */
export function maskedPhone(p: Person) {
  return `09•• ••• ${p.phoneTail}`;
}

export type FiledApplication = { number: string; receipt: string };

/**
 * مكتب المنسق ومجموعته. الطلب الذي يسجّله يتبع مكتبه، لكنه تسجيل عادي لا يضع أحداً في مجموعته:
 * الانضمام إلى المجموعات يتم في مرحلة التفويج فقط، ويسجّل المنسق فيها الحجاج في مجموعته هو.
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
  members: Member[];
  payMethod: "shamcash" | "bank";
  feePerPerson: number;
  /** التسجيل على القبول المباشر (الرسم + الدفعة الأولى) أو على القرعة (الرسم فقط) */
  track: "direct" | "lottery";
  /** خطة تسديد تكلفة الحج التي حددتها الإدارة للموسم (دفعة واحدة أو دفعتان) */
  plan?: Plan;
  coordinator: { id: string; name: string; position: string };
  /** لحظة التقديم — تُمرَّر من معالج الحدث */
  at: number;
}): FiledApplication {
  const { citizen, members, payMethod, feePerPerson, track, plan, coordinator, at } = opts;
  const first = track === "direct" && plan ? firstPayment(plan, members.length) : 0;
  const posting = coordinatorPosting();
  const applicant = members.find((m) => m.relation === "self")?.person ?? citizen;
  const number = applicationNumberFor(citizen.id);
  const receipt = `1448-R-${number.padStart(6, "0")}`;

  actions.createAccountFor({
    nationalId: citizen.id,
    phone: `09${citizen.id.slice(2, 9)}`,
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
    submittedBy: coordinator,
  });

  actions.logEvent({
    actor: coordinator.name,
    role: `إداري — ${positionLabel(coordinator.position)}`,
    action: "تسجيل طلب حج عن مواطن",
    target: `طلب ${number} — ${fullName(applicant)}`,
    detail: `${members.length} أفراد — ${track === "direct" ? `القبول المباشر — رسم التسجيل + الدفعة الأولى (${planLabel(plan ?? seasonPlan())})` : "القرعة — رسم التسجيل"} — بموافقة المواطن برمز تحقق — ${posting.office} — دون مجموعة حتى مرحلة التفويج — الإيصال ${receipt}`,
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
