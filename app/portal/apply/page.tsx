"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  BookUser,
  CheckCircle2,
  HeadphonesIcon,
  IdCard,
  Loader2,
  Minus,
  Plus,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card, PortalShell } from "@/components/portal/shell";
import { DEMO_OTP, OtpInput } from "@/components/portal/bits";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { applicationNumberFor, directAccepted, stageAt, trackOf, trackSteps, type Track } from "@/lib/journey";
import { DEMO_SCENARIOS, ageOf, birthYear, fullName, getPerson, isValidNationalId, lookupPerson, relationLabel, type Person } from "@/lib/registry";
import { evaluate, withOldestAsApplicant, type Member } from "@/lib/rules";
import { SeasonPlanNote } from "@/components/payment/plan-picker";
import { firstPayment, seasonPlan } from "@/lib/installments";
import { ABROAD, SEASON, officeArea, officeFor, type Residence } from "@/lib/season";
import { useSeason } from "@/lib/season-live";
import { actions, useStore } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { BookletPicker, type Book } from "./_components/booklet";
import { EligibilityCheck } from "./_components/eligibility";
import { Consents, Payment, consentPeople } from "./_components/finalize";
import { PersonAdder, relationWord } from "./_components/person-adder";
import { Choice, DigitsDisplay, NumberPad, PersonChip, Question } from "./_components/ui";

type Screen =
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

/**
 * Registration asks only what decides eligibility. The passport, the personal photo, vaccinations and
 * health information all come after acceptance; the office is never picked from a list.
 */
const PHASES: { label: string; screens: Screen[] }[] = [
  { label: "صاحب الطلب", screens: ["intro", "track", "forWhom", "otherId", "residence"] },
  { label: "المرافقون", screens: ["companions", "method", "booklet", "count", "adder", "review", "elderly"] },
  { label: "الأهلية", screens: ["eligibility", "consents"] },
  { label: "الملخص والدفع", screens: ["summary", "payment"] },
];

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

