"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookUser,
  CheckCircle2,
  HeadphonesIcon,
  IdCard,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/portal/shell";
import { PilgrimShell } from "../../_components/pilgrim-shell";
import { DEMO_OTP, OtpInput } from "@/components/portal/bits";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { ConfiguredStage, setAnswer } from "@/components/registration/stage-view";
import { applicationNumberFor, directAccepted, stageAt, trackOf, trackSteps, type Track } from "@/lib/journey";
import { MONTHS, birthOf } from "@/lib/lottery";
import { DEMO_SCENARIOS, ageOf, birthYear, fullName, getPerson, isValidNationalId, lookupPerson, relationLabel, type Person } from "@/lib/registry";
import { evaluate, withOldestAsApplicant, withSimulated, type Member } from "@/lib/rules";
import { SeasonPlanNote } from "@/components/payment/plan-picker";
import { firstPayment, seasonPlan } from "@/lib/installments";
import { ABROAD, SEASON, countryOf, officeArea, officeFor, type Residence } from "@/lib/season";
import { mergeSeason } from "@/lib/season-live";
import { OperationClosed } from "@/components/app/operation-closed";
import { rangeLabel, statusLabel, useAnyOperation, useToday } from "@/lib/operations";
import { useLiveVersion, usePinnedVersion } from "@/lib/registration/client";
import type { FactContext } from "@/lib/registration/conditions";
import { failingGate, fill, formatAnswer, ruleOfCheck, stageErrors, stageVisible, visibleStages, withConfigured, type AnswerError } from "@/lib/registration/engine";
import { run } from "@/lib/registration/run";
import { confirmApplicantConsent, recordPayment, submitApplication } from "@/lib/registration/service";
import type { Answers, AnswerValue, RegConfig, StageDef, SystemBlock } from "@/lib/registration/types";
import { actions, useStore, type Consent } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { BookletPicker, type Book } from "./booklet";
import { EligibilityCheck } from "./eligibility";
import { PayWindow } from "../../application/_components/post/pay-window";
import { Consents, Payment, consentPeople } from "./finalize";
import { PersonAdder, relationWord } from "./person-adder";
import { Choice, DigitsDisplay, NumberPad, PersonChip, Question } from "./ui";

/** The platform's own screens: each belongs to one trusted block of the registration */
type SystemScreen =
  | "intro"
  | "track"
  | "forWhom"
  | "otherId"
  | "residence"
  | "companions"
  | "method"
  | "booklet"
  | "count"
  | "adder"
  | "review"
  | "elderly"
  | "eligibility"
  | "consents"
  | "summary"
  | "payment";

/** A screen is one of the platform's, or a stage the administration wrote (`stage:<id>`) */
type Screen = SystemScreen | `stage:${string}`;

/**
 * Registration asks only what decides eligibility. The passport, the personal photo, vaccinations and
 * health information all come after acceptance; the office is never picked from a list.
 *
 * Which stages there are, in what order, with what words and questions, when each shows and what must hold
 * to leave it is the published registration version's (lib/registration): the page walks it. The screens
 * below are the trusted blocks it places — their logic is the platform's, wherever they stand.
 */
const BLOCK_OF: Partial<Record<SystemScreen, SystemBlock>> = {
  track: "track",
  forWhom: "applicant",
  otherId: "applicant",
  residence: "residence",
  companions: "members",
  method: "members",
  booklet: "members",
  count: "members",
  adder: "members",
  review: "members",
  elderly: "members",
  eligibility: "eligibility",
  consents: "consents",
  summary: "summary",
  payment: "payment",
};

const ENTRY: Record<SystemBlock, SystemScreen> = {
  track: "track",
  applicant: "forWhom",
  residence: "residence",
  members: "companions",
  eligibility: "eligibility",
  consents: "consents",
  summary: "summary",
  payment: "payment",
};

/** Event-handler clock (keeps the React Compiler purity check happy in large handlers) */
const stamp = () => Date.now();

/** Screens that are not resumed as they were (a half-typed number, the payment form): reopen one step earlier */
const RESUME_AT: Partial<Record<Screen, Screen>> = { otherId: "forWhom", adder: "review", count: "method", booklet: "method", payment: "summary" };

const RESIDENCE_FLAGS: Record<string, string> = { "تركيا": "🇹🇷", "مصر": "🇪🇬", "الأردن": "🇯🇴" };

const ORDINALS = ["المرافق الأول", "المرافق الثاني", "المرافق الثالث", "المرافق الرابع", "المرافق الخامس"];

/** Demo family booklets from the operating document — offered to every applicant for easy testing */
const DEMO_BOOKS = [
  { no: "45112233", label: "آل الخطيب" },
  { no: "77001234", label: "آل القاسم" },
  { no: "33300550", label: "آل النجار" },
];

/** Demo people for "add by national ID" — each one shows a case from the eligibility rules */
const DEMO_PEOPLE = [
  { id: "01012340078", label: "خديجة — 78 عاماً، تحتاج مرافقاً" },
  { id: "02033300553", label: "مازن — شاب، يصلح محرماً" },
  { id: "02033300552", label: "ريم — دون 44، تحتاج محرماً" },
  { id: "01012349901", label: "عبد الله — حجّ سابقاً" },
  { id: "01012345416", label: "يوسف — 15 عاماً، دون السن" },
  { id: "01011100208", label: "ياسين — مسجّل في طلب آخر" },
];

/**
 * The application form. `preview`: the staff's preview of a draft configuration — the same engine and the
 * same screens on a demo pilgrim, with nothing saved, sent or paid.
 */
