"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { AlarmClock, Bus, CheckCircle2, MapPin, MessageSquarePlus, RadioTower, Search, Smartphone, TriangleAlert } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { KIND_LABELS, SLA_MINUTES, type Zone } from "@/lib/data/staff-seed";
import { actions, useStore, type Ticket } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useAllEvents, useTicketQueue, type QueueTicket } from "../_components/data";
import { ago, Drawer, fmtTime, Gate, logAs, PageHeader, smallInputClass, textareaClass, useNow, useStaffUser } from "../_components/kit";
import { FilterSelect } from "../_components/ops-ui";
import { Box, EmptyRow, ListTable, RowActions, RowLink, Tag } from "../_components/wp";
import { Segments } from "../exam/_components/ui";
import { MashaerMap } from "./map";
import { ASSIGNEES, escalated, KIND_ICON, materialize, OPS_ACTIONS, SEVERITY, setTicketStatus, sla, STATUS_LABEL, statusToast, ZONE_LABELS } from "./shared";
import { TasksList, useTasks } from "./tasks";

const BASE = "/staff/operations";

export function OperationsView() {
  return (
    <Gate perms={["operations.room"]}>
      <Operations />
    </Gate>
  );
}

type Filter = "active" | "open" | "in_progress" | "resolved";

/**
 * The room as two lists: the incidents, each opened in a side sheet, and the internal tasks
 * (`?view=tasks`). The day's numbers — pilgrims in Arafat, buses, heat, the groups — are on «لوحتي».
 */
function Operations() {
  const now = useNow(1000);
  const params = useSearchParams();
  const router = useRouter();
  const view = params.get("view") === "tasks" ? "tasks" : "tickets";
  const tickets = useTicketQueue();
  const tasks = useTasks();
  const active = tickets.filter((t) => t.status !== "resolved").length;

  return (
    <div className="space-y-5">
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
        description="البلاغات والمهام الداخلية. كل قرار هنا يُسجَّل باسمك في سجل المناوبة."
        actions={
          <span className="rounded-2xl bg-black/25 px-4 py-2 font-display text-2xl font-bold tabular-nums text-gold ring-1 ring-white/10" dir="ltr">
            {fmtTime(now, true)}
          </span>
        }
      />

      <Segments
        value={view}
        onChange={(v) => router.replace(v === "tasks" ? `${BASE}?view=tasks` : BASE, { scroll: false })}
        label="الأقسام"
        items={[
          { value: "tickets", label: "البلاغات", count: active, tone: "maroon" },
          { value: "tasks", label: "المهام الداخلية", count: tasks.filter((t) => t.column !== "verified").length },
        ]}
      />

      {view === "tasks" ? <TasksList /> : <Tickets tickets={tickets} now={now} />}

      <ShiftLog now={now} />
    </div>
  );
}

// ───────────────────────── Incidents ─────────────────────────

