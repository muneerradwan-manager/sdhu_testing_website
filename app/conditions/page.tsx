import type { Metadata } from "next";
import Image from "next/image";
import {
  Accessibility,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  Flag,
  HeartPulse,
  Landmark,
  Moon,
  ShieldCheck,
  UserRound,
  Users,
  UsersRound,
  Venus,
} from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { ButtonLink } from "@/components/ui/button";
import { SEASON } from "@/lib/season";
import { AgeRuler } from "./_components/age-ruler";
import { FeesCalculator } from "./_components/fees-calculator";
import { AcceptanceSplit } from "./_components/acceptance-split";
import { SeasonTimeline } from "./_components/season-timeline";
import { PrecheckForm } from "./_components/precheck-form";
import { Faq } from "./_components/faq";

export const metadata: Metadata = {
  title: "شروط التسجيل والتكاليف",
  description: "شروط موسم الحج 1448هـ، وحدود الطلب، والرسوم والتكاليف مع حاسبة، ونسبتا القبول، وتقويم الموسم، وفحص أهلية مبدئي — بيانات تجريبية.",
};

const R = SEASON.rules;

const FIXED = [
  { icon: Moon, title: "مسلم", text: "وفق سجل الشؤون المدنية." },
  { icon: Flag, title: "سوري الجنسية", text: "يحمل الجنسية السورية ورقماً وطنياً صحيحاً." },
  { icon: Landmark, title: "لم يؤدِّ الحج سابقاً", text: "إلا من يرافق أمه أو زوجته محرماً لها في الطلب نفسه." },
  { icon: HeartPulse, title: "غير مصاب بمرض عضال", text: "حفاظاً على سلامة الحاج، ويُقدَّم إقرار صحي بذلك." },
];

const AGE_RULES = [
  { icon: UserRound, title: "صاحب الطلب", rule: `مواليد ${R.applicantMaxBirthYear} فما قبل`, note: "29 عاماً فأكثر" },
  { icon: Users, title: "المرافق", rule: `مواليد ${R.companionMaxBirthYear} فما قبل`, note: "17 عاماً فأكثر" },
  { icon: Venus, title: "المرأة تحتاج محرماً", rule: `مواليد ${R.womanNeedsMahramMinBirthYear} فما بعد`, note: "دون 44 عاماً" },
  { icon: Accessibility, title: "يحتاج مرافقاً حصراً", rule: `مواليد ${R.elderlyNeedsCompanionMaxBirthYear} فما قبل`, note: "69 عاماً فأكثر" },
];

const SECTIONS = [
  ["#fixed", "الشروط الثابتة"],
  ["#ages", "شروط العمر"],
  ["#limits", "حدود الطلب"],
  ["#fees", "التكاليف"],
  ["#acceptance", "طريقة القبول"],
  ["#calendar", "التقويم"],
  ["#precheck", "فحص الأهلية"],
  ["#faq", "الأسئلة الشائعة"],
] as const;

