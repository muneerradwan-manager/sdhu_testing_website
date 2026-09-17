/**
 * Pure helpers for the interactive "after acceptance" checklist (spec phases 5 – 9).
 * Everything is derived from `PostAcceptance` in the store, so reloads keep their place.
 */
import { ageOf, fullName } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { actions, type AdminProfile, type Application, type DocStatus, type PostAcceptance } from "@/lib/store";

/** Group 27's leader in the administrator portal (lib/registry: أحمد سليمان الحمصي) */
export const LEADER_ID = "01033300871";

/** Remove this pilgrim's join decision from every administrator, so a fresh request shows up in their queue */
export function clearJoinDecisions(sessionId: string, admins: Record<string, AdminProfile>) {
  for (const [id, a] of Object.entries(admins)) {
    if (!a.joinDecisions?.[sessionId]) continue;
    const rest = Object.fromEntries(Object.entries(a.joinDecisions).filter(([sid]) => sid !== sessionId));
    actions.upsertAdmin(id, { joinDecisions: rest });
  }
}

export const EMPTY_POST: PostAcceptance = { documents: {}, payments: {}, ratings: {} };

/** Everything cleared — merged over the stored record by actions.setPost */
export const RESET_POST: Partial<PostAcceptance> = {
  confirmedAt: undefined,
  documents: {},
  clusterId: undefined,
  groupNumber: undefined,
  groupRequestedAt: undefined,
  groupApprovedAt: undefined,
  payments: {},
  contractSignedAt: undefined,
  visaAt: undefined,
  ratings: {},
};

export type StepKey = "confirm" | "documents" | "group" | "payment" | "visa";

export const STEPS: { key: StepKey; title: string; short: string; emoji: string; question: string; unlocks: string }[] = [
  { key: "confirm", title: "تأكيد القبول", short: "اقرأ التعليمات ووقّع", emoji: "✍️", question: "هل وصلتك النتيجة بوضوح وفي الوقت المناسب؟", unlocks: "استكمال الأوراق" },
  { key: "documents", title: "استكمال الأوراق", short: "اللقاحات والتقرير الطبي", emoji: "📄", question: "كيف تقيّم وضوح الوثائق المطلوبة وسرعة الرد عليها؟", unlocks: "دليل التكتلات" },
  { key: "group", title: "اختيار التكتل والمجموعة", short: "قارن واختر مجموعتك", emoji: "🧭", question: "كيف تقيّم وضوح برامج التكتلات وسهولة الانتساب؟", unlocks: "قسم «المجموعة»" },
  { key: "payment", title: "التسديد والعقد", short: "3 إيصالات + توقيع العقد", emoji: "🧾", question: "كيف تقيّم وضوح التكاليف والإيصالات والعقد؟", unlocks: "قسم «الإيصالات والعقد»" },
  { key: "visa", title: "التأشيرة والرحلة", short: "التأشيرة والطيران والسكن", emoji: "🛂", question: "كيف تقيّم وضوح معلومات السفر والتحضير قبل الرحلة؟", unlocks: "الرحلات والفنادق والمخيمات والبطاقات" },
];

export type DocKey = "passport" | "meningitis" | "flu" | "medical";

export const DOCS: { key: DocKey; label: string; emoji: string; reviewer: string; reviewMs: number }[] = [
  { key: "passport", label: "جواز السفر", emoji: "🛂", reviewer: "رنا حداد", reviewMs: 3200 },
  { key: "meningitis", label: "لقاح الحمى الشوكية", emoji: "💉", reviewer: "د. ليلى شمس", reviewMs: 2600 },
  { key: "flu", label: "لقاح الإنفلونزا الموسمية", emoji: "🤧", reviewer: "د. ليلى شمس", reviewMs: 2600 },
  { key: "medical", label: "التقرير الطبي", emoji: "🩺", reviewer: "د. ليلى شمس", reviewMs: 5200 },
];

export const docKey = (m: Member, d: DocKey) => `${m.person.id}-${d}`;

/** 69+ need a dedicated companion — the oldest one gets the spec's expired-passport case */
export function elderlyMembers(members: Member[]) {
  return members.filter((m) => ageOf(m.person) >= 69).sort((a, b) => ageOf(b.person) - ageOf(a.person));
}

export function passportCaseMember(members: Member[]) {
  return elderlyMembers(members)[0] ?? null;
}

export function docRequirement(m: Member, d: DocKey): "required" | "recommended" | "optional" | "none" {
  const age = ageOf(m.person);
  switch (d) {
    case "passport":
    case "meningitis":
      return "required";
    case "flu":
      return age >= 60 ? "recommended" : "optional";
    case "medical":
      return age >= 70 || m.needs.length > 0 ? "required" : "none";
  }
}

/** Statuses written the moment the pilgrim confirms: passports come from registration */
export function initialDocuments(members: Member[]): Record<string, DocStatus> {
  const rejected = passportCaseMember(members);
  const out: Record<string, DocStatus> = {};
  for (const m of members) {
    out[docKey(m, "passport")] = rejected?.person.id === m.person.id ? "rejected" : "approved";
    out[docKey(m, "meningitis")] = "missing";
    out[docKey(m, "flu")] = "missing";
    if (docRequirement(m, "medical") !== "none") out[docKey(m, "medical")] = "missing";
  }
  return out;
}

export function docStatus(post: PostAcceptance, m: Member, d: DocKey): DocStatus {
  return post.documents[docKey(m, d)] ?? (d === "passport" ? "approved" : "missing");
}

export function memberDocsDone(post: PostAcceptance, m: Member) {
  return DOCS.every((d) => docRequirement(m, d.key) !== "required" || docStatus(post, m, d.key) === "approved");
}

export function receiptBase(app: Application) {
  return `1448-P-${app.number.padStart(6, "0")}`;
}

export type CostLine = { key: "hajj" | "hady" | "room"; title: string; detail: string; amount: number; receipt: string };

export function costLines(app: Application, fees: { hajjCost: number; hady: number; privateRoomDiff: number }): CostLine[] {
  const n = app.members.length;
  const base = receiptBase(app);
  const lines: CostLine[] = [
    { key: "hajj", title: "تكلفة الحج", detail: `${n} × ${fees.hajjCost.toLocaleString("en-US")} $`, amount: n * fees.hajjCost, receipt: `${base}-1` },
    { key: "hady", title: "الهدي", detail: `${n} × ${fees.hady.toLocaleString("en-US")} $`, amount: n * fees.hady, receipt: `${base}-2` },
  ];
  const needy = app.members.filter((m) => m.needs.length > 0);
  if (needy.length) {
    lines.push({
      key: "room",
      title: "فارق الغرفة الخاصة",
      detail: `غرفة قريبة من المصعد لـ ${needy.map((m) => m.person.firstName).join(" و")}`,
      amount: fees.privateRoomDiff,
      receipt: `${base}-3`,
    });
  }
  return lines;
}

export function stepsDone(post: PostAcceptance, app: Application, lines: CostLine[]): Record<StepKey, boolean> {
  return {
    confirm: !!post.confirmedAt,
    documents: !!post.confirmedAt && app.members.every((m) => memberDocsDone(post, m)),
    group: !!post.groupApprovedAt,
    payment: !!post.contractSignedAt && lines.every((l) => !!post.payments[l.key]),
    visa: !!post.visaAt,
  };
}

/** The person each elderly member leans on (the spec's transfer warning) */
export function companionOf(members: Member[], m: Member) {
  return members.filter((e) => e.companionId === m.person.id);
}

export function nameOf(m: Member) {
  return fullName(m.person);
}
