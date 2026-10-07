"use client";

import { motion } from "motion/react";
import { ArrowLeft, Building2, Cpu, LayoutList, UserRoundPlus, Users } from "lucide-react";
import { Card } from "@/components/portal/shell";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/widgets";
import { groupName } from "@/lib/groups";
import { useStore } from "@/lib/store";
import { formatNumber } from "@/lib/utils";
import { useAdmin } from "../../_lib/admin";
import { clusterTotals, headRecordOf } from "../../_lib/cluster";
import { groupsLabel, useCoordinatorPost } from "../../_lib/coordinators";
import { POOLS } from "../../_lib/formation";
import { AdminShell, LockedCard } from "../../_components/ui";

/**
 * The screen of whoever a cluster's head invited to a place in it — a technical coordinator, the religious
 * guide or the assistant in a group's seat, a female guide or an assistant of the whole cluster. None of
 * them has a group of his own: the coordinator works in the groups the head sorted to him, a seat's holder in
 * its group, a female guide and a cluster assistant for the whole cluster.
 */
export function CoordinatorGroups() {
  const admin = useAdmin()!;
  const post = useCoordinatorPost(admin.id, admin.profile);
  const admins = useStore((s) => s.admins);
  const overrides = useStore((s) => s.formation.overrides);
  const role = post ? POOLS[post.role] : POOLS.tech;

  if (!post) {
    return (
      <AdminShell title="إدارة المجموعة" subtitle="المنسق والموجّه والمعاون والموجّهة يدعوهم رئيس تكتل إلى أماكنهم فيه.">
        <LockedCard title="لم تنضم إلى تكتل بعد" text="رئيس التكتل يدعو موجّه كل مجموعة ومعاونها إلى مقاعدها بحسب فئتها، ويختار منسقي التكتل وموجّهاته ومعاونه بمجموع فئات مجموعاته — بدعوات فردية في مدة تشكيل التكتلات. حين تقبل دعوة تظهر هنا مجموعاتك." href="/administrator/cluster" cta="دعواتي في «تشكيل التكتلات»" />
      </AdminShell>
    );
  }

  // His colleagues in the same place: the other coordinators, female guides or cluster assistants, or the others in his group's seats
  const rec = headRecordOf({ ...admin.profile!, cluster: undefined, deputyOf: undefined, accountantOf: undefined }, admins, overrides)?.cluster;
  const others = !rec
    ? []
    : post.role === "tech"
      ? rec.coordinators.filter((x) => x.status === "accepted" && x.id !== admin.id)
      : post.role === "guide-f"
        ? rec.femaleGuides.filter((x) => x.status === "accepted" && x.id !== admin.id)
        : post.role === "cluster-assistant"
          ? rec.assistants.filter((x) => x.status === "accepted" && x.id !== admin.id)
          : post.groups.flatMap((g) => (rec.seats[g.number] ?? []).flatMap((x) => (x.who?.status === "accepted" && x.who.id !== admin.id ? [x.who] : [])));
  const wide = post.role === "guide-f" || post.role === "cluster-assistant";
  const totals = clusterTotals(post.groups);
  const title = wide ? "مجموعات التكتل" : post.groups.length > 1 ? "إدارة المجموعات" : "إدارة المجموعة";
  return (
    <AdminShell title={title} subtitle={`${role.one} في ${post.clusterName}: ${wide ? "للتكتل كله" : groupsLabel(post.groups.map((g) => g.number))}. ${post.role === "tech" ? "تلحق بها وحدها الحجاج بعقودهم، وتأخذ ملفاتهم الصحية." : "تعمل فيها مع رؤسائها."}`}>
      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-dark via-green to-green-dark p-7 text-white shadow-2xl md:p-9">
            <div className="bg-pattern absolute inset-0 opacity-15" />
            <div className="relative">
              <Badge tone="gold">
                <Cpu className="size-3.5" /> {role.title}
              </Badge>
              <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">{post.clusterName}</h2>
              <p className="mt-1 text-sm text-gold">رئيس التكتل: {post.headName} — هو من دعاك{post.role === "tech" ? " ووزّع عليك مجموعاتك" : ""}</p>
              <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  [wide ? "مجموعات التكتل" : post.groups.length > 1 ? "مجموعاتي" : "مجموعتي", formatNumber(totals.groups), post.role === "tech" ? "يغيّرها رئيس التكتل متى شاء" : wide ? "تعمل للتكتل كله" : "مقعدك فيها"],
                  ["حجاجها", formatNumber(totals.pilgrims), `من ${formatNumber(totals.capacity)} بفئاتها`],
                  [post.role === "guide" || post.role === "assistant" ? "معك في مقاعدها" : role.label, formatNumber(others.length + (post.role === "guide" || post.role === "assistant" ? 0 : 1)), others.length ? others.map((c) => c.name).join("، ") : "أنت وحدك"],
                ].map(([k, v, hint]) => (
                  <div key={k} className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                    <dt className="text-xs text-white/70">{k}</dt>
                    <dd className="mt-0.5 font-display text-2xl font-bold text-gold">{v}</dd>
                    <dd className="text-xs text-white/60">{hint}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </motion.div>

          <Card>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
              <LayoutList className="size-5 text-gold-dark" /> {post.role === "tech" ? "المجموعات الموزَّعة عليك" : wide ? "مجموعات التكتل" : "مجموعتك"} — {formatNumber(totals.groups)}
            </h3>
            {post.groups.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-sand p-4 text-sm text-ink-soft">{post.role === "tech" ? "لم يوزّع عليك رئيس التكتل مجموعة بعد." : "لا مجموعة بعد."}</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {post.groups.map((g, i) => (
                  <motion.li key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-gold/30 bg-white p-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-sand text-green-dark">
                      <Users className="size-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-ink">{groupName(g.number)}</span>
                      <span className="block text-xs text-ink-soft">
                        رئيسها: {g.head} — {g.branch} — {g.categoryName}
                      </span>
                    </span>
                    <span className="text-left">
                      <span className="block font-display text-xl font-bold text-green-dark">
                        {g.pilgrims}
                        <span className="text-sm text-hint">/{g.capacity}</span>
                      </span>
                      <span className="block text-xs text-hint">حاجاً</span>
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}
            <ButtonLink href="/administrator/requests" size="sm" className="mt-4">
              {post.groups.length > 1 ? "حجاج مجموعاتي" : "حجاج المجموعة"} <ArrowLeft className="size-4" />
            </ButtonLink>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28">
          <div className="rounded-3xl bg-green-dark p-5 text-sm leading-7 text-white/85">
            <p className="flex items-center gap-2 font-bold text-gold">
              <Building2 className="size-4" /> مكانك في التكتل
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>رئيس المجموعة لا يختار أحداً: يشكّل مجموعته وحده.</li>
              <li>رئيس التكتل يدعو موجّه كل مجموعة ومعاونها إلى مقاعدها بحسب فئتها في مستوى التكتل.</li>
              <li>ويختار منسقي التكتل وموجّهاته ومعاونه بمجموع فئات مجموعاته، ويوزّع المجموعات على منسقيه.</li>
              <li>لكل شخص مكان واحد في الموسم.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-gold/30 bg-white p-5 text-sm leading-7">
            <p className="flex items-center gap-2 font-bold text-green-dark">
              <UserRoundPlus className="size-4" /> عملك
            </p>
            <p className="mt-1 text-ink-soft">
              {post.role === "tech"
                ? "تسجّل الحجاج على الحج في مكتبك («التسجيل على الحج»)، وهذا لا يضعهم في مجموعة. وتلحق الحجاج بمجموعاتك بعقودهم وتأخذ ملفاتهم الصحية («حجاج مجموعاتي»)."
                : post.role === "guide"
                  ? "الدروس والمناسك والأسئلة الشرعية لحجاج مجموعتك."
                  : post.role === "assistant"
                    ? "الحضور والتجمّع والمطارات والمستلزمات مع رئيس مجموعتك."
                    : post.role === "guide-f"
                      ? "التوجيه الديني لحاجّات التكتل كله، والدروس والمناسك."
                      : "المطارات والمخيمات والطوارئ مع رئيس التكتل، ودعم رؤساء مجموعاته."}
            </p>
            <p className="mt-2 flex items-center gap-1 text-xs text-hint">
              <Users className="size-3.5" /> رئيس كل مجموعة يستلم عائلاتها ويرحّب بها.
            </p>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
