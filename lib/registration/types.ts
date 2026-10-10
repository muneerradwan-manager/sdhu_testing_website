/**
 * The Hajj registration as configuration: what the pilgrim goes through from «تقديم طلب حج الآن» until the
 * visa and the flight, described as data the holder of «إدارة التسجيل على الحج» edits and publishes — not
 * as screens written in the code.
 *
 * Two kinds of things live in a configuration:
 * - What is content: a stage's title, its text, its questions and their options, when it shows, what must
 *   hold before moving on, the order of everything, the messages. The engine renders all of it.
 * - What is a trusted operation, referenced and never re-implemented here: a «system» stage (choosing the
 *   track, the applicant and his consent, the residence and its office, the members, eligibility, the
 *   companions' consents, the summary, the payment) and a «system» step after acceptance (confirm, photo,
 *   group, payment, passport, medical, visa). The configuration places them, words them and orders them;
 *   their logic stays in the services (lib/registration/service.ts, lib/rules.ts, lib/assignment.ts…).
 *
 * A configuration is edited as a draft, checked (validate.ts) and published as an immutable version. Every
 * application keeps the version it was started on, so a later edit never changes one already begun.
 */

/** Facts a condition can read. `answer:<key>` reads an application question, `manswer:<key>` a member's */
export type FactKey =
  | "track"
  | "forWhom"
  | "residence"
  | "abroad"
  | "membersCount"
  | "companionsCount"
  | "applicantAge"
  | "applicantGender"
  | "applicantBirthYear"
  | "hasElderly"
  | "member.age"
  | "member.birthYear"
  | "member.gender"
  | "member.relation"
  | "member.isApplicant"
  | "member.hajjBefore"
  | `answer:${string}`
  | `manswer:${string}`;

export type Op = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "nin" | "set" | "unset";

export type Scalar = string | number | boolean;

export type Leaf = { fact: FactKey; op: Op; value?: Scalar | Scalar[] };

export type Condition = { all: Condition[] } | { any: Condition[] } | { not: Condition } | Leaf;

export type FieldType = "text" | "textarea" | "number" | "date" | "select" | "radio" | "checkboxes" | "yesno" | "consent";

export type FieldOption = { id: string; value: string; label: string };

/**
 * One question. Its `key` names the answer and never changes once published: answers are stored by it, and
 * an older version still knows its label and options, so deleting or rewording a question never loses or
 * changes what was answered under the version that asked it.
 */
