"use client";

import { Bus, CalendarClock, Users } from "lucide-react";
import { LIST_KINDS, unitById, useLists, useMyLists } from "@/lib/rite-lists";
import type { Application } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * «قوائمي»: the bus each member of the family rides before each rite — the Tarwiya, Arafat, Mina's days, the travel
 * to Madinah — and the Rawdah's list he is on (its men's or its women's), as the group's technical coordinator put
 * them on the buses the Hajj and Umrah staff gave the cluster.
 */
export function MyLists({ app }: { app: Application }) {
  const ids = app.members.map((m) => m.person.id);
  const seats = useMyLists(ids);
  const lists = useLists();
  return (
    <section id="lists" className="rounded-[2rem] border border-gold/30 bg-white p-5 md:p-7">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
        <Bus className="size-6 text-gold-dark" /> قوائمي: الحافلات والروضة الشريفة
      </h2>
      <p className="mt-1 text-sm text-ink-soft">قبل كل منسك يضع منسق مجموعتك عائلتك على حافلة من حافلات التكتل، ويضع من يذهب إلى الروضة الشريفة على قائمة الرجال أو النساء.</p>
      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {LIST_KINDS.map((k) => {
          const mine = seats.map((s) => ({ ...s, u: unitById(s.unitId, lists.units) })).filter((s) => s.u?.kind === k.key);
          return (
            <li key={k.key} className={cn("rounded-2xl border p-4", mine.length ? "border-green-light/40 bg-green-light/5" : "border-gold/25 bg-sand/40")}>
              <p className="font-bold text-green-dark">{k.label}</p>
              <p className="flex items-center gap-1.5 text-xs text-hint"><CalendarClock className="size-3.5" /> {k.when}</p>
              {mine.length === 0 ? (
                <p className="mt-2 text-sm text-ink-soft">لم توضعوا على هذه القائمة بعد.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {app.members.map((m) => {
                    const s = mine.find((x) => x.personId === m.person.id);
                    return (
                      <li key={m.person.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">{m.person.firstName}</span>
                        {s?.u ? (
                          <span className="flex items-center gap-1 text-ink-soft">
                            {k.key === "rawdah" ? <Users className="size-3.5 text-gold-dark" /> : <Bus className="size-3.5 text-gold-dark" />}
                            {s.u.label}{s.u.kind !== "rawdah" && s.u.plate ? ` — اللوحة ${s.u.plate}` : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-hint">لم يوضع بعد</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
