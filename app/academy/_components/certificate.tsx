"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Award, FolderLock, Lock, Printer } from "lucide-react";
import { useState, type PointerEvent } from "react";
import { useToast } from "@/components/ui/widgets";
import { useHydrated, useStore } from "@/lib/store";
import { fullName, getPerson } from "@/lib/registry";
import { cn, hijriDate, maskNationalId, seeded } from "@/lib/utils";
import { LESSON_FORMS, arabicCount } from "@/lib/data/academy";

const HOUR_FORMS = { one: "ساعة واحدة", two: "ساعتين", few: "ساعات", many: "ساعة" };

export function Certificate({
  trackSlug,
  trackTitle,
  lessonSlugs,
  hours,
  lecturer,
}: {
  trackSlug: string;
  trackTitle: string;
  lessonSlugs: string[];
  hours: number;
  lecturer: string;
}) {
  const hydrated = useHydrated();
  const session = useStore((s) => s.sessionId);
  const academy = useStore((s) => s.academy);
  const toast = useToast();
  const [issued] = useState(() => new Date());

  const loggedIn = hydrated && !!session;
  const done = loggedIn ? lessonSlugs.filter((l) => academy[`${trackSlug}/${l}`]).length : 0;
  const unlocked = loggedIn && done === lessonSlugs.length;
  const person = loggedIn && session ? getPerson(session) : null;
  const name = person ? fullName(person) : "اسم الحاج الكامل";
  const title = person?.gender === "F" ? "الحاجة" : "الحاج";
  const rand = seeded(`${session ?? "guest"}-${trackSlug}`);
  const certNo = `ACD-${trackSlug.slice(0, 3).toUpperCase()}-${Math.floor(rand() * 900000 + 100000)}`;

  // subtle 3D tilt
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 150, damping: 18 });
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-gold/30 px-3 py-1 text-xs font-bold text-maroon">
          <Award className="size-4" /> شهادة إتمام المسار
        </span>
        <h2 className="mt-3 font-display text-3xl font-bold text-green-dark md:text-4xl">شهادتك بانتظارك</h2>
        <p className="mt-3 leading-8 text-ink-soft">
          عند إتمام جميع دروس المسار تصدر شهادة إلكترونية برمز تحقق. تُحفظ في خزنة الوثائق، وتظهر توصيةً مستوفاة في قائمة التجهيز قبل السفر.
        </p>

        <div className="mt-6 rounded-3xl border border-gold/35 bg-white p-5">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-ink-soft">تقدمك في المسار</span>
            <span className="tabular-nums text-green-dark">
              {done}/{lessonSlugs.length}
            </span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gold-light">
            <motion.div
              className="h-full rounded-full bg-gradient-to-l from-green-light to-green-dark"
              initial={{ width: 0 }}
              whileInView={{ width: `${(done / lessonSlugs.length) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          {!loggedIn ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/register" className="rounded-xl bg-green-dark px-4 py-2 text-sm font-bold text-white hover:bg-green">
                أنشئ حساباً لتحصل على الشهادة
              </Link>
              <Link href="/login" className="rounded-xl border border-green-dark/20 px-4 py-2 text-sm font-semibold text-green-dark hover:bg-green-dark/5">
                دخول
              </Link>
            </div>
          ) : unlocked ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-green-dark px-4 py-2 text-sm font-bold text-white hover:bg-green">
                <Printer className="size-4" /> طباعة
              </button>
              <button
                type="button"
                onClick={() => toast({ title: "حُفظت الشهادة في خزنة الوثائق", body: `شهادة «${trackTitle}» متاحة الآن في حسابك.`, tone: "gold", icon: "🏅" })}
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-ink hover:bg-gold-dark hover:text-white"
              >
                <FolderLock className="size-4" /> حفظ في خزنة الوثائق
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-hint">بقي {arabicCount(lessonSlugs.length - done, LESSON_FORMS)} لفتح الشهادة.</p>
          )}
        </div>
      </div>

      <div style={{ perspective: 1200 }} onPointerMove={onMove} onPointerLeave={() => {
          mx.set(0);
          my.set(0);
        }}>
        <motion.div
          style={{ rotateX: rx, rotateY: ry }}
          initial={{ opacity: 0, y: 40, rotate: -2 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[28px] bg-gradient-to-br from-gold via-gold-dark to-gold p-[3px] shadow-[0_40px_80px_-40px_rgba(173,158,110,.9)]"
        >
          <div className="relative overflow-hidden rounded-[26px] bg-[#fffdf7] p-3 sm:p-4">
            <div className="bg-pattern-dark absolute inset-0 opacity-70" />
            <div className="relative rounded-[20px] border-2 border-gold-dark/60 p-1">
              <div className="relative rounded-[16px] border border-gold/70 px-5 py-7 text-center sm:px-10 sm:py-10">
                {/* The ornament is drawn as a top-left corner; the others are its mirror images */}
                {["left-2 top-2", "right-2 top-2 -scale-x-100", "bottom-2 left-2 -scale-y-100", "bottom-2 right-2 -scale-100"].map((pos) => (
                  <svg key={pos} viewBox="0 0 40 40" className={cn("absolute size-8 text-gold-dark sm:size-10", pos)} aria-hidden>
                    <path d="M38 2H14C7 2 2 7 2 14v24" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M30 2c0 8-6 14-14 14M2 30c8 0 14-6 14-14" fill="none" stroke="currentColor" strokeWidth="1" />
                    <path d="M16 10l3 3-3 3-3-3z" fill="currentColor" />
                  </svg>
                ))}

                <p className="text-[11px] font-bold tracking-wide text-gold-dark sm:text-xs">الجمهورية العربية السورية • إدارة الحج والعمرة</p>
                <p className="mt-1 font-display text-sm text-green-dark sm:text-base">أكاديمية الدروس الدينية</p>
                <h3 className="mt-3 font-display text-3xl font-bold text-maroon sm:text-5xl">شهادة إتمام</h3>
                <svg viewBox="0 0 120 12" className="mx-auto mt-2 h-3 w-28" aria-hidden>
                  <path d="M0 6h46M74 6h46" stroke="#AD9E6E" strokeWidth="1.2" />
                  <path d="M60 0l6 6-6 6-6-6z" fill="#AD9E6E" />
                </svg>
                <p className="mt-4 text-sm text-ink-soft sm:text-base">تشهد الأكاديمية بأن {title}</p>
                <p className={cn("mt-2 font-display text-2xl font-bold sm:text-4xl", unlocked ? "text-green-dark" : "text-green-dark/40")}>{name}</p>
                {person && session && <p className="mt-1 text-xs tabular-nums text-hint">الرقم الوطني: {maskNationalId(session)}</p>}
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink-soft sm:text-base">
                  {person?.gender === "F" ? "قد أتمّت" : "قد أتمّ"} جميع دروس مسار <strong className="text-maroon">«{trackTitle}»</strong> بعدد {arabicCount(lessonSlugs.length, LESSON_FORMS)} ومدة {arabicCount(Math.max(1, hours), HOUR_FORMS)} تعليمية.
                </p>

                <div className="mt-6 flex items-end justify-between gap-3 text-right">
                  <div className="min-w-0">
                    <p className="text-[10px] text-hint sm:text-xs">المحاضر المشرف</p>
                    <p className="truncate font-display text-xs text-green-dark sm:text-sm">{lecturer}</p>
                    <p className="mt-2 text-[10px] text-hint sm:text-xs">تاريخ الإصدار</p>
                    <p className="text-xs font-semibold text-ink sm:text-sm">{hydrated ? hijriDate(issued) : "—"}</p>
                  </div>
                  <Seal />
                  <div className="flex flex-col items-center gap-1">
                    <div className="rounded-xl border border-gold/60 bg-white p-1.5">
                      <QRCodeSVG value={`https://hajj.gov.sy/verify/academy/${certNo}`} size={64} fgColor="#00594F" bgColor="#ffffff" level="M" />
                    </div>
                    <p className="text-[9px] font-semibold tabular-nums text-hint sm:text-[10px]" dir="ltr">
                      {certNo}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {!unlocked && (
              <div className="absolute inset-0 grid place-items-center bg-[#fffdf7]/55 backdrop-blur-[3px]">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} className="flex flex-col items-center rounded-3xl bg-green-dark/95 px-6 py-5 text-center text-white shadow-2xl">
                  <span className="relative grid size-14 place-items-center rounded-full bg-gold/20 text-gold">
                    <Lock className="size-7" />
                    <span className="absolute inset-0 animate-ping rounded-full bg-gold/20 [animation-duration:2.5s]" />
                  </span>
                  <p className="mt-3 font-display text-lg font-bold">الشهادة مقفلة</p>
                  <p className="mt-1 max-w-56 text-sm text-white/75">{loggedIn ? `بقي ${arabicCount(lessonSlugs.length - done, LESSON_FORMS)} لفتحها` : "للمسجلين فقط بعد إتمام المسار"}</p>
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Seal() {
  return (
    <div className="relative grid size-20 shrink-0 place-items-center sm:size-24">
      <svg viewBox="0 0 100 100" className="absolute inset-0 animate-spin-slow text-gold-dark" aria-hidden>
        <defs>
          <path id="seal-circle" d="M50 50m-38 0a38 38 0 1 1 76 0a38 38 0 1 1-76 0" />
        </defs>
        <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" />
        <text fontSize="9" fill="currentColor" fontWeight="700">
          <textPath href="#seal-circle">المنصة الوطنية للحج • أكاديمية الدروس •</textPath>
        </text>
      </svg>
      <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-ink shadow-inner sm:size-13">
        <Award className="size-6" />
      </span>
    </div>
  );
}
