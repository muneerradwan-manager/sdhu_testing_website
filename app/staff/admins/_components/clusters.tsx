"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { BadgeCheck, Building2, Crown, ExternalLink, Inbox, Lock, Megaphone, RotateCcw, ShieldCheck, UserCheck, Vote, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { diffFields, fieldsOf } from "@/lib/cluster-profile";
import { SEASON } from "@/lib/season";
import { useSeason } from "@/lib/season-live";
import { actions, useStore } from "@/lib/store";
import { cn, formatNumber, formatUSD } from "@/lib/utils";
import { clusterTotals } from "@/app/administrator/_lib/cluster";
import { Drawer, Empty, fmtDateTime, Panel, textareaClass, useStaffUser } from "../../_components/kit";
import { Chip, InfoGrid } from "../../_components/ops-ui";
import { RecordHistory, SystemRecords } from "../../_components/system";
import { logAdmins, useAdminsDesk, type AdminsDesk, type ClusterRow } from "../desk";

/**
 * The clusters, from the election to their published programmes. Nobody applies to head a cluster: the
 * holder opens candidacy, the group heads who meet the season's conditions stand and every group head
 * votes, then he closes the vote and announces the heads — he opens, closes and announces, and never
 * picks the winners. Each elected head creates his cluster, picks his deputy (معاون رئيس تكتل) and takes
 * in groups by request; then he writes his cluster's programme, which reaches the pilgrims only once
 * the holder approves it.
 */
export function ClustersTab() {
  const desk = useAdminsDesk();
  const [open, setOpen] = useState<string | null>(null);
  const sheet = desk.clusters.find((x) => x.c.id === open);

  return (
    <div className="space-y-6">
      <Election desk={desk} />
      {desk.phase === "closed" ? (
        <Empty icon={<Lock />} title="لم يُفتح باب الترشح بعد" text="تُشكَّل المجموعات وتُعتمد أولاً، ثم يُفتح الترشح لرئاسة التكتلات." />
      ) : (
        <Candidates desk={desk} />
      )}
      {(desk.phase === "announced" || desk.clusters.length > 0) && <Clusters desk={desk} onOpen={setOpen} />}
      <Programmes desk={desk} />
      <SystemRecords system="admins" area="clusters" title="سجل التكتلات والانتخاب" />
      <Drawer open={!!sheet} onClose={() => setOpen(null)} title={sheet?.c.name ?? ""}>
        {sheet && <ClusterSheet x={sheet} />}
      </Drawer>
    </div>
  );
}

// ───────────────────────── The election ─────────────────────────

