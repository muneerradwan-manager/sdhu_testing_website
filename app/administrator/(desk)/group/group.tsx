"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Check, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/portal/shell";
import { ButtonLink } from "@/components/ui/button";
import { StarRating, useToast } from "@/components/ui/widgets";
import { groupName } from "@/lib/groups";
import { useSeason } from "@/lib/season-live";
import { useStore, type AdminProfile } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { adminReceipt, logAdmin, useAdmin } from "../../_lib/admin";
import { groupCount } from "../../_lib/group";
import { isClusterRole, isTechCoordinator } from "../../_lib/admin";
import { teamOf } from "../../_lib/cluster";
import { useClusterRequests } from "../../_lib/formation";
import { categoryOf, categoryOfId, seatsOf, useCadre, useStructure } from "../../_lib/structure";
import { StandingCard } from "../../_components/standing";
import { CoordinatorGroups } from "./coordinator-groups";
import { OfficeFormationSim } from "./office-sim";
import { AdminShell, LockedCard, MovedTo } from "../../_components/ui";

/**
 * Who sits in this group's seats and its coordinator: as its cluster holds them once it is in one, else as the
 * office seated them when it formed the group (its guide, its assistant, a «معاون بعدد»)
 */
function useGroupTeam(number: number, own?: AdminProfile["group"]) {
  const requests = useClusterRequests();
  return useMemo(() => {
    const req = requests.find((r) => r.groups.some((g) => g.number === number));
    if (!req) {
      const seated = (own?.seats ?? []).flatMap((x) => (x.who ? [{ role: x.kind === "guide" ? "موجّه المجموعة" : "معاون المجموعة", name: x.who.name }] : []));
      return { cluster: undefined, team: [...seated, ...(own?.countAssistant ? [{ role: "معاون بعدد", name: own.countAssistant.name }] : [])] };
    }
    const t = teamOf(req.cluster, number);
    return {
      cluster: req,
      team: [
        ...t.guides.map((x) => ({ role: "موجّه المجموعة", name: x.name })),
        ...t.assistants.map((x) => ({ role: "معاون المجموعة", name: x.name })),
        ...(t.coordinator ? [{ role: "المنسق التقني (للتكتل)", name: t.coordinator.name }] : []),
        ...(t.femaleGuide ? [{ role: "الموجّهة الدينية (للتكتل)", name: t.femaleGuide.name }] : []),
      ],
    };
  }, [requests, number, own]);
}


/**
 * Two operations of their own, two entries in the sidebar: «تشكيل المجموعات» is the head's request, its fee
 * and the administration's decision, open only in its dates — the head forms his group alone, without a
 * team; «إدارة المجموعة» is the approved group and its pilgrims, with the team its cluster's head assigned
 * to it — and the cluster's groups for the cluster roles, the groups assigned to a guide, an assistant or a
 * coordinator.
 */
