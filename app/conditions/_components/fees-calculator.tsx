"use client";

import Link from "next/link";
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { BedDouble, Calculator, Minus, Plus, QrCode, Receipt, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { SEASON } from "@/lib/season";
import { cn, formatUSD } from "@/lib/utils";

const F = SEASON.fees;

const FEE_ROWS = [
  { label: "رسم التسجيل الأولي", amount: F.registrationPerPerson, unit: "للفرد", when: "عند تقديم الطلب", group: "رسوم" },
  { label: "رسم تسجيل الإداري", amount: F.administratorRegistration, unit: "للإداري", when: "عند التقدم للعمل كإداري", group: "رسوم" },
  { label: "رسم تشكيل مجموعة", amount: F.groupFormation, unit: "لكل مجموعة", when: "عند تشكيل المجموعة", group: "رسوم" },
  { label: "رسم تشكيل تكتل", amount: F.clusterFormation, unit: "لكل تكتل", when: "عند تشكيل التكتل", group: "رسوم" },
  { label: "تكلفة الحج", amount: F.hajjCost, unit: "للفرد", when: "1 – 15 رمضان", group: "تكاليف" },
  { label: "الهدي", amount: F.hady, unit: "للفرد", when: "1 – 15 رمضان", group: "تكاليف" },
  { label: "فارق الغرفة الخاصة (مثال)", amount: F.privateRoomDiff, unit: "للغرفة — يحدده التكتل", when: "1 – 15 رمضان", group: "تكاليف" },
];

function AnimatedUSD({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => formatUSD(Math.round(v)));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span className={cn("tabular-nums", className)}>{text}</motion.span>;
}

function Toggle({ checked, onChange, label, hint, icon: Icon }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string; icon: typeof Receipt }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition",
        checked ? "border-green-light/50 bg-green-light/8" : "border-gold/40 bg-white hover:border-gold-dark",
      )}
    >
      <span className={cn("flex size-10 items-center justify-center rounded-xl transition", checked ? "bg-green-dark text-gold" : "bg-sand text-ink-soft")}>
        <Icon className="size-5" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-bold text-ink">{label}</span>
        <span className="block text-xs text-ink-soft">{hint}</span>
      </span>
      <span className={cn("relative h-7 w-12 rounded-full transition-colors", checked ? "bg-green-light" : "bg-ink/15")}>
        <motion.span
          className="absolute top-1 size-5 rounded-full bg-white shadow"
          animate={{ right: checked ? 24 : 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </span>
    </button>
  );
}