function Election({ desk }: { desk: AdminsDesk }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const election = useStore((s) => s.election);
  const A = useSeason().administrators;
  const [confirmReset, setConfirmReset] = useState(false);

  const openVote = () => {
    actions.setElection({ openedAt: Date.now(), closedAt: undefined, elected: undefined });
    logAdmins(user, "clusters", {
      action: "فتح باب الترشح لرئاسة التكتلات",
      target: `${A.clusterCount} تكتلات`,
      detail: `الشرط: ${A.clusterHeadSeasons} مواسم متتالية رئيساً لمجموعة بتقييم ${A.clusterHeadMinRating} فأكثر — يصوّت رؤساء المجموعات`,
      important: true,
    });
    toast({ title: "فُتح باب الترشح", body: `${A.clusterCount} تكتلات هذا الموسم. يرشّح المستوفون أنفسهم ويصوّت رؤساء المجموعات.`, tone: "gold", icon: "📣" });
  };

  const close = () => {
    const winners = desk.candidates.slice(0, A.clusterCount);
    actions.setElection({ closedAt: Date.now(), elected: winners.map((c) => c.id) });
    logAdmins(user, "clusters", {
      action: "إغلاق التصويت وإعلان رؤساء التكتلات",
      target: `${winners.length} رؤساء من ${desk.candidates.length} مرشحاً`,
      detail: winners.map((c) => `${c.name} (${c.votes})`).join("، "),
      important: true,
    });
    toast({ title: "أُعلنت النتيجة", body: `${winners.length} رؤساء تكتلات. ينشئ كل منهم تكتله ويختار معاونه.`, tone: "success", icon: "🏛️" });
  };

  const reset = () => {
    actions.setElection({ openedAt: undefined, closedAt: undefined, elected: undefined });
    logAdmins(user, "clusters", { action: "إلغاء انتخاب رؤساء التكتلات وإعادته من البداية", target: "موسم 1448", important: true });
    toast({ title: "أُعيد الانتخاب إلى نقطة البداية", tone: "warning", icon: "↩️" });
    setConfirmReset(false);
  };

  return (
    <Panel
      icon={<Vote />}
      title="انتخاب رؤساء التكتلات"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={desk.phase === "announced" ? "green" : desk.phase === "open" ? "gold" : "maroon"}>
            {desk.phase === "closed" ? "لم يُفتح بعد" : desk.phase === "open" ? "الترشح والتصويت مفتوحان" : "أُغلق وأُعلنت النتيجة"}
          </Chip>
          {desk.phase === "closed" && (
            <Button size="sm" variant="gold" onClick={openVote}>
              <Megaphone className="size-4" /> فتح باب الترشح
            </Button>
          )}
          {desk.phase === "open" && (
            <Button size="sm" variant="gold" onClick={close}>
              <BadgeCheck className="size-4" /> إغلاق التصويت وإعلان الرؤساء
            </Button>
          )}
          {desk.phase === "announced" && (
            <Button size="sm" variant={confirmReset ? "maroon" : "glass"} onClick={() => (confirmReset ? reset() : setConfirmReset(true))}>
              <RotateCcw className="size-4" /> {confirmReset ? "تأكيد: إعادة الانتخاب من البداية" : "إعادة الانتخاب من البداية"}
            </Button>
          )}
        </div>
      }
    >
      <ElectionSteps desk={desk} openedAt={election.openedAt} closedAt={election.closedAt} />
      <p className="mt-4 text-sm leading-7 text-white/70">
        من «إعدادات الموسم»: {A.clusterCount} تكتلات، والترشح لمن رأس مجموعة {A.clusterHeadSeasons} مواسم متتالية بتقييم {A.clusterHeadMinRating} فأكثر — يستوفيه {desk.standing}. ويختار كل رئيس منتخب معاونه ممن رأس مجموعة {A.deputySeasons}{" "}
        {A.deputySeasons === 1 ? "موسماً" : "مواسم"} فأكثر.
      </p>
    </Panel>
  );
}

/** The election's three steps and where it stands, for this tab and the holder's summary */
export function ElectionSteps({ desk, openedAt, closedAt }: { desk: AdminsDesk; openedAt?: number; closedAt?: number }) {
  return (
    <ol className="grid gap-3 md:grid-cols-3">
      {[
        { t: "فتح باب الترشح", d: openedAt ? fmtDateTime(openedAt) : `النافذة: ${SEASON.administrators.clusters.window}`, on: !!openedAt },
        { t: "ترشّح رؤساء المجموعات وتصويتهم", d: `${desk.candidates.length} مرشحاً — ${desk.votes} صوتاً من ${desk.voters}`, on: desk.phase !== "closed" },
        { t: "إغلاق التصويت وإعلان الرؤساء", d: closedAt ? `${fmtDateTime(closedAt)} — ${desk.elected.length} رؤساء` : "بانتظار الإغلاق", on: desk.phase === "announced" },
      ].map((s, i) => (
        <li key={s.t} className={cn("rounded-2xl p-4 ring-1", s.on ? "bg-green-light/10 ring-green-light/30" : "bg-white/5 ring-white/10")}>
          <p className="flex items-center gap-2 font-bold text-white">
            <span className={cn("grid size-6 place-items-center rounded-lg text-xs font-bold", s.on ? "bg-green-light text-white" : "bg-white/10 text-white/60")}>{i + 1}</span>
            {s.t}
          </p>
          <p className="mt-1 text-xs text-white/65">{s.d}</p>
        </li>
      ))}
    </ol>
  );
}

