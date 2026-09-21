/**
 * Pure helpers for the interactive "after acceptance" checklist (spec phases 5 – 9).
 * Everything is derived from `PostAcceptance` and the application in the store, so reloads keep their place.
 *
 * Nothing about documents or health is asked at registration. After acceptance:
 * 1) the pilgrim confirms — a lottery winner also chooses the payment plan and pays the first installment
 *    (direct acceptance paid it with the registration);
 * 2) uploads a personal photo and passport for every member — no medical document before the assignment window;
 * 3) in the assignment window, reads the group directory and contacts a group: that group's coordinator
 *    enrolls the whole family and both sign the pilgrim–group contract;
 * 4) pays the rest of the Hajj cost by the chosen plan, with the sacrifice and any private-room difference;
 * 5) only after joining a group: the medical file — vaccination certificates and the other medical
 *    documents (the list the administration sets), and the health information the group's coordinator records; 6) visa.
 */import { ageOf, fullName } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { installmentsOf, seasonPlan } from "@/lib/installments";
import { SEASON } from "@/lib/season";
import { actions, type AdminProfile, type Application, type DocStatus, type HealthFile, type PostAcceptance } from "@/lib/store";

/** Group 27's leader in the administrator portal (lib/registry: أحمد سليمان الحمصي) */
export const LEADER_ID = "01033300871";
/** Group 27's technical coordinator — he enrolls pilgrims into the group and takes their health files (lib/registry: سامر نبيل نجار) */
export const COORDINATOR_ID = "01033300874";

/** Restarting the demo: drop the group leader's "received" mark and the needs the health file wrote into the application */
export function clearJoinDecisions(sessionId: string, admins: Record<string, AdminProfile>, app?: Application) {
  for (const [id, a] of Object.entries(admins)) {
    if (!a.joinDecisions?.[sessionId]) continue;
    const rest = Object.fromEntries(Object.entries(a.joinDecisions).filter(([sid]) => sid !== sessionId));
    actions.upsertAdmin(id, { joinDecisions: rest });
  }
  if (app) actions.saveApplication({ ...app, members: app.members.map((m) => ({ ...m, needs: [] })) });
}

export const EMPTY_POST: PostAcceptance = { documents: {}, payments: {}, ratings: {} };

/** Everything cleared — merged over the stored record by actions.setPost */
export const RESET_POST: Partial<PostAcceptance> = {
  confirmedAt: undefined,
  documents: {},
  rejectedOnce: [],
  clusterId: undefined,
  groupNumber: undefined,
  enrolledBy: undefined,
  groupApprovedAt: undefined,
  transfers: [],
  health: undefined,
  medical: {},
  payments: {},
  contractSignedAt: undefined,
  visaAt: undefined,
  ratings: {},
};

export type StepKey = "confirm" | "documents" | "group" | "payment" | "medical" | "visa";

export const STEPS: { key: StepKey; title: string; short: string; emoji: string; question: string; unlocks: string }[] = [
  { key: "confirm", title: "تأكيد القبول", short: "والدفعة الأولى للمقبولين بالقرعة", emoji: "✍️", question: "هل وصلتك النتيجة بوضوح وفي الوقت المناسب؟", unlocks: "رفع الوثائق" },
  { key: "documents", title: "الصورة والجواز", short: "لا وثائق طبية قبل التفويج", emoji: "📄", question: "كيف تقيّم وضوح الوثائق المطلوبة وسرعة الرد عليها؟", unlocks: "التفويج إلى المجموعة" },
  { key: "group", title: "التفويج إلى مجموعة", short: "تختارها ويسجّلك منسقها", emoji: "🧭", question: "كيف تقيّم وضوح دليل المجموعات والتسجيل عند المنسق؟", unlocks: "قسم «المجموعة»" },
  { key: "payment", title: "الدفعة الثانية", short: "عند الانضمام إلى المجموعة", emoji: "🧾", question: "كيف تقيّم وضوح التكاليف والدفعات والإيصالات؟", unlocks: "الوثائق الطبية" },
  { key: "medical", title: "الملف الطبي", short: "اللقاحات والوثائق الطبية بعد الانضمام", emoji: "🩺", question: "كيف تقيّم وضوح الوثائق الطبية وتواصل منسق المجموعة؟", unlocks: "التأشيرة والرحلة" },
  { key: "visa", title: "التأشيرة والرحلة", short: "التأشيرة والطيران والسكن", emoji: "🛂", question: "كيف تقيّم وضوح معلومات السفر والتحضير قبل الرحلة؟", unlocks: "الرحلات والفنادق والمخيمات والبطاقات" },
];
export type DocKey = "photo" | "passport";

