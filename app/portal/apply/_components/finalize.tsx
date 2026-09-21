"use client";

import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, BadgeCheck, Check, Loader2, Lock, MessageSquareText, Smartphone } from "lucide-react";
import { useState } from "react";
import { PayMethods, payMethodLabel, type PayMethod } from "@/components/payment/methods";
import { Button } from "@/components/ui/button";
import { ageOf, fullName } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import type { Consent } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { PersonChip, Question } from "./ui";

// ───────────────────────── Consents ─────────────────────────

/** Who must approve: every adult in the application except the person filing it (the applicant too, when the application moved to an older relative) */
export function consentPeople(members: Member[], filerId: string) {
  return members.filter((m) => m.person.id !== filerId && ageOf(m.person) >= 17);
}

const fmtTime = (at: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { weekday: "long", hour: "2-digit", minute: "2-digit" }).format(at);

/**
 * موافقات أفراد الطلب. لا يلزم أن يكون الجميع حاضرين في اللحظة نفسها: يصل كل فرد طلب موافقة يبقى
 * مفتوحاً (دعوة في التطبيق لمن لديه حساب، أو رمز برسالة نصية)، والطلب محفوظ. يخرج صاحب الطلب ويعود
 * متى شاء ليرى من وافق، ويتابع حين يوافق الجميع.
 */
