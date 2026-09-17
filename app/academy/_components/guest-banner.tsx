"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Award, BarChart3, ClipboardCheck, PlayCircle, UserPlus } from "lucide-react";
import { useHydrated, useStore } from "@/lib/store";

type Item = { track: string; slug: string; title: string; trackTitle: string };

/** Guests get the account pitch; signed-in pilgrims get a "continue where you left off" card */
export function GuestBanner({ path }: { path: Item[] }) {
  const hydrated = useHydrated();
  const session = useStore((s) => s.sessionId);
  const academy = useStore((s) => s.academy);

  if (hydrated && session) {
    const next = path.find((i) => !academy[`${i.track}/${i.slug}`]);
    const done = path.length - path.filter((i) => !academy[`${i.track}/${i.slug}`]).length;
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl bg-green-dark p-6 text-white sm:p-8">
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold text-gold">مرحباً بعودتك</p>
            <p className="mt-1 font-display text-2xl font-bold">
              {next ? `تابع من حيث توقفت: ${next.title}` : "ما شاء الله! أتممت جميع الدروس"}
            </p>
            <p className="mt-1 text-sm text-white/70">
              أتممت {done} من {path.length} درساً في الأكاديمية
            </p>
          </div>
          {next && (
            <Link href={`/academy/${next.track}/${next.slug}`} className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gold px-6 py-3.5 font-bold text-ink transition hover:bg-gold-dark hover:text-white">
              <PlayCircle className="size-5" /> متابعة التعلّم
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
      className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-maroon-dark via-maroon to-maroon-light p-6 text-white shadow-[0_30px_70px_-40px_rgba(103,33,70,.9)] sm:p-10"
    >
      <div className="bg-pattern absolute inset-0 opacity-15" />
      <motion.span
        className="absolute -left-16 -top-16 size-64 rounded-full bg-gold/15 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-gold">
            <span className="size-1.5 rotate-45 bg-gold" /> تتصفح الآن كزائر
          </span>
          <p className="mt-4 font-display text-2xl font-bold leading-relaxed sm:text-3xl">أنشئ حساباً لتتبع تقدمك، وأداء الاختبارات القصيرة، والحصول على شهادة إتمام المسار</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-2xl bg-gold px-6 py-3.5 font-bold text-ink shadow-lg transition hover:-translate-y-0.5 hover:bg-white">
              <UserPlus className="size-5" /> إنشاء حساب مجاني
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 font-semibold backdrop-blur hover:bg-white/20">
              لدي حساب
            </Link>
          </div>
        </div>
        <ul className="grid gap-3">
          {[
            { icon: BarChart3, title: "تتبع التقدم", body: "يُحفظ ما أتممته على كل أجهزتك" },
            { icon: ClipboardCheck, title: "اختبارات قصيرة", body: "خمسة أسئلة بعد كل مستوى للمراجعة" },
            { icon: Award, title: "شهادة إتمام", body: "تُحفظ في خزنة الوثائق برمز تحقق" },
          ].map((f, i) => (
            <motion.li
              key={f.title}
              initial={{ opacity: 0, x: -20 }}
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
