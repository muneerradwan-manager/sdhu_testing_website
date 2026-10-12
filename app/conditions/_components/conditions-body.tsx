"use client";

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
import { CmsHeading } from "@/components/cms/heading";
import { CmsPageHero } from "@/components/cms/page-hero";
import { Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { ButtonLink } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { SEASON } from "@/lib/season";
import { dateEn } from "../_lib/en";
import { AgeRuler } from "./age-ruler";
import { FeesCalculator } from "./fees-calculator";
import { AcceptanceSplit } from "./acceptance-split";
import { SeasonTimeline } from "./season-timeline";
import { PrecheckForm } from "./precheck-form";
import { Faq } from "./faq";

const R = SEASON.rules;

/** The page «شروط التسجيل والتكاليف», in the visitor's language (the page file keeps only its metadata) */
export function ConditionsBody() {
  const t = useT();

  const FIXED = [
    { icon: Moon, title: t("مسلم", "Muslim"), text: t("وفق سجل الشؤون المدنية.", "As recorded by the Civil Registry.") },
    { icon: Flag, title: t("سوري الجنسية", "Syrian nationality"), text: t("يحمل الجنسية السورية ورقماً وطنياً صحيحاً.", "Holds Syrian nationality and a valid national number.") },
    {
      icon: Landmark,
      title: t("لم يؤدِّ الحج سابقاً", "Has not performed Hajj before"),
      text: t("إلا من يرافق أمه أو زوجته محرماً لها في الطلب نفسه.", "Unless he is accompanying his mother or wife as her mahram in the same application."),
    },
    {
      icon: HeartPulse,
      title: t("غير مصاب بمرض عضال", "No terminal illness"),
      text: t(
        "حفاظاً على سلامة الحاج. لا يُسأل عنه عند التسجيل: يتحقق منه الفريق الطبي بعد القبول من الملف الصحي الذي يسجّله منسق المجموعة.",
        "For the pilgrim's own safety. It is not asked at registration: the medical team checks it after acceptance, from the health file the group coordinator records.",
      ),
    },
  ];

  const AGE_RULES = [
    { icon: UserRound, title: t("صاحب الطلب", "Main applicant"), rule: t(`مواليد ${R.applicantMaxBirthYear} فما قبل`, `Born ${R.applicantMaxBirthYear} or earlier`), note: t("29 عاماً فأكثر", "Aged 29 or over") },
    { icon: Users, title: t("المرافق", "Companion"), rule: t(`مواليد ${R.companionMaxBirthYear} فما قبل`, `Born ${R.companionMaxBirthYear} or earlier`), note: t("17 عاماً فأكثر", "Aged 17 or over") },
    { icon: Venus, title: t("المرأة تحتاج محرماً", "A woman needs a mahram"), rule: t(`مواليد ${R.womanNeedsMahramMinBirthYear} فما بعد`, `Born ${R.womanNeedsMahramMinBirthYear} or later`), note: t("دون 44 عاماً", "Under 44") },
    { icon: Accessibility, title: t("يحتاج مرافقاً حصراً", "Must have a companion"), rule: t(`مواليد ${R.elderlyNeedsCompanionMaxBirthYear} فما قبل`, `Born ${R.elderlyNeedsCompanionMaxBirthYear} or earlier`), note: t("69 عاماً فأكثر", "Aged 69 or over") },
  ];

  const SECTIONS: [string, string][] = [
    ["#fixed", t("الشروط الثابتة", "Fixed conditions")],
    ["#ages", t("شروط العمر", "Age rules")],
    ["#limits", t("حدود الطلب", "Application limits")],
    ["#fees", t("التكاليف", "Costs")],
    ["#acceptance", t("طريقة القبول", "How acceptance works")],
    ["#calendar", t("التقويم", "Calendar")],
    ["#precheck", t("فحص الأهلية", "Eligibility check")],
    ["#faq", t("الأسئلة الشائعة", "FAQ")],
  ];

  return (
    <>
      <CmsPageHero page="conditions">
        <nav aria-label={t("أقسام الصفحة", "Page sections")} className="scrollbar-none -mx-4 mt-7 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
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
      </CmsPageHero>

      {/* Fixed conditions */}
      <section id="fixed" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-16 md:px-8 md:pt-24">
        <CmsHeading page="conditions" section="basics" />
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FIXED.map((f, i) => (
            <StaggerItem key={i}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-gold/40 bg-white p-6 shadow-[0_20px_50px_-40px_rgba(0,89,79,.6)] transition duration-500 hover:-translate-y-1.5 hover:border-gold-dark/60 hover:shadow-[0_30px_60px_-35px_rgba(0,89,79,.55)]">
                <span className="absolute -end-6 -top-6 font-display text-8xl font-bold text-gold/20 transition duration-500 group-hover:text-gold/40">{i + 1}</span>
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
          eyebrow={t(`موسم ${SEASON.hijriYear}هـ`, `${SEASON.hijriYear} AH season`)}
          title={t("شروط العمر بسنة الميلاد", "Age rules by year of birth")}
          description={t(
            "تضبطها الإدارة لكل موسم بسنة الميلاد، فتتغير من موسم إلى آخر دون أي تعديل في النظام.",
            "The Administration sets them for each season by year of birth, so they can change from one season to the next without any change to the system.",
          )}
        />
        <Stagger className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {AGE_RULES.map((a, i) => (
            <StaggerItem key={i}>
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
        <SectionHeading
          eyebrow={t("حدود الطلب", "Application limits")}
          title={t("من يمكن أن يكون في طلبك؟", "Who can be in your application?")}
          description={t(
            "الطلب العائلي يُعامل كوحدة واحدة في القبول والسكن والنقل: تُقبل العائلة كلها أو لا تُقبل.",
            "A family application is treated as one unit for acceptance, housing and transport: the whole family is accepted, or none of it.",
          )}
        />
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem className="lg:col-span-2">
            <div className="h-full rounded-3xl border border-gold/40 bg-white p-6">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="size-6 text-green" />
                <h3 className="font-display text-xl font-bold text-green-dark">{t("عدد الأفراد", "Number of people")}</h3>
              </div>
              <div className="mt-5 space-y-5">
                <PeopleRow
                  label={t("الحالة العامة", "In general")}
                  count={1 + R.maxCompanions}
                  text={t(`صاحب الطلب ومعه حتى ${R.maxCompanions} أشخاص`, `The main applicant with up to ${R.maxCompanions} others`)}
                />
                <PeopleRow
                  label={t("رجل مع زوجته وأولاده", "A man with his wife and children")}
                  count={1 + R.maxCompanionsFamily}
                  text={t(`صاحب الطلب ومعه حتى ${R.maxCompanionsFamily} أشخاص`, `The main applicant with up to ${R.maxCompanionsFamily} others`)}
                  highlight
                />
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <LimitCard
              icon={BadgeCheck}
              title={t("طلب واحد لكل شخص", "One application per person")}
              text={t("في الموسم الواحد، ولا يظهر اسم شخص في طلبين.", "In any one season, and no one's name may appear in two applications.")}
            />
          </StaggerItem>
          <StaggerItem>
            <div className="grid h-full gap-4">
              <LimitCard
                icon={Briefcase}
                title={t("الموظف المخوّل", "Authorised staff")}
                text={t("يجوز له تقديم أكثر من طلب عن المواطنين.", "May submit more than one application on behalf of citizens.")}
                compact
              />
              <LimitCard
                icon={UsersRound}
                title={t("الإداريون", "Administrators")}
                text={t("تقديم الإداري لطلب حج لنفسه اختياري.", "An administrator may choose whether to apply for Hajj himself.")}
                compact
              />
            </div>
          </StaggerItem>
        </Stagger>
      </section>

      {/* Fees */}
      <section id="fees" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 md:px-8 md:pt-28">
        <SectionHeading
          eyebrow={t("الرسوم والتكاليف", "Fees and costs")}
          title={t("كم يكلّف الحج؟", "How much does Hajj cost?")}
          description={t(
            "رسوم معلنة وتكاليف معتمدة، مع حاسبة تعطيك المجموع فوراً. المثال الافتراضي: عائلة من 4 أفراد مع الهدي وغرفة خاصة لهم بأربعة أسرّة.",
            "Published fees and approved costs, with a calculator that gives you the total straight away. The default example: a family of 4 with the Hady and a private four-bed room for them.",
          )}
        />
        <Reveal>
          <FeesCalculator />
        </Reveal>
      </section>

      {/* Acceptance */}
      <section id="acceptance" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 md:px-8 md:pt-28">
        <SectionHeading
          eyebrow={t("طريقة القبول", "How acceptance works")}
          title={t("65% مباشرة و35% بالقرعة", "65% direct, 35% by lottery")}
          description={t(
            "يُقبل الحجاج عبر تسجيلين منفصلين، واحداً بعد الآخر، ولكل منهما طلب خاص وموعد مستقل.",
            "Pilgrims are accepted through two separate registrations, one after the other, each with its own application and its own dates.",
          )}
        />
        <Reveal>
          <AcceptanceSplit />
        </Reveal>
      </section>

      {/* Calendar */}
      <section id="calendar" className="relative mt-20 scroll-mt-24 overflow-hidden bg-white py-20 md:mt-28 md:py-28">
        <div className="bg-pattern-dark absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow={t("تقويم الموسم", "Season calendar")}
            title={t(`مواعيد موسم ${SEASON.hijriYear}هـ`, `Dates of the ${SEASON.hijriYear} AH season`)}
            description={t(
              "من التسجيل على القبول المباشر حتى العودة إلى الوطن. المرحلة المميزة هي المرحلة الجارية الآن.",
              "From registering for direct acceptance to the return home. The highlighted stage is the one under way now.",
            )}
          />
          <SeasonTimeline />
        </div>
      </section>

      {/* Precheck */}
      <section id="precheck" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 md:px-8 md:pt-28">
        <SectionHeading
          eyebrow={t("قبل أن تقدّم", "Before you apply")}
          title={t("فحص أهلية مبدئي", "Preliminary eligibility check")}
          description={t(
            "أجب عن خمسة أسئلة لتعرف هل تنطبق عليك الشروط مبدئياً. لا يتم حفظ أي بيانات.",
            "Answer five questions to see whether you meet the conditions in principle. Nothing you enter is saved.",
          )}
        />
        <Reveal data-tour-target>
          <PrecheckForm />
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 md:px-8 md:pt-28">
        <SectionHeading
          eyebrow={t("أجوبة معتمدة", "Approved answers")}
          title={t("الأسئلة الشائعة", "Frequently asked questions")}
          description={t("أجوبة معتمدة من الإدارة، مصنّفة وقابلة للبحث.", "Answers approved by the Administration, sorted by topic and searchable.")}
        />
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
            <h2 className="mt-5 font-display text-3xl font-bold text-balance md:text-5xl">{t("هل تنطبق عليك الشروط؟", "Do you meet the conditions?")}</h2>
            <p className="mx-auto mt-4 max-w-xl leading-8 text-white/80">
              {t(
                `قدّم طلبك لنفسك أو لعائلتك في دقائق. التسجيل على القبول المباشر من ${SEASON.windows.direct.hijri}، والتسجيل الأولي على القرعة بطلب جديد من ${SEASON.windows.lottery.hijri}.`,
                `Apply for yourself or your family in minutes. Registration for direct acceptance runs ${dateEn(SEASON.windows.direct.hijri)}, and lottery pre-registration, with a new application, runs ${dateEn(SEASON.windows.lottery.hijri)}.`,
              )}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/register" variant="gold" size="lg">
                <CalendarDays className="size-5" /> {t("ابدأ التسجيل الآن", "Start registering now")}
              </ButtonLink>
              <ButtonLink href="/results" variant="glass" size="lg">
                {t("نتائج القبول", "Acceptance results")}
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
