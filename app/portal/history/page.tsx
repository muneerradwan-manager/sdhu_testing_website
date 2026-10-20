"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Briefcase, ChevronDown, History, Landmark, Star, UsersRound } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/portal/shell";
import { Badge } from "@/components/ui/widgets";
import { effectiveRole, positionLabelOf, resultOf, seasonHistory, type SeasonRecord } from "@/app/administrator/_lib/admin";
import { useAccount, type Participation } from "@/lib/account";
import { groupInfo } from "@/lib/assignment";
import { trackOf } from "@/lib/journey";
import { groupName } from "@/lib/groups";
import { relationLabel } from "@/lib/registry";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PilgrimShell } from "../_components/pilgrim-shell";
import { SeasonSheet } from "../_components/admin-home/season-sheet";
import { usePilgrimAcceptance } from "../_components/account-sidebar";

/**
 * «سجل المواسم»: every season of the account, the Hajj's and the administrative ones together, newest first. Each opens
 * on what he was in it — the role, the group and the cluster, who served with him, the rating and how it was reached;
 * or the application, who was in it, its result and the group it joined. Nothing in it is ever removed.
 */
export default function HistoryPage() {
  const acc = useAccount();
  const [open, setOpen] = useState<number | null>(null);
  const [sheet, setSheet] = useState<SeasonRecord | null>(null);
  const rows = [...(acc?.history ?? [])].filter((h) => h.kind !== "none" || h.current).reverse();
  return (
    <PilgrimShell title="سجل المواسم" subtitle="كل موسم شاركت فيه، حاجاً أو إدارياً: ما كنت فيه، ومن كان معك، وتقييمك. يبقى السجل كله في حسابك، لا يُحذف منه شيء.">
      <Card className="md:p-8">
        <p className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
          <History className="size-7 text-gold-dark" /> مواسمي
        </p>
        <ol className="mt-6 space-y-3">
          {rows.map((h) => {
            const on = open === h.season;
            return (
              <li key={h.season} className={cn("overflow-hidden rounded-3xl border-2 transition", on ? "border-gold-dark/50 bg-white" : "border-gold/30 bg-sand/50")}>
                <button type="button" onClick={() => setOpen(on ? null : h.season)} aria-expanded={on} className="flex w-full flex-wrap items-center gap-3 p-4 text-start">
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", h.kind === "admin" ? "bg-maroon text-gold" : h.kind === "pilgrim" ? "bg-green-dark text-gold" : "bg-white text-hint")}>
                    {h.kind === "admin" ? <Briefcase className="size-5" /> : <Landmark className="size-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-display text-lg font-bold text-green-dark">
                      موسم {h.season}
                      {h.current && <Badge tone="gold">الموسم الحالي</Badge>}
                      <Badge tone={h.kind === "admin" ? "maroon" : h.kind === "pilgrim" ? "green" : "ink"}>{h.kind === "admin" ? "إداري" : h.kind === "pilgrim" ? "حاج" : "لم يختر بعد"}</Badge>
                    </span>
                    <span className="block text-sm text-ink-soft">
                      {h.label}
                      {h.detail && ` — ${h.detail}`}
                    </span>
                  </span>
                  {h.rating ? (
                    <span className="flex items-center gap-1 rounded-full bg-gold/30 px-2.5 py-1 text-sm font-bold text-maroon">
                      <Star className="size-4 fill-current" /> {h.rating}
                    </span>
                  ) : null}
                  <ChevronDown className={cn("size-5 shrink-0 text-hint transition", on && "rotate-180")} />
                </button>
                {on && acc && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border-t border-gold/30 p-4">
                    {h.kind === "admin" ? (
                      <AdminSeason id={acc.id} row={h} onSheet={setSheet} />
                    ) : h.kind === "pilgrim" ? (
                      <PilgrimSeason row={h} />
                    ) : (
                      <p className="text-sm leading-7 text-ink-soft">
                        لم تختر بعد ما تفعله في هذا الموسم. <Link href="/portal" className="font-bold text-green-dark hover:underline">اختر من «ملفي»</Link>
                      </p>
                    )}
                  </motion.div>
                )}
              </li>
            );
          })}
        </ol>
      </Card>
      {acc && <SeasonSheet id={acc.id} record={sheet} onClose={() => setSheet(null)} />}
    </PilgrimShell>
  );
}

const Row = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div className="rounded-2xl bg-sand p-3">
    <dt className="text-xs text-hint">{k}</dt>
    <dd className="mt-0.5 text-sm font-bold text-ink">{children}</dd>
  </div>
);