export function AdminGroup({ part }: { part: "formation" | "manage" }) {
  const admin = useAdmin()!;
  const p = admin.profile;
  const g = p?.group;
  const cluster = isClusterRole(p);
  const tech = isTechCoordinator(p);

  if (part === "manage") {
    // A cluster role opens the cluster's groups in «إدارة التكتل»; the coordinator works in the groups sorted to him
    if (cluster) return <MovedTo href="/administrator/clusters" title="إدارة التكتل" />;
    if (tech || p?.servesIn || (p?.positions.length && p.positions[0] !== "group-head")) return <CoordinatorGroups />;
    if (!g?.approvedAt) {
      return (
        <AdminShell image="/images/clock-tower.jpg" title="إدارة المجموعة" subtitle="المجموعة المعتمدة: حجاجها والفريق في مقاعدها كما يملؤها رئيس تكتلها.">
          <LockedCard title="لا مجموعة لك بعد" text="تُدار المجموعة هنا بعد أن يشكّلها الموظف في المكتب بحضورك وحضور فريقها، في مدة تشكيل المجموعات." href="/administrator/dashboard" cta="ملفي" />
        </AdminShell>
      );
    }
    return (
      <AdminShell image="/images/clock-tower.jpg" title={`مجموعتي — ${groupName(g.number)}`} subtitle="ترى مجموعتك وحجاجها كما يلحقهم المكتب بعقودهم، وتنشر الإعلانات، وتفتح التجمّعات. مقاعد فريقها يملؤها رئيس تكتلها بفئتها.">
        <MyGroup />
      </AdminShell>
    );
  }

  // The office forms the group with its head and team there: this page says so, and the demo simulates the visit
  if (part === "formation") {
    return (
      <AdminShell image="/images/clock-tower.jpg" title="تشكيل المجموعات" subtitle="تُشكَّل المجموعة في المكتب بحضور رئيسها وفريقها.">
        <LockedCard title="تُشكَّل المجموعة في المكتب" text={g?.approvedAt ? `شُكّلت ${groupName(g.number)} في المكتب، ووقّعتم عقدها: تراه في «العقود».` : "لا تُشكَّل المجموعة على المنصة: يحضر رئيسها وفريقها إلى المكتب، فيشكّلها الموظف باسمها وفئتها ويُجلس موجّهها ومعاونها، ويُدفع رسمها 200 $، ويوقّعون عقدها."} href={g?.approvedAt ? "/administrator/my-contracts" : "/administrator/dashboard"} cta={g?.approvedAt ? "العقود" : "ملفي"} />
        <OfficeFormationSim />
      </AdminShell>
    );
  }
}

// ───────────────────────── Contracts ─────────────────────────

// ───────────────────────── My group ─────────────────────────

const TASKS = [
  { key: "program", t: "دخول تكتل: حين يُشكَّل في المكتب بحضورك", href: "/administrator/cluster" },
  { key: "training", t: "إكمال التدريب الإلزامي (6 وحدات)" },
  { key: "requests", t: "استلام الحجاج المفوَّجين", href: "/administrator/requests" },
  { key: "needs", t: "مراجعة الاحتياجات الخاصة" },
  { key: "lessons", t: "خطة الدروس قبل السفر (4 دروس) مع موجّه المجموعة", href: "/administrator/lessons" },
  { key: "intro", t: "تحضير اللقاء التعريفي (10 ذو القعدة)" },
];