export type FieldDef = {
  id: string;
  key: string;
  label: string;
  help?: string;
  type: FieldType;
  required: boolean;
  /** Asked once for the application, or once for each member */
  scope: "application" | "member";
  options?: FieldOption[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  /** A regular expression the text must match, and what to say when it does not */
  pattern?: string;
  patternMessage?: string;
  /** Shown only while this holds (application facts, and the member's own for a member question) */
  showIf?: Condition;
};

export type ContentBlock =
  | { id: string; kind: "paragraph"; text: string }
  | { id: string; kind: "notice"; tone: "info" | "warn"; text: string }
  | { id: string; kind: "cards"; items: { id: string; emoji: string; title: string; text: string }[] }
  | { id: string; kind: "checklist"; items: { id: string; text: string }[] };

/** Trusted parts of the application flow: placed and worded by the configuration, run by the services */
export type SystemBlock = "track" | "applicant" | "residence" | "members" | "eligibility" | "consents" | "summary" | "payment";

/** What must hold to leave a stage, and what the pilgrim is told when it does not */
export type Gate = { id: string; when: Condition; message: string };

export type StageDef = {
  id: string;
  /** «content»: a page of text; «form»: a page of questions; «system»: a trusted part, placed here */
  kind: "content" | "form" | "system";
  system?: SystemBlock;
  /** The name the staff know it by in the list */
  name: string;
  title: string;
  hint?: string;
  /** The part of the progress bar it belongs to */
  phase: string;
  blocks: ContentBlock[];
  fields: FieldDef[];
  enabled: boolean;
  /** Open only between these days (YYYY-MM-DD, inclusive), by the platform's clock */
  window?: { from?: string; to?: string };
  showIf?: Condition;
  gates: Gate[];
  /** The continue button's label on a content or form page */
  nextLabel?: string;
};

export type TrackKey = "direct" | "lottery";

/** A registration route. Its logic (who it accepts, when it is paid) is the platform's; this is how it is offered */
export type TrackDef = { key: TrackKey; label: string; description: string; icon: string; enabled: boolean };

/**
 * An eligibility condition the administration adds on top of the platform's own (religion, nationality, ages,
 * mahram, companion of the elderly, previous Hajj, one application, the members' limit). It is enforced
 * again when the application is submitted, never only shown.
 */
export type EligibilityRule = {
  id: string;
  label: string;
  scope: "member" | "application";
  /** Applies only where this holds (every member / every application when absent) */
  when?: Condition;
  /** Must hold where the rule applies */
  require: Condition;
  severity: "fail" | "warn";
  message: string;
  /** The way out offered to the pilgrim when it fails */
  fix: "none" | "remove" | "addPerson" | "lottery";
  enabled: boolean;
};

/**
 * One installment of the Hajj cost, per person. The first is paid with a direct registration, or when the
 * lottery accepts the application; each other one falls due at a post-acceptance step that takes payment.
 * `amount: null` is the rest of the Hajj cost, so the schedule follows the season's cost when it changes.
 */
export type InstallmentDef = { key: string; label: string; amount: number | null; dueStep?: string; dueLabel: string; deadline?: string };

export type PaymentsConfig = {
  installments: InstallmentDef[];
  /** Only the integrations the platform has */
  methods: { shamcash: boolean; bank: boolean };
  /** The step where the sacrifice (الهدي) and any private rooms are paid */
  extrasStep: string;
};

/** The trusted steps after acceptance */
export type PostSystemStep = "confirm" | "documents" | "group" | "payment" | "passport" | "medical" | "visa";

export type PostStepDef = {
  id: string;
  /** «system»: a trusted step; «acknowledge»: read and agree; «form»: questions; «installment»: pays installments due at it */
  kind: "system" | "acknowledge" | "form" | "installment";
  system?: PostSystemStep;
  title: string;
  short: string;
  emoji: string;
  /** Shown above the step's own screen */
  instructions?: string;
  /** What the pilgrim agrees to on an «acknowledge» step */
  ackText?: string;
  /** The rating question asked when the step is done */
  question: string;
  enabled: boolean;
  fields: FieldDef[];
};

export type Messages = {
  /** Above the post-acceptance steps */
  postHeader: string;
  /** Under the application form, with the help line */
  helpLine: string;
  /** When the pilgrim leaves to come back later */
  savedLater: string;
};

export type RegConfig = {
  stages: StageDef[];
  tracks: TrackDef[];
  eligibility: EligibilityRule[];
  payments: PaymentsConfig;
  postSteps: PostStepDef[];
  messages: Messages;
};

/** A published configuration: immutable. It applies to applications started from `effectiveFrom` on */
export type RegVersion = {
  id: string;
  season: number;
  number: number;
  config: RegConfig;
  publishedAt: number;
  publishedBy: string;
  /** "YYYY-MM-DDTHH:MM" on the platform's clock */
  effectiveFrom: string;
  note: string;
  /** The version the draft was taken from */
  basedOn?: string;
};

export type RegSeason = {
  year: number;
  label: string;
  /** «active»: the season pilgrims apply in; «preparing»: being set up; «archived»: kept, read only */
  status: "active" | "preparing" | "archived";
  createdAt: number;
  createdBy: string;
  /** The version its first draft was copied from */
  copiedFrom?: string;
  /** Applications it received, for an archived season whose records live in the archive */
  archivedApplications?: number;
};

export type RegDraft = { config: RegConfig; baseVersion: string | null; updatedAt: number; updatedBy: string };

/**
 * A payment as the payment provider confirmed it (ShamCash, or the bank's statement matched to the slip).
 * An application is accepted only against a confirmed record of the amount the service computed, used once.
 */
export type PaymentRecord = {
  id: string;
  owner: string;
  purpose: "registration" | "first" | "post";
  amount: number;
  method: "shamcash" | "bank" | "office";
  reference: string;
  at: number;
  /** The application or the lines it paid for, once used */
  usedFor?: string;
};

export type RegState = {
  /** Missing: the seasons as seeded */
  seasons?: RegSeason[];
  /** One working draft per season, by year */
  drafts: Record<string, RegDraft>;
  /** Versions published on this platform, after the seeded ones */
  versions: RegVersion[];
  ledger: Record<string, PaymentRecord>;
};

export type AnswerValue = string | number | boolean | string[];
export type Answers = Record<string, AnswerValue>;

/**
 * The season's terms an application was accepted under, frozen when it is submitted: a later change to the
 * season's thresholds, fees or installments never changes what an application already filed owes or means.
 */
export type AppPolicy = {
  rules: import("../rules").SeasonRules;
  acceptedDirectAge: number;
  fees: {
    registrationPerPerson: number;
    hajjCost: number;
    hady: number;
    firstInstallment: number;
    installmentCount: 1 | 2;
    schedule: { key: string; label: string; perPerson: number; dueLabel: string; dueStep?: string }[];
    extrasStep: string;
  };
};
