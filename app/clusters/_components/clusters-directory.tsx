"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, BadgeCheck, ChevronDown, Crown, EyeOff, Hotel, Landmark, MapPin, Search, Sparkles, Star, UsersRound } from "lucide-react";
import { useState } from "react";
import { useClusterDirectory } from "@/lib/cluster-profile";
import { coverOf, normalizeArabic, type Cluster, type ServiceLevel, type TeamGroup } from "@/lib/data/clusters";
import { groupName } from "@/lib/groups";
import { LEVELS as LEVEL_EN } from "@/app/conditions/_lib/en";
import { useLang, useT } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";
import { PhoneLink } from "./phone";
import { Avatar, GroupDialog } from "../[slug]/cluster-team";
import { CmsImage } from "@/components/cms/image";
import { useGroupProfile } from "@/lib/group-profile";

const LEVELS: ("الكل" | ServiceLevel)[] = ["الكل", "اقتصادي", "اقتصادي محسن", "خمس نجوم"];


const LEVEL_STYLE: Record<ServiceLevel, string> = {
  "اقتصادي": "bg-white/90 text-green-dark",
  "اقتصادي محسن": "bg-green-light text-white",
  "خمس نجوم": "bg-gradient-to-l from-gold-dark to-gold text-ink",
};

/** A cluster's groups shown in its card before «كل المجموعات» */
const FIRST_GROUPS = 3;

type View = "clusters" | "groups";

/**
 * «التكتلات والمجموعات» in two tabs: the clusters, each with the groups under it, and every group of every
 * approved cluster on its own. The same levels for both (a group is in its cluster's tier), and the same search.
 */
