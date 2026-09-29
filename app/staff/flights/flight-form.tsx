"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AUDIENCE_LABEL, FLIGHT_SEASON, at, isoDate, isoTime, newFlightId, type Audience, type Direction, type Flight, type FlightsData } from "@/lib/flights";
import { cn } from "@/lib/utils";
import { Drawer } from "../_components/kit";
import { Field, fieldClass, selectClass } from "../_components/ops-ui";

/** One way (outbound or return) or both at once: a round trip creates two flights that point at each other */
export type Trip = "outbound" | "return" | "round";
export const TRIP_LABEL: Record<Trip, string> = { outbound: "ذهاب فقط", return: "عودة فقط", round: "ذهاب وعودة" };

type Leg = { flightNo: string; carrierId: string; fromId: string; toId: string; departDate: string; departTime: string; arriveDate: string; arriveTime: string; gate: string; gathering: string };

export type FlightDraft = {
  id?: string;
  trip: Trip;
  audience: Audience;
  capacity: number;
  staffReserve: number;
  notes: string;
  /** The outbound leg, or the only leg of a one-way flight */
  a: Leg;
  /** The return leg of a round trip */
  b: Leg;
};

const outboundLeg = (): Leg => ({ flightNo: "", carrierId: "ca-rb", fromId: "ap-dam", toId: "ap-jed", departDate: "2027-05-04", departTime: "06:00", arriveDate: "2027-05-04", arriveTime: "08:30", gate: "", gathering: "ساحة المزة — الحافلات 01:30" });
const returnLeg = (): Leg => ({ flightNo: "", carrierId: "ca-rb", fromId: "ap-med", toId: "ap-dam", departDate: "2027-06-01", departTime: "14:00", arriveDate: "2027-06-01", arriveTime: "17:10", gate: "صالة الحجاج", gathering: "بهو الفندق — 08:00" });

export function emptyFlight(audience: Audience = "pilgrims", trip: Trip = "round"): FlightDraft {
  return { trip, audience, capacity: audience === "staff" ? 40 : 300, staffReserve: audience === "staff" ? 0 : 8, notes: "", a: trip === "return" ? returnLeg() : outboundLeg(), b: returnLeg() };
}

const legOf = (f: Flight): Leg => ({
  flightNo: f.flightNo,
  carrierId: f.carrierId,
  fromId: f.fromId,
  toId: f.toId,
  departDate: isoDate(f.departAt),
  departTime: isoTime(f.departAt),
  arriveDate: isoDate(f.arriveAt),
  arriveTime: isoTime(f.arriveAt),
  gate: f.gate ?? "",
  gathering: f.gathering ?? "",
});

export function draftOf(f: Flight): FlightDraft {
  return { id: f.id, trip: f.direction, audience: f.audience, capacity: f.capacity, staffReserve: f.staffReserve, notes: f.notes ?? "", a: legOf(f), b: returnLeg() };
}

function build(d: FlightDraft, leg: Leg, direction: Direction, existing: Flight | undefined, by: string): Flight {
  const staff = d.audience === "staff";
  return {
    ...(existing ?? { id: newFlightId("f48"), season: FLIGHT_SEASON, status: "draft" as const, groundLegs: [], createdBy: by, createdAt: Date.now() }),
    direction,
    audience: d.audience,
    flightNo: leg.flightNo.trim(),
    carrierId: leg.carrierId,
    fromId: leg.fromId,
    toId: leg.toId,
    departAt: at(leg.departDate, leg.departTime),
    arriveAt: at(leg.arriveDate, leg.arriveTime),
    capacity: d.capacity,
    staffReserve: staff ? 0 : d.staffReserve,
    gate: leg.gate.trim() || undefined,
    gathering: leg.gathering.trim() || undefined,
    notes: d.notes.trim() || undefined,
  };
}

/** The flight to save, and its return when the draft is a round trip */
export function toFlights(d: FlightDraft, existing: Flight | undefined, by: string): { main: Flight; back?: Flight } {
  const main = build(d, d.a, d.trip === "return" ? "return" : "outbound", existing, by);
  return d.trip === "round" && !existing ? { main, back: build(d, d.b, "return", undefined, by) } : { main };
}