export default function ApplyPage() {
  const router = useRouter();
  const toast = useToast();
  const sessionId = useStore((s) => s.sessionId)!;
  const existing = useStore((s) => s.applications[s.sessionId ?? ""]);
  const scale = useStore((s) => s.displayScale);
  const me = getPerson(sessionId)!;
  const season = useSeason();

  const accounts = useStore((s) => s.accounts);
  // The saved application (autosaved at every step). Approvals inside it change from outside this page
  const saved = useStore((s) => s.drafts[s.sessionId ?? ""]);
  const consents = saved?.consents ?? {};
  // Snapshot at opening: the application continues exactly where it was left
  const [draft0] = useState(() => saved);

  const [history, setHistory] = useState<Screen[]>(() => (draft0 ? (draft0.history as Screen[]).map((s) => RESUME_AT[s] ?? s) : ["intro"]));
  // Which registration this application is for — direct acceptance and the lottery are separate applications
  const [track, setTrack] = useState<Track>(draft0?.track ?? "direct");
  const [openedAt] = useState(() => Date.now());
  const screen = history[history.length - 1];
  const [members, setMembers] = useState<Member[]>(draft0?.members ?? []);
  const [target, setTarget] = useState(1);
  const [adderReturn, setAdderReturn] = useState<"loop" | "booklet" | "review" | "eligibility">("loop");
  const [book, setBook] = useState<Book | null>((draft0?.book as Book | null) ?? null);
  // Where the applicant lives decides the office: the registry governorate inside Syria, or the country office abroad
  const [residence, setResidence] = useState<Residence>((draft0?.residence as Residence) ?? "سوريا");
  const [other, setOther] = useState({ id: "", stage: "id" as "id" | "loading" | "confirm" | "otp", person: null as Person | null, otp: "", error: "" });
  // How many times the eligibility check has run — only the first run reveals row by row
  const [checks, setChecks] = useState(0);
  // Furthest phase reached — completed phases can be reopened from the progress bar
  const [maxPhase, setMaxPhase] = useState(draft0?.maxPhase ?? 0);

  const applicant = members.find((m) => m.relation === "self")?.person ?? null;
  const companions = members.filter((m) => m.relation !== "self");
  // Direct acceptance: the accepted age is known before registration, so it is checked now — before anything is paid
  const result = useMemo(
    () => evaluate(members, season.rules, track === "direct" ? { minAge: season.acceptedDirectAge } : undefined),
    [members, season.rules, track, season.acceptedDirectAge],
  );
  // A direct-acceptance application that ended without a place: the pilgrim may now register for the lottery
  const previousDirect =
    existing && trackOf(existing) === "direct" && !directAccepted(existing) && stageAt(trackSteps("direct", false), (openedAt - existing.submittedAt) / 1000).stage.key === "notAccepted"
      ? existing
      : null;
  const number = applicant ? applicationNumberFor(track === "lottery" && previousDirect ? `${sessionId}-L` : sessionId) : "";
  const receipt = `1448-R-${number.padStart(6, "0")}`;
  const scenario = DEMO_SCENARIOS.find((s) => s.id === (applicant?.id ?? sessionId));

  const go = (s: Screen) => {
    setHistory((h) => [...h, s]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  const replace = (s: Screen) => setHistory((h) => [...h.slice(0, -1), s]);

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
    go(list.some((m) => birthYear(m.person) <= season.rules.elderlyNeedsCompanionMaxBirthYear) ? "elderly" : "eligibility");

  // Autosave: every change is kept on the account, so the applicant can leave and continue later
  const blocked = !!existing && !previousDirect;
  useEffect(() => {
    if (blocked || (screen === "intro" && members.length === 0)) return;
    actions.saveDraft(sessionId, { history, track, members, book: book ? { ...book } : null, residence, maxPhase }, Date.now());
  }, [blocked, sessionId, history, screen, track, members, book, residence, maxPhase]);

  // Coming back to a saved application
  useEffect(() => {
    if (!draft0 || blocked) return;
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
  const sendConsents = () => {
    const at = stamp();
    const people = consentPeople(members, sessionId);
    // A save first, so the approvals have a draft to live in even if nothing else changed
    actions.saveDraft(sessionId, { history, track, members, book: book ? { ...book } : null, residence, maxPhase }, at);
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
      action: "نقل أفراد طلب القبول المباشر إلى التسجيل على القرعة",
      target: `طلب ${previousDirect.number}`,
      detail: `${carried.length} أفراد — دون إعادة الخطوات`,
    });
  };

  const fee = members.length * season.fees.registrationPerPerson;
  // The administration sets how the Hajj cost is paid this season (1448: two installments)
  const plan = seasonPlan(season.fees);
  // Direct acceptance: fee + first installment now. Lottery: the fee only — the first installment is due at the draw result
  const first = track === "direct" ? firstPayment(plan, members.length, season.fees) : 0;
  // The first installment of a direct application that was not accepted stays as a credit for the lottery
  const credit = track === "lottery" && previousDirect?.firstPaid ? { ...previousDirect.firstPaid, creditFrom: previousDirect.number } : undefined;
  const payLines = [
    { label: `رسم التسجيل — ${members.length} × ${formatUSD(season.fees.registrationPerPerson)}`, amount: fee },
    ...(first ? [{ label: plan === 1 ? `تكلفة الحج كاملة — ${members.length} × ${formatUSD(season.fees.hajjCost)}` : `الدفعة الأولى من تكلفة الحج — ${members.length} × ${formatUSD(season.fees.firstInstallment)}`, amount: first }] : []),
  ];

  const submit = (method: "shamcash" | "bank") => {
    const now = stamp();
    actions.clearDraft(sessionId);
    actions.saveApplication({
      number,
      applicantId: sessionId,
      createdAt: now,
      submittedAt: now,
      mode: companions.length === 0 ? "solo" : book ? "booklet" : "national",
      track,
      previous: previousDirect ? { number: previousDirect.number, track: "direct", submittedAt: previousDirect.submittedAt, closedAt: now } : undefined,
      forWhom: applicant?.id === sessionId ? "me" : "other",
      members,
      governorate: area,
      office: officeFor(area),
      receipt,
      paid: fee + first,
      plan: track === "direct" ? plan : credit ? previousDirect?.plan : undefined,
      firstPaid: first ? { amount: first, at: now, receipt: `1448-P-${number.padStart(6, "0")}-1` } : credit,
      payMethod: method,
      ratings: {},
    });
    actions.logEvent({
      actor: me.firstName + " " + me.lastName,
      role: "حاج",
      action: track === "lottery" ? "تقديم طلب حج — التسجيل على القرعة" : "تقديم طلب حج — التسجيل على القبول المباشر",
      target: `طلب ${number}`,
      detail: `${members.length} أفراد — ${result.members.some((m) => m.checks.some((c) => c.status === "warn")) ? "يحتاج مراجعة" : "مستوفٍ تلقائياً"} — الإيصال ${receipt}`,
    });
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.35 }, colors: ["#D9C89E", "#00594F", "#289E92", "#AD9E6E", "#672146"] });
    toast({
      title: `تم استلام طلبك رقم ${number}`,
      body: `${track === "lottery" ? "في التسجيل على القرعة" : "في التسجيل على القبول المباشر"} لـ ${members.length} أفراد، وتم تسديد ${first ? "رسم التسجيل والدفعة الأولى" : "رسم التسجيل"} (الإيصال ${receipt}).`,
      icon: "📨",
      tone: "success",
    });
    router.push("/portal/application");
  };

  if (existing && !previousDirect) {
    return (
      <PortalShell title="لديك طلب مُقدَّم بالفعل">
        <Card className="text-center">
          <CheckCircle2 className="mx-auto size-16 text-green-light" />
          <p className="mt-4 font-display text-2xl font-bold text-green-dark">طلب رقم {existing.number} — {existing.members.length} أفراد</p>
          <p className="mt-1 font-bold text-gold-dark">{trackOf(existing) === "lottery" ? "في التسجيل على القرعة" : "في التسجيل على القبول المباشر"}</p>
          <p className="mt-2 text-ink-soft">
            طلب واحد فقط لكل شخص في كل تسجيل. إن لم يُقبل طلب القبول المباشر، يمكنك التسجيل على القرعة بطلب جديد ({SEASON.windows.lottery.hijri}).
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
      </PortalShell>
    );
  }

  const phaseIdx = PHASES.findIndex((p) => p.screens.includes(screen));
  if (phaseIdx > maxPhase) setMaxPhase(phaseIdx); // adjusting state during render, per React docs
  const phaseEntry = (i: number): Screen =>
    i === 0 ? "track" : i === 1 ? (companions.length ? "review" : "companions") : i === 2 ? "eligibility" : "summary";
  const canOpenPhase = (i: number) => i !== phaseIdx && i <= maxPhase && !!applicant && (i < 3 || result.eligible);

  return (
    <PortalShell
      title="طلب حج — موسم 1448هـ"
      subtitle="سؤال واحد في كل مرة. خذ وقتك، ويمكنك الرجوع متى شئت."
      aside={
        <>
          <div className="rounded-3xl border border-gold/30 bg-white p-5">
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
              <ul className="mt-3 space-y-2">
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
                    الدفعة الأولى: <span className="font-bold text-green-dark">{formatUSD(first)}</span>
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="rounded-3xl border border-gold/30 bg-white p-5">
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
          <div className="flex items-start gap-3 rounded-3xl bg-green-dark p-5 text-white">
            <HeadphonesIcon className="mt-0.5 size-6 shrink-0 text-gold" />
            <div className="text-sm leading-7">
              <p className="font-bold">تحتاج مساعدة؟</p>
              اتصل على <span dir="ltr" className="font-bold text-gold">011 000 1448</span> أو زر أقرب مكتب تسجيل.
            </div>
          </div>
        </>
      }
    >
      <div>
        {/* Phase progress — completed phases are buttons, so any answer can be revisited and edited */}
        <div className="mb-4 rounded-3xl bg-white/10 p-2 backdrop-blur">
          <div className="grid grid-cols-4 gap-2">
            {PHASES.map((p, i) => {
              const open = canOpenPhase(i);
              const done = i < phaseIdx || (i <= maxPhase && i !== phaseIdx);
              return (
                <button
                  key={p.label}
                  type="button"
                  disabled={!open}
                  onClick={() => go(phaseEntry(i))}
                  aria-current={i === phaseIdx ? "step" : undefined}
                  title={open ? `تعديل: ${p.label}` : undefined}
                  className={cn("group rounded-2xl p-1.5 text-center transition", open ? "hover:bg-white/15" : "cursor-default")}
                >
                  <div className="h-2 overflow-hidden rounded-full bg-white/20">
                    <motion.div className="h-full bg-gold" initial={false} animate={{ width: done ? "100%" : i === phaseIdx ? "50%" : "0%" }} transition={{ duration: 0.6 }} />
                  </div>
                  <p className={cn("mt-1.5 flex items-center justify-center gap-1 text-[11px] font-bold leading-tight sm:text-xs", i === phaseIdx ? "text-gold" : i <= maxPhase ? "text-white" : "text-white/50")}>
                    {done && <CheckCircle2 className="hidden size-3.5 shrink-0 text-gold sm:block" />}
                    {p.label}
                  </p>
                </button>
              );
            })}
          </div>
          {maxPhase > 0 && <p className="mt-1 text-center text-[11px] text-white/70">اضغط على أي مرحلة منجزة لتعديلها</p>}
        </div>

        <Card className="min-h-[34rem] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={screen + (screen === "adder" ? companions.length : "")} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
              {screen === "intro" && previousDirect && (
                <Question
                  title={`لم يُقبل طلبك ${previousDirect.number} في القبول المباشر`}
                  hint={`الأعمار المقبولة ${SEASON.acceptedDirectAge} عاماً فأكثر، وعمر صاحب الطلب لم يبلغها. باب التسجيل على القرعة مفتوح (${SEASON.windows.lottery.hijri})، ولا حاجة لإعادة الخطوات: ننقل الأفراد أنفسهم إلى طلب القرعة، وتراجع الملخص وتدفع رسم التسجيل فقط.`}
                  speak="لم يُقبل طلبك في القبول المباشر. يمكنك التسجيل على القرعة بالأفراد أنفسهم دون إعادة الخطوات."
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

              {screen === "intro" && !previousDirect && (
                <Question
                  title={`أهلاً ${me.firstName}، سنقدّم طلبك معاً خطوة بخطوة`}
                  hint="سنسألك بعض الأسئلة البسيطة. بيانات مرافقيك تأتي من الشؤون المدنية، ونطبّق الشروط ونشرح لك كل شيء. يستغرق ذلك نحو خمس دقائق."
                  speak={`أهلاً ${me.firstName}، سنقدّم طلبك معاً خطوة بخطوة. سنسألك بعض الأسئلة البسيطة.`}
                >
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      { e: "🪪", t: "بطاقتك الشخصية", s: "وبطاقات مرافقيك أو دفتر العائلة" },
                      { e: "🛂", t: "لا تحتاج جوازك الآن", s: "الجواز والصورة بعد القبول، والوثائق الطبية بعد الانضمام إلى مجموعة" },
                      { e: "💳", t: `${season.fees.registrationPerPerson} دولاراً للفرد`, s: "رسم التسجيل" },
                    ].map((x, i) => (
                      <motion.div key={x.t} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08 }} className="rounded-3xl bg-sand p-5">
                        <span className="text-3xl">{x.e}</span>
                        <p className="mt-2 font-bold">{x.t}</p>
                        <p className="text-sm text-ink-soft">{x.s}</p>
                      </motion.div>
                    ))}
                  </div>
                  <Button
                    size="xl"
                    className="mt-8"
                    onClick={() => go("track")}
                  >
                    لنبدأ <ArrowLeft className="size-6" />
                  </Button>
                </Question>
              )}

              {screen === "track" && (
                <Question
                  title="على أي تسجيل تقدّم طلبك؟"
                  hint={`تسجيلان منفصلان، لكل منهما طلبه وموعده. القبول المباشر لمن بلغ صاحب طلبه ${season.acceptedDirectAge} عاماً فأكثر، ونتحقق من ذلك قبل الدفع؛ ومن كان أصغر يسجّل على القرعة.`}
                  speak="على أي تسجيل تقدّم طلبك؟ التسجيل على القبول المباشر، أو التسجيل على القرعة."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Choice
                      index={0}
                      icon="🧓"
                      label="التسجيل على القبول المباشر"
                      description={
                        previousDirect
                          ? `قدّمت فيه الطلب رقم ${previousDirect.number} ولم يُقبل (الأعمار المقبولة ${SEASON.acceptedDirectAge} عاماً فأكثر)`
                          : `${SEASON.windows.direct.hijri} — لمن بلغ صاحب طلبه ${season.acceptedDirectAge} عاماً فأكثر (حددته الإدارة لهذا الموسم)، ونتحقق من العمر قبل أي دفع. ${Math.round(SEASON.directShare * 100)}% من الحصة (${SEASON.directSeats.toLocaleString("en")} مقعداً).`
                      }
                      selected={track === "direct" && !previousDirect}
                      disabled={!!previousDirect}
                      onClick={() => {
                        setTrack("direct");
                        go("forWhom");
                      }}
                    />
                    <Choice
                      index={1}
                      icon="🎟️"
                      label="التسجيل على القرعة"
                      description={`${SEASON.windows.lottery.hijri} — لكل الأعمار المؤهلة. قرعة علنية ببث مباشر على ${Math.round(SEASON.lotteryShare * 100)}% من الحصة (${SEASON.lotterySeats.toLocaleString("en")} مقعداً) يوم ${SEASON.windows.lottery.draw}.`}
                      selected={track === "lottery"}
                      onClick={() => {
                        if (previousDirect) return moveToLottery();
                        setTrack("lottery");
                        go("forWhom");
                      }}
                    />
                  </div>
                  <p className="mt-5 rounded-2xl bg-gold/20 p-4 text-sm leading-7 text-ink-soft">
                    {previousDirect
                      ? "ننقل أفراد طلبك السابق إلى طلب القرعة مباشرة، فتراجع الملخص وتدفع رسم التسجيل فقط."
                      :"في العرض التجريبي يمكنك تجربة التسجيلين الآن؛ في الموسم الفعلي يُفتح كل تسجيل في موعده فقط."}
                  </p>
                  <Button variant="ghost" size="lg" className="mt-6" onClick={back}>
                    <ArrowRight className="size-5" /> رجوع
                  </Button>
                </Question>
              )}

              {screen === "forWhom" && (
                <Question title="لمن هذا الطلب؟" speak="لمن هذا الطلب؟ لي، أو لشخص آخر." step="السؤال 1">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Choice
                      index={0}
                      icon="🙋"
                      label="لي أنا"
                      description={`${fullName(me)} — ${ageOf(me)} عاماً`}
                      onClick={() => {
                        if (applicant?.id !== me.id) setSelf(me);
                        go("residence");
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
                          disabled={other.otp !== DEMO_OTP}
                          onClick={() => {
                            setSelf(other.person!);
                            replace("residence");
                          }}
                        >
                          تأكيد الموافقة <ArrowLeft className="size-6" />
                        </Button>
                      </div>
                    </Question>
                  )}
                </div>
              )}

              {screen === "residence" && applicant && (
                <Question
                  title={applicant.id === sessionId ? "أين تقيم حالياً؟" : `أين يقيم ${applicant.firstName} حالياً؟`}
                  hint="لكل محافظة مكتب واحد، ولنا مكاتب في تركيا ومصر والأردن. يتبع طلبك المكتب الأقرب إلى إقامتك تلقائياً، ومع هذا المكتب تُفوَّج إلى مجموعتك بعد القبول."
                  speak="أين تقيم حالياً؟ داخل سوريا، أو في تركيا، أو مصر، أو الأردن."
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
                        go("companions");
                      }}
                    />
                    {ABROAD.map((country, i) => (
                      <Choice
                        key={country}
                        index={i + 1}
                        icon={RESIDENCE_FLAGS[country] ?? "🌍"}
                        label={`في ${country}`}
                        description={officeFor(country)}
                        selected={residence === country}
                        onClick={() => {
                          setResidence(country);
                          go("companions");
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
                  title={applicant.id === sessionId ? "هل تود أن تصطحب أحداً معك؟" : `هل سيرافق ${applicant.firstName} أحد؟`}
                  hint={`يمكن إضافة حتى ${season.rules.maxCompanions} مرافقين، وحتى ${season.rules.maxCompanionsFamily} للرجل مع زوجته وأولاده. الطلب العائلي يُقبل كوحدة واحدة.`}
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
                          <Button size="xl" onClick={() => go("eligibility")}>
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
                  onContinue={() => {
                    if (!consentPeople(members, sessionId).length) return go("summary");
                    sendConsents();
                    go("consents");
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
                  onSwitchToLottery={() => {
                    setChecks((n) => n + 1);
                    setTrack("lottery");
                    toast({
                      title: "حوّلنا طلبك إلى التسجيل على القرعة",
                      body: "بالأفراد أنفسهم ودون إعادة الخطوات. تدفع الآن رسم التسجيل فقط، والدفعة الأولى عند ظهور اسمك.",
                      icon: "🎟️",
                      tone: "gold",
                    });
                  }}
                />
              )}

              {screen === "consents" && (
                <Consents
                  members={members}
                  filerId={sessionId}
                  consents={consents}
                  onSimulate={(id, status) => actions.respondConsent(sessionId, id, status, stamp())}
                  onResend={(id) => {
                    actions.setConsent(sessionId, id, { status: "pending", sentAt: stamp(), via: accounts[id] ? "app" : "sms" });
                    toast({ title: "أُعيد إرسال طلب الموافقة", icon: "📨" });
                  }}
                  onRemove={(id) => {
                    const who = members.find((m) => m.person.id === id)?.person.firstName;
                    removeMember(id);
                    actions.setConsent(sessionId, id, null);
                    setChecks((n) => n + 1);
                    toast({ title: `أُزيل ${who} من الطلب`, body: "أعدنا التحقق من الأهلية.", icon: "🔄" });
                    go("eligibility");
                  }}
                  onLater={() => {
                    toast({ title: "حُفظ طلبك", body: "عُد متى شئت من «تقديم طلب» لترى من وافق وتتابع.", icon: "💾", tone: "success" });
                    router.push("/portal");
                  }}
                  onDone={() => go("summary")}
                />
              )}

              {screen === "summary" && (
                <Question
                  title="ملخص طلبك قبل الدفع"
                  hint={
                    track === "lottery"
                      ? `طلبك في التسجيل على القرعة. تُجرى القرعة ${SEASON.windows.lottery.draw} ببث مباشر.`
                      : `طلبك في التسجيل على القبول المباشر. إن لم يُقبل، يمكنك نقله إلى القرعة بضغطة واحدة حين يُفتح بابها ${SEASON.windows.lottery.hijri}.`
                  }
                  speak="ملخص طلبك قبل الدفع. لا نطلب الآن جواز السفر ولا الصورة ولا المعلومات الصحية، فهذه تأتي بعد القبول."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl bg-green-dark p-5 text-white">
                      <p className="text-sm text-gold">نوع الطلب</p>
                      <p className="mt-1 font-display text-xl font-bold">{track === "lottery" ? "التسجيل على القرعة" : "التسجيل على القبول المباشر"}</p>
                      <p className="mt-2 text-sm leading-6 text-white/75">
                        {track === "lottery"
                          ? `قرعة علنية على ${Math.round(SEASON.lotteryShare * 100)}% من الحصة. الطلب العائلي يُسحب كوحدة واحدة.`
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
                  <div className="mt-5 rounded-2xl bg-sand p-4 text-sm leading-7 text-ink-soft">
                    <p className="font-bold text-green-dark">ماذا يحدث بعد القبول؟</p>
                    <ol className="mt-1 list-inside list-decimal">
                      {track === "lottery" && <li>إن ظهر اسمك في القرعة تدفع الدفعة الأولى من تكلفة الحج{credit ? " — وهي مدفوعة مسبقاً من طلبك السابق (تُعاد إليك إن لم تُسحب)" : ""}.</li>}
                      <li>ترفع لكل فرد الصورة الشخصية وجواز السفر — ولا وثائق طبية قبل التفويج.</li>
                      <li>حين تُفتح مرحلة التفويج ({SEASON.groupingWindow}) تتصفّح دليل المجموعات وتتواصل مع مجموعة، فيسجّلك منسقها فيها ويوقّع معك العقد.</li>
                      <li>{plan === 1 ? "تكلفة الحج مدفوعة كاملة؛ تسدّد عند الانضمام الهدي وفارق الغرفة الخاصة إن وجد" : "عند الانضمام إلى المجموعة تدفع الدفعة الثانية"}، ثم ترفع شهادات اللقاحات والوثائق الطبية.</li>
                    </ol>
                  </div>
                  <div className="mt-5 overflow-hidden rounded-2xl border border-gold/40">
                    <p className="bg-sand px-4 py-2 text-sm font-bold text-gold-dark">تدفع الآن</p>
                    <ul className="divide-y divide-gold-light px-4 text-sm">
                      <li className="flex justify-between py-2"><span>رسم التسجيل — {members.length} × {formatUSD(season.fees.registrationPerPerson)}</span><b>{formatUSD(fee)}</b></li>
                      {track === "direct" && (
                        <li className="flex justify-between py-2">
                          <span>{plan === 1 ? "تكلفة الحج كاملة" : "الدفعة الأولى من تكلفة الحج"} — {members.length} × {formatUSD(plan === 1 ? season.fees.hajjCost : season.fees.firstInstallment)}</span>
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
                    <SeasonPlanNote people={members.length} fees={season.fees} dueNowLabel={track === "direct" ? "تدفع الآن مع رسم التسجيل" : "عند ظهور اسمك في القرعة"} />
                    {track === "direct" && <p className="mt-2 text-xs text-hint">تُعاد الدفعة الأولى إن لم يُقبل الطلب ولم تنقله إلى القرعة.</p>}
                  </div>
                  <Button size="xl" className="mt-6" onClick={() => go("payment")}>
                    إلى الدفع — {formatUSD(fee + first)} <ArrowLeft className="size-6" />
                  </Button>
                </Question>
              )}

              {screen === "payment" && <Payment lines={payLines} receipt={receipt} onPaid={submit} />}
            </motion.div>
          </AnimatePresence>
        </Card>

        {screen !== "intro" && !["adder", "booklet", "otherId"].includes(screen) && history.length > 1 && (
          <p className="mt-4 text-center text-sm text-hint">
            <Link href="/portal" className="hover:text-ink">الخروج إلى ملفي — طلبك محفوظ وتتابعه لاحقاً</Link>
          </p>
        )}
      </div>
    </PortalShell>
  );
}
