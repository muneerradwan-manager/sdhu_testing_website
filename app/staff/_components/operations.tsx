"use client";

import { CalendarRange, Lock } from "lucide-react";
import { useToast } from "@/components/ui/widgets";
import { controls, dayLabel, statusLabel, useOperations, type OperationKey, type OperationMode, type OperationState } from "@/lib/operations";
import { PERMISSION_LABELS } from "@/lib/staff";
import { actions } from "@/lib/store";
import { cn, nowMs } from "@/lib/utils";
import { Panel, logAs, useStaffUser } from "./kit";

const MODES: { key: OperationMode; label: string }[] = [
  { key: "auto", label: "تلقائي بالتواريخ" },
  { key: "on", label: "فعال" },
  { key: "off", label: "غير فعال" },
];

const TONE: Record<OperationState["status"], string> = {
  open: "bg-green-light/25 text-white",
  on: "bg-green-light/25 text-white",
  always: "bg-white/10 text-white/80",
  upcoming: "bg-gold/25 text-gold",
  closed: "bg-white/10 text-white/55",
  off: "bg-maroon/50 text-white",
};

/**
 * The settings of the season's operations, one row each: its state, its start and end, and who controls it.
 * `keys` limits it to a file's own operations; the season settings show them all. Only whoever controls an
 * operation (its permission, or the season director) changes it, and every change is in the events log.
 */
export function OperationsPanel({ keys, system, area, title = "مواعيد العمليات وتفعيلها" }: { keys?: OperationKey[]; system?: string; area?: string; title?: string }) {
  const user = useStaffUser();
  const toast = useToast();
  const ops = useOperations().filter((o) => !keys || keys.includes(o.key));
  if (!user) return null;

  const change = (o: OperationState, patch: { mode?: OperationMode; start?: string; end?: string }, what: string, before: string, after: string) => {
    actions.setOperation(o.key, { ...patch, by: user.name, at: nowMs() });
    logAs(user, { action: `${what} — ${o.label}`, target: o.label, before, after, system, area, ref: o.key, important: true });
    toast({ title: o.label, body: `${what}: ${after}`, icon: "🗓️", tone: "info" });
  };

  return (
    <Panel title={title} icon={<CalendarRange />}>
      <p className="mb-4 text-sm leading-7 text-white/70">
        كل عملية تبويب مستقل عند الإداريين، تُفتح وحدها في تاريخ بدايتها وتُغلق بعد تاريخ نهايتها. ويستطيع من يتحكم بها فتحها أو إيقافها بيده مهما كانت تواريخها، ثم إعادتها إلى التواريخ.
      </p>
      <ul className="space-y-2.5">
        {ops.map((o) => {
          const mine = controls(user, o);
          return (
            <li key={o.key} className="rounded-2xl bg-white/[.06] p-3.5 ring-1 ring-white/10">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">
                    {o.label} {o.estimate && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-bold text-gold">موعد تقديري — لم يُعلن بعد</span>}
                  </p>
                  <p className="text-xs leading-5 text-white/60">{o.desc}</p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", TONE[o.status])}>{statusLabel(o)}</span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-[auto_1fr_1fr]">
                <div role="radiogroup" aria-label={`حالة ${o.label}`} className="flex rounded-xl bg-black/20 p-1">
                  {MODES.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      role="radio"
                      aria-checked={o.mode === m.key}
                      disabled={!mine}
                      onClick={() => o.mode !== m.key && change(o, { mode: m.key }, "تغيير حالة العملية", MODES.find((x) => x.key === o.mode)!.label, m.label)}
                      className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed", o.mode === m.key ? "bg-gold text-ink" : "text-white/70 hover:text-white disabled:hover:text-white/70")}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {(["start", "end"] as const).map((k) => (
                  <label key={k} className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-1.5 text-xs">
                    <span className="shrink-0 text-white/60">{k === "start" ? "البداية" : "النهاية"}</span>
                    <input
                      type="date"
                      value={o[k] ?? ""}
                      disabled={!mine}
                      onChange={(e) => change(o, { [k]: e.target.value || undefined }, k === "start" ? "تغيير تاريخ البداية" : "تغيير تاريخ النهاية", dayLabel(o[k], true) || "بلا تاريخ", dayLabel(e.target.value, true) || "بلا تاريخ")}
                      className="min-w-0 flex-1 bg-transparent font-bold text-white outline-none [color-scheme:dark] disabled:opacity-60"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-white/50">
                {!mine && <Lock className="size-3" />}
                يتحكم بها: صاحب صلاحية «{PERMISSION_LABELS[o.control]}»
                {o.control !== "season.settings" && " ومديرة الموسم"}
                {o.by && ` — آخر تغيير: ${o.by}`}
              </p>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
