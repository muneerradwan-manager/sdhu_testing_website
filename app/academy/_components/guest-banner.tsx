"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Award, BarChart3, ClipboardCheck, PlayCircle, UserPlus } from "lucide-react";
import { useAcademyProgress } from "@/lib/account";
import { useHydrated, useStore } from "@/lib/store";
import { useLang, useT } from "@/lib/i18n";

type Item = { track: string; slug: string; title: string; trackTitle: string };

/** Guests get the account pitch; signed-in pilgrims get a "continue where you left off" card */
export function GuestBanner({ path }: { path: Item[] }) {
  const t = useT();
  const en = useLang() === "en";
  const hydrated = useHydrated();
  const session = useStore((s) => s.sessionId);
  const academy = useAcademyProgress();

  if (hydrated && session) {
    const next = path.find((i) => !academy[`${i.track}/${i.slug}`]);
    const done = path.length - path.filter((i) => !academy[`${i.track}/${i.slug}`]).length;
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl bg-green-dark p-6 text-white sm:p-8">
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold text-gold">{t("مرحباً بعودتك", "Welcome back")}</p>
            <p className="mt-1 font-display text-2xl font-bold">
              {next ? t(`تابع من حيث توقفت: ${next.title}`, `Continue where you left off: ${next.title}`) : t("ما شاء الله! أتممت جميع الدروس", "Masha'Allah! You have completed every lesson")}
            </p>
            <p className="mt-1 text-sm text-white/70">
              {t(`أتممت ${done} من ${path.length} درساً في الأكاديمية`, `You have completed ${done} of ${path.length} lessons in the academy`)}
            </p>
          </div>
          {next && (
            <Link href={`/academy/${next.track}/${next.slug}`} className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gold px-6 py-3.5 font-bold text-ink transition hover:bg-gold-dark hover:text-white">
              <PlayCircle className="size-5" /> {t("متابعة التعلّم", "Continue learning")}
            </Link>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-maroon-dark via-maroon to-maroon-light ltr:bg-gradient-to-r p-6 text-white shadow-[0_30px_70px_-40px_rgba(103,33,70,.9)] sm:p-10"
    >
      <div className="bg-pattern absolute inset-0 opacity-15" />
      <motion.span
        className="absolute -end-16 -top-16 size-64 rounded-full bg-gold/15 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-gold">
            <span className="size-1.5 rotate-45 bg-gold" /> {t("تتصفح الآن كزائر", "You are browsing as a guest")}
          </span>
          <p className="mt-4 font-display text-2xl font-bold leading-relaxed sm:text-3xl">{t("أنشئ حساباً لتتبع تقدمك، وأداء الاختبارات القصيرة، والحصول على شهادة إتمام المسار", "Create an account to track your progress, take the short quizzes and earn a track completion certificate")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-2xl bg-gold px-6 py-3.5 font-bold text-ink shadow-lg transition hover:-translate-y-0.5 hover:bg-white">
              <UserPlus className="size-5" /> {t("إنشاء حساب مجاني", "Create a free account")}
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 font-semibold backdrop-blur hover:bg-white/20">
              {t("لدي حساب", "I have an account")}
            </Link>
          </div>
        </div>
        <ul className="grid gap-3">
          {[
            { icon: BarChart3, title: t("تتبع التقدم", "Track your progress"), body: t("يُحفظ ما أتممته على كل أجهزتك", "What you complete is saved on all your devices") },
            { icon: ClipboardCheck, title: t("اختبارات قصيرة", "Short quizzes"), body: t("خمسة أسئلة بعد كل مستوى للمراجعة", "Five review questions after each level") },
            { icon: Award, title: t("شهادة إتمام", "Completion certificate"), body: t("تُحفظ في خزنة الوثائق برمز تحقق", "Saved in your document vault with a verification code") },
          ].map((f, i) => (
            <motion.li
              key={f.title}
              initial={{ opacity: 0, x: en ? 20 : -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex items-center gap-3 rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/10 backdrop-blur"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold text-ink">
                <f.icon className="size-5" />
              </span>
              <span>
                <span className="block font-bold">{f.title}</span>
                <span className="block text-sm text-white/70">{f.body}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
