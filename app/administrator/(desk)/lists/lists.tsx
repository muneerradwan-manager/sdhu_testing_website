"use client";

import { motion } from "motion/react";
import { Bus, CalendarClock, ChevronDown, Plus, Printer, UserRound, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { PrintSheet } from "@/components/print/print-sheet";
import { clusterName } from "@/lib/flights";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { groupName } from "@/lib/groups";
import { LIST_KINDS, listKind, listsActions, unitById, useClusterTravellers, useClusterUnits, useLists, type ListKind, type ListUnit, type Traveler } from "@/lib/rite-lists";
import { cn, formatNumber } from "@/lib/utils";
import { AdminShell, LockedCard, ViewOnlyNote } from "../../_components/ui";
import { AdminFlights } from "../flights/flights";
import { useAdmin } from "../../_lib/admin";
import { useCoordinatorPost } from "../../_lib/coordinators";
import { useAdminScope, viewOnlyText } from "../../_lib/scope";

/**
 * «القوائم»: before each rite — the Tarwiya, Arafat, Mina's days of tashreeq, the travel to Madinah — who goes and on
 * which bus — and, first, the flights out and back. The Hajj and Umrah staff give the cluster its buses; the
 * technical coordinator puts on them, from one dropdown on each bus, the pilgrims and administrators of his groups.
 * The Rawdah has no buses: a list of the men who go and one of the women. The cluster's head, its assistant and its
 * accountant follow every list; a group's head and assistant see their group's.
 */
export function AdminLists() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const scope = useAdminScope();
  const coord = useCoordinatorPost(admin.id, p);
  const clusterId = scope.kind === "tech" ? coord?.clusterId : (p?.cluster?.id ?? p?.servesIn?.clusterId ?? p?.accountantOf?.clusterId ?? p?.group?.clusterId);
  // The flights first: the old «الرحلات» (/administrator/flights) lands on them
  const [tab, setTab] = useState<ListKind | "flights">("flights");
  const kind: ListKind = tab === "flights" ? "tarwiya" : tab;
  const units = useClusterUnits(clusterId, kind);
  const lists = useLists();
  const travellers = useClusterTravellers(clusterId);
  // What goes to paper: the whole list, or one bus of it
  const [printing, setPrinting] = useState<string | null>(null);
  const print = (unitId: string | null) => {
    flushSync(() => setPrinting(unitId));
    window.print();
  };

  // The groups he works on: a coordinator's own; the whole cluster for whoever follows it
  const groups = useMemo(() => travellers.filter((t) => scope.viewOnly || scope.acts.includes(t.g.number)), [travellers, scope]);
  // A coordinator travels with each of his groups: counted once
  const people = useMemo(() => [...new Map(groups.flatMap((t) => t.people).map((x) => [x.id, x])).values()], [groups]);
  const byId = useMemo(() => Object.fromEntries(travellers.flatMap((t) => t.people.map((x) => [x.id, x]))), [travellers]);
  const seatedHere = useMemo(() => new Set(units.flatMap((u) => lists.seats[u.id] ?? [])), [units, lists.seats]);
  const k = listKind(kind);
  const eligible = (x: Traveler, u?: ListUnit) => !u?.gender || !x.gender || x.gender === u.gender;

  if (scope.kind === "guide" || scope.kind === "none" || !clusterId) {
    return (
      <AdminShell title="القوائم" subtitle="الطيران، وقوائم ما قبل المناسك: من يذهب، وعلى أي حافلة.">
        <LockedCard title="القوائم لفريق عمليات المجموعات" text="يُعدّها المنسق التقني لمجموعاته: يضعها على الرحلات، ويختار الحجاج والإداريين لكل قائمة ويُجلسهم على الحافلات التي يسندها موظفو الحج والعمرة إلى التكتل. ويراها رئيس المجموعة ومعاونه لمجموعتهما، ويتابعها رئيس التكتل ومعاونه ومحاسبه." href="/administrator/dashboard" cta="ملفي" />
      </AdminShell>
    );
  }
  if (scope.kind === "tech" && !groups.length) {
    return (
      <AdminShell title="القوائم" subtitle="قوائم ما قبل المناسك لمجموعاتك.">
        <LockedCard title="لم يوزّعك رئيس التكتل على مجموعة بعد" text="حين يوزّعك على مجموعات من التكتل، تُعدّ هنا قوائمها: من يذهب إلى كل منسك، وعلى أي حافلة." href="/administrator/groups" cta="إدارة المجموعات" />
      </AdminShell>
    );
  }

  const seatedMine = people.filter((x) => seatedHere.has(x.id)).length;
  const seatsAll = units.reduce((n, u) => n + u.seats, 0);
  const rawdah = kind === "rawdah";
  // Who he may still put on a list, by group: of the groups he acts on, not on this list yet, a man or a woman for the Rawdah
  const optionsFor = (u: ListUnit) => groups.filter((t) => scope.canAct(t.g.number)).map((t) => ({ number: t.g.number, people: t.people.filter((x) => !seatedHere.has(x.id) && eligible(x, u)) })).filter((x) => x.people.length);
  const actor = { name: admin.name, role: scope.post };
  // Only the coordinator seats people; a group's head and assistant see their group's lists
  const seats = scope.kind === "tech";

  return (
    <AdminShell image="/images/kaaba-panoramio.jpg" title="القوائم" subtitle="رحلات الطيران ذهاباً وعودة، ثم قبل كل منسك: من يذهب من الحجاج والإداريين، وعلى أي حافلة من الحافلات التي أسندها موظفو الحج والعمرة إلى التكتل. وللروضة الشريفة قائمتان: الرجال والنساء.">
      {scope.viewOnly && tab !== "flights" && <ViewOnlyNote>{viewOnlyText(scope, "القوائم والحافلات")}</ViewOnlyNote>}
      <div className="scrollbar-none -mx-4 mb-5 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex w-max gap-1 rounded-2xl border border-gold/30 bg-white p-1" role="tablist" aria-label="القوائم">
          {[{ key: "flights" as const, label: "الطيران" }, ...LIST_KINDS].map((x) => (
            <button key={x.key} role="tab" aria-selected={tab === x.key} type="button" onClick={() => setTab(x.key)} className={cn("relative rounded-xl px-4 py-2.5 text-sm font-bold transition", tab === x.key ? "text-white" : "text-ink-soft hover:text-ink")}>
              {tab === x.key && <motion.span layoutId="lists-tab" className="absolute inset-0 rounded-xl bg-green-dark" transition={{ type: "spring", damping: 28, stiffness: 320 }} />}
              <span className="relative">{x.label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === "flights" ? (
        <AdminFlights embedded />
      ) : (
      <>
      {scope.kind === "group" && <p className="mb-5 rounded-2xl bg-sand px-4 py-3 text-sm text-ink-soft">قوائم {scope.acts.map(groupName).join("، ")} كما أعدّها المنسق التقني. يضع الحجاج والإداريين على الحافلات هو وحده.</p>}
      <Card className="mb-6 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-2xl font-bold text-green-dark">{k.label}</p>
            <p className="mt-1 text-ink-soft">{k.desc}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gold-dark"><CalendarClock className="size-4" /> {k.when}</p>
            {units.length > 0 && (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => print(null)}>
                <Printer className="size-4" /> طباعة قائمة {k.label}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { k: scope.viewOnly ? "في التكتل" : "في مجموعاتك", v: people.length },
              { k: "على القائمة", v: seatedMine },
              rawdah ? { k: "الرجال · النساء", v: units.map((u) => lists.seats[u.id]?.length ?? 0).join(" · ") } : { k: `مقاعد ${units.length} حافلات`, v: seatsAll },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl bg-sand/70 px-4 py-2">
                <p className="font-display text-2xl font-bold text-green-dark tabular-nums">{typeof s.v === "number" ? formatNumber(s.v) : s.v}</p>
                <p className="text-xs text-hint">{s.k}</p>
              </div>
            ))}
          </div>
        </div>
        {seats && people.length - seatedMine > 0 && <p className="mt-3 rounded-2xl bg-maroon/5 px-4 py-2 text-sm font-semibold text-maroon">{people.length - seatedMine} من مجموعاتك لم يوضعوا على هذه القائمة بعد.</p>}
      </Card>

      {!rawdah && <BusRequests clusterId={clusterId} kind={kind} short={!seats ? 0 : Math.max(0, people.length - seatedMine - units.reduce((n, u) => n + Math.max(0, u.seats - (lists.seats[u.id]?.length ?? 0)), 0))} canAsk={scope.kind === "tech"} />}

      {units.length === 0 ? (
        <Card className="text-center text-ink-soft">لم يسند موظفو الحج والعمرة حافلات إلى التكتل لهذه القائمة بعد. حين يسندونها تظهر هنا.</Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {units.map((u, i) => (
            <UnitCard key={u.id} u={u} i={i} seated={(lists.seats[u.id] ?? []).map((id) => byId[id]).filter(Boolean)} canSeat={seats} onPrint={() => print(u.id)} canUnseat={(x) => seats && x.groupNumber !== undefined && scope.canAct(x.groupNumber)} options={optionsFor(u)} onSeat={(ids) => listsActions.seat(u, ids, actor, units, Object.fromEntries(ids.map((id) => [id, byId[id]?.name ?? id])))} onRemove={(x) => listsActions.unseat(u, x.id, actor, x.name)} />
          ))}
        </div>
      )}

      <PrintSheet>
        <ListSheet
          title={`قائمة ${k.label}`}
          cluster={clusterName(clusterId)}
          when={k.when}
          units={units.filter((u) => !printing || u.id === printing)}
          seatedOf={(u) => (lists.seats[u.id] ?? []).map((id) => byId[id]).filter(Boolean)}
        />
      </PrintSheet>
      </>
      )}

    </AdminShell>
  );
}

function UnitCard({ u, i, seated, canSeat, canUnseat, options, onSeat, onRemove, onPrint }: { u: ListUnit; i: number; seated: Traveler[]; canSeat: boolean; canUnseat: (x: Traveler) => boolean; options: { number: number; people: Traveler[] }[]; onSeat: (ids: string[]) => number; onRemove: (x: Traveler) => void; onPrint: () => void }) {
  const toast = useToast();
  const [all, setAll] = useState(false);
  const shown = all ? seated : seated.slice(0, 8);
  const rawdah = u.kind === "rawdah";
  const full = !rawdah && seated.length >= u.seats;
  const free = u.seats - seated.length;
  const add = (ids: string[]) => {
    const n = onSeat(ids);
    if (n) toast({ title: `أُضيف ${n === 1 ? options.flatMap((x) => x.people).find((x) => x.id === ids[0])?.name : `${n} أشخاص`} إلى ${u.label}`, body: n < ids.length ? `بقي ${ids.length - n} بلا مقعد: اكتملت الحافلة.` : u.when, tone: n < ids.length ? "warning" : "success", icon: rawdah ? "🕌" : "🚌" });
    else toast({ title: "لم يُضف أحد", body: "لا مقاعد باقية على هذه الحافلة.", tone: "warning", icon: "⚠️" });
  };
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} data-unit={u.label} className="rounded-3xl border border-gold/30 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">{u.kind === "rawdah" ? <Users className="size-5 text-gold-dark" /> : <Bus className="size-5 text-gold-dark" />} {u.label}</p>
          <p className="mt-0.5 text-sm text-ink-soft">{u.when}</p>
          {u.plate && <p className="text-xs text-hint">{u.kind === "rawdah" ? u.plate : <>اللوحة <span className="font-mono">{u.plate}</span>{u.driver && ` — السائق ${u.driver}`}</>}</p>}
        </div>
        <span className="flex items-center gap-1">
          <button type="button" onClick={onPrint} aria-label={`طباعة ${u.label}`} title={`طباعة ${u.label}`} className="rounded-lg p-1.5 text-green-dark hover:bg-sand">
            <Printer className="size-4" />
          </button>
          <Badge tone={full ? "gold" : seated.length ? "green" : "ink"}>{rawdah ? seated.length : `${seated.length}/${u.seats}`}</Badge>
        </span>
      </div>
      {!rawdah && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand">
          <div className={cn("h-full rounded-full", full ? "bg-gold-dark" : "bg-green")} style={{ width: `${Math.min(100, (seated.length / Math.max(1, u.seats)) * 100)}%` }} />
        </div>
      )}
      <ul className="mt-3 space-y-1">
        {shown.map((x) => (
          <li key={x.id} className="flex items-center justify-between gap-2 rounded-xl bg-sand/60 px-3 py-1.5 text-sm">
            <span className="flex min-w-0 items-center gap-1.5">
              <UserRound className={cn("size-3.5 shrink-0", x.kind === "administrator" ? "text-maroon" : "text-green-dark")} />
              <span className="truncate font-bold">{x.name}</span>
              <span className="shrink-0 text-xs text-hint">— {x.kind === "administrator" ? "إداري" : "حاج"}{x.groupNumber !== undefined ? `، ${groupName(x.groupNumber)}` : ""}</span>
            </span>
            {canUnseat(x) && (
              <button type="button" aria-label={`إزالة ${x.name} عن ${u.label}`} onClick={() => onRemove(x)} className="rounded-lg p-1 text-maroon hover:bg-maroon/10">
                <X className="size-3.5" />
              </button>
            )}
          </li>
        ))}
        {seated.length === 0 && <li className="text-sm text-hint">لا أحد عليها بعد.</li>}
      </ul>
      {seated.length > 8 && (
        <button type="button" onClick={() => setAll(!all)} className="mt-2 text-sm font-semibold text-green-dark underline-offset-4 hover:underline">
          {all ? "عرض أقل" : `عرض الكل (${seated.length})`}
        </button>
      )}
      {canSeat &&
        (full ? (
          <p className="mt-4 text-sm font-semibold text-gold-dark">اكتملت مقاعدها.</p>
        ) : options.length === 0 ? (
          <p className="mt-4 text-sm text-hint">{rawdah ? `كل ${u.gender === "F" ? "نساء" : "رجال"} مجموعاتك على قائمتي الروضة.` : "كل من في مجموعاتك على هذه القائمة."}</p>
        ) : (
          <CheckDropdown label={`أضف إلى ${u.label}`} options={options} free={rawdah ? undefined : free} onAdd={add} />
        ))}
    </motion.div>
  );
}

