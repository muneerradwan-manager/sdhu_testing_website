"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, BookOpen, Bus, EyeOff, Hotel, MapPin, Search, Sparkles, Star, Users, Utensils, Wallet } from "lucide-react";
import { useState } from "react";
import { Badge, Modal } from "@/components/ui/widgets";
import { useClusters } from "@/lib/cms/content";
import { normalizeArabic, type Cluster, type ServiceLevel } from "@/lib/data/clusters";
import { SEASON } from "@/lib/season";
import { cn, formatNumber, formatUSD } from "@/lib/utils";

const LEVELS: ("الكل" | ServiceLevel)[] = ["الكل", "عادي", "محسّن", "خمس نجوم"];

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

export function ServicesDirectory({ openSlug, onOpenChange }: { openSlug: string | null; onOpenChange: (slug: string | null) => void }) {
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("الكل");
  const [q, setQ] = useState("");
  const CLUSTERS = useClusters();
  const list = CLUSTERS.filter(
    (c) => (level === "الكل" || c.level === level) && (!q.trim() || normalizeArabic(`${c.name} ${c.governorate} ${c.specialty}`).includes(normalizeArabic(q))),
  ).sort((a, b) => b.rating - a.rating);
  const selected = CLUSTERS.find((c) => c.slug === openSlug) ?? null;

  return (
    <div>
      <div className="flex flex-col gap-3 rounded-3xl border border-gold/40 bg-white p-3 sm:flex-row sm:items-center">
        <div className="scrollbar-none flex gap-1 overflow-x-auto">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={cn("relative shrink-0 rounded-2xl px-4 py-2 text-sm font-bold transition", level === l ? "text-white" : "text-ink-soft hover:bg-sand")}
            >
              {level === l && <motion.span layoutId="level-pill" className="absolute inset-0 rounded-2xl bg-green-dark" />}
              <span className="relative">{l}</span>
            </button>
          ))}
        </div>
        <label className="relative flex-1">
          <span className="sr-only">ابحث في الدليل</span>
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-hint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم التكتل أو المحافظة"
            className="h-11 w-full rounded-2xl bg-sand pr-9 pl-3 text-sm outline-none transition focus:ring-4 focus:ring-green-light/15"
          />
        </label>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-gold/20 px-4 py-3 text-sm leading-7 text-ink">
        <EyeOff className="mt-1 size-4 shrink-0 text-maroon" />
        برامج منشورة بعد اعتماد لجنة الإعلانات ومدير المكتب. لا تظهر للعامة أرقام الغرف، ولا أسماء الحجاج الآخرين، ولا خطط النقل التفصيلية.
      </p>

      <motion.div layout className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((c, i) => (
            <motion.article
              layout
              key={c.slug}
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.45, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="group flex flex-col overflow-hidden rounded-3xl border border-gold/40 bg-white shadow-[0_20px_50px_-35px_rgba(0,89,79,.6)] transition-shadow hover:shadow-[0_30px_60px_-30px_rgba(0,89,79,.55)]"
            >
              <div className="relative h-40 overflow-hidden">
                <Image
                  src={IMAGES[c.slug]}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                  quality={70}
                  className="object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
                <span className={cn("absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow", LEVEL_STYLE[c.level])}>
                  {c.level === "خمس نجوم" && <Sparkles className="me-1 inline size-3" />}
                  {c.level}
                </span>
                <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-bold text-green shadow">
                  <BadgeCheck className="size-3.5" /> معتمد
                </span>
                <div className="absolute inset-x-4 bottom-3 text-white">
                  <h3 className="font-display text-xl font-bold leading-tight">{c.name}</h3>
                  <p className="text-xs text-white/75">
                    {c.governorate} · منذ {c.since}هـ
                  </p>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between">
                  <Rating value={c.rating} />
                  <span className="text-xs text-ink-soft">{formatNumber(c.reviews)} تقييماً</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-ink-soft">{c.specialty}</p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Hotel className="mt-0.5 size-4 shrink-0 text-gold-dark" />
                    <span>
                      <span className="font-semibold text-ink">{c.makkah.hotel}</span>
                      <span className="text-ink-soft"> · {c.makkah.distance}</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-gold-dark" />
                    <span>
                      <span className="font-semibold text-ink">{c.madinah.hotel}</span>
                      <span className="text-ink-soft"> · {c.madinah.distance}</span>
                    </span>
                  </li>
                </ul>
                <div className="mt-4 space-y-2.5">
                  {c.groups.slice(0, 2).map((g) => (
                    <SeatBar key={g.no} group={g} />
                  ))}
                </div>
                <button
                  onClick={() => onOpenChange(c.slug)}
                  className="mt-5 flex h-11 items-center justify-center gap-2 rounded-2xl border-2 border-green-dark/15 font-bold text-green-dark transition group-hover:border-green-dark group-hover:bg-green-dark group-hover:text-white"
                >
                  عرض البرنامج الكامل
                </button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>
      {list.length === 0 && <p className="py-16 text-center text-ink-soft">لا توجد تكتلات مطابقة.</p>}

      <Modal open={!!selected} onClose={() => onOpenChange(null)} className="max-w-2xl p-0">
        {selected && <ClusterDetail cluster={selected} />}
      </Modal>
    </div>
  );
}