export function ClustersDirectory() {
  const t = useT();
  const [view, setView] = useState<View>("clusters");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("الكل");
  const [q, setQ] = useState("");
  const CLUSTERS = useClusterDirectory();
  const needle = normalizeArabic(q).toLowerCase().trim();
  const matches = (text: string) => !needle || normalizeArabic(text).toLowerCase().includes(needle);
  const inLevel = (c: Cluster) => level === "الكل" || c.level === level;

  const clusters = CLUSTERS.filter((c) => inLevel(c) && matches(`${c.name} ${c.governorate} ${c.specialty}`)).sort((a, b) => b.rating - a.rating);
  const groups = CLUSTERS.filter(inLevel)
    .flatMap((c) => (c.team?.groups ?? []).map((g) => ({ cluster: c, group: g })))
    .filter(({ cluster: c, group: g }) => matches(`${groupName(g.no)} ${g.no} ${g.head.name} ${c.name} ${c.governorate}`))
    .sort((a, b) => a.group.no - b.group.no);
  const allGroups = CLUSTERS.reduce((n, c) => n + (c.team?.groups.length ?? 0), 0);

  const TABS: { key: View; icon: typeof Landmark; label: string; count: number }[] = [
    { key: "clusters", icon: Landmark, label: t("التكتلات", "Clusters"), count: CLUSTERS.length },
    { key: "groups", icon: UsersRound, label: t("المجموعات", "Groups"), count: allGroups },
  ];

  return (
    <div>
      <div role="tablist" aria-label={t("التكتلات والمجموعات", "Clusters and groups")} className="mb-4 grid grid-cols-2 gap-1.5 rounded-3xl border border-gold/40 bg-white p-1.5 sm:mx-auto sm:w-fit">
        {TABS.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={view === x.key}
            onClick={() => setView(x.key)}
            className={cn("relative flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold transition sm:px-8", view === x.key ? "text-white" : "text-ink-soft hover:bg-sand")}
          >
            {view === x.key && <motion.span layoutId="directory-tab" className="absolute inset-0 rounded-2xl bg-green-dark" />}
            <x.icon className={cn("relative size-5", view === x.key ? "text-gold" : "text-gold-dark")} />
            <span className="relative">{x.label}</span>
            <span className={cn("relative rounded-full px-2 py-0.5 text-xs", view === x.key ? "bg-white/15" : "bg-sand")}>{formatNumber(x.count)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-gold/40 bg-white p-3 sm:flex-row sm:items-center">
        <div className="scrollbar-none flex gap-1 overflow-x-auto">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={cn("relative shrink-0 rounded-2xl px-4 py-2 text-sm font-bold transition", level === l ? "text-white" : "text-ink-soft hover:bg-sand")}
            >
              {level === l && <motion.span layoutId="level-pill" className="absolute inset-0 rounded-2xl bg-green-dark" />}
              <span className="relative">{t(l, l === "الكل" ? "All" : LEVEL_EN[l])}</span>
            </button>
          ))}
        </div>
        <label className="relative flex-1">
          <span className="sr-only">{t("ابحث في الدليل", "Search the directory")}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={view === "clusters" ? t("ابحث باسم التكتل أو المحافظة", "Search by cluster name or governorate") : t("ابحث برقم المجموعة أو اسم رئيسها أو تكتلها", "Search by group number, its head or its cluster")}
            className="h-11 w-full rounded-2xl bg-sand ps-9 pe-3 text-sm outline-none transition focus:ring-4 focus:ring-green-light/15"
          />
        </label>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-gold/20 px-4 py-3 text-sm leading-7 text-ink">
        <EyeOff className="mt-1 size-4 shrink-0 text-maroon" />
        {view === "clusters"
          ? t(
              "برامج منشورة بعد اعتماد لجنة الإعلانات ومدير المكتب. لا تظهر للعامة أرقام الغرف، ولا أسماء الحجاج الآخرين، ولا خطط النقل التفصيلية.",
              "Programmes published after approval by the Announcements Committee and the office director. Room numbers, other pilgrims' names and detailed transport plans are never shown to the public.",
            )
          : t(
              "كل مجموعات التكتلات المعتمدة. للتواصل مع المجموعة اتصل برئيسها، والالتحاق بها لا يكون من المنصة: تتفق معها وتوقّع عقدك في المكتب.",
              "Every group of the approved clusters. To reach a group, call its head. You do not join it through the platform: you agree with it and sign your contract at the office.",
            )}
      </p>

      {view === "clusters" ? (
        <>
          <motion.div layout className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {clusters.map((c, i) => (
                <ClusterCard key={c.slug} c={c} i={i} />
              ))}
            </AnimatePresence>
          </motion.div>
          {clusters.length === 0 && <p className="py-16 text-center text-ink-soft">{t("لا توجد تكتلات مطابقة.", "No matching clusters.")}</p>}
        </>
      ) : (
        <>
          <motion.ul layout className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {groups.map(({ cluster: c, group: g }, i) => (
                <GroupCard key={`${c.slug}-${g.no}`} cluster={c} group={g} i={i} />
              ))}
            </AnimatePresence>
          </motion.ul>
          {groups.length === 0 && <p className="py-16 text-center text-ink-soft">{t("لا توجد مجموعات مطابقة.", "No matching groups.")}</p>}
        </>
      )}
    </div>
  );
}

function LevelBadge({ level, className }: { level: ServiceLevel; className?: string }) {
  const t = useT();
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-bold shadow", LEVEL_STYLE[level], className)}>
      {level === "خمس نجوم" && <Sparkles className="me-1 inline size-3" />}
      {t(level, LEVEL_EN[level] ?? level)}
    </span>
  );
}

