"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowDown, Check, FileSignature, ScrollText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { fullName } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Question } from "../../../apply/_components/ui";
import { PayMethods, payMethodLabel, type PayMethod } from "@/components/payment/methods";
import { SeasonPlanNote } from "@/components/payment/plan-picker";
import { firstPayment, planLabel, seasonPlan } from "@/lib/installments";
import { mergeSeason } from "@/lib/season-live";
import { usePinnedVersion } from "@/lib/registration/client";
import { run } from "@/lib/registration/run";
import { payFirstInstallment } from "@/lib/registration/service";
import { formatUSD } from "@/lib/utils";
import { initialDocuments, receiptBase } from "./model";
import { applicantOf, logPilgrim, type StepProps } from "./shared";
import { PayWindow } from "./pay-window";
import { SEASON } from "@/lib/season";

/** Stands in the instructions for the sentence on the installments, written from the application's own schedule */
const PLAN_LINE = "{plan}";

/** The installments as the instructions say them: the season's two by default, or the schedule the application keeps */
function planLine(schedule: { label: string; dueLabel: string }[] | undefined) {
  if (!schedule || schedule.length === 2) return "تكلفة الحج هذا الموسم على دفعتين كما حددت الإدارة: الأولى مع التسجيل على القبول المباشر أو عند تثبيت التسجيل لمن قُبل بالقرعة، والثانية بعد اعتماد عقدك مع المجموعة.";
  if (schedule.length === 1) return "تكلفة الحج هذا الموسم دفعة واحدة كاملة كما حددت الإدارة: مع التسجيل على القبول المباشر أو عند تثبيت التسجيل لمن قُبل بالقرعة.";
  return `تكلفة الحج هذا الموسم على ${schedule.length} دفعات كما حددت الإدارة: ${schedule[0].label} مع التسجيل على القبول المباشر أو عند تثبيت التسجيل لمن قُبل بالقرعة، ثم ${schedule.slice(1).map((l) => `${l.label} (${l.dueLabel})`).join("، ثم ")}.`;
}

const INSTRUCTIONS: { title: string; items: string[] }[] = [
  {
    title: "أولاً: المواعيد",
    items: [
      "تأكيد القبول ورفع الصورة الشخصية: حتى 27 تشرين الأول (16 جمادى الأولى 1448). والمقبول بالقرعة يثبّت تسجيله بدفع الدفعة الأولى مع التأكيد.",
      "إلحاقك بمجموعة: 12 تشرين الثاني – 15 كانون الثاني (موعد تقديري). تتفق مع المجموعة، وتوقّع عقدك معها في المكتب، فيلحقك موظف المكتب بها.",
      PLAN_LINE,
      "من لا يؤكد أو لا يسدد في المهلة يسقط قبوله، ويعود مقعده إلى الإدارة.",
    ],
  },
  {
    title: "ثانياً: الوثائق",
    items: [
      "بعد التأكيد والدفعة الأولى ترفع لكل فرد الصورة الشخصية وحدها، وجواز السفر بعد اكتمال الدفعة الثانية. لم يُطلب شيء منهما عند التسجيل.",
      "يجب أن يكون جواز السفر سارياً 6 أشهر على الأقل بعد موعد العودة (23 ذو الحجة 1448).",
      "لا تُطلب أي وثيقة طبية قبل الإلحاق بمجموعة. بعد اعتماد عقدك مع المجموعة تُرفع شهادات اللقاحات (كورونا والحمى الشوكية إلزاميان، والإنفلونزا لمن بلغ 60 عاماً) والتقرير الطبي.",
    ],
  },
  {
    title: "ثالثاً: المجموعة والتكاليف والملف الطبي",
    items: [
      "لا تختار المجموعة من المنصة: تتفق مع مجموعة، وتوقّع عقدك معها في المكتب، فيلحقك موظف المكتب بها. لا تكون في أي مجموعة قبل ذلك، ولو سجّلك على الحج رئيس مجموعة أو منسق.",
      "الانتقال إلى مجموعة أخرى بعقد جديد ترفعه المجموعة الجديدة ويعتمده المكتب، والطلب العائلي ينتقل كاملاً أو لا ينتقل.",
      "لكل دفعة من تكلفة الحج، وللهدي وللسكن الخاص إن اخترتموه، إيصال مستقل.",
      "الوثائق الطبية تُطلب بعد اعتماد عقدك مع المجموعة ودفع الدفعة المستحقة عندها، ويسجّل منسق المجموعة معلوماتك الصحية.",
      "لا تدفع أي مبلغ لجهة غير معتمدة. الإيصالات الرسمية فقط تصدر من المنصة.",
    ],
  },
  {
    title: "رابعاً: السفر والسلامة",
    items: [
      "أحضر أدويتك بكمية تكفي 35 يوماً مع وصفة طبية.",
      "التزم بتعليمات رئيس المجموعة ومواعيد التجمّع، وارتدِ سوار الحاج دائماً.",
      "المرافق الرسمي لكبير السن مسؤول عن مرافقته طوال الرحلة، ولا يُنقل إلى مجموعة أخرى دونه.",
      "زر الطوارئ في التطبيق يصل مباشرة إلى الفريق الطبي ورئيس المجموعة وغرفة العمليات.",
    ],
  },
];

