/**
 * The registration as the platform shipped it, written as a configuration: the same stages in the same order
 * with the same words, the same seven steps after acceptance, and season 1448's two installments. It is the
 * first published version of season 1448, so nothing changes for a pilgrim until the holder of «إدارة التسجيل
 * على الحج» publishes a change. A system stage with an empty title keeps the platform's own wording, which
 * follows the case (the applicant himself, or someone he files for).
 */
import { SEASON } from "../season";
import type { PostStepDef, RegConfig, RegSeason, RegVersion, StageDef } from "./types";

const system = (id: StageDef["system"] & string, name: string, phase: string): StageDef => ({
  id,
  kind: "system",
  system: id,
  name,
  title: "",
  hint: "",
  phase,
  blocks: [],
  fields: [],
  enabled: true,
  gates: [],
});

export const PHASES = { owner: "صاحب الطلب", members: "المرافقون", eligibility: "الأهلية", pay: "الملخص والدفع" } as const;

export const DEFAULT_STAGES: StageDef[] = [
  {
    id: "intro",
    kind: "content",
    name: "صفحة البداية",
    title: "أهلاً {firstName}، سنقدّم طلبك معاً خطوة بخطوة",
    hint: "سنسألك بعض الأسئلة البسيطة. بيانات مرافقيك تأتي من الشؤون المدنية، ونطبّق الشروط ونشرح لك كل شيء. يستغرق ذلك نحو خمس دقائق.",
    phase: PHASES.owner,
    blocks: [
      {
        id: "intro-cards",
        kind: "cards",
        items: [
          { id: "c1", emoji: "🪪", title: "بطاقتك الشخصية", text: "وبطاقات مرافقيك أو دفتر العائلة" },
          { id: "c2", emoji: "🛂", title: "لا تحتاج جوازك الآن", text: "الصورة الشخصية بعد الدفعة الأولى، والجواز بعد الدفعة الثانية، والوثائق الطبية بعد الانضمام إلى مجموعة" },
          { id: "c3", emoji: "💳", title: "{fee} دولاراً للفرد", text: "رسم التسجيل" },
        ],
      },
    ],
    fields: [],
    enabled: true,
    gates: [],
    nextLabel: "لنبدأ",
  },
  system("track", "نوع التسجيل", PHASES.owner),
  system("applicant", "صاحب الطلب وموافقته", PHASES.owner),
  system("residence", "مكان الإقامة والمكتب", PHASES.owner),
  system("members", "المرافقون ومراجعة الأفراد", PHASES.members),
  system("eligibility", "فحص الأهلية", PHASES.eligibility),
  system("consents", "موافقات أفراد الطلب", PHASES.eligibility),
  system("summary", "ملخص الطلب والمبلغ", PHASES.pay),
  system("payment", "الدفع وإتمام الطلب", PHASES.pay),
];

const post = (p: Omit<PostStepDef, "kind" | "enabled" | "fields">): PostStepDef => ({ kind: "system", enabled: true, fields: [], ...p });

export const DEFAULT_POST_STEPS: PostStepDef[] = [
  post({ id: "confirm", system: "confirm", title: "تأكيد القبول", short: "وتثبيت التسجيل بالدفعة الأولى للمقبولين بالقرعة", emoji: "✍️", question: "هل وصلتك النتيجة بوضوح وفي الوقت المناسب؟" }),
  post({ id: "documents", system: "documents", title: "الصورة الشخصية", short: "بعد الدفعة الأولى: الصورة وحدها", emoji: "🖼️", question: "كيف تقيّم وضوح مواصفات الصورة وسرعة مراجعتها؟" }),
  post({ id: "group", system: "group", title: "الإلحاق بمجموعة", short: "بعقد يوقَّع في المكتب ويلحقكم موظفه", emoji: "🧭", question: "كيف تقيّم وضوح الإلحاق بالمجموعة في المكتب؟" }),
  post({ id: "payment", system: "payment", title: "الدفعة الثانية", short: "بعد اعتماد عقد المجموعة", emoji: "🧾", question: "كيف تقيّم وضوح التكاليف والدفعات والإيصالات؟" }),
  post({ id: "passport", system: "passport", title: "جواز السفر", short: "بعد اكتمال الدفعة الثانية حصراً", emoji: "🛂", question: "كيف تقيّم وضوح شروط الجواز وسرعة مراجعته؟" }),
  post({ id: "medical", system: "medical", title: "الملف الطبي", short: "اللقاحات والوثائق الطبية بعد الانضمام", emoji: "🩺", question: "كيف تقيّم وضوح الوثائق الطبية وتواصل منسق المجموعة؟" }),
  post({ id: "visa", system: "visa", title: "التأشيرة والرحلة", short: "التأشيرة والطيران والسكن", emoji: "🛂", question: "كيف تقيّم وضوح معلومات السفر والتحضير قبل الرحلة؟" }),
];

