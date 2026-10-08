"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/portal/shell";
import { ButtonLink } from "@/components/ui/button";
import { StarRating, useToast } from "@/components/ui/widgets";
import { groupName, suggestedGroupName } from "@/lib/groups";
import { useSeason } from "@/lib/season-live";
import { actions, useStore } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { adminReceipt, logAdmin, resultOf, useAdmin } from "../../_lib/admin";
import { useExamRules } from "../../_lib/admin-rules";
import { groupCount } from "../../_lib/group";
import { isClusterRole, isTechCoordinator } from "../../_lib/admin";
import { nextGroupNumber } from "../../_lib/capacity";
import { teamOf } from "../../_lib/cluster";
import { useClusterRequests } from "../../_lib/formation";
import { DEFAULT_TIER, categoryOf, categoryOfId, seatsLabel, seatsOf, useCadre, useStructure } from "../../_lib/structure";
import { StandingCard } from "../../_components/standing";
import { CoordinatorGroups } from "./coordinator-groups";
import { AdminShell, LockedCard, MovedTo, SimButton } from "../../_components/ui";
import { OperationClosed } from "@/components/app/operation-closed";
import { rangeLabel, useOperation } from "@/lib/operations";

/** Who sits in this group's seats, as its cluster's head invited them, and its coordinator: nobody before it is in a cluster */
function useGroupTeam(number: number) {
  const requests = useClusterRequests();
  return useMemo(() => {
    const req = requests.find((r) => r.groups.some((g) => g.number === number));
    if (!req) return { cluster: undefined, team: [] as { role: string; name: string }[] };
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
  }, [requests, number]);
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
  const r = resultOf(p, useExamRules());
  const op = useOperation("group-formation");
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
          <LockedCard title="لا مجموعة لك بعد" text="تُدار المجموعة هنا بعد أن يشكّلها موظف إدارة الإداريين في المكتب، في مدة تشكيل المجموعات." href="/administrator/group" cta="تشكيل المجموعات" />
        </AdminShell>
      );
    }
    return (
      <AdminShell image="/images/clock-tower.jpg" title={`مجموعتي — ${groupName(g.number)}`} subtitle="ترى مجموعتك وحجاجها كما يلحقهم المكتب بعقودهم، وتنشر الإعلانات، وتفتح التجمّعات. مقاعد فريقها يملؤها رئيس تكتلها بفئتها.">
        <MyGroup />
      </AdminShell>
    );
  }

  if (cluster || tech || (p?.positions.length && p.positions[0] !== "group-head")) {
    return (
      <AdminShell image="/images/clock-tower.jpg" title="تشكيل المجموعات" subtitle="يشكّل المكتب مجموعة كل رئيس مجموعة، في مدة تشكيل المجموعات.">
        <LockedCard title="تشكيل المجموعات لرؤساء المجموعات" text="صفتك هذا الموسم لا تشكّل مجموعة. ما تعمل فيه من مجموعات تجده في «إدارة المجموعات»." href="/administrator/groups" cta="إدارة المجموعات" />
      </AdminShell>
    );
  }

  const view = !r.published || !r.passed ? "locked" : g?.approvedAt ? "approved" : "office";

  return (
    <AdminShell image="/images/clock-tower.jpg" title="تشكيل المجموعات" subtitle={`يشكّل موظف إدارة الإداريين في المكتب مجموعة كل ناجح في التأهيل ${rangeLabel(op.start, op.end)}: باسمها الذي يختاره رئيسها، ورسمها، وفئة رئيسها. لا يُختار تكتل الآن: تشكيل التكتلات عملية مستقلة.`}>
      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
          {view === "locked" && (
            <LockedCard title="تشكيل المجموعات للناجحين في التأهيل" text="بعد نشر نتيجتك النهائية واجتياز حد النجاح (70) — أو تجديد صفتك معفى — يشكّل المكتب مجموعتك." href="/administrator/exam" cta="نتيجتي في التأهيل" />
          )}
          {view === "office" && <AtTheOffice />}
          {view === "approved" && (
            <LockedCard title={`شُكّلت ${groupName(g!.number)}`} text={`شكّلها ${g!.approvedBy ?? "موظف المكتب"} بفئتك (${g!.capacityTier ?? "الفئة الأولى"}): ${g!.capacity} حاجاً في المستوى الاقتصادي، ويتغيّر عددها ومقاعد فريقها بمستوى التكتل الذي تدخله. تراها وترى حجاجها في «إدارة المجموعة».`} href="/administrator/groups" cta="إدارة المجموعة" />
          )}
        </motion.div>
      </AnimatePresence>
    </AdminShell>
  );
}

