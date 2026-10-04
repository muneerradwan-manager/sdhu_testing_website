"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Flag,
  GraduationCap,
  Paperclip,
  Receipt,
  Star,
  Building2,
  FileCheck2,
  FolderLock,
  Languages,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { clustersNow } from "@/lib/cms/content";
import { useSeason } from "@/lib/season-live";
import { POSITIONS, SKILLS, docState, levelOf, recordOf, resultOf } from "@/app/administrator/_lib/admin";
import { useDocTypes, useExamRules, useRoleRequirements } from "@/app/administrator/_lib/admin-rules";
import { useEvaluationStages } from "@/app/administrator/_lib/admin-rules";
import { clusterGroupsOf } from "@/app/administrator/_lib/cluster";

import { can } from "@/lib/staff";
import { actions } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { patchAdmin, roleLabel, useAdminRows, useAllEvents, type AdminRow } from "../_components/data";
import { Empty, fmtDateTime, Gate, Kpi, logAs, PageHeader, Panel, stamp, Tabs, textareaClass, useStaffUser } from "../_components/kit";

const round1 = (n: number) => Math.round(n * 10) / 10;

const CHIP = {
  green: "bg-green-light/25 text-white ring-green-light/50",
  gold: "bg-gold/20 text-gold ring-gold/40",
  maroon: "bg-maroon text-white ring-maroon-light",
} as const;