export function defaultConfig(): RegConfig {
  return {
    stages: structuredClone(DEFAULT_STAGES),
    tracks: [
      { key: "direct", label: "التسجيل على القبول المباشر", description: "", icon: "🧓", enabled: true },
      { key: "lottery", label: "التسجيل الأولي على القرعة", description: "", icon: "🎟️", enabled: true },
    ],
    eligibility: [],
    payments: {
      installments: [
        { key: "i1", label: "الدفعة الأولى", amount: SEASON.fees.firstInstallment, dueLabel: SEASON.installments.windows[0] },
        { key: "i2", label: "الدفعة الثانية", amount: null, dueStep: "payment", dueLabel: SEASON.installments.windows[1] },
      ],
      methods: { shamcash: true, bank: true },
      extrasStep: "payment",
    },
    postSteps: structuredClone(DEFAULT_POST_STEPS),
    messages: {
      postHeader: "التأكيد والصورة الشخصية حتى 27 تشرين الأول — الإلحاق بمجموعة في المكتب حتى 15 كانون الثاني — الدفعة الثانية بعده — ثم جواز السفر فالملف الطبي",
      helpLine: "اتصل على 011 000 1448 أو زر أقرب مكتب تسجيل.",
      savedLater: "عُد متى شئت من «تقديم طلب» لترى من وافق وتتابع.",
    },
  };
}

/** The season pilgrims apply in */
export const ACTIVE_SEASON = SEASON.hijriYear;

export const SEED_SEASONS: RegSeason[] = [
  { year: 1447, label: "موسم 1447هـ", status: "archived", createdAt: new Date(2025, 5, 2).getTime(), createdBy: "نور الأعرج", archivedApplications: 18_940 },
  { year: 1448, label: "موسم 1448هـ", status: "active", createdAt: new Date(2026, 6, 1).getTime(), createdBy: "هبة القدسي", copiedFrom: "1447-v2" },
];

/** Last season as it was published: one payment of the whole cost, no lottery, fewer words */
function season1447(intro: string): RegConfig {
  const c = defaultConfig();
  c.tracks = c.tracks.map((t) => (t.key === "lottery" ? { ...t, enabled: false } : t));
  c.payments.installments = [{ key: "i1", label: "تكلفة الحج كاملة", amount: null, dueLabel: "عند التسجيل" }];
  c.stages = c.stages.map((s) => (s.id === "intro" ? { ...s, title: intro, blocks: [] } : s));
  c.messages.postHeader = "أكمل الخطوات بالترتيب: كل خطوة تفتح التي بعدها.";
  return c;
}

export const SEED_VERSIONS: RegVersion[] = [
  { id: "1447-v1", season: 1447, number: 1, config: season1447("أهلاً {firstName}، لنقدّم طلبك"), publishedAt: new Date(2025, 6, 20, 10).getTime(), publishedBy: "نور الأعرج", effectiveFrom: "2025-07-25T00:00", note: "إعدادات موسم 1447 عند فتح التسجيل" },
  {
    id: "1447-v2",
    season: 1447,
    number: 2,
    config: season1447("أهلاً {firstName}، لنقدّم طلبك معاً خطوة بخطوة"),
    publishedAt: new Date(2025, 7, 3, 9).getTime(),
    publishedBy: "نور الأعرج",
    effectiveFrom: "2025-08-03T09:00",
    note: "تصحيح نص صفحة البداية",
    basedOn: "1447-v1",
  },
  {
    id: "1448-v1",
    season: 1448,
    number: 1,
    config: defaultConfig(),
    publishedAt: new Date(2026, 6, 28, 11).getTime(),
    publishedBy: "هبة القدسي",
    effectiveFrom: "2026-07-01T00:00",
    note: "إعدادات موسم 1448: القبول المباشر ثم القرعة، ودفعتان",
    basedOn: "1447-v2",
  },
];
