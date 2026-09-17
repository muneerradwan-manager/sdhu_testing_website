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
import { initialDocuments, passportCaseMember } from "./model";
import { applicantOf, logPilgrim, type StepProps } from "./shared";

const INSTRUCTIONS: { title: string; items: string[] }[] = [
  {
    title: "أولاً: المواعيد",
    items: [
      "تأكيد القبول واستكمال الأوراق واختيار المجموعة: حتى 25 شعبان 1448.",
      "التسديد وتوقيع العقد: من 1 إلى 15 رمضان 1448.",
      "من لا يؤكد أو لا يسدد في المهلة يُحوَّل مقعده إلى قائمة الاحتياط تلقائياً.",
    ],
  },
  {
    title: "ثانياً: الوثائق",
    items: [
      "يجب أن يكون جواز السفر سارياً 6 أشهر على الأقل بعد موعد العودة (23 ذو الحجة 1448).",
      "شهادة لقاح الحمى الشوكية إلزامية لكل حاج، وتكون سارية خلال 3 سنوات.",
      "لقاح الإنفلونزا الموسمية موصى به لكبار السن.",
      "التقرير الطبي إلزامي لمن تجاوز 70 عاماً أو لديه مرض مزمن أو احتياج خاص.",
    ],
  },
  {
    title: "ثالثاً: المجموعة والتكاليف",
    items: [
      "لكل حاج مجموعة فعّالة واحدة في الموسم، ويُرسل طلب الانتساب لأفراد الطلب العائلي معاً.",
      "تكلفة الحج والهدي وفارق الغرفة الخاصة تُسدَّد كلٌّ منها بإيصال مستقل.",
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

  const confirm = () => {
    setSigning(true);
    setTimeout(() => {
      actions.setPost(sessionId, { confirmedAt: Date.now(), documents: { ...initialDocuments(app.members), ...post.documents } });
      logPilgrim(app, "تأكيد القبول والتوقيع على التعليمات", `${app.members.length} أفراد`);
      toast({ title: "تم تأكيد قبولك", body: "بقي 20 يوماً على مهلة استكمال الأوراق واختيار المجموعة.", icon: "✅", tone: "success" });
      const elder = passportCaseMember(app.members);
      if (elder) {
        setTimeout(
          () => toast({ title: `وثيقة جواز السفر لـ${fullName(elder.person)} مرفوضة`, body: "صلاحية الجواز أقل من 6 أشهر بعد العودة. يرجى التجديد والرفع من جديد.", icon: "⚠️", tone: "warning" }),
          1400,
        );
      }
    }, 1400);
  };

  return (
    <Question
      step="الخطوة 1 من 5"
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
