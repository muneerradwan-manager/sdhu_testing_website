"use client";

import { Building2 } from "lucide-react";
import { DemoJump } from "@/components/app/operation-closed";
import { useToast } from "@/components/ui/widgets";
import { groupName, suggestedGroupName } from "@/lib/groups";
import { rangeLabel, useOperation } from "@/lib/operations";
import { useSeason } from "@/lib/season-live";
import { actions, useStore, type ClusterInvite } from "@/lib/store";
import { nowMs } from "@/lib/utils";
import { adminReceipt, logAdmin, resultOf, useAdmin } from "@/app/administrator/_lib/admin";
import { nextGroupNumber } from "@/app/administrator/_lib/capacity";
import { fitSeats, usePicks } from "@/app/administrator/_lib/formation";
import { DEFAULT_TIER, categoryOf, categoryOfId, seatsOf, useCadre, useStructure } from "@/app/administrator/_lib/structure";
import { seedContract } from "@/app/administrator/_components/contract-view";
import { SimButton } from "@/app/administrator/_components/ui";

/** The employee of the administrators' desk who forms the groups at the office in the demo */
const DESK = "مازن الحلبي";

/**
 * The demo's stand-in for the visit to the office: the group head who passed the written test and the oral exam
 * comes with his team, and the desk's employee forms his group as «تشكيل مجموعة في المكتب» does in the staff
 * portal — its number and a name, his category, the guide and the assistant its category seats (qualified people
 * free of any other group), the fee with its receipt, and the signed contract (the season's sample page). Only in
 * the formation's dates; before them it offers to move the demo's day there.
 */
export function OfficeFormationSim() {
  const admin = useAdmin()!;
  const toast = useToast();
  const season = useSeason();
  const s = useStructure();
  const cadre = useCadre();
  const admins = useStore((x) => x.admins);
  const op = useOperation("group-formation");
  const picks = usePicks(undefined);
  const p = admin.profile;
  if (!p || p.group?.approvedAt) return null;

  const head = p.positions[0] === "group-head";
  const res = resultOf(p);
  const ready = head && res.passed && !!res.published;

  const form = () => {
    const at = nowMs();
    const number = p.group?.number ?? nextGroupNumber(admins, admin.id);
    const name = (p.group?.name ?? suggestedGroupName(number)).replace(/^مجموعة\s+/, "");
    const cat = categoryOf(admin.id, cadre) ?? s.categories[0]?.id ?? "c1";
    if (!categoryOf(admin.id, cadre)) actions.setCadre("category", admin.id, cat);
    const n = seatsOf(s, DEFAULT_TIER, cat);
    const label = categoryOfId(s, cat)?.name ?? "";
    // Whoever already sits in a group's seat sits in no other
    const taken = new Set(Object.values(admins).flatMap((a) => [...(a.group?.seats ?? []).map((x) => x.who?.id), a.group?.countAssistant?.id]).filter((x): x is string => !!x));
    taken.add(admin.id);
    const seats = fitSeats(s, DEFAULT_TIER, cat).map((seat) => {
      const pool = seat.free ? [...picks("guideSeat"), ...picks("assistantSeat")] : picks(seat.kind === "guide" ? "guideSeat" : "assistantSeat");
      const x = pool.find((y) => !y.takenBy && !taken.has(y.id));
      if (!x) return seat;
      taken.add(x.id);
      const who: ClusterInvite = { id: x.id, name: x.name, at, status: "accepted" };
      return { ...seat, who };
    });
    const contract = { ...seedContract("group", `عقد مجموعة ${name}`), at, by: DESK };
    actions.upsertAdmin(admin.id, {
      group: { number, name, capacity: n.pilgrims, capacityTier: label, requestedAt: p.group?.requestedAt ?? at, feePaidAt: at, approvedAt: at, approvedBy: DESK, seats, contract },
    });
    const team = seats.flatMap((x) => (x.who ? [x.who.name] : []));
    logAdmin(admin.id, "شُكّلت مجموعته في المكتب (محاكاة)", groupName(number), `${label}: ${n.pilgrims} حاجاً في الاقتصادي — فريقها: ${team.join("، ") || "—"} — رسم ${season.fees.groupFormation} $ بإيصال ${adminReceipt(admin.id, "G", number)} — العقد موقّع ومرفوع`, { area: "groups", ref: String(number) });
    toast({ title: `شُكّلت مجموعة ${name}`, body: `شكّلها ${DESK} في المكتب: ${label}، ${n.pilgrims} حاجاً${team.length ? ` — فريقها: ${team.join("، ")}` : ""}. تجدها في «إدارة المجموعة»، وعقدها في «العقود».`, tone: "success", icon: "🏛️" });
  };

  return (
    <div className="mt-6 rounded-[2rem] border-2 border-dashed border-gold-dark/50 bg-white p-6 md:p-8">
      <p className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
        <Building2 className="size-6 text-gold-dark" /> في النسخة التجريبية: محاكاة المكتب
      </p>
      <p className="mt-2 leading-8 text-ink-soft">
        بدل الحضور إلى المكتب، تحاكي المنصة ما يفعله موظف إدارة الإداريين ({DESK}) حين تحضر مع فريقك: يشكّل مجموعتك برقمها واسم مقترح لها وفئتك، ويُجلس في مقاعدها موجّهاً ومعاوناً مؤهلَين غير مُجلسَين في مجموعة أخرى، ويسجّل رسم التشكيل {season.fees.groupFormation} $ بإيصاله، ويرفع العقد الموقّع (نموذج الموسم).
      </p>
      <div className="mt-4">
        {!head ? (
          <p className="rounded-2xl bg-sand p-3 text-sm text-ink-soft">تشكيل المجموعة لرئيس المجموعة وحده.</p>
        ) : !ready ? (
          <p className="rounded-2xl bg-sand p-3 text-sm text-ink-soft">تُشكَّل المجموعة بعد نجاحك في الاختبار المؤتمت والامتحان الشفهي معاً.</p>
        ) : !op.open ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-sand p-3 text-sm text-ink-soft">
            <span>{op.status === "upcoming" ? `يبدأ تشكيل المجموعات ${rangeLabel(op.start, op.end)}` : "انتهت مدة تشكيل المجموعات"}</span>
            <DemoJump state={op} />
          </div>
        ) : (
          <SimButton onClick={form}>محاكاة: حضرتُ مع فريقي إلى المكتب فشكّل الموظف مجموعتي</SimButton>
        )}
      </div>
    </div>
  );
}