function Candidates({ desk }: { desk: AdminsDesk }) {
  const count = useSeason().administrators.clusterCount;
  const announced = desk.phase === "announced";
  return (
    <Panel icon={<Crown />} title={announced ? "النتيجة النهائية" : "المرشحون والأصوات"} action={<Chip tone="gold">{formatNumber(desk.candidates.length)} مرشحاً</Chip>}>
      <ul className="space-y-2">
        {desk.candidates.map((c, i) => {
          const won = announced ? desk.elected.includes(c.id) : i < count;
          return (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.03 }}
              className={cn("flex flex-wrap items-center gap-3 rounded-2xl p-3 ring-1", won ? "bg-gold/10 ring-gold/40" : "bg-white/5 ring-white/10")}
            >
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-display text-lg font-bold", won ? "bg-gold text-ink" : "bg-white/10 text-white/80")}>{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-bold text-white">
                  {c.name}
                  {c.real && <Chip tone="green">من بوابة الإداريين</Chip>}
                </span>
                <span className="block text-xs text-white/65">
                  رئيس المجموعة {c.group} — {c.seasons} مواسم رئاسة{c.rating !== null && ` — تقييم ${c.rating}`}
                </span>
              </span>
              <span className="font-display text-xl font-bold tabular-nums text-gold">{c.votes}</span>
              <span className="w-20 text-left text-xs font-bold">
                {announced ? (won ? <Chip tone="green">رئيس تكتل</Chip> : <span className="text-white/45">لم يفز</span>) : won ? <Chip tone="gold">ضمن العدد</Chip> : <span className="text-white/45">خارج العدد</span>}
              </span>
            </motion.li>
          );
        })}
      </ul>
      {desk.phase === "open" && <p className="mt-4 rounded-2xl bg-white/5 p-3 text-xs leading-6 text-white/60">الترتيب يتغير مع كل صوت. عند الإغلاق يفوز أعلى {count} مرشحين أصواتاً، ويُسجَّل القرار باسمك.</p>}
      {announced && desk.elected.length < count && (
        <p className="mt-4 rounded-2xl bg-gold/15 p-3 text-xs leading-6 text-gold ring-1 ring-gold/30">
          أُعلن {desk.elected.length} رؤساء لـ{count} تكتلات: لم يترشح ما يكفي. عدد التكتلات من «إعدادات الموسم»، فإن بقي أكثر من المرشحين فارفع الأمر إلى مديرة الموسم.
        </p>
      )}
    </Panel>
  );
}

// ───────────────────────── The clusters ─────────────────────────

