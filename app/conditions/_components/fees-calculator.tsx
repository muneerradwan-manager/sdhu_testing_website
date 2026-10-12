"use client";

import Link from "next/link";
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { BedDouble, Calculator, Minus, Plus, QrCode, Receipt, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang, useT } from "@/lib/i18n";
import { installmentsOf, planAmounts, planLabel, seasonPlan, type Plan } from "@/lib/installments";
import { RoomPicker } from "@/components/ui/room-picker";
import { accommodationCost, bedsOf, costBreakdown, defaultRooms, describeRooms, ROOM_BEDS, type RoomCounts } from "@/lib/rooms";
import { SEASON } from "@/lib/season";
import { cn, formatUSD } from "@/lib/utils";
import { phraseEn } from "../_lib/en";

const F = SEASON.fees;

type T = ReturnType<typeof useT>;

function feeRows(t: T) {
  return [
    { key: "registration", label: t("رسم التسجيل", "Registration fee"), amount: F.registrationPerPerson, unit: t("للفرد", "per person"), when: t("عند تقديم الطلب", "When applying"), group: "fees" },
    { key: "admin", label: t("رسم تسجيل الإداري", "Administrator registration fee"), amount: F.administratorRegistration, unit: t("للإداري", "per administrator"), when: t("عند التقدم للعمل كإداري", "When applying to work as an administrator"), group: "fees" },
    { key: "group", label: t("رسم تشكيل مجموعة", "Group formation fee"), amount: F.groupFormation, unit: t("لكل مجموعة", "per group"), when: t("عند تشكيل المجموعة", "When the group is formed"), group: "fees" },
    { key: "cluster", label: t("رسم تشكيل تكتل", "Cluster formation fee"), amount: F.clusterFormation, unit: t("لكل تكتل", "per cluster"), when: t("عند تشكيل التكتل", "When the cluster is formed"), group: "fees" },
    { key: "cost", label: t("تكلفة الحج كاملة", "Full Hajj cost"), amount: F.hajjCost, unit: t("للفرد", "per person"), when: t("على دفعتين هذا الموسم (بقرار الإدارة)", "In two instalments this season (by decision of the Administration)"), group: "costs" },
    {
      key: "first",
      label: t("الدفعة الأولى", "First instalment"),
      amount: F.firstInstallment,
      unit: t("للفرد", "per person"),
      when: t("مع التسجيل على القبول المباشر، أو عند تثبيت التسجيل لمن قُبل بالقرعة", "With registration for direct acceptance, or on confirming registration if accepted in the lottery"),
      group: "costs",
    },
    { key: "second", label: t("الدفعة الثانية", "Second instalment"), amount: F.hajjCost - F.firstInstallment, unit: t("للفرد", "per person"), when: t("عند الانضمام إلى مجموعة", "On joining a group"), group: "costs" },
    { key: "hady", label: t("الهدي", "Hady (sacrificial animal)"), amount: F.hady, unit: t("للفرد", "per person"), when: t("عند الانضمام إلى مجموعة", "On joining a group"), group: "costs" },
    { key: "general", label: t("السكن العام", "Shared accommodation"), amount: 0, unit: t("الرجال وحدهم والنساء وحدهن", "Men and women housed separately"), when: "—", group: "costs" },
    {
      key: "private",
      label: t("السكن الخاص (مثال)", "Private accommodation (example)"),
      amount: `${formatUSD(F.roomExample[4])} – ${formatUSD(F.roomExample[1])}`,
      unit: t(
        "للفرد — غرف لأفراد الطلب وحدهم، لكل فرد سرير، من غرفة بأربعة أسرّة إلى المفردة؛ يحدده التكتل",
        "per person — rooms for the members of the application only, a bed each, from a four-bed room to a single; set by the cluster",
      ),
      when: t("عند الانضمام إلى مجموعة", "On joining a group"),
      group: "costs",
    },
  ];
}

const ROOM_KIND_EN = { 1: "single", 2: "two-bed", 3: "three-bed", 4: "four-bed" } as const;

/** describeRooms (lib/rooms) in English: «one four-bed room and one two-bed room» */
function roomsEn(r: RoomCounts) {
  return [...ROOM_BEDS]
    .reverse()
    .filter((b) => r[b] > 0)
    .map((b) => (r[b] === 1 ? `one ${ROOM_KIND_EN[b]} room` : `${r[b]} ${ROOM_KIND_EN[b]} rooms`))
    .join(" and ");
}

/** planLabel (lib/installments) in English */
function planEn(plan: Plan) {
  if (plan === 1) return `one full payment (${formatUSD(F.hajjCost)} per person)`;
  const [a, b] = planAmounts(2, F);
  return `two instalments: ${formatUSD(a)} then ${formatUSD(b)} per person on joining a group`;
}