/** An administrative season: his role, where he served and with whom, and his rating with how it was reached */
function AdminSeason({ id, row, onSheet }: { id: string; row: Participation; onSheet: (r: SeasonRecord) => void }) {
  const profile = useStore((s) => s.admins[id]);
  if (row.current) {
    const role = profile ? effectiveRole(profile) : "";
    const r = resultOf(profile);
    const post = profile?.coordinatorIn ?? profile?.servesIn;
    const place = profile?.cluster ? `رئيس ${profile.cluster.name}` : post ? `${post.clusterName}${post.groups.length ? ` — ${post.groups.map(groupName).join("، ")}` : ""}` : profile?.group?.approvedAt ? groupName(profile.group.number) : "لم يُحدَّد بعد";
    const team = profile?.group?.approvedAt ? groupInfo(profile.group.clusterId, profile.group.number).team : post?.groups.length ? groupInfo(post.clusterId, post.groups[0]).team : [];
    return (
      <div className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-3">
          <Row k="الصفة">{role ? positionLabelOf(role) : "لم يتقدم لصفة بعد"}</Row>
          <Row k="التأهيل">{r.exempt ? "مجدَّد دون اختبار" : r.passed ? `مؤهل${r.score !== undefined ? ` (${r.score}%)` : ""}` : profile?.feePaidAt ? "قيد التأهيل" : "لم يُقدَّم الطلب بعد"}</Row>
          <Row k="مكانه">{place}</Row>
        </dl>
        <Team team={team} />
        <p className="text-xs text-hint">يُقيَّم الموسم بعد العودة منه، فيظهر تقييمه هنا.</p>
      </div>
    );
  }
  // An earlier season's team is not the group's team today: what he served in, and how the season rated him
  const rec = seasonHistory(id).find((x) => Number(x.season) === row.season);
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-3">
        <Row k="الصفة">{row.label}</Row>
        <Row k="المجموعة أو التكتل">{row.detail ?? "—"}</Row>
        <Row k="تقييم الموسم">{row.rating ? `${row.rating} من 5` : "—"}</Row>
      </dl>
      {rec && row.rating ? (
        <button type="button" onClick={() => onSheet(rec)} className="inline-flex items-center gap-1 text-sm font-bold text-green-dark hover:underline">
          كيف حُسب تقييمه وما جرى في الموسم <ArrowLeft className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

/** A season on the Hajj: this season's application — who is in it, where it stands, the group it joined — or an earlier one's result */
function PilgrimSeason({ row }: { row: Participation }) {
  const sid = useStore((s) => s.sessionId) ?? "";
  const post = useStore((s) => s.post[sid]);
  const { app, accepted } = usePilgrimAcceptance();
  if (!row.current || !app) return <p className="text-sm leading-7 text-ink-soft">{row.label}. تفاصيل المواسم التي سبقت المنصة محفوظة في مكتب التسجيل.</p>;
  const group = post?.groupNumber ? groupInfo(post.clusterId, post.groupNumber) : null;
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-3">
        <Row k="الطلب">رقم {app.number} — {trackOf(app) === "lottery" ? "القرعة" : "القبول المباشر"}</Row>
        <Row k="النتيجة">{accepted ? "مقبول" : "قيد المتابعة"}</Row>
        <Row k="المجموعة">{group ? `${groupName(group.number)} — ${group.clusterName}` : "لم يُلحق بمجموعة بعد"}</Row>
      </dl>
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-green-dark">
          <UsersRound className="size-4 text-gold-dark" /> من معك في الطلب
        </p>
        <ul className="flex flex-wrap gap-2">
          {app.members.map((m) => (
            <li key={m.person.id} className="rounded-full bg-sand px-3 py-1 text-sm">
              <b>{m.person.firstName} {m.person.lastName}</b> <span className="text-hint">— {relationLabel(m.relation, m.person.gender)}</span>
            </li>
          ))}
        </ul>
      </div>
      {group && <Team team={group.team} />}
    </div>
  );
}

function Team({ team }: { team: { role: string; name: string }[] }) {
  if (!team.length) return null;
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-bold text-green-dark">
        <UsersRound className="size-4 text-gold-dark" /> من كان معك في المجموعة
      </p>
      <ul className="flex flex-wrap gap-2">
        {team.map((t) => (
          <li key={t.role + t.name} className="rounded-full bg-sand px-3 py-1 text-sm">
            <b>{t.name}</b> <span className="text-hint">— {t.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