function Clusters({ desk, onOpen }: { desk: AdminsDesk; onOpen: (id: string) => void }) {
  const fee = useSeason().fees.clusterFormation;
  return (
    <div id="clusters" className="scroll-mt-24">
      <Panel icon={<Building2 />} title="التكتلات بعد الانتخاب" action={<Chip tone={desk.clusters.length ? "green" : "maroon"}>{desk.phase === "announced" ? `${desk.clusters.length} من ${desk.elected.length} أنشأ تكتله` : `${desk.clusters.length} تكتلات`}</Chip>}>
        {desk.clusters.length === 0 ? (
          <p className="rounded-2xl bg-white/5 p-4 text-sm text-white/70">لم ينشئ أي رئيس منتخب تكتله بعد. يدفع كل منهم رسم الإنشاء ({formatUSD(fee)}) ويختار معاونه من رؤساء المجموعات السابقين.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {desk.clusters.map((x) => {
              const t = clusterTotals(x.groups);
              return (
                <li key={x.c.id}>
                  <button type="button" onClick={() => onOpen(x.c.id)} className={cn("w-full rounded-2xl p-4 text-right ring-1 transition hover:ring-gold/50", x.c.deputyId ? "bg-white/5 ring-white/10" : "bg-maroon/15 ring-maroon/40")}>
                    <p className="font-display text-xl font-bold text-gold">{x.c.name}</p>
                    <p className="mt-1 text-sm text-white/85">
                      <Crown className="mb-0.5 inline size-4 text-gold" /> الرئيس: {x.row.name} — المجموعة {x.row.profile.group?.number}
                    </p>
                    <p className="text-sm text-white/85">
                      <UserCheck className="mb-0.5 inline size-4 text-green-light" /> المعاون: {x.c.deputyName ?? <b className="text-gold">لم يُختر بعد</b>}
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
                      <Chip tone="green">
                        {t.groups} من {x.c.capacityGroups} مجموعات
                      </Chip>
                      <Chip>{formatNumber(t.pilgrims)} حاجاً</Chip>
                      {x.c.feePaidAt && <span>رسم الإنشاء مسدد</span>}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {desk.electedRows.some((e) => !e.cluster) && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-bold text-white">منتخبون لم ينشئوا تكتلاتهم بعد</p>
            <ul className="flex flex-wrap gap-2">
              {desk.electedRows
                .filter((e) => !e.cluster)
                .map((e) => (
                  <li key={e.id}>
                    <Chip tone={desk.notCreated.some((n) => n.id === e.id) ? "maroon" : "muted"}>{e.name}</Chip>
                  </li>
                ))}
            </ul>
            <p className="mt-2 text-xs leading-6 text-white/55">لا تنضم مجموعة إلى تكتل لم يُنشأ. ما عليه علامة حمراء رئيس على المنصة ينتظره إنشاء تكتله.</p>
          </div>
        )}
      </Panel>
    </div>
  );
}

/** One cluster whole: its head and deputy, every group in it, and its history */
function ClusterSheet({ x }: { x: ClusterRow }) {
  const t = clusterTotals(x.groups);
  return (
    <div className="space-y-5">
      <InfoGrid
        rows={[
          ["رئيس التكتل", `${x.row.name} — المجموعة ${x.row.profile.group?.number ?? "—"}`],
          ["معاون رئيس التكتل", x.c.deputyName ?? ""],
          ["أُنشئ", fmtDateTime(x.c.createdAt)],
          ["رسم الإنشاء", x.c.feePaidAt ? fmtDateTime(x.c.feePaidAt) : "لم يُسدَّد"],
          ["المجموعات", `${t.groups} من ${x.c.capacityGroups}`],
          ["الحجاج", `${formatNumber(t.pilgrims)} من ${formatNumber(t.capacity)} مقعداً`],
        ]}
      />
      <ul className="space-y-2">
        {x.groups.map((g) => (
          <li key={g.number} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/20 font-display font-bold text-gold">{g.number}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-white">
                {g.head} {g.own && <Chip tone="gold">مجموعة الرئيس</Chip>}
              </span>
              <span className="block text-xs text-white/60">
                {g.office} — {g.joined}
              </span>
            </span>
            <span className="text-sm tabular-nums text-white/80">
              {g.pilgrims} / {g.capacity}
            </span>
          </li>
        ))}
      </ul>
      <RecordHistory system="admins" refId={x.c.id} />
    </div>
  );
}

// ───────────────────────── The clusters' programmes ─────────────────────────

const REASONS = ["الوصف لا يطابق العقد الموقّع مع الفندق", "المسافة المذكورة غير دقيقة", "خدمة موصوفة دون تعاقد يثبتها", "صياغة دعائية لا تصف خدمة"];

/**
 * A cluster's public page carries the administration's approval, so the head writes his programme and
 * the holder decides: what changed, from what to what, and a decision with a reason. Nothing reaches the
 * pilgrims before it is approved.
 */
function Programmes({ desk }: { desk: AdminsDesk }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const published = desk.programmes.filter((x) => x.state?.approved);

  const decide = (slug: string, name: string, decision: "approved" | "rejected", why?: string) => {
    actions.decideClusterProfile(slug, decision, user.name, why);
    logAdmins(user, "clusters", { action: decision === "approved" ? "اعتماد برنامج تكتل ونشره للحجاج" : "إعادة برنامج تكتل إلى رئيسه", target: name, detail: why, ref: slug });
    toast(
      decision === "approved"
        ? { title: "اعتُمد البرنامج ونُشر", body: `${name} — يراه الحجاج الآن في دليل الخدمات.`, tone: "success", icon: "✅" }
        : { title: "أُعيد إلى رئيس التكتل", body: why, tone: "info", icon: "↩️" },
    );
    setRejecting(null);
  };

  return (
    <div id="programmes" className="scroll-mt-24 space-y-6">
      <Panel icon={<Inbox />} title="برامج تنتظر اعتمادك" action={<Chip tone={desk.pendingProgrammes.length ? "gold" : "green"}>{desk.pendingProgrammes.length}</Chip>}>
        {desk.pendingProgrammes.length === 0 ? (
          <Empty icon={<ShieldCheck />} title="لا تعديلات معلّقة" text="حين يعدّل رئيس تكتل صفحته العامة في دليل الخدمات يصل التعديل هنا قبل أن يراه أحد." />
        ) : (
          <ul className="space-y-4">
            {desk.pendingProgrammes.map(({ cluster: c, state }, i) => {
              const live = state!.approved ? { ...fieldsOf(c), ...state!.approved.fields } : fieldsOf(c);
              const changes = diffFields(live, state!.pending!.fields);
              return (
                <motion.li key={c.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-xl font-bold text-white">{c.name}</p>
                      <p className="text-xs text-white/65">
                        أرسله {state!.pending!.by} — {fmtDateTime(state!.pending!.at)} — {changes.length} حقلاً
                      </p>
                      {state!.pending!.note && <p className="mt-1 text-sm text-gold">ملاحظته: {state!.pending!.note}</p>}
                    </div>
                    <Link href={`/verify/clusters/${c.slug}`} target="_blank" className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/20">
                      <ExternalLink className="size-3.5" /> الصفحة الحالية
                    </Link>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {changes.map((ch) => (
                      <li key={ch.key} className="rounded-xl bg-white/5 p-3 text-sm ring-1 ring-white/10">
                        <p className="font-bold text-gold">{ch.label}</p>
                        <p className="mt-1 text-white/50 line-through">{ch.before || "—"}</p>
                        <p className="font-semibold text-white">{ch.after || "—"}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="gold" onClick={() => decide(c.slug, c.name, "approved")}>
                      <BadgeCheck className="size-4" /> اعتماد ونشر
                    </Button>
                    <Button size="sm" variant="glass" onClick={() => setRejecting(c.slug)}>
                      <X className="size-4" /> إعادة مع السبب
                    </Button>
                  </div>
                  <div className="mt-4">
                    <RecordHistory system="admins" refId={c.slug} />
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </Panel>

      {published.length > 0 && (
        <Panel icon={<BadgeCheck />} title="البرامج المنشورة" action={<Chip tone="green">{published.length}</Chip>}>
          <ul className="grid gap-3 md:grid-cols-2">
            {published.map(({ cluster: c, state }) => (
              <li key={c.slug} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="font-bold text-white">{c.name}</p>
                <p className="mt-1 text-xs text-white/65">
                  اعتمده {state!.approved!.approvedBy} — {fmtDateTime(state!.approved!.approvedAt)}
                </p>
                <p className="mt-1 text-xs text-white/50">كتبه {state!.approved!.by}</p>
                <Link href={`/verify/clusters/${c.slug}`} target="_blank" className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-gold">
                  <ExternalLink className="size-3.5" /> الصفحة كما يراها الحاج
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} className="max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        {rejecting && (
          <div>
            <p className="text-xs font-bold text-gold">إعادة البرنامج إلى رئيس التكتل</p>
            <h3 className="mt-1 font-display text-xl font-bold">{desk.programmes.find((x) => x.cluster.slug === rejecting)?.cluster.name}</h3>
            <p className="mt-1 text-sm leading-7 text-white/70">يصل السبب إليه ليعدّل ويعيد الإرسال. الصفحة تبقى على نسختها المعتمدة.</p>
            <div className="mt-4 space-y-2">
              {REASONS.map((r) => (
                <label key={r} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl p-3 text-sm font-semibold ring-1", reason === r ? "bg-gold/15 ring-gold/50" : "bg-white/5 ring-white/15")}>
                  <input type="radio" name="why" checked={reason === r} onChange={() => setReason(r)} className="accent-[#D9C89E]" /> {r}
                </label>
              ))}
              <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} aria-label="سبب الإعادة" className={textareaClass} />
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="gold" disabled={reason.trim().length < 5} onClick={() => decide(rejecting, desk.programmes.find((x) => x.cluster.slug === rejecting)?.cluster.name ?? "", "rejected", reason.trim())}>
                إعادة مع السبب
              </Button>
              <Button variant="glass" onClick={() => setRejecting(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