function AnimatedUSD({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => formatUSD(Math.round(v)));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span className={cn("tabular-nums", className)}>{text}</motion.span>;
}

function Toggle({ checked, onChange, label, hint, icon: Icon, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string; icon: typeof Receipt; disabled?: boolean }) {
  const en = useLang() === "en";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition disabled:cursor-not-allowed disabled:opacity-70",
        // The toggles sit on the calculator's dark green: a selected one stays a solid light card, so its dark text
        // keeps reading (a see-through tint left dark text on dark green)
        checked ? "border-green-light bg-white shadow-[0_0_0_3px_rgba(40,158,146,.45)]" : "border-gold/40 bg-white hover:border-gold-dark",
      )}
    >
      <span className={cn("flex size-10 items-center justify-center rounded-xl transition", checked ? "bg-green-dark text-gold" : "bg-sand text-ink-soft")}>
        <Icon className="size-5" />
      </span>
      <span className="flex-1">
        <span className={cn("block text-sm font-bold", checked ? "text-green-dark" : "text-ink")}>{label}</span>
        <span className="block text-xs text-ink-soft">{hint}</span>
      </span>
      <span className={cn("relative h-7 w-12 rounded-full transition-colors", checked ? "bg-green-light" : "bg-ink/15")}>
        <motion.span
          className="absolute top-1 size-5 rounded-full bg-white shadow"
          animate={en ? { left: checked ? 24 : 4 } : { right: checked ? 24 : 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </span>
    </button>
  );
}

