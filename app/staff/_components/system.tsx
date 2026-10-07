"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleDot, History, Lock, Megaphone, ScrollText, Send, Star } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { useStore, type AuditEvent } from "@/lib/store";
import { SYSTEM_KEYS, SYSTEMS, operationAt, useHolders, useOwns, type SystemKey } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { useAllEvents } from "./data";
import { ago, Empty, fmtDateTime, logAs, PageHeader, Panel, textareaClass, useNow, useStaffUser } from "./kit";

/**
 * What every system shares, whoever owns it: the gate that opens it to its owner alone, the list of what
 * waits for him, the request he raises to the director, the tabs of its management page and the records
 * kept in each of them. A new system is its own data and screens on top of these.
 */

/** Something the owner has to act on. `high` blocks the work: it also reaches the director */
export type Alert = { id: string; level: "high" | "work"; title: string; hint: string; href: string; action: string };

/**
 * How a file stands on the director's page, in the few words and numbers she needs: a state line, four
 * numbers in the order the work is done, and the blockers (its `high` alerts). Each file provides its own.
 */
export type SystemStatus = { state: { label: string; tone: "green" | "maroon"; icon: ReactNode }; numbers: { k: string; v: ReactNode; hint?: string }[]; high: Alert[] };

/** A system's events, newest first: its owner's records, and the director's when `important` */
export function useSystemEvents(system: SystemKey, importantOnly = false) {
  const events = useAllEvents();
  return useMemo(() => events.filter((e) => e.system === system && (!importantOnly || e.important)), [events, system, importantOnly]);
}

/** Important events of every system the director has not seen yet, for her menu's badge */
export function useSystemsUnseen() {
  const seen = useStore((s) => s.systems?.seen);
  const events = useAllEvents();
  return useMemo(() => events.filter((e) => e.live && e.important && SYSTEM_KEYS.includes(e.system as SystemKey) && e.at > (seen?.[e.system!] ?? 0)).length, [events, seen]);
}

