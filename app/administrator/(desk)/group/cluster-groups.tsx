"use client";

import { motion } from "motion/react";
import { ArrowLeft, Building2, Crown, LayoutList, ShieldCheck, UserRound, Users, UsersRound } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/portal/shell";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/widgets";
import { formatNumber } from "@/lib/utils";
import { clusterGroupsOf, clusterTotals, clusterViewOf } from "../../_lib/cluster";
import { useAdmin } from "../../_lib/admin";
import { AdminShell } from "../../_components/ui";
import { StandingCard } from "../../_components/standing";

/**
 * The screen of a group head who was elected cluster head. He stays the head of his own group, and on
 * top of that his duties rise to the cluster level: he manages every group in his cluster, each with
 * its own head and team. So this screen is a list of groups, not one group.
 */
export function ClusterGroups() {
  const admin = useAdmin()!;
  const p = admin.profile!;
  const cluster = clusterViewOf(p, admin.name)!;
  const head = cluster.isHead;
  const groups = clusterGroupsOf(p, admin.name);
  const totals = clusterTotals(groups);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <AdminShell
      title={`مجموعات ${cluster.name}`}
      subtitle={
        head
          ? "انتُخبت رئيساً للتكتل، فصارت صفتك على مستوى التكتل: لم تعد تدير مجموعة واحدة، بل مجموعات التكتل كلها، ولكل مجموعة رئيسها وفريقها."
          : `اختارك رئيس التكتل ${cluster.headName} معاوناً، فصارت صفتك على مستوى التكتل: ترى مجموعات التكتل كلها ومعلوماته، وتنوب عن الرئيس في متابعتها.`
      }
    >
      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-dark via-green to-green-dark p-7 text-white shadow-2xl md:p-9">
            <div className="bg-pattern absolute inset-0 opacity-15" />
            <div className="relative">
              <Badge tone="gold">
                <Crown className="size-3.5" /> {head ? "رئيس تكتل منتخب" : `معاون رئيس التكتل ${cluster.headName}`}
              </Badge>
              <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">{cluster.name}</h2>
              <p className="mt-1 text-sm text-gold">{head ? `المعاون: ${cluster.deputyName ?? "—"} — رسم الإنشاء مسدد` : `رئيس التكتل: ${cluster.headName} — المعاون: أنت`}</p>
              <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  [head ? "المجموعات التي تديرها" : "مجموعات التكتل", formatNumber(totals.groups), `من سعة ${cluster.capacityGroups}`],
                  ["حجاج التكتل", formatNumber(totals.pilgrims), `من أصل ${formatNumber(totals.capacity)} مقعداً`],
                  ["حجاج التكتل بالمقاعد", `${formatNumber(totals.capacity)}`, "مجموع سعات مجموعاته"],
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
              <LayoutList className="size-5 text-gold-dark" /> مجموعات التكتل — {formatNumber(totals.groups)} مجموعة
            </h3>
            <p className="mt-1 text-sm leading-6 text-ink-soft">{head ? "كلها مجموعاتك وتديرها جميعاً بالتساوي: تفتح حجاج أي منها وتتابع أعدادها وبرنامجها. ولكل مجموعة رئيسها المباشر وفريقها الذي يعمل معك." : "مجموعات التكتل كلها تتابعها نيابةً عن رئيسه، ولكل مجموعة رئيسها المباشر وفريقها."}</p>
            <ul className="mt-4 space-y-2">
              {groups.map((g, i) => (
                <motion.li
                  key={g.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border-2 border-gold/30 bg-white transition"
                >
                  <button type="button" onClick={() => setOpen(open === g.number ? null : g.number)} className="flex w-full flex-wrap items-center gap-3 p-3 text-right">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-sand font-display text-lg font-bold text-green-dark">{g.number}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-ink">المجموعة {g.number}</span>
                      <span className="block text-xs text-ink-soft">
                        {g.own ? "رئيسها المباشر: أنت" : `رئيسها المباشر: ${g.head}`} — {g.office}
                      </span>
                    </span>
                    <span className="text-left">
                      <span className="block font-display text-xl font-bold text-green-dark">
                        {g.pilgrims}
                        <span className="text-sm text-hint">/{g.capacity}</span>
                      </span>
                      <span className="block text-xs text-hint">حاجاً</span>
                    </span>
                  </button>
                  {open === g.number && (
                    <div className="border-t border-gold/30 p-4 text-sm">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          ["رئيسها المباشر", g.own ? admin.name : g.head],
                          ["المكتب", g.office],
                          ["المقاعد المشغولة", `${g.pilgrims} من ${g.capacity}`],
                          ["صفة الانضمام", g.joined],
                        ].map(([k, v]) => (
                          <div key={k} className="rounded-xl bg-sand px-3 py-2">
                            <p className="text-xs text-hint">{k}</p>
                            <p className="font-semibold">{v}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 leading-6 text-ink-soft">
                        {head
                          ? `هذه مجموعة من مجموعاتك تديرها كغيرها: تفتح شاشة حجاجها وتستلم عائلاتها وتتابع ملفاتها${g.own ? "" : `، ويعمل معك فيها رئيسها المباشر ${g.head} وفريقه`}.`
                          : `تتابع هذه المجموعة نيابةً عن رئيس التكتل، ويعمل فيها رئيسها المباشر ${g.own ? admin.name : g.head} وفريقه.`}
                      </p>
                      <ButtonLink href="/administrator/requests" size="sm" className="mt-3">
                        حجاج المجموعة {g.number} <ArrowLeft className="size-4" />
                      </ButtonLink>
                    </div>
                  )}
                </motion.li>
              ))}
            </ul>
          </Card>

          <StandingCard scope="cluster" name={cluster.name} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28">
          <Card className="md:p-6">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
              <ShieldCheck className="size-5 text-gold-dark" /> مهامك على مستوى التكتل
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {(head
                ? [
                    { icon: Building2, t: "برنامج التكتل: النقل والإسكان والمشاعر لكل مجموعاته" },
                    { icon: UsersRound, t: "تنسيق رؤساء المجموعات واجتماعاتهم ومتابعة التزامهم" },
                    { icon: Users, t: "قبول طلبات الانضمام بحسب سعة التكتل وتوقيع العقود" },
                    { icon: UserRound, t: "تمثيل التكتل أمام الإدارة، ورفع التقارير والبلاغات" },
                  ]
                : [
                    { icon: Building2, t: "متابعة النقل والإسكان لمجموعات التكتل" },
                    { icon: UsersRound, t: "النيابة عن رئيس التكتل عند غيابه في كل مهامه" },
                    { icon: Users, t: "متابعة التزام المجموعات ببرنامج التكتل ورفع الملاحظات" },
                    { icon: UserRound, t: "مرافقة الرئيس في اجتماعات رؤساء المجموعات" },
                  ]
              ).map(({ icon: Icon, t }) => (
                <li key={t} className="flex gap-2 rounded-xl bg-sand px-3 py-2 leading-6">
                  <Icon className="mt-0.5 size-4 shrink-0 text-green-dark" /> {t}
                </li>
              ))}
            </ul>
            <ButtonLink href="/administrator/cluster" variant="outline" size="sm" className="mt-4 w-full">
              {head ? "إدارة التكتل وطلبات الانضمام" : "معلومات التكتل"} <ArrowLeft className="size-4" />
            </ButtonLink>
          </Card>
          <div className="rounded-3xl bg-green-dark p-5 text-sm leading-7 text-white/85">
            <p className="font-bold text-gold">لماذا عدة مجموعات؟</p>
            <p className="mt-2">
              رئيس التكتل ومعاونه رئيسا مجموعات ترقّت صفتهما بالانتخاب إلى مستوى التكتل، فلم تعد شاشتهما إدارة مجموعة واحدة بل مجموعات التكتل ومعلوماته. ولكل مجموعة رئيسها وفريقها، والتكتل فوقها في البرنامج والنقل والإسكان والتقييم.
            </p>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
