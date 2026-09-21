"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Crown,
  FileSignature,
  FlaskConical,
  GraduationCap,
  HandHeart,
  LogIn,
  MapPinned,
  MonitorSmartphone,
  ShieldCheck,
  Star,
  UserPlus,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Counter, Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { useToast } from "@/components/ui/widgets";
import { useSeason } from "@/lib/season-live";
import { useHydrated, useStore } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { ADMIN_CALENDAR, DEMO_ADMINS, POSITIONS, demoAdminLogin } from "../_lib/admin";

const ROLES: { level: string; items: { title: string; text: string; icon: LucideIcon }[]; tone: string }[] = [
  {
    level: "مستوى التكتل",
    tone: "from-maroon-dark to-maroon",
    items: [
      { title: "رئيس تكتل", text: "يشرف على مجموعات التكتل كلها ويمثّله أمام الإدارة.", icon: Crown },
      { title: "معاون رئيس تكتل", text: "ينوب عنه ويتابع النقل والإسكان على مستوى التكتل.", icon: Building2 },
    ],
  },
  {
    level: "مستوى المجموعة",
    tone: "from-green-dark to-green",
    items: [
      { title: "رئيس مجموعة", text: "يقود حتى 50 حاجاً يختارون مجموعته ويسجّلهم منسقها: التجمّعات والإعلانات والتقرير اليومي.", icon: UsersRound },
      { title: "معاون رئيس مجموعة", text: "الحضور والتجمّع وتوزيع الوجبات الخاصة.", icon: ClipboardCheck },
    ],
  },
  {
    level: "فريق المجموعة",
    tone: "from-gold-dark to-gold",
    items: [
      { title: "موجّه ديني / موجّهة", text: "الدروس والمناسك والإجابة عن الأسئلة الشرعية.", icon: BookOpenCheck },
      { title: "منسق تقني", text: "يساعد الحجاج في التطبيق والبطاقة الرقمية والإشعارات.", icon: MonitorSmartphone },
    ],
  },
];

const PHASES: { title: string; text: string; icon: LucideIcon }[] = [
  { title: "التأهيل", text: "طلب مشاركة، أهلية، امتحان كتابي على المنصة، وشفهي أمام لجنة.", icon: GraduationCap },
  { title: "التشكيل", text: "الناجحون يشكّلون مجموعاتهم بأنفسهم، ويعتمدها مدير المكتب.", icon: FileSignature },
  { title: "التحضير", text: "تدريب إلزامي، استلام الحجاج المفوَّجين، وتسجيل ملفاتهم الصحية.", icon: HandHeart },
  { title: "الميدان", text: "تجمّعات بمسح البطاقة، إعلانات، بلاغات، وتقرير كل ليلة.", icon: MapPinned },
  { title: "التقييم", text: "من الموظفين والحجاج ورئيس التكتل ومؤشرات آلية.", icon: Star },
];

const CONDITIONS = [
  { k: "العمر", v: "بين 25 و60 عاماً" },
  { k: "المؤهل", v: "شهادة جامعية أو خبرة موسمين" },
  { k: "السجل", v: "وثيقة «لا حكم عليه» حديثة" },
  { k: "التقييم السابق", v: "لا يقل عن 3.5 من 5 (لمن عمل سابقاً)" },
  { k: "الانضباط", v: "لم يُستبعد تأديبياً في موسم سابق" },
  { k: "الرسم", v: "رسم تسجيل الإداري مسدد" },
];

const WEIGHTS = [
  { k: "الموظفون", v: 40, c: "bg-green-dark" },
  { k: "الحجاج", v: 25, c: "bg-green-light" },
  { k: "مؤشرات آلية", v: 15, c: "bg-gold-dark" },
  { k: "رئيس التكتل", v: 10, c: "bg-maroon" },
  { k: "التأهيل", v: 10, c: "bg-maroon-light/70" },
];

