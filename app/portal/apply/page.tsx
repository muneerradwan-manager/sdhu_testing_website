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
  Trash2,
  UserPlus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card, PortalShell } from "@/components/portal/shell";
import { DEMO_OTP, OtpInput } from "@/components/portal/bits";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { applicationNumberFor } from "@/lib/journey";
import { DEMO_SCENARIOS, ageOf, birthYear, fullName, getPerson, isValidNationalId, lookupPerson, relationLabel, type Person } from "@/lib/registry";
import { evaluate, type Member } from "@/lib/rules";
import { OFFICES } from "@/lib/season";
import { useSeason } from "@/lib/season-live";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { BookletPicker, type Book } from "./_components/booklet";
import { EligibilityCheck } from "./_components/eligibility";
import { Consents, Documents, Payment } from "./_components/finalize";
import { PersonAdder, relationWord } from "./_components/person-adder";
import { Choice, DigitsDisplay, NumberPad, PersonChip, Question } from "./_components/ui";

type Screen =
  | "intro"
  | "forWhom"
  | "otherId"
  | "companions"
  | "method"
  | "booklet"
  | "count"
  | "adder"
  | "review"
  | "terminal"
  | "needs"
  | "elderly"
  | "eligibility"
  | "consents"
  | "documents"
  | "office"
  | "payment";

const PHASES: { label: string; screens: Screen[] }[] = [
  { label: "صاحب الطلب", screens: ["intro", "forWhom", "otherId"] },
  { label: "المرافقون", screens: ["companions", "method", "booklet", "count", "adder", "review"] },
  { label: "الصحة والمرافقة", screens: ["terminal", "needs", "elderly"] },
  { label: "الأهلية", screens: ["eligibility", "consents"] },
  { label: "الوثائق والدفع", screens: ["documents", "office", "payment"] },
];

const NEEDS = [
  { key: "كرسي متحرك", emoji: "♿" },
  { key: "سكري", emoji: "🩸" },
  { key: "ضغط الدم", emoji: "❤️" },
  { key: "وجبة خاصة", emoji: "🍽️" },
  { key: "غرفة قريبة من المصعد", emoji: "🛗" },
  { key: "ضعف السمع أو البصر", emoji: "👂" },
];

const ORDINALS = ["المرافق الأول", "المرافق الثاني", "المرافق الثالث", "المرافق الرابع", "المرافق الخامس"];