function MyGroup() {
  const admin = useAdmin()!;
  const toast = useToast();
  const season = useSeason();
  const applications = useStore((s) => s.applications);
  const post = useStore((s) => s.post);
  const g = admin.profile!.group!;
  const { cluster, team } = useGroupTeam(g.number, g);
  const members = groupCount(g.number, post, applications, cluster?.cluster.groups[g.number]);
  const s = useStructure();
  const cadre = useCadre();
  const category = categoryOf(admin.id, cadre);
  const capacity = category ? seatsOf(s, cluster?.cluster.tier, category).pilgrims : g.capacity || 1;
  // The cluster task is done by the platform itself once the group is in a cluster
  const [ticked, setDone] = useState<string[]>([]);
  const done = g.clusterId && !ticked.includes("program") ? ["program", ...ticked] : ticked;
  const [stars, setStars] = useState(0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-dark via-green to-green-dark p-7 text-white shadow-2xl md:p-9">
          <div className="bg-pattern absolute inset-0 opacity-15" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm text-gold">الموسم 1448 — {cluster ? `${cluster.cluster.name}${cluster.status === "approved" ? "" : " (طلب لم يُعتمد بعد)"}` : "لم تدخل تكتلاً بعد"}</p>
              <p className="mt-2 font-display text-4xl font-bold md:text-5xl">{groupName(g.number)}</p>
              <p className="mt-2 text-white/80">رئيس المجموعة: <b className="text-gold">أنت</b> — {categoryOfId(s, category)?.name ?? "فئتك تحددها الإدارة"}</p>
            </div>
            <div className="text-center">
              <div className="relative size-28">
                <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="8" />
                  <motion.circle cx="50" cy="50" r="44" fill="none" stroke="#D9C89E" strokeWidth="8" strokeLinecap="round" strokeDasharray="276" initial={{ strokeDashoffset: 276 }} animate={{ strokeDashoffset: 276 - (276 * Math.min(members, capacity)) / capacity }} transition={{ duration: 1.4 }} />
                </svg>
                <span className="absolute inset-0 grid place-items-center font-display text-2xl font-bold">{members}/{capacity}</span>
              </div>
              <p className="mt-1 text-xs text-white/70">الأعضاء الفعّالون</p>
            </div>
          </div>
          <div className="relative mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/administrator/requests" variant="gold">حجاج المجموعة <ArrowLeft className="size-4" /></ButtonLink>
            <ButtonLink href="/administrator/field" variant="glass">وضع الميدان</ButtonLink>
          </div>
        </motion.div>

        <StandingCard scope="group" name={g.number} />

        <Card className="md:p-8">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><UsersRound className="size-5 text-gold-dark" /> فريق المجموعة</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[{ role: "رئيس المجموعة", name: admin.name }, ...team].map((t, i) => (
              <motion.li key={t.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="flex items-center gap-3 rounded-2xl bg-sand p-3">
                <span className={cn("grid size-11 place-items-center rounded-xl font-display font-bold", i === 0 ? "bg-maroon text-gold" : "bg-white text-green-dark")}>{t.name.replace("الشيخ ", "")[0]}</span>
                <div className="min-w-0">
                  <p className="truncate font-bold">{i === 0 ? admin.name : t.name}</p>
                  <p className="text-xs text-ink-soft">{t.role}</p>
                </div>
                <Check className="mr-auto size-5 shrink-0 text-green-light" aria-label="في مقعده" />
              </motion.li>
            ))}
          </ul>
          <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
            {[
              `رسم التشكيل ${formatUSD(season.fees.groupFormation)} ✓`,
              cluster ? `في ${cluster.cluster.name} ✓` : "التكتل — حين يُشكَّل في المكتب",
              team.length ? `فريقها: ${team.length} أجلسهم المكتب` : "مقاعد فريقها — يُجلسها المكتب",
            ].map((x) => (
              <li key={x} className="rounded-xl border border-green-light/30 bg-green-light/5 px-3 py-2 font-semibold text-green">{x}</li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-xs text-hint" dir="ltr">{adminReceipt(admin.id, "G", g.number)}</p>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="md:p-7">
          <h3 className="font-display text-lg font-bold text-green-dark">مهامك قبل الموسم</h3>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand">
            <motion.div className="h-full bg-green-light" animate={{ width: `${(done.length / TASKS.length) * 100}%` }} />
          </div>
          <ul className="mt-4 space-y-2">
            {TASKS.map((t) => {
              const on = done.includes(t.key);
              return (
                <li key={t.key} className="flex items-center gap-3 rounded-2xl border border-gold/30 p-3">
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={t.t}
                    onClick={() => {
                      setDone(on ? done.filter((x) => x !== t.key) : [...done, t.key]);
                      if (!on) {
                        logAdmin(admin.id, `إنجاز مهمة: ${t.t}`, groupName(g.number));
                        toast({ title: "أحسنت", body: t.t, icon: "✅", tone: "success" });
                      }
                    }}
                    className={cn("grid size-7 shrink-0 place-items-center rounded-lg border-2 transition", on ? "border-green-light bg-green-light text-white" : "border-gold-dark")}
                  >
                    {on && <Check className="size-4" />}
                  </button>
                  <span className={cn("flex-1 text-sm font-semibold", on && "text-hint line-through")}>{t.t}</span>
                  {t.href && <Link href={t.href} className="text-xs font-bold text-green-dark underline">فتح</Link>}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-hint">يُفتح إلحاق الحجاج بالمجموعات في 12 تشرين الثاني (موعد تقديري): يلحق المكتب بمجموعتك من يتفق معها من الحجاج المقبولين حين يوقّعون عقودهم معها.</p>
        </Card>
        <Card className="text-center md:p-7">
          <p className="font-bold">هل كانت خطوات التشكيل والرسوم والعقود واضحة؟</p>
          <div className="mt-3 flex justify-center">
            <StarRating
              value={stars}
              onChange={(v) => {
                setStars(v);
                logAdmin(admin.id, "تقييم مرحلة تشكيل المجموعة", "تجربة الإداري", `${v} من 5`);
                toast({ title: "شكراً لتقييمك", icon: "⭐", tone: "gold" });
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
