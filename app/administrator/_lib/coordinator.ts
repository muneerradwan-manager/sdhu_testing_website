"use client";

/**
 * مكتب المنسق التقني: تسجيل طلب حج عن مواطن.
 *
 * المبدأ الحاكم: المنسق لا «ينوب» عن المواطن بلا إذنه. لكل طلب يسجّله المنسق رمز تحقق
 * يصل إلى هاتف المواطن المسجّل في الشؤون المدنية، ولا يكتمل التسجيل قبل إدخاله. ويُختم كل
 * طلب باسم المنسق (`submittedBy`) فيظهر في الطلب وفي سجل الأحداث، ولا يمكن حذفه.
 */

import { applicationNumberFor } from "@/lib/journey";
import { fullName, getPerson, type Person } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { actions, type Application } from "@/lib/store";
import { POSITIONS } from "./admin";

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
 * يفتح حساب الحاج (إن لم يكن موجوداً) ويحفظ الطلب باسم المواطن، مختوماً باسم المنسق.
 * الحساب يُفتح دون تبديل الجلسة، فيبقى المنسق داخلاً بحسابه هو.
 */
export function fileApplication(opts: {
  applicant: Person;
  members: Member[];
  governorate: string;
  office: string;
  payMethod: "card" | "bank";
  feePerPerson: number;
  coordinator: { id: string; name: string; position: string };
  /** لحظة التقديم — تُمرَّر من معالج الحدث */
  at: number;
}): FiledApplication {
  const { applicant, members, governorate, office, payMethod, feePerPerson, coordinator, at } = opts;
  const number = applicationNumberFor(applicant.id);
  const receipt = `1448-R-${number.padStart(6, "0")}`;

  actions.createAccountFor({
    nationalId: applicant.id,
    phone: `09${applicant.id.slice(2, 9)}`,
    password: "",
    createdAt: at,
  });

  actions.saveApplication({
    number,
    applicantId: applicant.id,
    createdAt: at,
    submittedAt: at,
    mode: members.length === 1 ? "solo" : "booklet",
    track: "direct",
    forWhom: "me",
    members,
    governorate,
    office,
    receipt,
    paid: members.length * feePerPerson,
    payMethod,
    ratings: {},
    submittedBy: coordinator,
  });

  actions.logEvent({
    actor: coordinator.name,
    role: `إداري — ${positionLabel(coordinator.position)}`,
    action: "تسجيل طلب حج عن مواطن",
    target: `طلب ${number} — ${fullName(applicant)}`,
    detail: `${members.length} أفراد — بموافقة المواطن برمز تحقق — الإيصال ${receipt}`,
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
  const cases: { applicantId: string; members: (Member | null)[]; governorate: string; office: string; minutesAgo: number }[] = [
    {
      applicantId: "06055500711",
      members: [member("06055500711", "self"), member("06055500701", "parent", { companionId: "06055500711" })],
      governorate: "حمص",
      office: "حمص – الوعر",
      minutesAgo: 210,
    },
    {
      applicantId: "02033300550",
      members: [member("02033300550", "self"), member("02033300551", "spouse")],
      governorate: "حلب",
      office: "حلب – الجميلية",
      minutesAgo: 75,
    },
  ];

  for (const c of cases) {
    const applicant = getPerson(c.applicantId);
    const members = c.members.filter((m): m is Member => m !== null);
    if (!applicant || members.length !== c.members.length) continue;
    fileApplication({
      applicant,
      members,
      governorate: c.governorate,
      office: c.office,
      payMethod: "card",
      feePerPerson,
      coordinator,
      at: now - c.minutesAgo * 60_000,
    });
  }
}