export default function ApplyPage() {
  const router = useRouter();
  const toast = useToast();
  const sessionId = useStore((s) => s.sessionId)!;
  const existing = useStore((s) => s.applications[s.sessionId ?? ""]);
  const scale = useStore((s) => s.displayScale);
  const me = getPerson(sessionId)!;
  const season = useSeason();

  const [history, setHistory] = useState<Screen[]>(["intro"]);
  const screen = history[history.length - 1];
  const [members, setMembers] = useState<Member[]>([]);
  const [target, setTarget] = useState(1);
  const [adderReturn, setAdderReturn] = useState<"loop" | "booklet" | "review" | "eligibility">("loop");
  const [book, setBook] = useState<Book | null>(null);
  const [needsYes, setNeedsYes] = useState<boolean | null>(null);
  const [office, setOffice] = useState({ governorate: me.governorate, office: "" });
  const [other, setOther] = useState({ id: "", stage: "id" as "id" | "loading" | "confirm" | "otp", person: null as Person | null, otp: "", error: "" });
  // How many times the eligibility check has run — only the first run reveals row by row
  const [checks, setChecks] = useState(0);
  // Furthest phase reached — completed phases can be reopened from the progress bar
  const [maxPhase, setMaxPhase] = useState(0);

  const applicant = members.find((m) => m.relation === "self")?.person ?? null;
  const companions = members.filter((m) => m.relation !== "self");
  const result = useMemo(() => evaluate(members, season.rules), [members, season.rules]);
  const number = applicant ? applicationNumberFor(sessionId) : "";
  const receipt = `1448-R-${number.padStart(6, "0")}`;
  const scenario = DEMO_SCENARIOS.find((s) => s.id === (applicant?.id ?? sessionId));

  const go = (s: Screen) => {
    setHistory((h) => [...h, s]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  const replace = (s: Screen) => setHistory((h) => [...h.slice(0, -1), s]);

  const setSelf = (p: Person) => setMembers([{ person: p, relation: "self", relationVerified: true, needs: [] }]);
  const addMember = (m: Member) => setMembers((ms) => (ms.some((x) => x.person.id === m.person.id) ? ms : [...ms, m]));
  const removeMember = (id: string) =>
    setMembers((ms) => ms.filter((m) => m.person.id !== id).map((m) => (m.companionId === id ? { ...m, companionId: undefined } : m)));
  const patchMember = (id: string, patch: Partial<Member>) => setMembers((ms) => ms.map((m) => (m.person.id === id ? { ...m, ...patch } : m)));

  const elderly = members.filter((m) => birthYear(m.person) <= season.rules.elderlyNeedsCompanionMaxBirthYear);
  const unresolvedElderly = elderly.find((e) => !e.companionId || !members.some((m) => m.person.id === e.companionId));

  const afterHealth = () => go(elderly.length ? "elderly" : "eligibility");

  const submit = (method: "card" | "bank") => {
    const now = Date.now();
    actions.saveApplication({
      number,
      applicantId: sessionId,
      createdAt: now,
      submittedAt: now,
      mode: companions.length === 0 ? "solo" : book ? "booklet" : "national",
      forWhom: applicant?.id === sessionId ? "me" : "other",
      members,
      governorate: office.governorate,
      office: office.office || OFFICES.find((o) => o.governorate === office.governorate)?.offices[0] || "",
      receipt,
      paid: members.length * season.fees.registrationPerPerson,
      payMethod: method,
      ratings: {},
    });
    actions.logEvent({
      actor: me.firstName + " " + me.lastName,
      role: "حاج",
      action: "تقديم طلب حج",
      target: `طلب ${number}`,
      detail: `${members.length} أفراد — ${result.members.some((m) => m.checks.some((c) => c.status === "warn")) ? "يحتاج مراجعة" : "مستوفٍ تلقائياً"} — الإيصال ${receipt}`,
    });
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.35 }, colors: ["#D9C89E", "#00594F", "#289E92", "#AD9E6E", "#672146"] });
    toast({ title: `تم استلام طلبك رقم ${number}`, body: `لـ ${members.length} أفراد، وتم تسديد رسم التسجيل الأولي (الإيصال ${receipt}).`, icon: "📨", tone: "success" });
    router.push("/portal/application");
  };

  if (existing) {
    return (
      <PortalShell title="لديك طلب مُقدَّم بالفعل">
        <Card className="text-center">
          <CheckCircle2 className="mx-auto size-16 text-green-light" />
          <p className="mt-4 font-display text-2xl font-bold text-green-dark">طلب رقم {existing.number} — {existing.members.length} أفراد</p>
          <p className="mt-2 text-ink-soft">طلب واحد فقط لكل شخص في الموسم.</p>
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
    i === 0 ? "forWhom" : i === 1 ? (companions.length ? "review" : "companions") : i === 2 ? "terminal" : i === 3 ? "eligibility" : "documents";
  const canOpenPhase = (i: number) => i !== phaseIdx && i <= maxPhase && !!applicant && (i < 4 || result.eligible);

  return (
    <PortalShell
      title="طلب حج — موسم 1448هـ"
      subtitle="سؤال واحد في كل مرة. خذ وقتك، ويمكنك الرجوع متى شئت."
      aside={
        <>
          <div className="rounded-3xl border border-gold/30 bg-white p-5">
            <p className="font-display text-lg font-bold text-green-dark">ملخص الطلب</p>
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
            {members.length > 0 && (
              <p className="mt-3 border-t border-gold-light pt-3 text-sm">
                رسم التسجيل: <span className="font-bold text-green-dark">{members.length * season.fees.registrationPerPerson} $</span>
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
          <div className="grid grid-cols-5 gap-2">
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
              {screen === "intro" && (
                <Question
                  title={`أهلاً ${me.firstName}، سنقدّم طلبك معاً خطوة بخطوة`}
                  hint="سنسألك بعض الأسئلة البسيطة. بيانات مرافقيك تأتي من الشؤون المدنية، ونطبّق الشروط ونشرح لك كل شيء. يستغرق ذلك نحو خمس دقائق."
                  speak={`أهلاً ${me.firstName}، سنقدّم طلبك معاً خطوة بخطوة. سنسألك بعض الأسئلة البسيطة.`}
                >
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      { e: "🪪", t: "بطاقتك الشخصية", s: "وبطاقات مرافقيك أو دفتر العائلة" },
                      { e: "📷", t: "صور الجوازات", s: "والصور الشخصية" },
                      { e: "💳", t: `${season.fees.registrationPerPerson} دولاراً للفرد`, s: "رسم التسجيل الأولي" },
                    ].map((x, i) => (
                      <motion.div key={x.t} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08 }} className="rounded-3xl bg-sand p-5">
                        <span className="text-3xl">{x.e}</span>
                        <p className="mt-2 font-bold">{x.t}</p>
                        <p className="text-sm text-ink-soft">{x.s}</p>
                      </motion.div>
                    ))}
                  </div>
                  <Button size="xl" className="mt-8" onClick={() => go("forWhom")}>
                    لنبدأ <ArrowLeft className="size-6" />
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
                        go("companions");
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
                            replace("companions");
                          }}
                        >
                          تأكيد الموافقة <ArrowLeft className="size-6" />
                        </Button>
                      </div>
                    </Question>
                  )}
                </div>
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
                        setMembers((ms) => ms.filter((m) => m.relation === "self"));
                        go("terminal");
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
                  sample={scenario?.book ?? "45112233"}
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
                  suggestions={
                    applicant.id === "01012345412"
                      ? [
                          { id: "01012340078", label: "والدته خديجة" },
                          { id: "01012345413", label: "زوجته فاطمة" },
                          { id: "01012349901", label: "عبد الله (حجّ سابقاً)" },
                        ]
                      : applicant.id === "06055500711"
                        ? [{ id: "06055500701", label: "والدته نجاح" }]
                        : applicant.id === "02033300552"
                          ? [{ id: "02033300553", label: "أخوها مازن" }]
                          : []
                  }
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
                    <Button size="xl" onClick={() => go("terminal")}>
                      الأفراد صحيحون <ArrowLeft className="size-6" />
                    </Button>
                  </div>
                </Question>
              )}

              {screen === "terminal" && (
                <Question
                  title={members.length > 1 ? "هل يعاني أحد من المسافرين من مرض عضال؟" : "هل تعاني من مرض عضال؟"}
                  hint="المرض العضال هو المرض الخطير الذي لا يُرجى شفاؤه. أما الأمراض المزمنة المنتظمة بالدواء مثل السكري والضغط فلا تمنع السفر."
                  speak="هل يعاني أحد من المسافرين من مرض عضال؟ الأمراض المزمنة مثل السكري والضغط لا تمنع السفر."
                >
                  <Choice
                    index={0}
                    icon="🤲"
                    label="لا أحد — الحمد لله"
                    selected={members.every((m) => !m.terminalIllness)}
                    onClick={() => {
                      setMembers((ms) => ms.map((m) => ({ ...m, terminalIllness: false })));
                      setTimeout(() => go("needs"), 250);
                    }}
                  />
                  <p className="my-4 text-center font-bold text-hint">أو اختر المصاب</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {members.map((m, i) => (
                      <Choice
                        key={m.person.id}
                        index={i + 1}
                        tone="danger"
                        icon={m.person.gender === "F" ? "👩" : "👨"}
                        label={m.person.firstName}
                        description={m.terminalIllness ? "مُعلَّم: مصاب بمرض عضال" : "اضغط إن كان مصاباً"}
                        selected={!!m.terminalIllness}
                        onClick={() => patchMember(m.person.id, { terminalIllness: !m.terminalIllness })}
                      />
                    ))}
                  </div>
                  <div className="mt-8 flex justify-between gap-3">
                    <Button variant="ghost" size="lg" onClick={back}>
                      <ArrowRight className="size-5" /> رجوع
                    </Button>
                    <Button size="lg" onClick={() => go("needs")}>
                      متابعة <ArrowLeft className="size-5" />
                    </Button>
                  </div>
                </Question>
              )}

              {screen === "needs" && (
                <Question
                  title={members.length > 1 ? "هل يحتاج أحد منهم إلى رعاية خاصة؟" : "هل تحتاج إلى رعاية خاصة؟"}
                  hint="مثل الكرسي المتحرك أو الوجبات الخاصة. نراعي ذلك في الغرفة والحافلة والوجبات."
                  speak="هل يحتاج أحد منهم إلى رعاية خاصة، مثل الكرسي المتحرك أو الوجبات الخاصة؟"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Choice
                      index={0}
                      icon="👍"
                      label="لا"
                      selected={needsYes === false}
                      onClick={() => {
                        setNeedsYes(false);
                        setMembers((ms) => ms.map((m) => ({ ...m, needs: [] })));
                        setTimeout(afterHealth, 250);
                      }}
                    />
                    <Choice index={1} icon="🤝" label="نعم" selected={needsYes === true} onClick={() => setNeedsYes(true)} />
                  </div>
                  <AnimatePresence>
                    {needsYes && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="mt-6 space-y-4">
                          {members.map((m) => (
                            <div key={m.person.id} className="rounded-3xl bg-sand p-4">
                              <p className="font-bold">{m.person.firstName} <span className="text-sm font-normal text-hint">({ageOf(m.person)} عاماً)</span></p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {NEEDS.map((n) => {
                                  const on = m.needs.includes(n.key);
                                  return (
                                    <motion.button
                                      key={n.key}
                                      whileTap={{ scale: 0.94 }}
                                      onClick={() => patchMember(m.person.id, { needs: on ? m.needs.filter((x) => x !== n.key) : [...m.needs, n.key] })}
                                      className={cn("rounded-2xl border-2 px-4 py-2.5 font-semibold transition", on ? "border-green-dark bg-green-dark text-white" : "border-gold/60 bg-white hover:border-gold-dark")}
                                    >
                                      {n.emoji} {n.key}
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button size="xl" className="mt-6" onClick={afterHealth}>
                          متابعة <ArrowLeft className="size-6" />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Button variant="ghost" size="lg" className="mt-6" onClick={back}>
                    <ArrowRight className="size-5" /> رجوع
                  </Button>
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
                  key={members.map((m) => `${m.person.id}${m.companionId}${m.terminalIllness}`).join()}
                  result={result}
                  members={members}
                  rules={season.rules}
                  animate={checks === 0}
                  onContinue={() => go(companions.length ? "consents" : "documents")}
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
                  onFixHealth={() => {
                    setChecks((n) => n + 1);
                    go("terminal");
                  }}
                  onClearTerminal={(id) => {
                    setChecks((n) => n + 1);
                    patchMember(id, { terminalIllness: false });
                    toast({ title: "صُحّح الإقرار الصحي", body: "أعدنا التحقق من الأهلية فوراً.", icon: "🔄" });
                  }}
                  onChangeApplicant={() => {
                    setChecks((n) => n + 1);
                    go("forWhom");
                  }}
                />
              )}

              {screen === "consents" && <Consents members={members} onDone={() => go("documents")} />}
              {screen === "documents" && <Documents members={members} onDone={() => go("office")} />}

              {screen === "office" && (
                <Question title="نوع الطلب ومكتب التسجيل" hint="نوع طلبك هو التسجيل المباشر، ومن لا يُقبل فيه يدخل القرعة تلقائياً دون أي إجراء منك.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl bg-green-dark p-5 text-white">
                      <p className="text-sm text-gold">نوع الطلب</p>
                      <p className="mt-1 font-display text-xl font-bold">التسجيل المباشر ثم القرعة</p>
                      <p className="mt-2 text-sm leading-6 text-white/75">
                        يُرتَّب الطلب بعمر صاحب الطلب ({applicant ? ageOf(applicant) : "—"} عاماً). 35% من الحصة للأكبر سناً، ثم قرعة على 65%.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <label className="block">
                        <span className="mb-1.5 block font-bold">المحافظة</span>
                        <select value={office.governorate} onChange={(e) => setOffice({ governorate: e.target.value, office: "" })} className="h-14 w-full rounded-2xl border-2 border-gold/50 bg-white px-4 text-lg outline-none focus:border-green-light">
                          {OFFICES.map((o) => (
                            <option key={o.governorate}>{o.governorate}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block font-bold">المكتب</span>
                        <select value={office.office} onChange={(e) => setOffice({ ...office, office: e.target.value })} className="h-14 w-full rounded-2xl border-2 border-gold/50 bg-white px-4 text-lg outline-none focus:border-green-light">
                          {(OFFICES.find((o) => o.governorate === office.governorate)?.offices ?? []).map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                  <p className="mt-5 rounded-2xl bg-sand p-4 text-sm leading-7 text-ink-soft">
                    لا نطلب الآن أي شيء عن الفندق أو الرحلة أو المجموعة؛ هذه بيانات تأتي بعد القبول.
                  </p>
                  <Button size="xl" className="mt-6" onClick={() => go("payment")}>
                    إلى الدفع <ArrowLeft className="size-6" />
                  </Button>
                </Question>
              )}

              {screen === "payment" && <Payment count={members.length} receipt={receipt} onPaid={submit} />}
            </motion.div>
          </AnimatePresence>
        </Card>

        {screen !== "intro" && !["adder", "booklet", "otherId"].includes(screen) && history.length > 1 && (
          <p className="mt-4 text-center text-sm text-hint">
            <Link href="/portal" className="hover:text-ink">الخروج إلى ملفي (لن يُحفظ الطلب غير المكتمل)</Link>
          </p>
        )}
      </div>
    </PortalShell>
  );
}
