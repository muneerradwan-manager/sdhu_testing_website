"use client";

import { Bus, ClipboardList, HeartPulse, Luggage, Tent, UserRoundSearch, Utensils } from "lucide-react";
import type { ReactNode } from "react";
import { SLA_MINUTES, type Zone } from "@/lib/data/staff-seed";
import { groupName } from "@/lib/groups";
import type { StaffUser } from "@/lib/staff";
import { actions, type Ticket } from "@/lib/store";
import { ensureTicket, toTicket, type QueueTicket } from "../_components/data";
import { logAs } from "../_components/kit";

export const KIND_ICON: Record<Ticket["kind"], ReactNode> = {
  missing: <UserRoundSearch />,
  health: <HeartPulse />,
  transport: <Bus />,
  meal: <Utensils />,
  room: <Tent />,
  lost: <Luggage />,
  complaint: <ClipboardList />,
};

/** Severity styles for the dark room — brand palette only, each level still distinct at a glance */
export const SEVERITY = {
  critical: { label: "حرجة", dot: "bg-maroon ring-2 ring-white", chip: "bg-maroon text-white ring-1 ring-white/30", icon: "bg-maroon text-white ring-white/40", hex: "#672146", stroke: "#FFFFFF" },
  high: { label: "عالية", dot: "bg-maroon-light ring-1 ring-gold-light/80", chip: "bg-maroon-light/70 text-white", icon: "bg-maroon-light/70 text-white ring-white/20", hex: "#7A2631", stroke: "#E4DDD3" },
  medium: { label: "متوسطة", dot: "bg-gold", chip: "bg-gold/25 text-gold", icon: "bg-gold/20 text-gold ring-gold/40", hex: "#D9C89E", stroke: "#012a25" },
  low: { label: "منخفضة", dot: "bg-green-light", chip: "bg-white/10 text-white/85", icon: "bg-green-light/20 text-white ring-green-light/40", hex: "#289E92", stroke: "#012a25" },
} as const;

export const STATUS_LABEL: Record<Ticket["status"], string> = { open: "مفتوح", in_progress: "قيد المعالجة", resolved: "مغلق" };

export const ZONE_LABELS: Record<Zone, string> = { makkah: "مكة — الفندق", jamarat: "الجمرات", mina: "منى", muzdalifah: "مزدلفة", arafat: "عرفة" };

export const ASSIGNEES = ["د. ليلى شمس — الفريق الطبي", "باسل النوري — المواصلات", "فادي سلوم — غرفة العمليات", "الفريق الميداني للتكتل", "مشرف الإعاشة", `أحمد الحمصي — رئيس ${groupName(27)}`];

/** The room's decisions, as the shift log lists them */
export const OPS_ACTIONS = ["إسناد بلاغ", "تحديث بلاغ", "إغلاق بلاغ", "تغيير حالة بلاغ", "اعتماد حافلة إضافية", "نقل مهمة داخلية", "إنشاء مهمة داخلية"];

export function sla(t: QueueTicket, now: number) {
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
export const escalated = (t: QueueTicket, now: number) => t.severity === "critical" && t.status !== "resolved" && now - t.at > 15 * 60000;

/** A seeded ticket becomes a stored one the first time somebody acts on it */
export function materialize(t: QueueTicket) {
  if (t.seed) ensureTicket(toTicket(t));
}

/** Moves a ticket to another status, in its own timeline and in the events log */
export function setTicketStatus(user: StaffUser, t: QueueTicket, status: Ticket["status"]) {
  if (status === t.status) return false;
  materialize(t);
  actions.updateTicket(t.id, { status }, { by: user.name, text: `تغيّرت الحالة: ${STATUS_LABEL[t.status]} ← ${STATUS_LABEL[status]}` });
  logAs(user, { action: status === "resolved" ? "إغلاق بلاغ" : "تغيير حالة بلاغ", target: `بلاغ ${t.id} — ${t.name}`, before: STATUS_LABEL[t.status], after: STATUS_LABEL[status] });
  return true;
}

export function statusToast(t: QueueTicket, status: Ticket["status"]) {
  return status === "resolved"
    ? { title: `أُغلق البلاغ ${t.id}`, body: t.fromPilgrim ? "وصل إشعار الإغلاق للحاج مع سؤال تقييم سرعة الاستجابة." : "سُجّل الإغلاق باسمك.", tone: "success" as const, icon: "✅" }
    : { title: `البلاغ ${t.id}: ${STATUS_LABEL[status]}`, tone: "info" as const, icon: "🔄" };
}
