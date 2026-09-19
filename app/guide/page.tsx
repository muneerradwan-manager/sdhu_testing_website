import type { Metadata } from "next";
import {
  Bird,
  CalendarDays,
  CircleCheckBig,
  Footprints,
  GlassWater,
  GraduationCap,
  Hand,
  HardHat,
  HeartOff,
  Luggage,
  MoonStar,
  Pill,
  Gem,
  RotateCcw,
  ScanFace,
  Scissors,
  Shirt,
  Siren,
  SprayCan,
  Sun,
  Utensils,
  BedDouble,
  BookHeart,
  Scale,
  Ban,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { MapEmbed } from "@/components/ui/widgets";
import {
  DAYS,
  GUIDE_DUAS,
  HARAM,
  HEALTH_TIPS,
  HEATSTROKE_SIGNS,
  NUSUK,
  NUSUK_ROWS,
  PACKING,
  PROHIBITIONS,
  type HealthIcon,
  type ProhibitionIcon,
} from "@/lib/data/guide";
import { cn } from "@/lib/utils";
import { DayStepper } from "./_components/day-stepper";
import { DuaCard } from "./_components/dua-card";
import { PackingChecklist } from "./_components/packing-checklist";
import { RitualCounter } from "./_components/ritual-counter";

export const metadata: Metadata = {
  title: "دليل المناسك",
  description: "مركز المعرفة: أعمال الحج يوماً بيوم، أنواع النسك، محظورات الإحرام، عدّاد الطواف والسعي، الأدعية، وحقيبة الحاج.",
};

const PROHIBITION_ICONS: Record<ProhibitionIcon, LucideIcon> = {
  scissors: Scissors,
  hand: Hand,
  spray: SprayCan,
  head: HardHat,
  shirt: Shirt,
  veil: ScanFace,
  bird: Bird,
  ring: Gem,
  heart: HeartOff,
};

const HEALTH_ICONS: Record<HealthIcon, LucideIcon> = {
  water: GlassWater,
  sun: Sun,
  feet: Footprints,
  pill: Pill,
  food: Utensils,
  sleep: BedDouble,
};

const SECTIONS = [
  { href: "#days", label: "يوماً بيوم", icon: CalendarDays },
  { href: "#nusuk", label: "أنواع النسك", icon: Scale },
  { href: "#ihram", label: "محظورات الإحرام", icon: Ban },
  { href: "#counter", label: "عدّاد الطواف والسعي", icon: RotateCcw },
  { href: "#duas", label: "الأدعية", icon: BookHeart },
  { href: "#bag", label: "حقيبة الحاج والصحة", icon: Luggage },
];

export default function GuidePage() {
  return (
    <>
      <PageHero
        title={
          <>
            دليل <span className="text-gold-shine">المناسك</span>
          </>
        }
        description="مركز المعرفة للحاج السوري: ماذا تفعل في كل يوم، وأين تكون، وماذا تقول. بلغة بسيطة وخرائط وأدعية مسموعة."
        image="/images/jabal-rahmah.jpg"
        crumbs={[{ label: "دليل المناسك" }]}
      >
        <nav aria-label="أقسام الدليل" className="scrollbar-none -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {SECTIONS.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/20 backdrop-blur transition hover:-translate-y-0.5 hover:bg-gold hover:text-ink"
            >
              <s.icon className="size-4" />
              {s.label}
            </a>
          ))}
        </nav>
      </PageHero>

      {/* Day by day */}
      <section id="days" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 md:px-8 md:py-20">
        <SectionHeading eyebrow="من 8 إلى 13 ذي الحجة" title="أعمال الحج يوماً بيوم" description="اختر اليوم لترى ما تفعله، والمواعيد التقريبية، والدعاء، والمكان على الخريطة." />
        <DayStepper days={DAYS} />
      </section>

      {/* Nusuk */}
      <section id="nusuk" className="relative scroll-mt-24 overflow-hidden bg-green-dark py-16 text-white md:py-24">
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading light eyebrow="قبل الإحرام" title="أي نسك تختار؟" description="الأنساك الثلاثة صحيحة كلها. هذه مقارنة سريعة تساعدك على الفهم، واسأل مرشد مجموعتك عن الأنسب لك." />
          <Stagger className="grid gap-4 md:grid-cols-3">
            {NUSUK.map((n, i) => (
              <StaggerItem key={n.id}>
                <div
                  className={cn(
                    "relative h-full overflow-hidden rounded-3xl p-6 ring-1 transition hover:-translate-y-1",
                    n.recommended ? "bg-gold text-ink ring-gold" : "bg-white/5 ring-white/15 backdrop-blur",
                  )}
                >
                  {n.recommended && (
                    <span className="absolute left-4 top-4 rounded-full bg-maroon px-3 py-1 text-[11px] font-bold text-white">الأنسب لأغلب الحجاج السوريين</span>
                  )}
                  <span className={cn("font-display text-6xl font-bold opacity-20", n.recommended ? "text-green-dark" : "text-gold")}>{i + 1}</span>
                  <p className="-mt-6 font-display text-3xl font-bold">{n.name}</p>
                  <p className={cn("mt-1 text-sm font-bold", n.recommended ? "text-maroon" : "text-gold")}>{n.tagline}</p>
                  <p className={cn("mt-3 leading-7", n.recommended ? "text-ink/80" : "text-white/75")}>{n.how}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal className="mt-8 overflow-hidden rounded-3xl bg-white text-ink ring-1 ring-gold/40">
            <div className="hidden md:block">
              <table className="w-full text-right">
                <caption className="sr-only">مقارنة بين التمتع والقران والإفراد</caption>
                <thead>
                  <tr className="bg-sand">
                    <th scope="col" className="p-4 text-sm font-bold text-hint">وجه المقارنة</th>
                    {NUSUK.map((n) => (
                      <th key={n.id} scope="col" className={cn("p-4 font-display text-lg", n.recommended ? "bg-gold/30 text-maroon" : "text-green-dark")}>
                        {n.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {NUSUK_ROWS.map((row) => (
                    <tr key={row.label} className="border-t border-gold/20 transition hover:bg-sand/60">
                      <th scope="row" className="p-4 text-sm font-bold text-ink-soft">{row.label}</th>
                      {row.values.map((v, i) => (
                        <td key={i} className={cn("p-4 font-semibold", i === 0 && "bg-gold/10", v === "واجب" && "text-maroon", v === "غير واجب" && "text-green")}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-gold/20 md:hidden">
              {NUSUK.map((n, ni) => (
                <div key={n.id} className="p-5">
                  <p className="font-display text-xl font-bold text-green-dark">{n.name}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    {NUSUK_ROWS.map((row) => (
                      <div key={row.label} className="contents">
                        <dt className="text-hint">{row.label}</dt>
                        <dd className="font-semibold">{row.values[ni]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Ihram prohibitions */}
      <section id="ihram" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
        <SectionHeading eyebrow="بعد نية الإحرام" title="محظورات الإحرام" description="أمور يمتنع عنها المحرم حتى يتحلل. بعضها للرجال فقط، وبعضها للنساء فقط." />
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROHIBITIONS.map((p) => {
            const Icon = PROHIBITION_ICONS[p.icon];
            return (
              <StaggerItem key={p.title}>
                <div className="group relative flex h-full gap-4 overflow-hidden rounded-3xl border border-gold/35 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-maroon/30 hover:shadow-[0_24px_50px_-30px_rgba(103,33,70,.45)]">
                  <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-maroon/10 text-maroon transition group-hover:bg-maroon group-hover:text-white">
                    <Icon className="size-6" />
                    <svg viewBox="0 0 56 56" className="absolute inset-0 size-full text-maroon/60 opacity-0 transition group-hover:opacity-100 group-hover:text-gold" aria-hidden>
                      <path d="M12 44 44 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-bold text-green-dark">{p.title}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-bold",
                          p.who === "الرجال" ? "bg-green-dark/10 text-green-dark" : p.who === "النساء" ? "bg-maroon/10 text-maroon" : "bg-gold/30 text-ink-soft",
                        )}
                      >
                        {p.who}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-7 text-ink-soft">{p.body}</p>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
        <Reveal className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-3xl bg-green-light/10 p-5 ring-1 ring-green-light/25">
            <CircleCheckBig className="mt-0.5 size-6 shrink-0 text-green" />
            <p className="leading-7 text-ink-soft">
              <strong className="text-green-dark">من فعل محظوراً ناسياً أو جاهلاً</strong> فلا إثم عليه، ويزيله فوراً عند التذكر.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-3xl bg-gold-light/60 p-5 ring-1 ring-gold/40">
            <Scale className="mt-0.5 size-6 shrink-0 text-gold-dark" />
            <p className="leading-7 text-ink-soft">
              <strong className="text-maroon">فدية الأذى على التخيير:</strong> صيام 3 أيام، أو إطعام 6 مساكين، أو ذبح شاة.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Tawaf & Sa'i counters */}
      <section id="counter" className="relative scroll-mt-24 overflow-hidden border-y border-gold/30 bg-gold-light/40 py-16 md:py-24">
        <div className="bg-pattern-dark absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow="أداة تفاعلية" title="عدّاد الطواف والسعي" description="اضغط بعد كل شوط، ولن تنسى العدد. مع دعاء مقترح لكل شوط واحتفال عند الإتمام." />
          <div data-tour-target>
            <RitualCounter />
          </div>
          <Reveal className="mt-12">
            <MapEmbed lat={HARAM.lat} lng={HARAM.lng} label={HARAM.label} zoom={0.006} className="h-72" />
          </Reveal>
        </div>
      </section>

      {/* Duas */}
      <section id="duas" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
        <SectionHeading eyebrow="استمع وانسخ" title="أدعية المناسك" description="نصوص صحيحة بخط واضح، يمكنك الاستماع إليها أو نسخها ومشاركتها." />
        <Stagger className="grid gap-4 md:grid-cols-2">
          {GUIDE_DUAS.map((d, i) => (
            <StaggerItem key={d.title}>
              <DuaCard title={d.title} text={d.text} source={d.source} when={d.when} dark={i === 4} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Bag & health */}
      <section id="bag" className="scroll-mt-24 bg-white/60 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow="قبل السفر وأثناءه" title="حقيبة الحاج ونصائح الصحة" description="قائمة تفاعلية لتجهيز حقيبتك، ونصائح تحميك من الحر والإجهاد." />
          <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
            <Reveal>
              <PackingChecklist groups={PACKING} />
            </Reveal>
            <div className="space-y-4">
              <Stagger className="grid gap-3 sm:grid-cols-2">
                {HEALTH_TIPS.map((t) => {
                  const Icon = HEALTH_ICONS[t.icon];
                  return (
                    <StaggerItem key={t.title}>
                      <div className="group h-full rounded-3xl border border-gold/35 bg-white p-4 transition hover:-translate-y-1 hover:shadow-lg">
                        <span className="grid size-11 place-items-center rounded-2xl bg-green-dark/8 text-green-dark transition group-hover:scale-110 group-hover:bg-green-dark group-hover:text-gold">
                          <Icon className="size-5" />
                        </span>
                        <p className="mt-3 font-bold text-green-dark">{t.title}</p>
                        <p className="mt-1 text-sm leading-6 text-ink-soft">{t.body}</p>
                      </div>
                    </StaggerItem>
                  );
                })}
              </Stagger>
              <Reveal className="relative overflow-hidden rounded-3xl bg-maroon p-5 text-white">
                <div className="bg-pattern absolute inset-0 opacity-15" />
                <div className="relative flex items-start gap-3">
                  <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15">
                    <Siren className="size-6 text-gold" />
                    <span className="absolute inset-0 animate-ping rounded-2xl bg-white/10 [animation-duration:2s]" />
                  </span>
                  <div>
                    <p className="font-display text-lg font-bold">علامات ضربة الشمس</p>
                    <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-white/85">
                      {HEATSTROKE_SIGNS.map((s) => (
                        <li key={s}>• {s}</li>
                      ))}
                    </ul>
                    <p className="mt-3 text-sm leading-7 text-white/85">
                      انقل المصاب إلى الظل، وبرّد جسمه بالماء، واتصل بالإسعاف{" "}
                      <a href="tel:997" className="rounded-lg bg-gold px-2 py-0.5 font-bold text-ink" dir="ltr">
                        997
                      </a>
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-green-dark p-8 text-center text-white md:p-14">
          <div className="bg-pattern absolute inset-0 opacity-15" />
          <MoonStar className="relative mx-auto size-10 text-gold" />
          <p className="relative mt-4 font-display text-3xl font-bold md:text-4xl">تريد فهماً أعمق؟</p>
          <p className="relative mx-auto mt-3 max-w-xl leading-8 text-white/80">في الأكاديمية 48 درساً مصوّراً وصوتياً يشرح كل منسك بالتفصيل، مع أسئلة معتمدة وشهادة إتمام.</p>
          <div className="relative mt-7 flex justify-center">
            <ButtonLink href="/academy" variant="gold" size="lg">
              <GraduationCap className="size-5" /> انتقل إلى الأكاديمية
            </ButtonLink>
          </div>
        </Reveal>
      </section>
    </>
  );
}
