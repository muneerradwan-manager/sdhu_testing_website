"use client";

import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { BadgeCheck, CircleDashed } from "lucide-react";
import { Emblem } from "@/components/brand/logo";
import { POSITIONS, positionOf } from "@/app/administrator/_lib/admin";
import { POOLS } from "@/app/administrator/_lib/formation";
import { groupsLabel } from "@/app/administrator/_lib/coordinators";
import { groupsOfCluster } from "@/lib/flights";
import { groupName } from "@/lib/groups";
import { cn, maskNationalId } from "@/lib/utils";
import { useAdminStanding } from "./dashboard";

/**
 * The administrator's card for the season in «ملفي», and the one place there that says who he is and where he stands:
 * his name and national number, his post in one line, three checks (his qualification, his contract, the pilgrims he
 * answers for) and a QR code with his season and number. The season card beside it says only what comes next, and
 * the details card under them only what the civil registry and his account hold. It shows from the moment he takes
 * the administrators' way: what is not done yet reads as pending, not as missing
 */
export function AdminIdCard({ season: now }: { season: number }) {
  const { admin, profile, coord, result, clusterName, clusterGroups } = useAdminStanding();
  const season = profile?.season ?? now;
  const role = POSITIONS.find((p) => p.key === positionOf(profile))?.label;

  // His post, as short as the card holds it
  const post = coord
    ? `${POOLS[coord.role].title} في ${coord.clusterName}${profile?.accountantOf ? " — ومحاسب التكتل" : ""}`
    : profile?.cluster
      ? `رئيس ${profile.cluster.name}`
      : profile?.group?.approvedAt
        ? `رئيس ${groupName(profile.group.number)} — ${clusterName ?? "دون تكتل بعد"}`
        : profile?.positions.length
          ? `متقدم لصفة ${role}`
          : "لم يختر صفته بعد";

  const qualified = result.passed || result.exempt;
  const qualification = result.exempt
    ? "مجدَّد في صفته — دون اختبار"
    : result.passed
      ? `التأهيل${result.score !== undefined ? ` ${result.score}%` : ""} — ناجح في المؤتمت والشفهي`
      : result.written && result.published
        ? `ناجح في المؤتمت — ${result.oral ? "شفهيّه محجوز" : "بقي الشفهي"}`
        : profile?.feePaidAt
          ? "متقدم — قيد التأهيل"
          : profile?.eligibleAt
            ? "مؤهل — بانتظار رسم التسجيل"
            : "لم يتقدم بعد";

  // As «العقود» reads them: an approved group or cluster was signed at the office, and so was everyone seated in it
  const signed = !!(profile?.group?.contract || profile?.group?.approvedAt || profile?.cluster?.contract || profile?.cluster?.status === "approved" || coord || profile?.servesIn);

  // The pilgrims he answers for: his cluster's, his group's, or the groups he serves
  const own = profile?.group?.clusterId ? groupsOfCluster(profile.group.clusterId).find((g) => g.number === profile.group?.number) : undefined;
  const pilgrims = profile?.cluster
    ? { done: clusterGroups.length > 0, text: `${clusterGroups.length} مجموعات — ${clusterGroups.reduce((n, g) => n + g.pilgrims, 0)} حاجاً` }
    : coord
      ? { done: true, text: coord.role === "guide-f" || coord.role === "cluster-assistant" || !coord.groups.length ? "التكتل كله في عهدته" : groupsLabel(coord.groups.map((g) => g.number)) }
      : profile?.group?.approvedAt
        ? { done: true, text: own ? `${own.pilgrims} من ${own.capacity} حاجاً` : `سعتها ${profile.group.capacity} حاجاً` }
        : { done: false, text: "لا حجاج بعد" };

  const checks = [
    { done: qualified, text: qualification },
    { done: signed, text: signed ? "العقود موقّعة" : "العقود لم توقّع بعد" },
    pilgrims,
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      data-card="admin-id"
      className="relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-gold/40 bg-gradient-to-br from-green-dark via-green to-maroon p-7 text-white shadow-2xl md:p-8"
    >
      <div className="bg-pattern absolute inset-0 opacity-20" />
      <div aria-hidden className="absolute -bottom-20 -right-16 size-56 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs text-gold">
            <Emblem className="size-5" gradientId="id-card-gold" /> بطاقة إداري — موسم {season}
          </p>
          <p className="mt-2 font-display text-2xl font-bold leading-snug">{admin.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-white/60">
            <span className="font-mono" dir="ltr">{maskNationalId(admin.id)}</span>
            <span className="flex items-center gap-1 text-gold/90"><BadgeCheck className="size-3.5" /> مؤكدة من الشؤون المدنية</span>
          </p>
          <p className="mt-2 text-sm font-semibold text-white/85">{post}</p>
        </div>
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gold font-display text-2xl font-bold text-ink">
          {admin.person.firstName.charAt(0)}
        </span>
      </div>
      <div className="relative mt-6 flex items-end justify-between gap-4">
        <ul className="min-w-0 space-y-1.5 text-sm">
          {checks.map((c, i) => (
            <motion.li
              key={c.text}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.15 }}
              className={cn("flex items-center gap-1.5", !c.done && "text-white/60")}
            >
              {c.done ? <BadgeCheck className="size-4 shrink-0 text-gold" /> : <CircleDashed className="size-4 shrink-0 text-white/50" />} {c.text}
            </motion.li>
          ))}
        </ul>
        <div className={cn("shrink-0 rounded-xl bg-white p-1.5", !qualified && "opacity-60")}>
          <QRCodeSVG value={`https://hajj-demo.sy/verify/admin/${season}-${admin.id}`} size={64} fgColor="#00594F" />
        </div>
      </div>
    </motion.div>
  );
}
