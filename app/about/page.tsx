import type { Metadata } from "next";
import Image from "next/image";
import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarRange,
  Camera,
  Check,
  ClipboardList,
  Eye,
  Gem,
  Headset,
  HeartPulse,
  IdCard,
  Landmark,
  Mail,
  Phone,
  Plane,
  Radar,
  ShieldCheck,
  Stethoscope,
  Target,
  UserCog,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { Counter, Ornament, Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { ButtonLink } from "@/components/ui/button";
import { ACCOUNT_ROWS, ACCOUNT_TYPES, DEPARTMENTS, LEADERS, MISSIONS, PILLARS, PRINCIPLES, STATS, VALUES } from "@/lib/data/about";
import { SEASON } from "@/lib/season";
import { cn } from "@/lib/utils";
import { BranchDirectory } from "./_components/branch-directory";
import { ContactForm } from "./_components/contact-form";
import { HistoryTimeline } from "./_components/history-timeline";

export const metadata: Metadata = {
  title: "من نحن",
  description: "تعرّف على إدارة الحج والعمرة السورية: رؤيتها ورسالتها، إداراتها وبعثاتها، مبادئ المنصة الوطنية للحج، ودليل الفروع والتواصل.",
};

const PILLAR_ICONS: Record<string, LucideIcon> = { vision: Eye, mission: Target, values: Gem };

const DEPT_ICONS: Record<string, LucideIcon> = {
  registration: ClipboardList,
  seasons: CalendarRange,
  audit: ShieldCheck,
  ops: Radar,
  admins: UserCog,
  finance: Wallet,
  religious: BookOpen,
  transport: Plane,
  medical: Stethoscope,
};

const MISSION_ICONS: Record<string, LucideIcon> = { admin: Landmark, religious: BookOpen, medical: HeartPulse, media: Camera };
const ACCOUNT_ICONS: Record<string, LucideIcon> = { pilgrim: UserRound, admin: BriefcaseBusiness, staff: IdCard };

export default function AboutPage() {
  return (
    <>
      <PageHero
        title={
          <>
            من <span className="text-gold-shine">نحن</span>
          </>
        }
        description="إدارة الحج والعمرة السورية: نخدم ضيوف الرحمن من بيوتهم في المحافظات حتى عودتهم سالمين، بقواعد معلنة ومنصة وطنية واحدة."
        image="/images/umayyad.jpg"
        crumbs={[{ label: "من نحن" }]}
      />

      {/* Intro */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-gold/30 px-3 py-1 text-xs font-bold text-maroon">
              <span className="size-1.5 rotate-45 bg-current" /> من دمشق إلى الحرمين
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold leading-snug text-green-dark text-balance md:text-5xl">
              خدمة الحاج أمانة، <span className="text-maroon">والعدل</span> طريقنا إليها
            </h2>
            <Ornament className="mt-4" />
            <p className="mt-6 text-lg leading-9 text-ink-soft">
              من قرب الجامع الأموي في دمشق تنطلق كل عام رحلة آلاف الحجاج السوريين. نحن الجهة التي تنظّم هذه الرحلة: نفتح تسجيلين منفصلين، فنقبل الحجاج
              بالأكبر سناً في الأول وبالقرعة العلنية في الثاني، ونؤهّل الإداريين، ونعتمد التكتلات، ونرافق الحجاج في مكة والمدينة والمشاعر حتى يعودوا.
            </p>
            <p className="mt-4 text-lg leading-9 text-ink-soft">
              وفي موسم {SEASON.hijriYear}هـ جمعنا كل ذلك في <strong className="text-green-dark">المنصة الوطنية للحج</strong>: مكان واحد واضح للمواطن
              والإداري والموظف، يحفظ الحقوق ويُظهر كل خطوة.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="#contact" size="lg">
                تواصل معنا
              </ButtonLink>
              <ButtonLink href="#branches" size="lg" variant="outline">
                أقرب فرع إليك
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={0.15} className="relative">
            <div className="grid grid-cols-5 grid-rows-6 gap-3 md:gap-4" style={{ height: "clamp(22rem, 60vw, 34rem)" }}>
              <div className="group relative col-span-3 row-span-6 overflow-hidden rounded-3xl ring-1 ring-gold/40">
                <Image
                  src="/images/umayyad-courtyard.jpg"
                  alt="صحن الجامع الأموي في دمشق"
                  fill
                  quality={85}
                  sizes="(min-width: 1024px) 380px, 60vw"
                  className="object-cover transition-transform duration-[2s] group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-green-dark/70 to-transparent" />
                <p className="absolute bottom-4 right-4 text-sm font-semibold text-white">الجامع الأموي — دمشق</p>
              </div>
              <div className="group relative col-span-2 row-span-3 overflow-hidden rounded-3xl ring-1 ring-gold/40">
                <Image src="/images/kaaba-hajj.jpg" alt="الكعبة المشرفة" fill quality={70} sizes="(min-width: 1024px) 250px, 40vw" className="object-cover transition-transform duration-[2s] group-hover:scale-110" />
              </div>
              <div className="group relative col-span-2 row-span-3 overflow-hidden rounded-3xl ring-1 ring-gold/40">
                <Image src="/images/nabawi.jpg" alt="المسجد النبوي" fill quality={70} sizes="(min-width: 1024px) 250px, 40vw" className="object-cover transition-transform duration-[2s] group-hover:scale-110" />
              </div>
            </div>
            <div className="animate-float absolute -bottom-6 left-4 rounded-3xl bg-white p-4 shadow-[0_24px_60px_-30px_rgba(2,21,38,.6)] ring-1 ring-gold/40 md:-left-6">
              <p className="text-xs text-hint">حصة موسم {SEASON.hijriYear}هـ</p>
              <p className="font-display text-3xl font-bold text-green-dark">
                <Counter to={SEASON.quota} />
              </p>
              <p className="text-xs font-semibold text-maroon">حاج وحاجة</p>
            </div>
            <div className="bg-pattern-dark absolute -right-3 -top-6 -z-10 size-40 rounded-3xl md:-right-6" aria-hidden />
          </Reveal>
        </div>
      </section>

      {/* Vision / mission / values */}
      <section className="mx-auto max-w-7xl px-4 md:px-8">
        <Stagger className="grid gap-5 md:grid-cols-3">
          {PILLARS.map((p, i) => {
            const Icon = PILLAR_ICONS[p.key];
            const dark = i === 1;
            return (
              <StaggerItem key={p.key}>
                <article
                  className={cn(
                    "group relative isolate h-full overflow-hidden rounded-3xl p-7 transition-all duration-500 hover:-translate-y-2",
                    dark
                      ? "bg-green-dark text-white shadow-[0_30px_70px_-35px_rgba(0,89,79,.9)]"
                      : "border border-gold/35 bg-white hover:shadow-[0_24px_60px_-40px_rgba(2,21,38,.6)]",
                  )}
                >
                  {dark && <div className="bg-pattern absolute inset-0 -z-10 opacity-20" />}
                  <Icon className={cn("absolute -left-6 -top-6 -z-10 size-32 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110", dark ? "text-white/5" : "text-gold/20")} />
                  <span className={cn("grid size-14 place-items-center rounded-2xl transition-transform duration-500 group-hover:-rotate-6", dark ? "bg-gold text-green-dark" : "bg-green-dark text-gold")}>
                    <Icon className="size-7" />
                  </span>
                  <h3 className={cn("mt-6 font-display text-2xl font-bold", dark ? "text-gold" : "text-green-dark")}>{p.title}</h3>
                  <p className={cn("mt-3 leading-8", dark ? "text-white/80" : "text-ink-soft")}>{p.text}</p>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>

        <Stagger className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" gap={0.05}>
          {VALUES.map((v, i) => (
            <StaggerItem key={v.title}>
              <div className="group h-full rounded-2xl border border-gold/30 bg-white/70 p-4 text-center transition hover:border-gold hover:bg-white">
                <span className="font-display text-sm text-gold-dark">0{i + 1}</span>
                <p className="font-display text-lg font-bold text-green-dark transition-colors group-hover:text-maroon">{v.title}</p>
                <p className="mt-1 text-xs leading-6 text-ink-soft">{v.text}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Stats */}
      <section className="relative isolate mt-24 overflow-hidden bg-green-dark py-16 text-white md:py-20">
        <Image src="/images/tawaf-night.jpg" alt="" fill quality={70} sizes="100vw" className="-z-20 object-cover opacity-20" />
        <div className="bg-pattern absolute inset-0 -z-10 opacity-15" />
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading light eyebrow="بالأرقام" title="موسم واحد، آلاف القصص" />
          <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {STATS.map((s) => (
              <StaggerItem key={s.label}>
                <div className="group h-full rounded-3xl bg-white/[.06] p-5 text-center ring-1 ring-white/10 backdrop-blur transition hover:bg-white/10 hover:ring-gold/40">
                  <p className="font-display text-4xl font-bold text-gold md:text-5xl">
                    <Counter to={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/75">{s.label}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* History */}
      <section className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <SectionHeading eyebrow="مسيرتنا" title="من السجلات الورقية إلى منصة وطنية" description="محطات صنعت الطريقة التي نخدم بها الحجاج اليوم." />
        <HistoryTimeline />
      </section>

      {/* Leadership */}
      <section className="bg-gradient-to-b from-gold-light/50 to-sand py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow="القيادة" title="فريق يقود الموسم" description="أسماء وهمية لأغراض العرض." />
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {LEADERS.map((l, i) => (
              <StaggerItem key={l.name}>
                <article className="group relative flex items-center gap-5 overflow-hidden rounded-3xl border border-gold/35 bg-white p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_-40px_rgba(0,89,79,.7)]">
                  <span className="relative shrink-0">
                    <span className="absolute -inset-1.5 rounded-full bg-[conic-gradient(from_0deg,#AD9E6E,#FFF6DC,#D9C89E,#AD9E6E)] opacity-70 transition-opacity group-hover:animate-spin-slow group-hover:opacity-100" />
                    <span
                      className={cn(
                        "relative grid size-20 place-items-center rounded-full font-display text-2xl font-bold ring-4 ring-white",
                        i === 0 ? "bg-green-dark text-gold" : "bg-gradient-to-br from-gold to-gold-dark text-green-dark",
                      )}
                      aria-hidden
                    >
                      {l.initials}
                    </span>
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold text-green-dark">{l.name}</h3>
                    <p className="text-sm font-semibold text-maroon">{l.role}</p>
                    <p className="mt-1 text-xs leading-6 text-ink-soft">{l.note}</p>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Departments */}
      <section className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <SectionHeading eyebrow="الهيكل" title="تسع إدارات، هدف واحد" description="كل إدارة مسؤولة عن جزء واضح من رحلة الحاج، ولكل موظف صلاحيات تُمنح له واحدة واحدة." />
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.05}>
          {DEPARTMENTS.map((d, i) => {
            const Icon = DEPT_ICONS[d.key];
            return (
              <StaggerItem key={d.key}>
                <article className="group relative h-full overflow-hidden rounded-3xl border border-gold/30 bg-white p-6 transition-all duration-500 hover:border-green-dark hover:bg-green-dark">
                  <span className="absolute left-5 top-5 font-display text-5xl font-bold text-gold/25 transition-colors group-hover:text-gold/20">{String(i + 1).padStart(2, "0")}</span>
                  <span className="grid size-12 place-items-center rounded-2xl bg-gold/30 text-green-dark transition-all duration-500 group-hover:rotate-[-8deg] group-hover:bg-gold">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-bold text-green-dark transition-colors group-hover:text-gold">{d.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-ink-soft transition-colors group-hover:text-white/80">{d.text}</p>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      {/* Account types */}
      <section className="relative isolate overflow-hidden bg-ink py-24 text-white">
        <div className="bg-pattern absolute inset-0 -z-10 opacity-10" />
        <div className="absolute -top-40 left-1/2 -z-10 size-[40rem] -translate-x-1/2 rounded-full bg-green-dark/50 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            light
            eyebrow="أنواع الحسابات"
            title="ثلاثة أطراف، حساب واحد لكل شخص"
            description="لكل شخص في المنصة نوع حساب واحد فقط، ولا يجمع بين نوعين. أما الزائر فيتصفح المحتوى العام دون حساب."
          />
          <Stagger className="grid gap-5 lg:grid-cols-3">
            {ACCOUNT_TYPES.map((a, i) => {
              const Icon = ACCOUNT_ICONS[a.key];
              const featured = i === 0;
              return (
                <StaggerItem key={a.key}>
                  <article
                    className={cn(
                      "relative flex h-full flex-col overflow-hidden rounded-3xl p-6 ring-1 transition-all duration-500 hover:-translate-y-2 md:p-7",
                      featured ? "bg-gradient-to-b from-gold to-gold-dark text-ink ring-gold" : "bg-white/[.05] ring-white/15 hover:ring-gold/50",
                    )}
                  >
                    {featured && <span className="absolute left-5 top-5 rounded-full bg-maroon px-3 py-1 text-xs font-bold text-white">الأكثر شيوعاً</span>}
                    <span className={cn("grid size-14 place-items-center rounded-2xl", featured ? "bg-green-dark text-gold" : "bg-gold/15 text-gold")}>
                      <Icon className="size-7" />
                    </span>
                    <h3 className={cn("mt-5 font-display text-2xl font-bold", featured ? "text-green-dark" : "text-gold")}>{a.title}</h3>
                    <p className={cn("text-sm", featured ? "text-ink/70" : "text-white/60")}>{a.tagline}</p>
                    <dl className="mt-6 space-y-4">
                      {ACCOUNT_ROWS.map((r) => (
                        <div key={r.key} className={cn("border-t pt-4", featured ? "border-ink/10" : "border-white/10")}>
                          <dt className={cn("flex items-center gap-2 text-xs font-bold", featured ? "text-maroon" : "text-gold/80")}>
                            <Check className="size-3.5" />
                            {r.label}
                          </dt>
                          <dd className={cn("mt-1 text-sm leading-7", featured ? "text-ink" : "text-white/85")}>{a.rows[r.key]}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* Missions */}
      <section className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <SectionHeading eyebrow="في الميدان" title="البعثات الأربع" description="تعتمدها الإدارة وتوزّعها على الأبراج والمخيمات لمراقبة عمل التكتلات وخدمة الحجاج." />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {MISSIONS.map((m, i) => {
            const Icon = MISSION_ICONS[m.key];
            const images = ["/images/mina-tents.jpg", "/images/jabal-rahmah.jpg", "/images/pilgrim-dua.jpg", "/images/jamarat.jpg"];
            return (
              <Reveal key={m.key} delay={i * 0.08}>
                <article className="group relative isolate flex h-80 flex-col justify-end overflow-hidden rounded-3xl p-6 text-white ring-1 ring-gold/30">
                  <Image src={images[i]} alt="" fill quality={70} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw" className="-z-20 object-cover transition-transform duration-[1.5s] group-hover:scale-110" />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-t from-green-dark via-green-dark/70 to-transparent transition-opacity duration-500 group-hover:from-maroon-dark group-hover:via-maroon-dark/70" />
                  <span className="grid size-12 place-items-center rounded-2xl bg-gold text-green-dark shadow-lg transition-transform duration-500 group-hover:-translate-y-2">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-4 font-display text-2xl font-bold">{m.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/80">{m.text}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Principles */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <SectionHeading eyebrow="مبادئ المنصة" title="القواعد التي تحكم كل شيء" description="مبادئ ثابتة بُنيت عليها المنصة الوطنية للحج، من إنشاء الحساب حتى أرشفة الموسم." />
          <Stagger className="grid gap-x-10 md:grid-cols-2" gap={0.05}>
            {PRINCIPLES.map((p, i) => (
              <StaggerItem key={p.title}>
                <div className="group flex gap-5 border-b border-gold/30 py-6">
                  <span className="relative grid size-14 shrink-0 place-items-center">
                    <svg viewBox="0 0 56 56" className="absolute inset-0 size-full text-gold transition-transform duration-700 group-hover:rotate-45" aria-hidden>
                      <path d="M28 2l7.6 18.4L54 28l-18.4 7.6L28 54l-7.6-18.4L2 28l18.4-7.6z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      <rect x="11" y="11" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <span className="relative font-display text-lg font-bold text-green-dark">{i + 1}</span>
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-green-dark transition-colors group-hover:text-maroon">{p.title}</h3>
                    <p className="mt-1 text-sm leading-7 text-ink-soft">{p.text}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Branches */}
      <section id="branches" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-24 md:px-8">
        <SectionHeading eyebrow="دليل الفروع" title="قريبون منك في كل محافظة" description="اختر الفرع لترى موقعه على الخريطة وعنوانه وأوقات دوامه ورقم هاتفه." />
        <BranchDirectory />
      </section>

      {/* Contact */}
      <section id="contact" className="relative isolate scroll-mt-24 overflow-hidden bg-gradient-to-b from-sand to-gold-light/60 pb-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow="تواصل معنا" title="نسمعك ونرد عليك" description="أرسل استفسارك أو ملاحظتك، وستحصل على رقم تذكرة لمتابعة رسالتك." />
          <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <ContactForm />
            <Reveal delay={0.1}>
              <aside className="relative h-full overflow-hidden rounded-3xl bg-green-dark p-6 text-white">
                <div className="bg-pattern absolute inset-0 opacity-15" />
                <div className="relative space-y-5">
                  {[
                    { icon: Headset, label: "مركز الاتصال", value: "9449", note: "يومياً من 8 صباحاً حتى 8 مساءً", ltr: true },
                    { icon: Phone, label: "الإدارة العامة", value: "011 612 4490", note: "الأحد – الخميس", ltr: true },
                    { icon: Mail, label: "البريد الإلكتروني", value: "info@hajj.gov.sy.demo", note: "نرد خلال يومي عمل", ltr: true },
                    { icon: Building2, label: "العنوان", value: "دمشق — المزة", note: "أوتستراد المزة، جانب حديقة الجلاء" },
                  ].map((c) => (
                    <div key={c.label} className="flex gap-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-gold ring-1 ring-white/15">
                        <c.icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-white/55">{c.label}</p>
                        <p dir={c.ltr ? "ltr" : undefined} className={cn("break-words font-bold", c.ltr && "text-end tabular-nums")}>
                          {c.value}
                        </p>
                        <p className="text-xs text-white/60">{c.note}</p>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-2xl bg-maroon/60 p-4 text-sm leading-7 ring-1 ring-white/10">
                    <p className="font-bold text-gold">تنبيه</p>
                    موظفو الإدارة لا يطلبون منك رمز التحقق أو أي مبلغ عبر الهاتف أبداً.
                  </div>
                </div>
              </aside>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
