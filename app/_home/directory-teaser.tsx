"use client";

import { ArrowLeft, Landmark, UsersRound } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { str } from "@/components/cms/bits";
import { ButtonLink } from "@/components/ui/button";
import { Reveal, SectionHeading } from "@/components/ui/motion";
import { ClusterCard, GroupCard } from "@/app/clusters/_components/clusters-directory";
import { useClusterDirectory } from "@/lib/cluster-profile";
import { useSection } from "@/lib/cms/store";
import { useT } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";

type View = "clusters" | "groups";

/**
 * A glance at «التكتلات والمجموعات» on the home page: a few clusters (the best rated, each with its groups inside)
 * and a few groups (those with the most seats left), in the same cards and tabs as the page, and «عرض الكل» to it.
 */
export function DirectoryTeaser() {
  const t = useT();
  const v = useSection("home", "directory");
  const [view, setView] = useState<View>("clusters");
  const all = useClusterDirectory();
  const nClusters = Math.max(1, Number(v.clustersCount) || 3);
  const nGroups = Math.max(1, Number(v.groupsCount) || 6);
  const clusters = [...all].sort((a, b) => b.rating - a.rating).slice(0, nClusters);
  const groups = all
    .flatMap((c) => (c.team?.groups ?? []).map((g) => ({ cluster: c, group: g, left: Math.max(0, g.capacity - g.pilgrims) })))
    .sort((a, b) => b.left - a.left || a.group.no - b.group.no)
    .slice(0, nGroups);
  const groupsCount = all.reduce((n, c) => n + (c.team?.groups.length ?? 0), 0);
  if (!all.length) return null;

  const TABS: { key: View; icon: typeof Landmark; label: string; count: number }[] = [
    { key: "clusters", icon: Landmark, label: t("التكتلات", "Clusters"), count: all.length },
    { key: "groups", icon: UsersRound, label: t("المجموعات", "Groups"), count: groupsCount },
  ];

  return (
    <section id="directory" className="relative scroll-mt-28 overflow-hidden bg-white py-24">
      <div className="bg-pattern-dark absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading eyebrow={str(v, "eyebrow")} title={str(v, "title")} description={str(v, "description")} />
        <Reveal>
          <div role="tablist" aria-label={str(v, "title")} className="mx-auto mb-8 grid w-full max-w-md grid-cols-2 gap-1.5 rounded-3xl border border-gold/40 bg-white p-1.5">
            {TABS.map((x) => (
              <button
                key={x.key}
                type="button"
                role="tab"
                aria-selected={view === x.key}
                onClick={() => setView(x.key)}
                className={cn("relative flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-bold transition", view === x.key ? "text-white" : "text-ink-soft hover:bg-sand")}
              >
                {view === x.key && <motion.span layoutId="home-directory-tab" className="absolute inset-0 rounded-2xl bg-green-dark" />}
                <x.icon className={cn("relative size-5", view === x.key ? "text-gold" : "text-gold-dark")} />
                <span className="relative">{x.label}</span>
                <span className={cn("relative rounded-full px-2 py-0.5 text-xs", view === x.key ? "bg-white/15" : "bg-sand")}>{formatNumber(x.count)}</span>
              </button>
            ))}
          </div>

          {view === "clusters" ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {clusters.map((c, i) => (
                <ClusterCard key={c.slug} c={c} i={i} />
              ))}
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map(({ cluster: c, group: g }, i) => (
                <GroupCard key={`${c.slug}-${g.no}`} cluster={c} group={g} i={i} />
              ))}
            </ul>
          )}

          <div className="mt-10 text-center">
            <ButtonLink href={str(v, "ctaHref", "/clusters")} size="lg">
              {str(v, "ctaLabel", t("عرض كل التكتلات والمجموعات", "See all clusters and groups"))} <ArrowLeft className="size-5" />
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