function legError(l: Leg, label: string) {
  if (!l.flightNo.trim()) return `اكتب رقم رحلة ${label}`;
  if (l.fromId === l.toId) return `مطار المغادرة ومطار الوصول في رحلة ${label} لا يكونان واحداً`;
  if (at(l.arriveDate, l.arriveTime) <= at(l.departDate, l.departTime)) return `الوصول في رحلة ${label} يكون بعد المغادرة`;
  return null;
}

export function validate(d: FlightDraft, assigned: { pilgrims: number; staff: number }): string | null {
  const round = d.trip === "round" && !d.id;
  const e = legError(d.a, round || d.trip === "outbound" ? "الذهاب" : "العودة") ?? (round ? legError(d.b, "العودة") : null);
  if (e) return e;
  if (round && at(d.b.departDate, d.b.departTime) <= at(d.a.arriveDate, d.a.arriveTime)) return "العودة تكون بعد وصول الذهاب";
  if (d.capacity < 1) return "السعة رقم أكبر من صفر";
  if (d.audience === "pilgrims" && d.staffReserve >= d.capacity) return "حجز الموظفين أقل من السعة";
  const pilgrimSeats = d.audience === "staff" ? 0 : d.capacity - d.staffReserve;
  if (assigned.pilgrims > pilgrimSeats) return `على الرحلة ${assigned.pilgrims} حاجاً مسنداً — لا تُنقص المقاعد تحتهم`;
  const staffSeats = d.audience === "staff" ? d.capacity : d.staffReserve;
  if (assigned.staff > staffSeats) return `على الرحلة ${assigned.staff} موظفاً مسنداً — لا تُنقص حجزهم`;
  return null;
}

function LegFields({ title, leg, onChange, data }: { title: string; leg: Leg; onChange: (l: Leg) => void; data: FlightsData }) {
  const set = <K extends keyof Leg>(k: K, v: Leg[K]) => onChange({ ...leg, [k]: v });
  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <h3 className="mb-3 font-display font-bold text-gold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="رقم الرحلة"><input className={fieldClass} dir="ltr" value={leg.flightNo} onChange={(e) => set("flightNo", e.target.value)} placeholder="RB 513" /></Field>
        <Field label="الناقل الجوي">
          <select className={selectClass} value={leg.carrierId} onChange={(e) => set("carrierId", e.target.value)}>
            {data.carriers.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </select>
        </Field>
        <Field label="مطار المغادرة">
          <select className={selectClass} value={leg.fromId} onChange={(e) => set("fromId", e.target.value)}>
            {data.airports.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.city} — {a.code}</option>)}
          </select>
        </Field>
        <Field label="مطار الوصول">
          <select className={selectClass} value={leg.toId} onChange={(e) => set("toId", e.target.value)}>
            {data.airports.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.city} — {a.code}</option>)}
          </select>
        </Field>
        <Field label="تاريخ المغادرة"><input type="date" className={fieldClass} value={leg.departDate} onChange={(e) => onChange({ ...leg, departDate: e.target.value, arriveDate: leg.arriveDate < e.target.value ? e.target.value : leg.arriveDate })} /></Field>
        <Field label="وقت المغادرة"><input type="time" className={fieldClass} value={leg.departTime} onChange={(e) => set("departTime", e.target.value)} /></Field>
        <Field label="تاريخ الوصول"><input type="date" className={fieldClass} value={leg.arriveDate} onChange={(e) => set("arriveDate", e.target.value)} /></Field>
        <Field label="وقت الوصول"><input type="time" className={fieldClass} value={leg.arriveTime} onChange={(e) => set("arriveTime", e.target.value)} /></Field>
        <Field label="البوابة"><input className={fieldClass} value={leg.gate} onChange={(e) => set("gate", e.target.value)} placeholder="البوابة 3" /></Field>
        <Field label="مكان التجمّع وموعده"><input className={fieldClass} value={leg.gathering} onChange={(e) => set("gathering", e.target.value)} /></Field>
      </div>
    </div>
  );
}

