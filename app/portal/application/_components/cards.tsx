"use client";

import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Plane, RotateCw } from "lucide-react";
import { useState } from "react";
import { Emblem } from "@/components/brand/logo";
import { CLUSTER, FLIGHTS, GROUP, PLACES, type Assignment } from "@/lib/journey";
import { ageOf, fullName } from "@/lib/registry";
import { cn, maskNationalId } from "@/lib/utils";

/** Digital Hajj card (also printed on the wristband) — tap to flip to the QR side */
export function HajjCard({ a, emergency, index }: { a: Assignment; emergency: string; index: number }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 30, rotate: index % 2 ? 2 : -2 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, type: "spring", damping: 18 }}
      onClick={() => setFlipped((f) => !f)}
      className="group w-full shrink-0 snap-center text-right [perspective:1200px] sm:w-[22rem]"
      aria-label={`بطاقة ${a.person.firstName} — اضغط للقلب`}
    >
      <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="relative aspect-[1.58] [transform-style:preserve-3d]">
        {/* Front */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl bg-gradient-to-br from-green-dark via-green to-green-dark p-5 text-white shadow-2xl [backface-visibility:hidden]">
          <div className="bg-pattern absolute inset-0 opacity-20" />
          <div className="absolute -left-10 -top-10 size-40 rounded-full bg-gold/20 blur-2xl" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,.18)_50%,transparent_60%)] bg-[length:250%_100%] transition-[background-position] duration-1000 group-hover:bg-[position:100%_0]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Emblem className="size-8" />
                <span className="text-xs leading-tight">
                  <span className="block font-bold">بطاقة الحاج الرقمية</span>
                  <span className="text-gold">موسم 1448هـ</span>
                </span>
              </span>
              <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-ink">المجموعة {GROUP.number}</span>
            </div>
            <div className="mt-auto flex items-end gap-3">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-gold/60 bg-white/10 font-display text-3xl font-bold text-gold">{a.person.firstName[0]}</span>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-bold">{fullName(a.person)}</p>
                <p className="text-xs text-white/70">{a.relationLabel} — {ageOf(a.person)} عاماً</p>
                <p className="font-mono text-xs text-gold" dir="ltr">{a.bracelet}</p>
              </div>
            </div>
            <p className="mt-2 flex items-center justify-between text-[10px] text-white/60">
              <span>{CLUSTER.name}</span>
              <span className="flex items-center gap-1"><RotateCw className="size-3" /> اضغط للقلب</span>
            </p>
          </div>
        </div>
        {/* Back */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-gold/40 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="flex h-full gap-4">
            <div className="flex flex-col items-center justify-center">
              <QRCodeSVG value={`HAJJ1448|${a.bracelet}|${a.person.id.slice(-4)}`} size={112} fgColor="#021526" />
              <span className="mt-1 font-mono text-[10px] text-hint" dir="ltr">{maskNationalId(a.person.id)}</span>
            </div>
            <dl className="min-w-0 flex-1 space-y-1.5 text-xs text-ink">
              <div><dt className="text-hint">الفندق — مكة</dt><dd className="font-bold">{PLACES.makkahHotel.name} — غرفة {a.room}</dd></div>
              <div><dt className="text-hint">رئيس المجموعة</dt><dd className="font-bold">{GROUP.team[0].name}</dd></div>
              <div><dt className="text-hint">منى</dt><dd className="font-bold">مخيم 42 — خيمة {a.tent}</dd></div>
              <div><dt className="text-hint">الطوارئ</dt><dd className="font-bold">{emergency}</dd></div>
              {a.needs.length > 0 && <div><dt className="text-hint">احتياجات (للفريق الطبي)</dt><dd className="font-bold text-maroon">{a.needs.join("، ")}</dd></div>}
            </dl>
          </div>
        </div>
      </motion.div>
    </motion.button>
  );
}

type Flight = typeof FLIGHTS.outbound;

