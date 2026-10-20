"use client";

import { motion } from "motion/react";
import { Bus, Plus, Printer, UserRound, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { PrintSheet } from "@/components/print/print-sheet";
import { PrintDocument, PrintSection, PrintTable, PrintTick } from "@/components/print/print-document";
import { PeoplePicker } from "./people-picker";
import { clusterName } from "@/lib/flights";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { groupName } from "@/lib/groups";
import { LIST_KINDS, listKind, listsActions, unitById, useClusterTravellers, useClusterUnits, useLists, type ListKind, type ListUnit, type Traveler } from "@/lib/rite-lists";
import { cn } from "@/lib/utils";
import { AdminShell, LockedCard, ViewOnlyNote } from "@/app/administrator/_components/ui";
import { AdminFlights } from "../flights/flights";
import { ListHeader } from "./header-card";
import { useAdmin } from "@/app/administrator/_lib/admin";
import { useCoordinatorPost } from "@/app/administrator/_lib/coordinators";
import { useAdminScope, viewOnlyText } from "@/app/administrator/_lib/scope";

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
  // The flights first: the old «الرحلات» (/portal/flights) lands on them
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
        <LockedCard title="القوائم لفريق عمليات المجموعات" text="يُعدّها المنسق التقني لمجموعاته: يضعها على الرحلات، ويختار الحجاج والإداريين لكل قائمة ويُجلسهم على الحافلات التي يسندها موظفو الحج والعمرة إلى التكتل. ويراها رئيس المجموعة ومعاونه لمجموعتهما، ويتابعها رئيس التكتل ومعاونه ومحاسبه." href="/portal" cta="ملفي" />
      </AdminShell>
    );
  }
  if (scope.kind === "tech" && !groups.length) {
    return (
      <AdminShell title="القوائم" subtitle="قوائم ما قبل المناسك لمجموعاتك.">
        <LockedCard title="لم يوزّعك رئيس التكتل على مجموعة بعد" text="حين يوزّعك على مجموعات من التكتل، تُعدّ هنا قوائمها: من يذهب إلى كل منسك، وعلى أي حافلة." href="/portal/groups" cta="إدارة المجموعات" />
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
      {scope.viewOnly && tab !== "flights" && <ViewOnlyNote>{viewOnlyText(scope, "القوائم والحافلات", true)}</ViewOnlyNote>}
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
      <ListHeader
        title={k.label}
        desc={k.desc}
        when={k.when}
        printLabel={`طباعة قائمة ${k.label}`}
        onPrint={units.length > 0 ? () => print(null) : undefined}
        stats={[
          { k: scope.viewOnly ? "في التكتل" : "في مجموعاتك", v: people.length },
          { k: "على القائمة", v: seatedMine },
          rawdah ? { k: "الرجال · النساء", v: units.map((u) => lists.seats[u.id]?.length ?? 0).join(" · ") } : { k: `مقاعد ${units.length} حافلات`, v: seatsAll },
        ]}
        warning={seats && people.length - seatedMine > 0 ? `${people.length - seatedMine} من مجموعاتك لم يوضعوا على هذه القائمة بعد.` : undefined}
      />

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
  const [picking, setPicking] = useState(false);
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
          <>
            <Button className="mt-4 w-full" variant="outline" onClick={() => setPicking(true)}>
              <Plus className="size-4" /> أضف إلى {u.label}
            </Button>
            {picking && (
              <PeoplePicker
                title={`أضف إلى ${u.label}`}
                subtitle={`${u.when}${rawdah ? "" : ` — بقي ${free} مقعداً`}. اختر مجموعة من الأعلى، ثم «الكل» أو من تريد منها.`}
                groups={options.map((o) => ({
                  number: o.number,
                  title: groupName(o.number),
                  people: [...o.people.filter((x) => x.kind === "administrator"), ...o.people.filter((x) => x.kind !== "administrator")].map((x) => ({ id: x.id, name: x.name, administrator: x.kind === "administrator", note: x.kind === "administrator" ? "إداري" : x.age ? `${x.age} عاماً` : undefined, family: x.kind === "administrator" ? "إداريو المجموعة" : "الحجاج" })),
                }))}
                capacity={rawdah ? undefined : free}
                confirm={`أضف إلى ${u.label}`}
                onConfirm={(ids) => {
                  add(ids);
                  setPicking(false);
                }}
                onClose={() => setPicking(false)}
              />
            )}
          </>
        ))}
    </motion.div>
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

/**
 * A list on paper, in the platform's printed look: the list and its cluster on top, then each bus (or each of the
 * Rawdah's two lists) on a page of its own — its time, plate, driver and seats — with who is on it and a box to tick
 * as each boards.
 */
function ListSheet({ title, cluster, when, units, seatedOf }: { title: string; cluster: string; when: string; units: ListUnit[]; seatedOf: (u: ListUnit) => Traveler[] }) {
  const rawdah = units[0]?.kind === "rawdah";
  const total = units.reduce((n, u) => n + seatedOf(u).length, 0);
  return (
    <PrintDocument
      title={`${title}${units.length === 1 ? ` — ${units[0].label}` : ""}`}
      source={cluster}
      meta={[
        { label: "الموعد", value: when },
        { label: rawdah ? "القوائم" : "الحافلات", value: units.length },
        { label: rawdah ? "الأشخاص" : "الركاب", value: total },
        ...(!rawdah ? [{ label: "المقاعد", value: units.reduce((n, u) => n + u.seats, 0) }] : []),
      ]}
    >
      {units.map((u, i) => {
        const seated = seatedOf(u);
        return (
          <PrintSection
            key={u.id}
            newPage={i > 0}
            title={u.label}
            meta={[
              { label: "الموعد", value: u.when },
              ...(u.plate ? [{ label: rawdah ? "المكان" : "اللوحة", value: u.plate }] : []),
              ...(u.driver ? [{ label: "السائق", value: u.driver }] : []),
              ...(u.driverPhone ? [{ label: "هاتف السائق", value: <span dir="ltr">{u.driverPhone}</span> }] : []),
              { label: rawdah ? "عدد الأشخاص" : "الركاب من المقاعد", value: rawdah ? seated.length : `${seated.length} من ${u.seats}` },
            ]}
          >
            <PrintTable
              head={["#", "الاسم", "الصفة", "المجموعة", rawdah ? "حضر" : "صعد"]}
              narrow={[0, 4]}
              rows={seated.map((x, n) => [n + 1, x.name, x.kind === "administrator" ? "إداري" : "حاج", x.groupNumber !== undefined ? groupName(x.groupNumber) : "—", <PrintTick key="t" />])}
              empty="لا أحد عليها."
            />
          </PrintSection>
        );
      })}
    </PrintDocument>
  );
}