export function FlightForm({ open, onClose, initial, data, onSave, assigned, notifyCount }: { open: boolean; onClose: () => void; initial: FlightDraft; data: FlightsData; onSave: (d: FlightDraft) => void; assigned: { pilgrims: number; staff: number }; notifyCount: number }) {
  const [d, setD] = useState<FlightDraft>(initial);
  const [key, setKey] = useState(initial);
  if (key !== initial) {
    setKey(initial);
    setD(initial);
  }
  const set = <K extends keyof FlightDraft>(k: K, v: FlightDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const error = validate(d, assigned);
  const pilgrimSeats = d.audience === "staff" ? 0 : d.capacity - d.staffReserve;
  const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));
  const editing = !!d.id;
  const setTrip = (trip: Trip) =>
    setD((x) => ({ ...x, trip, a: trip === "return" ? (x.trip === "return" ? x.a : returnLeg()) : x.trip === "return" ? outboundLeg() : x.a }));
  const setAudience = (audience: Audience) => setD((x) => ({ ...x, audience, staffReserve: audience === "staff" ? 0 : x.staffReserve || 8, capacity: audience === "staff" && x.capacity > 80 ? 40 : x.capacity }));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? `تعديل الرحلة ${d.a.flightNo}` : d.trip === "round" ? "رحلة ذهاب وعودة جديدة" : "رحلة جديدة"}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-white/70">{error ?? (notifyCount ? `سيُبلَّغ ${notifyCount} مسافراً بهذا التغيير` : editing ? "" : d.trip === "round" ? "تُحفظ الرحلتان مسودتين مرتبطتين، ثم تُنشر كل منهما من صفحتها" : "تُحفظ مسودة، ثم تُنشر من صفحتها")}</span>
          <div className="flex gap-2">
            <Button variant="glass" onClick={onClose}>إلغاء</Button>
            <Button variant="gold" disabled={!!error} onClick={() => onSave(d)}><Save className="size-4" /> {editing ? "حفظ التعديلات" : d.trip === "round" ? "حفظ الرحلتين" : "حفظ المسودة"}</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="لمن الرحلة" hint={d.audience === "staff" ? "كل مقاعدها للموظفين: موظف واحد أو أكثر، بلا حد" : "مجموعات الحجاج، مع حجز للمرافقين من الموظفين"}>
            <select className={selectClass} value={d.audience} onChange={(e) => setAudience(e.target.value as Audience)} disabled={editing}>
              {(["pilgrims", "staff"] as Audience[]).map((x) => <option key={x} value={x}>{AUDIENCE_LABEL[x]}</option>)}
            </select>
          </Field>
          <div>
            <span className="mb-1.5 block text-xs font-bold text-gold">نوع الرحلة</span>
            <div className="flex gap-1 rounded-2xl bg-white/10 p-1" role="radiogroup" aria-label="نوع الرحلة">
              {(["outbound", "return", "round"] as Trip[]).map((t) => (
                <button key={t} type="button" role="radio" aria-checked={d.trip === t} disabled={editing && t !== d.trip} onClick={() => setTrip(t)} className={cn("flex-1 rounded-xl px-2 py-2 text-sm font-bold transition disabled:opacity-40", d.trip === t ? "bg-gold text-ink" : "text-white/85 hover:text-white")}>
                  {TRIP_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <Field label="السعة (مقاعد الطائرة)"><input type="number" min={1} className={fieldClass} value={d.capacity} onChange={(e) => set("capacity", num(e.target.value))} /></Field>
          {d.audience === "pilgrims" ? (
            <Field label="حجز الموظفين المرافقين" hint={`مقاعد الحجاج = ${pilgrimSeats}`}>
              <input type="number" min={0} className={fieldClass} value={d.staffReserve} onChange={(e) => set("staffReserve", num(e.target.value))} />
            </Field>
          ) : (
            <Field label="ملاحظات"><input className={fieldClass} value={d.notes} onChange={(e) => set("notes", e.target.value)} placeholder="طليعة البعثة، فريق متأخر…" /></Field>
          )}
        </div>
        <LegFields title={d.trip === "return" ? "رحلة العودة" : d.trip === "round" && !editing ? "رحلة الذهاب" : editing ? "الرحلة" : "رحلة الذهاب"} leg={d.a} onChange={(l) => set("a", l)} data={data} />
        {d.trip === "round" && !editing && <LegFields title="رحلة العودة" leg={d.b} onChange={(l) => set("b", l)} data={data} />}
        {d.audience === "pilgrims" && <Field label="ملاحظات"><input className={fieldClass} value={d.notes} onChange={(e) => set("notes", e.target.value)} placeholder="يراها مسؤول الطيران وغرفة العمليات فقط" /></Field>}
        {d.trip === "round" && !editing && <p className="text-xs text-white/60">السعة وحجز الموظفين نفسهما للرحلتين، ويمكن تعديل كل رحلة بعد حفظها.</p>}
      </div>
    </Drawer>
  );
}