export function Consents({
  members,
  filerId,
  consents,
  onSimulate,
  onResend,
  onRemove,
  onLater,
  onDone,
}: {
  members: Member[];
  filerId: string;
  consents: Record<string, Consent>;
  /** Demo: play the companion's answer (from his account, or the code from his text message) */
  onSimulate: (personId: string, status: "approved" | "declined") => void;
  onResend: (personId: string) => void;
  onRemove: (personId: string) => void;
  onLater: () => void;
  onDone: () => void;
}) {
  const others = consentPeople(members, filerId);
  const approved = others.filter((m) => consents[m.person.id]?.status === "approved").length;
  const all = approved === others.length;

  return (
    <Question
      title={all ? "وافق جميع أفراد الطلب" : "ننتظر موافقة أفراد الطلب"}
      hint="وصل كل فرد طلب موافقة على هاتفه أو داخل التطبيق، ويبقى مفتوحاً. لا يلزم أن يوافق الجميع الآن: طلبك محفوظ، ويمكنك الخروج والعودة لاحقاً لترى من وافق."
      speak="ننتظر موافقة أفراد الطلب. طلبك محفوظ، ويمكنك الخروج والعودة لاحقاً لترى من وافق."
    >
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-sand p-4">
        <p className="font-bold">
          وافق <span className="text-green-dark">{approved}</span> من {others.length}
        </p>
        <div className="h-3 w-40 overflow-hidden rounded-full bg-gold-light">
          <motion.div className="h-full rounded-full bg-green-light" animate={{ width: `${others.length ? (approved / others.length) * 100 : 100}%` }} />
        </div>
      </div>
      <div className="space-y-3">
        {others.map((m, i) => {
          const c = consents[m.person.id];
          const status = c?.status ?? "pending";
          return (
            <motion.div
              key={m.person.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={cn("rounded-3xl border-2 p-4 transition", status === "approved" ? "border-green-light/50 bg-green-light/6" : status === "declined" ? "border-maroon/40 bg-maroon/5" : "border-gold/50 bg-white")}
            >
              <PersonChip
                name={fullName(m.person)}
                gender={m.person.gender}
                sub={
                  <span className="flex flex-wrap items-center gap-1.5">
                    {c?.via === "app" ? <Smartphone className="size-3.5" /> : <MessageSquareText className="size-3.5" />}
                    {c?.via === "app" ? "دعوة داخل التطبيق" : `رمز موافقة إلى الهاتف ••• ${m.person.phoneTail}`}
                    {c && <span className="text-hint">— أُرسل {fmtTime(c.sentAt)}</span>}
                  </span>
                }
              >
                <AnimatePresence mode="wait">
                  {status === "approved" ? (
                    <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 rounded-full bg-green-light px-3 py-1.5 text-sm font-bold text-white">
                      <Check className="size-4" /> {m.person.gender === "F" ? "وافقت" : "وافق"}
                    </motion.span>
                  ) : status === "declined" ? (
                    <motion.span key="no" initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-full bg-maroon px-3 py-1.5 text-sm font-bold text-white">
                      {m.person.gender === "F" ? "اعتذرت" : "اعتذر"}
                    </motion.span>
                  ) : (
                    <motion.span key="wait" className="flex items-center gap-1.5 text-sm font-semibold text-gold-dark">
                      <Loader2 className="size-4 animate-spin" /> بانتظار الموافقة
                    </motion.span>
                  )}
                </AnimatePresence>
              </PersonChip>
              {c?.respondedAt && <p className="mt-2 text-xs text-hint">الرد: {fmtTime(c.respondedAt)}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {status === "pending" && (
                  <>
                    <button type="button" onClick={() => onResend(m.person.id)} className="rounded-full bg-sand px-3 py-1 font-semibold text-green-dark hover:bg-gold-light">
                      إعادة الإرسال
                    </button>
                    <button type="button" onClick={() => onSimulate(m.person.id, "approved")} className="rounded-full border border-dashed border-gold-dark px-3 py-1 font-semibold text-maroon">
                      محاكاة: {m.person.gender === "F" ? "وافقت" : "وافق"} من هاتفه
                    </button>
                    <button type="button" onClick={() => onSimulate(m.person.id, "declined")} className="rounded-full border border-dashed border-maroon/40 px-3 py-1 font-semibold text-maroon/80">
                      محاكاة: اعتذار
                    </button>
                  </>
                )}
                {status === "declined" && (
                  <>
                    <button type="button" onClick={() => onRemove(m.person.id)} className="rounded-full bg-maroon px-3 py-1 font-semibold text-white">
                      إزالة {m.person.firstName} من الطلب
                    </button>
                    <button type="button" onClick={() => onResend(m.person.id)} className="rounded-full bg-sand px-3 py-1 font-semibold text-green-dark">
                      طلب الموافقة من جديد
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-sm text-hint">من لديه حساب على المنصة يجد الطلب في صفحته ويوافق منها؛ ومن ليس لديه حساب يوافق بالرمز الذي وصله.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="xl" disabled={!all} onClick={onDone}>
          {all ? "وافق الجميع — متابعة" : `وافق ${approved} من ${others.length}`} <ArrowLeft className="size-6" />
        </Button>
        {!all && (
          <Button size="xl" variant="outline" onClick={onLater}>
            احفظ وتابع لاحقاً
          </Button>
        )}
      </div>
    </Question>
  );
}
/** What is paid at registration: the fee, plus the first installment of the Hajj cost on direct acceptance */
export type PayLine = { label: string; amount: number };

export function Payment({ lines, receipt, onPaid }: { lines: PayLine[]; receipt: string; onPaid: (method: PayMethod) => void }) {
  const total = lines.reduce((a, l) => a + l.amount, 0);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [phase, setPhase] = useState<"form" | "processing" | "done">("form");

  const pay = (m: PayMethod) => {
    setMethod(m);
    setPhase("processing");
    setTimeout(() => setPhase("done"), 2600);
  };

  if (phase === "processing") {
    return (
      <div className="grid min-h-96 place-items-center text-center">
        <div>
          <div className="relative mx-auto size-28">
            <motion.span className="absolute inset-0 rounded-full border-4 border-gold-light border-t-green-dark" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} />
            <span className="absolute inset-0 grid place-items-center text-green-dark">
              <Lock className="size-10" />
            </span>
          </div>
          <p className="mt-6 font-display text-2xl font-bold text-green-dark">{method === "bank" ? "يطابق موظف المالية إشعار الدفع مع كشف المصرف..." : "نتحقق من العملية في شام كاش..."}</p>
          <p className="mt-1 text-hint">لا تغلق الصفحة</p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <Question title={lines.length > 1 ? "تم تسديد رسم التسجيل والدفعة الأولى" : "تم تسديد رسم التسجيل"} hint="صدر لك إيصال رقمي مرقّم يمكن لأي شخص التحقق منه من البوابة العامة.">
        <motion.div initial={{ rotateX: 70, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ type: "spring", damping: 16 }} className="mx-auto max-w-md overflow-hidden rounded-3xl border border-gold/50 bg-white shadow-2xl [transform-origin:top]">
          <div className="relative bg-green-dark p-5 text-white">
            <div className="bg-pattern absolute inset-0 opacity-15" />
            <p className="relative text-sm text-gold">إيصال رقمي — المنصة الوطنية للحج</p>
            <p className="relative font-mono text-2xl font-bold" dir="ltr">{receipt}</p>
          </div>
          <div className="perforated h-5 bg-white" />
          <div className="flex items-center gap-5 p-5">
            <div className="rounded-xl border border-gold/40 p-2">
              <QRCodeSVG value={`https://hajj-demo.sy/verify/${receipt}`} size={96} fgColor="#00594F" />
            </div>
            <dl className="space-y-1.5 text-sm">
              {lines.map((l) => (
                <div key={l.label}><dt className="inline text-hint">{l.label}: </dt><dd className="inline font-bold">{formatUSD(l.amount)}</dd></div>
              ))}
              <div><dt className="inline text-hint">المجموع: </dt><dd className="inline font-bold text-green-dark">{formatUSD(total)}</dd></div>
              <div><dt className="inline text-hint">الطريقة: </dt><dd className="inline font-bold">{payMethodLabel(method ?? "shamcash")}</dd></div>
            </dl>
          </div>
        </motion.div>
        <div className="mt-8 text-center">
          <Button size="xl" variant="gold" onClick={() => onPaid(method ?? "shamcash")}>
            تقديم الطلب نهائياً <BadgeCheck className="size-6" />
          </Button>
        </div>
      </Question>
    );
  }

  return (
    <Question
      title={`المطلوب الآن: ${formatUSD(total)}`}
      hint="ادفع عبر شام كاش، أو في المصرف المعتمد ثم ارفع إشعار الدفع."
      speak={`المطلوب الآن ${total} دولاراً. ادفع عبر شام كاش، أو في المصرف المعتمد ثم ارفع إشعار الدفع.`}
    >
      <ul className="mb-5 divide-y divide-gold-light overflow-hidden rounded-2xl border border-gold/40 px-4 text-sm">
        {lines.map((l) => (
          <li key={l.label} className="flex justify-between gap-3 py-2.5">
            <span>{l.label}</span>
            <b>{formatUSD(l.amount)}</b>
          </li>
        ))}
        <li className="flex justify-between gap-3 py-2.5 font-bold text-green-dark">
          <span>المجموع</span>
          <span>{formatUSD(total)}</span>
        </li>
      </ul>
      <PayMethods amount={total} reference={receipt} bankReference={receipt.replace("R", "BANK")} onConfirm={pay} />
    </Question>
  );
}