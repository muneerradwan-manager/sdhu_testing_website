"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CircleAlert,
  Landmark,
  Loader2,
  MessageSquare,
  Receipt,
  RotateCcw,
  SearchCheck,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/portal/shell";
import { DEMO_OTP, Field, OtpInput, inputClass } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { BookletPicker, type Book } from "@/app/portal/apply/_components/booklet";
import { EligibilityCheck } from "@/app/portal/apply/_components/eligibility";
import { PersonAdder } from "@/app/portal/apply/_components/person-adder";
import { PersonChip } from "@/app/portal/apply/_components/ui";
import { PayMethods } from "@/components/payment/methods";
import { SeasonPlanNote } from "@/components/payment/plan-picker";
import { firstPayment, seasonPlan } from "@/lib/installments";
import { applicationNumberFor } from "@/lib/journey";
import { useSeason } from "@/lib/season-live";
import { ageOf, fullName, isValidNationalId, lookupPerson, type Person } from "@/lib/registry";
import { evaluate, withOldestAsApplicant, type Member } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { cn, formatUSD, maskNationalId } from "@/lib/utils";
import { isTechCoordinator, logAdmin, nowMs, positionOf, useAdmin } from "../../_lib/admin";
import { blockFor, coordinatorPosting, fileApplication, filedBy, maskedPhone, type FiledApplication } from "../../_lib/coordinator";
import { AdminShell, LockedCard, ReceiptCard, SectionTitle } from "../../_components/ui";

type Step = "citizen" | "consent" | "members" | "booklet" | "adder" | "eligibility" | "office" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "citizen", label: "المواطن" },
  { key: "consent", label: "الموافقة" },
  { key: "members", label: "المرافقون" },
  { key: "eligibility", label: "الأهلية" },
  { key: "office", label: "المكتب والرسم" },
];

/**
 * مكتب المنسق التقني: يسجّل طلب حج عن مواطن يراجعه في الفرع، بالخطوات نفسها التي
 * يمرّ بها الحاج على هاتفه — لكن بموافقة المواطن برمز تحقق، وبختم اسم المنسق على الطلب.
 */