/** After acceptance: identity documents only. Every medical document (vaccines included) waits until the pilgrim has joined a group */
export const DOCS: { key: DocKey; label: string; emoji: string; reviewer: string; reviewMs: number; hint: string }[] = [
  { key: "photo", label: "الصورة الشخصية", emoji: "🖼️", reviewer: "رنا حداد", reviewMs: 2200, hint: "خلفية بيضاء، حديثة، دون نظارات" },
  { key: "passport", label: "جواز السفر", emoji: "🛂", reviewer: "رنا حداد", reviewMs: 3200, hint: "صفحة البيانات كاملة وواضحة" },
];
export const docKey = (m: Member, d: DocKey) => `${m.person.id}-${d}`;

/** 69+ need a dedicated companion — the oldest one gets the spec's expired-passport case */
export function elderlyMembers(members: Member[]) {
  return members.filter((m) => ageOf(m.person) >= 69).sort((a, b) => ageOf(b.person) - ageOf(a.person));
}

export function passportCaseMember(members: Member[]) {
  return elderlyMembers(members)[0] ?? null;
}

/** Statuses written the moment the pilgrim confirms: nothing was uploaded at registration */
export function initialDocuments(members: Member[]): Record<string, DocStatus> {
  const out: Record<string, DocStatus> = {};
  for (const m of members) for (const d of DOCS) out[docKey(m, d.key)] = "missing";
  return out;
}

export function docStatus(post: PostAcceptance, m: Member, d: DocKey): DocStatus {
  return post.documents[docKey(m, d)] ?? "missing";
}

export function memberDocsDone(post: PostAcceptance, m: Member) {
  return DOCS.every((d) => docStatus(post, m, d.key) === "approved");
}

// ───────────────────────── Health file ─────────────────────────

export const CONDITIONS = ["سكري", "ضغط الدم", "أمراض القلب", "ربو أو أمراض تنفسية", "أمراض الكلى", "حساسية دوائية"] as const;
export const NEEDS = ["كرسي متحرك", "صعوبة في المشي", "وجبة خاصة", "غرفة قريبة من المصعد", "ضعف السمع أو البصر", "أكسجين ليلي"] as const;

/** Needs that call for a private room near the lift (and its price difference) */
export const ROOM_NEEDS: string[] = ["كرسي متحرك", "صعوبة في المشي", "غرفة قريبة من المصعد", "أكسجين ليلي"];

export type MedicalDoc = (typeof SEASON.medicalDocuments)[number];

/** The medical documents this member must upload (the administration's list: vaccines, report; flu for 60+, a prescription only if on medication) */
export function medicalDocsFor(m: Member, health?: HealthFile): MedicalDoc[] {
  const rec = health?.members[m.person.id];
  return SEASON.medicalDocuments.filter(
    (d) => (!("onlyIfMedications" in d && d.onlyIfMedications) || !!rec?.medications.trim()) && (!("minAge" in d && d.minAge) || ageOf(m.person) >= d.minAge),
  );
}

/** Needs recorded in the health file flow back into the application (rooms, meals, costs, roster) */
export function membersWithHealth(members: Member[], health: HealthFile): Member[] {
  return members.map((m) => {
    const rec = health.members[m.person.id];
    return rec ? { ...m, needs: [...rec.conditions, ...rec.needs] } : m;
  });
}

export const medicalKey = (m: Member, d: MedicalDoc) => `${m.person.id}-${d.key}`;

export function medicalDone(post: PostAcceptance, app: Application) {
  const h = post.health;
  if (!h?.confirmedAt) return false;
  return app.members.every((m) => !!h.members[m.person.id] && medicalDocsFor(m, h).every((d) => post.medical?.[medicalKey(m, d)] === "approved"));
}
/**
 * The coordinator saves a family's health file: stored on the pilgrim's post-acceptance record, and the
 * needs flow into the application so rooms, meals, costs and the group roster follow them.
 */