function Tickets({ tickets, now }: { tickets: QueueTicket[]; now: number }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("active");
  const [zone, setZone] = useState<Zone | "">("");
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);

  const list = tickets.filter((t) => {
    if (zone && t.zone !== zone) return false;
    if (filter === "active") return t.status !== "resolved";
    return t.status === filter;
  });
  const open = tickets.find((t) => t.id === openId) ?? null;
  const by = (s: Ticket["status"]) => tickets.filter((t) => t.status === s).length;

  const closeTicket = (t: QueueTicket) => {
    if (setTicketStatus(user, t, "resolved")) toast(statusToast(t, "resolved"));
  };

  return (
    <div className="space-y-4">
      <BusNotice />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segments
          value={filter}
          onChange={setFilter}
          label="تصفية البلاغات"
          items={[
            { value: "active", label: "النشطة", count: tickets.length - by("resolved") },
            { value: "open", label: "مفتوح", count: by("open") },
            { value: "in_progress", label: "قيد المعالجة", count: by("in_progress") },
            { value: "resolved", label: "مغلق", count: by("resolved") },
          ]}
        />
        <div className="w-full sm:w-56">
          <FilterSelect value={zone} onChange={(v) => setZone(v as Zone | "")} label="المنطقة" all="كل المناطق" options={(Object.keys(ZONE_LABELS) as Zone[]).map((z) => ({ value: z, label: ZONE_LABELS[z] }))} />
        </div>
      </div>

      <ListTable head={["البلاغ", "الخطورة", "الحالة", "المسند إليه", "الوقت المتبقي"]} minWidth="46rem">
        {list.length === 0 && <EmptyRow cols={5}>لا توجد بلاغات في هذا التصنيف.</EmptyRow>}
        {list.map((t) => {
          const s = SEVERITY[t.severity];
          const info = sla(t, now);
          const esc = escalated(t, now);
          return (
            <tr key={t.id} className={cn("align-top", esc && "bg-maroon/25", t.status === "resolved" && "opacity-75")}>
              <td className="p-3">
                <button type="button" onClick={() => setOpenId(t.id)} className="flex items-start gap-2 text-right">
                  <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ring-1 [&_svg]:size-4", s.icon)}>{KIND_ICON[t.kind]}</span>
                  <span>
                    <span className="block font-bold text-white hover:text-gold">{t.name}</span>
                    <span className="block text-xs text-white/65">
                      {KIND_LABELS[t.kind]} · {t.location} · {ago(t.at, now)}
                    </span>
                  </span>
                </button>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {t.fromPilgrim && (
                    <Tag tone="gold">
                      <Smartphone className="me-1 size-3" /> من تطبيق الحاج
                    </Tag>
                  )}
                  {esc && <Tag tone="maroon">صُعّد للغرفة المركزية</Tag>}
                </div>
                <RowActions>
                  <RowLink onClick={() => setOpenId(t.id)}>فتح</RowLink>
                  {t.status !== "resolved" && <RowLink onClick={() => closeTicket(t)}>إغلاق</RowLink>}
                </RowActions>
              </td>
              <td className="p-3">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", s.chip)}>{s.label}</span>
              </td>
              <td className="p-3 text-white/85">{STATUS_LABEL[t.status]}</td>
              <td className="p-3 text-xs text-white/75">{t.assignee ? t.assignee.split(" — ")[0] : "—"}</td>
              <td className="p-3">
                <span
                  className={cn(
                    "rounded-lg px-2 py-1 font-mono text-xs font-bold tabular-nums",
                    info.tone === "late" ? "bg-maroon text-white ring-1 ring-white/20" : info.tone === "warn" ? "bg-gold/25 text-gold" : info.tone === "done" ? "bg-white/10 text-white/80" : "bg-green-light/25 text-white",
                  )}
                  dir={info.text.includes(":") ? "ltr" : undefined}
                >
                  {info.text}
                </span>
              </td>
            </tr>
          );
        })}
      </ListTable>
      <p className="flex items-center gap-2 text-xs leading-5 text-white/60">
        <TriangleAlert className="size-3.5 shrink-0 text-gold" /> البلاغ الحرج الذي لا يُغلق خلال 15 دقيقة يُرسل تلقائياً إلى غرفة العمليات المركزية.
      </p>

      <Box title="خريطة المشاعر" open={false}>
        <p className="text-xs text-white/60">اضغط منطقة لتصفية القائمة بها، أو نقطة لفتح بلاغها.</p>
        <MashaerMap tickets={tickets.filter((t) => t.status !== "resolved")} zone={zone || null} onZone={(z) => setZone(z)} onOpen={setOpenId} now={now} />
      </Box>

      <Drawer open={!!open} onClose={close} title={open ? `بلاغ ${open.id} — ${KIND_LABELS[open.kind]}` : ""}>
        {open && <TicketDetail key={open.id} t={open} now={now} />}
      </Drawer>
    </div>
  );
}

/** The platform's suggestion of an extra bus, as a notice above the incidents until it is decided */
function BusNotice() {
  const user = useStaffUser()!;
  const toast = useToast();
  const events = useStore((s) => s.events);
  const accepted = events.find((e) => e.action === "اعتماد حافلة إضافية");
  if (accepted) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3 rounded-2xl border-r-4 border-gold bg-gold/10 p-3 ring-1 ring-gold/30">
      <Bus className="size-5 shrink-0 text-gold" />
      <p className="min-w-0 flex-1 text-sm leading-6 text-white">
        <b className="text-gold">اقتراح المنصة:</b> 430 حاجاً مسجّلون في حافلات مزدلفة المبكرة (كبار السن)، و8 حافلات تتسع لـ400 فقط — حافلة تاسعة قبل أن تقع المشكلة.
      </p>
      <Button
        size="sm"
        variant="gold"
        onClick={() => {
          logAs(user, { action: "اعتماد حافلة إضافية", target: "حافلات مزدلفة المبكرة", before: "8 حافلات — 400 مقعد", after: "9 حافلات — 450 مقعداً", detail: "اقتراح المنصة: 430 مسجلاً" });
          toast({ title: "اعتُمدت الحافلة التاسعة", body: "أُبلغ فريق المواصلات ورؤساء المجموعات برقم الحافلة.", tone: "success", icon: "🚌" });
        }}
      >
        <CheckCircle2 className="size-4" /> قبول الاقتراح وطلب الحافلة
      </Button>
    </motion.div>
  );
}