export function ApplyFlow({ preview }: { preview?: { config: RegConfig; personId: string } }) {
  const router = useRouter();
  const toast = useToast();
  const signedIn = useStore((s) => s.sessionId);
  const sessionId = preview?.personId ?? signedIn!;
  const storedApp = useStore((s) => s.applications[s.sessionId ?? ""]);
  const existing = preview ? undefined : storedApp;
  const scale = useStore((s) => s.displayScale);
  const me = getPerson(sessionId)!;
  const overrides = useStore((s) => s.season);
  const today = useToday();
  // Direct acceptance, then the lottery: each registration open only in its own dates
  const hajj = useAnyOperation(["hajj-direct", "hajj-lottery"]);
  const [directOp, lotteryOp] = hajj.states;

  const accounts = useStore((s) => s.accounts);
  // The saved application (autosaved at every step). Approvals inside it change from outside this page
  const storedDraft = useStore((s) => s.drafts[s.sessionId ?? ""]);
  const saved = preview ? undefined : storedDraft;
  // In a preview the approvals are simulated here and kept nowhere
  const [previewConsents, setPreviewConsents] = useState<Record<string, Consent>>({});
  const consents = preview ? previewConsents : (saved?.consents ?? {});
  // Snapshot at opening: the application continues exactly where it was left
  const [draft0] = useState(() => saved);

  // The version this application keeps from its first save to its submission: a later publication never moves it
  const live = useLiveVersion();
  const [versionId] = useState(() => draft0?.configVersion ?? live.id);
  const pinned = usePinnedVersion(versionId);
  const config = preview?.config ?? pinned.config;
  // The season's thresholds and fees as they stand, with the installments of this application's version
  const season = useMemo(() => mergeSeason(overrides, config.payments), [overrides, config.payments]);

  const [history, setHistory] = useState<Screen[]>(() => (draft0 ? (draft0.history as Screen[]).map((s) => RESUME_AT[s] ?? s) : ["intro"]));
  // Which registration this application is for — direct acceptance and the lottery are separate applications
  const [track, setTrack] = useState<Track>(draft0?.track ?? "direct");
  const [openedAt] = useState(() => Date.now());
  const [members, setMembers] = useState<Member[]>(draft0?.members ?? []);
  const [answers, setAnswers] = useState<Answers>(draft0?.answers ?? {});
  const [memberAnswers, setMemberAnswers] = useState<Record<string, Answers>>(draft0?.memberAnswers ?? {});
  const [target, setTarget] = useState(1);
  const [adderReturn, setAdderReturn] = useState<"loop" | "booklet" | "review" | "eligibility">("loop");
  // The demo's simulated conditions: a failed one the tester treats as met, so the trial goes on
  const [simulated, setSimulated] = useState<string[]>([]);
  // The first installment's window, opened by simulation before it is paid with the application
  const [firstOpen, setFirstOpen] = useState(false);
  const [book, setBook] = useState<Book | null>((draft0?.book as Book | null) ?? null);
  // Where the applicant lives decides the office: the registry governorate inside Syria, or the country office abroad
  const [residence, setResidence] = useState<Residence>((draft0?.residence === "تركيا" ? "تركيا — إسطنبول" : (draft0?.residence as Residence)) ?? "سوريا");
  const [other, setOther] = useState({ id: "", stage: "id" as "id" | "loading" | "confirm" | "otp", person: null as Person | null, otp: "", error: "" });
  // How many times the eligibility check has run — only the first run reveals row by row
  const [checks, setChecks] = useState(0);
  // Furthest phase reached — completed phases can be reopened from the progress bar
  const [maxPhase, setMaxPhase] = useState(draft0?.maxPhase ?? 0);
  // What keeps the pilgrim on a stage: unanswered questions, or a condition to move on that does not hold
  const [blocked, setBlocked] = useState<{ stage: string; errors: AnswerError[]; gate?: string } | null>(null);

  const applicant = members.find((m) => m.relation === "self")?.person ?? null;
  const companions = members.filter((m) => m.relation !== "self");

  /** What the configuration's conditions read now; `p` for what is being set in the same click */
  const factsWith = (p: Partial<FactContext> = {}): FactContext => {
    const list = p.members ?? members;
    const self = list.find((m) => m.relation === "self");
    return {
      track,
      forWhom: self ? (self.person.id === sessionId ? "me" : "other") : undefined,
      residence,
      members: list,
      answers,
      memberAnswers,
      elderlyMaxBirthYear: season.rules.elderlyNeedsCompanionMaxBirthYear,
      ...p,
    };
  };
  const facts = factsWith();

  // Direct acceptance: the accepted age is known before registration, so it is checked now — before anything is paid.
  // The administration's own rules are read with the platform's, exactly as the submission reads them.
  // Whoever another application of the season already holds, as it stands now (not only as the registry recorded it)
  const allApps = useStore((s) => s.applications);
  const checked = useMemo(
    () =>
      members.map((m) => {
        const other = Object.entries(allApps).find(([owner, a]) => owner !== sessionId && a.members.some((x) => x.person.id === m.person.id));
        return other && !m.person.otherApplication ? { ...m, person: { ...m.person, otherApplication: other[1].number } } : m;
      }),
    [members, allApps, sessionId],
  );
  const result = useMemo(
    () => withSimulated(withConfigured(evaluate(checked, season.rules, track === "direct" ? { minAge: season.acceptedDirectAge } : undefined), config.eligibility, { track, members, residence: countryOf(residence), answers, memberAnswers, elderlyMaxBirthYear: season.rules.elderlyNeedsCompanionMaxBirthYear }), simulated),
    [checked, members, season.rules, track, season.acceptedDirectAge, config.eligibility, residence, answers, memberAnswers, simulated],
  );
  // A direct-acceptance application that ended without a place: the pilgrim may now register for the lottery
  const previousDirect =
    existing && trackOf(existing) === "direct" && !directAccepted(existing) && stageAt(trackSteps("direct", false), (openedAt - existing.submittedAt) / 1000).stage.key === "notAccepted"
      ? existing
      : null;
  const number = applicant ? applicationNumberFor(track === "lottery" && previousDirect ? `${sessionId}-L` : sessionId) : "";
  const receipt = `1448-R-${number.padStart(6, "0")}`;
  const scenario = DEMO_SCENARIOS.find((s) => s.id === (applicant?.id ?? sessionId));

  const tokens = {
    firstName: me.firstName,
    applicantName: applicant?.firstName ?? me.firstName,
    fee: season.fees.registrationPerPerson,
    directAge: season.acceptedDirectAge,
    maxCompanions: season.rules.maxCompanions,
    maxCompanionsFamily: season.rules.maxCompanionsFamily,
    members: members.length,
  };

  // ── The configuration's stages ──
  const systemStage = (b: SystemBlock) => config.stages.find((st) => st.kind === "system" && st.system === b);
  const stageOfScreen = (scr: Screen): StageDef | undefined => {
    if (scr.startsWith("stage:")) return config.stages.find((st) => st.id === scr.slice(6));
    const b = BLOCK_OF[scr as SystemScreen];
    return b ? systemStage(b) : undefined;
  };
  /** Where a stage starts: its own page, or the first screen of a platform block (the members' list when editing them) */
  const entryOf = (st: StageDef, editing = false): Screen => {
    if (st.kind !== "system") return `stage:${st.id}`;
    if (st.system === "members" && editing && companions.length) return "review";
    return ENTRY[st.system!];
  };
  /** The next stage that shows for this application: consents only when someone has to approve */
  const nextAfter = (stageId: string, p: Partial<FactContext> = {}) => {
    const ctx = factsWith(p);
    const at = config.stages.findIndex((st) => st.id === stageId);
    return config.stages.slice(at + 1).find((st) => stageVisible(st, ctx, today) && !(st.kind === "system" && st.system === "consents" && !consentPeople(ctx.members, sessionId).length)) ?? null;
  };
  const firstStage = visibleStages(config, facts, today)[0];
  // «intro» opens the application: the move-to-lottery screen after a direct application without a place, else the first stage
  const screen: Screen = (() => {
    const s = history[history.length - 1];
    return s === "intro" && !previousDirect && firstStage ? entryOf(firstStage) : s;
  })();
  const currentStage = stageOfScreen(screen);
  /** A system stage's words when the administration wrote its own, else the platform's (which follow the case) */
  const said = (b: SystemBlock) => {
    const st = systemStage(b);
    return { title: st?.title ? fill(st.title, tokens) : undefined, hint: st?.hint ? fill(st.hint, tokens) : undefined };
  };

  const go = (s: Screen) => {
    setBlocked(null);
    setHistory((h) => [...h, s]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    setBlocked(null);
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  };
  const replace = (s: Screen) => setHistory((h) => [...h.slice(0, -1), s]);

  /**
   * Leaves a stage for the next one that shows: its conditions to move on must hold first. `p`: what this
   * click sets (the track, the applicant…), so the next stage is chosen on it.
   */
  const advance = (stageId: string | undefined, p: Partial<FactContext> = {}, how: "push" | "replace" = "push") => {
    const from = stageId ? config.stages.find((st) => st.id === stageId) : undefined;
    if (from) {
      const g = failingGate(from, factsWith(p));
      if (g) {
        setBlocked({ stage: from.id, errors: [], gate: g.message });
        toast({ title: "لا يمكن المتابعة بعد", body: g.message, icon: "⚠️", tone: "gold" });
        return;
      }
    }
    const nxt = from ? nextAfter(from.id, p) : firstStage;
    if (!nxt) return;
    if (nxt.kind === "system" && nxt.system === "consents") sendConsents(p.members ?? members);
    const to = entryOf(nxt);
    if (how === "replace") replace(to);
    else go(to);
  };
  /** From a platform block; one switched off in this version (a sub-screen reached from elsewhere) continues from the block before it */
  const advanceFrom = (b: SystemBlock, p: Partial<FactContext> = {}, how: "push" | "replace" = "push") => {
    const order = Object.keys(ENTRY) as SystemBlock[];
    const present = order.slice(0, order.indexOf(b) + 1).reverse().find((x) => systemStage(x));
    advance(present ? systemStage(present)!.id : undefined, p, how);
  };

  const setSelf = (p: Person) => setMembers([{ person: p, relation: "self", relationVerified: true, needs: [] }]);
  // The oldest member is always the applicant: adding an older relative moves the application to their name
  const addMember = (m: Member) => {
    if (members.some((x) => x.person.id === m.person.id)) return;
    const { members: next, moved } = withOldestAsApplicant([...members, m]);
    setMembers(next);
    if (moved) {
      toast({
        title: `أصبح الطلب باسم ${fullName(moved.person)}`,
        body: `صاحب الطلب هو الأكبر سناً في العائلة (${ageOf(moved.person)} عاماً)، وأعدنا صلات القرابة بالنسبة إليه. تصله رسالة موافقة على هاتفه.`,
        icon: "👴",
        tone: "gold",
      });
    }
  };
  const removeMember = (id: string) =>
    setMembers((ms) => ms.filter((m) => m.person.id !== id).map((m) => (m.companionId === id ? { ...m, companionId: undefined } : m)));
  const patchMember = (id: string, patch: Partial<Member>) => setMembers((ms) => ms.map((m) => (m.person.id === id ? { ...m, ...patch } : m)));

  const elderly = members.filter((m) => birthYear(m.person) <= season.rules.elderlyNeedsCompanionMaxBirthYear);
  const unresolvedElderly = elderly.find((e) => !e.companionId || !members.some((m) => m.person.id === e.companionId));
  const area = officeArea(applicant?.governorate ?? me.governorate, residence);

  const afterMembers = (list: Member[] = members) =>
    list.some((m) => birthYear(m.person) <= season.rules.elderlyNeedsCompanionMaxBirthYear) ? go("elderly") : advanceFrom("members", { members: list });

  // Autosave: every change is kept on the account, so the applicant can leave and continue later
  const done = !!existing && !previousDirect;
  useEffect(() => {
    if (preview || done || (history[history.length - 1] === "intro" && members.length === 0)) return;
    actions.saveDraft(sessionId, { history, track, members, book: book ? { ...book } : null, residence, maxPhase, configVersion: versionId, answers, memberAnswers }, Date.now());
  }, [preview, done, sessionId, history, track, members, book, residence, maxPhase, versionId, answers, memberAnswers]);

  // Coming back to a saved application
  useEffect(() => {
    if (!draft0 || done) return;
    const waiting = Object.values(draft0.consents).filter((c) => c.status === "pending").length;
    toast({
      title: "تابعنا طلبك من حيث توقفت",
      body: waiting ? `ما زال ${waiting} ${waiting === 1 ? "فرد" : "أفراد"} لم يوافقوا بعد.` : `آخر حفظ: ${new Intl.DateTimeFormat("ar-SY-u-nu-latn", { weekday: "long", hour: "2-digit", minute: "2-digit" }).format(draft0.updatedAt)}`,
      icon: "💾",
      tone: "info",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Send an approval request to every adult who has none yet (in the app if he has an account, else by text message) */
  const sendConsents = (list: Member[] = members) => {
    const at = stamp();
    const people = consentPeople(list, sessionId);
    if (preview) {
      setPreviewConsents((c) => Object.fromEntries(people.map((m) => [m.person.id, c[m.person.id] ?? { status: "pending" as const, sentAt: at, via: "sms" as const }])));
      return;
    }
    // A save first, so the approvals have a draft to live in even if nothing else changed
    actions.saveDraft(sessionId, { history, track, members: list, book: book ? { ...book } : null, residence, maxPhase, configVersion: versionId, answers, memberAnswers }, at);
    for (const m of people) {
      if (consents[m.person.id]) continue;
      actions.setConsent(sessionId, m.person.id, { status: "pending", sentAt: at, via: accounts[m.person.id] ? "app" : "sms" });
    }
    // Requests to people who are no longer in the application are withdrawn
    for (const id of Object.keys(consents)) if (!people.some((m) => m.person.id === id)) actions.setConsent(sessionId, id, null);
    if (people.some((m) => !consents[m.person.id])) {
      toast({ title: "أُرسلت طلبات الموافقة", body: "يوافق كل فرد من هاتفه متى تيسّر له، وطلبك محفوظ حتى ذلك الحين.", icon: "📨", tone: "info" });
    }
  };

  /** Start over: the saved application is discarded */
  const discard = () => {
    actions.clearDraft(sessionId);
    setHistory(["intro"]);
    setMembers([]);
    setAnswers({});
    setMemberAnswers({});
    setTrack("direct");
    setBook(null);
    setResidence("سوريا");
    setMaxPhase(0);
    toast({ title: "بدأنا طلباً جديداً", body: "حُذف الطلب المحفوظ.", icon: "🗑️" });
  };

  /**
   * Not accepted directly and the lottery is open: the same family becomes a lottery application in one
   * tap — members, companions, consents and office carry over; only the summary and the fee remain.
   */
  const moveToLottery = () => {
    if (!previousDirect) return;
    const carried = withOldestAsApplicant(previousDirect.members).members;
    setTrack("lottery");
    setMembers(carried);
    setResidence((ABROAD as readonly string[]).includes(previousDirect.governorate) ? (previousDirect.governorate as Residence) : "سوريا");
    setMaxPhase(3);
    const ok = evaluate(carried, season.rules).eligible;
    go(ok ? "summary" : "eligibility");
    actions.logEvent({
      actor: `${me.firstName} ${me.lastName}`,
      role: "حاج",
      action: "نقل أفراد طلب القبول المباشر إلى التسجيل الأولي على القرعة",
      target: `طلب ${previousDirect.number}`,
      detail: `${carried.length} أفراد — دون إعادة الخطوات`,
    });
  };

  const fee = members.length * season.fees.registrationPerPerson;
  // The administration sets how the Hajj cost is paid this season (1448: two installments)
  const plan = seasonPlan(season.fees);
  // Direct acceptance: fee + first installment now. Lottery: the fee only — the first installment is due at the draw result
  const first = track === "direct" ? firstPayment(plan, members.length, season.fees) : 0;
  const firstLabel = season.fees.schedule[0]?.label ?? (plan === 1 ? "تكلفة الحج كاملة" : "الدفعة الأولى من تكلفة الحج");
  // The first installment of a direct application that was not accepted stays as a credit for the lottery
  const credit = track === "lottery" && previousDirect?.firstPaid ? { ...previousDirect.firstPaid, creditFrom: previousDirect.number } : undefined;
  const payLines = [
    { label: `رسم التسجيل — ${members.length} × ${formatUSD(season.fees.registrationPerPerson)}`, amount: fee },
    ...(first ? [{ label: `${plan === 1 ? "تكلفة الحج كاملة" : "الدفعة الأولى من تكلفة الحج"} — ${members.length} × ${formatUSD(first / Math.max(1, members.length))}`, amount: first }] : []),
  ];
  const methods = (["shamcash", "bank"] as const).filter((m) => config.payments.methods[m]);

  /** The payment provider confirmed the payment: recorded by the service, which the submission then requires */
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const confirmPayment = (method: "shamcash" | "bank") => {
    if (preview) return null;
    const r = run((s) => recordPayment(s, { owner: sessionId, purpose: "registration", amount: fee + first, method, reference: receipt }, stamp()));
    if (!r.ok) return r.errors[0].message;
    setPaymentId(r.value.id);
    return null;
  };

  const submit = (method: "shamcash" | "bank") => {
    if (preview) {
      toast({ title: "معاينة — لم يُقدَّم شيء", body: "في التسجيل الفعلي يُقدَّم الطلب هنا ويُصدَر الإيصال.", icon: "👁️", tone: "info" });
      return;
    }
    const r = run((s) => submitApplication(s, { owner: sessionId, track, members, residence, book: book?.no ?? null, answers, memberAnswers, paymentId: paymentId ?? "", method, simulated }, stamp()));
    if (!r.ok) {
      const e = r.errors[0];
      toast({ title: "لم يُقدَّم الطلب", body: e.message, icon: "⚠️", tone: "gold" });
      const st = e.stageId ? config.stages.find((x) => x.id === e.stageId) : undefined;
      if (st) go(entryOf(st, true));
      return;
    }
    const app = r.value;
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.35 }, colors: ["#D9C89E", "#00594F", "#289E92", "#AD9E6E", "#672146"] });
    toast({
      title: `تم استلام طلبك رقم ${app.number}`,
      body: `${track === "lottery" ? "في التسجيل الأولي على القرعة" : "في التسجيل على القبول المباشر"} لـ ${members.length} أفراد، وتم تسديد ${first ? "رسم التسجيل والدفعة الأولى" : "رسم التسجيل"} (الإيصال ${app.receipt}).`,
      icon: "📨",
      tone: "success",
    });
    router.push("/portal/application");
  };

  if (!preview && !hajj.open && !(existing && !previousDirect)) {
    return (
      <PilgrimShell title="التسجيل على الحج">
        <OperationClosed state={hajj.states.find((o) => o.status === "upcoming") ?? lotteryOp} text="التسجيل على الحج لا يضعك في أي مجموعة: الانضمام إلى مجموعة يأتي لاحقاً بعقد بينك وبين المجموعة." />
      </PilgrimShell>
    );
  }

  if (existing && !previousDirect) {
    return (
      <PilgrimShell title="لديك طلب مُقدَّم بالفعل">
        <Card className="text-center">
          <CheckCircle2 className="mx-auto size-16 text-green-light" />
          <p className="mt-4 font-display text-2xl font-bold text-green-dark">طلب رقم {existing.number} — {existing.members.length} أفراد</p>
          <p className="mt-1 font-bold text-gold-dark">{trackOf(existing) === "lottery" ? "في التسجيل الأولي على القرعة" : "في التسجيل على القبول المباشر"}</p>
          <p className="mt-2 text-ink-soft">
            طلب واحد فقط لكل شخص في كل تسجيل. إن لم يُقبل طلب القبول المباشر، يمكنك التسجيل الأولي على القرعة بطلب جديد ({SEASON.windows.lottery.hijri}).
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/portal/application" size="lg">
              متابعة الطلب <ArrowLeft className="size-5" />
            </ButtonLink>
            <Button
              size="lg"
              variant="outline"
              className="text-maroon"
              onClick={() => {
                actions.deleteApplication(sessionId);
                toast({ title: "تم سحب الطلب", body: "يمكنك تقديم طلب جديد للتجربة.", icon: "🗑️" });
              }}
            >
              <Trash2 className="size-5" /> سحب الطلب والبدء من جديد
            </Button>
          </div>
        </Card>
      </PilgrimShell>
    );
  }

  // The progress bar: the parts the version's stages are grouped in, in their order
  const phases = [...new Set(config.stages.filter((st) => st.enabled).map((st) => st.phase))];
  const phaseIdx = Math.max(0, phases.indexOf(currentStage?.phase ?? phases[0]));
  const summaryPhase = phases.indexOf(systemStage("summary")?.phase ?? "");
  if (phaseIdx > maxPhase) setMaxPhase(phaseIdx); // adjusting state during render, per React docs
  const phaseEntry = (i: number): Screen | null => {
    const inPhase = visibleStages(config, facts, today).filter((st) => st.phase === phases[i]);
    const st = inPhase.find((x) => x.kind !== "content") ?? inPhase[0];
    return st ? entryOf(st, true) : null;
  };
  const canOpenPhase = (i: number) => i !== phaseIdx && i <= maxPhase && !!applicant && (summaryPhase < 0 || i < summaryPhase || result.eligible) && !!phaseEntry(i);

  // The administration's questions answered so far, for the summary
  const answered = visibleStages(config, facts, today).flatMap((st) =>
    st.fields.flatMap((f) =>
      f.scope === "application"
        ? answers[f.key] !== undefined
          ? [{ stage: st, label: f.label, value: formatAnswer(f, answers[f.key]) }]
          : []
        : members.flatMap((m) => (memberAnswers[m.person.id]?.[f.key] !== undefined ? [{ stage: st, label: `${f.label} — ${m.person.firstName}`, value: formatAnswer(f, memberAnswers[m.person.id][f.key]) }] : [])),
    ),
  );

  const onAnswer = (key: string, v: AnswerValue | undefined) => setAnswers((a) => setAnswer(a, key, v));
  const onMemberAnswer = (id: string, key: string, v: AnswerValue | undefined) => setMemberAnswers((ma) => ({ ...ma, [id]: setAnswer(ma[id] ?? {}, key, v) }));

  const aside = (
        <>
          <div className="@container order-last rounded-3xl border border-gold/30 bg-white p-5 text-ink sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-lg font-bold text-green-dark">ملخص الطلب</p>
              {saved && (
                <span className="flex items-center gap-1 text-xs font-semibold text-green" title="يُحفظ طلبك تلقائياً في حسابك">
                  <Save className="size-3.5" /> محفوظ
                </span>
              )}
            </div>
            {members.length === 0 ? (
              <p className="mt-2 text-sm text-hint">سيظهر هنا أفراد طلبك.</p>
            ) : (
              <ul className="mt-3 grid gap-2 @md:grid-cols-2 @3xl:grid-cols-3">
                <AnimatePresence initial={false}>
                  {members.map((m) => (
                    <motion.li key={m.person.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex items-center gap-2 rounded-2xl bg-sand p-2.5">
                      <span className={cn("grid size-9 place-items-center rounded-xl font-bold", m.person.gender === "F" ? "bg-maroon/10 text-maroon" : "bg-green-dark/10 text-green-dark")}>
                        {m.person.firstName[0]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{m.person.firstName} {m.person.lastName}</span>
                        <span className="text-xs text-hint">{relationLabel(m.relation, m.person.gender)} — {ageOf(m.person)} عاماً</span>
                      </span>
                      {!m.relationVerified && <span title="صلة غير مؤكدة" className="size-2 rounded-full bg-gold-dark" />}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
            {saved && (
              <p className="mt-3 rounded-xl bg-green-light/10 p-2.5 text-xs leading-5 text-green-dark">
                يُحفظ طلبك تلقائياً في حسابك. يمكنك الخروج والعودة لاحقاً لتتابع من الخطوة نفسها.
                <button type="button" onClick={discard} className="mt-1 block font-bold text-maroon underline">
                  بدء طلب جديد بدلاً منه
                </button>
              </p>
            )}
            {members.length > 0 && (
              <p className="mt-3 border-t border-gold-light pt-3 text-sm">
                رسم التسجيل: <span className="font-bold text-green-dark">{formatUSD(fee)}</span>
                {first > 0 && (
                  <span className="mt-1 block">
                    {firstLabel}: <span className="font-bold text-green-dark">{formatUSD(first)}</span>
                  </span>
                )}
              </p>
            )}
          </div>
          {!preview && (
            <div className="h-full rounded-3xl border border-gold/30 bg-white p-5">
              <p className="font-bold">حجم الخط</p>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => actions.setDisplayScale(scale - 0.1)} aria-label="تصغير">
                  <Minus className="size-4" />
                </Button>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand">
                  <motion.div className="h-full bg-green-dark" animate={{ width: `${((scale - 0.9) / 0.5) * 100}%` }} />
                </div>
                <Button size="sm" variant="outline" onClick={() => actions.setDisplayScale(scale + 0.1)} aria-label="تكبير">
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          )}
          <div className="flex h-full items-start gap-3 rounded-3xl bg-green-dark p-5 text-white">
            <HeadphonesIcon className="mt-0.5 size-6 shrink-0 text-gold" />
            <div className="text-sm leading-7">
              <p className="font-bold">تحتاج مساعدة؟</p>
              {config.messages.helpLine}
            </div>
          </div>
        </>
  );

  const body = (
      <div>
        {/* Phase progress — completed phases are buttons, so any answer can be revisited and edited */}
        <div className="mb-4 rounded-3xl border border-gold/30 bg-white p-2">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${phases.length}, minmax(0, 1fr))` }}>
            {phases.map((label, i) => {
              const open = canOpenPhase(i);
              const finished = i < phaseIdx || (i <= maxPhase && i !== phaseIdx);
              return (
                <button
                  key={label}
                  type="button"
                  disabled={!open}
                  onClick={() => {
                    const to = phaseEntry(i);
                    if (to) go(to);
                  }}
                  aria-current={i === phaseIdx ? "step" : undefined}
                  title={open ? `تعديل: ${label}` : undefined}
                  className={cn("group rounded-2xl p-1.5 text-center transition", open ? "hover:bg-sand" : "cursor-default")}
                >
                  <div className="h-2 overflow-hidden rounded-full bg-sand">
                    <motion.div className="h-full bg-gold-dark" initial={false} animate={{ width: finished ? "100%" : i === phaseIdx ? "50%" : "0%" }} transition={{ duration: 0.6 }} />
                  </div>
                  <p className={cn("mt-1.5 flex items-center justify-center gap-1 text-[11px] font-bold leading-tight sm:text-xs", i === phaseIdx ? "text-green-dark" : i <= maxPhase ? "text-ink-soft" : "text-hint")}>
                    {finished && <CheckCircle2 className="hidden size-3.5 shrink-0 text-gold-dark sm:block" />}
                    {label}
                  </p>
                </button>
              );
            })}
          </div>
          {maxPhase > 0 && <p className="mt-1 text-center text-[11px] text-hint">اضغط على أي مرحلة منجزة لتعديلها</p>}
        </div>

        {blocked?.gate && currentStage?.kind === "system" && blocked.stage === currentStage.id && (
          <p role="alert" className="mb-4 flex items-start gap-3 rounded-3xl bg-white p-4 font-bold leading-7 text-maroon ring-2 ring-maroon/30">
            <AlertTriangle className="mt-1 size-5 shrink-0" /> {blocked.gate}
          </p>
        )}

        <Card className="min-h-[34rem] overflow-hidden text-ink">
          <AnimatePresence mode="wait">
            <motion.div key={screen + (screen === "adder" ? companions.length : "")} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
              {screen.startsWith("stage:") &&
                currentStage &&
                (() => {
                  const st = currentStage;
                  const isFirst = history.length <= 1 || st.id === firstStage?.id;
                  return (
                    <ConfiguredStage
                      stage={st}
                      tokens={tokens}
                      ctx={facts}
                      errors={blocked?.stage === st.id ? blocked.errors : []}
                      gateMessage={blocked?.stage === st.id ? blocked.gate : undefined}
                      onAnswer={onAnswer}
                      onMemberAnswer={onMemberAnswer}
                      onBack={isFirst ? undefined : back}
                      onNext={() => {
                        const errors = stageErrors(st, facts);
                        if (errors.length) {
                          setBlocked({ stage: st.id, errors });
                          return;
                        }
                        advance(st.id);
                      }}
                    />
                  );
                })()}

              {screen === "intro" && previousDirect && (
                <Question
                  title={`لم يُقبل طلبك ${previousDirect.number} في القبول المباشر`}
                  hint={`الأعمار المقبولة ${SEASON.acceptedDirectAge} عاماً فأكثر، وعمر صاحب الطلب لم يبلغها. باب التسجيل الأولي على القرعة مفتوح (${SEASON.windows.lottery.hijri})، ولا حاجة لإعادة الخطوات: ننقل الأفراد أنفسهم إلى طلب القرعة، وتراجع الملخص وتدفع رسم التسجيل فقط.`}
                  speak="لم يُقبل طلبك في القبول المباشر. يمكنك التسجيل الأولي على القرعة بالأفراد أنفسهم دون إعادة الخطوات."
                >
                  <div className="rounded-3xl border-2 border-gold/50 bg-white p-5">
                    <p className="font-bold text-green-dark">أفراد الطلب — ينتقلون كما هم</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {previousDirect.members.map((m) => (
                        <li key={m.person.id} className="rounded-full bg-sand px-3 py-1.5 text-sm font-semibold">
                          {m.person.firstName} <span className="text-hint">— {m.relation === "self" ? "صاحب الطلب" : relationWord(m.relation, m.person.gender)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-sm text-ink-soft">{previousDirect.office} — موافقات المرافقين محفوظة من الطلب السابق.</p>
                  </div>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button size="xl" onClick={moveToLottery}>
                      🎟️ سجّلني على القرعة بالأفراد أنفسهم <ArrowLeft className="size-6" />
                    </Button>
                    <Button
                      size="xl"
                      variant="outline"
                      onClick={() => {
                        setTrack("lottery");
                        setMembers(previousDirect.members);
                        go("review");
                      }}
                    >
                      أريد تعديل الأفراد أولاً
                    </Button>
                  </div>
                </Question>
              )}

              {screen === "track" &&
                (() => {
                  const direct = config.tracks.find((t) => t.key === "direct");
                  const lottery = config.tracks.find((t) => t.key === "lottery");
                  return (
                    <Question
                      title={said("track").title ?? "على أي تسجيل تقدّم طلبك؟"}
                      hint={said("track").hint ?? `تسجيلان منفصلان، لكل منهما طلبه وموعده. القبول المباشر لمن بلغ صاحب طلبه ${season.acceptedDirectAge} عاماً فأكثر، ونتحقق من ذلك قبل الدفع؛ ومن كان أصغر يسجّل تسجيلاً أولياً على القرعة.`}
                      speak="على أي تسجيل تقدّم طلبك؟ التسجيل على القبول المباشر، أو التسجيل الأولي على القرعة."
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        {direct?.enabled && (
                          <Choice
                            index={0}
                            icon={direct.icon}
                            label={direct.label}
                            description={
                              previousDirect
                                ? `قدّمت فيه الطلب رقم ${previousDirect.number} ولم يُقبل (الأعمار المقبولة ${SEASON.acceptedDirectAge} عاماً فأكثر)`
                                : !directOp.open && !preview
                                  ? `غير متاح: ${statusLabel(directOp)}.`
                                  : direct.description
                                    ? fill(direct.description, tokens)
                                    : `${rangeLabel(directOp.start, directOp.end)} — لمن بلغ صاحب طلبه ${season.acceptedDirectAge} عاماً فأكثر (حددته الإدارة لهذا الموسم)، ونتحقق من العمر قبل أي دفع. ${Math.round(SEASON.directShare * 100)}% من الحصة (${SEASON.directSeats.toLocaleString("en")} مقعداً).`
                            }
                            selected={track === "direct" && !previousDirect}
                            disabled={!!previousDirect || (!directOp.open && !preview)}
                            onClick={() => {
                              setTrack("direct");
                              advanceFrom("track", { track: "direct" });
                            }}
                          />
                        )}
                        {lottery?.enabled && (
                          <Choice
                            index={1}
                            icon={lottery.icon}
                            label={lottery.label}
                            disabled={!lotteryOp.open && !preview}
                            description={
                              !lotteryOp.open && !preview
                                ? `غير متاح: ${statusLabel(lotteryOp)}.`
                                : lottery.description
                                  ? fill(lottery.description, tokens)
                                  : `${rangeLabel(lotteryOp.start, lotteryOp.end)} — لكل الأعمار المؤهلة، برسم التسجيل فقط. قرعة علنية ببث مباشر يوم ${SEASON.windows.lottery.draw} على ${Math.round(SEASON.lotteryShare * 100)}% من الحصة (${SEASON.lotterySeats.toLocaleString("en")} مقعداً): تُسحب سنوات ميلاد، ولبعضها أشهر، ويُقبل الطلب إن وافقها ميلاد صاحبه.`
                            }
                            selected={track === "lottery"}
                            onClick={() => {
                              if (previousDirect) return moveToLottery();
                              setTrack("lottery");
                              advanceFrom("track", { track: "lottery" });
                            }}
                          />
                        )}
                      </div>
                      <p className="mt-5 rounded-2xl bg-gold/20 p-4 text-sm leading-7 text-ink-soft">
                        {previousDirect
                          ? "ننقل أفراد طلبك السابق إلى طلب التسجيل الأولي على القرعة مباشرة، فتراجع الملخص وتدفع رسم التسجيل فقط."
                          : "كل تسجيل يُفتح في موعده فقط. في العرض التجريبي غيّر «تاريخ المحاكاة» أسفل الشاشة لتجرب الآخر."}
                      </p>
                      {history.length > 1 && (
                        <Button variant="ghost" size="lg" className="mt-6" onClick={back}>
                          <ArrowRight className="size-5" /> رجوع
                        </Button>
                      )}
                    </Question>
                  );
                })()}

              {screen === "forWhom" && (
                <Question title={said("applicant").title ?? "لمن هذا الطلب؟"} hint={said("applicant").hint} speak="لمن هذا الطلب؟ لي، أو لشخص آخر." step="السؤال 1">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Choice
                      index={0}
                      icon="🙋"
                      label="لي أنا"
                      description={`${fullName(me)} — ${ageOf(me)} عاماً`}
                      onClick={() => {
                        const self: Member[] = applicant?.id === me.id ? members : [{ person: me, relation: "self", relationVerified: true, needs: [] }];
                        if (applicant?.id !== me.id) setSelf(me);
                        advanceFrom("applicant", { members: self });
                      }}
                    />
                    <Choice
                      index={1}
                      icon="👨‍👩‍👦"
                      label="لشخص آخر"
                      description="مثل والدك أو والدتك. يصل صاحب الطلب رمز موافقة على هاتفه."
                      onClick={() => {
                        setOther({ id: "", stage: "id", person: null, otp: "", error: "" });
                        go("otherId");
                      }}
                    />
                  </div>
                </Question>
              )}

              {screen === "otherId" && (
                <div>
                  {other.stage === "id" && (
                    <Question title="ما الرقم الوطني لصاحب الطلب؟" hint="الشخص الذي سيكون الطلب باسمه." speak="ما الرقم الوطني لصاحب الطلب؟">
                      <DigitsDisplay value={other.id} length={11} groups={[3, 4, 4]} />
                      <div className="mt-6">
                        <NumberPad value={other.id} onChange={(v) => setOther((o) => ({ ...o, id: v, error: "" }))} maxLength={11} />
                      </div>
                      <p className="mt-4 text-center text-sm">
                        <button className="rounded-full border border-dashed border-gold-dark bg-gold/15 px-3 py-1.5 font-semibold text-maroon" onClick={() => setOther((o) => ({ ...o, id: "01012340078" }))}>
                          تجريبي: خديجة الخطيب (78 عاماً)
                        </button>
                      </p>
                      {other.error && <p className="mt-4 rounded-2xl bg-maroon/8 p-4 text-center font-bold text-maroon">{other.error}</p>}
                      <div className="mt-8 flex justify-between gap-3">
                        <Button variant="ghost" size="lg" onClick={back}>
                          <ArrowRight className="size-5" /> رجوع
                        </Button>
                        <Button
                          size="lg"
                          disabled={other.id.length !== 11}
                          onClick={async () => {
                            if (!isValidNationalId(other.id) || other.id === sessionId) return setOther((o) => ({ ...o, error: "أدخل رقماً وطنياً صحيحاً لشخص آخر" }));
                            setOther((o) => ({ ...o, stage: "loading" }));
                            const p = await lookupPerson(other.id);
                            setOther((o) => ({ ...o, person: p, stage: "confirm" }));
                          }}
                        >
                          ابحث <ArrowLeft className="size-5" />
                        </Button>
                      </div>
                    </Question>
                  )}
                  {other.stage === "loading" && (
                    <div className="grid min-h-80 place-items-center">
                      <Loader2 className="size-14 animate-spin text-green-dark" />
                    </div>
                  )}
                  {other.stage === "confirm" && other.person && (
                    <Question title="هل هذا صاحب الطلب؟">
                      <div className="rounded-3xl bg-sand p-5">
                        <PersonChip name={fullName(other.person)} gender={other.person.gender} sub={`مواليد ${other.person.birthDate.slice(0, 4)} — ${other.person.governorate}`} />
                      </div>
                      <div className="mt-6 grid gap-3 md:grid-cols-2">
                        <Choice
                          index={0}
                          icon="👍"
                          label="نعم"
                          tone="primary"
                          onClick={() => {
                            setOther((o) => ({ ...o, stage: "otp" }));
                            setTimeout(() => toast({ title: `رسالة إلى هاتف ${other.person?.firstName}`, body: `طلب تقديم حج باسمك من ${me.firstName}. رمز الموافقة: ${DEMO_OTP}`, icon: "💬", tone: "gold" }), 800);
                          }}
                        />
                        <Choice index={1} icon="↩️" label="لا، رقم آخر" onClick={() => setOther({ id: "", stage: "id", person: null, otp: "", error: "" })} />
                      </div>
                    </Question>
                  )}
                  {other.stage === "otp" && other.person && (
                    <Question title={`أدخل رمز الموافقة الذي وصل إلى هاتف ${other.person.firstName}`} hint={`على الهاتف المنتهي بـ ${other.person.phoneTail}`}>
                      <OtpInput value={other.otp} onChange={(v) => setOther((o) => ({ ...o, otp: v }))} />
                      <p className="mt-3 text-center text-sm text-hint">رمز تجريبي: <button className="font-mono font-bold underline" onClick={() => setOther((o) => ({ ...o, otp: DEMO_OTP }))}>{DEMO_OTP}</button></p>
                      <div className="mt-8 text-center">
                        <Button
                          size="xl"
                          disabled={other.otp.length !== DEMO_OTP.length}
                          onClick={() => {
                            // The code is checked and the consent recorded by the service, not by this page
                            if (!preview) {
                              const r = run((s) => confirmApplicantConsent(s, sessionId, other.person!.id, other.otp, stamp()));
                              if (!r.ok) return setOther((o) => ({ ...o, error: r.errors[0].message, otp: "" }));
                            } else if (other.otp !== DEMO_OTP) return setOther((o) => ({ ...o, error: "رمز الموافقة غير صحيح", otp: "" }));
                            const self: Member[] = [{ person: other.person!, relation: "self", relationVerified: true, needs: [] }];
                            setSelf(other.person!);
                            advanceFrom("applicant", { members: self }, "replace");
                          }}
                        >
                          تأكيد الموافقة <ArrowLeft className="size-6" />
                        </Button>
                        {other.error && <p className="mt-4 rounded-2xl bg-maroon/8 p-4 text-center font-bold text-maroon">{other.error}</p>}
                      </div>
                    </Question>
                  )}
                </div>
              )}

              {screen === "residence" && applicant && (
                <Question
                  title={said("residence").title ?? (applicant.id === sessionId ? "أين تقيم حالياً؟" : `أين يقيم ${applicant.firstName} حالياً؟`)}
                  hint={said("residence").hint ?? "لكل محافظة مكتب واحد، ولنا مكاتب في تركيا (إسطنبول وغازي عنتاب) ومصر والأردن. يتبع طلبك المكتب الأقرب إلى إقامتك، ومع هذا المكتب تُفوَّج إلى مجموعتك بعد القبول."}
                  speak="أين تقيم حالياً؟ داخل سوريا، أو في تركيا: إسطنبول أو غازي عنتاب، أو مصر، أو الأردن."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Choice
                      index={0}
                      icon="🇸🇾"
                      label="داخل سوريا"
                      description={`${officeFor(applicant.governorate)} — حسب محافظتك في السجل المدني`}
                      selected={residence === "سوريا"}
                      onClick={() => {
                        setResidence("سوريا");
                        advanceFrom("residence", { residence: "سوريا" });
                      }}
                    />
                    {ABROAD.map((country, i) => (
                      <Choice
                        key={country}
                        index={i + 1}
                        icon={RESIDENCE_FLAGS[countryOf(country)] ?? "🌍"}
                        label={`في ${country}`}
                        description={officeFor(country)}
                        selected={residence === country}
                        onClick={() => {
                          setResidence(country);
                          advanceFrom("residence", { residence: country });
                        }}
                      />
                    ))}
                  </div>
                  <Button variant="ghost" size="lg" className="mt-6" onClick={back}>
                    <ArrowRight className="size-5" /> رجوع
                  </Button>
                </Question>
              )}

              {screen === "companions" && applicant && (
                <Question
                  step="السؤال 2"
                  title={said("members").title ?? (applicant.id === sessionId ? "هل تود أن تصطحب أحداً معك؟" : `هل سيرافق ${applicant.firstName} أحد؟`)}
                  hint={said("members").hint ?? `يمكن إضافة حتى ${season.rules.maxCompanions} مرافقين، وحتى ${season.rules.maxCompanionsFamily} للرجل مع زوجته وأولاده. الطلب العائلي يُقبل كوحدة واحدة.`}
                  speak="هل تود أن تصطحب أحداً معك؟ نعم، أو لا."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Choice index={0} icon="👨‍👩‍👧‍👦" label="نعم" description="طلب عائلي أو مع مرافقين" onClick={() => go("method")} />
                    <Choice
                      index={1}
                      icon="🧍"
                      label="لا، طلب فردي"
                      description="ينتهي بخطوة واحدة"
                      onClick={() => {
                        const solo = members.filter((m) => m.relation === "self");
                        setMembers(solo);
                        afterMembers(solo);
                      }}
                    />
                  </div>
                  {ageOf(applicant) >= 69 && (
                    <p className="mt-5 rounded-2xl bg-gold/25 p-4 font-semibold text-maroon">
                      تنبيه: من بلغ 69 عاماً يحتاج مرافقاً في الطلب نفسه.
                    </p>
                  )}
                  <Button variant="ghost" size="lg" className="mt-6" onClick={back}>
                    <ArrowRight className="size-5" /> رجوع
                  </Button>
                </Question>
              )}

              {screen === "method" && (
                <Question step="السؤال 3" title="كيف تريد إضافة المرافقين؟" hint="يمكنك الجمع بين الطريقتين." speak="كيف تريد إضافة المرافقين؟ من دفتر العائلة، أو بالرقم الوطني لكل شخص.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Choice
                      index={0}
                      icon={<BookUser className="size-8 text-green-dark" />}
                      label="من دفتر العائلة"
                      description="الأسرع: نجلب الزوجة والأولاد تلقائياً وتختار من يسافر"
                      onClick={() => go("booklet")}
                    />
                    <Choice
                      index={1}
                      icon={<IdCard className="size-8 text-green-dark" />}
                      label="بالرقم الوطني لكل شخص"
                      description="للأم أو الأخ أو أي قريب ليس في الدفتر"
                      onClick={() => go("count")}
                    />
                  </div>
                  <Button variant="ghost" size="lg" className="mt-6" onClick={back}>
                    <ArrowRight className="size-5" /> رجوع
                  </Button>
                </Question>
              )}

              {screen === "booklet" && applicant && (
                <BookletPicker
                  applicant={applicant}
                  book={book}
                  setBook={setBook}
                  samples={[
                    ...DEMO_BOOKS.filter((b) => b.no === scenario?.book),
                    ...DEMO_BOOKS.filter((b) => b.no !== scenario?.book),
                  ]}
                  members={members}
                  onToggle={(m, sel) => (sel ? addMember(m) : removeMember(m.person.id))}
                  onAddOutside={() => {
                    setAdderReturn("booklet");
                    go("adder");
                  }}
                  onBack={back}
                  onDone={() => go("review")}
                />
              )}

              {screen === "count" && applicant && (
                <Question step="السؤال 4" title="كم شخصاً تريد أن تصطحب؟" speak="كم شخصاً تريد أن تصطحب؟ واحد، اثنان، أو ثلاثة." hint="العدد 4 و5 متاح فقط للرجل مع زوجته وأولاده.">
                  <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
                    {[1, 2, 3, 4, 5].map((n, i) => {
                      const locked = n > season.rules.maxCompanions && applicant.gender !== "M";
                      return (
                        <motion.button
                          key={n}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.06 }}
                          whileHover={locked ? undefined : { y: -4 }}
                          disabled={locked}
                          onClick={() => {
                            setTarget(n);
                            setAdderReturn("loop");
                            go("adder");
                          }}
                          className={cn(
                            "aspect-square rounded-3xl border-2 font-display text-5xl font-bold transition disabled:opacity-30",
                            n > season.rules.maxCompanions ? "border-dashed border-gold-dark text-gold-dark" : "border-gold/60 bg-white text-green-dark hover:border-green-dark hover:bg-green-dark hover:text-white",
                          )}
                        >
                          {n}
                        </motion.button>
                      );
                    })}
                  </div>
                  <Button variant="ghost" size="lg" className="mt-6" onClick={back}>
                    <ArrowRight className="size-5" /> رجوع
                  </Button>
                </Question>
              )}

              {screen === "adder" && applicant && (
                <PersonAdder
                  applicant={applicant}
                  applicantIsMe={applicant.id === sessionId}
                  existingIds={members.map((m) => m.person.id)}
                  ordinal={adderReturn === "loop" ? `${ORDINALS[companions.length] ?? "مرافق"} من ${target}` : "إضافة مرافق"}
                  suggestions={(applicant.id === "01012345412"
                    ? [
                        { id: "01012340078", label: "والدته خديجة" },
                        { id: "01012345413", label: "زوجته فاطمة" },
                        { id: "01012349901", label: "عبد الله (حجّ سابقاً)" },
                      ]
                    : applicant.id === "06055500711"
                      ? [{ id: "06055500701", label: "والدته نجاح" }, ...DEMO_PEOPLE.slice(3)]
                      : applicant.id === "01077700351"
                        ? [{ id: "01077700350", label: "والده عادل (64) — يصبح صاحب الطلب" }, ...DEMO_PEOPLE.slice(3)]
                        : applicant.id === "02033300552"
                        ? [{ id: "02033300553", label: "أخوها مازن" }, ...DEMO_PEOPLE.filter((p) => p.id !== "02033300552" && p.id !== "02033300553")]
                        : DEMO_PEOPLE
                  ).filter((s) => s.id !== applicant.id && !members.some((m) => m.person.id === s.id))}
                  onCancel={back}
                  onAdd={(m) => {
                    addMember(m);
                    toast({ title: `أُضيف ${m.person.firstName} إلى الطلب`, body: m.relationVerified ? "صلة القرابة مؤكدة من الشؤون المدنية" : "صلة القرابة ستُراجع من موظف التسجيل", icon: "✅", tone: "success" });
                    if (adderReturn === "loop") {
                      if (companions.length + 1 < target) replace("adder");
                      else replace("review");
                    } else {
                      back();
                    }
                  }}
                />
              )}

              {screen === "review" && applicant && (
                <Question title="هؤلاء أفراد طلبك" hint="راجع الأسماء. يمكنك إزالة أي شخص أو إضافة شخص آخر." speak="هؤلاء أفراد طلبك. راجع الأسماء.">
                  <div className="space-y-3">
                    {members.map((m, i) => (
                      <motion.div key={m.person.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-3xl border border-gold/50 bg-white p-4">
                        <PersonChip
                          name={fullName(m.person)}
                          gender={m.person.gender}
                          sub={
                            <span className="flex flex-wrap items-center gap-2">
                              {m.relation === "self" ? "صاحب الطلب" : relationWord(m.relation, m.person.gender)} — {ageOf(m.person)} عاماً
                              {m.relation !== "self" && (m.relationVerified ? <Badge>صلة مؤكدة</Badge> : <Badge tone="gold">صلة للمراجعة</Badge>)}
                            </span>
                          }
                        >
                          {m.relation !== "self" && (
                            <button onClick={() => removeMember(m.person.id)} className="rounded-xl p-2 text-maroon hover:bg-maroon/10" aria-label={`إزالة ${m.person.firstName}`}>
                              <Trash2 className="size-5" />
                            </button>
                          )}
                        </PersonChip>
                      </motion.div>
                    ))}
                  </div>
                  {companions.length < season.rules.maxCompanionsFamily && (
                    <button
                      onClick={() => {
                        setAdderReturn("review");
                        go("adder");
                      }}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-gold-dark p-5 font-bold text-green-dark hover:bg-gold/10"
                    >
                      <UserPlus className="size-5" /> إضافة شخص آخر
                    </button>
                  )}
                  <div className="mt-8 flex flex-wrap justify-between gap-3">
                    <Button variant="ghost" size="lg" onClick={back}>
                      <ArrowRight className="size-5" /> رجوع
                    </Button>
                    <Button size="xl" onClick={() => afterMembers()}>
                      الأفراد صحيحون <ArrowLeft className="size-6" />
                    </Button>
                  </div>
                </Question>
              )}

              {screen === "elderly" &&
                (() => {
                  const target = unresolvedElderly;
                  if (!target) {
                    return (
                      <Question title="تم تحديد المرافقين لكبار السن" hint={elderly.map((e) => `${e.person.firstName}: يرافقه ${members.find((m) => m.person.id === e.companionId)?.person.firstName}`).join(" — ")}>
                        <div className="flex flex-wrap gap-3">
                          <Button size="xl" onClick={() => advanceFrom("members")}>
                            التحقق من الأهلية <ArrowLeft className="size-6" />
                          </Button>
                          <Button variant="outline" size="xl" onClick={() => setMembers((ms) => ms.map((m) => ({ ...m, companionId: undefined })))}>
                            تغيير المرافقين
                          </Button>
                        </div>
                      </Question>
                    );
                  }
                  const taken = members.map((m) => m.companionId).filter(Boolean);
                  const candidates = members.filter(
                    (m) =>
                      m.person.id !== target.person.id &&
                      birthYear(m.person) > season.rules.elderlyNeedsCompanionMaxBirthYear &&
                      birthYear(m.person) <= season.rules.companionMaxBirthYear &&
                      !taken.includes(m.person.id),
                  );
                  const t = target.person;
                  return (
                    <Question
                      title={`${t.firstName} ${t.gender === "F" ? "عمرها" : "عمره"} ${ageOf(t)} عاماً. من ${t.gender === "F" ? "سيرافقها" : "سيرافقه"}؟`}
                      hint="من بلغ 69 عاماً يحتاج مرافقاً مسمّى في الطلب نفسه، يساعده في السفر والتنقل ويصله كل ما يصله من إشعارات."
                      speak={`${t.firstName} عمرها ${ageOf(t)} عاماً، ويحتاج إلى مرافق. من سيرافقه؟`}
                    >
                      {candidates.length ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          {candidates.map((c, i) => (
                            <Choice
                              key={c.person.id}
                              index={i}
                              icon={c.person.gender === "F" ? "👩" : "👨"}
                              label={c.person.firstName}
                              description={`${c.relation === "self" ? "صاحب الطلب" : relationLabel(c.relation, c.person.gender)} — ${ageOf(c.person)} عاماً`}
                              onClick={() => patchMember(t.id, { companionId: c.person.id })}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-3xl bg-gold/20 p-5">
                          <p className="font-bold text-maroon">لا يوجد في الطلب شخص يمكنه أن يكون مرافقاً ({season.rules.companionMaxBirthYear} فما قبل، ودون 69 عاماً، وغير مرافق لشخص آخر).</p>
                          <Button
                            className="mt-4"
                            onClick={() => {
                              setAdderReturn("review");
                              go("adder");
                            }}
                          >
                            <UserPlus className="size-5" /> أضف مرافقاً
                          </Button>
                        </div>
                      )}
                      <Button variant="ghost" size="lg" className="mt-6" onClick={back}>
                        <ArrowRight className="size-5" /> رجوع
                      </Button>
                    </Question>
                  );
                })()}

              {screen === "eligibility" && (
                <EligibilityCheck
                  key={members.map((m) => `${m.person.id}${m.companionId}${m.relation}`).join()}
                  result={result}
                  members={members}
                  rules={season.rules}
                  animate={checks === 0}
                  fixOf={(key) => ruleOfCheck(config.eligibility, key)?.fix ?? null}
                  onContinue={() => advanceFrom("eligibility")}
                  onSimulate={(key, label) => {
                    setChecks((n) => n + 1);
                    // In another application: taken out of it, as if he had withdrawn — the submission then holds him
                    const [pid, rule] = key.split(":");
                    if (rule === "single-application") {
                      const who = members.find((m) => m.person.id === pid)?.person;
                      const r = actions.releaseFromApplication(pid, sessionId);
                      if (r) {
                        actions.logEvent({ actor: applicant ? fullName(applicant) : sessionId, role: "حاج", action: `محاكاة: إزالة ${who ? fullName(who) : pid} من الطلب ${r.number}`, target: `طلب ${r.number}`, detail: r.whole ? "كان صاحبه، فأُلغي الطلب كله" : "بقي الطلب بباقي أفراده" });
                        toast({ title: `محاكاة: أُزيل ${who?.firstName ?? ""} من الطلب ${r.number}`, body: r.whole ? "كان صاحب ذلك الطلب، فأُلغي كله. يكمل الطلب هنا به." : "بقي ذلك الطلب بباقي أفراده، ويكمل الطلب هنا به.", icon: "🧪", tone: "gold" });
                        return;
                      }
                    }
                    setSimulated((x) => [...x, key]);
                    toast({ title: "محاكاة: اعتُبر الشرط محققاً", body: `${label} — للتجربة فقط، ويبقى معلَّماً «محاكاة» في الطلب.`, icon: "🧪", tone: "gold" });
                  }}
                  onRemove={(id) => {
                    const who = members.find((m) => m.person.id === id)?.person.firstName;
                    setChecks((n) => n + 1);
                    removeMember(id);
                    toast({ title: `أُزيل ${who} من الطلب`, body: "أعدنا التحقق من الأهلية فوراً.", icon: "🔄" });
                  }}
                  onAddPerson={() => {
                    setChecks((n) => n + 1);
                    setAdderReturn("eligibility");
                    go("adder");
                  }}
                  onFixCompanion={(id) => {
                    setChecks((n) => n + 1);
                    patchMember(id, { companionId: undefined });
                    go("elderly");
                  }}
                  onChangeApplicant={() => {
                    setChecks((n) => n + 1);
                    go("forWhom");
                  }}
                  onSwitchToLottery={
                    config.tracks.find((t) => t.key === "lottery")?.enabled
                      ? () => {
                          setChecks((n) => n + 1);
                          setTrack("lottery");
                          toast({
                            title: "حوّلنا طلبك إلى التسجيل الأولي على القرعة",
                            body: "بالأفراد أنفسهم ودون إعادة الخطوات. تدفع الآن رسم التسجيل فقط، والدفعة الأولى عند تثبيت التسجيل إن قُبلت.",
                            icon: "🎟️",
                            tone: "gold",
                          });
                        }
                      : undefined
                  }
                />
              )}

              {screen === "consents" && (
                <Consents
                  members={members}
                  filerId={sessionId}
                  consents={consents}
                  onSimulate={(id, status) =>
                    preview
                      ? setPreviewConsents((c) => ({ ...c, [id]: { ...c[id], status, respondedAt: stamp() } }))
                      : actions.respondConsent(sessionId, id, status, stamp())
                  }
                  onResend={(id) => {
                    if (!preview) actions.setConsent(sessionId, id, { status: "pending", sentAt: stamp(), via: accounts[id] ? "app" : "sms" });
                    toast({ title: "أُعيد إرسال طلب الموافقة", icon: "📨" });
                  }}
                  onRemove={(id) => {
                    const who = members.find((m) => m.person.id === id)?.person.firstName;
                    removeMember(id);
                    if (!preview) actions.setConsent(sessionId, id, null);
                    setChecks((n) => n + 1);
                    toast({ title: `أُزيل ${who} من الطلب`, body: "أعدنا التحقق من الأهلية.", icon: "🔄" });
                    go("eligibility");
                  }}
                  onLater={() => {
                    toast({ title: "حُفظ طلبك", body: config.messages.savedLater, icon: "💾", tone: "success" });
                    if (!preview) router.push("/portal");
                  }}
                  onDone={() => advanceFrom("consents")}
                />
              )}

              {screen === "summary" && (
                <Question
                  title={said("summary").title ?? "ملخص طلبك قبل الدفع"}
                  hint={
                    said("summary").hint ??
                    (track === "lottery"
                      ? `طلبك في التسجيل الأولي على القرعة. تُجرى القرعة ${SEASON.windows.lottery.draw} ببث مباشر: تُسحب سنوات ميلاد وأشهر.`
                      : `طلبك في التسجيل على القبول المباشر. إن لم يُقبل، يمكنك نقله إلى القرعة بضغطة واحدة حين يُفتح بابها ${SEASON.windows.lottery.hijri}.`)
                  }
                  speak="ملخص طلبك قبل الدفع. لا نطلب الآن جواز السفر ولا الصورة ولا المعلومات الصحية، فهذه تأتي بعد القبول."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl bg-green-dark p-5 text-white">
                      <p className="text-sm text-gold">نوع الطلب</p>
                      <p className="mt-1 font-display text-xl font-bold">{config.tracks.find((t) => t.key === track)?.label ?? (track === "lottery" ? "التسجيل الأولي على القرعة" : "التسجيل على القبول المباشر")}</p>
                      <p className="mt-2 text-sm leading-6 text-white/75">
                        {track === "lottery"
                          ? `قرعة علنية على ${Math.round(SEASON.lotteryShare * 100)}% من الحصة. يُطابَق طلبك بميلاد صاحبه${applicant ? ` (${MONTHS[birthOf(applicant).month - 1]} ${birthOf(applicant).year})` : ""}: إن سُحبت سنته، أو شهره منها، قُبل الطلب بأفراده كلهم.`
                          : `يُرتَّب الطلب بعمر صاحب الطلب (${applicant ? ageOf(applicant) : "—"} عاماً)، ويُقبل الأكبر سناً حتى تكتمل ${Math.round(SEASON.directShare * 100)}% من الحصة.`}
                      </p>
                    </div>
                    <div className="rounded-3xl border-2 border-gold/50 bg-white p-5">
                      <p className="text-sm font-bold text-gold-dark">المكتب الذي يتبع له طلبك</p>
                      <p className="mt-1 font-display text-xl font-bold text-green-dark">{officeFor(area)}</p>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">
                        {residence === "سوريا"
                          ? `حسب محافظة ${applicant?.firstName ?? "صاحب الطلب"} في السجل المدني (${area}). لكل محافظة مكتب واحد.`
                          : `لأن ${applicant?.id === sessionId ? "إقامتك" : `إقامة ${applicant?.firstName}`} في ${area}.`}
                      </p>
                      <p className="mt-2 text-sm text-ink-soft">
                        صاحب الطلب: <b className="text-ink">{applicant ? fullName(applicant) : "—"}</b> — {members.length} أفراد
                      </p>
                    </div>
                  </div>
                  {answered.length > 0 && (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-gold/40">
                      <p className="bg-sand px-4 py-2 text-sm font-bold text-gold-dark">إجاباتك</p>
                      <ul className="divide-y divide-gold-light px-4 text-sm">
                        {answered.map((a) => (
                          <li key={`${a.stage.id}-${a.label}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                            <span className="text-ink-soft">{a.label}</span>
                            <span className="flex items-center gap-2 font-bold">
                              {a.value}
                              <button type="button" onClick={() => go(entryOf(a.stage, true))} className="rounded-lg p-1 text-green-dark hover:bg-sand" aria-label={`تعديل ${a.label}`}>
                                <Pencil className="size-3.5" />
                              </button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-5 rounded-2xl bg-sand p-4 text-sm leading-7 text-ink-soft">
                    <p className="font-bold text-green-dark">ماذا يحدث بعد القبول؟</p>
                    <ol className="mt-1 list-inside list-decimal">
                      {track === "lottery" && <li>إن قُبل طلبك في القرعة تثبّت تسجيلك ({SEASON.windows.lottery.confirm}) بتأكيد القبول ودفع الدفعة الأولى من تكلفة الحج{credit ? " — وهي مدفوعة مسبقاً من طلبك السابق (تُعاد إليك إن لم يُقبل)" : ""}، وإلا سقط القبول.</li>}
                      <li>ترفع لكل فرد الصورة الشخصية بعد الدفعة الأولى، وجواز السفر بعد الدفعة الثانية — ولا وثائق طبية قبل الانضمام إلى مجموعة.</li>
                      <li>الإلحاق بمجموعة عملية مستقلة لاحقة ({SEASON.groupingWindow}): لا تختار المجموعة من المنصة، بل تتفق معها وتوقّع عقدك معها في المكتب، فيلحقك موظف المكتب بها. التسجيل على الحج لا يضعك في أي مجموعة.</li>
                      <li>{plan === 1 ? "تكلفة الحج مدفوعة كاملة؛ تسدّد عند الانضمام الهدي، وسعر السكن الخاص إن اخترتموه" : "عند الانضمام إلى المجموعة تدفع الدفعة الثانية"}، ثم ترفع شهادات اللقاحات والوثائق الطبية.</li>
                    </ol>
                  </div>
                  <div className="mt-5 overflow-hidden rounded-2xl border border-gold/40">
                    <p className="bg-sand px-4 py-2 text-sm font-bold text-gold-dark">تدفع الآن</p>
                    <ul className="divide-y divide-gold-light px-4 text-sm">
                      <li className="flex justify-between py-2"><span>رسم التسجيل — {members.length} × {formatUSD(season.fees.registrationPerPerson)}</span><b>{formatUSD(fee)}</b></li>
                      {track === "direct" && (
                        <li className="flex justify-between py-2">
                          <span>{plan === 1 ? "تكلفة الحج كاملة" : "الدفعة الأولى من تكلفة الحج"} — {members.length} × {formatUSD(first / Math.max(1, members.length))}</span>
                          <b>{formatUSD(first)}</b>
                        </li>
                      )}
                      {credit && (
                        <li className="flex justify-between py-2 text-green"><span>الدفعة الأولى من طلبك السابق {credit.creditFrom} — رصيد محفوظ</span><b>{formatUSD(credit.amount)}</b></li>
                      )}
                      <li className="flex justify-between py-2 font-bold text-green-dark"><span>المجموع الآن</span><span>{formatUSD(fee + first)}</span></li>
                    </ul>
                  </div>
                  <div className="mt-5">
                    <SeasonPlanNote people={members.length} fees={season.fees} dueNowLabel={track === "direct" ? "تدفع الآن مع رسم التسجيل" : "عند تثبيت التسجيل إن قُبلت في القرعة"} />
                    {track === "direct" && <p className="mt-2 text-xs text-hint">تُعاد الدفعة الأولى إن لم يُقبل الطلب ولم تنقله إلى القرعة.</p>}
                  </div>
                  <Button size="xl" className="mt-6" onClick={() => advanceFrom("summary")}>
                    إلى الدفع — {formatUSD(fee + first)} <ArrowLeft className="size-6" />
                  </Button>
                </Question>
              )}

              {screen === "payment" &&
                (first > 0 ? (
                  <PayWindow what="الدفعة الأولى" when={`مع التسجيل على القبول المباشر (${SEASON.windows.direct.hijri})`} opened={firstOpen} onOpen={() => setFirstOpen(true)}>
                    <Payment lines={payLines} receipt={receipt} onConfirmed={confirmPayment} onPaid={submit} methods={methods} />
                  </PayWindow>
                ) : (
                  <Payment lines={payLines} receipt={receipt} onConfirmed={confirmPayment} onPaid={submit} methods={methods} />
                ))}
            </motion.div>
          </AnimatePresence>
        </Card>

        {!preview && currentStage?.id !== firstStage?.id && !["adder", "booklet", "otherId"].includes(screen) && history.length > 1 && (
          <p className="mt-4 text-center text-sm text-hint">
            <Link href="/portal" className="hover:text-ink">الخروج إلى ملفي — طلبك محفوظ وتتابعه لاحقاً</Link>
          </p>
        )}
      </div>
  );

  // The staff's preview sits in their portal: the form and its summary side by side, without the pilgrim's page around them
  if (preview) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">{body}</div>
        <aside className="space-y-4">{aside}</aside>
      </div>
    );
  }
  // In the account's pages, with its sidebar like every other. The question keeps the whole width — the pilgrim must
  // see everything clearly — and under it the text size and the help line side by side, then the summary on its own row
  return (
    <PilgrimShell title="طلب حج — موسم 1448هـ" subtitle="سؤال واحد في كل مرة. خذ وقتك، ويمكنك الرجوع متى شئت.">
      {body}
      <aside aria-label="ملخص الطلب والمساعدة" className="mt-6 grid gap-4 sm:grid-cols-2">
        {aside}
      </aside>
    </PilgrimShell>
  );
}
