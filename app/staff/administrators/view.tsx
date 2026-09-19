"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Flag,
  GraduationCap,
  Lock,
  Megaphone,
  PencilLine,
  Receipt,
  Star,
  UsersRound,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { CLUSTERS } from "@/lib/data/clusters";
import { EVALUATION_ITEMS } from "@/lib/data/staff-seed";
import { can } from "@/lib/staff";
import { actions } from "@/lib/store";
import { cn, formatNumber, maskNationalId } from "@/lib/utils";
import { patchAdmin, useAdminRows, useAllEvents, type AdminRow } from "../_components/data";
import { Empty, fmtDateTime, Gate, Kpi, logAs, Meter, PageHeader, Panel, smallInputClass, stamp, Tabs, textareaClass, useStaffUser } from "../_components/kit";

const PASS = 70;
const round1 = (n: number) => Math.round(n * 10) / 10;
const finalOf = (written: number | undefined, oral: number) => (written === undefined ? oral : round1(written * 0.6 + oral * 0.4));

const CHIP = {
  green: "bg-green-light/25 text-white ring-green-light/50",
  gold: "bg-gold/20 text-gold ring-gold/40",
  maroon: "bg-maroon text-white ring-maroon-light",
} as const;

/** Status chip readable on the dark cards */
function Chip({ tone = "green", children }: { tone?: keyof typeof CHIP; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", CHIP[tone])}>{children}</span>;
}

type Tab = "exams" | "groups" | "evaluate";

export function AdministratorsView() {
  return (
    <Gate perms={["administrators.manage", "groups.approve"]}>
      <Administrators />
    </Gate>
  );
}

function Administrators() {
  const rows = useAdminRows();
  const [tab, setTab] = useState<Tab>("exams");
  const groups = rows.filter((r) => r.profile.group);
  const pendingGroups = groups.filter((r) => !r.profile.group?.approvedAt).length;
  const awaitingOral = rows.filter((r) => !r.profile.oral && (r.profile.exam?.score !== undefined || r.previous)).length;
  const passed = rows.filter((r) => (r.profile.finalScore ?? 0) >= PASS).length;

  return (
    <div>
      <PageHeader
        eyebrow="الجزء الثاني — الإداريون الموسميون"
        title="الإداريون والمجموعات"
        icon={<UsersRound />}
        description="الامتحان الكتابي على المنصة (60%)، والشفهي أمام اللجان خارجها (40%) وتُدخل نتيجته هنا. الحد الأدنى للنجاح 70. ثم طلبات تشكيل المجموعات واعتمادها من مدير المكتب."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="المتقدمون للعمل" value={1_380} icon={<UsersRound />} hint={`منهم ${rows.length} في هذه القائمة`} />
        <Kpi label="بانتظار الشفهي" value={awaitingOral} icon={<PencilLine />} tone="gold" delay={0.05} pulse={awaitingOral > 0} />
        <Kpi label="ناجحون في القائمة" value={passed} icon={<GraduationCap />} tone="teal" delay={0.1} />
        <Kpi label="طلبات تشكيل بانتظار الاعتماد" value={pendingGroups} icon={<ClipboardList />} tone="maroon" delay={0.15} />
      </div>

      <div className="mt-6">
        <Tabs
          id="admins"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "exams", label: "الامتحانات والنتائج", count: rows.length },
            { value: "groups", label: "طلبات تشكيل المجموعات", count: groups.length },
            { value: "evaluate", label: "تقييم الإداريين" },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="mt-4">
          {tab === "exams" && <Exams rows={rows} />}
          {tab === "groups" && <Groups rows={groups} />}
          {tab === "evaluate" && <Evaluate rows={rows} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────── Exams ─────────────────────────

function Exams({ rows }: { rows: AdminRow[] }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const manage = can(user, "administrators.manage");
  const [editing, setEditing] = useState<AdminRow | null>(null);

  const publish = (r: AdminRow) => {
    patchAdmin(r, { resultPublishedAt: stamp() }, actions.upsertAdmin);
    logAs(user, { action: "اعتماد وإعلان نتيجة التأهيل", target: r.name, after: `${r.profile.finalScore} — ${(r.profile.finalScore ?? 0) >= PASS ? "ناجح" : "غير ناجح"}` });
    toast({ title: `أُعلنت نتيجة ${r.name.split(" ")[0]}`, body: "وصل الإشعار إلى المتقدم.", tone: "success", icon: "📣" });
  };

  return (
    <>
      <Panel bodyClass="space-y-3">
        {!manage && (
          <p className="flex items-center gap-2 rounded-2xl bg-white/[.06] p-3 text-sm text-white/90 ring-1 ring-white/10">
            <Lock className="size-4 text-gold" /> عرض فقط — إدخال نتائج الشفهي من صلاحية شؤون الإداريين.
          </p>
        )}
        {rows.map((r, i) => {
          const written = r.profile.exam?.score;
          const oral = r.profile.oral?.score;
          const final = r.profile.finalScore;
          const pass = final !== undefined && final >= PASS;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="grid gap-4 rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10 transition hover:bg-white/[.09] hover:ring-gold/40 md:grid-cols-[1.4fr_1fr_1fr_1.1fr_auto] md:items-center"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/20 font-display text-lg font-bold text-gold ring-1 ring-gold/40">{r.name.replace("الشيخ ", "")[0]}</span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 font-bold text-white">
                    {r.name}
                    {!r.seed && <Chip tone="gold">من بوابة الإداريين</Chip>}
                  </p>
                  <p className="text-xs text-white/75">
                    {r.position} · <span dir="ltr">{maskNationalId(r.id)}</span>
                  </p>
                  {r.previous && <p className="text-[11px] text-gold">{r.previous}</p>}
                </div>
              </div>
              <ScoreCell label="الكتابي ×60%" value={written} empty={r.previous ? "معفى" : r.profile.exam?.submittedAt ? "قيد التصحيح" : "لم يُقدَّم"} />
              <ScoreCell label="الشفهي ×40%" value={oral} empty="بانتظار اللجنة" />
              <div>
                <p className="text-[11px] text-white/75">النتيجة النهائية</p>
                {final !== undefined ? (
                  <>
                    <p className={cn("flex items-center gap-2 font-display text-2xl font-bold tabular-nums", pass ? "text-white" : "text-gold")}>
                      {final}
                      <Chip tone={pass ? "green" : "maroon"}>{pass ? "ناجح" : "دون 70"}</Chip>
                    </p>
                    <Meter value={final} tone={pass ? "teal" : "gold"} className="mt-1" />
                  </>
                ) : (
                  <p className="text-sm text-white/75">—</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                {manage && (written !== undefined || r.previous) && (
                  <Button size="sm" variant={oral === undefined ? "gold" : "glass"} onClick={() => setEditing(r)}>
                    <PencilLine className="size-4" /> {oral === undefined ? "إدخال الشفهي" : "تعديل"}
                  </Button>
                )}
                {manage && final !== undefined && !r.profile.resultPublishedAt && (
                  <Button size="sm" variant="gold" onClick={() => publish(r)}>
                    <Megaphone className="size-4" /> إعلان
                  </Button>
                )}
                {r.profile.resultPublishedAt && <Chip tone="green"><CheckCircle2 className="size-3" /> أُعلنت {fmtDateTime(r.profile.resultPublishedAt)}</Chip>}
              </div>
            </motion.div>
          );
        })}
      </Panel>
      {/* outside the Panel: its backdrop-blur would trap the fixed overlay inside the card */}
      <OralModal row={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function ScoreCell({ label, value, empty }: { label: string; value?: number; empty: string }) {
  return (
    <div>
      <p className="text-[11px] text-white/75">{label}</p>
      {value !== undefined ? <p className="font-display text-xl font-bold tabular-nums text-white">{value}</p> : <p className="text-sm text-gold">{empty}</p>}
    </div>
  );
}

function OralModal({ row, onClose }: { row: AdminRow | null; onClose: () => void }) {
  return (
    <Modal open={!!row} onClose={onClose} className="max-w-xl border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
      {row && <OralForm key={row.id} row={row} onClose={onClose} />}
    </Modal>
  );
}

function OralForm({ row, onClose }: { row: AdminRow; onClose: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const prev = row.profile.oral;
  const written = row.profile.exam?.score;
  const [score, setScore] = useState(prev?.score ?? 80);
  const [committee, setCommittee] = useState("3");
  const [note, setNote] = useState(prev?.note ?? "");
  const [reason, setReason] = useState("");
  const final = finalOf(written, score);
  const pass = final >= PASS;
  const needsReason = !!prev && prev.score !== score;

  const save = () => {
    if (needsReason && reason.trim().length < 5) {
      toast({ title: "اكتب سبب التعديل", body: "كل تعديل على نتيجة مدخلة يُسجَّل مع السبب.", tone: "warning", icon: "✍️" });
      return;
    }
    patchAdmin(row, { oral: { score, by: user.name, at: Date.now(), note: note.trim() || undefined }, finalScore: final, resultPublishedAt: undefined }, actions.upsertAdmin);
    logAs(user, {
      action: prev ? "تعديل نتيجة الشفهي" : "إدخال نتيجة الشفهي",
      target: row.name,
      before: prev ? `${prev.score} من 100` : undefined,
      after: `${score} من 100 — النهائية ${final}`,
      detail: [`اللجنة رقم ${committee}`, note.trim(), needsReason ? `السبب: ${reason.trim()}` : ""].filter(Boolean).join(" — "),
    });
    toast({ title: "حُفظت نتيجة الشفهي", body: `${row.name}: ${final} — ${pass ? "ناجح" : "دون الحد الأدنى"}. لا تظهر للمتقدم قبل الإعلان.`, tone: pass ? "success" : "gold", icon: pass ? "🎓" : "📝" });
    onClose();
  };

  return (
    <div>
      <p className="text-xs font-bold text-gold">الامتحان الشفهي — خارج المنصة، ونتيجته على المنصة</p>
      <h3 className="mt-1 font-display text-xl font-bold text-white">{row.name}</h3>
      <p className="text-sm text-white/75">{row.position}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_7rem]">
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-white">درجة الشفهي (0 – 100)</span>
          <input type="range" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-full accent-[#D9C89E]" style={{ direction: "ltr" }} aria-label="درجة الشفهي" />
          <span className="text-xs text-white/75">تعادل {round1(score / 5)} من 20 على ورقة اللجنة</span>
        </label>
        <input type="number" min={0} max={100} value={score} onChange={(e) => setScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className={cn(smallInputClass, "h-14 text-center font-display text-2xl font-bold")} dir="ltr" aria-label="درجة الشفهي رقماً" />
      </div>

      <div className="mt-4 rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
        <div className="grid grid-cols-3 items-center gap-2 text-center text-sm">
          <div>
            <p className="text-[11px] text-white/75">الكتابي</p>
            <p className="font-bold tabular-nums text-white">{written === undefined ? "معفى" : `${written} × 60% = ${round1(written * 0.6)}`}</p>
          </div>
          <div>
            <p className="text-[11px] text-white/75">الشفهي</p>
            <p className="font-bold tabular-nums text-white">{written === undefined ? `${score} × 100%` : `${score} × 40% = ${round1(score * 0.4)}`}</p>
          </div>
          <div>
            <p className="text-[11px] text-white/75">النهائية</p>
            <motion.p key={final} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className={cn("font-display text-3xl font-bold tabular-nums", pass ? "text-white" : "text-gold")}>
              {final}
            </motion.p>
          </div>
        </div>
        <div className="relative mt-3">
          <Meter value={final} tone={pass ? "teal" : "gold"} className="h-3" />
          <span className="absolute -top-1 h-5 w-0.5 bg-white" style={{ right: `${PASS}%` }} title="الحد الأدنى 70" />
        </div>
        <p className="mt-3 text-center">
          <Chip tone={pass ? "green" : "maroon"}>{pass ? "ناجح — مرشّح للصفة" : "دون الحد الأدنى للنجاح (70)"}</Chip>
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[8rem_1fr]">
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-white">اللجنة</span>
          <select value={committee} onChange={(e) => setCommittee(e.target.value)} className={cn(smallInputClass, "[&>option]:text-ink")}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                رقم {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-white">ملاحظات اللجنة</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="قوي في السيناريوهات الميدانية..." className={smallInputClass} />
        </label>
      </div>
      {needsReason && (
        <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 block">
          <span className="mb-1 block text-sm font-bold text-gold">سبب تعديل الدرجة ({prev?.score} ← {score})</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: خطأ في الجمع — تصويب اللجنة" className={smallInputClass} />
        </motion.label>
      )}
      <div className="mt-5 flex gap-2">
        <Button variant="gold" onClick={save}>
          <CheckCircle2 className="size-4" /> حفظ النتيجة
        </Button>
        <Button variant="glass" onClick={onClose}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────── Groups ─────────────────────────

function Groups({ rows }: { rows: AdminRow[] }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const events = useAllEvents();
  const approve = can(user, "groups.approve");
  const manage = can(user, "administrators.manage");

  if (!rows.length) return <Empty icon={<ClipboardList />} title="لا توجد طلبات تشكيل" />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((r, i) => {
        const g = r.profile.group!;
        const cluster = CLUSTERS.find((c) => c.slug === g.clusterId);
        const reviewed = events.find((e) => e.action === "مراجعة طلب تشكيل مجموعة" && e.target === `المجموعة ${g.number} — ${r.name}`);
        const checks = [
          { label: "الرئيس ناجح في التأهيل", ok: (r.profile.finalScore ?? 0) >= PASS },
          { label: `رسم التشكيل ${formatNumber(200)} $`, ok: !!g.feePaidAt },
          { label: "اكتمال الفريق (معاون، موجّه، منسق)", ok: true },
          { label: "موافقة رئيس التكتل", ok: true },
        ];
        const complete = checks.every((c) => c.ok);
        return (
          <Panel key={r.id} delay={i * 0.05}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-gold">{cluster?.name ?? g.clusterId}</p>
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
                    logAs(user, { action: "اعتماد مجموعة", target: `المجموعة ${g.number} — ${cluster?.name ?? g.clusterId}`, after: `رئيسها ${r.name}` });
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

function EvaluationForm({ row }: { row: AdminRow }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const events = useAllEvents();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tried, setTried] = useState(false);
  const history = useMemo(() => events.filter((e) => e.action === "تقييم إداري" && e.target === row.name), [events, row.name]);

  const allScored = EVALUATION_ITEMS.every((it) => scores[it]);
  const missingNotes = EVALUATION_ITEMS.filter((it) => scores[it] && scores[it] < 3 && !(notes[it] ?? "").trim());
  const values = EVALUATION_ITEMS.map((it) => scores[it]).filter(Boolean);
  const avg = values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const extreme = allScored && (values.every((v) => v === 5) || values.every((v) => v === 1)) && !Object.values(notes).some((n) => n.trim());

  const submit = () => {
    setTried(true);
    if (!allScored || missingNotes.length) return;
    logAs(user, {
      action: "تقييم إداري",
      target: row.name,
      after: `${avg} من 5`,
      detail: EVALUATION_ITEMS.map((it) => `${it}: ${scores[it]}${notes[it]?.trim() ? ` (${notes[it].trim()})` : ""}`).join(" · ") + (extreme ? " — مُعلَّم للمراجعة: درجات متطرفة دون ملاحظة" : ""),
    });
    toast({ title: "حُفظ التقييم", body: `${row.name}: ${avg} من 5${extreme ? " — عُلّم للمراجعة" : ""}. يرى الإداري المتوسط فقط لا اسم المقيّم.`, tone: extreme ? "gold" : "success", icon: "⭐" });
    setScores({});
    setNotes({});
    setTried(false);
  };

  return (
    <Panel
      title={`تقييم ${row.name}`}
      icon={<Star />}
      action={
        <span className="flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-sm font-bold text-gold ring-1 ring-gold/40">
          المتوسط <motion.span key={avg} initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="font-display text-lg">{avg || "—"}</motion.span>
        </span>
      }
    >
      <p className="mb-4 text-sm text-white/90">درجة من 5 لكل بند — الملاحظة إلزامية إذا كانت الدرجة أقل من 3.</p>
      <ul className="space-y-3">
        {EVALUATION_ITEMS.map((it) => {
          const v = scores[it] ?? 0;
          const needNote = v > 0 && v < 3;
          return (
            <li key={it} className={cn("rounded-2xl p-3 ring-1 transition", tried && !v ? "bg-maroon/40 ring-gold/50" : "bg-white/[.06] ring-white/10")}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold text-white">{it}</span>
                <div className="flex gap-1" role="radiogroup" aria-label={it}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <motion.button
                      key={n}
                      role="radio"
                      aria-checked={v === n}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setScores((s) => ({ ...s, [it]: n }))}
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
                {needNote && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <textarea
                      rows={2}
                      value={notes[it] ?? ""}
                      onChange={(e) => setNotes((x) => ({ ...x, [it]: e.target.value }))}
                      placeholder="ملاحظة إلزامية: ما الذي حدث؟"
                      className={cn(textareaClass, "mt-2 text-sm", tried && !(notes[it] ?? "").trim() && "border-gold")}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
      {extreme && (
        <p className="mt-3 flex items-center gap-2 rounded-2xl bg-gold/20 p-3 text-sm font-bold text-gold ring-1 ring-gold/40">
          <Flag className="size-4" /> درجات متطرفة في كل البنود دون ملاحظة — سيُعلَّم التقييم للمراجعة.
        </p>
      )}
      {tried && (!allScored || missingNotes.length > 0) && <p className="mt-3 text-sm font-bold text-gold">قيّم كل البنود، واكتب ملاحظة لكل درجة أقل من 3.</p>}
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
                  <span>{e.actor} — {e.after}</span>
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
