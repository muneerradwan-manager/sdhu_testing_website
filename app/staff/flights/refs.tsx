"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, Plus, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { airportOf, flightsActions, isHoly, newFlightId, returnAirportsFor, useAirportReps, useFlightsData, type Airport, type Carrier, type FlightsData } from "@/lib/flights";
import { cn } from "@/lib/utils";
import { Drawer, logAs, useCan, useStaffUser } from "../_components/kit";
import { Field, fieldClass } from "../_components/ops-ui";
import { OperationHeader } from "../_components/system";
import { AddButton, Box, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, Tag, Title } from "../_components/wp";
import { Segments } from "../exam/_components/ui";

const AIRPORTS = "/staff/flights/manage";

/** What an airport is in the pilgrims' trip: the holy city it serves, where its travellers return, or returns only */
function roleOf(a: Airport, d: Pick<FlightsData, "airports">) {
  if (isHoly(a)) return `يصل إليه الذهاب وتقلع منه العودة — ${a.serves ?? a.city}`;
  if (a.arrivalsOnly) return "تهبط فيه العودة فقط";
  return `يقلع منه الذهاب، ويعود ركابه إلى ${returnAirportsFor(d, a.id).map((id) => airportOf(d, id)?.city ?? id).join(" أو ")}`;
}
const CARRIERS = "/staff/flights/manage/carriers";

/** What the flights are built from, in two lists: the airports (with who represents each) and the carriers */
function RefsSwitch() {
  const path = usePathname().replace(/\/+$/, "");
  const data = useFlightsData();
  const items = [
    { href: AIRPORTS, label: "المطارات ومندوبوها", n: data.airports.filter((a) => !a.archived).length },
    { href: CARRIERS, label: "الناقلون الجويون", n: data.carriers.filter((c) => !c.archived).length },
  ];
  return (
    <nav aria-label="المطارات والناقلون" className="flex flex-wrap gap-1 rounded-2xl bg-white/[.06] p-1 ring-1 ring-white/10 sm:w-fit">
      {items.map((x) => (
        <Link key={x.href} href={x.href} aria-current={path === x.href ? "page" : undefined} className={cn("rounded-xl px-4 py-2 text-sm font-bold transition", path === x.href ? "bg-gold text-ink" : "text-white/80 hover:text-white")}>
          {x.label} <span className="tabular-nums opacity-70">({x.n})</span>
        </Link>
      ))}
    </nav>
  );
}

// ───────────────────────── Airports ─────────────────────────

type AirportFilter = "all" | "norep" | "archived";

/**
 * «المطارات ومندوبوها»: every airport in a list — its representative beside it — opening in one side sheet
 * with its details. The representative is whoever holds «رحلات المطار» for it (granted at «صلاحيات الموظفين»):
 * he records, from «رحلات مطاري», the take-offs from his airport and the landings at it.
 */
