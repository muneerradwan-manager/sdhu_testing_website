"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BadgeCheck,
  Bus,
  ClipboardCheck,
  Contact,
  Dices,
  FileStack,
  Fingerprint,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogIn,
  PencilLine,
  Plane,
  RadioTower,
  ScrollText,
  Settings2,
  ShieldCheck,
  UserCog,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Counter, Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { EMPLOYEES_SEED } from "@/lib/data/employees-seed";
import { ALL_PERMISSIONS, getStaff, PERMISSION_LABELS, STAFF, type Permission } from "@/lib/staff";
import { SYSTEMS } from "@/lib/systems";
import { useHydrated, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useStaffHome } from "./kit";

/** The portal's areas, each with the permission that opens it, in the order the season is worked: set up first */
const AREAS: { title: string; text: string; icon: LucideIcon; perms: Permission[] }[] = [
  { title: "إعدادات الموسم", text: "الحصة والأعمار والرسوم والأقساط، تُطبَّق فوراً على طلبات الحجاج وفحص أهليتهم.", icon: Settings2, perms: ["season.settings"] },
  { title: "إدارة الموظفين", text: "صلاحية واحدة تفتح الملف كله لصاحبها: سجل الموظفين الدائمين والمنتدبين، وحساباتهم في البوابة، ومشاركتهم في الموسم وأين أُسندوا وعلى أي رحلة.", icon: Contact, perms: ["staff.manage"] },
  { title: "الملفات التشغيلية", text: "التسكين في مكة ومخيمات منى وعرفات، والفنادق والقطاعات والمراكز.", icon: FileStack, perms: ["ops.files"] },
  { title: "محتوى الموقع", text: "كل عنوان وفقرة وصورة في الموقع العام: مسودة ثم نشر.", icon: PencilLine, perms: ["content.manage"] },
  { title: "مراجعة الطلبات", text: "ما لا تحسمه المنصة آلياً من طلبات الحجاج: اسم أم غير مطابق، أو صلة قرابة غير مؤكدة.", icon: ClipboardCheck, perms: ["registration.review"] },
  { title: "القبول والقرعة", text: "الأعمار المقبولة مباشرة، وإحصاء التسجيل الأولي على القرعة، وإدخال ما سُحب في البث، ثم الاعتماد والنشر.", icon: Dices, perms: ["lottery.import", "lottery.approve"] },
  { title: "إدارة الإداريين", text: "صلاحية واحدة تفتح الملف كله لصاحبها: قواعد الصفات وشروطها، والمتقدمون وملفاتهم، وتشكيل المجموعات واعتمادها، وطلبات تشكيل التكتلات واعتمادها ومعاونيهم وبرامجهم، والتقييم والتصنيف.", icon: UsersRound, perms: ["admins.manage"] },
  { title: "إدارة الامتحانات", text: "صلاحية واحدة تفتح الملف كله لصاحبها: المراكز ومشرفو قاعاتها، والمتقدمون ومراكزهم، والامتحانات ومواعيدها، وبنك الأسئلة، والتصحيح والنتائج والتقارير.", icon: GraduationCap, perms: ["exams.manage"] },
  { title: "إدارة الطيران", text: "صلاحية واحدة تفتح الملف كله لصاحبها: الرحلات ومقاعدها، ووضع المجموعات والموظفين عليها، وكشوف الركاب، ومندوبو المطارات الذين يسجلون الإقلاع والهبوط.", icon: Plane, perms: ["flights.manage"] },
  { title: "غرفة العمليات", text: "خريطة المشاعر والبلاغات الحية، وزمن الاستجابة لكل بلاغ حتى إغلاقه.", icon: RadioTower, perms: ["operations.room"] },
  { title: "الطبي والمواصلات", text: "مهام الفرق الميدانية في «مهامي اليوم»: جولات الحر، وحضور السائقين.", icon: Bus, perms: ["medical", "transport"] },
  { title: "سجل الأحداث", text: "كل إجراء باسم صاحبه ووقته، لا يُعدَّل ولا يُحذف.", icon: ScrollText, perms: ["audit.read"] },
];