/** A cluster: its programme at a glance, and the groups under it with their heads and the seats left */
export function ClusterCard({ c, i }: { c: Cluster; i: number }) {
  const t = useT();
  const [all, setAll] = useState(false);
  const shown = all ? c.groups : c.groups.slice(0, FIRST_GROUPS);
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.45, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-gold/40 bg-white shadow-[0_20px_50px_-35px_rgba(0,89,79,.6)] transition-shadow hover:shadow-[0_30px_60px_-30px_rgba(0,89,79,.55)]"
    >
      <div className="relative h-40 overflow-hidden">
        <CmsImage
          src={coverOf(c)}
          alt=""
          fill
          sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
          quality={70}
          className="object-cover transition duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
        <LevelBadge level={c.level} className="absolute start-3 top-3" />
        <span className="absolute end-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-bold text-green shadow">
          <BadgeCheck className="size-3.5" /> {t("معتمد", "Approved")}
        </span>
        <div className="absolute inset-x-4 bottom-3 text-white">
          <h3 className="font-display text-xl font-bold leading-tight">{c.name}</h3>
          <p className="text-xs text-white/75">
            {t(`${c.governorate} · منذ ${c.since}هـ`, `${c.governorate} · since ${c.since} AH`)}
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between">
          {c.reviews ? <Rating value={c.rating} /> : <span className="text-sm font-bold text-gold-dark">{t("تكتل جديد", "New cluster")}</span>}
          <span className="text-xs text-ink-soft">{c.reviews ? t(`${formatNumber(c.reviews)} تقييماً`, `${formatNumber(c.reviews)} reviews`) : t("لا تقييمات بعد", "No reviews yet")}</span>
        </div>
        <p className="mt-3 text-sm leading-7 text-ink-soft">{c.specialty}</p>
        {c.team && (
          <p className="mt-2 flex items-start gap-2 text-sm">
            <Crown className="mt-0.5 size-4 shrink-0 text-gold-dark" />
            <span>
              <span className="text-ink-soft">{t("رئيس التكتل: ", "Head: ")}</span>
              <bdi className="font-semibold text-ink">{c.team.head.name}</bdi>
              <span className="block text-xs text-ink-soft">{t(`فريق من ${c.team.size} إدارياً`, `A team of ${c.team.size} administrators`)}</span>
            </span>
          </p>
        )}
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <Hotel className="mt-0.5 size-4 shrink-0 text-gold-dark" />
            <span>
              <bdi className="font-semibold text-ink">{c.makkah.hotel}</bdi>
              <span className="text-ink-soft"> · {c.makkah.distance}</span>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-gold-dark" />
            <span>
              <bdi className="font-semibold text-ink">{c.madinah.hotel}</bdi>
              <span className="text-ink-soft"> · {c.madinah.distance}</span>
            </span>
          </li>
        </ul>
        <div className="mt-4 rounded-2xl bg-sand/60 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-green-dark">
            <UsersRound className="size-4 text-gold-dark" /> {t(`مجموعات التكتل (${formatNumber(c.groupsCount)})`, `The cluster's groups (${formatNumber(c.groupsCount)})`)}
          </p>
          <div className="space-y-2.5">
            {shown.map((g) => (
              <SeatBar key={g.no} group={g} />
            ))}
          </div>
          {c.groups.length > FIRST_GROUPS && (
            <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all} className="mt-2 flex items-center gap-1 text-xs font-bold text-green-dark hover:underline">
              {all ? t("عرض أقل", "Show fewer") : t(`كل المجموعات (${c.groups.length})`, `All groups (${c.groups.length})`)}
              <ChevronDown className={cn("size-3.5 transition", all && "rotate-180")} />
            </button>
          )}
        </div>
        <Link
          href={`/clusters/${c.slug}`}
          className="mt-5 flex h-11 items-center justify-center gap-2 rounded-2xl border-2 border-green-dark/15 font-bold text-green-dark transition group-hover:border-green-dark group-hover:bg-green-dark group-hover:text-white"
        >
          {t("صفحة التكتل وأرقام التواصل", "The cluster's page and contacts")} <ArrowLeft className="size-4" />
        </Link>
      </div>
    </motion.article>
  );
}

