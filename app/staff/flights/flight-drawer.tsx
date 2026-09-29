"use client";

import { AlertTriangle, ArrowLeftRight, Ban, CalendarClock, Check, Download, FileText, Lock, PlaneLanding, PlaneTakeoff, Send, Trash2, UserRoundPlus, Users } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import {
  ASSIGNMENT_LABEL,
  DIRECTION_LABEL,
  KIND_LABEL,
  airportOf,
  carrierOf,
  acceptsAssignment,
  clusterName,
  familiesOnFlight,
  groupsOnFlight,
  flightWarnings,
  flightsActions,
  fmtClock,
  fmtGreg,
  fmtHijri,
  isActive,
  isOpenForAssignment,
  manifestCsv,
  seatStats,
  type Actor,
  type Flight,
  type FlightAssignment,
  type FlightsData,
  type Traveler,
} from "@/lib/flights";
import { fullName, useEmployees } from "@/lib/ops";
import { can } from "@/lib/staff";
import { cn, formatNumber } from "@/lib/utils";
import { useAllEvents } from "../_components/data";
import { Drawer, Tabs, fmtDateTime, textareaClass, useStaffUser } from "../_components/kit";
import { Chip, InfoGrid } from "../_components/ops-ui";
import { SeatBar, Stat, StatusChip, download } from "./shared";
import { GroupPicker, type GroupPick } from "./group-picker";
import { StaffPicker } from "./staff-picker";

type Tab = "pilgrims" | "staff" | "manifest" | "log";
type Dialog = null | { kind: "postpone" } | { kind: "reschedule" } | { kind: "divert" } | { kind: "cancel" } | { kind: "depart" } | { kind: "unassign"; ids: string[] } | { kind: "move"; ids: string[] } | { kind: "removeGroup"; legId: string; label: string };

const ASSIGN_TONE: Record<FlightAssignment["status"], "green" | "gold" | "maroon" | "muted"> = { assigned: "green", locked: "gold", boarded: "green", arrived: "muted", noShow: "maroon", cancelled: "maroon", moved: "muted" };