export function FeesCalculator() {
  const [people, setPeople] = useState(4);
  const [hady, setHady] = useState(true);
  const [room, setRoom] = useState(true);

  const lines = [
    { key: "hajj", label: `تكلفة الحج (${people} × ${formatUSD(F.hajjCost)})`, amount: people * F.hajjCost, show: true },
    { key: "hady", label: `الهدي (${people} × ${formatUSD(F.hady)})`, amount: people * F.hady, show: hady },
    { key: "room", label: "فارق الغرفة الخاصة (غرفة واحدة)", amount: F.privateRoomDiff, show: room },
  ].filter((l) => l.show);
  const total = lines.reduce((a, l) => a + l.amount, 0);
  const registration = people * F.registrationPerPerson;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr] [&>*]:min-w-0">
      {/* Table */}
      <div className="rounded-[2rem] border border-gold/40 bg-white p-4 shadow-[0_30px_70px_-50px_rgba(0,89,79,.6)] sm:p-6">
        <div className="flex items-center gap-2 px-2">
          <Receipt className="size-5 text-gold-dark" />
          <h3 className="font-display text-xl font-bold text-green-dark">جدول الرسوم والتكاليف المعلنة</h3>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-gold/30">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-sand text-ink-soft">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">البند</th>
                <th className="px-4 py-3 text-start font-semibold">المبلغ</th>
                <th className="px-4 py-3 text-start font-semibold">الوحدة</th>
                <th className="px-4 py-3 text-start font-semibold">موعد الدفع</th>
              </tr>
            </thead>
            <tbody>
              {FEE_ROWS.map((r, i) => (
                <motion.tr
                  key={r.label}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className={cn("border-t border-gold/25 transition-colors hover:bg-gold-light/30", r.group === "تكاليف" && "bg-green-light/[.04]")}
                >
                  <td className="px-4 py-3 font-semibold text-ink">
                    <span className="flex items-center gap-2">
                      <span className={cn("size-1.5 rotate-45", r.group === "رسوم" ? "bg-gold-dark" : "bg-green-light")} />
                      {r.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-display text-base font-bold text-green-dark tabular-nums">{formatUSD(r.amount)}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.unit}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.when}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-gold/20 p-3 text-xs leading-6 text-ink">
          <QrCode className="mt-0.5 size-4 shrink-0 text-maroon" />
          لكل رسم وكل تكلفة إيصال رقمي مستقل برقم فريد ورمز QR، ويمكن لأي شخص التحقق منه في صفحة{" "}
          <Link href="/verify" className="font-bold text-green-dark underline decoration-gold-dark underline-offset-4">
            التحقق من الوثائق
          </Link>
        </p>
      </div>

      {/* Calculator */}
      <div className="relative overflow-hidden rounded-[2rem] bg-green-dark p-6 text-white shadow-[0_30px_70px_-40px_rgba(0,89,79,.9)] sm:p-8">
        <div className="bg-pattern absolute inset-0 opacity-10" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Calculator className="size-5 text-gold" />
            <h3 className="font-display text-xl font-bold">حاسبة التكلفة</h3>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/10 p-3">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Users className="size-5 text-gold" /> عدد الأفراد
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPeople((p) => Math.max(1, p - 1))}
                disabled={people <= 1}
                aria-label="إنقاص"
                className="flex size-9 items-center justify-center rounded-xl bg-white/15 transition hover:bg-white/25 active:scale-90 disabled:opacity-30"
              >
                <Minus className="size-4" />
              </button>
              <span className="relative w-10 overflow-hidden text-center font-display text-2xl font-bold tabular-nums">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={people}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="block"
                  >
                    {people}
                  </motion.span>
                </AnimatePresence>
              </span>
              <button
                onClick={() => setPeople((p) => Math.min(1 + SEASON.rules.maxCompanionsFamily, p + 1))}
                disabled={people >= 1 + SEASON.rules.maxCompanionsFamily}
                aria-label="زيادة"
                className="flex size-9 items-center justify-center rounded-xl bg-white/15 transition hover:bg-white/25 active:scale-90 disabled:opacity-30"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
          <div className="mt-2 flex gap-1" aria-hidden>
            {Array.from({ length: 1 + SEASON.rules.maxCompanionsFamily }, (_, i) => (
              <motion.span
                key={i}
                className="h-1.5 flex-1 rounded-full"
                animate={{ backgroundColor: i < people ? "#D9C89E" : "rgba(255,255,255,.12)" }}
              />
            ))}
          </div>
          <AnimatePresence>
            {people > 1 + SEASON.rules.maxCompanions && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden text-xs text-gold"
              >
                <span className="block pt-2">أكثر من 4 أفراد مسموح فقط لرجل مع زوجته وأولاده.</span>
              </motion.p>
            )}
          </AnimatePresence>

          <div className="mt-4 space-y-2 text-ink">
            <Toggle checked={hady} onChange={setHady} label="الهدي" hint={`${formatUSD(F.hady)} للفرد`} icon={Receipt} />
            <Toggle checked={room} onChange={setRoom} label="غرفة خاصة" hint={`فارق ${formatUSD(F.privateRoomDiff)} (مثال — يحدده التكتل)`} icon={BedDouble} />
          </div>

          <ul className="mt-5 space-y-2 border-t border-white/15 pt-4 text-sm">
            <AnimatePresence initial={false}>
              {lines.map((l) => (
                <motion.li
                  key={l.key}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between gap-3 overflow-hidden"
                >
                  <span className="text-white/80">{l.label}</span>
                  <AnimatedUSD value={l.amount} className="font-bold" />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div className="mt-4 flex items-end justify-between rounded-2xl bg-gold p-4 text-ink">
            <span>
              <span className="block text-xs font-semibold">المجموع المطلوب عند التسديد</span>
              <span className="block text-[11px] text-ink/60">إيصال مستقل لكل تكلفة: {lines.length === 1 ? "إيصال واحد" : lines.length === 2 ? "إيصالان" : `${lines.length} إيصالات`}</span>
            </span>
            <AnimatedUSD value={total} className="font-display text-3xl font-bold" />
          </div>
          <p className="mt-3 text-xs leading-6 text-white/65">
            رسم التسجيل الأولي ({people} × {formatUSD(F.registrationPerPerson)} = {formatUSD(registration)}) يُدفع عند تقديم الطلب وليس ضمن هذا المجموع.
          </p>
        </div>
      </div>
    </div>
  );
}