/** A group of an approved cluster: its category and level, its cluster, its head and how to reach him, the seats left; pressed, the whole group */
export function GroupCard({ cluster: c, group: g, i }: { cluster: Cluster; group: TeamGroup; i: number }) {
  const t = useT();
  const en = useLang() === "en";
  const [open, setOpen] = useState(false);
  const page = useGroupProfile(g.no);
  const remaining = Math.max(0, g.capacity - g.pilgrims);
  const full = remaining === 0;
  return (
    <>
      <motion.li
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, delay: Math.min(i, 12) * 0.03, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => setOpen(true)}
        className="group/tile flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-gold/40 bg-white p-5 shadow-[0_20px_50px_-40px_rgba(0,89,79,.6)] transition hover:-translate-y-0.5 hover:border-green-dark/40"
      >
        {page?.cover && (
          <div className="relative -mx-5 -mt-5 mb-4 h-36 overflow-hidden">
            <CmsImage src={page.cover} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" quality={65} className="object-cover transition duration-700 group-hover/tile:scale-105" />
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-xl font-bold text-green-dark">{groupName(g.no)}</p>
            <p className="text-xs font-semibold text-gold-dark">{g.category}</p>
          </div>
          <LevelBadge level={c.level} className="shrink-0 shadow-none ring-1 ring-gold/40" />
        </div>
        <Link href={`/clusters/${c.slug}`} onClick={(e) => e.stopPropagation()} className="mt-3 flex items-center gap-2 text-sm text-ink-soft hover:text-green-dark">
          <Landmark className="size-4 shrink-0 text-gold-dark" />
          <span className="min-w-0 truncate">
            {t("التكتل: ", "Cluster: ")}
            <bdi className="font-semibold text-ink">{c.name}</bdi>
          </span>
        </Link>
        <div className="mt-3 flex items-start gap-3 rounded-2xl bg-sand/60 p-3">
          <Avatar m={g.head} badge={<Crown />} />
          <div className="min-w-0">
            <p className="text-xs text-hint">{g.own ? t("رئيس المجموعة ورئيس التكتل", "Head of the group and of the cluster") : t("رئيس المجموعة", "Head of the group")}</p>
            <p className="font-bold text-ink">
              <bdi>{g.head.name}</bdi>
            </p>
            <PhoneLink phone={g.head.phone} className="mt-2" />
          </div>
        </div>
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-soft">{t(`${g.pilgrims} من ${g.capacity} مقعداً`, `${g.pilgrims} of ${g.capacity} places`)}</span>
            <span className={cn("font-bold", full ? "text-maroon" : remaining <= 6 ? "text-amber-700" : "text-green")}>{full ? t("مكتملة", "Full") : seatsLeft(remaining, en)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand">
            <motion.div
              className={cn("h-full rounded-full", full ? "bg-maroon" : remaining <= 6 ? "bg-gradient-to-l from-amber-500 to-gold-dark ltr:bg-gradient-to-r" : "bg-gradient-to-l from-green-light to-green-dark ltr:bg-gradient-to-r")}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (g.pilgrims / Math.max(1, g.capacity)) * 100)}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-green-dark group-hover/tile:underline">
            <UsersRound className="size-4" /> {t("فريق المجموعة كاملاً", "The group's whole team")}
          </button>
        </div>
      </motion.li>
      {c.team && <GroupDialog group={g} team={c.team} clusterName={c.name} level={c.level} open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

function Rating({ value }: { value: number }) {
  const t = useT();
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
      <span className="sr-only">{t("من 5", "out of 5")}</span>
    </span>
  );
}

function seatsLeft(n: number, en: boolean) {
  if (en) return n === 1 ? "1 place left" : `${n} places left`;
  if (n === 1) return "بقي مقعد واحد";
  if (n === 2) return "بقي مقعدان";
  return `بقي ${n} ${n <= 10 ? "مقاعد" : "مقعداً"}`;
}

function SeatBar({ group }: { group: Cluster["groups"][number] }) {
  const t = useT();
  const en = useLang() === "en";
  const taken = group.capacity - group.remaining;
  const full = group.remaining === 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="min-w-0 truncate">
          <span className="font-semibold text-ink">{groupName(group.no)}</span>
          <span className="text-ink-soft"> · <bdi>{group.leader}</bdi></span>
        </span>
        <span className={cn("font-bold", full ? "text-maroon" : group.remaining <= 6 ? "text-amber-700" : "text-green")}>
          {full ? t("مكتملة", "Full") : seatsLeft(group.remaining, en)}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
        <motion.div
          className={cn(
            "h-full rounded-full",
            full ? "bg-maroon" : group.remaining <= 6 ? "bg-gradient-to-l from-amber-500 to-gold-dark ltr:bg-gradient-to-r" : "bg-gradient-to-l from-green-light to-green-dark ltr:bg-gradient-to-r",
          )}
          initial={{ width: 0 }}
          whileInView={{ width: `${(taken / group.capacity) * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