export function recordHealth(sessionId: string, app: Application, health: HealthFile, actorRole = "منسق تقني") {
  actions.setPost(sessionId, { health });
  actions.saveApplication({ ...app, members: membersWithHealth(app.members, health) });
  const needs = Object.values(health.members).flatMap((r) => [...r.conditions, ...r.needs]);
  actions.logEvent({
    actor: health.by.name,
    role: actorRole,
    action: "تسجيل الملف الصحي بعد القبول",
    target: `طلب ${app.number}`,
    detail: `${app.members.length} أفراد — ${needs.length ? `حالات مسجّلة: ${[...new Set(needs)].join("، ")}` : "لا حالات خاصة"}`,
  });
}

/** Demo record the simulated coordinator writes: the family's real profile from the operating document */
export function demoHealth(members: Member[], by: { id: string; name: string }, at: number): HealthFile {
  const recs: HealthFile["members"] = {};
  for (const m of members) {
    const age = ageOf(m.person);
    recs[m.person.id] =
      age >= 75
        ? { conditions: ["ضغط الدم", "سكري"], needs: ["كرسي متحرك", "غرفة قريبة من المصعد"], medications: "أملوديبين 5 ملغ صباحاً، ميتفورمين 500 ملغ مرتين" }
        : age >= 55
          ? { conditions: ["ضغط الدم"], needs: [], medications: "حبة ضغط صباحاً" }
          : { conditions: [], needs: [], medications: "" };
  }
  return { by, at, members: recs };
}

// ───────────────────────── Costs ─────────────────────────

export function receiptBase(app: Application) {
  return `1448-P-${app.number.padStart(6, "0")}`;
}

export type CostLine = { key: string; title: string; detail: string; amount: number; receipt: string; due: string; installment?: number };

/**
 * The Hajj cost by the chosen plan (the first installment is already paid at registration or at the
 * lottery result), then the sacrifice and any private-room difference with the last installment.
 */
export function costLines(app: Application, fees: { hajjCost: number; firstInstallment: number; installmentCount?: 1 | 2; hady: number; privateRoomDiff: number }): CostLine[] {
  const n = app.members.length;
  const base = receiptBase(app);
  const plan = app.plan ?? seasonPlan(fees);
  const inst = installmentsOf(plan, n, app.number, fees);
  const lastDue = inst[inst.length - 1].due;
  const lines: CostLine[] = inst.map((i) => ({
    key: i.key,
    title: i.title,
    detail: `${n} × ${i.perPerson.toLocaleString("en-US")} $`,
    amount: i.amount,
    receipt: i.receipt,
    due: i.due,
    installment: i.index + 1,
  }));
  const tail = plan === 1 ? SEASON.installments.windows[1] : lastDue;
  lines.push({ key: "hady", title: "الهدي", detail: `${n} × ${fees.hady.toLocaleString("en-US")} $`, amount: n * fees.hady, receipt: `${base}-H`, due: tail });
  const needy = app.members.filter((m) => m.needs.some((x) => ROOM_NEEDS.includes(x)));
  if (needy.length) {
    lines.push({ key: "room", title: "فارق الغرفة الخاصة", detail: `غرفة قريبة من المصعد لـ ${needy.map((m) => m.person.firstName).join(" و")}`, amount: fees.privateRoomDiff, receipt: `${base}-R`, due: tail });
  }
  return lines;
}

/** When a line was paid: the first installment comes from the application (paid at registration or at the draw) */
export function paidAt(line: CostLine, app: Application, post: PostAcceptance) {
  if (line.key === "i1") return app.firstPaid?.at;
  return post.payments[line.key];
}

export function stepsDone(post: PostAcceptance, app: Application, lines: CostLine[]): Record<StepKey, boolean> {
  return {
    confirm: !!post.confirmedAt && !!app.firstPaid,
    documents: !!post.confirmedAt && app.members.every((m) => memberDocsDone(post, m)),
    group: !!post.groupApprovedAt && !!post.contractSignedAt,
    payment: lines.every((l) => !!paidAt(l, app, post)),
    medical: medicalDone(post, app),
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
