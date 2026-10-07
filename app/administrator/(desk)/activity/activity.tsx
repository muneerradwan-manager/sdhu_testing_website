"use client";

import { ScrollText } from "lucide-react";
import { useMemo } from "react";
import { Card } from "@/components/portal/shell";
import { Badge } from "@/components/ui/widgets";
import { useStore } from "@/lib/store";
import { gregorianDate } from "@/lib/utils";
import { useAdmin } from "../../_lib/admin";
import { AdminShell, SectionTitle } from "../../_components/ui";

/** «سجل نشاطي»: a tab of its own — everything done in his name, newest first, day by day. Append-only */
export function AdminActivity() {
  const admin = useAdmin()!;
  const events = useStore((s) => s.events);
  const days = useMemo(() => {
    const mine = events.filter((e) => e.actor === admin.name).sort((a, b) => b.at - a.at);
    const out: { day: string; items: typeof mine }[] = [];
    for (const e of mine) {
      const day = gregorianDate(new Date(e.at), { weekday: "long" });
      const last = out.at(-1);
      if (last?.day === day) last.items.push(e);
      else out.push({ day, items: [e] });
    }
    return out;
  }, [events, admin.name]);
  const total = days.reduce((n, d) => n + d.items.length, 0);

  return (
    <AdminShell title="سجل نشاطي" subtitle="كل خطوة تُسجَّل باسمك في سجل الأحداث — للإضافة فقط، لا يُعدَّل ولا يُحذف.">
      <Card className="md:p-8">
        <SectionTitle icon={ScrollText} action={<Badge tone="gold">{total} حدثاً</Badge>}>
          ما فعلته على المنصة
        </SectionTitle>
        {total === 0 ? (
          <p className="mt-4 rounded-2xl bg-sand p-4 text-sm text-ink-soft">لا أحداث بعد.</p>
        ) : (
          <div className="mt-5 space-y-6">
            {days.map((d) => (
              <section key={d.day}>
                <p className="mb-2 text-sm font-bold text-gold-dark">{d.day}</p>
                <ul className="space-y-2">
                  {d.items.map((e) => (
                    <li key={e.id} className="flex items-start justify-between gap-3 rounded-2xl bg-sand px-4 py-3 text-sm">
                      <span className="min-w-0">
                        <span className="font-bold text-ink">{e.action}</span>
                        {e.target && <span className="text-ink-soft"> — {e.target}</span>}
                        {e.detail && <span className="block text-xs leading-5 text-ink-soft">{e.detail}</span>}
                      </span>
                      <time className="shrink-0 font-mono text-xs text-hint" dir="ltr">
                        {new Date(e.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </time>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
