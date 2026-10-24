"use client";

import { Clock, Save, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { DEFAULT_MEALS, mealsOfCluster, type MealTimes } from "@/lib/season-live";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AdminShell, LockedCard, ViewOnlyNote } from "@/app/administrator/_components/ui";
import { useAdmin } from "@/app/administrator/_lib/admin";
import { useFieldGroups } from "@/app/administrator/_lib/field-groups";
import { useAdminScope, viewOnlyText } from "@/app/administrator/_lib/scope";

type City = "makkah" | "madinah";
type Kind = "breakfast" | "lunch";
const HOTELS: { city: City; name: string }[] = [
  { city: "makkah", name: "فندق مكة" },
  { city: "madinah", name: "فندق المدينة" },
];
const KINDS: { kind: Kind; name: string }[] = [
  { kind: "breakfast", name: "الفطور" },
  { kind: "lunch", name: "الغداء" },
];

/** «HH:MM – HH:MM» */
const RANGE = /^([01]\d|2[0-3]):[0-5]\d\s*[–-]\s*([01]\d|2[0-3]):[0-5]\d$/;

const field = "w-full rounded-2xl border-2 border-gold/40 bg-white px-4 py-2.5 text-ink outline-none transition focus:border-green-light";

/**
 * «الوجبات»: the technical coordinator times his cluster's meals, because it is the cluster that contracted the
 * hotels — two a day, breakfast and lunch, at the Makkah hotel and at the Madinah hotel. The pilgrims of the
 * cluster's groups read them in «الوجبات» and on their hotels' page. The administration times none. The cluster's
 * head, its assistant and its accountant, and a group's head and its assistant, see them without changing them.
 */
export function AdminMeals() {
  const admin = useAdmin()!;
  const scope = useAdminScope();
  const clusterId = useFieldGroups()[0]?.clusterId;
  const stored = useStore((s) => (clusterId ? s.clusterMeals[clusterId] : undefined));

  if (scope.kind === "guide" || scope.kind === "none" || !clusterId) {
    return (
      <AdminShell title="الوجبات" subtitle="مواعيد الفطور والغداء في فندقَي التكتل، مكة والمدينة.">
        <LockedCard title="الوجبات لفريق عمليات التكتل" text="يضبط المنسق التقني مواعيد وجبات تكتله في فندق مكة وفي فندق المدينة، فتظهر لحجاج مجموعاته. ويراها رئيس التكتل ومعاونه ومحاسبه، ورئيس المجموعة ومعاونه." href="/portal" cta="ملفي" />
      </AdminShell>
    );
  }
  return <MealsForm key={JSON.stringify(stored ?? null)} clusterId={clusterId} by={admin.name} canAct={scope.kind === "tech"} times={mealsOfCluster(stored)} timed={!!stored} />;
}