export function SystemGate({ system, children }: { system: SystemKey; children: ReactNode }) {
  const user = useStaffUser()!;
  const owns = useOwns(user, system);
  const holders = useHolders()[system];
  if (owns) return children;
  return (
    <div className="grid min-h-[calc(50vh/var(--zoom))] place-items-center">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative max-w-md overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-green-dark/95 to-[#00352f]/95 p-8 text-center text-white">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-maroon/40 text-gold">
          <Lock className="size-8" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">صلاحية «{SYSTEMS[system].label}» ليست لك</h1>
        <p className="mt-2 leading-7 text-white/75">
          {holders.length ? `يحملها ${holders.map((h) => h.staff.name).join(" و")}، ويدير بها الملف كله.` : "لم تُمنح لأحد بعد."} يمنح مدير الموسم صلاحيات الإدارة ويسحبها من «صلاحيات الإدارة»، ويتابع حال كل ملف وأحداثه المهمة من هناك.
        </p>
      </motion.div>
    </div>
  );
}

/**
 * The head of one operation's page: its name, under the file it belongs to, and what it is for. Each operation
 * is an entry of its own in the menu, so the page carries no tabs of the file's other operations.
 */
export function OperationHeader({ system, icon, actions }: { system: SystemKey; icon: ReactNode; actions?: ReactNode }) {
  const pathname = usePathname();
  const op = operationAt(system, pathname);
  return <PageHeader eyebrow={SYSTEMS[system].label} title={op.label} icon={icon} description={op.desc} actions={actions} />;
}

/** What waits for the owner now, each item one click from the page it is done in */
export function Todo({ alerts, empty }: { alerts: Alert[]; empty: string }) {
  return (
    <Panel icon={<CircleDot />} title="ما ينتظرك الآن" action={alerts.length > 0 && <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold ring-1", alerts.some((a) => a.level === "high") ? "bg-maroon text-white ring-maroon-light" : "bg-gold/20 text-gold ring-gold/40")}>{alerts.length}</span>}>
      {alerts.length === 0 ? (
        <Empty icon={<CheckCircle2 />} title="لا شيء ينتظرك" text={empty} />
      ) : (
        <ul className="space-y-2">
          {alerts.map((a, i) => (
            <motion.li key={a.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <div className={cn("flex flex-wrap items-center gap-3 rounded-2xl p-3 ring-1", a.level === "high" ? "bg-maroon/20 ring-maroon/50" : "bg-white/[.06] ring-white/10")}>
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", a.level === "high" ? "bg-maroon text-white" : "bg-gold/20 text-gold")}>
                  {a.level === "high" ? <AlertTriangle className="size-4" /> : <CircleDot className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white">{a.title}</p>
                  <p className="text-xs leading-5 text-white/70">{a.hint}</p>
                </div>
                <Link href={a.href} className="flex shrink-0 items-center gap-1 rounded-xl bg-gold px-3 py-2 text-sm font-bold text-ink transition hover:bg-gold-light">
                  {a.action} <ArrowLeft className="size-4" />
                </Link>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs leading-5 text-white/55">ما عليه علامة حمراء يعطّل العمل، فيصل إلى مديرة الموسم أيضاً حتى تعالجه.</p>
    </Panel>
  );
}

/** What the owner cannot settle alone goes to the director, as a request she sees on her board */
export function Escalate({ system, open, onClose, example }: { system: SystemKey; open: boolean; onClose: () => void; example: string }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [text, setText] = useState("");
  const send = () => {
    if (text.trim().length < 5) return;
    logAs(user, { action: "رفع أمر إلى المدير", target: SYSTEMS[system].label, detail: text.trim(), system, important: true });
    toast({ title: "وصل الأمر إلى مديرة الموسم", body: "يظهر عندها في «صلاحيات الإدارة» طلبَ تدخّل.", tone: "success", icon: "📨" });
    setText("");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} className="max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
      <p className="text-xs font-bold text-gold">رفع أمر إلى المدير</p>
      <h3 className="mt-1 font-display text-xl font-bold">ما الذي يحتاج تدخّل الإدارة؟</h3>
      <p className="mt-1 text-sm leading-7 text-white/70">لما لا تحسمه وحدك من شؤون {SYSTEMS[system].label}. يصل إليها مع اسمك ووقته.</p>
      <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} className={cn(textareaClass, "mt-4")} placeholder={example} aria-label="الأمر المرفوع" />
      <div className="mt-4 flex gap-2">
        <Button variant="gold" onClick={send} disabled={text.trim().length < 5}>
          <Send className="size-4" /> إرسال
        </Button>
        <Button variant="glass" onClick={onClose}>
          إلغاء
        </Button>
      </div>
    </Modal>
  );
}

/** What the owner raised to the director: his side of the conversation */
export function Raised({ system, onRaise, hint }: { system: SystemKey; onRaise: () => void; hint: string }) {
  const user = useStaffUser()!;
  const raised = useSystemEvents(system, true).filter((e) => e.action === "رفع أمر إلى المدير" && e.actor === user.name);
  const now = useNow(30_000);
  return (
    <Panel icon={<Send />} title="ما رفعته إلى المدير">
      {raised.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm leading-7 text-white/70">{hint}</p>
          <Button size="sm" variant="glass" onClick={onRaise}>
            <Megaphone className="size-4" /> رفع أمر
          </Button>
        </div>
      ) : (
        <ol className="space-y-2">
          {raised.slice(0, 5).map((e) => (
            <li key={e.id} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <p className="text-sm leading-6 text-white">{e.detail}</p>
              <p className="mt-1 text-[11px] text-white/50">{e.live ? ago(e.at, now) : fmtDateTime(e.at)}</p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function Row({ e, now }: { e: AuditEvent & { live: boolean }; now: number }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-xl bg-white/[.05] px-3 py-2 ring-1 ring-white/10">
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5 text-sm font-bold text-white">
        {e.important && <Star className="size-3 shrink-0 fill-gold text-gold" aria-label="وصل إلى المدير" />}
        <span>
          {e.action}
          {e.target ? ` — ${e.target}` : ""}
          {(e.after || e.detail) && <span className="font-normal text-white/65">: {[e.before && `${e.before} ←`, e.after, e.detail].filter(Boolean).join(" ")}</span>}
        </span>
      </span>
      <span className="text-[11px] text-white/50">
        {e.actor} · {e.live ? ago(e.at, now) : fmtDateTime(e.at)}
      </span>
    </li>
  );
}

/** A tab's records: what changed in this part of the system, by whom and when — where it is worked on */
export function SystemRecords({ system, area, title }: { system: SystemKey; area: string; title: string }) {
  const events = useSystemEvents(system).filter((e) => e.area === area);
  const now = useNow(30_000);
  const [shown, setShown] = useState(6);
  return (
    <Panel icon={<ScrollText />} title={title} action={<span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white/70 ring-1 ring-white/15">{events.length}</span>}>
      {events.length === 0 ? (
        <p className="text-sm text-white/60">لا شيء مسجّل في هذا الجزء بعد. كل ما تفعله هنا يُسجَّل باسمك ووقته.</p>
      ) : (
        <ol className="space-y-2">
          {events.slice(0, shown).map((e) => (
            <Row key={e.id} e={e} now={now} />
          ))}
        </ol>
      )}
      {events.length > shown && (
        <Button size="sm" variant="glass" className="mt-3" onClick={() => setShown(shown + 20)}>
          عرض المزيد ({events.length - shown})
        </Button>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-white/50">
        <Star className="size-3 fill-gold text-gold" /> وصل إلى مديرة الموسم أيضاً.
      </p>
    </Panel>
  );
}

/** One record's own history — a centre's, an exam's, a flight's — inside the form or sheet it is worked on in */
export function RecordHistory({ system, refId, bare = false }: { system: SystemKey; refId: string; bare?: boolean }) {
  const events = useSystemEvents(system).filter((e) => e.ref === refId);
  const now = useNow(30_000);
  return (
    <div className={bare ? "" : "border-t border-white/10 pt-4"}>
      {!bare && (
        <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white">
          <History className="size-4 text-gold" /> سجلّه
        </p>
      )}
      {events.length === 0 ? (
        <p className="text-xs text-white/55">لا تغييرات مسجّلة عليه بعد.</p>
      ) : (
        <ol className="space-y-2">
          {events.slice(0, bare ? 40 : 8).map((e) => (
            <Row key={e.id} e={e} now={now} />
          ))}
        </ol>
      )}
    </div>
  );
}
