"use client";

import { CountryPhoneInput } from "@/components/ui/phone-input";
import { isPhone, maskPhone } from "@/lib/phone";
import { AnimatePresence, motion } from "motion/react";
import { BellRing, CheckCircle2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useToast } from "@/components/ui/widgets";
import { useT } from "@/lib/i18n";

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
  const t = useT();
  const saved = useSyncExternalStore(() => () => {}, readSaved, () => "");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const registered = done || !!saved;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhone(phone)) return setError(t("اختر دولتك واكتب رقم هاتف صحيحاً لها", "Choose your country and type a valid phone number for it"));
    setError("");
    try {
      localStorage.setItem(KEY, phone);
    } catch {
      /* storage blocked — still confirm in the UI */
    }
    setDone(true);
    toast({
      title: t("سنبلغك عند إطلاق خدمات العمرة", "We will let you know when Umrah services launch"),
      body: t("نسخة تجريبية: لم يُرسل الرقم إلى أي جهة.", "Demo version: the number was not sent anywhere."),
      icon: "🔔",
      tone: "success",
    });
  };

  return (
    <div className="flex h-full flex-col rounded-[2rem] border border-gold/40 bg-white p-7 shadow-[0_30px_70px_-45px_rgba(0,89,79,.5)] md:p-9">
      <BellRing className="size-10 text-gold-dark" />
      <p className="mt-3 font-display text-3xl font-bold text-green-dark">{t("أبلغني عند الإطلاق", "Notify me at launch")}</p>
      <p className="mt-2 leading-8 text-ink-soft">
        {t("اترك رقم هاتفك وتصلك رسالة عند فتح التسجيل في خدمات العمرة.", "Leave your phone number and you will get a message when registration for Umrah services opens.")}
      </p>
      <AnimatePresence mode="wait">
        {registered ? (
          <motion.p key="ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex items-center gap-2 rounded-2xl bg-green-light/10 p-4 font-bold text-green">
            <CheckCircle2 className="size-5" /> {t("تم تسجيل طلب الإشعار", "Your notification request is registered")}
            {saved || phone ? t(` على الرقم ${maskPhone(saved || phone)}`, ` for ${maskPhone(saved || phone)}`) : ""}
          </motion.p>
        ) : (
          <motion.form key="form" onSubmit={submit} className="mt-6" exit={{ opacity: 0 }}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <CountryPhoneInput
                value={phone}
                onChange={setPhone}
                ariaLabel={t("رقم الهاتف", "Phone number")}
                className="h-14 flex-1 rounded-2xl border-2 border-gold/50 bg-white text-ink transition focus-within:border-green-light focus-within:ring-4 focus-within:ring-green-light/15"
                inputClassName="text-lg"
              />
              <button type="submit" className="h-14 rounded-2xl bg-green-dark px-6 font-bold text-white transition hover:bg-green">
                {t("أبلغني", "Notify me")}
              </button>
            </div>
            {error && <p className="mt-2 text-sm font-semibold text-maroon">{error}</p>}
          </motion.form>
        )}
      </AnimatePresence>
      <p className="mt-auto pt-4 text-xs text-hint">
        {t("نسخة تجريبية: يُحفظ الرقم في متصفحك فقط ولا يُرسل إلى أي جهة.", "Demo version: the number is kept in your browser only and is not sent anywhere.")}
      </p>
    </div>
  );
}
