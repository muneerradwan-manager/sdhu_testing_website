"use client";

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
import { CmsHeading } from "@/components/cms/heading";
import { CmsPageHero } from "@/components/cms/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { MapEmbed } from "@/components/ui/widgets";
import {
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
import { useLang, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { HEALTH_TIPS_EN, HEATSTROKE_SIGNS_EN, NUSUK_EN, NUSUK_ROWS_EN, PROHIBITIONS_EN, WHO_EN } from "./guide-en";
import { GuideDays, GuideDuas } from "./guide-content";
import { PackingChecklist } from "./packing-checklist";
import { RitualCounter } from "./ritual-counter";

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
  { href: "#days", ar: "يوماً بيوم", en: "Day by day", icon: CalendarDays },
  { href: "#nusuk", ar: "أنواع النسك", en: "Types of Hajj", icon: Scale },
  { href: "#ihram", ar: "محظورات الإحرام", en: "Ihram prohibitions", icon: Ban },
  { href: "#counter", ar: "عدّاد الطواف والسعي", en: "Tawaf and Sa'i counter", icon: RotateCcw },
  { href: "#duas", ar: "الأدعية", en: "Duas", icon: BookHeart },
  { href: "#bag", ar: "حقيبة الحاج والصحة", en: "Pilgrim's bag and health", icon: Luggage },
];

export function GuideBody() {
  const t = useT();
  const en = useLang() === "en";
  const nusuk = NUSUK.map((n) => (en ? { ...n, ...NUSUK_EN[n.id] } : n));
  const rows = en ? NUSUK_ROWS_EN : NUSUK_ROWS;
  const prohibitions = PROHIBITIONS.map((p, i) => (en ? { ...p, ...PROHIBITIONS_EN[i] } : p));
  const tips = HEALTH_TIPS.map((h, i) => (en ? { ...h, ...HEALTH_TIPS_EN[i] } : h));
  const signs = en ? HEATSTROKE_SIGNS_EN : HEATSTROKE_SIGNS;
  return (
    <>
      <CmsPageHero page="guide">
        <nav aria-label={t("أقسام الدليل", "Guide sections")} className="scrollbar-none -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {SECTIONS.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/20 backdrop-blur transition hover:-translate-y-0.5 hover:bg-gold hover:text-ink"
            >
              <s.icon className="size-4" />
              {t(s.ar, s.en)}
            </a>
          ))}
        </nav>
      </CmsPageHero>

      {/* Day by day */}
      <section id="days" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 md:px-8 md:py-20">
        <CmsHeading page="guide" section="days" />
        <GuideDays />
      </section>

      {/* Nusuk */}
      <section id="nusuk" className="relative scroll-mt-24 overflow-hidden bg-green-dark py-16 text-white md:py-24">
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <CmsHeading light page="guide" section="rites" />
          <Stagger className="grid gap-4 md:grid-cols-3">
            {nusuk.map((n, i) => (
              <StaggerItem key={n.id}>
                <div
                  className={cn(
                    "relative h-full overflow-hidden rounded-3xl p-6 ring-1 transition hover:-translate-y-1",
                    n.recommended ? "bg-gold text-ink ring-gold" : "bg-white/5 ring-white/15 backdrop-blur",
                  )}
                >
                  {n.recommended && (
                    <span className="absolute end-4 top-4 rounded-full bg-maroon px-3 py-1 text-[11px] font-bold text-white">{t("الأنسب لأغلب الحجاج السوريين", "Best for most Syrian pilgrims")}</span>
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
              <table className="w-full text-start">
                <caption className="sr-only">{t("مقارنة بين التمتع والقران والإفراد", "Comparison of Tamattu', Qiran and Ifrad")}</caption>
                <thead>
                  <tr className="bg-sand">
                    <th scope="col" className="p-4 text-sm font-bold text-hint">{t("وجه المقارنة", "Compared")}</th>
                    {nusuk.map((n) => (
                      <th key={n.id} scope="col" className={cn("p-4 font-display text-lg", n.recommended ? "bg-gold/30 text-maroon" : "text-green-dark")}>
                        {n.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={row.label} className="border-t border-gold/20 transition hover:bg-sand/60">
                      <th scope="row" className="p-4 text-sm font-bold text-ink-soft">{row.label}</th>
                      {row.values.map((v, i) => (
                        <td key={i} className={cn("p-4 font-semibold", i === 0 && "bg-gold/10", NUSUK_ROWS[ri].values[i] === "واجب" && "text-maroon", NUSUK_ROWS[ri].values[i] === "غير واجب" && "text-green")}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-gold/20 md:hidden">
              {nusuk.map((n, ni) => (
                <div key={n.id} className="p-5">
                  <p className="font-display text-xl font-bold text-green-dark">{n.name}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    {rows.map((row) => (
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
        <SectionHeading
          eyebrow={t("بعد نية الإحرام", "Once you intend Ihram")}
          title={t("محظورات الإحرام", "Ihram prohibitions")}
          description={t(
            "أمور يمتنع عنها المحرم حتى يتحلل. بعضها للرجال فقط، وبعضها للنساء فقط.",
            "Things a pilgrim in Ihram must avoid until Tahallul. Some apply to men only, and some to women only.",
          )}
        />
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prohibitions.map((p) => {
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
                        {en ? WHO_EN[p.who] : p.who}
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
<strong className="text-green-dark">{t("من فعل محظوراً ناسياً أو جاهلاً", "Whoever does a prohibited act forgetfully or unknowingly")}</strong>{" "}
              {t("فلا إثم عليه، ويزيله فوراً عند التذكر.", "has no sin, and stops it as soon as they remember.")}
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-3xl bg-gold-light/60 p-5 ring-1 ring-gold/40">
            <Scale className="mt-0.5 size-6 shrink-0 text-gold-dark" />
            <p className="leading-7 text-ink-soft">
<strong className="text-maroon">{t("فدية الأذى على التخيير:", "The expiation is your choice of:")}</strong>{" "}
              {t("صيام 3 أيام، أو إطعام 6 مساكين، أو ذبح شاة.", "fasting 3 days, feeding 6 poor people, or sacrificing a sheep.")}
            </p>
          </div>
        </Reveal>
      </section>

      {/* Tawaf & Sa'i counters */}
      <section id="counter" className="relative scroll-mt-24 overflow-hidden border-y border-gold/30 bg-gold-light/40 py-16 md:py-24">
        <div className="bg-pattern-dark absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow={t("أداة تفاعلية", "Interactive tool")}
            title={t("عدّاد الطواف والسعي", "Tawaf and Sa'i counter")}
            description={t(
              "اضغط بعد كل شوط، ولن تنسى العدد. مع دعاء مقترح لكل شوط واحتفال عند الإتمام.",
              "Tap after each round and you will never lose count. With a suggested dua for each round, and a celebration when you finish.",
            )}
          />
          <div data-tour-target>
            <RitualCounter />
          </div>
          <Reveal className="mt-12">
            <MapEmbed lat={HARAM.lat} lng={HARAM.lng} label={t(HARAM.label, "Masjid al-Haram")} zoom={0.006} className="h-72" />
          </Reveal>
        </div>
      </section>

      {/* Duas */}
      <section id="duas" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
        <SectionHeading
          eyebrow={t("استمع وانسخ", "Listen and copy")}
          title={t("أدعية المناسك", "Duas of the rites")}
          description={t(
            "نصوص صحيحة بخط واضح، يمكنك الاستماع إليها أو نسخها ومشاركتها.",
            "Authentic texts in clear script. Listen to them, or copy and share them.",
          )}
        />
        <GuideDuas />
      </section>

      {/* Bag & health */}
      <section id="bag" className="scroll-mt-24 bg-white/60 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow={t("قبل السفر وأثناءه", "Before and during the journey")}
            title={t("حقيبة الحاج ونصائح الصحة", "The pilgrim's bag and health tips")}
            description={t("قائمة تفاعلية لتجهيز حقيبتك، ونصائح تحميك من الحر والإجهاد.", "An interactive list to pack your bag, and tips to protect you from heat and exhaustion.")}
          />
          <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
            <Reveal>
              <PackingChecklist groups={PACKING} />
            </Reveal>
            <div className="space-y-4">
              <Stagger className="grid gap-3 sm:grid-cols-2">
                {tips.map((h) => {
                  const Icon = HEALTH_ICONS[h.icon];
                  return (
                    <StaggerItem key={h.title}>
                      <div className="group h-full rounded-3xl border border-gold/35 bg-white p-4 transition hover:-translate-y-1 hover:shadow-lg">
                        <span className="grid size-11 place-items-center rounded-2xl bg-green-dark/8 text-green-dark transition group-hover:scale-110 group-hover:bg-green-dark group-hover:text-gold">
                          <Icon className="size-5" />
                        </span>
                        <p className="mt-3 font-bold text-green-dark">{h.title}</p>
                        <p className="mt-1 text-sm leading-6 text-ink-soft">{h.body}</p>
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
                    <p className="font-display text-lg font-bold">{t("علامات ضربة الشمس", "Signs of sunstroke")}</p>
                    <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-white/85">
                      {signs.map((s) => (
                        <li key={s}>• {s}</li>
                      ))}
                    </ul>
                    <p className="mt-3 text-sm leading-7 text-white/85">
                      {t("انقل المصاب إلى الظل، وبرّد جسمه بالماء، واتصل بالإسعاف", "Move the person into the shade, cool their body with water, and call an ambulance")}{" "}
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
          <p className="relative mt-4 font-display text-3xl font-bold md:text-4xl">{t("تريد فهماً أعمق؟", "Want to understand more?")}</p>
          <p className="relative mx-auto mt-3 max-w-xl leading-8 text-white/80">
            {t(
              "في الأكاديمية 48 درساً مصوّراً وصوتياً يشرح كل منسك بالتفصيل، مع أسئلة معتمدة وشهادة إتمام.",
              "The Academy has 48 video and audio lessons explaining every rite in detail, with approved questions and a certificate of completion.",
            )}
          </p>
          <div className="relative mt-7 flex justify-center">
            <ButtonLink href="/academy" variant="gold" size="lg">
              <GraduationCap className="size-5" /> {t("انتقل إلى الأكاديمية", "Go to the Academy")}
            </ButtonLink>
          </div>
        </Reveal>
      </section>
    </>
  );
}