function MealsForm({ clusterId, by, canAct, times, timed }: { clusterId: string; by: string; canAct: boolean; times: MealTimes; timed: boolean }) {
  const toast = useToast();
  const scope = useAdminScope();
  const [draft, setDraft] = useState({
    time: { makkah: { ...times.makkah }, madinah: { ...times.madinah } },
    menu: {
      makkah: { breakfast: times.menus?.makkah.breakfast ?? "", lunch: times.menus?.makkah.lunch ?? "" },
      madinah: { breakfast: times.menus?.madinah.breakfast ?? "", lunch: times.menus?.madinah.lunch ?? "" },
    },
  });
  const saved = { time: { makkah: times.makkah, madinah: times.madinah }, menu: { makkah: { breakfast: times.menus?.makkah.breakfast ?? "", lunch: times.menus?.makkah.lunch ?? "" }, madinah: { breakfast: times.menus?.madinah.breakfast ?? "", lunch: times.menus?.madinah.lunch ?? "" } } };

  const cells = HOTELS.flatMap((h) => KINDS.map((k) => ({ city: h.city, hotel: h.name, kind: k.kind, meal: k.name })));
  const invalid = cells.filter((c) => !RANGE.test(draft.time[c.city][c.kind].trim()));
  const changed = cells.filter((c) => draft.time[c.city][c.kind].trim() !== saved.time[c.city][c.kind] || draft.menu[c.city][c.kind].trim() !== saved.menu[c.city][c.kind]);

  const save = () => {
    if (!changed.length || invalid.length) return;
    const norm = (v: string) => v.trim().replace(/\s*[–-]\s*/, " – ");
    actions.setClusterMeals(clusterId, {
      makkah: { breakfast: norm(draft.time.makkah.breakfast), lunch: norm(draft.time.makkah.lunch) },
      madinah: { breakfast: norm(draft.time.madinah.breakfast), lunch: norm(draft.time.madinah.lunch) },
      menus: {
        makkah: { breakfast: draft.menu.makkah.breakfast.trim() || undefined, lunch: draft.menu.makkah.lunch.trim() || undefined },
        madinah: { breakfast: draft.menu.madinah.breakfast.trim() || undefined, lunch: draft.menu.madinah.lunch.trim() || undefined },
      },
      at: Date.now(),
      by,
    });
    for (const c of changed) {
      actions.logEvent({
        actor: by,
        role: scope.post,
        action: "تحديد موعد وجبة التكتل",
        target: `${c.meal} — ${c.hotel}`,
        before: saved.time[c.city][c.kind],
        after: norm(draft.time[c.city][c.kind]),
      });
    }
    toast({ title: `حُفظت مواعيد ${changed.length} ${changed.length === 1 ? "وجبة" : "وجبات"}`, body: "تظهر لحجاج مجموعات التكتل في «الوجبات» وفي صفحة فندقهم فوراً.", tone: "success", icon: "🍽️" });
  };

  return (
    <AdminShell title="الوجبات" subtitle="تضبط هنا مواعيد الفطور والغداء في فندق مكة وفي فندق المدينة. يراها حجاج مجموعات التكتل في «الوجبات» وفي صفحة فندقهم. ولا تحدد الإدارة وجبات.">
      {!canAct && <ViewOnlyNote>{viewOnlyText(scope, "وجبات التكتل", true)}</ViewOnlyNote>}
      <fieldset disabled={!canAct} className="min-w-0">
        <div className="grid gap-5 lg:grid-cols-2">
          {HOTELS.map((h) => (
            <div key={h.city} className="rounded-[1.75rem] border border-gold/30 bg-white p-5">
              <p className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
                <UtensilsCrossed className="size-5 text-gold-dark" /> {h.name}
              </p>
              <div className="mt-4 space-y-5">
                {KINDS.map((k) => {
                  const value = draft.time[h.city][k.kind];
                  const bad = !RANGE.test(value.trim());
                  return (
                    <label key={k.kind} className="block">
                      <span className="mb-1 flex items-center gap-2 text-sm font-bold text-ink">
                        <Clock className="size-4 text-gold-dark" /> {k.name}
                        {bad ? <Badge tone="maroon">اكتبه هكذا: 06:00 – 09:00</Badge> : value.trim() !== saved.time[h.city][k.kind] ? <Badge tone="gold">غير محفوظ</Badge> : null}
                      </span>
                      <input
                        value={value}
                        onChange={(e) => setDraft((d) => ({ ...d, time: { ...d.time, [h.city]: { ...d.time[h.city], [k.kind]: e.target.value } } }))}
                        dir="ltr"
                        placeholder="06:00 – 09:00"
                        aria-label={`${k.name} — ${h.name}`}
                        className={cn(field, "text-center font-mono", bad && "border-maroon")}
                      />
                      <span className="mt-1 block text-xs text-hint">الافتراضي: {DEFAULT_MEALS[h.city][k.kind]}</span>
                      <textarea
                        value={draft.menu[h.city][k.kind]}
                        onChange={(e) => setDraft((d) => ({ ...d, menu: { ...d.menu, [h.city]: { ...d.menu[h.city], [k.kind]: e.target.value } } }))}
                        rows={2}
                        placeholder="قائمة الطعام — فارغة: قائمة الفندق اليومية"
                        aria-label={`قائمة ${k.name} — ${h.name}`}
                        className={cn(field, "mt-2 leading-7")}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
      <p className="mt-4 text-sm text-ink-soft">
        {timed ? "ضبطتها لتكتلك." : "لم تضبط مواعيد تكتلك بعد: يرى حجاجه المواعيد الافتراضية حتى تحفظ مواعيدك."} لا وجبات في أيام السفر ولا في المشاعر.
      </p>
      {canAct && (
        <div className="mt-4 flex justify-end">
          <Button onClick={save} disabled={!changed.length || invalid.length > 0}>
            <Save className="size-4" /> حفظ مواعيد الوجبات
          </Button>
        </div>
      )}
    </AdminShell>
  );
}