export function AdminPilgrims() {
  const admin = useAdmin()!;
  const season = useSeason();
  const toast = useToast();
  const applications = useStore((s) => s.applications);
  const admins = useStore((s) => s.admins);

  const [step, setStep] = useState<Step>("citizen");
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [citizen, setCitizen] = useState<Person | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [filed, setFiled] = useState<FiledApplication | null>(null);
  const [checks, setChecks] = useState(0);

  const mine = useMemo(() => filedBy(admin.id, applications), [admin.id, applications]);
  const [track, setTrack] = useState<"direct" | "lottery">("direct");
  // Direct acceptance age is checked here, before the citizen pays anything
  const result = useMemo(
    () => evaluate(members, season.rules, track === "direct" ? { minAge: season.acceptedDirectAge } : undefined),
    [members, season.rules, track, season.acceptedDirectAge],
  );
  const fee = members.length * season.fees.registrationPerPerson;
  // The administration sets the plan for the season — the citizen does not choose it
  const plan = seasonPlan(season.fees);
  const first = track === "direct" ? firstPayment(plan, members.length, season.fees) : 0;
  const [filedFirst, setFiledFirst] = useState(0);

  if (!isTechCoordinator(admin.profile)) {
    return (
      <AdminShell title="تسجيل الحجاج" subtitle="مكتب المنسق التقني: تسجيل طلبات الحج عن المواطنين الذين يراجعون الفرع.">
        <LockedCard
          title="هذه الشاشة للمنسق التقني"
          text="تسجيل طلب عن مواطن صلاحية تُمنح لصفة «منسق تقني» وحدها، لأنها تتعامل مع بيانات مواطنين لا يملكون حسابات بعد. اطلب الصفة في طلب المشاركة إن كانت من اختصاصك."
          href="/administrator/apply"
          cta="طلب المشاركة"
        />
      </AdminShell>
    );
  }

  const reset = () => {
    setStep("citizen");
    setId("");
    setError("");
    setCitizen(null);
    setOtp("");
    setMembers([]);
    setBook(null);
    setFiled(null);
    setTrack("direct");
    setChecks(0);
  };

  const lookup = async () => {
    setError("");
    if (!isValidNationalId(id)) return setError("الرقم الوطني يتكون من 11 رقماً.");
    const block = blockFor(id, admin.id, { applications, admins });
    if (block.kind !== "ok") return setError(block.text);
    setBusy(true);
    const person = await lookupPerson(id);
    setBusy(false);
    if (!person) return setError("لم تعثر الشؤون المدنية على هذا الرقم.");
    setCitizen(person);
    setStep("consent");
    setTimeout(() => toast({ title: "رمز موافقة المواطن", body: `وصل إلى هاتفه رمز: ${DEMO_OTP}`, icon: "💬", tone: "gold" }), 600);
  };

  const confirmConsent = () => {
    if (otp !== DEMO_OTP) {
      setOtpError(true);
      setTimeout(() => setOtpError(false), 600);
      return;
    }
    const p = citizen!;
    setMembers([{ person: p, relation: "self", relationVerified: true, needs: [] }]);
    logAdmin(admin.id, "بدء تسجيل طلب عن مواطن", fullName(p), "بعد تأكيد موافقته برمز تحقق");
    setStep("members");
  };

  // صاحب الطلب هو الأكبر سناً: إضافة من هو أكبر من المواطن تنقل الطلب إلى اسمه
  const addMember = (m: Member) => {
    if (members.some((x) => x.person.id === m.person.id)) return;
    const { members: next, moved } = withOldestAsApplicant([...members, m]);
    setMembers(next);
    if (moved) toast({ title: `أصبح الطلب باسم ${fullName(moved.person)}`, body: `الأكبر سناً في الطلب (${ageOf(moved.person)} عاماً). يبقى الطلب في حساب ${citizen?.firstName}.`, icon: "👴", tone: "gold" });
  };
  const posting = coordinatorPosting();
  const removeMember = (memberId: string) =>
    setMembers((ms) => ms.filter((m) => m.person.id !== memberId).map((m) => (m.companionId === memberId ? { ...m, companionId: undefined } : m)));
  const patchMember = (memberId: string, patch: Partial<Member>) =>
    setMembers((ms) => ms.map((m) => (m.person.id === memberId ? { ...m, ...patch } : m)));

  const submit = (payMethod: "shamcash" | "bank") => {
    const receipt = fileApplication({
      citizen: citizen!,
      members,
      payMethod,
      feePerPerson: season.fees.registrationPerPerson,
      track,
      plan,
      coordinator: { id: admin.id, name: admin.name, position: positionOf(admin.profile) },
      at: nowMs(),
    });
    setFiled(receipt);
    setFiledFirst(first);
    setStep("done");
    toast({
      title: `سُجّل الطلب ${receipt.number}`,
      body: `${fullName(citizen!)} و${members.length - 1} مرافقين — الإيصال ${receipt.receipt}`,
      icon: "📨",
      tone: "success",
    });
  };

  return (
    <AdminShell
      title="تسجيل الحجاج"
      subtitle={
        <>
          يراجعك مواطن لا يملك هاتفاً ذكياً أو يصعب عليه التسجيل بنفسه، فتفتح له الطلب من مكتبك. لا يكتمل أي طلب قبل موافقته
          برمز يصل إلى هاتفه، ويبقى اسمك مختوماً على الطلب وفي سجل الأحداث.
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {step !== "done" && <Stepper current={step} />}

          <AnimatePresence mode="wait">
            {/* ── 1) المواطن ── */}
            {step === "citizen" && (
              <Pane key="citizen">
                <Card>
                  <SectionTitle icon={SearchCheck}>ابحث عن المواطن في الشؤون المدنية</SectionTitle>
                  <p className="mt-2 leading-8 text-ink-soft">أدخل الرقم الوطني كما هو في هويته. تظهر بياناته من السجل المدني، ولا تُدخلها يدوياً.</p>
                  <div className="mt-6 flex flex-wrap items-end gap-3">
                    <div className="min-w-64 flex-1">
                      <Field label="الرقم الوطني" error={error}>
                        <input
                          value={id}
                          onChange={(e) => setId(e.target.value.replace(/\D/g, "").slice(0, 11))}
                          inputMode="numeric"
                          dir="ltr"
                          placeholder="06055500711"
                          className={cn(inputClass, "text-center font-mono text-xl tracking-[.3em]")}
                        />
                      </Field>
                    </div>
                    <Button size="lg" onClick={() => void lookup()} disabled={busy || id.length !== 11}>
                      {busy ? <Loader2 className="size-5 animate-spin" /> : <SearchCheck className="size-5" />}
                      {busy ? "نسأل الشؤون المدنية…" : "بحث"}
                    </Button>
                  </div>

                  <div className="mt-6 rounded-2xl border border-dashed border-gold/50 bg-sand/60 p-4">
                    <p className="text-sm font-bold text-green-dark">أرقام جاهزة للتجربة</p>
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {[
                        { id: "01012340078", note: "خديجة الخطيب — 78 عاماً، تحتاج مرافقاً مسمّى" },
                        { id: "02033300552", note: "ريم النجار — دون 44 عاماً، تحتاج محرماً" },
                        { id: "01011100208", note: "ياسين العمر — مسجّل في طلب آخر" },
                        { id: "01012345412", note: "محمد الخطيب — رب أسرة بدفتر عائلة" },
                      ].map((x) => (
                        <li key={x.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setId(x.id);
                              setError("");
                            }}
                            className="w-full rounded-xl bg-white p-2.5 text-right shadow-sm transition hover:shadow-md"
                          >
                            <span className="block font-mono text-sm font-bold text-green-dark" dir="ltr">
                              {x.id}
                            </span>
                            <span className="block text-xs text-ink-soft">{x.note}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </Pane>
            )}

            {/* ── 2) موافقة المواطن ── */}
            {step === "consent" && citizen && (
              <Pane key="consent">
                <Card>
                  <SectionTitle icon={ShieldCheck}>موافقة المواطن</SectionTitle>
                  <div className="mt-4 rounded-2xl bg-sand/70 p-4">
                    <PersonChip name={fullName(citizen)} gender={citizen.gender} sub={`${ageOf(citizen)} عاماً — ${citizen.governorate} — ${citizen.registry}`} />
                    <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                      {[
                        ["الرقم الوطني", maskNationalId(citizen.id)],
                        ["تاريخ الميلاد", citizen.birthDate],
                        ["الحالة الاجتماعية", citizen.maritalStatus],
                        ["دفتر العائلة", citizen.familyBookNo],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3 border-b border-gold/20 py-1">
                          <dt className="text-hint">{k}</dt>
                          <dd className="font-semibold text-ink" dir={k === "تاريخ الميلاد" ? "ltr" : undefined}>
                            {v}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <p className="mt-5 flex items-start gap-2 rounded-2xl bg-maroon/8 p-4 text-sm leading-7 text-maroon">
                    <MessageSquare className="mt-0.5 size-5 shrink-0" />
                    أُرسل رمز تحقق إلى هاتف المواطن <b dir="ltr">{maskedPhone(citizen)}</b>. اطلب منه الرمز وأدخله أمامه — بلا الرمز لا يُفتح الطلب.
                  </p>

                  <div className="mt-5">
                    <Field label="رمز الموافقة">
                      <OtpInput value={otp} onChange={setOtp} invalid={otpError} />
                    </Field>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button size="lg" onClick={confirmConsent} disabled={otp.length < 4}>
                      <BadgeCheck className="size-5" /> تأكيد الموافقة ومتابعة
                    </Button>
                    <Button size="lg" variant="outline" onClick={reset}>
                      <ArrowRight className="size-5" /> مواطن آخر
                    </Button>
                  </div>
                </Card>
              </Pane>
            )}

            {/* ── 3) المرافقون ── */}
            {step === "members" && citizen && (
              <Pane key="members">
                <Card>
                  <SectionTitle icon={UsersRound} action={<Badge tone="gold">{members.length} من {season.rules.maxCompanionsFamily + 1}</Badge>}>
                    من سيحج مع {citizen.firstName}؟
                  </SectionTitle>
                  <p className="mt-2 leading-8 text-ink-soft">
                    أضف المرافقين من دفتر العائلة أو بالرقم الوطني. صاحب الطلب ومعه حتى {season.rules.maxCompanions} أشخاص، وترتفع إلى{" "}
                    {season.rules.maxCompanionsFamily} إن كان رجلاً يصطحب زوجته وأولاده.
                  </p>

                  <ul className="mt-5 space-y-2">
                    {members.map((m) => (
                      <li key={m.person.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gold/30 bg-white p-3">
                        <PersonChip name={fullName(m.person)} gender={m.person.gender} sub={`${ageOf(m.person)} عاماً`} />
                        <span className="mr-auto flex items-center gap-2">
                          {m.relation === "self" ? (
                            <Badge tone="green">صاحب الطلب</Badge>
                          ) : (
                            <>
                              <Badge>{m.relationVerified ? "مؤكدة من السجل" : "قرابة مصرّح بها"}</Badge>
                              <button onClick={() => removeMember(m.person.id)} className="rounded-lg px-2 py-1 text-xs font-bold text-maroon hover:bg-maroon/10">
                                إزالة
                              </button>
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => setStep("booklet")}>
                      <Landmark className="size-5" /> من دفتر العائلة
                    </Button>
                    <Button variant="outline" onClick={() => setStep("adder")}>
                      <UserPlus className="size-5" /> بالرقم الوطني
                    </Button>
                    <Button
                      size="lg"
                      className="mr-auto"
                      onClick={() => {
                        setChecks((c) => c + 1);
                        setStep("eligibility");
                      }}
                    >
                      افحص الأهلية <ArrowLeft className="size-5" />
                    </Button>
                  </div>
                </Card>
              </Pane>
            )}

            {/* دفتر العائلة */}
            {step === "booklet" && citizen && (
              <Pane key="booklet">
                <BookletPicker
                  applicant={citizen}
                  book={book}
                  setBook={setBook}
                  samples={[{ no: citizen.familyBookNo, label: `دفتر ${fullName(citizen)}` }]}
                  members={members}
                  onToggle={(m, selected) => (selected ? addMember(m) : removeMember(m.person.id))}
                  onAddOutside={() => setStep("adder")}
                  onBack={() => setStep("members")}
                  onDone={() => setStep("members")}
                />
              </Pane>
            )}

            {/* إضافة بالرقم الوطني */}
            {step === "adder" && citizen && (
              <Pane key="adder">
                <PersonAdder
                  applicant={citizen}
                  applicantIsMe={false}
                  existingIds={members.map((m) => m.person.id)}
                  ordinal={`المرافق ${members.length}`}
                  onAdd={(m) => {
                    addMember(m);
                    setStep("members");
                  }}
                  onCancel={() => setStep("members")}
                />
              </Pane>
            )}

            {/* ── 4) الأهلية ── */}
            {step === "eligibility" && (
              <Pane key="eligibility">
                <EligibilityCheck
                  result={result}
                  members={members}
                  rules={season.rules}
                  animate={checks <= 1}
                  onContinue={() => setStep("office")}
                  onRemove={removeMember}
                  onAddPerson={() => setStep("adder")}
                  onFixCompanion={(elderlyId) => {
                    const other = members.find((m) => m.person.id !== elderlyId && ageOf(m.person) >= 17);
                    if (other) patchMember(elderlyId, { companionId: other.person.id });
                    else {
                      toast({ title: "لا مرافق متاح", body: "أضف مرافقاً بالغاً أولاً", tone: "warning", icon: "⚠️" });
                      setStep("adder");
                    }
                  }}
                  onChangeApplicant={() => setStep("members")}
                  onSwitchToLottery={() => {
                    setTrack("lottery");
                    toast({ title: "حُوّل الطلب إلى التسجيل على القرعة", body: "رسم التسجيل فقط الآن، والدفعة الأولى عند ظهور الاسم.", icon: "🎟️", tone: "gold" });
                  }}
                />
              </Pane>
            )}

            {/* ── 5) المكتب والرسم ── */}
            {step === "office" && citizen && (
              <Pane key="office">
                <Card>
                  <SectionTitle icon={Building2}>نوع التسجيل والدفع</SectionTitle>
                  <p className="mt-2 leading-8 text-ink-soft">
                    تسجيل عادي على القبول المباشر أو على القرعة، يتبع مكتبك ({posting.office}). لا يدخل الحاج أي مجموعة الآن: في مرحلة التفويج يختار مجموعته، فإن اختار مجموعتك سجّلته فيها من «حجاج المجموعة».
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ["direct", "التسجيل على القبول المباشر", "رسم التسجيل + الدفعة الأولى من تكلفة الحج"],
                        ["lottery", "التسجيل على القرعة", "رسم التسجيل فقط — الدفعة الأولى عند ظهور الاسم"],
                      ] as const
                    ).map(([k, label, d]) => {
                      const tooYoung = k === "direct" && !!members[0] && ageOf(members[0].person) < season.acceptedDirectAge;
                      return (
                        <button
                          key={k}
                          type="button"
                          disabled={tooYoung}
                          onClick={() => setTrack(k)}
                          className={cn("rounded-2xl border-2 p-4 text-right transition disabled:cursor-not-allowed disabled:opacity-45", track === k ? "border-green-dark bg-green-dark text-white" : "border-gold/40 bg-white hover:border-gold-dark")}
                        >
                          <span className="block font-bold">{label}</span>
                          <span className={cn("text-xs", track === k ? "text-white/75" : "text-ink-soft")}>
                            {tooYoung ? `غير متاح: عمر صاحب الطلب ${ageOf(members[0].person)} والقبول المباشر لمن بلغ ${season.acceptedDirectAge} عاماً فأكثر` : d}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-5">
                    <SeasonPlanNote people={members.length} fees={season.fees} dueNowLabel={track === "direct" ? "الآن مع رسم التسجيل" : "عند ظهور الاسم في القرعة"} />
                  </div>
                  {members[0] && members[0].person.id !== citizen.id && (
                    <p className="mt-4 rounded-2xl bg-gold/20 p-3 text-sm leading-7 text-ink">
                      صاحب الطلب: <b>{fullName(members[0].person)}</b> لأنه الأكبر سناً ({ageOf(members[0].person)} عاماً). يبقى الطلب في حساب {citizen.firstName} الذي وافق برمز التحقق.
                    </p>
                  )}

                  <div className="mt-6 rounded-2xl bg-green-dark p-5 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-white/70">المطلوب الآن</p>
                        <p className="font-display text-3xl font-bold text-gold">{formatUSD(fee + first)}</p>
                      </div>
                      <p className="text-sm text-white/75">
                        رسم التسجيل {formatUSD(fee)}
                        {first > 0 && ` + الدفعة الأولى ${formatUSD(first)}`}
                      </p>
                    </div>
                    <p className="mt-3 rounded-xl bg-white/10 p-3 text-xs leading-6 text-white/80">
                      يدفع المواطن بنفسه عبر شام كاش من هاتفه، أو في المصرف المعتمد ويُرفع إشعار الدفع. لا يقبض المنسق أي مبلغ نقداً، ويصدر إيصال رقمي باسم المواطن.
                    </p>
                  </div>

                  <div className="mt-6">
                    <PayMethods
                      amount={fee + first}
                      reference={`1448-R-${applicationNumberFor(citizen.id).padStart(6, "0")}`}
                      bankReference={`1448-BANK-${applicationNumberFor(citizen.id).padStart(6, "0")}`}
                      cta="تأكيد الدفع وتسجيل الطلب —"
                      onConfirm={submit}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button size="lg" variant="ghost" onClick={() => setStep("eligibility")}>
                      <ArrowRight className="size-5" /> رجوع
                    </Button>
                  </div>
                </Card>
              </Pane>
            )}

            {/* ── تم ── */}
            {step === "done" && filed && citizen && (
              <Pane key="done">
                <Card className="text-center">
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 14 }}
                    className="mx-auto grid size-20 place-items-center rounded-3xl bg-green-dark text-gold"
                  >
                    <BadgeCheck className="size-10" />
                  </motion.span>
                  <h2 className="mt-5 font-display text-2xl font-bold text-green-dark md:text-3xl">سُجّل الطلب رقم {filed.number}</h2>
                  <p className="mt-2 leading-8 text-ink-soft">
                    باسم <b className="text-green-dark">{fullName(citizen)}</b> و{members.length - 1} مرافقين. صار للمواطن حساب على المنصة يدخل إليه برقمه
                    الوطني ليتابع طلبه بنفسه.
                  </p>

                  <ReceiptCard
                    className="mt-7"
                    receipt={filed.receipt}
                    item={filedFirst ? "رسم التسجيل + الدفعة الأولى" : "رسم تسجيل طلب حج"}
                    amount={fee + filedFirst}
                    lines={[
                      ["صاحب الطلب", fullName(citizen)],
                      ["عدد الأفراد", String(members.length)],
                      ["سجّله", `${admin.name} — منسق تقني`],
                    ]}
                  />

                  <div className="mt-7 flex flex-wrap justify-center gap-3">
                    <Button size="lg" onClick={reset}>
                      <UserPlus className="size-5" /> سجّل مواطناً آخر
                    </Button>
                    <Link
                      href="/login"
                      className="inline-flex h-12 items-center gap-2 rounded-2xl border-2 border-green-dark px-5 font-bold text-green-dark transition hover:bg-green-dark hover:text-white"
                    >
                      افتح حساب الحاج للتأكد <ArrowLeft className="size-5" />
                    </Link>
                  </div>
                </Card>
              </Pane>
            )}
          </AnimatePresence>
        </div>

        {/* ── لوحة جانبية: التعيين وما سجّله ── */}
        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <Posting />
          <FiledList mine={mine} onReset={reset} />
        </aside>
      </div>
    </AdminShell>
  );
}

function Pane({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }}>
      {children}
    </motion.div>
  );
}

function Stepper({ current }: { current: Step }) {
  // خطوتا دفتر العائلة والإضافة بالرقم الوطني تقعان داخل خطوة «المرافقون»
  const key: Step = current === "booklet" || current === "adder" ? "members" : current;
  const index = STEPS.findIndex((s) => s.key === key);
  return (
    <ol className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const state = i < index ? "done" : i === index ? "current" : "next";
        return (
          <li
            key={s.key}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-bold ring-1",
              state === "current" && "bg-gold text-ink ring-gold",
              state === "done" && "bg-green-dark/10 text-green-dark ring-green-dark/20",
              state === "next" && "bg-white/70 text-hint ring-gold/30",
            )}
          >
            <span className={cn("grid size-6 place-items-center rounded-full text-xs", state === "current" ? "bg-ink/15" : "bg-black/5")}>
              {state === "done" ? "✓" : i + 1}
            </span>
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}

function Posting() {
  const admin = useAdmin()!;
  const g = admin.profile?.group;
  return (
    <div className="relative overflow-hidden rounded-3xl bg-green-dark p-5 text-white">
      <div className="bg-pattern absolute inset-0 opacity-15" />
      <div className="relative">
        <p className="text-xs font-bold text-gold">تعييني هذا الموسم</p>
        <p className="mt-1 font-display text-xl font-bold">منسق تقني</p>
        {g && <p className="mt-1 text-sm text-white/75">المجموعة {g.number} — تكتل النور لخدمة الحجاج</p>}
        <ul className="mt-4 space-y-2 text-sm text-white/85">
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" /> أسجّل عن المواطن بموافقته برمز تحقق
          </li>
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" /> اسمي يُختم على كل طلب سجّلته
          </li>
          <li className="flex gap-2">
            <UsersRound className="mt-0.5 size-4 shrink-0 text-gold" /> التسجيل هنا لا يضع أحداً في مجموعتي؛ في مرحلة التفويج أسجّل في مجموعتي من يختارها، وأوقّع معه العقد
          </li>
          <li className="flex gap-2">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-gold" /> لا أقبض أي مبلغ خارج الإيصال الرقمي
          </li>
        </ul>
      </div>
    </div>
  );
}

function FiledList({ mine, onReset }: { mine: ReturnType<typeof filedBy>; onReset: () => void }) {
  return (
    <div className="rounded-3xl border border-gold/35 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-display font-bold text-green-dark">
          <Receipt className="size-5 text-gold-dark" /> سجّلتُ {mine.length} طلبات
        </p>
        <button onClick={onReset} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-hint transition hover:bg-sand hover:text-green-dark">
          <RotateCcw className="size-3.5" /> بدء طلب جديد
        </button>
      </div>

      {mine.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-gold/40 bg-sand/50 p-4 text-sm leading-7 text-ink-soft">
          لم تسجّل أي طلب بعد. ابدأ بالرقم الوطني لمواطن يراجع الفرع.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {mine.map((a) => {
            const applicant = a.members.find((m) => m.relation === "self")?.person;
            return (
              <li key={a.number} className="rounded-2xl bg-sand/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-green-dark">{applicant ? fullName(applicant) : a.applicantId}</span>
                  <span className="font-mono text-xs text-hint" dir="ltr">
                    #{a.number}
                  </span>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-ink-soft">
                  <span>{a.members.length} أفراد</span>
                  <span>{a.office}</span>
                  <span className="font-mono" dir="ltr">
                    {a.receipt}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