/** Status chip readable on the dark cards */
function Chip({ tone = "green", children }: { tone?: keyof typeof CHIP; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", CHIP[tone])}>{children}</span>;
}

type Tab = "groups" | "evaluate" | "files";

export function AdministratorsView() {
  return (
    <Gate perms={["administrators.manage", "groups.approve"]}>
      <Administrators />
    </Gate>
  );
}

function Administrators() {
  const rows = useAdminRows();
  const rules = useExamRules();
  const [tab, setTab] = useState<Tab>("groups");
  const groups = rows.filter((r) => r.profile.group);
  const pendingGroups = groups.filter((r) => !r.profile.group?.approvedAt).length;
  const approvedGroups = groups.length - pendingGroups;
  const passed = rows.filter((r) => resultOf(r.profile, rules).passed).length;

  return (
    <div>
      <PageHeader
        eyebrow="الجزء الثاني — الإداريون الموسميون"
        title="الإداريون والمجموعات"
        icon={<UsersRound />}
        description="بعد التأهيل: طلبات تشكيل المجموعات واعتمادها من مدير المكتب، وتقييم الإداريين مرحلةً مرحلة، وملفاتهم الدائمة. أما الامتحان ونتائجه وقواعده ففي «إدارة الامتحان»."
        actions={
          <ButtonLink href="/staff/exam" size="sm" variant="outline" className="border-white/25 text-white hover:bg-white/10">
            <GraduationCap className="size-4" /> إدارة الامتحان
          </ButtonLink>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="المتقدمون للعمل" value={1_380} icon={<UsersRound />} hint={`منهم ${rows.length} في هذه القائمة`} />
        <Kpi label="ناجحون في التأهيل" value={passed} icon={<GraduationCap />} tone="teal" delay={0.05} hint="يحق لهم تشكيل مجموعة أو الانضمام إلى فريق" />
        <Kpi label="طلبات تشكيل بانتظار الاعتماد" value={pendingGroups} icon={<ClipboardList />} tone="maroon" delay={0.1} pulse={pendingGroups > 0} />
        <Kpi label="مجموعات معتمدة" value={approvedGroups} icon={<BadgeCheck />} tone="gold" delay={0.15} />
      </div>

      <div className="mt-6">
        <Tabs
          id="admins"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "groups", label: "طلبات تشكيل المجموعات", count: groups.length },
            { value: "evaluate", label: "تقييم الإداريين" },
            { value: "files", label: "الملفات الدائمة" },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="mt-4">
          {tab === "groups" && <Groups rows={groups} />}
          {tab === "evaluate" && <Evaluate rows={rows} />}
          {tab === "files" && <Files rows={rows} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────── Groups ─────────────────────────

function Groups({ rows }: { rows: AdminRow[] }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const season = useSeason();
  const events = useAllEvents();
  const rules = useExamRules();
  const approve = can(user, "groups.approve");
  const manage = can(user, "administrators.manage");

  if (!rows.length) return <Empty icon={<ClipboardList />} title="لا توجد طلبات تشكيل" />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((r, i) => {
        const g = r.profile.group!;
        const cluster = clustersNow().find((c) => c.slug === g.clusterId);
        const reviewed = events.find((e) => e.action === "مراجعة طلب تشكيل مجموعة" && e.target === `المجموعة ${g.number} — ${r.name}`);
        const team = g.team ?? [];
        const checks = [
          { label: "الرئيس ناجح في التأهيل", ok: resultOf(r.profile, rules).passed || !!r.profile.examExempt },
          { label: `رسم التشكيل ${formatNumber(season.fees.groupFormation)} $`, ok: !!g.feePaidAt },
          { label: `اكتمال الفريق بدعوات فردية (${team.length} من 3)`, ok: team.length >= 3 },
          { label: "ميثاق الفريق (التكتل لاحقاً)", ok: true },
        ];
        const complete = checks.every((c) => c.ok);
        return (
          <Panel key={r.id} delay={i * 0.05}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-gold">{cluster?.name ?? "دون تكتل — يُنضم إليه بعد الانتخاب"}</p>
                <h3 className="font-display text-2xl font-bold text-white">المجموعة {g.number}</h3>
                <p className="text-sm text-white/90">
                  رئيسها: {r.name} · السعة {g.capacity} حاجاً
                </p>
              </div>
              {g.approvedAt ? <Chip tone="green"><BadgeCheck className="size-3.5" /> معتمدة</Chip> : <Chip tone="gold">بانتظار الاعتماد</Chip>}
            </div>
            <ul className="mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  {c.ok ? <CheckCircle2 className="size-4 shrink-0 text-green-light" /> : <AlertTriangle className="size-4 shrink-0 text-gold" />}
                  <span className={c.ok ? "text-white/90" : "font-bold text-gold"}>{c.label}</span>
                </li>
              ))}
            </ul>
            {team.length > 0 && (
              <ul className="mt-3 grid gap-1.5 text-xs sm:grid-cols-3">
                {team.map((t) => (
                  <li key={t.id} className="rounded-xl bg-white/5 px-2.5 py-2 ring-1 ring-white/10">
                    <span className="block text-white/60">{t.role}</span>
                    <span className="block truncate font-bold text-white">{t.name}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/75">
              <span>قُدّم {fmtDateTime(g.requestedAt)}</span>
              {g.feePaidAt && (
                <span className="flex items-center gap-1">
                  <Receipt className="size-3" /> 1448-G-{String(g.number).padStart(6, "0")}
                </span>
              )}
              {reviewed && <span className="font-bold text-gold">راجعه {reviewed.actor}</span>}
            </p>
            {g.approvedAt ? (
              <p className="mt-4 rounded-2xl bg-green-light/20 p-3 text-sm text-white ring-1 ring-green-light/40">
                اعتمدها {g.approvedBy} — {fmtDateTime(g.approvedAt)}
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {manage && !reviewed && (
                  <Button
                    size="sm"
                    variant="glass"
                    onClick={() => {
                      logAs(user, { action: "مراجعة طلب تشكيل مجموعة", target: `المجموعة ${g.number} — ${r.name}`, detail: complete ? "الطلب مكتمل — يُحال لمدير المكتب" : "ملاحظات: نواقص في الطلب" });
                      toast({ title: "سُجّلت المراجعة", body: "أُحيل الطلب إلى مدير المكتب للاعتماد.", tone: "info", icon: "📋" });
                    }}
                  >
                    <ClipboardList className="size-4" /> تأكيد اكتمال الطلب
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="gold"
                  disabled={!approve || !complete}
                  onClick={() => {
                    const at = Date.now();
                    patchAdmin(r, { group: { ...g, approvedAt: at, approvedBy: user.name } }, actions.upsertAdmin);
                    logAs(user, { action: "اعتماد مجموعة", target: `المجموعة ${g.number}${cluster ? ` — ${cluster.name}` : ""}`, after: `رئيسها ${r.name}` });
                    toast({ title: `اعتُمدت المجموعة ${g.number}`, body: "تُعلن في قائمة المجموعات المعتمدة، والعقود جاهزة للتوقيع.", tone: "success", icon: "🏅" });
                  }}
                >
                  <BadgeCheck className="size-4" /> اعتماد المجموعة
                </Button>
                {!approve && <span className="text-xs text-white/75">الاعتماد النهائي لمدير المكتب (مازن الحلبي).</span>}
                {approve && !complete && <span className="text-xs font-bold text-gold">لا يمكن الاعتماد قبل اكتمال الشروط.</span>}
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

// ───────────────────────── Evaluation ─────────────────────────

function Evaluate({ rows }: { rows: AdminRow[] }) {
  const [id, setId] = useState(rows[0]?.id ?? "");
  const row = rows.find((r) => r.id === id);
  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_1fr]">
      <Panel title="اختر إدارياً" icon={<UsersRound />} bodyClass="space-y-1.5">
        {rows.map((r) => (
          <button
            key={r.id}
            onClick={() => setId(r.id)}
            className={cn("relative flex w-full items-center gap-3 rounded-2xl p-2.5 text-right transition", r.id === id ? "text-ink" : "text-white hover:bg-white/10")}
          >
            {r.id === id && <motion.span layoutId="eval-pick" className="absolute inset-0 rounded-2xl bg-gold" />}
            <span className={cn("relative grid size-9 shrink-0 place-items-center rounded-xl font-bold", r.id === id ? "bg-ink/10 text-ink" : "bg-gold/20 text-gold ring-1 ring-gold/40")}>{r.name.replace("الشيخ ", "")[0]}</span>
            <span className="relative min-w-0">
              <span className="block truncate text-sm font-bold">{r.name}</span>
              <span className={cn("block text-xs", r.id === id ? "text-ink/75" : "text-white/75")}>{r.position}</span>
            </span>
          </button>
        ))}
      </Panel>
      {row && <EvaluationForm key={row.id} row={row} />}
    </div>
  );
}

/**
 * The administrator is evaluated stage by stage through the season, not once at the end: his work in
 * the airports is not his work in the camps. Every stage takes a score out of five, a note that
 * becomes mandatory under three, and a piece of evidence when the staff hold one — a photo or a
 * document from that stage. The administrator sees the average, never who scored him.
 */
function EvaluationForm({ row }: { row: AdminRow }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const events = useAllEvents();
  const stages = useEvaluationStages();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, string>>({});
  const [tried, setTried] = useState(false);
  const history = useMemo(() => events.filter((e) => e.action === "تقييم إداري" && e.target === row.name), [events, row.name]);

  const scored = stages.filter((st) => scores[st.key]);
  const missingNotes = stages.filter((st) => scores[st.key] && scores[st.key] < 3 && !(notes[st.key] ?? "").trim());
  const values = scored.map((st) => scores[st.key]);
  const avg = values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const allScored = scored.length === stages.length;
  const extreme = allScored && (values.every((v) => v === 5) || values.every((v) => v === 1)) && !Object.values(notes).some((n) => n.trim());

  const submit = () => {
    setTried(true);
    if (!scored.length || missingNotes.length) return;
    const detail = scored
      .map((st) => `${st.label}: ${scores[st.key]}${notes[st.key]?.trim() ? ` (${notes[st.key].trim()})` : ""}${files[st.key] ? ` [دليل: ${files[st.key]}]` : ""}`)
      .join(" · ");
    actions.setEvaluation(row.id, {
      avg,
      at: stamp(),
      by: user.name,
      stages: Object.fromEntries(scored.map((st) => [st.key, { score: scores[st.key], note: notes[st.key]?.trim() || undefined, file: files[st.key] }])),
    });
    logAs(user, {
      action: "تقييم إداري",
      target: row.name,
      after: `${avg} من 5 — ${scored.length} من ${stages.length} مراحل`,
      detail: detail + (extreme ? " — مُعلَّم للمراجعة: درجات متطرفة دون ملاحظة" : ""),
    });
    toast({
      title: "حُفظ التقييم",
      body: `${row.name}: ${avg} من 5 في ${scored.length} مراحل${extreme ? " — عُلّم للمراجعة" : ""}. يرى الإداري المتوسط فقط لا اسم المقيّم.`,
      tone: extreme ? "gold" : "success",
      icon: "⭐",
    });
    setScores({});
    setNotes({});
    setFiles({});
    setTried(false);
  };

  return (
    <Panel
      title={`تقييم ${row.name}`}
      icon={<Star />}
      action={
        <span className="flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-sm font-bold text-gold ring-1 ring-gold/40">
          المتوسط{" "}
          <motion.span key={avg} initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="font-display text-lg">
            {avg || "—"}
          </motion.span>
        </span>
      }
    >
      <p className="mb-4 text-sm leading-7 text-white/90">
        التقييم بالمراحل: درجة من 5 لكل مرحلة، والملاحظة إلزامية إذا كانت الدرجة أقل من 3. وإذا كان معك دليل من تلك المرحلة — صورة أو وثيقة — أرفقه معها.
        قيّم ما مرّ من مراحل واترك الباقي إلى حينه.
      </p>
      <ul className="space-y-3">
        {stages.map((st) => {
          const v = scores[st.key] ?? 0;
          const needNote = v > 0 && v < 3;
          return (
            <li key={st.key} className={cn("rounded-2xl p-3 ring-1 transition", tried && needNote && !(notes[st.key] ?? "").trim() ? "bg-maroon/40 ring-gold/50" : "bg-white/[.06] ring-white/10")}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-semibold text-white">{st.label}</span>
                  <span className="block text-xs text-white/60">{st.hint}</span>
                </span>
                <div className="flex gap-1" role="radiogroup" aria-label={st.label}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <motion.button
                      key={n}
                      role="radio"
                      aria-checked={v === n}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setScores((x) => ({ ...x, [st.key]: n }))}
                      className={cn(
                        "grid size-9 place-items-center rounded-xl text-sm font-bold transition",
                        v === n
                          ? n < 3
                            ? "bg-maroon text-white ring-2 ring-gold/60"
                            : n === 3
                              ? "bg-gold text-ink"
                              : "bg-green-light text-white"
                          : v > n
                            ? "bg-gold/30 text-white"
                            : "bg-white/10 text-white/90 ring-1 ring-white/15 hover:ring-gold/60",
                      )}
                    >
                      {n}
                    </motion.button>
                  ))}
                </div>
              </div>
              <AnimatePresence>
                {v > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <textarea
                      rows={2}
                      value={notes[st.key] ?? ""}
                      onChange={(e) => setNotes((x) => ({ ...x, [st.key]: e.target.value }))}
                      placeholder={needNote ? "ملاحظة إلزامية: ما الذي حدث في هذه المرحلة؟" : "ملاحظة (اختيارية)"}
                      aria-label={`ملاحظة ${st.label}`}
                      className={cn(textareaClass, "mt-2 text-sm", tried && needNote && !(notes[st.key] ?? "").trim() && "border-gold")}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {files[st.key] ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-light/20 px-3 py-1 text-xs font-bold text-white ring-1 ring-green-light/40">
                            <Paperclip className="size-3.5" /> {files[st.key]}
                          </span>
                          <button type="button" onClick={() => setFiles((x) => { const n = { ...x }; delete n[st.key]; return n; })} className="text-xs font-bold text-white/60 hover:text-white" aria-label={`إزالة دليل ${st.label}`}>
                            إزالة
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setFiles((x) => ({ ...x, [st.key]: `${st.key}-${row.id.slice(-4)}.jpg` }))}
                          aria-label={`إرفاق دليل ${st.label}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/85 ring-1 ring-white/15 transition hover:ring-gold/60"
                        >
                          <Paperclip className="size-3.5" /> إرفاق دليل — صورة أو وثيقة
                        </button>
                      )}
                      {needNote && !files[st.key] && <span className="text-xs text-gold">درجة منخفضة: الدليل يقوّي الملاحظة.</span>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
      {extreme && (
        <p className="mt-3 flex items-center gap-2 rounded-2xl bg-gold/20 p-3 text-sm font-bold text-gold ring-1 ring-gold/40">
          <Flag className="size-4" /> درجات متطرفة في كل المراحل دون ملاحظة — سيُعلَّم التقييم للمراجعة.
        </p>
      )}
      {tried && (!scored.length || missingNotes.length > 0) && (
        <p className="mt-3 text-sm font-bold text-gold">{!scored.length ? "قيّم مرحلة واحدة على الأقل." : "اكتب ملاحظة لكل درجة أقل من 3."}</p>
      )}
      <Button variant="gold" className="mt-4" onClick={submit}>
        <CheckCircle2 className="size-4" /> حفظ التقييم
      </Button>

      {history.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-4">
          <h4 className="mb-2 font-bold text-gold">تقييمات سابقة</h4>
          <ul className="space-y-2 text-sm">
            {history.map((e) => (
              <li key={e.id} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
                <p className="flex justify-between gap-2 font-bold text-white">
                  <span>
                    {e.actor} — {e.after}
                  </span>
                  <span className="text-xs font-normal text-white/75">{fmtDateTime(e.at)}</span>
                </p>
                <p className="mt-1 text-xs leading-5 text-white/90">{e.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

// ───────────────────────── The permanent files ─────────────────────────

/**
 * The administrator is told his documents are reviewed by the administrators' affairs desk, so the
 * desk has to see them: his permanent file with every document, its issuing season and whether it is
 * still valid under this season's settings, beside his languages and skills.
 */
function Files({ rows }: { rows: AdminRow[] }) {
  const season = useSeason();
  const [id, setId] = useState(rows[0]?.id ?? "");
  const row = rows.find((r) => r.id === id);
  const record = row ? recordOf(row.profile, row.id) : null;
  const expired = record?.documents.filter((d) => !docState(d, undefined, season.documents).ok) ?? [];
  // What his role requires in the season's table and his file does not have
  const table = useRoleRequirements();
  const { types } = useDocTypes();
  const role = POSITIONS.find((x) => x.key === row?.profile.positions[0] || x.label === row?.profile.positions[0])?.key ?? "";
  const missing = row ? types.filter((d) => levelOf(table, role, `doc:${d.key}`) === "required" && !record?.documents.some((x) => x.key === d.key)) : [];

  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_1fr]">
      <Panel title="اختر إدارياً" icon={<UsersRound />} bodyClass="space-y-1.5">
        {rows.map((r) => (
          <button
            key={r.id}
            onClick={() => setId(r.id)}
            className={cn("relative flex w-full items-center gap-3 rounded-2xl p-2.5 text-right transition", r.id === id ? "text-ink" : "text-white hover:bg-white/10")}
          >
            {r.id === id && <motion.span layoutId="file-pick" className="absolute inset-0 rounded-2xl bg-gold" />}
            <span className={cn("relative grid size-9 shrink-0 place-items-center rounded-xl font-bold", r.id === id ? "bg-ink/10 text-ink" : "bg-gold/20 text-gold ring-1 ring-gold/40")}>{r.name.replace("الشيخ ", "")[0]}</span>
            <span className="relative min-w-0">
              <span className="block truncate text-sm font-bold">{r.name}</span>
              <span className={cn("block truncate text-xs", r.id === id ? "text-ink/75" : "text-white/75")}>{roleLabel(r)}</span>
            </span>
          </button>
        ))}
      </Panel>

      {row && record && (
        <div className="space-y-4">
          <Panel
            icon={<FolderLock />}
            title={`الملف الدائم — ${row.name}`}
            action={<Chip tone={expired.length ? "maroon" : "green"}>{expired.length ? `${expired.length} وثيقة منتهية` : "كل الوثائق سارية"}</Chip>}
          >
            <p className="text-sm leading-7 text-white/70">
              الحساب دائم، فوثائق الإداري تبقى بين المواسم وتُرفق بطلبه ما دامت سارية. مدة صلاحية كل نوع من إعدادات الموسم، وما انتهى يُطلب منه تحديثه وحده.
            </p>
            <ul className="mt-4 space-y-2">
              {record.documents.length === 0 && <li className="rounded-2xl bg-white/5 p-4 text-sm text-white/60">لا وثائق في ملفه بعد.</li>}
              {record.documents.map((d) => {
                const st = docState(d, undefined, season.documents);
                return (
                  <li key={d.id} className={cn("flex flex-wrap items-center gap-3 rounded-2xl p-3 ring-1", st.ok ? "bg-white/5 ring-white/10" : "bg-maroon/20 ring-maroon/40")}>
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", st.ok ? "bg-green-light/20 text-green-light" : "bg-maroon/40 text-white")}>
                      <FileCheck2 className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-bold text-white">
                        {d.label}
                        {d.key === "custom" && <Chip>أضافها بنفسه</Chip>}
                      </span>
                      <span className="block text-xs text-white/60">
                        <span dir="ltr" className="font-mono">{d.file}</span> — نسخة موسم {d.issuedSeason}
                      </span>
                    </span>
                    <Chip tone={st.ok ? "green" : "maroon"}>{st.text}</Chip>
                  </li>
                );
              })}
            </ul>
            {missing.length > 0 && (
              <p className="mt-4 rounded-2xl bg-gold/15 p-3 text-sm text-gold ring-1 ring-gold/30">
                ينقص ملفه مما تطلبه صفته: {missing.map((d) => d.label).join("، ")}
              </p>
            )}
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel icon={<Languages />} title="اللغات">
              <div className="flex flex-wrap gap-2">
                {record.languages.length === 0 && <span className="text-sm text-white/60">لم يسجّل لغات.</span>}
                {record.languages.map((l) => (
                  <Chip key={l} tone="green">{l}</Chip>
                ))}
              </div>
            </Panel>
            <Panel icon={<Sparkles />} title="المهارات">
              <div className="flex flex-wrap gap-2">
                {record.skills.length === 0 && <span className="text-sm text-white/60">لم يسجّل مهارات.</span>}
                {record.skills.map((k) => (
                  <Chip key={k}>{SKILLS.find((x) => x.key === k)?.label ?? k}</Chip>
                ))}
              </div>
            </Panel>
          </div>

          {(row.profile.cluster || row.profile.deputyOf) && (
            <Panel icon={<Building2 />} title="موقعه في التكتل">
              <p className="text-sm leading-7 text-white/80">
                {row.profile.cluster
                  ? `انتخبه رؤساء المجموعات رئيساً لـ${row.profile.cluster.name}، فصارت صفته على مستوى التكتل ويدير ${clusterGroupsOf(row.profile, row.name).length} مجموعات، ومعاونه ${row.profile.cluster.deputyName ?? "لم يُختر"}.`
                  : `اختاره رئيس ${row.profile.deputyOf!.clusterName} ${row.profile.deputyOf!.headName} معاوناً له، فصارت صفته على مستوى التكتل.`}
              </p>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