function Rating({ value }: { value: number }) {
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
      <span className="text-sm font-bold text-ink">{value.toFixed(1)}</span>
      <span className="sr-only">من 5</span>
    </span>
  );
}

function seatsLeft(n: number) {
  if (n === 1) return "بقي مقعد واحد";
  if (n === 2) return "بقي مقعدان";
  return `بقي ${n} ${n <= 10 ? "مقاعد" : "مقعداً"}`;
}

function SeatBar({ group }: { group: Cluster["groups"][number] }) {
  const taken = group.capacity - group.remaining;
  const full = group.remaining === 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink">المجموعة {group.no}</span>
        <span className={cn("font-bold", full ? "text-maroon" : group.remaining <= 6 ? "text-amber-700" : "text-green")}>
          {full ? "مكتملة" : seatsLeft(group.remaining)}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand">
        <motion.div
          className={cn("h-full rounded-full", full ? "bg-maroon" : group.remaining <= 6 ? "bg-gradient-to-l from-amber-500 to-gold-dark" : "bg-gradient-to-l from-green-light to-green-dark")}
          initial={{ width: 0 }}
          whileInView={{ width: `${(taken / group.capacity) * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

function ClusterDetail({ cluster: c }: { cluster: Cluster }) {
  const blocks = [
    { icon: Bus, title: "النقل", items: c.transport },
    { icon: Utensils, title: "الوجبات", items: c.meals },
    { icon: BookOpen, title: "البرامج", items: c.programs },
  ];
  return (
    <div>
      <div className="relative h-48 overflow-hidden rounded-t-3xl">
        <Image src={IMAGES[c.slug]} alt="" fill sizes="672px" quality={70} className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-green-dark via-green-dark/50 to-transparent" />
        <div className="absolute inset-x-6 bottom-5 text-white">
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold", LEVEL_STYLE[c.level])}>{c.level}</span>
          <h3 className="mt-2 font-display text-3xl font-bold">{c.name}</h3>
          <p className="text-sm text-white/80">برنامج معتمد في {c.approvedOn}</p>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Rating value={c.rating} />
          <Badge tone="ink">
            <Users className="size-3" /> {c.groupsCount} مجموعة · {formatNumber(c.pilgrims)} حاج
          </Badge>
          <Badge tone="gold">منذ {c.since}هـ</Badge>
        </div>
        <p className="leading-8 text-ink-soft">{c.about}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-gold/40 bg-sand/60 p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-maroon">
              <Hotel className="size-4" /> السكن في مكة المكرمة
            </p>
            <p className="mt-2 font-bold text-ink">{c.makkah.hotel}</p>
            <p className="text-sm text-ink-soft">
              {c.makkah.area} · {c.makkah.distance}
            </p>
            <p className="mt-1 text-sm text-ink-soft">{c.makkah.rooms}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {c.makkah.features.map((f) => (
                <span key={f} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-ink-soft ring-1 ring-gold/40">
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-gold/40 bg-sand/60 p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-maroon">
              <MapPin className="size-4" /> السكن في المدينة المنورة
            </p>
            <p className="mt-2 font-bold text-ink">{c.madinah.hotel}</p>
            <p className="text-sm text-ink-soft">{c.madinah.area}</p>
            <p className="mt-1 text-sm font-semibold text-green">{c.madinah.distance}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {blocks.map((b) => (
            <div key={b.title} className="rounded-2xl border border-gold/40 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-green-dark">
                <b.icon className="size-4 text-gold-dark" /> {b.title}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-ink-soft">
                {b.items.map((it) => (
                  <li key={it}>• {it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-green-dark p-4 text-white">
          <p className="flex items-center gap-2 text-sm font-bold text-gold">
            <Wallet className="size-4" /> التكلفة المعتمدة للفرد
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {[
              ["تكلفة الحج", SEASON.fees.hajjCost],
              ["الهدي", SEASON.fees.hady],
              ["فارق الغرفة الخاصة", c.privateRoomDiff],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/10 p-2">
                <p className="text-[11px] text-white/70">{k}</p>
                <p className="font-display text-lg font-bold">{formatUSD(v as number)}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="font-bold text-ink">المجموعات المتاحة</p>
          <div className="mt-3 space-y-3">
            {c.groups.map((g) => (
              <div key={g.no} className="rounded-2xl border border-gold/30 p-3">
                <SeatBar group={g} />
                <p className="mt-1.5 text-xs text-ink-soft">رئيس المجموعة: {g.leader}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="flex items-start gap-2 rounded-2xl bg-maroon/5 p-3 text-xs leading-6 text-maroon">
          <EyeOff className="mt-0.5 size-4 shrink-0" />
          ما لا يظهر هنا: أرقام الغرف، وأسماء الحجاج الآخرين، وخطط النقل التفصيلية — معلومات تشغيلية لا تُعرض للعامة. الانتساب إلى مجموعة متاح بعد القبول واكتمال الأوراق.
        </p>
      </div>
    </div>
  );
}
