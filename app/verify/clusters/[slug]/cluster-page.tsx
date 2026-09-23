"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, BadgeCheck, BookOpen, Bus, CalendarCheck, Hotel, MapPin, ShieldCheck, Sparkles, Star, Users, Utensils, Wallet } from "lucide-react";
import { Card } from "@/components/portal/shell";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/widgets";
import { useClusterDirectory } from "@/lib/cluster-profile";
import { SEASON } from "@/lib/season";
import type { ServiceLevel } from "@/lib/data/clusters";
import { cn, formatNumber, formatUSD } from "@/lib/utils";

const IMAGES: Record<string, string> = {
  "al-nour": "/images/clock-tower.jpg",
  "al-safa": "/images/kaaba-hajj.jpg",
  "al-yaqeen": "/images/mina-tents.jpg",
  "al-shahba": "/images/tawaf-night.jpg",
  "al-asi": "/images/jabal-rahmah.jpg",
  "bawabat-al-haramain": "/images/nabawi.jpg",
  hawran: "/images/quba.jpg",
};

const LEVEL_STYLE: Record<ServiceLevel, string> = {
  "عادي": "bg-white/90 text-green-dark",
  "محسّن": "bg-green-light text-white",
  "خمس نجوم": "bg-gradient-to-l from-gold-dark to-gold text-ink",
};

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex" dir="ltr" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className="relative size-4">
            <Star className="absolute inset-0 size-4 text-gold" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, value - n + 1)) * 100}%` }}>
              <Star className="size-4 fill-gold-dark text-gold-dark" />
            </span>
          </span>
        ))}
      </span>
      <span className="font-bold text-ink">{value.toFixed(1)}</span>
      <span className="sr-only">من 5</span>
    </span>
  );
}

/**
 * The cluster's published programme, on a page of its own rather than in a dialog: a pilgrim compares
 * clusters before he picks one, so he needs room to read, a link he can keep, and a page he can print.
 */
export function ClusterPage({ slug }: { slug: string }) {
  const c = useClusterDirectory().find((x) => x.slug === slug);

  if (!c) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold text-green-dark">لا يوجد تكتل على هذا الرابط</h1>
        <p className="mt-3 leading-8 text-ink-soft">قد يكون الرابط قديماً أو التكتل لم يُعتمد بعد. تصفّح التكتلات المعتمدة لموسم {SEASON.hijriYear}هـ.</p>
        <ButtonLink href="/verify?tab=services" className="mt-6">
          دليل الخدمات <ArrowLeft className="size-5" />
        </ButtonLink>
      </div>
    );
  }

  const seats = c.groups.reduce((n, g) => n + g.remaining, 0);
  const blocks = [
    { icon: Bus, title: "النقل", items: c.transport },
    { icon: Utensils, title: "الإعاشة", items: c.meals },
    { icon: BookOpen, title: "البرامج", items: c.programs },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[22rem] overflow-hidden md:h-[26rem]">
        <Image src={IMAGES[c.slug] ?? "/images/kaaba-hajj.jpg"} alt="" fill priority sizes="100vw" quality={75} className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-green-dark via-green-dark/70 to-green-dark/20" />
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col justify-end px-4 pb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <nav aria-label="مسار التنقل" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-white/70">
              <Link href="/" className="hover:text-gold">الرئيسية</Link>
              <span>/</span>
              <Link href="/verify?tab=services" className="hover:text-gold">دليل الخدمات</Link>
              <span>/</span>
              <span className="text-white">{c.name}</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-3 py-1 text-xs font-bold", LEVEL_STYLE[c.level])}>{c.level}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/25">
                <BadgeCheck className="size-3.5 text-green-light" /> معتمد من الإدارة
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/25">
                <CalendarCheck className="size-3.5 text-gold" /> منذ {c.since}هـ
              </span>
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold text-white md:text-5xl">{c.name}</h1>
            <p className="mt-2 max-w-2xl leading-8 text-white/85">{c.specialty}</p>
            <p className="mt-2 text-sm text-white/70">
              {c.governorate} · {c.office} · برنامج معتمد في {c.approvedOn}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        {/* Numbers */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "التقييم", v: <Stars value={c.rating} />, hint: `${formatNumber(c.reviews)} تقييماً من حجاج سابقين` },
            { k: "المجموعات", v: <span className="font-display text-2xl font-bold text-green-dark">{c.groupsCount}</span>, hint: `${formatNumber(c.pilgrims)} حاجاً هذا الموسم` },
            { k: "المقاعد المتاحة", v: <span className="font-display text-2xl font-bold text-green-dark">{seats}</span>, hint: "تتغير مع تسجيل الحجاج" },
            { k: "فارق الغرفة الخاصة", v: <span className="font-display text-2xl font-bold text-green-dark">{formatUSD(c.privateRoomDiff)}</span>, hint: "يُضاف إلى تكلفة الحج" },
          ].map((x, i) => (
            <motion.div key={x.k} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-3xl border border-gold/30 bg-white p-5">
              <p className="text-xs text-hint">{x.k}</p>
              <div className="mt-1">{x.v}</div>
              <p className="mt-1 text-xs text-ink-soft">{x.hint}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <Card className="md:p-7">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
                <Sparkles className="size-6 text-gold-dark" /> عن التكتل
              </h2>
              <p className="mt-3 leading-8 text-ink-soft">{c.about}</p>
            </Card>

            {/* Accommodation */}
            <Card className="md:p-7">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
                <Hotel className="size-6 text-gold-dark" /> السكن
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gold/40 bg-sand/60 p-5">
                  <p className="flex items-center gap-2 text-xs font-bold text-maroon">
                    <Hotel className="size-4" /> مكة المكرمة
                  </p>
                  <p className="mt-2 font-display text-xl font-bold text-ink">{c.makkah.hotel}</p>
                  <p className="text-sm text-ink-soft">
                    {c.makkah.area} · {c.makkah.distance}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">{c.makkah.rooms}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.makkah.features.map((f) => (
                      <span key={f} className="rounded-full bg-white px-2.5 py-1 text-xs text-ink-soft ring-1 ring-gold/40">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-gold/40 bg-sand/60 p-5">
                  <p className="flex items-center gap-2 text-xs font-bold text-maroon">
                    <MapPin className="size-4" /> المدينة المنورة
                  </p>
                  <p className="mt-2 font-display text-xl font-bold text-ink">{c.madinah.hotel}</p>
                  <p className="text-sm text-ink-soft">
                    {c.madinah.area} · {c.madinah.distance}
                  </p>
                </div>
              </div>
            </Card>

            {/* Services */}
            <div className="grid gap-4 sm:grid-cols-3">
              {blocks.map(({ icon: Icon, title, items }, i) => (
                <motion.div key={title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className="rounded-3xl border border-gold/30 bg-white p-5">
                  <p className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
                    <Icon className="size-5 text-gold-dark" /> {title}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
                    {items.map((t) => (
                      <li key={t} className="flex gap-2">
                        <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-gold-dark" /> {t}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            {/* Groups */}
            <Card className="md:p-7">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
                <Users className="size-6 text-gold-dark" /> مجموعات التكتل
              </h2>
              <p className="mt-2 text-sm leading-7 text-ink-soft">
                في مرحلة التفويج تختار مجموعتك من هنا وتتواصل معها، فيسجّلك منسقها ويوقّعان معك العقد. لكل مجموعة رئيسها وسعتها.
              </p>
              <ul className="mt-4 space-y-3">
                {c.groups.map((g, i) => {
                  const taken = g.capacity - g.remaining;
                  const pct = Math.round((taken / g.capacity) * 100);
                  const full = g.remaining === 0;
                  return (
                    <motion.li key={g.no} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border-2 border-gold/30 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-ink">المجموعة {g.no}</p>
                          <p className="text-xs text-ink-soft">رئيسها: {g.leader}</p>
                        </div>
                        <Badge tone={full ? "maroon" : g.remaining <= 5 ? "gold" : "green"}>
                          {full ? "مكتملة" : g.remaining === 1 ? "بقي مقعد واحد" : `بقي ${g.remaining} مقعداً`}
                        </Badge>
                      </div>
                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-sand">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.05 }} className={cn("h-full", full ? "bg-maroon" : "bg-green-light")} />
                      </div>
                      <p className="mt-1 text-xs text-hint">
                        {taken} من {g.capacity} مقعداً مشغولة
                      </p>
                    </motion.li>
                  );
                })}
              </ul>
            </Card>
          </div>

          {/* Aside */}
          <aside className="space-y-4 lg:sticky lg:top-28">
            <div className="rounded-[2rem] bg-green-dark p-6 text-white">
              <p className="flex items-center gap-2 font-display text-lg font-bold text-gold">
                <ShieldCheck className="size-5" /> ما معنى «معتمد»؟
              </p>
              <p className="mt-2 text-sm leading-7 text-white/80">
                هذا التكتل مرخّص من إدارة الحج والعمرة لموسم {SEASON.hijriYear}هـ، وبرنامجه أعلاه هو ما التزم به أمامها. أي جهة خارج هذا الدليل ليست معتمدة، ولا تقبل منها تسجيلاً ولا دفعاً.
              </p>
              <ButtonLink href="/verify?tab=services" variant="gold" size="sm" className="mt-4 w-full">
                بقية التكتلات المعتمدة
              </ButtonLink>
            </div>
            <div className="rounded-[2rem] border border-gold/30 bg-white p-6">
              <p className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
                <Wallet className="size-5 text-gold-dark" /> التكاليف
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2 rounded-xl bg-sand px-3 py-2">
                  <dt className="text-ink-soft">تكلفة الحج للفرد</dt>
                  <dd className="font-bold" dir="ltr">{formatUSD(SEASON.fees.hajjCost)}</dd>
                </div>
                <div className="flex justify-between gap-2 rounded-xl bg-sand px-3 py-2">
                  <dt className="text-ink-soft">فارق الغرفة الخاصة</dt>
                  <dd className="font-bold" dir="ltr">{formatUSD(c.privateRoomDiff)}</dd>
                </div>
                <div className="flex justify-between gap-2 rounded-xl bg-sand px-3 py-2">
                  <dt className="text-ink-soft">الهدي</dt>
                  <dd className="font-bold" dir="ltr">{formatUSD(SEASON.fees.hady)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-6 text-hint">التكلفة تحددها الإدارة للموسم كله، ولا يزيدها التكتل. الدفع إلى حساب المنصة لا إلى أشخاص.</p>
            </div>
            <ButtonLink href="/portal/apply" size="lg" className="w-full">
              قدّم طلب حج <ArrowLeft className="size-5" />
            </ButtonLink>
          </aside>
        </div>
      </div>
    </div>
  );
}