/** One report in full: its state, who it is assigned to, and its timeline — also used by the medical and transport teams */
export function TicketDetail({ t, now }: { t: QueueTicket; now: number }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [text, setText] = useState("");
  const [assignee, setAssignee] = useState(t.assignee || "");
  const info = sla(t, now);
  const target = SLA_MINUTES[t.kind];

  const assign = () => {
    if (!assignee || assignee === t.assignee) return;
    materialize(t);
    actions.updateTicket(t.id, { assignee, status: t.status === "open" ? "in_progress" : t.status }, { by: user.name, text: `أُسند إلى ${assignee}` });
    logAs(user, { action: "إسناد بلاغ", target: `بلاغ ${t.id} — ${KIND_LABELS[t.kind]}`, before: t.assignee || "غير مُسند", after: assignee });
    toast({ title: "أُسند البلاغ", body: assignee, tone: "info", icon: "📡" });
  };

  const addUpdate = () => {
    if (text.trim().length < 3) return;
    materialize(t);
    actions.updateTicket(t.id, {}, { by: user.name, text: text.trim() });
    logAs(user, { action: "تحديث بلاغ", target: `بلاغ ${t.id}`, detail: text.trim() });
    setText("");
  };

  const setStatus = (status: Ticket["status"]) => {
    if (setTicketStatus(user, t, status)) toast(statusToast(t, status));
  };

  const flow: Ticket["status"][] = ["open", "in_progress", "resolved"];
  const timeline = [{ at: t.at, by: t.fromPilgrim ? "الحاج — من التطبيق" : "النظام", text: `فُتح البلاغ: ${t.text}` }, ...t.updates];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", SEVERITY[t.severity].chip)}>{SEVERITY[t.severity].label}</span>
          <Tag>{KIND_LABELS[t.kind]}</Tag>
          {t.fromPilgrim && <Tag tone="gold">من تطبيق الحاج</Tag>}
          {escalated(t, now) && <Tag tone="maroon">صُعّد للغرفة المركزية</Tag>}
        </div>
        <p className="mt-2 font-display text-xl font-bold text-white">{t.name}</p>
        <p className="flex items-center gap-1 text-sm text-white/90">
          <MapPin className="size-4 text-gold" /> {t.location}
        </p>
        <p className="mt-2 leading-7 text-white">{t.text}</p>
        <p className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-xs text-white/70">
          <AlarmClock className={cn("size-4", info.tone === "late" ? "text-white" : "text-gold")} />
          الاستجابة المستهدفة: {target === 0 ? "فوري" : target >= 60 ? `${target / 60} ساعة` : `${target} دقائق`} —
          <b className={cn("tabular-nums", info.tone === "late" ? "rounded bg-maroon px-1.5 text-white" : info.tone === "warn" ? "text-gold" : "text-white")} dir={info.text.includes(":") ? "ltr" : undefined}>
            {info.text}
          </b>
          · فُتح {ago(t.at, now)} ({fmtTime(t.at)})
        </p>
      </div>

      <div>
        <p className="mb-2 font-bold text-gold">الحالة</p>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white/10 p-1 ring-1 ring-white/10">
          {flow.map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={cn("relative rounded-xl py-2.5 text-sm font-bold transition", t.status === s ? (s === "in_progress" ? "on-light text-ink" : "text-white") : "text-white/85 hover:bg-white/5 hover:text-white")}>
              {t.status === s && <motion.span layoutId={`status-${t.id}`} className={cn("absolute inset-0 rounded-xl", s === "resolved" ? "bg-green-light" : s === "in_progress" ? "bg-gold" : "bg-maroon ring-1 ring-white/20")} />}
              <span className="relative">{STATUS_LABEL[s]}</span>
            </button>
          ))}
        </div>
      </div>

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

      <div>
        <p className="mb-2 font-bold text-gold">مسار البلاغ</p>
        <ol className="relative space-y-3 border-r-2 border-white/15 pr-5">
          {timeline.map((u, i) => (
            <li key={`${u.at}-${i}`} className="relative">
              <span className={cn("absolute -right-[27px] top-1 grid size-4 place-items-center rounded-full border-2 border-[#00403a]", i === 0 ? "bg-gold" : "bg-green-light")} />
              <p className="text-sm leading-6 text-white">{u.text}</p>
              <p className="text-xs text-white/75">
                {u.by} — {fmtTime(u.at)}
              </p>
            </li>
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

// ───────────────────────── Shift log ─────────────────────────

function ShiftLog({ now }: { now: number }) {
  const events = useAllEvents();
  const [q, setQ] = useState("");
  const log = events.filter((e) => e.live && OPS_ACTIONS.includes(e.action) && (!q || `${e.actor} ${e.action} ${e.target ?? ""}`.includes(q))).slice(0, 20);
  return (
    <Box title="سجل المناوبة" open={false}>
      <label className="relative block w-full sm:w-60">
        <Search className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/70" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث" aria-label="بحث في سجل المناوبة" className="h-9 w-full rounded-lg border border-white/15 bg-white/10 pr-8 pl-2 text-xs text-white outline-none placeholder:text-white/50 focus:border-gold" />
      </label>
      {log.length === 0 ? (
        <p className="leading-6 text-white/70">لم يُتخذ أي قرار في هذه المناوبة بعد. كل إسناد أو إغلاق أو طلب حافلة يظهر هنا باسم صاحبه.</p>
      ) : (
        <ul className="divide-y divide-white/10">
          {log.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="font-mono text-xs tabular-nums text-gold">{fmtTime(e.at)}</span>
              <span className="font-bold text-white">{e.actor}</span>
              <span className="text-white/90">{e.action}</span>
              <span className="text-white/80">{e.target}</span>
              {e.before && (
                <span className="text-xs text-white/75">
                  {e.before} ← <b className="text-gold">{e.after}</b>
                </span>
              )}
              <span className="mr-auto text-[11px] text-white/60">{ago(e.at, now)}</span>
            </li>
          ))}
        </ul>
      )}
    </Box>
  );
}