export function FeesCalculator() {
  const t = useT();
  const FEE_ROWS = feeRows(t);
  const [people, setPeople] = useState(4);
  const [hady, setHady] = useState(true);
  const [room, setRoom] = useState(true);
  // Private rooms spread the request as the family likes, one bed per member; a new count starts from the fewest rooms
  const [rooms, setRooms] = useState<RoomCounts>(() => defaultRooms(4));
  const plan = seasonPlan();
  const fits = bedsOf(rooms) === people;
  const roomCost = accommodationCost({ kind: "private", rooms }, F.roomExample)!;
  const changePeople = (next: number) => {
    setPeople(next);
    setRooms(defaultRooms(next));
  };

  const lines = [
    ...installmentsOf(plan, people, "0", F).map((i) => ({ key: i.key, label: t(`${i.title} — ${i.due}`, `${phraseEn(i.title)} — ${phraseEn(i.due)}`), amount: i.amount, show: true })),
    { key: "hady", label: t(`الهدي (${people} × ${formatUSD(F.hady)})`, `Hady (${people} × ${formatUSD(F.hady)})`), amount: people * F.hady, show: hady },
    // One receipt for all the rooms, as on the pilgrim's statement
    {
      key: "room",
      label: t(`السكن الخاص — ${describeRooms(rooms)} (${costBreakdown(roomCost.parts)})`, `Private rooms — ${roomsEn(rooms)} (${costBreakdown(roomCost.parts)})`),
      amount: roomCost.amount,
      show: room && fits,
    },
  ].filter((l) => l.show);
  const total = lines.reduce((a, l) => a + l.amount, 0);
  const registration = people * F.registrationPerPerson;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr] [&>*]:min-w-0">
      {/* Table */}
      <div className="rounded-[2rem] border border-gold/40 bg-white p-4 shadow-[0_30px_70px_-50px_rgba(0,89,79,.6)] sm:p-6">
        <div className="flex items-center gap-2 px-2">
          <Receipt className="size-5 text-gold-dark" />
          <h3 className="font-display text-xl font-bold text-green-dark">{t("جدول الرسوم والتكاليف المعلنة", "Published fees and costs")}</h3>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-gold/30">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-sand text-ink-soft">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">{t("البند", "Item")}</th>
                <th className="px-4 py-3 text-start font-semibold">{t("المبلغ", "Amount")}</th>
                <th className="px-4 py-3 text-start font-semibold">{t("الوحدة", "Unit")}</th>
                <th className="px-4 py-3 text-start font-semibold">{t("موعد الدفع", "When due")}</th>
              </tr>
            </thead>
            <tbody>
              {FEE_ROWS.map((r, i) => (
                <motion.tr
                  key={r.key}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className={cn("border-t border-gold/25 transition-colors hover:bg-gold-light/30", r.group === "costs" && "bg-green-light/[.04]")}
                >
                  <td className="px-4 py-3 font-semibold text-ink">
                    <span className="flex items-center gap-2">
                      <span className={cn("size-1.5 rotate-45", r.group === "fees" ? "bg-gold-dark" : "bg-green-light")} />
                      {r.label}
                    </span>
                  </td>
                  <td
                    className={cn("px-4 py-3 font-display text-base font-bold text-green-dark tabular-nums", typeof r.amount === "number" && "whitespace-nowrap")}
                    dir={typeof r.amount === "string" ? "ltr" : undefined}
                  >
                    {typeof r.amount === "string" ? r.amount : r.amount === 0 ? t("دون كلفة", "No charge") : formatUSD(r.amount)}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{r.unit}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.when}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-gold/20 p-3 text-xs leading-6 text-ink">
          <QrCode className="mt-0.5 size-4 shrink-0 text-maroon" />
          <span>
            {t(
              "لكل رسم وكل تكلفة إيصال رقمي مستقل برقم فريد ورمز QR، ويمكن لأي شخص التحقق منه في صفحة",
              "Every fee and every cost has its own digital receipt with a unique number and a QR code, which anyone can check on the page",
            )}{" "}
            <Link href="/verify" className="font-bold text-green-dark underline decoration-gold-dark underline-offset-4">
              {t("التحقق من الوثائق", "Verify documents")}
            </Link>
          </span>
        </p>
      </div>

      {/* Calculator */}
      <div className="relative overflow-hidden rounded-[2rem] bg-green-dark p-6 text-white shadow-[0_30px_70px_-40px_rgba(0,89,79,.9)] sm:p-8">
        <div className="bg-pattern absolute inset-0 opacity-10" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Calculator className="size-5 text-gold" />
            <h3 className="font-display text-xl font-bold">{t("حاسبة التكلفة", "Cost calculator")}</h3>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/10 p-3">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Users className="size-5 text-gold" /> {t("عدد الأفراد", "Number of people")}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changePeople(Math.max(1, people - 1))}
                disabled={people <= 1}
                aria-label={t("إنقاص", "Fewer")}
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
                onClick={() => changePeople(Math.min(1 + SEASON.rules.maxCompanionsFamily, people + 1))}
                disabled={people >= 1 + SEASON.rules.maxCompanionsFamily}
                aria-label={t("زيادة", "More")}
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
                <span className="block pt-2">{t("أكثر من 4 أفراد مسموح فقط لرجل مع زوجته وأولاده.", "More than 4 people is allowed only for a man with his wife and children.")}</span>
              </motion.p>
            )}
          </AnimatePresence>

          <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/85">{t(`حددت الإدارة لهذا الموسم: ${planLabel(plan)}`, `This season the Administration has set ${planEn(plan)}.`)}</p>

          <div className="mt-4 space-y-2 text-ink">
            <Toggle checked={hady} onChange={setHady} label={t("الهدي", "Hady (sacrificial animal)")} hint={t(`${formatUSD(F.hady)} للفرد`, `${formatUSD(F.hady)} per person`)} icon={Receipt} />
            <Toggle
              checked={room}
              onChange={setRoom}
              label={t("غرف خاصة لكم", "Private rooms for you")}
              hint={
                room
                  ? t(`${describeRooms(rooms) || "وزّعوا الأفراد على الغرف"} — بأسعار مثال، يحددها التكتل`, `${roomsEn(rooms) || "Share the people out between the rooms"} — example prices; the cluster sets them`)
                  : t("وإلا فالسكن العام دون كلفة: الرجال وحدهم والنساء وحدهن", "Otherwise shared accommodation at no charge: men and women housed separately")
              }
              icon={BedDouble}
            />
          </div>
          <AnimatePresence initial={false}>
            {room && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="pt-3">
                  <RoomPicker people={people} prices={F.roomExample} rooms={rooms} onChange={setRooms} dark />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                  <AnimatedUSD value={l.amount} className="whitespace-nowrap font-bold" />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div className="mt-4 flex items-end justify-between rounded-2xl bg-gold p-4 text-ink">
            <span>
              <span className="block text-xs font-semibold">{t("مجموع التكاليف", "Total costs")}</span>
              <span className="block text-[11px] text-ink/60">
                {t(
                  `إيصال مستقل لكل تكلفة: ${lines.length === 1 ? "إيصال واحد" : lines.length === 2 ? "إيصالان" : `${lines.length} إيصالات`}`,
                  `A separate receipt for each cost: ${lines.length === 1 ? "1 receipt" : `${lines.length} receipts`}`,
                )}
              </span>
            </span>
            <AnimatedUSD value={total} className="whitespace-nowrap font-display text-3xl font-bold" />
          </div>
          <p className="mt-3 text-xs leading-6 text-white/65">
            {t(
              `رسم التسجيل (${people} × ${formatUSD(F.registrationPerPerson)} = ${formatUSD(registration)}) يُدفع عند تقديم الطلب وليس ضمن هذا المجموع. في القبول المباشر تُدفع الأولى معه، وفي القرعة عند تثبيت التسجيل لمن قُبل.`,
              `The registration fee (${people} × ${formatUSD(F.registrationPerPerson)} = ${formatUSD(registration)}) is paid when you apply and is not part of this total. For direct acceptance the first instalment is paid with it; in the lottery, when an accepted applicant confirms registration.`,
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