// ───────────────────────── At the office ─────────────────────────

/**
 * The group is formed at the office, not on the platform: the head comes in its dates with the name he chose,
 * pays its fee there, and the staff member of «إدارة الإداريين» forms it with his category. Until then this
 * says how; the demo has the office do it at once.
 */
function AtTheOffice() {
  const admin = useAdmin()!;
  const toast = useToast();
  const season = useSeason();
  const s = useStructure();
  const cadre = useCadre();
  const admins = useStore((x) => x.admins);
  const op = useOperation("group-formation");
  const g = admin.profile!.group;

  /** Demo: the head went to the office, and its staff formed his group with the name the list holds for its number */
  const formAtOffice = () => {
    const at = Date.now();
    const number = g?.number ?? nextGroupNumber(admins, admin.id);
    const cat = categoryOf(admin.id, cadre) ?? s.categories[0]?.id;
    if (!cat) return;
    if (!categoryOf(admin.id, cadre)) actions.setCadre("category", admin.id, cat);
    const name = categoryOfId(s, cat)?.name ?? "";
    const n = seatsOf(s, DEFAULT_TIER, cat);
    const by = "مازن الحلبي (محاكاة)";
    actions.upsertAdmin(admin.id, { group: { number, name: g?.name ?? suggestedGroupName(number), capacity: n.pilgrims, capacityTier: name, requestedAt: at, feePaidAt: at, approvedAt: at, approvedBy: by } });
    actions.logEvent({ actor: by, role: "موظف", action: "تشكيل مجموعة في المكتب", target: groupName(number), after: `رئيسها ${admin.name}`, detail: `${name}: ${n.pilgrims} حاجاً في الاقتصادي — ${seatsLabel(n)} — رسم ${season.fees.groupFormation} $ في المكتب`, system: "admins", area: "groups", ref: String(number) });
    logAdmin(admin.id, `تشكيل ${groupName(number)} في المكتب`, undefined, `شكّلها ${by} — ${name}: ${n.pilgrims} حاجاً في الاقتصادي`);
    toast({ title: `شُكّلت ${groupName(number)}`, body: `${name}: ${n.pilgrims} حاجاً في المستوى الاقتصادي.`, icon: "🏛️", tone: "success" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="md:p-8">
        <p className="font-display text-2xl font-bold text-green-dark">تُشكَّل مجموعتك في المكتب</p>
        <p className="mt-2 leading-8 text-ink-soft">لا طلب على المنصة: يشكّلها موظف إدارة الإداريين في المكتب، فتظهر لك هنا وفي «إدارة المجموعة» مع حجاجها حين يُلحقون بها.</p>
        <ol className="mt-5 space-y-2">
          {[
            `راجع المكتب في مدة تشكيل المجموعات: ${rangeLabel(op.start, op.end)}.`,
            "أخبر الموظف باسم مجموعتك: كلمة أو كلمتان، لا تحملهما مجموعة أخرى هذا الموسم.",
            `سدّد رسم التشكيل ${formatUSD(season.fees.groupFormation)} في المكتب، وتأخذ إيصاله.`,
            "يشكّلها الموظف بفئتك، فيُعرف عدد حجاجها ومقاعد فريقها في مستوى التكتل الذي تدخله.",
          ].map((t, i) => (
            <li key={t} className="flex gap-3 rounded-2xl bg-sand/70 p-3 text-sm leading-7">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-green-dark text-xs font-bold text-white">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        {g && !g.approvedAt && <p className="mt-4 rounded-2xl bg-gold/20 p-3 text-sm font-semibold text-maroon">طلبك القديم ({groupName(g.number)}) عند المكتب: يكمل الموظف تشكيلها.</p>}
        <div className="mt-5">
          {op.open ? (
            <SimButton onClick={formAtOffice}>محاكاة: راجعتُ المكتب فشكّل الموظف مجموعتي</SimButton>
          ) : (
            <OperationClosed state={op} text="تُشكَّل المجموعات في المكتب في مدتها وحدها." />
          )}
        </div>
      </Card>
      <CategoryCard />
    </div>
  );
}

/** His category as the administration set it, and what it gives his group in each tier of cluster */
function CategoryCard() {
  const admin = useAdmin()!;
  const s = useStructure();
  const cadre = useCadre();
  const cat = categoryOf(admin.id, cadre);
  return (
    <div className="rounded-2xl bg-sand p-4">
      <p className="text-sm font-bold text-ink-soft">فئة المجموعة</p>
      <p className="mt-2 font-bold leading-7 text-green-dark">{cat ? `${categoryOfId(s, cat)?.name} — فئتك كما حددتها الإدارة` : "تحددها إدارة الإداريين عند اعتماد طلبك"}</p>
      {cat ? (
        <ul className="mt-2 space-y-1 text-xs">
          {s.tiers.map((t) => {
            const n = seatsOf(s, t.id, cat);
            return (
              <li key={t.id} className="flex justify-between gap-2 rounded-lg bg-white/70 px-2 py-1">
                <span className="font-bold">{t.name}</span>
                <span className="text-ink-soft">
                  {n.pilgrims} حاجاً — {seatsLabel(n)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-1 text-xs leading-5 text-hint">فئة المجموعة فئة رئيسها، لا تُختار: منها عدد حجاجها ومقاعد فريقها في مستوى التكتل الذي تدخله.</p>
      )}
    </div>
  );
}

// ───────────────────────── Contracts ─────────────────────────

// ───────────────────────── My group ─────────────────────────

const TASKS = [
  { key: "program", t: "دخول تكتل: بدعوة تقبلها، أو بطلب تشكيل تكتل", href: "/administrator/cluster" },
  { key: "training", t: "إكمال التدريب الإلزامي (6 وحدات)" },
  { key: "requests", t: "استلام الحجاج المفوَّجين", href: "/administrator/requests" },
  { key: "needs", t: "مراجعة الاحتياجات الخاصة" },
  { key: "lessons", t: "خطة الدروس قبل السفر (4 دروس)" },
  { key: "intro", t: "تحضير اللقاء التعريفي (10 ذو القعدة)" },
];

function MyGroup() {
  const admin = useAdmin()!;
  const toast = useToast();
  const season = useSeason();
  const applications = useStore((s) => s.applications);
  const post = useStore((s) => s.post);
  const g = admin.profile!.group!;
  const { cluster, team } = useGroupTeam(g.number);
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
                <Check className="mr-auto size-5 shrink-0 text-green-light" aria-label="قبِل" />
              </motion.li>
            ))}
          </ul>
          <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
            {[
              `رسم التشكيل ${formatUSD(season.fees.groupFormation)} ✓`,
              cluster ? `في ${cluster.cluster.name} ✓` : "التكتل — بدعوة أو بطلب",
              team.length ? `فريقها: ${team.length} دعاهم رئيس التكتل` : "مقاعد فريقها — يملؤها رئيس التكتل",
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
          <p className="mt-4 text-xs text-hint">يُفتح إلحاق الحجاج بالمجموعات في 12 تشرين الثاني (موعد تقديري): تلحق بمجموعتك من يتفق معها من الحجاج المقبولين، بعقد ترفعه.</p>
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
