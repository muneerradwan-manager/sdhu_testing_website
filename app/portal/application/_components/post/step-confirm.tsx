"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowDown, Check, FileSignature, ScrollText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { fullName } from "@/lib/registry";
import { actions } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Question } from "../../../apply/_components/ui";
import { PayMethods, payMethodLabel, type PayMethod } from "@/components/payment/methods";
import { SeasonPlanNote } from "@/components/payment/plan-picker";
import { firstPayment, planLabel, seasonPlan } from "@/lib/installments";
import { useSeason } from "@/lib/season-live";
import { formatUSD } from "@/lib/utils";
import { initialDocuments, receiptBase } from "./model";
import { applicantOf, logPilgrim, type StepProps } from "./shared";

const INSTRUCTIONS: { title: string; items: string[] }[] = [
  {
    title: "أولاً: المواعيد",
    items: [
      "تأكيد القبول ورفع الصورة الشخصية والجواز: حتى 25 شعبان 1448. والمقبول بالقرعة يدفع الدفعة الأولى مع التأكيد.",
      "مرحلة التفويج إلى المجموعات: 2 – 25 شعبان 1448.",
      "تكلفة الحج هذا الموسم على دفعتين كما حددت الإدارة: الأولى مع التسجيل على القبول المباشر أو عند ظهور الاسم في القرعة، والثانية عند الانضمام إلى مجموعة.",
      "من لا يؤكد أو لا يسدد في المهلة يُحوَّل مقعده إلى قائمة الاحتياط تلقائياً.",
    ],
  },
  {
    title: "ثانياً: الوثائق",
    items: [
      "بعد التأكيد ترفع لكل فرد: الصورة الشخصية وجواز السفر. لم يُطلب شيء منهما عند التسجيل.",
      "يجب أن يكون جواز السفر سارياً 6 أشهر على الأقل بعد موعد العودة (23 ذو الحجة 1448).",
      "لا تُطلب أي وثيقة طبية قبل مرحلة التفويج. بعد الانضمام إلى مجموعة تُرفع شهادات اللقاحات (كورونا والحمى الشوكية إلزاميان، والإنفلونزا لمن بلغ 60 عاماً) والتقرير الطبي.",
    ],
  },
  {
    title: "ثالثاً: المجموعة والتكاليف والملف الطبي",
    items: [
      "في مرحلة التفويج تتصفّح دليل المجموعات على المنصة وتتواصل مع المجموعة التي تناسبك، فيسجّلك منسقها فيها وتوقّعان عقد الحاج مع المجموعة. لا تنضم إلى أي مجموعة قبل ذلك، حتى لو سجّل طلبك منسق تقني.",
      "يمكن الانتقال بين المجموعات خلال مرحلة التفويج، والطلب العائلي ينتقل كاملاً أو لا ينتقل.",
      "لكل دفعة من تكلفة الحج، وللهدي وفارق الغرفة الخاصة، إيصال مستقل.",
      "الوثائق الطبية تُطلب بعد الانضمام إلى مجموعة ودفع الدفعة المستحقة عندها، ويسجّل منسق المجموعة معلوماتك الصحية.",
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

export function StepConfirm({ app, post, sessionId }: StepProps) {
  const toast = useToast();
  const [progress, setProgress] = useState(0);
  const [agree, setAgree] = useState(false);
  const [signing, setSigning] = useState(false);
  const readAll = progress >= 0.98;
  const applicant = applicantOf(app);

  if (post.confirmedAt && !app.firstPaid) return <FirstInstallment app={app} />;

  const confirm = () => {
    setSigning(true);
    setTimeout(() => {
      actions.setPost(sessionId, { confirmedAt: Date.now(), documents: { ...initialDocuments(app.members), ...post.documents } });
      logPilgrim(app, "تأكيد القبول والتوقيع على التعليمات", `${app.members.length} أفراد`);
      toast({ title: "تم تأكيد قبولك", body: app.firstPaid ? "ارفع الآن الصورة الشخصية والجواز لكل فرد — المهلة حتى 25 شعبان." : "بقي أن تدفع الدفعة الأولى.", icon: "✅", tone: "success" });
    }, 1400);
  };

  return (
    <Question
      step="الخطوة 1 من 6"
      title="أكّد قبول الحج لجميع أفراد الطلب"
      hint="اقرأ التعليمات الرسمية حتى النهاية، ثم وقّع عليها إلكترونياً."
      speak="أكّد قبول الحج لجميع أفراد الطلب. اقرأ التعليمات الرسمية حتى النهاية، ثم وقّع عليها إلكترونياً. إذا لم تؤكد في المهلة يُحوَّل مقعدك إلى قائمة الاحتياط."
    >
      <div className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-maroon/25 bg-maroon/5 p-4 text-maroon">
        <AlertTriangle className="mt-1 size-6 shrink-0" />
        <p className="text-lg font-bold leading-8">تنبيه: المقعد الذي لا يُؤكَّد قبل 25 شعبان يُحوَّل إلى قائمة الاحتياط.</p>
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
          {INSTRUCTIONS.map((s) => (
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
function FirstInstallment({ app }: { app: StepProps["app"] }) {
  const toast = useToast();
  const season = useSeason();
  const plan = seasonPlan(season.fees);
  const n = app.members.length;
  const amount = firstPayment(plan, n, season.fees);
  const receipt = `${receiptBase(app)}-1`;

  const pay = (m: PayMethod) => {
    const at = Date.now();
    actions.saveApplication({ ...app, plan, firstPaid: { amount, at, receipt }, paid: app.paid + amount });
    logPilgrim(app, "دفع الدفعة الأولى بعد القبول بالقرعة", `${planLabel(plan, season.fees)} — ${formatUSD(amount)} — ${payMethodLabel(m)} — الإيصال ${receipt}`);
    toast({ title: "تم دفع الدفعة الأولى", body: `الإيصال ${receipt}. ارفع الآن الصورة الشخصية والجواز.`, icon: "🧾", tone: "success" });
  };

  return (
    <Question
      step="الخطوة 1 من 6"
      title={plan === 1 ? "ادفع تكلفة الحج كاملة" : "ادفع الدفعة الأولى"}
      hint={plan === 1 ? "قُبلت بالقرعة. حددت الإدارة لهذا الموسم دفعة واحدة، فتُدفع تكلفة الحج كاملة الآن." : "قُبلت بالقرعة، فحان موعد الدفعة الأولى من تكلفة الحج. الدفعة الثانية عند الانضمام إلى مجموعة."}
      speak="قُبلت بالقرعة. ادفع الآن الدفعة الأولى من تكلفة الحج."
    >
      <SeasonPlanNote people={n} fees={season.fees} dueNowLabel="الآن" />
      <div className="mt-6">
        <PayMethods amount={amount} reference={receipt} bankReference={receipt.replace("-P-", "-BANK-")} cta={plan === 1 ? "ادفع التكلفة كاملة —" : "ادفع الدفعة الأولى —"} onConfirm={pay} />
      </div>
    </Question>
  );
}
