"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  Bus,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  HeartPulse,
  Luggage,
  MapPin,
  MessageSquarePlus,
  Plus,
  RadioTower,
  Search,
  Siren,
  Smartphone,
  Tent,
  Thermometer,
  TriangleAlert,
  UserRoundSearch,
  Users,
  Utensils,
} from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { KIND_LABELS, SEED_TASKS, SLA_MINUTES, type TaskColumn, type Zone } from "@/lib/data/staff-seed";
import { actions, useStore, type Ticket } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ensureTicket, toTicket, useAllEvents, useTicketQueue, type QueueTicket } from "../_components/data";
import { ago, Drawer, fmtTime, Gate, Kpi, logAs, PageHeader, Panel, smallInputClass, Tabs, textareaClass, useNow, useStaffUser } from "../_components/kit";

// ───────────────────────── Helpers ─────────────────────────

const KIND_ICON: Record<Ticket["kind"], ReactNode> = {
  missing: <UserRoundSearch />,
  health: <HeartPulse />,
  transport: <Bus />,
  meal: <Utensils />,
  room: <Tent />,
  lost: <Luggage />,
  complaint: <ClipboardList />,
};

/** Severity styles for the dark room — brand palette only, each level still distinct at a glance */
const SEVERITY = {
  critical: { label: "حرجة", dot: "bg-maroon ring-2 ring-white", chip: "bg-maroon text-white ring-1 ring-white/30", icon: "bg-maroon text-white ring-white/40", hex: "#672146", stroke: "#FFFFFF" },
  high: { label: "عالية", dot: "bg-maroon-light ring-1 ring-gold-light/80", chip: "bg-maroon-light/70 text-white", icon: "bg-maroon-light/70 text-white ring-white/20", hex: "#7A2631", stroke: "#E4DDD3" },
  medium: { label: "متوسطة", dot: "bg-gold", chip: "bg-gold/25 text-gold", icon: "bg-gold/20 text-gold ring-gold/40", hex: "#D9C89E", stroke: "#012a25" },
  low: { label: "منخفضة", dot: "bg-green-light", chip: "bg-white/10 text-white/85", icon: "bg-green-light/20 text-white ring-green-light/40", hex: "#289E92", stroke: "#012a25" },
} as const;