const PRINCIPLES: { title: string; text: string; icon: LucideIcon }[] = [
  { title: "حساب لا يُنشأ ذاتياً", text: "تنشئ الموارد البشرية حساب كل موظف، وتصله كلمة مرور مؤقتة يغيّرها عند أول دخول.", icon: UserCog },
  { title: "صلاحية لكل ملف", text: "صلاحية إدارة الملف، كالامتحانات أو الطيران، تفتحه كله لصاحبها فيديره بتفاصيله، ويتابع المدير حاله وأحداثه المهمة. وما سواها صلاحية لكل مهمة.", icon: KeyRound },
  { title: "كل إجراء باسمك", text: "اعتماد، تعديل، إسناد، نشر: يُسجَّل كله في سجل الأحداث باسمك ووقته، ولا يُمحى.", icon: Fingerprint },
  { title: "أين أكون ومتى", text: "«ملفاتي التشغيلية» تعرض موقعك في الموسم ورحلتي ذهابك وعودتك ومديرك المباشر.", icon: LayoutDashboard },
];

const SEASON_FLOW: { title: string; text: string }[] = [
  { title: "التسجيل والمراجعة", text: "تفحص المنصة طلبات الحجاج آلياً، ويراجع الموظف ما يحتاج قراراً." },
  { title: "القرعة والنشر", text: "تُستورد النتائج المعتمدة من اللجنة، ثم تُعتمد وتُنشر للحجاج." },
  { title: "الإداريون والمجموعات", text: "امتحانات الإداريين، واعتماد المجموعات، وطلبات تشكيل التكتلات واعتمادها." },
  { title: "التفويج والطيران", text: "تُوضع المجموعات على رحلاتها، ويُسند الموظفون إلى مقاعدهم." },
  { title: "الميدان", text: "غرفة العمليات في المشاعر: البلاغات والفرق الطبية والحافلات." },
  { title: "التقييم", text: "تقييم الإداريين وتصنيف المجموعات والتكتلات لنهاية الموسم." },
];

/** What the holder of «إدارة الامتحانات» sees: the file's summary and management, the rest locked */
const PREVIEW: { label: string; icon: LucideIcon; open: boolean }[] = [
  { label: SYSTEMS.exams.summary.label, icon: LayoutDashboard, open: true },
  { label: SYSTEMS.exams.manage.label, icon: GraduationCap, open: true },
  { label: "ملفاتي التشغيلية", icon: FileStack, open: true },
  { label: "غرفة العمليات", icon: RadioTower, open: false },
  { label: "القبول والقرعة", icon: Dices, open: false },
];

/**
 * The staff portal's front page. Unlike the pilgrims' and the administrators', it offers no sign-up:
 * staff accounts are opened by human resources, so the only way in is «تسجيل الدخول».
 */