export function StepConfirm({ app, post, sessionId, stepLabel }: StepProps) {
  const toast = useToast();
  const [progress, setProgress] = useState(0);
  const [agree, setAgree] = useState(false);
  const [signing, setSigning] = useState(false);
  const readAll = progress >= 0.98;
  const applicant = applicantOf(app);

  if (post.confirmedAt && !app.firstPaid) return <FirstInstallment app={app} stepLabel={stepLabel} />;

  const confirm = () => {
    setSigning(true);
    setTimeout(() => {
      actions.setPost(sessionId, { confirmedAt: Date.now(), documents: { ...initialDocuments(app.members), ...post.documents } });
      logPilgrim(app, "تأكيد القبول والتوقيع على التعليمات", `${app.members.length} أفراد`);
      toast({ title: "تم تأكيد قبولك", body: app.firstPaid ? "ارفع الآن الصورة الشخصية لكل فرد — المهلة حتى 27 تشرين الأول. الجواز بعد الدفعة الثانية." : "بقي أن تدفع الدفعة الأولى.", icon: "✅", tone: "success" });
    }, 1400);
  };

  return (
    <Question
      step={stepLabel ?? "الخطوة 1 من 7"}
      title="أكّد قبول الحج لجميع أفراد الطلب"
      hint="اقرأ التعليمات الرسمية حتى النهاية، ثم وقّع عليها إلكترونياً."
      speak="أكّد قبول الحج لجميع أفراد الطلب. اقرأ التعليمات الرسمية حتى النهاية، ثم وقّع عليها إلكترونياً. إذا لم تؤكد في المهلة يسقط قبولك."
    >
      <div className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-maroon/25 bg-maroon/5 p-4 text-maroon">
        <AlertTriangle className="mt-1 size-6 shrink-0" />
        <p className="text-lg font-bold leading-8">تنبيه: من لا يؤكد قبوله قبل 27 تشرين الأول يسقط قبوله.</p>
      </div>

      {/* Official document */}
      <div className="overflow-hidden rounded-3xl border border-gold/50 bg-white shadow-lg">
        <div className="flex items-center justify-between gap-3 bg-green-dark px-5 py-4 text-white">
          <span className="flex items-center gap-2 font-bold">
            <ScrollText className="size-5 text-gold" /> التعليمات والشروط الرسمية — موسم 1448هـ
          </span>
          <span className="font-mono text-sm text-gold">{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-1.5 bg-gold-light">
          <motion.div className="h-full bg-gradient-to-l from-green-light to-gold-dark" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.2 }} />
        </div>
        <div
          className="relative max-h-80 overflow-y-auto px-6 py-5 text-lg leading-9"
          onScroll={(e) => {
            const el = e.currentTarget;
            const p = el.scrollHeight <= el.clientHeight ? 1 : el.scrollTop / (el.scrollHeight - el.clientHeight);
            setProgress((old) => Math.max(old, Math.min(1, p)));
          }}
        >
          <p className="text-center font-display text-xl font-bold text-green-dark">بسم الله الرحمن الرحيم</p>
          <p className="mt-2 text-center text-ink-soft">
            إلى الحاج {fullName(applicant.person)} وأفراد الطلب رقم {app.number}
          </p>
          {INSTRUCTIONS.map((sec) => ({ ...sec, items: sec.items.map((it) => (it === PLAN_LINE ? planLine(app.policy?.fees.schedule) : it)) })).map((s) => (
            <div key={s.title} className="mt-5">
              <p className="font-bold text-gold-dark">{s.title}</p>
              <ol className="mt-1 list-inside list-decimal space-y-1 text-ink">
                {s.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ol>
            </div>
          ))}
          <p className="mt-6 rounded-2xl bg-sand p-4 text-center font-bold text-green-dark">نهاية الوثيقة — تقبّل الله منا ومنكم</p>
        </div>
        <AnimatePresence>
          {!readAll && (
            <motion.p exit={{ opacity: 0, height: 0 }} className="flex items-center justify-center gap-2 border-t border-gold-light bg-sand/70 py-3 font-semibold text-gold-dark">
              <motion.span animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                <ArrowDown className="size-5" />
              </motion.span>
              مرّر إلى الأسفل حتى نهاية الوثيقة
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* E-sign */}
      <button
        type="button"
        disabled={!readAll}
        onClick={() => setAgree((a) => !a)}
        className={cn(
          "mt-5 flex w-full items-center gap-4 rounded-3xl border-2 p-5 text-right transition disabled:cursor-not-allowed disabled:opacity-45",
          agree ? "border-green-dark bg-green-dark/5" : "border-gold/60 bg-white hover:border-gold-dark",
        )}
        aria-pressed={agree}
      >
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl border-2 transition", agree ? "border-green-dark bg-green-dark text-white" : "border-gold-dark bg-white")}>
          <AnimatePresence>{agree && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="size-6" /></motion.span>}</AnimatePresence>
        </span>
        <span className="text-lg font-bold leading-8">
          قرأت التعليمات وأوافق عليها، وأؤكد قبول الحج لجميع أفراد الطلب ({app.members.map((m) => m.person.firstName).join("، ")})
        </span>
      </button>

      <Button size="xl" className="mt-6 w-full" disabled={!readAll || !agree || signing} onClick={confirm}>
        {signing ? (
          <>
            <motion.span animate={{ rotate: [0, -12, 12, 0] }} transition={{ repeat: Infinity, duration: 0.6 }}>
              <FileSignature className="size-6" />
            </motion.span>
            جارٍ التوقيع الإلكتروني...
          </>
        ) : (
          <>
            <FileSignature className="size-6" /> أؤكد وأوقّع إلكترونياً
          </>
        )}
      </Button>
    </Question>
  );
}

/**
 * المقبول بالقرعة: يدفع الآن الدفعة الأولى (أو التكلفة كاملة إن قررت الإدارة دفعة واحدة) — الخطة
 * تحددها الإدارة للموسم ولا يختارها الحاج. من نقل طلبه من القبول المباشر إلى القرعة تكون دفعته
 * الأولى مدفوعة مسبقاً (رصيد)، فلا يصل إلى هنا.
 */
function FirstInstallment({ app, stepLabel }: { app: StepProps["app"]; stepLabel?: string }) {
  const toast = useToast();
  // The installments of the application's own version, at the season's cost in force when it confirms
  const version = usePinnedVersion(app.configVersion, app.season);
  const overrides = useStore((s) => s.season);
  const fees = app.policy?.fees ?? mergeSeason(overrides, version.config.payments).fees;
  const plan = seasonPlan(fees);
  const n = app.members.length;
  const amount = firstPayment(plan, n, fees);
  const post = useStore((s) => s.post[app.applicantId]);
  const receipt = `${receiptBase(app)}-1`;

  const pay = (m: PayMethod) => {
    // The service computes the amount itself from the application's terms and records the payment
    const r = run((s) => payFirstInstallment(s, app.applicantId, m, Date.now()));
    if (!r.ok) {
      toast({ title: "لم يُسجَّل الدفع", body: r.errors[0].message, icon: "⚠️", tone: "gold" });
      return;
    }
    logPilgrim(app, "دفع الدفعة الأولى بعد القبول بالقرعة", `${planLabel(plan, fees)} — ${formatUSD(r.value.firstPaid!.amount)} — ${payMethodLabel(m)} — الإيصال ${receipt}`);
    toast({ title: "تم دفع الدفعة الأولى", body: `الإيصال ${receipt}. ارفع الآن الصورة الشخصية لكل فرد؛ الجواز بعد الدفعة الثانية.`, icon: "🧾", tone: "success" });
  };

  return (
    <Question
      step={stepLabel ?? "الخطوة 1 من 7"}
      title={plan === 1 ? "ادفع تكلفة الحج كاملة" : "ادفع الدفعة الأولى"}
      hint={plan === 1 ? "قُبلت بالقرعة. ثبّت تسجيلك: حددت الإدارة لهذا الموسم دفعة واحدة، فتُدفع تكلفة الحج كاملة الآن." : "قُبلت بالقرعة، فثبّت تسجيلك بالدفعة الأولى من تكلفة الحج قبل 27 تشرين الأول. الدفعة الثانية بعد اعتماد عقدك مع المجموعة."}
      speak="قُبلت بالقرعة. ثبّت تسجيلك بدفع الدفعة الأولى من تكلفة الحج."
    >
      <SeasonPlanNote people={n} fees={fees} dueNowLabel="الآن" />
      <div className="mt-6">
        <PayWindow
          what={plan === 1 ? "دفع تكلفة الحج" : "الدفعة الأولى"}
          when={`لتثبيت تسجيل المقبولين بالقرعة (${SEASON.windows.lottery.confirm})`}
          opened={!!post?.windowsOpened?.first}
          onOpen={() => {
            actions.setPost(app.applicantId, { windowsOpened: { ...post?.windowsOpened, first: Date.now() } });
            logPilgrim(app, "محاكاة: فُتح موعد الدفعة الأولى");
          }}
        >
          <PayMethods amount={amount} reference={receipt} bankReference={receipt.replace("-P-", "-BANK-")} cta={plan === 1 ? "ادفع التكلفة كاملة —" : "ادفع الدفعة الأولى —"} onConfirm={pay} methods={(["shamcash", "bank"] as const).filter((x) => version.config.payments.methods[x])} />
        </PayWindow>
      </div>
    </Question>
  );
}