function Chip({ className, children }: { className: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", className)}>{children}</span>;
}

const STATUS_LABEL: Record<Ticket["status"], string> = { open: "مفتوح", in_progress: "قيد المعالجة", resolved: "مغلق" };

const ASSIGNEES = ["د. ليلى شمس — الفريق الطبي", "هيثم زيدان — المواصلات", "فادي سلوم — غرفة العمليات", "الفريق الميداني للتكتل", "مشرف الإعاشة", "أحمد الحمصي — رئيس المجموعة 27"];

function sla(t: QueueTicket, now: number) {
  const target = SLA_MINUTES[t.kind];
  const elapsed = (now - t.at) / 60000;
  if (t.status === "resolved") return { tone: "done" as const, text: "مغلق", pct: 1 };
  if (target === 0) return { tone: "late" as const, text: `فوري — مضى ${Math.floor(elapsed)} د`, pct: 1 };
  const left = target - elapsed;
  if (left <= 0) return { tone: "late" as const, text: `متأخر ${Math.ceil(-left)} د`, pct: 1 };
  const mm = Math.floor(left);
  const ss = Math.floor((left - mm) * 60);
  return { tone: left < target * 0.3 ? ("warn" as const) : ("ok" as const), text: `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`, pct: elapsed / target };
}

/** A critical incident not closed within 15 minutes is escalated to the central room */
const escalated = (t: QueueTicket, now: number) => t.severity === "critical" && t.status !== "resolved" && now - t.at > 15 * 60000;

// ───────────────────────── Page ─────────────────────────

export function OperationsView() {
  return (
    <Gate perms={["operations.room"]}>
      <Operations />
    </Gate>
  );
}

type Filter = "active" | "open" | "in_progress" | "resolved";

function Operations() {
  const now = useNow(1000);
  const tickets = useTicketQueue();
  const [filter, setFilter] = useState<Filter>("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);

  const active = tickets.filter((t) => t.status !== "resolved");
  const bySeverity = (s: Ticket["severity"]) => active.filter((t) => t.severity === s).length;
  const missing = active.filter((t) => t.kind === "missing").length;
  const clinic = active.filter((t) => t.kind === "health").length;

  const list = tickets.filter((t) => {
    if (zone && t.zone !== zone) return false;
    if (filter === "active") return t.status !== "resolved";
    return t.status === filter;
  });
  const open = tickets.find((t) => t.id === openId) ?? null;
  const close = useCallback(() => setOpenId(null), []);

  return (
    <div>
      <PageHeader
        eyebrow="تكتل النور — 9 ذو الحجة 1448"
        title={
          <span className="flex flex-wrap items-center gap-3">
            غرفة العمليات — يوم عرفة
            <span className="flex items-center gap-2 rounded-full bg-maroon px-3 py-1 text-sm font-bold text-white ring-1 ring-white/25">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-white" />
                <span className="relative size-2 rounded-full bg-white" />
              </span>
              مباشر
            </span>
          </span>
        }
        icon={<RadioTower />}
        description="لا تُتتبّع نقطة متحركة لكل حاج، بل آخر حدث مسجّل له — أوفر للبطارية وأحفظ للخصوصية. كل قرار هنا يُسجَّل باسمك في سجل المناوبة."
        actions={
          <span className="rounded-2xl bg-black/25 px-4 py-2 font-display text-2xl font-bold tabular-nums text-gold ring-1 ring-white/10" dir="ltr">
            {fmtTime(now, true)}
          </span>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="الحجاج في عرفة" value={601} icon={<Users />} hint="من 604 — 3 في العيادة الميدانية" />
        <Kpi label="بلاغات مفتوحة" value={active.length} icon={<Siren />} tone="maroon" pulse={bySeverity("critical") > 0} delay={0.05} hint={
          <span className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-maroon px-1.5 font-bold text-white">حرجة {bySeverity("critical")}</span>
            <span className="rounded-full bg-maroon-light/70 px-1.5 font-bold text-white">عالية {bySeverity("high")}</span>
            <span className="rounded-full bg-gold/20 px-1.5 font-bold text-gold">أخرى {bySeverity("medium") + bySeverity("low")}</span>
          </span>
        } />
        <Kpi label="حالات صحية نشطة" value={clinic} icon={<HeartPulse />} tone="maroon" delay={0.1} hint="إجهاد حراري" />
        <Kpi label="مفقودون" value={missing} icon={<UserRoundSearch />} tone="gold" delay={0.15} pulse={missing > 0} hint={missing ? "أولوية قصوى — استجابة فورية" : "لا يوجد"} />
        <BusKpi />
        <Kpi label="الحرارة في عرفة" value={41} suffix="°" icon={<Thermometer />} tone="gold" delay={0.25} hint="ذروة 15:00 — رشّ رذاذ الماء" />
      </div>

      <div className="mt-6 grid gap-6 2xl:grid-cols-[1.35fr_1fr]">
        <Panel title="خريطة المشاعر — البلاغات الحية" icon={<MapPin />} delay={0.1} action={
          zone && (
            <button onClick={() => setZone(null)} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 ring-1 ring-white/15 hover:bg-white/20 hover:ring-gold/40">
              عرض كل المناطق
            </button>
          )
        }>
          <MashaerMap tickets={active} zone={zone} onZone={setZone} onOpen={setOpenId} now={now} />
        </Panel>

        <Panel title="طابور البلاغات" icon={<Siren />} delay={0.15} bodyClass="space-y-3">
          <Tabs
            id="ops-filter"
            value={filter}
            onChange={setFilter}
            tabs={[
              { value: "active", label: "النشطة", count: active.length },
              { value: "open", label: "مفتوح", count: tickets.filter((t) => t.status === "open").length },
              { value: "in_progress", label: "قيد المعالجة", count: tickets.filter((t) => t.status === "in_progress").length },
              { value: "resolved", label: "مغلق", count: tickets.filter((t) => t.status === "resolved").length },
            ]}
          />
          <motion.ul layout className="scrollbar-none max-h-[34rem] space-y-2 overflow-y-auto pl-1">
            <AnimatePresence initial={false}>
              {list.map((t) => (
                <motion.li key={t.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <TicketRow t={t} now={now} onOpen={() => setOpenId(t.id)} />
                </motion.li>
              ))}
            </AnimatePresence>
            {list.length === 0 && <li className="rounded-2xl bg-white/[.06] p-6 text-center text-sm text-white/80 ring-1 ring-white/10">لا توجد بلاغات في هذا التصنيف.</li>}
          </motion.ul>
          <p className="flex items-center gap-2 text-xs leading-5 text-white/75">
            <TriangleAlert className="size-3.5 shrink-0 text-gold" /> تصعيد تلقائي: البلاغ الحرج الذي لا يُغلق خلال 15 دقيقة يُرسل إلى غرفة العمليات المركزية.
          </p>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <BusSuggestion />
        <GroupsBreakdown tickets={tickets} />
      </div>

      <TasksBoard />
      <ShiftLog now={now} />

      <Drawer open={!!open} onClose={close} title={open ? `بلاغ ${open.id} — ${KIND_LABELS[open.kind]}` : ""}>
        {open && <TicketDetail key={open.id} t={open} now={now} />}
      </Drawer>
    </div>
  );
}

function BusKpi() {
  const events = useStore((s) => s.events);
  const extra = events.some((e) => e.action === "اعتماد حافلة إضافية");
  return <Kpi label="حافلات مزدلفة" value={extra ? 15 : 14} icon={<Bus />} tone="teal" delay={0.2} hint={extra ? "أُضيفت الحافلة التاسعة للمبكرة" : "السائقون أكدوا 13 من 14"} />;
}

// ───────────────────────── Map ─────────────────────────

const ZONES: Record<Zone, { x: number; y: number; label: string; r: number }> = {
  makkah: { x: 70, y: 110, label: "مكة — الفندق", r: 38 },
  jamarat: { x: 205, y: 150, label: "الجمرات", r: 22 },
  mina: { x: 285, y: 170, label: "منى", r: 48 },
  muzdalifah: { x: 440, y: 235, label: "مزدلفة", r: 46 },
  arafat: { x: 600, y: 300, label: "عرفة", r: 70 },
};

function MashaerMap({ tickets, zone, onZone, onOpen, now }: { tickets: QueueTicket[]; zone: Zone | null; onZone: (z: Zone) => void; onOpen: (id: string) => void; now: number }) {
  const route = "M70 110 C 140 120, 170 150, 205 150 S 260 170, 285 170 S 380 210, 440 235 S 540 290, 600 300";
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#012a25] ring-1 ring-white/10">
      <svg viewBox="0 0 700 400" className="h-auto w-full" style={{ direction: "ltr" }} role="img" aria-label="خريطة تخطيطية لمكة ومنى ومزدلفة وعرفة مع مواقع البلاغات">
        <defs>
          <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" fill="none" stroke="rgba(255,255,255,.04)" />
          </pattern>
          <radialGradient id="heat">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity=".35" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="zone">
            <stop offset="0%" stopColor="#289E92" stopOpacity=".28" />
            <stop offset="100%" stopColor="#289E92" stopOpacity=".05" />
          </radialGradient>
        </defs>
        <rect width="700" height="400" fill="url(#grid)" />
        {/* terrain */}
        <path d="M0 330 C 120 300, 200 360, 330 330 S 520 380, 700 350 V400 H0Z" fill="rgba(217,200,158,.05)" />
        <path d="M0 40 C 150 70, 260 20, 400 60 S 600 30, 700 80 V0 H0Z" fill="rgba(217,200,158,.04)" />
        <circle cx="600" cy="300" r="140" fill="url(#heat)">
          <animate attributeName="r" values="125;150;125" dur="6s" repeatCount="indefinite" />
        </circle>
        {/* route */}
        <path d={route} fill="none" stroke="rgba(217,200,158,.25)" strokeWidth="10" strokeLinecap="round" />
        <path d={route} fill="none" stroke="#D9C89E" strokeWidth="2" strokeDasharray="6 10" strokeLinecap="round">
          <animate attributeName="stroke-dashoffset" from="160" to="0" dur="4s" repeatCount="indefinite" />
        </path>
        {/* zones */}
        {(Object.keys(ZONES) as Zone[]).map((k) => {
          const z = ZONES[k];
          const count = tickets.filter((t) => t.zone === k).length;
          const selected = zone === k;
          return (
            <g key={k} onClick={() => onZone(k)} className="cursor-pointer" role="button" aria-label={`${z.label}: ${count} بلاغات`}>
              <circle cx={z.x} cy={z.y} r={z.r} fill="url(#zone)" stroke={selected ? "#D9C89E" : "rgba(40,158,146,.45)"} strokeWidth={selected ? 2.5 : 1.2} strokeDasharray={selected ? undefined : "4 4"} />
              <text x={z.x} y={z.y + z.r + 16} textAnchor="middle" fill="rgba(255,255,255,.92)" fontSize="13" fontWeight="700">
                {z.label}
              </text>
              {count > 0 && (
                <g>
                  <circle cx={z.x + z.r * 0.72} cy={z.y - z.r * 0.72} r="10" fill="#672146" stroke="#fff" strokeWidth="1.5" />
                  <text x={z.x + z.r * 0.72} y={z.y - z.r * 0.72 + 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">
                    {count}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {/* group 27 marker */}
        <g>
          <rect x="545" y="340" width="112" height="24" rx="12" fill="rgba(0,0,0,.35)" stroke="rgba(217,200,158,.4)" />
          <text x="601" y="356" textAnchor="middle" fill="#D9C89E" fontSize="11">المجموعة 27 — 48 حاجاً</text>
        </g>
        {/* bus */}
        <g>
          <circle r="5" fill="#D9C89E">
            <animateMotion dur="14s" repeatCount="indefinite" path={route} />
          </circle>
        </g>
        {/* incidents */}
        {tickets.map((t, i) => {
          const z = ZONES[t.zone];
          const angle = (i * 137.5 * Math.PI) / 180;
          const dist = z.r * 0.25 + ((i * 7) % 10) * (z.r * 0.05);
          const x = z.x + Math.cos(angle) * dist;
          const y = z.y + Math.sin(angle) * dist;
          const s = SEVERITY[t.severity];
          const hot = t.severity === "critical" || t.severity === "high";
          return (
            <g key={t.id} onClick={() => onOpen(t.id)} className="cursor-pointer" role="button" aria-label={`${KIND_LABELS[t.kind]}: ${t.name}`}>
              {/* maroon reads too dark as a filled halo on the night map — use an expanding light ring instead */}
              <circle cx={x} cy={y} r="6" fill={hot ? "none" : s.hex} stroke={hot ? s.stroke : "none"} strokeWidth="1.5" opacity=".35">
                <animate attributeName="r" values="6;18;6" dur={t.severity === "critical" ? "1.4s" : "2.6s"} repeatCount="indefinite" />
                <animate attributeName="opacity" values=".6;0;.6" dur={t.severity === "critical" ? "1.4s" : "2.6s"} repeatCount="indefinite" />
              </circle>
              {escalated(t, now) && <circle cx={x} cy={y} r="10" fill="none" stroke="#D9C89E" strokeWidth="2" />}
              <circle cx={x} cy={y} r={hot ? 6.5 : 5.5} fill={s.hex} stroke={s.stroke} strokeWidth="2" />
            </g>
          );
        })}
      </svg>
      <div className="absolute right-3 top-3 flex flex-wrap gap-2.5 rounded-xl bg-black/40 px-3 py-2 text-[11px] font-bold text-white/90 ring-1 ring-white/10 backdrop-blur">
        {(Object.keys(SEVERITY) as (keyof typeof SEVERITY)[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", SEVERITY[k].dot)} /> {SEVERITY[k].label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Tickets ─────────────────────────

function TicketRow({ t, now, onOpen }: { t: QueueTicket; now: number; onOpen: () => void }) {
  const s = SEVERITY[t.severity];
  const info = sla(t, now);
  const esc = escalated(t, now);
  return (
    <button
      onClick={onOpen}
      className={cn(
        "group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl bg-white/[.06] p-3 text-right ring-1 transition hover:bg-white/10",
        esc ? "ring-2 ring-maroon-light" : "ring-white/10 hover:ring-gold/40",
        t.status === "resolved" && "opacity-80",
      )}
    >
      {esc && <span className="absolute inset-0 animate-pulse bg-maroon/30" />}
      <span className={cn("relative grid size-10 shrink-0 place-items-center rounded-xl ring-1 [&_svg]:size-5", s.icon)}>{KIND_ICON[t.kind]}</span>
      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", s.chip, t.severity === "critical" && t.status !== "resolved" && "animate-pulse")}>{s.label}</span>
          <span className="truncate text-sm font-bold text-white">{t.name}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-white/85">{t.location}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/75">
          <span>{ago(t.at, now)}</span>
          <span>· {STATUS_LABEL[t.status]}</span>
          {t.assignee && <span>· {t.assignee.split(" — ")[0]}</span>}
          {t.fromPilgrim && (
            <span className="flex items-center gap-1 text-gold">
              <Smartphone className="size-3" /> من تطبيق الحاج
            </span>
          )}
          {esc && <span className="rounded-full bg-maroon px-1.5 font-bold text-white">صُعّد للغرفة المركزية</span>}
        </div>
      </div>
      <span
        className={cn(
          "relative shrink-0 rounded-lg px-2 py-1 font-mono text-xs font-bold tabular-nums",
          info.tone === "late" ? "bg-maroon text-white ring-1 ring-white/20" : info.tone === "warn" ? "bg-gold/25 text-gold" : info.tone === "done" ? "bg-white/10 text-white/80" : "bg-green-light/25 text-white",
        )}
        dir={info.text.includes(":") ? "ltr" : undefined}
      >
        {info.text}
      </span>
    </button>
  );
}

function TicketDetail({ t, now }: { t: QueueTicket; now: number }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [text, setText] = useState("");
  const [assignee, setAssignee] = useState(t.assignee || "");
  const info = sla(t, now);
  const target = SLA_MINUTES[t.kind];

  const materialize = () => {
    if (t.seed) ensureTicket(toTicket(t));
  };

  const assign = () => {
    if (!assignee || assignee === t.assignee) return;
    materialize();
    actions.updateTicket(t.id, { assignee, status: t.status === "open" ? "in_progress" : t.status }, { by: user.name, text: `أُسند إلى ${assignee}` });
    logAs(user, { action: "إسناد بلاغ", target: `بلاغ ${t.id} — ${KIND_LABELS[t.kind]}`, before: t.assignee || "غير مُسند", after: assignee });
    toast({ title: "أُسند البلاغ", body: assignee, tone: "info", icon: "📡" });
  };

  const addUpdate = () => {
    if (text.trim().length < 3) return;
    materialize();
    actions.updateTicket(t.id, {}, { by: user.name, text: text.trim() });
    logAs(user, { action: "تحديث بلاغ", target: `بلاغ ${t.id}`, detail: text.trim() });
    setText("");
  };

  const setStatus = (status: Ticket["status"]) => {
    if (status === t.status) return;
    materialize();
    actions.updateTicket(t.id, { status }, { by: user.name, text: `تغيّرت الحالة: ${STATUS_LABEL[t.status]} ← ${STATUS_LABEL[status]}` });
    logAs(user, { action: status === "resolved" ? "إغلاق بلاغ" : "تغيير حالة بلاغ", target: `بلاغ ${t.id} — ${t.name}`, before: STATUS_LABEL[t.status], after: STATUS_LABEL[status] });
    toast(
      status === "resolved"
        ? { title: `أُغلق البلاغ ${t.id}`, body: t.fromPilgrim ? "وصل إشعار الإغلاق للحاج مع سؤال تقييم سرعة الاستجابة." : "سُجّل الإغلاق باسمك.", tone: "success", icon: "✅" }
        : { title: `البلاغ ${t.id}: ${STATUS_LABEL[status]}`, tone: "info", icon: "🔄" },
    );
  };

  const flow: Ticket["status"][] = ["open", "in_progress", "resolved"];
  const timeline = [{ at: t.at, by: t.fromPilgrim ? "الحاج — من التطبيق" : "النظام", text: `فُتح البلاغ: ${t.text}` }, ...t.updates];

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white/[.06] p-4 ring-1 ring-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <Chip className={SEVERITY[t.severity].chip}>{SEVERITY[t.severity].label}</Chip>
          <Chip className="bg-white/10 text-white/90 ring-1 ring-white/15">{KIND_LABELS[t.kind]}</Chip>
          {t.fromPilgrim && <Chip className="bg-gold/20 text-gold"><Smartphone className="size-3" /> من تطبيق الحاج</Chip>}
          {escalated(t, now) && <Chip className="animate-pulse bg-maroon text-white">صُعّد للغرفة المركزية</Chip>}
        </div>
        <p className="mt-2 font-display text-xl font-bold text-white">{t.name}</p>
        <p className="flex items-center gap-1 text-sm text-white/90">
          <MapPin className="size-4 text-gold" /> {t.location}
        </p>
        <p className="mt-2 leading-7 text-white">{t.text}</p>
      </div>

      {/* SLA */}
      <div className="flex items-center gap-4 rounded-3xl bg-white/[.06] p-4 ring-1 ring-white/10">
        <div className="relative size-20 shrink-0">
          <svg viewBox="0 0 80 80" className="-rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="8" />
            <motion.circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke={info.tone === "late" ? "#E4DDD3" : info.tone === "warn" ? "#D9C89E" : "#289E92"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 34}
              animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - Math.min(1, info.pct)) }}
            />
          </svg>
          <AlarmClock className={cn("absolute inset-0 m-auto size-6", info.tone === "late" ? "text-white" : "text-gold")} />
        </div>
        <div>
          <p className="text-xs text-white/75">زمن الاستجابة المستهدف: {target === 0 ? "فوري" : target >= 60 ? `${target / 60} ساعة` : `${target} دقائق`}</p>
          <p
            className={cn("my-0.5 w-fit font-display text-2xl font-bold tabular-nums", info.tone === "late" ? "rounded-xl bg-maroon px-2.5 text-white ring-1 ring-white/20" : info.tone === "warn" ? "text-gold" : "text-white")}
            dir={info.text.includes(":") ? "ltr" : undefined}
          >
            {info.text}
          </p>
          <p className="text-xs text-white/75">فُتح {ago(t.at, now)} — {fmtTime(t.at)}</p>
        </div>
      </div>

      {/* Status */}
      <div>
        <p className="mb-2 font-bold text-gold">الحالة</p>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white/10 p-1 ring-1 ring-white/10">
          {flow.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn("relative rounded-xl py-2.5 text-sm font-bold transition", t.status === s ? (s === "in_progress" ? "text-ink" : "text-white") : "text-white/85 hover:bg-white/5 hover:text-white")}
            >
              {t.status === s && <motion.span layoutId={`status-${t.id}`} className={cn("absolute inset-0 rounded-xl", s === "resolved" ? "bg-green-light" : s === "in_progress" ? "bg-gold" : "bg-maroon ring-1 ring-white/20")} />}
              <span className="relative">{STATUS_LABEL[s]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Assign */}
      <div>
        <p className="mb-2 font-bold text-gold">الإسناد</p>
        <div className="flex gap-2">
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={cn(smallInputClass, "min-w-0 [&>option]:text-ink")} aria-label="الجهة المسند إليها">
            <option value="">اختر الجهة...</option>
            {[...new Set([t.assignee, ...ASSIGNEES].filter(Boolean))].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <Button variant="gold" className="shrink-0" onClick={assign} disabled={!assignee || assignee === t.assignee}>
            إسناد
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <p className="mb-2 font-bold text-gold">مسار البلاغ</p>
        <ol className="relative space-y-3 border-r-2 border-white/15 pr-5">
          {timeline.map((u, i) => (
            <motion.li key={`${u.at}-${i}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative">
              <span className={cn("absolute -right-[27px] top-1 grid size-4 place-items-center rounded-full border-2 border-[#00403a]", i === 0 ? "bg-gold" : "bg-green-light")} />
              <p className="text-sm leading-6 text-white">{u.text}</p>
              <p className="text-xs text-white/75">
                {u.by} — {fmtTime(u.at)}
              </p>
            </motion.li>
          ))}
        </ol>
        <div className="mt-4 flex gap-2">
          <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="أضف تحديثاً: وصل الفريق، الحالة مستقرة..." className={cn(textareaClass, "text-sm")} />
          <Button variant="gold" onClick={addUpdate} disabled={text.trim().length < 3} className="self-end" aria-label="إضافة تحديث">
            <MessageSquarePlus className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Bus suggestion ─────────────────────────

function BusSuggestion() {
  const user = useStaffUser()!;
  const toast = useToast();
  const events = useStore((s) => s.events);
  const accepted = events.find((e) => e.action === "اعتماد حافلة إضافية");
  const registered = 430;
  const buses = accepted ? 9 : 8;
  const capacity = buses * 50;

  return (
    <Panel title="تنبؤ: حافلات مزدلفة المبكرة (كبار السن)" icon={<Bus />} delay={0.1}>
      <div className="flex items-end gap-1.5" dir="ltr" aria-hidden>
        {Array.from({ length: 9 }, (_, i) => {
          const isNew = i === 8;
          const on = i < buses;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: on ? 1 : 0.35, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn("grid h-14 flex-1 place-items-center rounded-xl ring-1", isNew ? (on ? "bg-gold text-ink ring-gold" : "border-2 border-dashed border-gold/60 text-gold ring-transparent") : "bg-white/10 text-white/90 ring-white/10")}
            >
              {isNew && !on ? <Plus className="size-5" /> : <Bus className="size-5" />}
            </motion.div>
          );
        })}
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-white/85">
          <span>المسجّلون {registered}</span>
          <span>السعة {capacity}</span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
          <motion.div className={cn("h-full rounded-full", registered > capacity ? "bg-maroon-light ring-1 ring-inset ring-gold-light/40" : "bg-green-light")} animate={{ width: `${Math.min(100, (registered / 450) * 100)}%` }} />
          <motion.span className="absolute inset-y-0 w-0.5 bg-gold" animate={{ right: `${100 - (capacity / 450) * 100}%` }} />
        </div>
      </div>
      <AnimatePresence mode="wait">
        {accepted ? (
          <motion.p key="ok" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-2 rounded-2xl bg-green-light/20 p-3 text-sm leading-6 text-white ring-1 ring-green-light/40">
            <CheckCircle2 className="size-5 shrink-0 text-gold" /> أُضيفت الحافلة التاسعة — اعتمدها {accepted.actor} {fmtTime(accepted.at)}. السعة الآن 450.
          </motion.p>
        ) : (
          <motion.div key="ask" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl bg-gold/15 p-3 ring-1 ring-gold/30">
            <p className="text-sm leading-6 text-white">
              <b className="text-gold">430 حاجاً مسجّلون</b> و8 حافلات تتسع لـ400 فقط — نقترح حافلة تاسعة قبل أن تقع المشكلة.
            </p>
            <Button
              size="sm"
              variant="gold"
              className="mt-3"
              onClick={() => {
                logAs(user, { action: "اعتماد حافلة إضافية", target: "حافلات مزدلفة المبكرة", before: "8 حافلات — 400 مقعد", after: "9 حافلات — 450 مقعداً", detail: "اقتراح المنصة: 430 مسجلاً" });
                toast({ title: "اعتُمدت الحافلة التاسعة", body: "أُبلغ فريق المواصلات ورؤساء المجموعات برقم الحافلة.", tone: "success", icon: "🚌" });
              }}
            >
              <CheckCircle2 className="size-4" /> قبول الاقتراح وطلب الحافلة
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}

function GroupsBreakdown({ tickets }: { tickets: QueueTicket[] }) {
  const rows = [
    { group: 27, cluster: "النور", inArafat: 48, of: 48, report: "13:00", leader: "أحمد الحمصي" },
    { group: 14, cluster: "النور", inArafat: 49, of: 50, report: "13:40", leader: "محمود الشامي" },
    { group: 31, cluster: "النور", inArafat: 50, of: 50, report: "12:55", leader: "بسام درويش" },
    { group: 19, cluster: "اليقين", inArafat: 44, of: 45, report: "13:20", leader: "عمر الزين" },
    { group: 8, cluster: "الشهباء", inArafat: 44, of: 45, report: "14:05", leader: "لؤي حمدان" },
  ];
  const count = (g: number) => tickets.filter((t) => t.status !== "resolved" && t.name.includes(`المجموعة ${g}`)).length;
  return (
    <Panel title="تفصيل حسب المجموعة" icon={<Users />} delay={0.15}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-right text-xs text-gold">
              <th className="pb-2 font-bold">المجموعة</th>
              <th className="pb-2 font-bold">في عرفة</th>
              <th className="pb-2 font-bold">بلاغات</th>
              <th className="pb-2 font-bold">آخر تقرير</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((r, i) => {
              const c = count(r.group);
              return (
                <motion.tr key={r.group} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <td className="py-2.5">
                    <p className="font-bold text-white">{r.group} — {r.cluster}</p>
                    <p className="text-xs text-white/75">{r.leader}</p>
                  </td>
                  <td className="py-2.5">
                    <span className={cn("font-bold tabular-nums", r.inArafat === r.of ? "text-white" : "text-gold")}>{r.inArafat}</span>
                    <span className="text-white/75"> / {r.of}</span>
                    {r.inArafat === r.of && <CheckCircle2 className="mr-1.5 inline size-3.5 text-green-light" aria-label="مكتمل" />}
                  </td>
                  <td className="py-2.5">{c ? <span className="rounded-full bg-maroon px-2 py-0.5 text-xs font-bold text-white ring-1 ring-white/20">{c}</span> : <span className="text-white/75">0</span>}</td>
                  <td className="py-2.5 text-white/90 tabular-nums">{r.report}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ───────────────────────── Internal tasks (kanban) ─────────────────────────

const COLUMNS: { key: TaskColumn; label: string; tone: string }[] = [
  { key: "todo", label: "جديدة", tone: "bg-white/50" },
  { key: "doing", label: "قيد التنفيذ", tone: "bg-gold" },
  { key: "done", label: "منجزة", tone: "bg-green-light" },
  { key: "verified", label: "تم التحقق", tone: "bg-green-light ring-2 ring-gold" },
];
const COLUMN_BY_LABEL = Object.fromEntries(COLUMNS.map((c) => [c.label, c.key])) as Record<string, TaskColumn>;

function TasksBoard() {
  const user = useStaffUser()!;
  const toast = useToast();
  const events = useStore((s) => s.events);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskColumn | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [to, setTo] = useState("");

  /** Tasks and their columns are replayed from the append-only log */
  const tasks = useMemo(() => {
    const created = events
      .filter((e) => e.action === "إنشاء مهمة داخلية" && e.detail)
      .map((e) => ({ id: e.detail!, title: e.target ?? "", by: e.actor, to: e.after ?? "", column: "todo" as TaskColumn, evidence: "حسب المهمة", due: "اليوم" }));
    return [...created.reverse(), ...SEED_TASKS].map((t) => {
      const moves = events.filter((e) => e.action === "نقل مهمة داخلية" && e.detail === t.id);
      const last = moves.at(-1);
      return { ...t, column: last?.after ? (COLUMN_BY_LABEL[last.after] ?? t.column) : t.column };
    });
  }, [events]);

  const move = (id: string, column: TaskColumn) => {
    const t = tasks.find((x) => x.id === id);
    if (!t || t.column === column) return;
    const from = COLUMNS.find((c) => c.key === t.column)!.label;
    const toLabel = COLUMNS.find((c) => c.key === column)!.label;
    logAs(user, { action: "نقل مهمة داخلية", target: t.title, detail: t.id, before: from, after: toLabel });
    if (column === "verified") toast({ title: "تم التحقق من المهمة", body: t.title, tone: "success", icon: "✔️" });
  };

  const create = () => {
    if (title.trim().length < 5) return;
    logAs(user, { action: "إنشاء مهمة داخلية", target: title.trim(), detail: `T-${Date.now().toString(36).slice(-4).toUpperCase()}`, after: to.trim() || "غرفة العمليات" });
    setTitle("");
    setTo("");
    setAdding(false);
    toast({ title: "أُنشئت المهمة", tone: "info", icon: "📝" });
  };

  return (
    <Panel
      title="المهام الداخلية"
      icon={<ClipboardList />}
      className="mt-6"
      delay={0.1}
      action={
        <Button size="sm" variant="glass" onClick={() => setAdding((v) => !v)}>
          <Plus className="size-4" /> مهمة جديدة
        </Button>
      }
    >
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mb-4 flex flex-wrap gap-2 rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان المهمة" className="h-10 min-w-0 flex-[2] rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/50 focus:border-gold" />
              <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="تُسند إلى" className="h-10 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/50 focus:border-gold" />
              <Button size="sm" variant="gold" onClick={create} disabled={title.trim().length < 5}>
                إضافة
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="scrollbar-none -mx-1 grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-x-auto px-1 pb-1 lg:grid-flow-row lg:grid-cols-4">
        {COLUMNS.map((col, ci) => {
          const items = tasks.filter((t) => t.column === col.key);
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col.key);
              }}
              onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) move(dragId, col.key);
                setDragId(null);
                setOver(null);
              }}
              className={cn("min-h-40 rounded-2xl bg-black/15 p-2.5 ring-1 transition", over === col.key ? "bg-gold/10 ring-gold/60" : "ring-white/10")}
            >
              <p className="mb-2 flex items-center gap-2 px-1 text-sm font-bold text-white">
                <span className={cn("size-2 rounded-full", col.tone)} /> {col.label}
                <span className="mr-auto rounded-full bg-white/10 px-2 text-xs tabular-nums text-white/90">{items.length}</span>
              </p>
              <motion.ul layout className="space-y-2">
                <AnimatePresence initial={false}>
                  {items.map((t) => (
                    <motion.li
                      key={t.id}
                      layout
                      layoutId={`task-${t.id}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={cn(
                        "rounded-xl p-3 text-white ring-1 transition",
                        t.title.includes("البرج (ب)") ? "bg-gold/15 ring-gold/50" : "bg-white/[.07] ring-white/10 hover:ring-gold/40",
                      )}
                    >
                      <div draggable onDragStart={() => setDragId(t.id)} className="cursor-grab active:cursor-grabbing">
                        <p className="text-sm font-bold leading-6">{t.title}</p>
                        <p className="mt-1 text-xs text-white/75">
                          {t.by} ← {t.to}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-gold">
                          <CircleDot className="size-3 shrink-0" /> الدليل: {t.evidence} · {t.due}
                        </p>
                      </div>
                      <div className="mt-2 flex justify-between border-t border-white/10 pt-1.5">
                        <button disabled={ci === 0} onClick={() => move(t.id, COLUMNS[ci - 1].key)} className="rounded-lg p-1 text-white/75 hover:bg-white/10 hover:text-gold disabled:opacity-30 disabled:hover:bg-transparent" aria-label="إرجاع خطوة">
                          <ArrowRight className="size-4" />
                        </button>
                        <button disabled={ci === COLUMNS.length - 1} onClick={() => move(t.id, COLUMNS[ci + 1].key)} className="rounded-lg p-1 text-white/75 hover:bg-white/10 hover:text-gold disabled:opacity-30 disabled:hover:bg-transparent" aria-label="تقديم خطوة">
                          <ArrowLeft className="size-4" />
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ───────────────────────── Shift log ─────────────────────────

const OPS_ACTIONS = ["إسناد بلاغ", "تحديث بلاغ", "إغلاق بلاغ", "تغيير حالة بلاغ", "اعتماد حافلة إضافية", "نقل مهمة داخلية", "إنشاء مهمة داخلية"];

function ShiftLog({ now }: { now: number }) {
  const events = useAllEvents();
  const [q, setQ] = useState("");
  const log = events.filter((e) => e.live && OPS_ACTIONS.includes(e.action) && (!q || `${e.actor} ${e.action} ${e.target ?? ""}`.includes(q))).slice(0, 8);
  return (
    <Panel
      title="سجل المناوبة"
      icon={<ClipboardList />}
      className="mt-6"
      delay={0.1}
      action={
        <label className="relative">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/70" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث" aria-label="بحث في سجل المناوبة" className="h-8 w-40 rounded-lg border border-white/15 bg-white/10 pr-8 pl-2 text-xs text-white outline-none placeholder:text-white/50 focus:border-gold" />
        </label>
      }
    >
      {log.length === 0 ? (
        <p className="text-sm leading-6 text-white/80">لم يُتخذ أي قرار في هذه المناوبة بعد. كل إسناد أو إغلاق أو طلب حافلة سيظهر هنا باسم صاحبه.</p>
      ) : (
        <ul className="divide-y divide-white/10">
          {log.map((e) => (
            <motion.li key={e.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <span className="font-mono text-xs tabular-nums text-gold">{fmtTime(e.at)}</span>
              <span className="font-bold text-white">{e.actor}</span>
              <span className="text-white/90">{e.action}</span>
              <span className="text-white/80">{e.target}</span>
              {e.before && (
                <span className="text-xs text-white/75">
                  {e.before} ← <b className="text-gold">{e.after}</b>
                </span>
              )}
              <span className="mr-auto text-[11px] text-white/70">{ago(e.at, now)}</span>
            </motion.li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
