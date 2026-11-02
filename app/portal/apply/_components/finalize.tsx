"use client";

import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, BadgeCheck, Check, Loader2, Lock, MessageSquareText, Smartphone } from "lucide-react";
import { useState } from "react";
import { PayMethods, payMethodLabel, type PayMethod } from "@/components/payment/methods";
import { Button } from "@/components/ui/button";
import { CountryPhoneInput } from "@/components/ui/phone-input";
import { isPhone, maskPhone, toInternational } from "@/lib/phone";
import { fullName } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import type { Consent } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { PersonChip, Question } from "./ui";

// ───────────────────────── Consents ─────────────────────────

/** Who must approve: every adult in the application except the person filing it (the applicant too, when the application moved to an older relative) — the service's own rule */
import { consentPeople } from "@/lib/registration/service";
export { consentPeople };

const fmtTime = (at: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { weekday: "long", hour: "2-digit", minute: "2-digit" }).format(at);

/**
 * موافقات أفراد الطلب. لا يلزم أن يكون الجميع حاضرين في اللحظة نفسها: يصل كل فرد طلب موافقة يبقى
 * مفتوحاً (دعوة في التطبيق لمن لديه حساب، أو رمز برسالة نصية)، والطلب محفوظ. يخرج صاحب الطلب ويعود
 * متى شاء ليرى من وافق، ويتابع حين يوافق الجميع.
 */
/** A mobile from any country, kept in the international form (+963944274449, +905321234567) — lib/phone.ts */
export const cleanPhone = (v: string) => toInternational(v);
export const validPhone = (v: string) => isPhone(v);
const masked = (phone: string) => maskPhone(phone);

/** The demo's number for someone without one on the platform: a Syrian mobile made from his national number */
export const demoPhone = (nationalId: string) => `+9639${nationalId.slice(-8)}`;

