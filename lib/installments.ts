/**
 * تسديد تكلفة الحج — تحدده الإدارة للموسم كله، ولا يختاره الحاج.
 *
 * موسم 1448: دفعتان.
 * - الدفعة الأولى: مع التسجيل على القبول المباشر (مع رسم التسجيل)، أو عند تثبيت التسجيل لمن قُبل بالقرعة
 *   (التسجيل الأولي على القرعة يكتفي برسم التسجيل).
 * - الدفعة الثانية: عند الانضمام إلى مجموعة.
 * وإن قررت الإدارة دفعة واحدة، تُدفع التكلفة كاملة في موعد الدفعة الأولى.
 *
 * عدد الدفعات وتوزيعها ومواعيدها من إعدادات التسجيل المنشورة (lib/registration): يصل إلى هنا جدولاً في
 * `fees.schedule`، فيُقرأ كما هو (حتى أربع دفعات). وبلا جدول (حساب خارج الصفحات) تبقى الدفعتان الافتراضيتان.
 */
import { SEASON } from "./season";

export type Plan = 1 | 2;

const ORDINAL = ["الأولى", "الثانية"];

/** One installment per person, as the published schedule resolves it */
export type ScheduleLine = { key: string; label: string; perPerson: number; dueLabel: string; dueStep?: string };

type Fees = { hajjCost: number; firstInstallment: number; installmentCount?: Plan; schedule?: ScheduleLine[] };

/** The season's plan (from the season director's settings) */
export function seasonPlan(fees: Fees = SEASON.fees): Plan {
  if (fees.schedule?.length) return fees.schedule.length === 1 ? 1 : 2;
  return (fees.installmentCount ?? SEASON.installments.count) === 1 ? 1 : 2;
}

/** Per-person amounts, first payment first */
export function planAmounts(plan: Plan, fees: Fees = SEASON.fees): number[] {
  if (fees.schedule?.length) return fees.schedule.map((l) => l.perPerson);
  if (plan === 1) return [fees.hajjCost];
  const first = Math.min(fees.firstInstallment, fees.hajjCost);
  return [first, fees.hajjCost - first];
}

/** What is due at the first moment (direct registration, or the lottery result) for the whole application */
export function firstPayment(plan: Plan, people: number, fees: Fees = SEASON.fees) {
  return planAmounts(plan, fees)[0] * people;
}

export type Installment = { index: number; key: string; title: string; perPerson: number; amount: number; due: string; receipt: string; dueStep?: string };

export function installmentsOf(plan: Plan, people: number, number: string, fees: Fees = SEASON.fees): Installment[] {
  const base = `1448-P-${number.padStart(6, "0")}`;
  if (fees.schedule?.length) {
    return fees.schedule.map((l, i) => ({ index: i, key: l.key, title: l.label, perPerson: l.perPerson, amount: l.perPerson * people, due: l.dueLabel, receipt: `${base}-${i + 1}`, dueStep: l.dueStep }));
  }
  return planAmounts(plan, fees).map((perPerson, i) => ({
    index: i,
    key: `i${i + 1}`,
    title: plan === 1 ? "تكلفة الحج كاملة" : `الدفعة ${ORDINAL[i]}`,
    perPerson,
    amount: perPerson * people,
    due: SEASON.installments.windows[i],
    receipt: `${base}-${i + 1}`,
  }));
}

/** One line for the pilgrim: how the administration set payment this season */
export function planLabel(plan: Plan, fees: Fees = SEASON.fees) {
  const s = fees.schedule;
  if (s && s.length > 2) return `${s.length} دفعات: ${s.map((l) => `${l.perPerson.toLocaleString("en-US")} $`).join(" ثم ")} للفرد`;
  if (s?.length === 2) return `دفعتان: ${s[0].perPerson.toLocaleString("en-US")} $ ثم ${s[1].perPerson.toLocaleString("en-US")} $ للفرد عند الانضمام إلى مجموعة`;
  if (plan === 1) return `دفعة واحدة كاملة (${fees.hajjCost.toLocaleString("en-US")} $ للفرد)`;
  const [a, b] = planAmounts(2, fees);
  return `دفعتان: ${a.toLocaleString("en-US")} $ ثم ${b.toLocaleString("en-US")} $ للفرد عند الانضمام إلى مجموعة`;
}
