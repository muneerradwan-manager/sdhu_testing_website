"use client";

import { motion } from "motion/react";
import { ScrollText, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/portal/shell";
import { fullName, getPerson } from "@/lib/registry";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PilgrimShell } from "../_components/pilgrim-shell";

const when = (at: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(at);

/**
 * «سجل نشاطي»: what the pilgrim did on the platform, and what was done for his application — the office that
 * reviewed his documents and attached him to his group, his group's head, the medical team — newest first.
 */
export default function ActivityPage() {
  const sid = useStore((s) => s.sessionId) ?? "";
  const app = useStore((s) => s.applications[sid]);
  const events = useStore((s) => s.events);
  const [who, setWho] = useState<"all" | "me" | "others">("all");
  const me = getPerson(sid);
  const myName = me ? fullName(me) : "";
  const mine = useMemo(() => {
    const target = app ? `طلب ${app.number}` : null;
    return events
      .filter((e) => (target && e.target?.startsWith(target)) || (myName && e.actor === myName))
      .sort((a, b) => b.at - a.at);
  }, [events, app, myName]);
  const byMe = (role: string) => role === "حاج";
  const shown = mine.filter((e) => who === "all" || (who === "me" ? byMe(e.role) : !byMe(e.role)));

  return (
    <PilgrimShell title="سجل نشاطي" subtitle="كل ما قمت به على المنصة، وكل ما جرى على طلبك: من راجع وثائقك، ومن ألحقك بمجموعتك، وما أسنده إليك رئيس مجموعتك.">
      <Card className="md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
            <ScrollText className="size-7 text-gold-dark" /> {app ? `طلب ${app.number}` : "حسابي"}
          </p>
          <div className="flex gap-1 rounded-2xl bg-sand p-1" role="group" aria-label="من قام به">
            {(
              [
                ["all", `الكل (${mine.length})`],
                ["me", "ما قمت به"],
                ["others", "ما جرى على طلبي"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={who === k} onClick={() => setWho(k)} className={cn("rounded-xl px-3 py-1.5 text-sm font-bold transition", who === k ? "bg-green-dark text-white" : "text-ink-soft hover:bg-white")}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-sand p-6 text-center text-ink-soft">لا شيء هنا بعد. يُسجَّل كل ما تقوم به على طلبك، وكل ما يجري عليه، لحظة حدوثه.</p>
        ) : (
          <ol className="mt-6 space-y-2">
            {shown.map((e, i) => (
              <motion.li key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="flex gap-3 rounded-2xl border border-gold/30 p-3">
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", byMe(e.role) ? "bg-gold/30 text-maroon" : "bg-green-dark text-gold")}>
                  <UserRound className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">{e.action}</p>
                  {e.detail && <p className="text-sm leading-6 text-ink-soft">{e.detail}</p>}
                  <p className="mt-0.5 text-xs text-hint">
                    {byMe(e.role) ? "أنت" : `${e.actor} — ${e.role}`} · {when(e.at)}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        )}
      </Card>
    </PilgrimShell>
  );
}