export function Consents({
  members,
  filerId,
  consents,
  accounts,
  onSendCode,
  onSimulate,
  onResend,
  onRemove,
  onLater,
  onDone,
}: {
  members: Member[];
  filerId: string;
  consents: Record<string, Consent>;
  /** The platform's accounts: who has one, and whether a mobile is on it */
  accounts: Record<string, { phone?: string }>;
  /** The code sent to the mobile the applicant entered for someone without one on the platform */
  onSendCode: (personId: string, phone: string) => void;
  /** Demo: play the companion's answer (from his account, or the code from his text message) */
  onSimulate: (personId: string, status: "approved" | "declined") => void;
  onResend: (personId: string) => void;
  onRemove: (personId: string) => void;
  onLater: () => void;
  onDone: () => void;
}) {
  const others = consentPeople(members, filerId);
  const [phones, setPhones] = useState<Record<string, string>>({});
  const [tried, setTried] = useState<Record<string, boolean>>({});
  const approved = others.filter((m) => consents[m.person.id]?.status === "approved").length;
  const all = approved === others.length;

  return (
    <Question
      title={all ? "وافق جميع أفراد الطلب" : "ننتظر موافقة أفراد الطلب"}
      hint="من له حساب على المنصة برقم هاتف يصله الطلب في حسابه وعلى هاتفه. ومن لا حساب له، أو له حساب بلا رقم هاتف، أدخل رقمه ليصله رمز الموافقة. لا يلزم أن يوافق الجميع الآن: طلبك محفوظ، ويمكنك الخروج والعودة لاحقاً لترى من وافق."
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
          const account = accounts[m.person.id];
          // No account, or an account without a mobile: the applicant gives the number the code goes to
          const needsPhone = !c?.phone && !account?.phone;
          const typed = phones[m.person.id] ?? "";
          const bad = !!tried[m.person.id] && !validPhone(typed);
          const send = () => {
            setTried((t) => ({ ...t, [m.person.id]: true }));
            if (validPhone(typed)) onSendCode(m.person.id, cleanPhone(typed));
          };
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
                    {!c
                      ? account
                        ? "له حساب على المنصة دون رقم هاتف"
                        : "ليس له حساب على المنصة"
                      : [c.via === "app" && "دعوة داخل حسابه", c.phone && `رمز موافقة إلى الهاتف ${masked(c.phone)}`, c.via === "app" && !c.phone && "لا رقم هاتف في حسابه"].filter(Boolean).join(" و")}
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
                  ) : !c ? (
                    <motion.span key="phone" className="text-sm font-semibold text-gold-dark">
                      بانتظار رقم هاتفه
                    </motion.span>
                  ) : (
                    <motion.span key="wait" className="flex items-center gap-1.5 text-sm font-semibold text-gold-dark">
                      <Loader2 className="size-4 animate-spin" /> بانتظار الموافقة
                    </motion.span>
                  )}
                </AnimatePresence>
              </PersonChip>
              {c?.respondedAt && <p className="mt-2 text-xs text-hint">الرد: {fmtTime(c.respondedAt)}</p>}
              {needsPhone && status === "pending" && (
                <div className="mt-3">
                  <label className="block text-sm font-bold text-ink">
                    {c ? `أضف رقم هاتف ${m.person.firstName} ليصله رمز الموافقة أيضاً` : `رقم هاتف ${m.person.firstName} ليصله رمز الموافقة`}
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <CountryPhoneInput
                      value={typed}
                      onChange={(v) => setPhones((p) => ({ ...p, [m.person.id]: v }))}
                      ariaLabel={`رقم هاتف ${m.person.firstName}`}
                      invalid={bad}
                      className={cn("h-12 w-72 rounded-2xl border-2 bg-white", bad ? "border-maroon" : "border-gold/50")}
                      inputClassName="text-lg"
                    />
                    <Button type="button" onClick={send}>
                      <MessageSquareText className="size-5" /> إرسال رمز الموافقة
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        const phone = demoPhone(m.person.id);
                        setPhones((p) => ({ ...p, [m.person.id]: phone }));
                        onSendCode(m.person.id, phone);
                      }}
                      className="rounded-full border border-dashed border-gold-dark px-3 py-1 text-sm font-semibold text-maroon"
                    >
                      محاكاة: رقم تجريبي وإرسال
                    </button>
                  </div>
                  {bad && <p className="mt-1 text-sm font-semibold text-maroon">رقم هاتف غير صحيح لهذه الدولة</p>}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {status === "pending" && c && (
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
      <p className="mt-4 text-center text-sm text-hint">من لديه حساب على المنصة يجد الطلب في صفحته ويوافق منها؛ ومن ليس لديه حساب يوافق بالرمز الذي يصل إلى الهاتف الذي أدخلته له.</p>
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

/**
 * `onConfirmed`: the provider confirmed the payment (ShamCash, or the bank slip matched) — the moment it is
 * recorded, before the receipt shows; an error keeps the receipt from showing. `methods`: those the
 * season's registration allows.
 */
export function Payment({ lines, receipt, onPaid, onConfirmed, methods }: { lines: PayLine[]; receipt: string; onPaid: (method: PayMethod) => void; onConfirmed?: (method: PayMethod) => string | null; methods?: PayMethod[] }) {
  const total = lines.reduce((a, l) => a + l.amount, 0);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [phase, setPhase] = useState<"form" | "processing" | "done">("form");
  const [error, setError] = useState("");

  const pay = (m: PayMethod) => {
    setMethod(m);
    setError("");
    setPhase("processing");
    setTimeout(() => {
      const e = onConfirmed?.(m) ?? null;
      if (e) {
        setError(e);
        setPhase("form");
      } else setPhase("done");
    }, 2600);
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
      {error && <p className="mb-4 rounded-2xl bg-maroon/8 p-4 font-bold text-maroon">{error}</p>}
      <PayMethods amount={total} reference={receipt} bankReference={receipt.replace("R", "BANK")} onConfirm={pay} methods={methods} />
    </Question>
  );
}