export function AdministratorLanding() {
  const router = useRouter();
  const toast = useToast();
  const hydrated = useHydrated();
  const season = useSeason();
  const accounts = useStore((s) => s.accounts);
  const admins = useStore((s) => s.admins);
  const session = useStore((s) => s.adminSessionId);

  const demo = (id: string, mode: "start" | "done") => {
    const error = demoAdminLogin({ accounts, admins }, id, mode);
    if (error) return toast({ title: "لا يمكن الدخول كإداري", body: error, tone: "warning", icon: "⛔" });
    toast({ title: "دخول تجريبي سريع", body: mode === "done" ? "ملف مكتمل: ناجح، المجموعة 27 معتمدة والعقود موقّعة." : "ملف إداري جديد لموسم 1448.", icon: "⚡", tone: "success" });
    router.push(mode === "done" ? "/administrator/requests" : "/administrator/dashboard");
  };

  return (
    <div>
      {/* ───────── Hero ───────── */}
      <section className="relative isolate overflow-hidden bg-maroon-dark pb-24 pt-36 text-white md:pb-32 md:pt-44">
        <Image src="/images/umayyad.jpg" alt="" fill priority sizes="100vw" quality={70} className="-z-20 object-cover opacity-30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-bl from-ink/70 via-maroon-dark/85 to-green-dark/95" />
        <div className="bg-pattern absolute inset-0 -z-10 opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <motion.div aria-hidden className="absolute -left-40 top-20 -z-10 size-[28rem] rounded-full bg-gold/20 blur-3xl" animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 8, repeat: Infinity }} />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 md:px-8 lg:grid-cols-[1.25fr_1fr]">
          <Reveal>
            <nav aria-label="مسار التنقل" className="mb-5 flex items-center gap-1.5 text-sm text-white/70">
              <Link href="/" className="hover:text-gold">الرئيسية</Link>
              <span>/</span>
              <span className="text-gold">الإداري الموسمي</span>
            </nav>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/10 px-3.5 py-1.5 text-sm text-gold backdrop-blur">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-green-light" />
                <span className="relative size-2 rounded-full bg-green-light" />
              </span>
              طلبات المشاركة لموسم 1448هـ: 10 ربيع الأول – 1 ربيع الآخر
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.35] text-balance md:text-6xl">
              كن في خدمة <span className="text-gold-shine">ضيوف الرحمن</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-9 text-white/80">
              الإداري الموسمي يرافق الحجاج من دمشق حتى العودة: يقود مجموعة، أو يعاون، أو يوجّه، أو يساعد تقنياً. رحلتك كلها على المنصة — من
              الامتحان إلى تشكيل المجموعة إلى الميدان — ما عدا الامتحان الشفهي الذي يُجرى أمام لجنة.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {hydrated && session ? (
                <ButtonLink href="/administrator/dashboard" variant="gold" size="xl">
                  متابعة إلى ملفي كإداري <ArrowLeft className="size-6" />
                </ButtonLink>
              ) : (
                <ButtonLink href="/administrator/register" variant="gold" size="xl">
                  <UserPlus className="size-6" /> أنشئ حسابك الإداري
                </ButtonLink>
              )}
              <ButtonLink href="/administrator/login" variant="glass" size="xl">
                <LogIn className="size-6" /> تسجيل الدخول
              </ButtonLink>
            </div>
            <dl className="mt-10 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { k: "متقدماً في الموسم الماضي", v: 1380 },
                { k: "حد النجاح من 100", v: 70 },
                { k: "حاجاً كحد أعلى للمجموعة", v: 50 },
                { k: "دولاراً رسم التسجيل", v: season.fees.administratorRegistration },
              ].map((s) => (
                <div key={s.k} className="flex flex-col border-r-2 border-gold/40 pr-3">
                  <dt className="order-2 text-xs leading-5 text-white/60">{s.k}</dt>
                  <dd className="order-1 font-display text-3xl font-bold text-gold"><Counter to={s.v} /></dd>
                </div>
              ))}
            </dl>
          </Reveal>

          {/* Floating credential */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: -6 }}
            animate={{ opacity: 1, y: 0, rotate: -3 }}
            transition={{ delay: 0.3, type: "spring", damping: 18 }}
            className="relative mx-auto w-full max-w-sm"
          >
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gold/20 blur-2xl" />
            <div className="relative animate-float overflow-hidden rounded-[2rem] border border-gold/40 bg-gradient-to-br from-green-dark via-green to-maroon p-6 shadow-2xl">
              <div className="bg-pattern absolute inset-0 opacity-20" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs text-gold">بطاقة إداري — موسم 1448</p>
                  <p className="mt-1 font-display text-2xl font-bold">أحمد سليمان الحمصي</p>
                  <p className="text-sm text-white/75">رئيس المجموعة 27 — تكتل النور</p>
                </div>
                <span className="grid size-14 place-items-center rounded-2xl bg-gold font-display text-2xl font-bold text-ink">أ</span>
              </div>
              <div className="relative mt-6 flex items-end justify-between gap-4">
                <ul className="space-y-1.5 text-sm">
                  {["التأهيل 85.8 — ناجح", "العقود موقّعة", "48 من 50 حاجاً"].map((t, i) => (
                    <motion.li key={t} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.15 }} className="flex items-center gap-1.5">
                      <BadgeCheck className="size-4 text-gold" /> {t}
                    </motion.li>
                  ))}
                </ul>
                <div className="rounded-xl bg-white p-1.5">
                  <QRCodeSVG value="https://hajj-demo.sy/verify/admin/1448-27" size={64} fgColor="#00594F" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        <svg className="absolute -bottom-px left-0 right-0 h-10 w-full text-sand md:h-14" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden>
          <path d="M0 60V30c240-30 480-30 720 0s480 30 720 0v30z" fill="currentColor" />
        </svg>
      </section>

      {/* ───────── Roles ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <SectionHeading eyebrow="الصفات الموسمية" title="من يعمل مع الحجاج في الموسم؟" description="تدير الإدارة قائمة الصفات كل موسم. تختار في طلبك صفة أو أكثر بالترتيب، وتُمنح صلاحياتك تلقائياً بحسب الصفة التي تُعتمد لها." />
        <div className="grid gap-6 lg:grid-cols-3">
          {ROLES.map((r, ri) => (
            <Reveal key={r.level} delay={ri * 0.1} className="relative">
              <div className={cn("relative overflow-hidden rounded-t-[2rem] bg-gradient-to-l px-6 py-4 text-white", r.tone)}>
                <div className="bg-pattern absolute inset-0 opacity-15" />
                <p className="relative font-display text-lg font-bold">{r.level}</p>
              </div>
              <div className="space-y-3 rounded-b-[2rem] border border-t-0 border-gold/30 bg-white p-4">
                {r.items.map((it) => (
                  <motion.div key={it.title} whileHover={{ x: -4 }} className="group flex gap-4 rounded-2xl p-3 transition hover:bg-sand">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sand text-green-dark transition group-hover:bg-green-dark group-hover:text-gold">
                      <it.icon className="size-6" />
                    </span>
                    <div>
                      <p className="font-bold text-ink">{it.title}</p>
                      <p className="mt-0.5 text-sm leading-6 text-ink-soft">{it.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              {ri < 2 && <span aria-hidden className="absolute -left-5 top-1/2 hidden text-3xl text-gold-dark lg:block">‹</span>}
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── Phases ───────── */}
      <section className="relative overflow-hidden bg-green-dark py-20 text-white">
        <div className="bg-pattern absolute inset-0 opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading light eyebrow="الرحلة" title="من الامتحان إلى الميدان" description="مسار الإداري كله يسبق تسجيل الحجاج؛ لأن التكتلات والمجموعات تُشكَّل وتُعتمد قبل فتح التسجيل." />
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PHASES.map((p, i) => (
              <StaggerItem key={p.title} className="relative rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:bg-white/10">
                <span className="absolute left-5 top-5 font-display text-5xl font-bold text-white/10">{i + 1}</span>
                <span className="grid size-12 place-items-center rounded-2xl bg-gold text-ink">
                  <p.icon className="size-6" />
                </span>
                <p className="mt-4 font-display text-xl font-bold text-gold">{p.title}</p>
                <p className="mt-2 text-sm leading-7 text-white/75">{p.text}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ───────── Calendar + requirements ───────── */}
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 md:px-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionHeading align="start" eyebrow="تقويم الإداريين" title="مواعيد موسم 1448هـ" className="mb-8" />
          <ol className="relative space-y-3 border-r-2 border-gold-light pr-6">
            {ADMIN_CALENDAR.map((c, i) => (
              <Reveal key={c.title} delay={i * 0.04} y={14}>
                <li className="relative rounded-2xl border border-gold/25 bg-white p-4 transition hover:-translate-x-1 hover:shadow-md">
                  <span className={cn("absolute -right-[33px] top-5 size-4 rounded-full ring-4 ring-sand", i < 6 ? "bg-maroon" : "bg-green-light")} />
                  <p className="flex items-center gap-2 text-sm font-bold text-maroon">
                    <CalendarDays className="size-4" /> {c.hijri}
                  </p>
                  <p className="mt-1 font-bold text-ink">{c.title}</p>
                  <p className="text-sm text-ink-soft">{c.detail}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>

        <div className="space-y-6">
          <Reveal className="rounded-[2rem] border border-gold/30 bg-white p-6 md:p-8">
            <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
              <ShieldCheck className="size-6 text-gold-dark" /> شروط الأهلية
            </h3>
            <p className="mt-1 text-sm text-hint">من إعدادات الموسم — تُطبَّق آلياً على كل طلب</p>
            <ul className="mt-5 divide-y divide-gold-light">
              {CONDITIONS.map((c) => (
                <li key={c.k} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="font-bold text-ink">{c.k}</span>
                  <span className="text-left text-ink-soft">{c.v}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-2xl bg-sand p-4 text-sm leading-7 text-ink-soft">
              من اعتُمد سابقاً بالصفة نفسها يُعفى من الامتحان ويكتفي بلقاء شفهي أمام لجنة اللقاءات.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="grid grid-cols-2 gap-3">
            {[
              { k: "رسم تسجيل الإداري", v: season.fees.administratorRegistration, tone: "bg-maroon text-white" },
              { k: "رسم تشكيل مجموعة", v: season.fees.groupFormation, tone: "bg-gold text-ink" },
            ].map((f) => (
              <div key={f.k} className={cn("rounded-3xl p-5", f.tone)}>
                <p className="text-sm opacity-80">{f.k}</p>
                <p className="mt-1 font-display text-3xl font-bold" dir="ltr">{formatUSD(f.v)}</p>
              </div>
            ))}
          </Reveal>

          <Reveal delay={0.15} className="rounded-[2rem] border border-gold/30 bg-white p-6 md:p-8">
            <h3 className="font-display text-xl font-bold text-green-dark">كيف تُقيَّم في الموسم؟</h3>
            <div className="mt-5 flex h-4 overflow-hidden rounded-full" dir="ltr">
              {WEIGHTS.map((w, i) => (
                <motion.span key={w.k} className={w.c} initial={{ width: 0 }} whileInView={{ width: `${w.v}%` }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.12, duration: 0.7 }} />
              ))}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {WEIGHTS.map((w) => (
                <li key={w.k} className="flex items-center gap-2">
                  <span className={cn("size-3 rounded-full", w.c)} /> {w.k} <span className="font-bold text-ink">{w.v}%</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ───────── Demo ───────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <Reveal className="relative overflow-hidden rounded-[2rem] border-2 border-dashed border-gold-dark/60 bg-gold/15 p-6 md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 font-display text-2xl font-bold text-maroon">
                <FlaskConical className="size-6" /> جرّب رحلة الإداري بضغطة واحدة
              </p>
              <p className="mt-1 text-ink-soft">حسابات تجريبية من الشؤون المدنية الوهمية — رمز التحقق دائماً 1448.</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-ink-soft">لكل صفة إداريان: الأول أنهى رحلته فترى كل ما يظهر له، والثاني لم يبدأ بعد.</p>
          <div className="mt-6 space-y-5">
            {POSITIONS.filter((pos) => DEMO_ADMINS.some((d) => d.position === pos.key)).map((pos) => (
              <div key={pos.key}>
                <p className="mb-2 font-bold text-maroon">{pos.label}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {DEMO_ADMINS.filter((d) => d.position === pos.key).map((d) => (
                    <DemoCard key={d.id} title={d.title} note={d.note} badge={d.mode === "done" ? "أنهى رحلته" : "لم يبدأ بعد"} onClick={() => demo(d.id, d.mode)} id={d.id} gold={d.mode === "done"} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function DemoCard({ title, note, badge, onClick, id, gold }: { title: string; note: string; badge: string; onClick: () => void; id: string; gold?: boolean }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "group flex h-full flex-col rounded-3xl p-5 text-right shadow-sm transition hover:shadow-xl",
        gold ? "bg-green-dark text-white" : "bg-white",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", gold ? "bg-gold text-ink" : "bg-maroon/10 text-maroon")}>{badge}</span>
        <span className={cn("font-mono text-xs", gold ? "text-white/60" : "text-hint")} dir="ltr">{id}</span>
      </span>
      <span className={cn("mt-3 font-display text-lg font-bold", gold ? "text-gold" : "text-green-dark")}>{title}</span>
      <span className={cn("mt-1 flex-1 text-sm leading-6", gold ? "text-white/75" : "text-ink-soft")}>{note}</span>
      <span className={cn("mt-4 inline-flex items-center gap-2 text-sm font-bold", gold ? "text-gold" : "text-green-dark")}>
        <Zap className="size-4" /> دخول فوري <ArrowLeft className="size-4 transition group-hover:-translate-x-1" />
      </span>
    </motion.button>
  );
}