/**
 * Who to put on a bus, as the platform's other lists pick people: a dropdown of checkboxes — each group with «الكل»,
 * its administrators (one or several) and its pilgrims — searched by name, then added together.
 */
function CheckDropdown({ label, options, free, onAdd }: { label: string; options: { number: number; people: Traveler[] }[]; free?: number; onAdd: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const toggle = (ids: string[], on: boolean) => setPicked((x) => (on ? [...new Set([...x, ...ids])] : x.filter((id) => !ids.includes(id))));
  const match = (x: Traveler) => !q.trim() || x.name.includes(q.trim());
  const over = free !== undefined && picked.length > free;
  const row = (x: Traveler) => (
    <label key={x.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-sand/70">
      <input type="checkbox" className="size-4 accent-[#00594f]" checked={picked.includes(x.id)} onChange={(e) => toggle([x.id], e.target.checked)} />
      <span className="min-w-0 flex-1 truncate">{x.name}</span>
      {x.age ? <span className="text-xs text-hint">{x.age} عاماً</span> : null}
    </label>
  );
  return (
    <div ref={box} className="relative mt-4">
      <button type="button" aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen(!open)} className="flex h-11 w-full items-center justify-between gap-2 rounded-2xl border-2 border-gold/40 bg-white px-3 text-sm font-semibold text-ink-soft hover:border-gold-dark">
        <span>{picked.length ? `اخترت ${picked.length}` : `${label}…`}</span>
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div role="listbox" aria-multiselectable aria-label={label} className="absolute inset-x-0 top-full z-30 mt-1 rounded-2xl border border-gold/40 bg-white p-2 shadow-[0_24px_60px_-30px_rgba(2,21,38,.55)]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم" aria-label="ابحث بالاسم" className="mb-2 h-10 w-full rounded-xl bg-sand px-3 text-sm outline-none focus:ring-4 focus:ring-green-light/15" />
          <div className="max-h-72 overflow-y-auto overscroll-contain pe-1">
            {options.map((g) => {
              const ids = g.people.map((x) => x.id);
              const all = ids.every((id) => picked.includes(id));
              const admins = g.people.filter((x) => x.kind === "administrator" && match(x));
              const pilgrims = g.people.filter((x) => x.kind !== "administrator" && match(x));
              if (!admins.length && !pilgrims.length) return null;
              return (
                <div key={g.number} className="mb-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-green-dark/5 px-2 py-1.5 text-sm font-bold text-green-dark">
                    <input type="checkbox" className="size-4 accent-[#00594f]" checked={all} onChange={(e) => toggle(ids, e.target.checked)} />
                    {groupName(g.number)} — الكل ({ids.length})
                  </label>
                  {admins.length > 0 && <p className="mt-1 px-2 text-[11px] font-bold text-maroon">الإداريون</p>}
                  {admins.map(row)}
                  {pilgrims.length > 0 && <p className="mt-1 px-2 text-[11px] font-bold text-hint">الحجاج</p>}
                  {pilgrims.map(row)}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-gold-light pt-2">
            <span className={cn("text-xs", over ? "font-bold text-maroon" : "text-hint")}>{free === undefined ? `اخترت ${picked.length}` : over ? `اخترت ${picked.length} والباقي ${free} مقعداً` : `باقٍ ${free} مقعداً`}</span>
            <span className="flex gap-2">
              {picked.length > 0 && <Button size="sm" variant="outline" onClick={() => setPicked([])}>مسح</Button>}
              <Button size="sm" disabled={!picked.length} onClick={() => { onAdd(picked); setPicked([]); setOpen(false); }}>
                <Plus className="size-4" /> إضافة ({picked.length})
              </Button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * More buses, as for flights: when his groups do not fit on the buses the staff gave the cluster for a list, the
 * coordinator asks for one more; the transport team approves it (and a bus is added here) or refuses it, with why.
 */
function BusRequests({ clusterId, kind, short, canAsk }: { clusterId: string; kind: ListKind; short: number; canAsk: boolean }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const lists = useLists();
  const mine = lists.requests.filter((r) => r.clusterId === clusterId && r.kind === kind);
  const pending = mine.some((r) => r.status === "pending" && r.byId === admin.id);
  const [asking, setAsking] = useState(false);
  const [count, setCount] = useState("");
  const [note, setNote] = useState("");
  if (!short && !mine.length) return null;
  const send = () => {
    const n = Number(count || short);
    if (!(n > 0)) return;
    listsActions.requestBus({ clusterId, kind, count: n, note: note.trim() || undefined, by: admin.name, byId: admin.id });
    toast({ title: "أُرسل طلب الحافلة", body: `قائمة ${listKind(kind).label}: ${n} بلا مقعد. يصل إلى فريق المواصلات في إدارة الحج والعمرة.`, tone: "success", icon: "🚌" });
    setAsking(false);
    setCount("");
    setNote("");
  };
  return (
    <Card className="mb-6 md:p-6">
      {short > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-maroon">لا تتسع حافلات التكتل في هذه القائمة لـ {short} من مجموعاتك.</p>
          {canAsk && !pending && !asking && (
            <Button size="sm" variant="maroon" onClick={() => setAsking(true)}>
              <Bus className="size-4" /> طلب حافلة إضافية
            </Button>
          )}
        </div>
      )}
      {asking && (
        <div className="mt-4 grid gap-3 rounded-2xl bg-sand/60 p-4 md:grid-cols-[10rem_1fr_auto] md:items-end">
          <label className="block text-sm font-bold">
            بلا مقعد
            <input value={count || String(short)} onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} inputMode="numeric" aria-label="عدد من بلا مقعد" className="mt-1 h-11 w-full rounded-xl border-2 border-gold/40 bg-white px-3" />
          </label>
          <label className="block text-sm font-bold">
            ملاحظة للمواصلات
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثل: بينهم ستة على كراسٍ متحركة" aria-label="ملاحظة للمواصلات" className="mt-1 h-11 w-full rounded-xl border-2 border-gold/40 bg-white px-3" />
          </label>
          <div className="flex gap-2">
            <Button size="sm" onClick={send}>إرسال الطلب</Button>
            <Button size="sm" variant="outline" onClick={() => setAsking(false)}>إلغاء</Button>
          </div>
        </div>
      )}
      {mine.length > 0 && (
        <ul className={cn("space-y-2", short > 0 && "mt-4")}>
          {mine.map((r) => {
            const u = r.unitId ? unitById(r.unitId, lists.units) : undefined;
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sand/60 px-4 py-2 text-sm">
                <span>
                  <b>طلب حافلة إضافية</b> — {r.count} بلا مقعد{r.note ? ` — ${r.note}` : ""}
                  <span className="block text-xs text-hint">{r.by}</span>
                </span>
                {r.status === "pending" ? (
                  <Badge tone="gold">عند فريق المواصلات</Badge>
                ) : r.status === "approved" ? (
                  <Badge tone="green">أُسندت {u?.label ?? "حافلة"}</Badge>
                ) : (
                  <Badge tone="maroon">رُفض{r.reason ? `: ${r.reason}` : ""}</Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** The list on paper: each bus with its plate, driver and seats, and who rides it, a line each to tick at boarding */
function ListSheet({ title, cluster, when, units, seatedOf }: { title: string; cluster: string; when: string; units: ListUnit[]; seatedOf: (u: ListUnit) => Traveler[] }) {
  return (
    <div className="text-[11pt] leading-6">
      <h1 className="text-[18pt] font-bold">{title}{units.length === 1 ? ` — ${units[0].label}` : ""}</h1>
      <p>{cluster} — {when}</p>
      {units.map((u) => {
        const seated = seatedOf(u);
        return (
          <section key={u.id} className="mt-5 break-inside-avoid-page">
            <h2 className="text-[13pt] font-bold">
              {u.label} — {u.kind === "rawdah" ? `${seated.length} شخصاً` : `${seated.length} من ${u.seats}`}
            </h2>
            <p className="text-[10pt]">{u.when}{u.plate ? ` — ${u.kind === "rawdah" ? u.plate : `اللوحة ${u.plate}`}` : ""}{u.driver ? ` — السائق ${u.driver}` : ""}{u.driverPhone && <> — <span dir="ltr">{u.driverPhone}</span></>}</p>
            <table className="mt-2 w-full border-collapse text-[10pt]">
              <thead>
                <tr>
                  {["#", "الاسم", "الصفة", "المجموعة", units[0]?.kind === "rawdah" ? "حضر ✓" : "صعد ✓"].map((h) => <th key={h} className="border border-black/40 px-2 py-1 text-right">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {seated.map((x, n) => (
                  <tr key={x.id}>
                    <td className="border border-black/40 px-2 py-1 tabular-nums">{n + 1}</td>
                    <td className="border border-black/40 px-2 py-1">{x.name}</td>
                    <td className="border border-black/40 px-2 py-1">{x.kind === "administrator" ? "إداري" : "حاج"}</td>
                    <td className="border border-black/40 px-2 py-1">{x.groupNumber !== undefined ? groupName(x.groupNumber) : "—"}</td>
                    <td className="w-16 border border-black/40 px-2 py-1" />
                  </tr>
                ))}
                {seated.length === 0 && (
                  <tr>
                    <td colSpan={5} className="border border-black/40 px-2 py-2 text-center">لا أحد عليها.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