export function AirportsPage() {
  const data = useFlightsData();
  const user = useStaffUser()!;
  const may = useCan();
  const toast = useToast();
  const { reps, repsOf } = useAirportReps();
  const params = useSearchParams();
  const [filter, setFilter] = useState<AirportFilter>(() => (params.get("filter") === "norep" ? "norep" : "all"));
  const [editing, setEditing] = useState<Partial<Airport> | null>(null);
  const live = data.flights.filter((f) => !["draft", "cancelled"].includes(f.status));
  const used = (id: string) => data.flights.some((f) => f.fromId === id || f.toId === id || f.divertedToId === id);
  const dep = (id: string) => live.filter((f) => f.fromId === id).length;
  const arr = (id: string) => live.filter((f) => (f.divertedToId ?? f.toId) === id).length;
  const noRep = (a: Airport) => !a.archived && !reps[a.id] && dep(a.id) + arr(a.id) > 0;
  const rows = data.airports.filter((a) => (filter === "archived" ? a.archived : filter === "norep" ? noRep(a) : !a.archived));

  const toggle = (a: Airport) => {
    if (!a.archived && used(a.id)) return toast({ title: "المطار مستعمل في رحلة", body: "لا يُؤرشف مطار عليه رحلات هذا الموسم.", tone: "warning", icon: "⚠️" });
    flightsActions.saveAirport({ ...a, archived: !a.archived });
    logAs(user, { action: a.archived ? "استعادة مطار" : "أرشفة مطار", target: `${a.city} (${a.code})`, system: "flights", area: "refs", ref: a.id });
  };

  return (
    <div className="space-y-5">
      <OperationHeader system="flights" icon={<Building2 />} />
      <RefsSwitch />
      <Title
        action={
          may("flights.airports.POST") && (
            <AddButton onClick={() => setEditing({ country: "سوريا" })}>
              <Plus className="size-4" /> إضافة مطار
            </AddButton>
          )
        }
      />
      <Segments<AirportFilter>
        value={filter}
        onChange={setFilter}
        label="تصفية المطارات"
        items={[
          { value: "all", label: "الكل", count: data.airports.filter((a) => !a.archived).length },
          { value: "norep", label: "عليها رحلات بلا مندوب", count: data.airports.filter(noRep).length, tone: "maroon" },
          { value: "archived", label: "مؤرشفة", count: data.airports.filter((a) => a.archived).length },
        ]}
      />
      <ListTable head={["المطار", "الدولة", "المندوب", "رحلات الموسم", "الحالة"]}>
        {rows.map((a) => {
          const rep = repsOf(a.id)[0] ?? null;
          return (
            <tr key={a.id} className={cn("align-top", a.archived && "opacity-60")}>
              <td className="p-3">
                <button type="button" onClick={() => setEditing(a)} className="flex items-center gap-2 text-right font-bold text-white hover:text-gold">
                  <span className="rounded-lg bg-white/10 px-2 py-0.5 font-mono text-xs text-gold" dir="ltr">
                    {a.code}
                  </span>
                  {a.city}
                </button>
                <span className="block text-xs text-white/55">{a.name}</span>
                <span className="block text-xs text-gold/80">{roleOf(a, data)}</span>
                <RowActions>
                  <RowLink onClick={() => setEditing(a)}>{may("flights.airports.PUT") ? "تعديل" : "عرض"}</RowLink>
                  {may("flights.airports.archive") && (
                    <RowLink danger={!a.archived} onClick={() => toggle(a)}>
                      {a.archived ? "استعادة" : "أرشفة"}
                    </RowLink>
                  )}
                </RowActions>
              </td>
              <td className="p-3 text-white/80">{a.country}</td>
              <td className="p-3">{rep ? <span className="text-white">{rep.name}</span> : a.archived ? <span className="text-white/40">—</span> : <Tag tone={noRep(a) ? "maroon" : "muted"}>بلا مندوب</Tag>}</td>
              <td className="p-3 text-white/80">
                {dep(a.id)} مغادرة · {arr(a.id)} وصول
              </td>
              <td className="p-3">{a.archived ? <Tag>مؤرشف</Tag> : used(a.id) ? <Tag tone="green">مستعمل</Tag> : <Tag>غير مستعمل</Tag>}</td>
            </tr>
          );
        })}
        {rows.length === 0 && <EmptyRow cols={5}>{filter === "norep" ? "لكل مطار عليه رحلات مندوبه." : filter === "archived" ? "لا مطارات مؤرشفة." : "لا مطارات بعد."}</EmptyRow>}
      </ListTable>

      <Box title="كيف تعمل؟" open={false}>
        <p>مندوب المطار يسجل إقلاع الرحلات من مطاره ومن صعد ومن تخلّف، وهبوط الرحلات فيه. تظهر له «رحلات مطاري» في قائمته. وهو من يملك صلاحية «رحلات المطار» لهذا المطار، تُمنح من «صلاحيات الموظفين» لا من هنا.</p>
        <p>مطار بلا مندوب: تسجّل أنت إقلاع رحلاته وهبوطها من صفحة الرحلة. ولا يُؤرشف مطار عليه رحلات هذا الموسم.</p>
      </Box>

      <RecordsBox system="flights" area="refs" title="سجل المطارات والناقلين" />

      {editing && <AirportSheet key={editing.id ?? "new"} initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/** One airport in a side sheet: its details, and who represents it */
function AirportSheet({ initial, onClose }: { initial: Partial<Airport>; onClose: () => void }) {
  const user = useStaffUser()!;
  // Adding an airport and changing one are separate permissions; without them the sheet only shows it
  const allowed = useCan()(initial.id ? "flights.airports.PUT" : "flights.airports.POST");
  const data = useFlightsData();
  // the airports a return may land at: outside Saudi Arabia
  const homes = data.airports.filter((x) => !x.archived && x.country !== "السعودية");
  const toast = useToast();
  const [a, setA] = useState(initial);
  const reps = useAirportReps().repsOf(initial.id ?? "");
  const valid = !!(a.code && a.name && a.city);

  const save = () => {
    if (!valid || !allowed) return;
    const holy = (a.country ?? "").trim() === "السعودية";
    const id = a.id ?? newFlightId("ap");
    const saved: Airport = {
      id,
      code: a.code!.toUpperCase().trim(),
      name: a.name!.trim(),
      city: a.city!.trim(),
      country: (a.country ?? "").trim(),
      serves: holy ? a.serves?.trim() || a.city!.trim() : undefined,
      arrivalsOnly: !holy && a.arrivalsOnly ? true : undefined,
      returnsTo: !holy && !a.arrivalsOnly && a.returnsTo?.length ? a.returnsTo : undefined,
      archived: a.archived,
    };
    const changed = !initial.id || (["code", "name", "city", "country", "serves", "arrivalsOnly"] as const).some((k) => (initial[k] ?? "") !== (saved[k] ?? "")) || JSON.stringify(initial.returnsTo ?? []) !== JSON.stringify(saved.returnsTo ?? []);
    if (changed) {
      flightsActions.saveAirport(saved);
      logAs(user, { action: initial.id ? "تعديل مطار" : "إضافة مطار", target: `${saved.city} (${saved.code})`, system: "flights", area: "refs", ref: saved.id });
      toast({ title: initial.id ? "حُفظ المطار" : "أُضيف المطار", body: saved.name, tone: "success", icon: "✈️" });
    }
    onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={initial.id ? `تعديل مطار ${initial.city ?? ""}` : "إضافة مطار"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="glass" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="gold" onClick={save} disabled={!valid || !allowed} title={allowed ? undefined : "يحتاج صلاحية «تعديل — المطارات»"}>
            <Save className="size-4" /> {initial.id ? "حفظ" : "إضافة المطار"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الرمز (IATA)">
            <input className={fieldClass} dir="ltr" value={a.code ?? ""} onChange={(e) => setA({ ...a, code: e.target.value })} placeholder="DAM" />
          </Field>
          <Field label="المدينة">
            <input className={fieldClass} value={a.city ?? ""} onChange={(e) => setA({ ...a, city: e.target.value })} />
          </Field>
          <Field label="اسم المطار" className="sm:col-span-2">
            <input className={fieldClass} value={a.name ?? ""} onChange={(e) => setA({ ...a, name: e.target.value })} />
          </Field>
          <Field label="الدولة">
            <input className={fieldClass} value={a.country ?? ""} onChange={(e) => setA({ ...a, country: e.target.value })} />
          </Field>
          {(a.country ?? "").trim() === "السعودية" && (
            <Field label="المدينة التي يخدمها" hint="يصل إليه الذهاب وتقلع منه العودة. مطار جدة لمكة المكرمة.">
              <input className={fieldClass} value={a.serves ?? ""} onChange={(e) => setA({ ...a, serves: e.target.value })} placeholder="مكة المكرمة" />
            </Field>
          )}
        </div>
        {(a.country ?? "").trim() !== "السعودية" && (
          <div className="space-y-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <label className="flex items-center gap-2 text-sm text-white">
              <input type="checkbox" className="accent-gold" checked={!!a.arrivalsOnly} onChange={(e) => setA({ ...a, arrivalsOnly: e.target.checked })} />
              تهبط فيه رحلات العودة فقط، ولا يقلع منه ذهاب
            </label>
            {!a.arrivalsOnly && (
              <div>
                <p className="mb-1.5 text-xs font-bold text-gold">من يقلع منه يعود إلى</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {homes.map((x) => {
                    const self = x.id === (a.id ?? "");
                    const list = a.returnsTo?.length ? a.returnsTo : a.id ? [a.id] : [];
                    const on = list.includes(x.id);
                    return (
                      <label key={x.id} className="flex items-center gap-2 text-sm text-white">
                        <input type="checkbox" className="accent-gold" checked={on} onChange={() => setA({ ...a, returnsTo: on ? list.filter((y) => y !== x.id) : [...list, x.id] })} />
                        {x.city}
                        {self ? " (المطار نفسه)" : ""}
                      </label>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-white/55">لا يُسند حاج إلى رحلة عودة تهبط في غير ما اخترت هنا لمطار ذهابه. إن لم تختر شيئاً عاد إلى المطار نفسه.</p>
              </div>
            )}
          </div>
        )}
        {!a.archived && (
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="mb-1.5 text-xs font-bold text-gold">مندوب المطار</p>
            <p className="text-sm text-white">{initial.id && reps.length ? reps.map((u) => u.name).join("، ") : "لا مندوب له بعد."}</p>
            <p className="mt-1.5 text-xs leading-5 text-white/55">مندوب المطار من يملك صلاحية «رحلات المطار» لهذا المطار، وتُمنح من «صلاحيات الموظفين» لا من هنا. يسجّل إقلاع الرحلات من هذا المطار ومن تخلّف عنها، وهبوط الرحلات فيه، من صفحة «رحلات مطاري».</p>
          </div>
        )}
      </div>
    </Drawer>
  );
}

// ───────────────────────── Carriers ─────────────────────────

/** «الناقلون الجويون»: the carriers the flights choose from, each edited in one side sheet */
export function CarriersPage() {
  const data = useFlightsData();
  const user = useStaffUser()!;
  const may = useCan();
  const toast = useToast();
  const [archived, setArchived] = useState<"all" | "archived">("all");
  const [editing, setEditing] = useState<Partial<Carrier> | null>(null);
  const flightsOf = (id: string) => data.flights.filter((f) => f.carrierId === id).length;
  const rows = data.carriers.filter((c) => (archived === "archived" ? c.archived : !c.archived));

  const toggle = (c: Carrier) => {
    if (!c.archived && flightsOf(c.id)) return toast({ title: "الناقل مستعمل في رحلة", tone: "warning", icon: "⚠️" });
    flightsActions.saveCarrier({ ...c, archived: !c.archived });
    logAs(user, { action: c.archived ? "استعادة ناقل" : "أرشفة ناقل", target: c.name, system: "flights", area: "refs", ref: c.id });
  };

  return (
    <div className="space-y-5">
      <OperationHeader system="flights" icon={<Building2 />} />
      <RefsSwitch />
      <Title
        action={
          may("flights.carriers.POST") && (
            <AddButton onClick={() => setEditing({})}>
              <Plus className="size-4" /> إضافة ناقل
            </AddButton>
          )
        }
      />
      <Segments<"all" | "archived">
        value={archived}
        onChange={setArchived}
        label="تصفية الناقلين"
        items={[
          { value: "all", label: "الكل", count: data.carriers.filter((c) => !c.archived).length },
          { value: "archived", label: "مؤرشفون", count: data.carriers.filter((c) => c.archived).length },
        ]}
      />
      <ListTable head={["الناقل", "هاتف التنسيق", "رحلاته", "الحالة"]} minWidth="34rem">
        {rows.map((c) => (
          <tr key={c.id} className={cn("align-top", c.archived && "opacity-60")}>
            <td className="p-3">
              <button type="button" onClick={() => setEditing(c)} className="flex items-center gap-2 text-right font-bold text-white hover:text-gold">
                <span className="rounded-lg bg-white/10 px-2 py-0.5 font-mono text-xs text-gold" dir="ltr">
                  {c.code}
                </span>
                {c.name}
              </button>
              <RowActions>
                <RowLink onClick={() => setEditing(c)}>{may("flights.carriers.PUT") ? "تعديل" : "عرض"}</RowLink>
                {may("flights.carriers.archive") && (
                  <RowLink danger={!c.archived} onClick={() => toggle(c)}>
                    {c.archived ? "استعادة" : "أرشفة"}
                  </RowLink>
                )}
              </RowActions>
            </td>
            <td className="p-3 text-white/80" dir="ltr">
              {c.phone ?? "—"}
            </td>
            <td className="p-3 text-white/80">{flightsOf(c.id)}</td>
            <td className="p-3">{c.archived ? <Tag>مؤرشف</Tag> : flightsOf(c.id) ? <Tag tone="green">مستعمل</Tag> : <Tag>غير مستعمل</Tag>}</td>
          </tr>
        ))}
        {rows.length === 0 && <EmptyRow cols={4}>{archived === "archived" ? "لا ناقلين مؤرشفين." : "لا ناقلين بعد."}</EmptyRow>}
      </ListTable>

      <RecordsBox system="flights" area="refs" title="سجل المطارات والناقلين" />

      {editing && <CarrierSheet key={editing.id ?? "new"} initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CarrierSheet({ initial, onClose }: { initial: Partial<Carrier>; onClose: () => void }) {
  const user = useStaffUser()!;
  const allowed = useCan()(initial.id ? "flights.carriers.PUT" : "flights.carriers.POST");
  const toast = useToast();
  const [c, setC] = useState(initial);
  const valid = !!(c.code && c.name);
  const save = () => {
    if (!valid || !allowed) return;
    const saved: Carrier = { id: c.id ?? newFlightId("ca"), code: c.code!.toUpperCase().trim(), name: c.name!.trim(), phone: c.phone?.trim() || undefined, archived: c.archived };
    flightsActions.saveCarrier(saved);
    logAs(user, { action: c.id ? "تعديل ناقل جوي" : "إضافة ناقل جوي", target: `${saved.name} (${saved.code})`, system: "flights", area: "refs", ref: saved.id });
    toast({ title: c.id ? "حُفظ الناقل" : "أُضيف الناقل", body: saved.name, tone: "success", icon: "✈️" });
    onClose();
  };
  return (
    <Drawer
      open
      onClose={onClose}
      title={initial.id ? `تعديل ${initial.name ?? "الناقل"}` : "إضافة ناقل"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="glass" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="gold" onClick={save} disabled={!valid || !allowed} title={allowed ? undefined : "يحتاج صلاحية «تعديل — الناقلون الجويون»"}>
            <Save className="size-4" /> {initial.id ? "حفظ" : "إضافة الناقل"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الرمز">
          <input className={fieldClass} dir="ltr" value={c.code ?? ""} onChange={(e) => setC({ ...c, code: e.target.value })} placeholder="RB" />
        </Field>
        <Field label="الاسم">
          <input className={fieldClass} value={c.name ?? ""} onChange={(e) => setC({ ...c, name: e.target.value })} />
        </Field>
        <Field label="هاتف التنسيق" className="sm:col-span-2">
          <input className={fieldClass} dir="ltr" value={c.phone ?? ""} onChange={(e) => setC({ ...c, phone: e.target.value })} />
        </Field>
      </div>
    </Drawer>
  );
}
