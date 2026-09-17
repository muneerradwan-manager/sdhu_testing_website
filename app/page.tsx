import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpenText,
  CalendarDays,
  Clock3,
  Hourglass,
  FileSearch,
  Landmark,
  Megaphone,
  NotebookTabs,
  ScrollText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Counter, Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { ARTICLES } from "@/lib/data/news";
import { SEASON } from "@/lib/season";
import { Hero } from "./_home/hero";
import { Journey } from "./_home/journey";
import { AcademyTeaser, PrayerWidget } from "./_home/widgets";

const TICKER = [
  "فتح باب التسجيل الأولي لموسم حج 1448هـ من 9 جمادى الآخرة حتى 1 رجب",
  "القرعة الإلكترونية يوم 1 شعبان الساعة 20:00 ببث مباشر على التلفاز",
  "تحذير: لا توجد مقاعد مضمونة مقابل مبالغ مالية — تحقق من الجهات المعتمدة عبر المنصة",
  "رسم التسجيل الأولي 25 دولاراً للفرد، مع إيصال رقمي قابل للتحقق",
  "إطلاق مسار «فقه الحج» في أكاديمية الدروس الدينية — 18 درساً بثلاثة مستويات",
];

const SERVICES = [
  { href: "/register", icon: UsersRound, title: "تقديم طلب حج", text: "لك ولعائلتك بخطوات بسيطة", tone: "gold" },
  { href: "/results", icon: FileSearch, title: "نتائج القبول", text: "ابحث برقمك الوطني", tone: "green" },
  { href: "/academy", icon: BookOpenText, title: "أكاديمية الدروس", text: "فيديو وصوت وملخصات", tone: "green" },
  { href: "/guide", icon: NotebookTabs, title: "دليل المناسك", text: "يوماً بيوم مع الأدعية", tone: "green" },
  { href: "/prayer-times", icon: Clock3, title: "مواقيت الصلاة", text: "واتجاه القبلة لمدينتك", tone: "green" },
  { href: "/conditions", icon: ScrollText, title: "الشروط والتكاليف", text: "مع فحص أهلية مبدئي", tone: "green" },
  { href: "/verify", icon: ShieldCheck, title: "التحقق من الجهات", text: "والإيصالات والشهادات", tone: "maroon" },
  { href: "/news", icon: Megaphone, title: "الإعلانات الرسمية", text: "قرارات وتعاميم الإدارة", tone: "green" },
] as const;

const NEWS = ["registration-opens-1448", "accepted-ages-66", "fake-campaigns-warning"]
  .map((slug) => ARTICLES.find((a) => a.slug === slug))
  .filter((a) => a !== undefined);