export function BoardingPass({ f, seats, label, tone = "green" }: { f: Flight; seats: { name: string; seat: string }[]; label: string; tone?: "green" | "maroon" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_60px_-30px_rgba(2,21,38,.4)] ring-1 ring-gold/40">
      <div className={cn("relative p-6 text-white", tone === "green" ? "bg-green-dark" : "bg-maroon")}>
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative flex items-center justify-between">
          <span className="text-sm font-bold text-gold">{label}</span>
          <span className="rounded-full bg-white/15 px-3 py-1 font-mono text-sm" dir="ltr">{f.code}</span>
        </div>
        <div className="relative mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3" dir="ltr">
          <div>
            <p className="font-display text-4xl font-bold md:text-5xl">{f.from.code}</p>
            <p className="text-sm text-white/75" dir="rtl">{f.from.city}</p>
            <p className="mt-1 font-mono text-xl font-bold text-gold">{f.departure}</p>
          </div>
          <div className="relative flex w-24 flex-col items-center md:w-40">
            <svg viewBox="0 0 160 50" className="w-full overflow-visible">
              <path id={`arc-${f.code}`} d="M5 45 Q80 -15 155 45" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeDasharray="4 6" />
              <motion.circle r="4" fill="#D9C89E" initial={{ offsetDistance: "0%" }} style={{ offsetPath: "path('M5 45 Q80 -15 155 45')" }} animate={{ offsetDistance: ["0%", "100%"] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }} />
            </svg>
            <Plane className="-mt-3 size-5 rotate-45 text-gold" />
            <span className="mt-1 text-xs text-white/70" dir="rtl">{f.duration}</span>
          </div>
          <div className="text-right">
            <p className="font-display text-4xl font-bold md:text-5xl">{f.to.code}</p>
            <p className="text-sm text-white/75" dir="rtl">{f.to.city}</p>
            <p className="mt-1 font-mono text-xl font-bold text-gold">{f.arrival}</p>
          </div>
        </div>
      </div>
      <div className="relative h-6 bg-white">
        <span className="absolute -right-3 top-0 size-6 rounded-full bg-sand" />
        <span className="absolute -left-3 top-0 size-6 rounded-full bg-sand" />
        <span className="absolute inset-x-6 top-1/2 border-t-2 border-dashed border-gold-light" />
      </div>
      <div className="grid gap-4 p-6 pt-2 md:grid-cols-[1fr_auto]">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-3">
          {[
            ["التاريخ", `${f.hijri}`],
            ["الميلادي", f.gregorian],
            ["الحضور إلى المطار", f.airportAt],
            ["الصعود", `${f.boardingAt} — ${f.gate}`],
            ["التجمّع", f.gathering],
            ["الأمتعة", f.baggage],
          ].map(([k, v]) => (
            <div key={k} className={k === "الأمتعة" || k === "التجمّع" ? "col-span-2 md:col-span-3" : ""}>
              <dt className="text-xs text-hint">{k}</dt>
              <dd className="font-bold leading-6">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col items-center gap-2 border-t border-dashed border-gold-light pt-4 md:border-r md:border-t-0 md:pr-6 md:pt-0">
          <QRCodeSVG value={`BOARD|${f.code}|${seats.map((s) => s.seat).join(",")}`} size={92} fgColor="#021526" />
          <span className="text-[10px] text-hint">بطاقة الصعود تُصدر من كاونتر الحملة</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-gold-light bg-sand/60 px-6 py-4">
        {seats.map((s) => (
          <span key={s.name + s.seat} className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm shadow-sm">
            {s.name} <span className="rounded-md bg-green-dark px-1.5 font-mono text-xs font-bold text-gold" dir="ltr">{s.seat}</span>
          </span>
        ))}
      </div>
      <p className="px-6 pb-5 text-sm text-ink-soft">بعد الهبوط: {f.afterLanding}</p>
    </motion.div>
  );
}