export default function ConditionsPage() {
  return (
    <>
      <PageHero
        title={
          <>
            شروط التسجيل <span className="text-gold-shine">والتكاليف</span>
          </>
        }
        description={`كل ما تحتاج معرفته قبل التقديم لموسم ${SEASON.hijriYear}هـ: الشروط، وحدود الطلب، والرسوم، وطريقة القبول، ومواعيد الموسم. الشروط تعتمدها الإدارة وتنشرها قبل فتح التسجيل.`}
        image="/images/pilgrim-elder.jpg"
        crumbs={[{ label: "شروط التسجيل والتكاليف" }]}
      >
        <nav aria-label="أقسام الصفحة" className="scrollbar-none -mx-4 mt-7 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {SECTIONS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:border-gold hover:bg-gold hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>
      </PageHero>

      {/* Fixed conditions */}
      <section id="fixed" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-16 md:px-8 md:pt-24">
        <SectionHeading eyebrow="ثابتة في كل موسم" title="الشروط الأساسية" description="أربعة شروط لا تتغير من موسم إلى آخر، وتنطبق على كل فرد في الطلب." />
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FIXED.map((f, i) => (
            <StaggerItem key={f.title}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-gold/40 bg-white p-6 shadow-[0_20px_50px_-40px_rgba(0,89,79,.6)] transition duration-500 hover:-translate-y-1.5 hover:border-gold-dark/60 hover:shadow-[0_30px_60px_-35px_rgba(0,89,79,.55)]">
                <span className="absolute -left-6 -top-6 font-display text-8xl font-bold text-gold/20 transition duration-500 group-hover:text-gold/40">{i + 1}</span>
                <span className="relative flex size-14 items-center justify-center rounded-2xl bg-green-dark text-gold shadow-[0_10px_24px_-10px_rgba(0,89,79,.8)] transition duration-500 group-hover:-rotate-6 group-hover:scale-110">
                  <f.icon className="size-7" />
                </span>
                <h3 className="relative mt-5 font-display text-xl font-bold text-green-dark">{f.title}</h3>
                <p className="relative mt-2 text-sm leading-7 text-ink-soft">{f.text}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Age rules */}
      <section id="ages" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 md:px-8 md:pt-28">
        <SectionHeading
          eyebrow={`موسم ${SEASON.hijriYear}هـ`}
          title="شروط العمر بسنة الميلاد"
          description="تضبطها الإدارة لكل موسم بسنة الميلاد، فتتغير من موسم إلى آخر دون أي تعديل في النظام."
        />
        <Stagger className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {AGE_RULES.map((a) => (
            <StaggerItem key={a.title}>
              <div className="flex h-full items-start gap-3 rounded-3xl border border-gold/40 bg-white p-4 sm:p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold/35 text-maroon">
                  <a.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{a.title}</p>
                  <p className="mt-1 font-display text-lg font-bold leading-6 text-green-dark">{a.rule}</p>
                  <p className="text-xs text-ink-soft">{a.note}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
        <Reveal>
          <AgeRuler />
        </Reveal>
      </section>

      {/* Limits */}
      <section id="limits" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 md:px-8 md:pt-28">
        <SectionHeading eyebrow="حدود الطلب" title="من يمكن أن يكون في طلبك؟" description="الطلب العائلي يُعامل كوحدة واحدة في القبول والسكن والنقل: تُقبل العائلة كلها أو لا تُقبل." />
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem className="lg:col-span-2">
            <div className="h-full rounded-3xl border border-gold/40 bg-white p-6">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="size-6 text-green" />
                <h3 className="font-display text-xl font-bold text-green-dark">عدد الأفراد</h3>
              </div>
              <div className="mt-5 space-y-5">
                <PeopleRow label="الحالة العامة" count={1 + R.maxCompanions} text={`صاحب الطلب ومعه حتى ${R.maxCompanions} أشخاص`} />
                <PeopleRow label="رجل مع زوجته وأولاده" count={1 + R.maxCompanionsFamily} text={`صاحب الطلب ومعه حتى ${R.maxCompanionsFamily} أشخاص`} highlight />
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <LimitCard icon={BadgeCheck} title="طلب واحد لكل شخص" text="في الموسم الواحد، ولا يظهر اسم شخص في طلبين." />
          </StaggerItem>
          <StaggerItem>
            <div className="grid h-full gap-4">
              <LimitCard icon={Briefcase} title="الموظف المخوّل" text="يجوز له تقديم أكثر من طلب عن المواطنين." compact />
              <LimitCard icon={UsersRound} title="الإداريون" text="تقديم الإداري لطلب حج لنفسه اختياري." compact />
            </div>
          </StaggerItem>
        </Stagger>
      </section>

      {/* Fees */}
      <section id="fees" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 md:px-8 md:pt-28">
        <SectionHeading eyebrow="الرسوم والتكاليف" title="كم يكلّف الحج؟" description="رسوم معلنة وتكاليف معتمدة، مع حاسبة تعطيك المجموع فوراً. المثال الافتراضي: عائلة من 4 أفراد مع الهدي وغرفة خاصة." />
        <Reveal>
          <FeesCalculator />
        </Reveal>
      </section>

      {/* Acceptance */}
      <section id="acceptance" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 md:px-8 md:pt-28">
        <SectionHeading eyebrow="طريقة القبول" title="35% مباشرة و65% بالقرعة" description="يُقبل الحجاج بطريقتين متتاليتين، ولكل منهما موعد تعلنه الإدارة." />
        <Reveal>
          <AcceptanceSplit />
        </Reveal>
      </section>

      {/* Calendar */}
      <section id="calendar" className="relative mt-20 scroll-mt-24 overflow-hidden bg-white py-20 md:mt-28 md:py-28">
        <div className="bg-pattern-dark absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow="تقويم الموسم" title={`مواعيد موسم ${SEASON.hijriYear}هـ`} description="من التسجيل الأولي حتى العودة إلى الوطن. المرحلة المميزة هي المرحلة الجارية الآن." />
          <SeasonTimeline />
        </div>
      </section>

      {/* Precheck */}
      <section id="precheck" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 md:px-8 md:pt-28">
        <SectionHeading eyebrow="قبل أن تقدّم" title="فحص أهلية مبدئي" description="أجب عن خمسة أسئلة لتعرف هل تنطبق عليك الشروط مبدئياً. لا يتم حفظ أي بيانات." />
        <Reveal>
          <PrecheckForm />
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 md:px-8 md:pt-28">
        <SectionHeading eyebrow="أجوبة معتمدة" title="الأسئلة الشائعة" description="أجوبة معتمدة من الإدارة، مصنّفة وقابلة للبحث." />
        <Faq />
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-green-dark px-6 py-14 text-center text-white md:px-12 md:py-20">
            <Image src="/images/umayyad-courtyard.jpg" alt="" fill sizes="(min-width:1280px) 1216px, 100vw" quality={70} className="-z-20 object-cover opacity-25" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-green-dark via-green-dark/85 to-green-dark/60" />
            <div className="bg-pattern absolute inset-0 -z-10 opacity-15" />
            <ShieldCheck className="mx-auto size-12 animate-float text-gold" />
            <h2 className="mt-5 font-display text-3xl font-bold text-balance md:text-5xl">هل تنطبق عليك الشروط؟</h2>
            <p className="mx-auto mt-4 max-w-xl leading-8 text-white/80">
              قدّم طلبك لنفسك أو لعائلتك في دقائق. التسجيل الأولي مفتوح من 9 جمادى الآخرة حتى 1 رجب.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/register" variant="gold" size="lg">
                <CalendarDays className="size-5" /> ابدأ التسجيل الآن
              </ButtonLink>
              <ButtonLink href="/results" variant="glass" size="lg">
                نتائج القبول
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function PeopleRow({ label, count, text, highlight }: { label: string; count: number; text: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-2xl bg-gold/15 p-4" : "rounded-2xl bg-sand/70 p-4"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink">{label}</p>
        <p className="text-xs text-ink-soft">{text}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-1.5">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className={
              i === 0
                ? "flex size-11 items-center justify-center rounded-full bg-green-dark text-white ring-4 ring-gold/40"
                : "flex size-9 items-center justify-center rounded-full bg-white text-green ring-1 ring-green-light/40"
            }
          >
            <UserRound className={i === 0 ? "size-5" : "size-4"} />
          </span>
        ))}
        <span className="ms-2 font-display text-2xl font-bold text-green-dark">= {count}</span>
      </div>
    </div>
  );
}

function LimitCard({ icon: Icon, title, text, compact }: { icon: typeof BadgeCheck; title: string; text: string; compact?: boolean }) {
  return (
    <div className={`group h-full rounded-3xl border border-gold/40 bg-white transition duration-500 hover:-translate-y-1 ${compact ? "p-5" : "p-6"}`}>
      <span className="flex size-12 items-center justify-center rounded-2xl bg-maroon/10 text-maroon transition group-hover:scale-110">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold text-green-dark">{title}</h3>
      <p className="mt-1 text-sm leading-7 text-ink-soft">{text}</p>
    </div>
  );
}