export function StaffLanding() {
  const hydrated = useHydrated();
  const sessionId = useStore((s) => s.staffSessionId);
  const user = hydrated ? getStaff(sessionId) : null;
  const home = useStaffHome(user);

  return (
    <div>
      {/* ───────── Hero ───────── */}
      <section className="relative isolate overflow-hidden bg-green-dark pb-24 pt-36 text-white md:pb-32 md:pt-44">
        <Image src="/images/clock-tower.jpg" alt="" fill priority sizes="100vw" quality={70} className="-z-20 object-cover opacity-25" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-bl from-ink/75 via-green-dark/90 to-[#00352f]" />
        <div className="bg-pattern absolute inset-0 -z-10 opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <motion.div aria-hidden className="absolute -left-40 top-20 -z-10 size-[28rem] rounded-full bg-gold/20 blur-3xl" animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 8, repeat: Infinity }} />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 md:px-8 lg:grid-cols-[1.25fr_1fr]">
          <Reveal>
            <nav aria-label="مسار التنقل" className="mb-5 flex items-center gap-1.5 text-sm text-white/70">
              <Link href="/" className="hover:text-gold">الرئيسية</Link>
              <span>/</span>
              <span className="text-gold">بوابة الموظفين</span>
            </nav>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/10 px-3.5 py-1.5 text-sm text-gold backdrop-blur">
              <ShieldCheck className="size-4" /> للموظفين الدائمين والمنتدبين — موسم 1448هـ
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.35] text-balance md:text-6xl">
              الموسم كله من <span className="text-gold-shine">مكان واحد</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-9 text-white/80">
              بوابة الموظفين تجمع عمل الإدارة والبعثة: مراجعة طلبات الحجاج وإعدادات الموسم والقرعة، والإداريين ومجموعاتهم، والطيران، وغرفة العمليات في
              المشاعر، والملفات التشغيلية. يرى كل موظف الأقسام التي تمنحه صلاحياتُه إياها، ويُسجَّل كل إجراء باسمه.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {user ? (
                <ButtonLink href={home} variant="gold" size="xl">
                  متابعة إلى أقسامي <ArrowLeft className="size-6" />
                </ButtonLink>
              ) : (
                <ButtonLink href="/staff/login" variant="gold" size="xl">
                  <LogIn className="size-6" /> تسجيل الدخول
                </ButtonLink>
              )}
              <p className="flex max-w-xs items-start gap-2 text-sm leading-6 text-white/65">
                <Lock className="mt-1 size-4 shrink-0 text-gold" /> لا إنشاء ذاتي للحسابات: تنشئها الموارد البشرية وتمنح الصلاحيات.
              </p>
            </div>
            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4">
              {[
                { k: "صلاحية تُمنح واحدة واحدة", v: ALL_PERMISSIONS.length },
                { k: "قسماً في البوابة", v: AREAS.length },
                { k: "موظفاً في سجل البعثة", v: EMPLOYEES_SEED.length },
              ].map((s) => (
                <div key={s.k} className="flex flex-col border-r-2 border-gold/40 pr-3">
                  <dt className="order-2 text-xs leading-5 text-white/60">{s.k}</dt>
                  <dd className="order-1 font-display text-3xl font-bold text-gold"><Counter to={s.v} /></dd>
                </div>
              ))}
            </dl>
          </Reveal>

          {/* What one holder sees: his file, the rest locked */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: -6 }}
            animate={{ opacity: 1, y: 0, rotate: -3 }}
            transition={{ delay: 0.3, type: "spring", damping: 18 }}
            className="relative mx-auto w-full max-w-sm"
          >
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gold/20 blur-2xl" />
            <div className="relative animate-float overflow-hidden rounded-[2rem] border border-gold/40 bg-gradient-to-br from-[#004a42] via-green-dark to-[#00352f] p-6 shadow-2xl">
              <div className="bg-pattern absolute inset-0 opacity-15" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs text-gold">بطاقة موظف — موسم 1448</p>
                  <p className="mt-1 font-display text-2xl font-bold">منير السيد</p>
                  <p className="text-sm text-white/75">مسؤول الامتحانات</p>
                </div>
                <span className="grid size-14 place-items-center rounded-2xl bg-gold font-display text-2xl font-bold text-ink">م</span>
              </div>
              <p className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/85 ring-1 ring-white/15">
                <KeyRound className="size-3.5 text-gold" /> صلاحية: {PERMISSION_LABELS["exams.manage"]}
              </p>
              <ul className="relative mt-4 space-y-1.5">
                {PREVIEW.map((it, i) => (
                  <motion.li
                    key={it.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.12 }}
                    className={cn("flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm", it.open ? "bg-white/10 text-white" : "text-white/40")}
                  >
                    <span className="flex items-center gap-2">
                      <it.icon className={cn("size-4", it.open ? "text-gold" : "")} /> {it.label}
                    </span>
                    {it.open ? <BadgeCheck className="size-4 text-green-light" /> : <Lock className="size-3.5" />}
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
        <svg className="absolute -bottom-px left-0 right-0 h-10 w-full text-sand md:h-14" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden>
          <path d="M0 60V30c240-30 480-30 720 0s480 30 720 0v30z" fill="currentColor" />
        </svg>
      </section>

      {/* ───────── Areas ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <SectionHeading eyebrow="أقسام البوابة" title="ماذا يُدار من هنا؟" description="كل قسم تفتحه صلاحية: لمهمة واحدة، أو لإدارة ملف كامل كالامتحانات والطيران. تظهر لك في القائمة الجانبية أقسامك وحدها، ويبقى الباقي مغلقاً." />
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AREAS.map((a) => (
            <StaggerItem key={a.title}>
              <motion.div whileHover={{ y: -4 }} className="group flex h-full gap-4 rounded-3xl border border-gold/30 bg-white p-5 transition hover:shadow-xl">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sand text-green-dark transition group-hover:bg-green-dark group-hover:text-gold">
                  <a.icon className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-ink">{a.title}</p>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">{a.text}</p>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {a.perms.map((p) => (
                      <span key={p} className="inline-flex items-center gap-1 rounded-full bg-green-dark/8 px-2.5 py-0.5 text-[11px] font-semibold text-green-dark">
                        <KeyRound className="size-3" /> {PERMISSION_LABELS[p]}
                      </span>
                    ))}
                  </p>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ───────── Principles ───────── */}
      <section className="relative overflow-hidden bg-green-dark py-20 text-white">
        <div className="bg-pattern absolute inset-0 opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading light eyebrow="كيف تعمل البوابة" title="حساب دائم، وصلاحيات واضحة، وأثر لكل إجراء" />
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((p) => (
              <StaggerItem key={p.title} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:bg-white/10">
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

      {/* ───────── The season, seen from the office ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <SectionHeading eyebrow="الموسم" title="الموسم من غرفة الإدارة" description="من أول طلب حج إلى آخر تقييم: كل مرحلة لها قسمها في البوابة وأصحاب صلاحيتها." />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SEASON_FLOW.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.05} y={14}>
              <li className="relative h-full rounded-3xl border border-gold/25 bg-white p-5">
                <span className="absolute left-5 top-4 font-display text-5xl font-bold text-gold/25">{i + 1}</span>
                <p className="font-display text-lg font-bold text-green-dark">{s.title}</p>
                <p className="mt-1 max-w-[85%] text-sm leading-6 text-ink-soft">{s.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ───────── Sign in ───────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-green-dark to-[#00352f] p-8 text-white md:p-12">
          <div className="bg-pattern absolute inset-0 opacity-15" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl">
              <p className="font-display text-3xl font-bold">لديك حساب موظف؟</p>
              <p className="mt-2 leading-8 text-white/75">
                ادخل باسم المستخدم وكلمة المرور التي وصلتك من الموارد البشرية. نسيت كلمة المرور؟ تواصل معها لتصلك كلمة مؤقتة جديدة. في النسخة التجريبية
                صفحة الدخول فيها بطاقات {STAFF.length} حساباً تجريبياً، وكلمة المرور لها كلها 1448.
              </p>
            </div>
            {user ? (
              <ButtonLink href={home} variant="gold" size="xl">
                متابعة إلى أقسامي <ArrowLeft className="size-6" />
              </ButtonLink>
            ) : (
              <ButtonLink href="/staff/login" variant="gold" size="xl">
                <LogIn className="size-6" /> تسجيل الدخول
              </ButtonLink>
            )}
          </div>
        </Reveal>
      </section>
    </div>
  );
}
