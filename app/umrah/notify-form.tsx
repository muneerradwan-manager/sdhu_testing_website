"use client";

import { AnimatePresence, motion } from "motion/react";
import { BellRing, CheckCircle2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useToast } from "@/components/ui/widgets";

const KEY = "sdhu-umrah-notify";

function readSaved() {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

/** Demo "notify me when Umrah launches" — kept only in this browser, nothing is sent anywhere */
export function NotifyForm() {
  const toast = useToast();
  const saved = useSyncExternalStore(() => () => {}, readSaved, () => "");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const registered = done || !!saved;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^09\d{8}$/.test(phone)) return setError("رقم الهاتف يبدأ بـ 09 ويتكون من 10 أرقام");
    setError("");
    try {
      localStorage.setItem(KEY, phone);
    } catch {
      /* storage blocked — still confirm in the UI */
    }
    setDone(true);
    toast({ title: "سنبلغك عند إطلاق خدمات العمرة", body: "نسخة تجريبية: لم يُرسل الرقم إلى أي جهة.", icon: "🔔", tone: "success" });
  };

  return (
    <div className="flex h-full flex-col rounded-[2rem] border border-gold/40 bg-white p-7 shadow-[0_30px_70px_-45px_rgba(0,89,79,.5)] md:p-9">
      <BellRing className="size-10 text-gold-dark" />
      <p className="mt-3 font-display text-3xl font-bold text-green-dark">أبلغني عند الإطلاق</p>
      <p className="mt-2 leading-8 text-ink-soft">اترك رقم هاتفك وتصلك رسالة عند فتح التسجيل في خدمات العمرة.</p>
      <AnimatePresence mode="wait">
        {registered ? (
          <motion.p key="ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex items-center gap-2 rounded-2xl bg-green-light/10 p-4 font-bold text-green">
            <CheckCircle2 className="size-5" /> تم تسجيل طلب الإشعار{saved || phone ? ` على الرقم ${(saved || phone).slice(0, 4)} ••• ${(saved || phone).slice(-3)}` : ""}
          </motion.p>
        ) : (
          <motion.form key="form" onSubmit={submit} className="mt-6" exit={{ opacity: 0 }}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                dir="ltr"
                inputMode="tel"
                maxLength={10}
                placeholder="09xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                aria-label="رقم الهاتف"
                className="h-14 flex-1 rounded-2xl border-2 border-gold/50 bg-white px-4 text-left font-mono text-lg tracking-widest outline-none transition focus:border-green-light focus:ring-4 focus:ring-green-light/15"
              />
              <button type="submit" className="h-14 rounded-2xl bg-green-dark px-6 font-bold text-white transition hover:bg-green">
                أبلغني
              </button>
            </div>
            {error && <p className="mt-2 text-sm font-semibold text-maroon">{error}</p>}
          </motion.form>
        )}
      </AnimatePresence>
      <p className="mt-auto pt-4 text-xs text-hint">نسخة تجريبية: يُحفظ الرقم في متصفحك فقط ولا يُرسل إلى أي جهة.</p>
    </div>
  );
}