export function FlightDrawer({ flight: f, data, onClose, onEdit }: { flight: Flight; data: FlightsData; onClose: () => void; onEdit: (f: Flight) => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const employees = useEmployees();
  const events = useAllEvents();
  const officer = can(user, "flights.manage");
  const ops = officer || can(user, "operations.room");
  const actor: Actor = { name: user.name, role: user.title };
  const [tab, setTab] = useState<Tab>(f.audience === "staff" ? "staff" : "pilgrims");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [picker, setPicker] = useState(false);
  const [groupPicker, setGroupPicker] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [when, setWhen] = useState({ d: "", t: "", ad: "", at: "" });
  const [divert, setDivert] = useState({ to: "ap-amm", buses: 9, note: "" });
  const [noShow, setNoShow] = useState<string[]>([]);
  const [moveTo, setMoveTo] = useState("");

  const s = seatStats(f, data.assignments);
  const mine = useMemo(() => data.assignments.filter((a) => a.flightId === f.id), [data.assignments, f.id]);
  const active = mine.filter(isActive);
  const families = useMemo(() => familiesOnFlight(f.id, data.assignments), [f.id, data.assignments]);
  const staff = active.filter((a) => a.travelerKind === "employee");
  const warnings = flightWarnings(f, data);
  const manifests = data.manifests.filter((m) => m.flightId === f.id).sort((a, b) => b.version - a.version);
  const stale = f.status === "locked" && manifests[0] && active.some((a) => a.assignedAt > manifests[0].issuedAt || (a.cancelledAt ?? 0) > manifests[0].issuedAt);
  const log = events.filter((e) => e.target === f.flightNo).sort((a, b) => b.at - a.at);
  const nameOf = (a: FlightAssignment) => (a.travelerKind === "employee" ? (employees.find((e) => e.id === a.travelerId) ? fullName(employees.find((e) => e.id === a.travelerId)!) : a.name) : a.name);
  const carrier = carrierOf(data, f.carrierId);
  const from = airportOf(data, f.fromId);
  const to = airportOf(data, f.toId);
  const alt = airportOf(data, f.divertedToId);
  const legs = groupsOnFlight(f.id, data.groups);
  const paired = data.flights.find((x) => x.id === f.pairedFlightId);
  const sameWay = data.flights.filter((x) => x.id !== f.id && x.direction === f.direction && isOpenForAssignment(x) && x.audience === f.audience);

  const report = (r: { ok: true } | { ok: false; error: string }, okTitle: string, okBody?: string) => {
    if (r.ok) toast({ title: okTitle, body: okBody, tone: "success", icon: "✈️" });
    else toast({ title: "لم يُنفَّذ", body: r.error, tone: "warning", icon: "⚠️" });
    return r.ok;
  };

  const run = () => {
    if (!dialog) return;
    switch (dialog.kind) {
      case "postpone":
        if (report(flightsActions.postpone(f.id, reason.trim() || "ظروف طارئة", actor), "أُجّلت الرحلة", `${active.length} مسافراً سيُبلَّغون بالموعد الجديد`)) setDialog(null);
        break;
      case "cancel":
        if (report(flightsActions.cancel(f.id, reason.trim() || "إلغاء من الناقل", actor), "أُلغيت الرحلة", `${active.length} مسافراً صاروا في قائمة «بحاجة إلى رحلة»`)) {
          setDialog(null);
          onClose();
        }
        break;
      case "reschedule": {
        const dep = new Date(`${when.d}T${when.t}:00+03:00`).getTime();
        const arr = new Date(`${when.ad}T${when.at}:00+03:00`).getTime();
        if (!(dep > 0) || !(arr > dep)) return toast({ title: "تحقق من الموعدين", tone: "warning", icon: "⚠️" });
        if (report(flightsActions.reschedule(f.id, dep, arr, actor), "حُدّد الموعد الجديد", `${active.length} مسافراً يُبلَّغون`)) setDialog(null);
        break;
      }
      case "divert":
        if (report(flightsActions.divert(f.id, divert.to, divert.buses, divert.note.trim(), actor), "حُوّلت الرحلة", `فُتحت مهمة حافلات لفريق المواصلات`)) setDialog(null);
        break;
      case "depart": {
        const boarded = active.filter((a) => !noShow.includes(a.travelerId)).map((a) => a.travelerId);
        if (report(flightsActions.depart(f.id, actor, boarded), "سُجّل الإقلاع", noShow.length ? `تخلّف ${noShow.length} — فُتحت تذاكر نقل` : `صعد ${active.length}`)) setDialog(null);
        break;
      }
      case "unassign":
        if (report(flightsActions.unassign(dialog.ids, actor, reason.trim() || undefined), "أُلغي الإسناد", `${dialog.ids.length} مسافر`)) {
          setDialog(null);
          setSelected([]);
        }
        break;
      case "removeGroup":
        if (report(flightsActions.unassignGroup(dialog.legId, actor, reason.trim() || undefined), `أُزيلت ${dialog.label}`, "عادت مقاعدها متاحة، وصارت المجموعة بلا رحلة في هذا الاتجاه")) setDialog(null);
        break;
      case "move":
        if (!moveTo) return;
        if (report(flightsActions.move(dialog.ids, moveTo, actor, reason.trim() || undefined), "نُقل المسافرون", `إلى ${data.flights.find((x) => x.id === moveTo)?.flightNo}`)) {
          setDialog(null);
          setSelected([]);
        }
        break;
    }
    setReason("");
  };

  const simple = (fn: () => { ok: true } | { ok: false; error: string }, title: string, body?: string) => report(fn(), title, body);

  const assignStaff = (travelers: Traveler[], also?: string) => {
    if (!simple(() => flightsActions.assign(f.id, travelers, actor), `أُسند ${travelers.length} ${travelers.length === 1 ? "موظف" : "موظفين"}`, f.flightNo)) return;
    if (also) simple(() => flightsActions.assign(also, travelers, actor), `وأُسندوا أيضاً إلى ${data.flights.find((x) => x.id === also)?.flightNo}`);
    setPicker(false);
  };

  const assignGroups = (groups: GroupPick[], also?: string, why?: string) => {
    const label = groups.length === 1 ? `المجموعة ${groups[0].ref.number}` : `${groups.length} مجموعات`;
    const n = groups.reduce((x, g) => x + g.members.length, 0);
    if (!simple(() => flightsActions.assignGroups(f.id, groups, actor, why), `أُسندت ${label}`, `${n} مسافراً على ${f.flightNo}`)) return;
    if (also) simple(() => flightsActions.assignGroups(also, groups, actor), `وأُسندت أيضاً إلى ${data.flights.find((x) => x.id === also)?.flightNo}`);
    setGroupPicker(false);
  };
  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const needsReason = !isOpenForAssignment(f);

  const actionsBar: ReactNode = officer ? (
    <div className="flex flex-wrap gap-2">
      {f.status === "draft" && (
        <>
          <Button size="sm" variant="gold" onClick={() => simple(() => flightsActions.publish(f.id, actor), paired?.status === "draft" ? "نُشرت الرحلتان" : "نُشرت الرحلة", "صارت متاحة للإسناد")}><Send className="size-4" /> {paired?.status === "draft" ? "نشر الرحلتين" : "نشر"}</Button>
          <Button size="sm" variant="glass" onClick={() => onEdit(f)}>تعديل</Button>
          <Button size="sm" variant="glass" onClick={() => { flightsActions.deleteDraft(f.id, actor); onClose(); }}><Trash2 className="size-4" /> حذف المسودة</Button>
        </>
      )}
      {(f.status === "published" || f.status === "full") && (
        <>
          <Button size="sm" variant="gold" onClick={() => simple(() => flightsActions.lock(f.id, actor), "أُقفلت الرحلة", "صدر كشف الركاب — يُصدَّر إلى نسك مسار والناقل")}><Lock className="size-4" /> إقفال وإصدار الكشف</Button>
          <Button size="sm" variant="glass" onClick={() => onEdit(f)}>تعديل</Button>
        </>
      )}
      {f.status === "locked" && (
        <>
          {stale && <Button size="sm" variant="gold" onClick={() => flightsActions.reissueManifest(f.id, actor)}><FileText className="size-4" /> كشف بإصدار جديد</Button>}
          {ops && <Button size="sm" variant="gold" onClick={() => { setNoShow([]); setDialog({ kind: "depart" }); }}><PlaneTakeoff className="size-4" /> تسجيل الإقلاع</Button>}
          <Button size="sm" variant="glass" onClick={() => onEdit(f)}>تعديل</Button>
        </>
      )}
      {f.status === "departed" && ops && <Button size="sm" variant="gold" onClick={() => simple(() => flightsActions.arrive(f.id, actor), "سُجّل الهبوط", "تقدمت حالة المسافرين إلى «وصل»")}><PlaneLanding className="size-4" /> تسجيل الهبوط</Button>}
      {["published", "full", "locked"].includes(f.status) && (
        <>
          <Button size="sm" variant="glass" onClick={() => setDialog({ kind: "postpone" })}><CalendarClock className="size-4" /> تأجيل</Button>
          <Button size="sm" variant="glass" onClick={() => { setWhen({ d: "", t: "", ad: "", at: "" }); setDialog({ kind: "reschedule" }); }}>موعد جديد</Button>
          {!f.divertedToId && <Button size="sm" variant="glass" onClick={() => setDialog({ kind: "divert" })}><ArrowLeftRight className="size-4" /> تحويل الوجهة</Button>}
          <Button size="sm" variant="glass" className="text-maroon-light" onClick={() => setDialog({ kind: "cancel" })}><Ban className="size-4" /> إلغاء الرحلة</Button>
        </>
      )}
      {f.status === "postponed" && (
        <>
          <Button size="sm" variant="gold" onClick={() => { setWhen({ d: "", t: "", ad: "", at: "" }); setDialog({ kind: "reschedule" }); }}><CalendarClock className="size-4" /> تحديد الموعد الجديد</Button>
          <Button size="sm" variant="glass" className="text-maroon-light" onClick={() => setDialog({ kind: "cancel" })}><Ban className="size-4" /> إلغاء الرحلة</Button>
        </>
      )}
    </div>
  ) : ops && f.status === "locked" ? (
    <Button size="sm" variant="gold" onClick={() => { setNoShow([]); setDialog({ kind: "depart" }); }}><PlaneTakeoff className="size-4" /> تسجيل الإقلاع</Button>
  ) : ops && f.status === "departed" ? (
    <Button size="sm" variant="gold" onClick={() => simple(() => flightsActions.arrive(f.id, actor), "سُجّل الهبوط")}><PlaneLanding className="size-4" /> تسجيل الهبوط</Button>
  ) : null;

  return (
    <Drawer open onClose={onClose} width="max-w-4xl" title={<span className="flex items-center gap-2"><span dir="ltr" className="font-mono">{f.flightNo}</span> <StatusChip f={f} /></span>} footer={actionsBar}>
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <InfoGrid
          rows={[
            ["المسار", `${from?.city} (${from?.code}) ← ${to?.city} (${to?.code})${alt ? ` — حُوّلت إلى ${alt.city} (${alt.code})` : ""}`],
            ["الناقل", `${carrier?.name ?? ""} (${carrier?.code ?? ""})`],
            ["المغادرة", `${fmtHijri(f.departAt)} — ${fmtGreg(f.departAt)} — ${fmtClock(f.departAt)}`],
            ["الوصول", `${fmtClock(f.arriveAt)}`],
            ["الاتجاه والنوع", `${DIRECTION_LABEL[f.direction]} — ${f.audience === "staff" ? "رحلة موظفين" : "رحلة حجاج"}`],
            ["الرحلة المقابلة", paired ? `${paired.flightNo} — ${DIRECTION_LABEL[paired.direction]} — ${fmtGreg(paired.departAt)}` : "—"],
            ["البوابة والتجمّع", `${f.gate ?? "—"} — ${f.gathering ?? "—"}`],
            ["ملاحظات", f.notes ?? ""],
          ]}
        />
        <div className="grid grid-cols-2 gap-2 md:w-56">
          <Stat label="السعة" value={formatNumber(f.capacity)} />
          <Stat label="متبقٍّ" value={formatNumber(f.audience === "staff" ? s.remainingStaff : s.remaining)} tone={(f.audience === "staff" ? s.remainingStaff : s.remaining) > 0 ? "green" : "maroon"} />
          <Stat label="حجاج وإداريون" value={formatNumber(s.assignedPilgrims)} />
          <Stat label="موظفون" value={`${formatNumber(s.assignedStaff)}/${formatNumber(f.audience === "staff" ? f.capacity : f.staffReserve)}`} tone="gold" />
        </div>
      </div>
      <div className="mt-3"><SeatBar f={f} assignments={data.assignments} /></div>
      {f.status === "postponed" && <p className="mt-3 rounded-2xl bg-maroon/30 px-4 py-2 text-sm text-white ring-1 ring-maroon/50">مؤجلة: {f.postponeReason}. الإسنادات محفوظة، ويُبلَّغ المسافرون عند تحديد الموعد الجديد.</p>}
      {f.groundLegs.map((l, i) => (
        <p key={i} className="mt-3 rounded-2xl bg-gold/15 px-4 py-2 text-sm text-white ring-1 ring-gold/40">مرحلة أرضية: {l.buses} حافلات من {l.from} إلى {l.to}{l.note ? ` — ${l.note}` : ""}</p>
      ))}
      {warnings.map((w) => (
        <p key={w} className="mt-3 flex items-start gap-2 rounded-2xl bg-maroon/20 px-4 py-2 text-sm text-white ring-1 ring-maroon/40"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" /> {w}</p>
      ))}

      <div className="mt-5">
        <Tabs<Tab>
          id={`flight-${f.id}`}
          value={tab}
          onChange={setTab}
          tabs={[
            ...(f.audience === "pilgrims" ? [{ value: "pilgrims" as Tab, label: "الحجاج", count: s.assignedPilgrims }] : []),
            { value: "staff", label: "الموظفون", count: staff.length },
            { value: "manifest", label: "كشف الركاب", count: manifests.length },
            { value: "log", label: "السجل", count: log.length },
          ]}
        />
      </div>

      {tab === "pilgrims" && (
        <div className="mt-4">
          <div className="mb-4 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-gold">المجموعات على الرحلة <span className="font-normal text-white/60">({legs.length})</span></p>
              {officer && acceptsAssignment(f) && <Button size="sm" variant="gold" onClick={() => setGroupPicker(true)} disabled={s.remaining <= 0}><Users className="size-4" /> إضافة مجموعات ({s.remaining} متبقٍّ)</Button>}
            </div>
            {legs.length === 0 ? (
              <p className="mt-2 text-sm text-white/60">لا مجموعات بعد. يضيفها مسؤول الطيران بعد التنسيق مع رئيس التكتل.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {legs.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 rounded-xl bg-white/10 py-1 pl-1 pr-3 text-sm">
                    <span className="font-bold text-white">المجموعة {g.groupNumber}</span>
                    <span className="text-xs text-white/60">{clusterName(g.clusterId)} — {active.filter((a) => a.clusterId === g.clusterId && a.groupNumber === g.groupNumber).length}</span>
                    {officer && acceptsAssignment(f) && (
                      <button type="button" className="rounded-lg px-2 py-0.5 text-xs font-bold text-maroon-light hover:bg-white/10" onClick={() => { setReason(""); setDialog({ kind: "removeGroup", legId: g.id, label: `المجموعة ${g.groupNumber} (${clusterName(g.clusterId)})` }); }}>
                        إزالة
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {officer && selected.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-gold/15 px-3 py-2 text-sm ring-1 ring-gold/40">
              <span className="font-bold">{selected.length} مختاراً</span>
              <Button size="sm" variant="glass" onClick={() => { setReason(""); setDialog({ kind: "unassign", ids: selected }); }}>إلغاء الإسناد</Button>
              <Button size="sm" variant="glass" onClick={() => { setReason(""); setMoveTo(sameWay[0]?.id ?? ""); setDialog({ kind: "move", ids: selected }); }} disabled={!sameWay.length}>نقل إلى رحلة أخرى</Button>
              <button type="button" className="text-white/70 hover:text-white" onClick={() => setSelected([])}>إلغاء التحديد</button>
            </div>
          )}
          {families.length === 0 && <p className="rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-white/60">لم يُسند أحد بعد. رؤساء التكتلات يسندون مجموعاتهم من بوابة الإداريين.</p>}
          {(() => {
            let lastGroup = "";
            return families.map((fam) => {
              const head = fam.members[0];
              const gk = `${head.clusterId}:${head.groupNumber}`;
              const showHead = gk !== lastGroup;
              lastGroup = gk;
              return (
                <div key={fam.id}>
                  {showHead && (
                    <p className="mb-1 mt-4 flex items-center gap-2 text-sm font-bold text-gold first:mt-0">
                      <Users className="size-4" /> {clusterName(head.clusterId ?? "")} — المجموعة {head.groupNumber}
                      <span className="font-normal text-white/60">{active.filter((a) => a.clusterId === head.clusterId && a.groupNumber === head.groupNumber).length} مسافراً</span>
                    </p>
                  )}
                  <div className="mb-1.5 rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {fam.members.map((a) => (
                        <label key={a.id} className={cn("flex items-center gap-2 text-sm", officer && "cursor-pointer")}>
                          {officer && <input type="checkbox" className="accent-gold" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} aria-label={`اختيار ${a.name}`} />}
                          <span className="font-bold text-white">{a.name}</span>
                          {a.travelerKind === "administrator" && <Chip tone="gold">إداري</Chip>}
                          {a.needs?.map((n) => <Chip key={n} tone="maroon">{n}</Chip>)}
                          <Chip tone={ASSIGN_TONE[a.status]}>{ASSIGNMENT_LABEL[a.status]}</Chip>
                        </label>
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-white/50">أسنده {fam.members[0].assignedBy} — {fmtDateTime(fam.members[0].assignedAt)}</p>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {tab === "staff" && (
        <div className="mt-4">
          {officer && (f.status === "published" || f.status === "full" || f.status === "draft") && (
            <Button size="sm" variant="gold" className="mb-3" onClick={() => setPicker(true)} disabled={s.remainingStaff <= 0}><UserRoundPlus className="size-4" /> إسناد موظفين ({s.remainingStaff} متبقٍّ)</Button>
          )}
          {staff.length === 0 ? (
            <p className="rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-white/60">لا موظفين على هذه الرحلة بعد.</p>
          ) : (
            <ul className="divide-y divide-white/10 rounded-2xl bg-white/5 ring-1 ring-white/10">
              {staff.map((a) => {
                const e = employees.find((x) => x.id === a.travelerId);
                return (
                  <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                    {officer && <input type="checkbox" className="accent-gold" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} aria-label={`اختيار ${nameOf(a)}`} />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-white">{nameOf(a)}</span>
                      <span className="block truncate text-xs text-white/60">{e ? `${e.jobTitle} — ${e.mission}` : "موظف"}</span>
                    </span>
                    <Chip tone={ASSIGN_TONE[a.status]}>{ASSIGNMENT_LABEL[a.status]}</Chip>
                  </li>
                );
              })}
            </ul>
          )}
          {officer && selected.length > 0 && tab === "staff" && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-gold/15 px-3 py-2 text-sm ring-1 ring-gold/40">
              <span className="font-bold">{selected.length} مختاراً</span>
              <Button size="sm" variant="glass" onClick={() => { setReason(""); setDialog({ kind: "unassign", ids: selected }); }}>إلغاء الإسناد</Button>
              <button type="button" className="text-white/70 hover:text-white" onClick={() => setSelected([])}>إلغاء التحديد</button>
            </div>
          )}
        </div>
      )}

      {tab === "manifest" && (
        <div className="mt-4 space-y-3">
          {manifests.length === 0 && <p className="rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-white/60">يصدر كشف الركاب عند إقفال الرحلة.</p>}
          {manifests.map((m) => (
            <div key={m.id} className={cn("rounded-2xl bg-white/5 p-4 ring-1", m.version === f.manifestVersion ? "ring-gold/50" : "ring-white/10")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-white">الإصدار {m.version} <span className="font-normal text-white/60">— {m.rows.length} مسافراً — {fmtDateTime(m.issuedAt)} — {m.issuedBy}</span></p>
                {m.version === f.manifestVersion && !stale && <Chip tone="green">الحالي</Chip>}
                {m.version === f.manifestVersion && stale && <Chip tone="maroon">تغيّرت الإسنادات بعده</Chip>}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="glass" onClick={() => { download(`${f.flightNo.replace(/\s/g, "")}-masar-v${m.version}.csv`, manifestCsv(m, f, data)); if (officer || ops) flightsActions.exportManifest(m.id, "masar", actor); }}><Download className="size-4" /> تصدير إلى نسك مسار</Button>
                <Button size="sm" variant="glass" onClick={() => { download(`${f.flightNo.replace(/\s/g, "")}-carrier-v${m.version}.csv`, manifestCsv(m, f, data)); if (officer || ops) flightsActions.exportManifest(m.id, "carrier", actor); }}><Download className="size-4" /> تصدير للناقل</Button>
              </div>
              {m.exports.length > 0 && <p className="mt-2 text-xs text-white/60">{m.exports.map((x) => `${x.to === "masar" ? "مسار" : "الناقل"} ${fmtDateTime(x.at)} (${x.by})`).join(" · ")}</p>}
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-gold">عرض الصفوف</summary>
                <div className="mt-2 max-h-72 overflow-auto rounded-xl bg-black/20 p-2">
                  <table className="w-full text-xs">
                    <thead><tr className="text-white/60"><th className="p-1 text-right">الاسم</th><th className="p-1 text-right">الصفة</th><th className="p-1 text-right">المجموعة</th><th className="p-1 text-right">الاحتياجات</th></tr></thead>
                    <tbody>{m.rows.map((r) => <tr key={r.travelerId} className="border-t border-white/5"><td className="p-1">{r.name}</td><td className="p-1">{KIND_LABEL[r.kind]}</td><td className="p-1">{r.groupNumber ?? "—"}</td><td className="p-1">{r.needs.join("، ")}</td></tr>)}</tbody>
                  </table>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}

      {tab === "log" && (
        <ul className="mt-4 space-y-2">
          {log.length === 0 && <li className="rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-white/60">لا أحداث بعد.</li>}
          {log.map((e) => (
            <li key={e.id} className="rounded-2xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10">
              <span className="font-bold text-white">{e.action}</span> <span className="text-white/60">— {e.actor} — {fmtDateTime(e.at)}</span>
              {e.detail && <p className="text-xs text-white/70">{e.detail}</p>}
              {e.before && <p className="text-xs text-white/50">قبل: {e.before} — بعد: {e.after}</p>}
            </li>
          ))}
        </ul>
      )}

      {picker && <StaffPicker open onClose={() => setPicker(false)} flight={f} data={data} onAssign={assignStaff} />}
      {groupPicker && <GroupPicker open onClose={() => setGroupPicker(false)} flight={f} data={data} onAssign={assignGroups} />}

      <Modal open={!!dialog} onClose={() => setDialog(null)} className="max-w-xl">
        {dialog && (
          <div>
            <h2 className="font-display text-xl font-bold text-green-dark">
              {{ postpone: "تأجيل الرحلة", reschedule: "موعد جديد", divert: "تحويل الوجهة", cancel: "إلغاء الرحلة", depart: "تسجيل الإقلاع", unassign: "إلغاء الإسناد", move: "نقل إلى رحلة أخرى", removeGroup: "إزالة مجموعة" }[dialog.kind]} — <span dir="ltr" className="font-mono">{f.flightNo}</span>
            </h2>
            {dialog.kind === "postpone" && <p className="mt-2 text-ink-soft">تبقى إسنادات {active.length} مسافراً كما هي، ويُبلَّغون الآن بالتأجيل، ثم بالموعد الجديد عند تحديده. تُفتح مهمة في غرفة العمليات.</p>}
            {dialog.kind === "removeGroup" && <p className="mt-2 text-ink-soft">تُزال {dialog.label} كاملة عن الرحلة: تعود مقاعد أفرادها متاحة، وتصير المجموعة بلا رحلة في هذا الاتجاه حتى تُسند من جديد.{needsReason ? " الرحلة مقفلة، فالسبب إلزامي ويصدر كشف بإصدار جديد." : ""}</p>}
            {dialog.kind === "cancel" && <p className="mt-2 text-ink-soft">تُلغى إسنادات {active.length} مسافراً ويصيرون في قائمة «بحاجة إلى رحلة». لا رجوع عن الإلغاء.</p>}
            {dialog.kind === "divert" && <p className="mt-2 text-ink-soft">يُسجَّل المطار البديل وتُضاف مرحلة حافلات إلى الوجهة الأصلية، ويُبلَّغ المسافرون، وتُفتح مهمة لفريق المواصلات.</p>}
            {dialog.kind === "depart" && <p className="mt-2 text-ink-soft">من لم يصعد يُعلَّم «تخلّف» وتُفتح له تذكرة نقل. اترك القائمة فارغة إن صعد الجميع.</p>}
            {(dialog.kind === "unassign" || dialog.kind === "move") && <p className="mt-2 text-ink-soft">{dialog.ids.length} مسافر.{needsReason ? " الرحلة مقفلة، فالسبب إلزامي ويصدر كشف بإصدار جديد." : ""}</p>}
            {dialog.kind === "reschedule" && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block text-sm"><span className="mb-1 block text-xs font-bold text-ink-soft">تاريخ المغادرة</span><input type="date" className="h-11 w-full rounded-2xl border-2 border-gold/40 px-3" value={when.d} onChange={(e) => setWhen({ ...when, d: e.target.value, ad: when.ad || e.target.value })} /></label>
                <label className="block text-sm"><span className="mb-1 block text-xs font-bold text-ink-soft">الوقت</span><input type="time" className="h-11 w-full rounded-2xl border-2 border-gold/40 px-3" value={when.t} onChange={(e) => setWhen({ ...when, t: e.target.value })} /></label>
                <label className="block text-sm"><span className="mb-1 block text-xs font-bold text-ink-soft">تاريخ الوصول</span><input type="date" className="h-11 w-full rounded-2xl border-2 border-gold/40 px-3" value={when.ad} onChange={(e) => setWhen({ ...when, ad: e.target.value })} /></label>
                <label className="block text-sm"><span className="mb-1 block text-xs font-bold text-ink-soft">الوقت</span><input type="time" className="h-11 w-full rounded-2xl border-2 border-gold/40 px-3" value={when.at} onChange={(e) => setWhen({ ...when, at: e.target.value })} /></label>
              </div>
            )}
            {dialog.kind === "divert" && (
              <div className="mt-4 grid gap-3">
                <label className="block text-sm"><span className="mb-1 block text-xs font-bold text-ink-soft">المطار البديل</span>
                  <select className="h-11 w-full rounded-2xl border-2 border-gold/40 bg-white px-3" value={divert.to} onChange={(e) => setDivert({ ...divert, to: e.target.value })}>
                    {data.airports.filter((a) => a.id !== f.toId && !a.archived).map((a) => <option key={a.id} value={a.id}>{a.city} — {a.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm"><span className="mb-1 block text-xs font-bold text-ink-soft">عدد الحافلات (35 – 40 راكباً للحافلة — على الرحلة {active.length})</span><input type="number" min={1} className="h-11 w-full rounded-2xl border-2 border-gold/40 px-3" value={divert.buses} onChange={(e) => setDivert({ ...divert, buses: Math.max(1, Number(e.target.value) || 1) })} /></label>
                <label className="block text-sm"><span className="mb-1 block text-xs font-bold text-ink-soft">ملاحظة للمسافرين</span><input className="h-11 w-full rounded-2xl border-2 border-gold/40 px-3" value={divert.note} onChange={(e) => setDivert({ ...divert, note: e.target.value })} placeholder="الحافلات تنتظر عند صالة الوصول" /></label>
              </div>
            )}
            {dialog.kind === "depart" && (
              <div className="mt-4 max-h-64 overflow-auto rounded-2xl border border-gold/30 p-2">
                {active.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 px-2 py-1 text-sm">
                    <input type="checkbox" className="accent-maroon" checked={noShow.includes(a.travelerId)} onChange={() => setNoShow((p) => (p.includes(a.travelerId) ? p.filter((x) => x !== a.travelerId) : [...p, a.travelerId]))} />
                    <span className={cn(noShow.includes(a.travelerId) && "text-maroon line-through")}>{nameOf(a)}</span>
                    <span className="text-xs text-hint">{a.groupNumber ? `المجموعة ${a.groupNumber}` : KIND_LABEL[a.travelerKind]}</span>
                  </label>
                ))}
              </div>
            )}
            {dialog.kind === "move" && (
              <label className="mt-4 block text-sm"><span className="mb-1 block text-xs font-bold text-ink-soft">الرحلة الجديدة ({DIRECTION_LABEL[f.direction]})</span>
                <select className="h-11 w-full rounded-2xl border-2 border-gold/40 bg-white px-3" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                  {sameWay.map((x) => <option key={x.id} value={x.id}>{x.flightNo} — {fmtGreg(x.departAt)} — متبقٍّ {seatStats(x, data.assignments).remaining}</option>)}
                </select>
              </label>
            )}
            {["postpone", "cancel", "unassign", "move", "removeGroup"].includes(dialog.kind) && (
              <label className="mt-4 block text-sm"><span className="mb-1 block text-xs font-bold text-ink-soft">السبب{(needsReason && dialog.kind !== "postpone") || dialog.kind === "cancel" || dialog.kind === "postpone" ? "" : " (اختياري)"}</span>
                <textarea className={cn(textareaClass, "!bg-sand !text-ink !border-gold/40")} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={dialog.kind === "postpone" ? "إغلاق الأجواء" : dialog.kind === "cancel" ? "ألغى الناقل الرحلة" : "حالة طبية"} />
              </label>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>رجوع</Button>
              <Button variant={dialog.kind === "cancel" ? "maroon" : "primary"} onClick={run} disabled={(["postpone", "cancel"].includes(dialog.kind) || (needsReason && ["unassign", "move", "removeGroup"].includes(dialog.kind))) && !reason.trim()}><Check className="size-4" /> تنفيذ</Button>
            </div>
          </div>
        )}
      </Modal>
    </Drawer>
  );
}