export default function Home() {
  return (
    <>
      <Hero />

      {/* Breaking news ticker */}
      <div className="relative z-10 overflow-hidden border-y border-gold/40 bg-gold-light">
        <div className="flex items-stretch">
          <span className="z-10 flex shrink-0 items-center gap-2 bg-maroon px-5 py-3 font-bold text-white shadow-[8px_0_20px_rgba(0,0,0,.15)]">
            <Megaphone className="size-4 text-gold" /> عاجل
          </span>
          <div className="flex overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_6%,black_94%,transparent)]">
            <div className="flex shrink-0 animate-marquee items-center gap-12 whitespace-nowrap py-3 pr-12 font-semibold text-green-dark hover:[animation-play-state:paused]">
              {[...TICKER, ...TICKER].map((t, i) => (
                <span key={i} className="flex items-center gap-3">
                  <span className="size-1.5 rotate-45 bg-gold-dark" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Services */}
      <section id="services" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-24 md:px-8">
        <SectionHeading
          eyebrow="متاح للجميع دون تسجيل دخول"
          title="كل ما تحتاجه في مكان واحد"
          description="تصفّح الأخبار والأكاديمية ومواقيت الصلاة ونتائج القبول بحرية، ولا نطلب منك حساباً إلا عندما تقدّم طلبك."
        />
        <Stagger className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            const featured = s.tone === "gold";
            return (
              <StaggerItem key={s.href}>
                <Link
                  href={s.href}
                  className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border p-5 transition duration-500 hover:-translate-y-1.5 md:p-7 ${
                    featured
                      ? "border-transparent bg-green-dark text-white shadow-[0_24px_50px_-24px_rgba(0,89,79,.8)]"
                      : "border-gold/30 bg-white hover:border-gold-dark/50 hover:shadow-[0_24px_50px_-30px_rgba(2,21,38,.35)]"
                  }`}
                >
                  {featured && <div className="bg-pattern absolute inset-0 opacity-20" />}
                  <span
                    className={`relative grid size-13 place-items-center rounded-2xl transition duration-500 group-hover:scale-110 group-hover:rotate-[-6deg] ${
                      featured ? "bg-gold text-ink" : s.tone === "maroon" ? "bg-maroon/10 text-maroon" : "bg-green-dark/8 text-green-dark"
                    }`}
                  >
                    <Icon className="size-6" />
                  </span>
                  <h3 className={`relative mt-5 font-display text-lg font-bold md:text-xl ${featured ? "" : "text-green-dark"}`}>{s.title}</h3>
                  <p className={`relative mt-1 text-sm ${featured ? "text-white/70" : "text-ink-soft"}`}>{s.text}</p>
                  <ArrowLeft
                    className={`relative mt-4 size-5 transition duration-500 group-hover:-translate-x-2 ${featured ? "text-gold" : "text-gold-dark"}`}
                  />
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>

        <Reveal delay={0.1} className="mt-5">
          <Link
            href="/umrah"
            className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-3xl border border-dashed border-gold-dark/60 bg-gold-light/50 p-5 transition duration-500 hover:border-gold-dark hover:bg-gold-light md:flex-row md:items-center md:p-6"
          >
            <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-white text-maroon shadow-sm">
              <Hourglass className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-display text-xl font-bold text-green-dark">
                خدمات العمرة
                <span className="rounded-full bg-maroon px-2.5 py-0.5 text-xs font-bold text-white">قريباً</span>
              </p>
              <p className="mt-1 text-ink-soft">نعمل على إضافة التسجيل في رحلات العمرة والجهات المعتمدة ومتابعة الطلب. وحتى ذلك الحين، مسار «فقه العمرة» متاح في الأكاديمية.</p>
            </div>
            <span className="flex items-center gap-1.5 font-bold text-green-dark transition group-hover:gap-3">
              اعرف المزيد <ArrowLeft className="size-5" />
            </span>
          </Link>
        </Reveal>
      </section>

      <Journey />

      {/* Numbers band */}
      <section className="relative isolate overflow-hidden bg-green-dark py-20 text-white">
        <Image src="/images/mina-tents.jpg" alt="" fill sizes="100vw" quality={70} className="-z-20 object-cover opacity-20" />
        <div className="bg-pattern absolute inset-0 -z-10 opacity-20" />
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <Reveal className="mb-12 text-center">
            <p className="text-sm font-bold text-gold">موسم {SEASON.hijriYear}هـ بالأرقام</p>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">شفافية كاملة في كل رقم</h2>
          </Reveal>
          <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { n: SEASON.quota, label: "الحصة الإجمالية", sub: "حاج وحاجة" },
              { n: 72_420, label: "متقدماً في التسجيل", sub: "حتى إغلاق الحملة" },
              { n: SEASON.directSeats, label: "قبول مباشر", sub: "35% للأكبر سناً" },
              { n: SEASON.lotterySeats, label: "بالقرعة العلنية", sub: "65% ببث مباشر" },
            ].map((s) => (
              <StaggerItem key={s.label} className="rounded-3xl border border-white/10 bg-white/[.06] p-6 text-center backdrop-blur">
                <Counter to={s.n} className="font-display text-4xl font-bold text-gold md:text-5xl" />
                <p className="mt-2 font-bold">{s.label}</p>
                <p className="text-sm text-white/60">{s.sub}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Academy + prayer */}
      <section className="mx-auto grid max-w-7xl items-start gap-8 px-4 py-24 md:px-8 lg:grid-cols-2">
        <div>
          <SectionHeading
            align="start"
            eyebrow="أكاديمية الدروس الدينية"
            title="تعلّم مناسكك قبل أن تسافر"
            description="مسارات مرتبة بالفيديو والصوت والملخص المكتوب، متاحة طوال السنة. أنشئ حساباً لتتبع تقدمك والحصول على شهادة الإتمام."
            className="mb-8"
          />
          <Reveal>
            <AcademyTeaser />
          </Reveal>
          <Reveal delay={0.1} className="mt-5 grid grid-cols-3 gap-3 text-center">
            {[
              { n: "6", l: "مسارات" },
              { n: "18", l: "درساً في فقه الحج" },
              { n: "24/7", l: "متاحة دائماً" },
            ].map((x) => (
              <div key={x.l} className="rounded-2xl border border-gold/30 bg-white p-4">
                <p className="font-display text-2xl font-bold text-green-dark">{x.n}</p>
                <p className="text-xs text-ink-soft">{x.l}</p>
              </div>
            ))}
          </Reveal>
        </div>
        <Reveal delay={0.15} className="lg:pt-40">
          <PrayerWidget />
        </Reveal>
      </section>

      {/* Verse band */}
      <section className="relative isolate flex min-h-[70vh] items-center overflow-hidden bg-ink text-white">
        <Image src="/images/jabal-rahmah.jpg" alt="جبل الرحمة في عرفات" fill sizes="100vw" quality={70} className="-z-20 object-cover object-center opacity-60 [transform:translateZ(0)]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/80 via-green-dark/60 to-ink/90" />
        <Reveal className="mx-auto max-w-4xl px-4 text-center">
          <Landmark className="mx-auto size-10 text-gold" />
          <p className="mt-6 font-quran text-3xl leading-[2] md:text-5xl md:leading-[1.9]">
            ﴿وَأَذِّن فِي النَّاسِ بِالْحَجِّ يَأْتُوكَ رِجَالًا وَعَلَىٰ كُلِّ ضَامِرٍ يَأْتِينَ مِن كُلِّ فَجٍّ عَمِيقٍ﴾
          </p>
          <p className="mt-4 text-gold">سورة الحج — الآية 27</p>
        </Reveal>
      </section>

      {/* News */}
      <section className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading align="start" eyebrow="مدونة الإدارة" title="آخر الأخبار والإعلانات" className="mb-10" />
          <Reveal className="mb-10">
            <ButtonLink href="/news" variant="outline">
              كل الأخبار <ArrowLeft className="size-4" />
            </ButtonLink>
          </Reveal>
        </div>
        <Stagger className="grid gap-6 md:grid-cols-3">
          {NEWS.map((n) => (
            <StaggerItem key={n.slug}>
              <Link href={`/news/${n.slug}`} className="group block h-full overflow-hidden rounded-3xl border border-gold/30 bg-white transition duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-35px_rgba(2,21,38,.45)]">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image src={n.image} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" quality={70} className="object-cover transition duration-[1.2s] group-hover:scale-110" />
                  <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-maroon backdrop-blur">{n.category}</span>
                </div>
                <div className="p-6">
                  <p className="flex items-center gap-1.5 text-xs text-hint">
                    <CalendarDays className="size-3.5" /> {n.hijri}
                  </p>
                  <h3 className="mt-2 font-display text-xl font-bold leading-8 text-green-dark transition group-hover:text-green">{n.title}</h3>
                  <p className="mt-2 line-clamp-2 leading-7 text-ink-soft">{n.excerpt}</p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Season calendar */}
      <section className="relative overflow-hidden bg-white py-24">
        <div className="bg-pattern-dark absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow="تقويم الموسم" title="مواعيد موسم حج 1448هـ" description="تضبط الإدارة هذه المواعيد في إعدادات الموسم، وتصلك تذكيرات شخصية بها بعد إنشاء حسابك." />
          <div className="scrollbar-none -mx-4 overflow-x-auto px-4 pb-4">
            <Stagger className="flex w-max gap-4">
              {SEASON.dates.map((d, i) => (
                <StaggerItem key={d.title} className="relative w-64 shrink-0 rounded-3xl border border-gold/30 bg-sand p-5">
                  <span className="font-display text-5xl font-bold text-gold/60">{String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-2 font-bold text-maroon">{d.hijri}</p>
                  <p className="text-xs text-hint">{d.gregorian}</p>
                  <p className="mt-3 font-display text-lg font-bold leading-7 text-green-dark">{d.title}</p>
                  <span className="mt-3 inline-block rounded-full bg-green-dark/8 px-2.5 py-1 text-xs font-bold text-green-dark">{d.who}</span>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pt-24 md:px-8">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-maroon-dark px-6 py-14 text-white md:px-16 md:py-20">
            <Image src="/images/farewell-tawaf.jpg" alt="" fill sizes="100vw" quality={70} className="-z-20 object-cover opacity-25" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-l from-maroon-dark via-maroon-dark/90 to-maroon/60" />
            <div className="bg-pattern absolute inset-0 -z-10 opacity-15" />
            <div className="grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 className="font-display text-3xl font-bold leading-[1.4] md:text-5xl">
                  جاهز لتقديم طلبك؟ <br />
                  <span className="text-gold-shine">نرافقك خطوة بخطوة</span>
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-white/80">
                  صُممت الأسئلة لتكون واضحة وكبيرة ومسموعة، حتى يستطيع كبار السن تقديم طلبهم بأنفسهم دون مساعدة.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink href="/register" variant="gold" size="lg">
                    إنشاء حساب حاج <ArrowLeft className="size-5" />
                  </ButtonLink>
                  <ButtonLink href="/conditions" variant="glass" size="lg">
                    <BadgeCheck className="size-5" /> افحص أهليتك أولاً
                  </ButtonLink>
                </div>
              </div>
              <ul className="space-y-3">
                {["الرقم الوطني ورقم الهاتف فقط", "بياناتك تأتي من الشؤون المدنية", "أضف عائلتك من دفتر العائلة", "تابع طلبك لحظة بلحظة"].map((t, i) => (
                  <li key={t} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
                    <span className="grid size-8 place-items-center rounded-full bg-gold font-bold text-ink">{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
