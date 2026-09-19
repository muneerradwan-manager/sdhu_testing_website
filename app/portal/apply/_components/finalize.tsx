"use client";

import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, BadgeCheck, Building2, Check, CreditCard, FileImage, Landmark, Loader2, Lock, MessageSquareText, Smartphone, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ageOf, fullName } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { SEASON } from "@/lib/season";
import { cn, formatUSD } from "@/lib/utils";
import { Choice, PersonChip, Question } from "./ui";
import { relationWord } from "./person-adder";

// ───────────────────────── Consents ─────────────────────────

export function Consents({ members, onDone }: { members: Member[]; onDone: () => void }) {
  const others = members.filter((m) => m.relation !== "self" && ageOf(m.person) >= 17);
  const [confirmed, setConfirmed] = useState<string[]>([]);

  useEffect(() => {
    const timers = others.map((m, i) =>
      setTimeout(() => setConfirmed((c) => (c.includes(m.person.id) ? c : [...c, m.person.id])), 1600 + i * 1300),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const all = confirmed.length >= others.length;

  return (
    <Question
      title="ننتظر موافقة مرافقيك"
      hint="لكل مواطن حق في ملفه؛ لذلك يصل كل مرافق رمز موافقة على هاتفه، أو دعوة داخل التطبيق إن كان لديه حساب."
      speak="ننتظر موافقة مرافقيك. يصل كل مرافق رمز موافقة على هاتفه."
    >
      <div className="space-y-3">
        {others.map((m, i) => {
          const ok = confirmed.includes(m.person.id);
          const viaApp = i % 3 === 1;
          return (
            <motion.div key={m.person.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className={cn("rounded-3xl border-2 p-4 transition", ok ? "border-green-light/50 bg-green-light/6" : "border-gold/50 bg-white")}>
              <PersonChip
                name={fullName(m.person)}
                gender={m.person.gender}
                sub={
                  <span className="flex items-center gap-1.5">
                    {viaApp ? <Smartphone className="size-3.5" /> : <MessageSquareText className="size-3.5" />}
                    {viaApp ? "دعوة للانضمام داخل التطبيق" : `رمز موافقة إلى الهاتف ••• ${m.person.phoneTail}`}
                  </span>
                }
              >
                <AnimatePresence mode="wait">
                  {ok ? (
                    <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 rounded-full bg-green-light px-3 py-1.5 text-sm font-bold text-white">
                      <Check className="size-4" /> {m.person.gender === "F" ? "وافقت" : "وافق"}
                    </motion.span>
                  ) : (
                    <motion.span key="wait" className="flex items-center gap-1.5 text-sm font-semibold text-gold-dark">
                      <Loader2 className="size-4 animate-spin" /> بانتظار الموافقة
                    </motion.span>
                  )}
                </AnimatePresence>
              </PersonChip>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-sm text-hint">في النسخة التجريبية تتم الموافقة تلقائياً بعد ثوانٍ.</p>
      <Button size="xl" className="mt-6" disabled={!all} onClick={onDone}>
        {all ? "وافق الجميع — متابعة" : `وافق ${confirmed.length} من ${others.length}`} <ArrowLeft className="size-6" />
      </Button>
    </Question>
  );
}

// ───────────────────────── Documents ─────────────────────────

type DocState = Record<string, number>; // key → progress 0..100

export function Documents({ members, onDone }: { members: Member[]; onDone: () => void }) {
  const [docs, setDocs] = useState<DocState>({});
  const uploading = Object.values(docs).some((p) => p < 100);

  // One ticker advances every in-flight upload
  useEffect(() => {
    if (!uploading) return;
    const t = setInterval(() => {
      setDocs((d) => {
        const next: DocState = {};
        for (const [k, p] of Object.entries(d)) next[k] = p >= 100 ? 100 : Math.min(100, p + 12 + ((k.length * 7 + p) % 11));
        return next;
      });
    }, 120);
    return () => clearInterval(t);
  }, [uploading]);

  const upload = (key: string) => setDocs((d) => (key in d ? d : { ...d, [key]: 1 }));

  const keys = members.flatMap((m) => [`${m.person.id}-passport`, `${m.person.id}-photo`]);
  const complete = keys.filter((k) => (docs[k] ?? 0) >= 100).length;

  return (
    <Question
      title="الأوراق الأساسية"
      hint="صورة الجواز والصورة الشخصية لكل فرد فقط. بقية الأوراق (اللقاحات والتقرير الطبي) تُستكمل بعد القبول."
      speak="الأوراق الأساسية: صورة الجواز والصورة الشخصية لكل فرد."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand p-4">
        <p className="font-bold">
          مرفوعة: <span className="text-green-dark">{complete}</span> من {keys.length}
        </p>
        <Button size="sm" variant="outline" onClick={() => keys.forEach((k, i) => setTimeout(() => upload(k), i * 180))}>
          <Upload className="size-4" /> رفع الكل (صور تجريبية)
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {members.map((m) => (
          <div key={m.person.id} className="rounded-3xl border border-gold/40 bg-white p-4">
            <PersonChip name={fullName(m.person)} gender={m.person.gender} sub={relationWord(m.relation, m.person.gender)} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { k: "passport", label: "جواز السفر" },
                { k: "photo", label: "الصورة الشخصية" },
              ].map((d) => {
                const key = `${m.person.id}-${d.k}`;
                const p = docs[key];
                const done = (p ?? 0) >= 100;
                return (
                  <label
                    key={d.k}
                    className={cn(
                      "relative flex cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 border-dashed p-4 text-center transition",
                      done ? "border-green-light bg-green-light/8" : "border-gold hover:bg-gold/10",
                    )}
                  >
                    <input type="file" accept="image/*,.pdf" className="sr-only" onChange={() => upload(key)} onClick={(e) => {
                      if (p === undefined) {
                        e.preventDefault();
                        upload(key);
                      }
                    }} />
                    {done ? <BadgeCheck className="size-7 text-green-light" /> : p !== undefined ? <Loader2 className="size-7 animate-spin text-gold-dark" /> : <FileImage className="size-7 text-gold-dark" />}
                    <span className="text-sm font-bold">{d.label}</span>
                    <span className="text-xs text-hint">{done ? "✓ تحقق آلي: واضحة ومقروءة" : p !== undefined ? `${Math.round(p)}%` : "اضغط للرفع"}</span>
                    {p !== undefined && !done && (
                      <span className="absolute inset-x-0 bottom-0 h-1 bg-gold-light">
                        <span className="block h-full bg-green-light transition-all" style={{ width: `${p}%` }} />
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <Button size="xl" className="mt-8" disabled={complete < keys.length} onClick={onDone}>
        متابعة <ArrowLeft className="size-6" />
      </Button>
    </Question>
  );
}

// ───────────────────────── Payment ─────────────────────────

export function Payment({ count, receipt, onPaid }: { count: number; receipt: string; onPaid: (method: "card" | "bank") => void }) {
  const total = count * SEASON.fees.registrationPerPerson;
  const [method, setMethod] = useState<"card" | "bank" | null>(null);
  const [card, setCard] = useState({ number: "", name: "", exp: "", cvv: "" });
  const [flip, setFlip] = useState(false);
  const [phase, setPhase] = useState<"form" | "processing" | "done">("form");

  const pay = () => {
    setPhase("processing");
    setTimeout(() => setPhase("done"), 2600);
  };

  const pretty = card.number.replace(/(\d{4})(?=\d)/g, "$1 ");

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
          <p className="mt-6 font-display text-2xl font-bold text-green-dark">{method === "bank" ? "نطابق إشعار الدفع مع كشف المصرف..." : "نعالج الدفع بأمان..."}</p>
          <p className="mt-1 text-hint">لا تغلق الصفحة</p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <Question title="تم تسديد رسم التسجيل" hint="صدر لك إيصال رقمي مرقّم يمكن لأي شخص التحقق منه من البوابة العامة.">
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
              <div><dt className="inline text-hint">البند: </dt><dd className="inline font-bold">رسم التسجيل</dd></div>
              <div><dt className="inline text-hint">العدد: </dt><dd className="inline font-bold">{count} × {formatUSD(SEASON.fees.registrationPerPerson)}</dd></div>
              <div><dt className="inline text-hint">المبلغ: </dt><dd className="inline font-bold text-green-dark">{formatUSD(total)}</dd></div>
              <div><dt className="inline text-hint">الطريقة: </dt><dd className="inline font-bold">{method === "bank" ? "المصرف المعتمد" : "دفع إلكتروني"}</dd></div>
            </dl>
          </div>
        </motion.div>
        <div className="mt-8 text-center">
          <Button size="xl" variant="gold" onClick={() => onPaid(method ?? "card")}>
            تقديم الطلب نهائياً <BadgeCheck className="size-6" />
          </Button>
        </div>
      </Question>
    );
  }

  return (
    <Question
      title={`رسم التسجيل: ${formatUSD(total)}`}
      hint={`${formatUSD(SEASON.fees.registrationPerPerson)} عن كل فرد × ${count}. كيف تريد الدفع؟`}
      speak={`رسم التسجيل ${total} دولاراً. كيف تريد الدفع؟`}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Choice index={0} icon={<CreditCard className="size-7 text-green-dark" />} label="الدفع الإلكتروني" description="بطاقة مصرفية — فوري" selected={method === "card"} onClick={() => setMethod("card")} />
        <Choice index={1} icon={<Landmark className="size-7 text-green-dark" />} label="المصرف المعتمد" description="ادفع في أقرب فرع بالرقم المرجعي" selected={method === "bank"} onClick={() => setMethod("bank")} />
      </div>

      <AnimatePresence mode="wait">
        {method === "card" && (
          <motion.div key="card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-6 grid items-center gap-6 md:grid-cols-2">
              <div className="[perspective:1000px]">
                <motion.div animate={{ rotateY: flip ? 180 : 0 }} transition={{ duration: 0.6 }} className="relative aspect-[1.6] w-full [transform-style:preserve-3d]">
                  <div className="absolute inset-0 overflow-hidden rounded-3xl bg-gradient-to-br from-green-dark via-green to-maroon p-6 text-white shadow-2xl [backface-visibility:hidden]">
                    <div className="bg-pattern absolute inset-0 opacity-20" />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="h-8 w-11 rounded-md bg-gradient-to-br from-gold to-gold-dark" />
                        <Building2 className="size-6 text-gold" />
                      </div>
                      <p className="font-mono text-xl tracking-widest" dir="ltr">{pretty || "•••• •••• •••• ••••"}</p>
                      <div className="flex justify-between text-sm">
                        <span className="truncate">{card.name || "الاسم على البطاقة"}</span>
                        <span dir="ltr">{card.exp || "MM/YY"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-ink to-green-dark shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="mt-8 h-10 bg-black/60" />
                    <div className="mx-6 mt-5 flex h-9 items-center justify-end rounded bg-white px-3 font-mono text-ink" dir="ltr">{card.cvv || "•••"}</div>
                  </div>
                </motion.div>
              </div>
              <div className="space-y-3">
                <input dir="ltr" inputMode="numeric" placeholder="رقم البطاقة" maxLength={16} value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\D/g, "") })} className="h-13 w-full rounded-2xl border-2 border-gold/50 px-4 font-mono text-lg outline-none focus:border-green-light" />
                <input placeholder="الاسم على البطاقة" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} className="h-13 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" />
                <div className="grid grid-cols-2 gap-3">
                  <input dir="ltr" placeholder="MM/YY" maxLength={5} value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value.replace(/[^\d/]/g, "") })} className="h-13 rounded-2xl border-2 border-gold/50 px-4 font-mono outline-none focus:border-green-light" />
                  <input dir="ltr" placeholder="CVV" maxLength={3} value={card.cvv} onFocus={() => setFlip(true)} onBlur={() => setFlip(false)} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })} className="h-13 rounded-2xl border-2 border-gold/50 px-4 font-mono outline-none focus:border-green-light" />
                </div>
                <button type="button" onClick={() => setCard({ number: "4242424242424242", name: "بطاقة تجريبية", exp: "12/29", cvv: "123" })} className="text-sm font-semibold text-maroon underline">
                  املأ ببطاقة تجريبية
                </button>
              </div>
            </div>
            <Button size="xl" className="mt-6 w-full" disabled={card.number.length < 16 || !card.exp || card.cvv.length < 3} onClick={pay}>
              <Lock className="size-5" /> ادفع {formatUSD(total)}
            </Button>
          </motion.div>
        )}
        {method === "bank" && (
          <motion.div key="bank" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-6 rounded-3xl border-2 border-dashed border-gold-dark bg-gold/10 p-6">
              <p className="text-sm text-ink-soft">الرقم المرجعي للدفع</p>
              <p className="mt-1 font-mono text-3xl font-bold tracking-widest text-green-dark" dir="ltr">{receipt.replace("R", "BANK")}</p>
              <ol className="mt-4 list-inside list-decimal space-y-1.5 leading-7 text-ink-soft">
                <li>راجع أي فرع للمصرف المعتمد وأبرز الرقم المرجعي.</li>
                <li>ادفع {formatUSD(total)} واحتفظ بإشعار الدفع.</li>
                <li>يطابق موظف المالية الإشعار مع كشف المصرف ويصدر إيصالك الرقمي.</li>
              </ol>
            </div>
            <Button size="xl" className="mt-6 w-full" onClick={pay}>
              دفعتُ في المصرف (محاكاة) <ArrowLeft className="size-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Question>
  );
}
