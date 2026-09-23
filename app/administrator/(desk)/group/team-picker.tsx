"use client";

import { AnimatePresence, motion } from "motion/react";
import { Loader2, RotateCcw, Search, Send, Star, UserCheck, UserRoundX, UsersRound, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { cn, maskNationalId } from "@/lib/utils";
import { logAdmin, nowMs, useAdmin } from "../../_lib/admin";
import { TEAM_ROLES, searchRoster, skillLabel, type Candidate } from "../../_lib/roster";

/** One role's invitation: it goes to a single person, and he answers it from his own application */
export type Invite = { candidate: Candidate; at: number; status: "pending" | "accepted" | "declined"; reason?: string };
export type TeamPick = Record<string, Invite | undefined>;

const DECLINE_REASONS = ["ارتبط بمجموعة أخرى هذا الموسم", "ظرف صحي في العائلة", "يفضّل مجموعة في منطقته"];

export function teamComplete(team: TeamPick) {
  return TEAM_ROLES.every((r) => team[r.key]?.status === "accepted");
}

export function teamNames(team: TeamPick) {
  return TEAM_ROLES.map((r) => team[r.key]?.candidate.name).filter(Boolean) as string[];
}

/**
 * The group head builds his team himself: for every role he searches the administrators who qualified
 * this season and sends ONE invitation to ONE person — never a blanket call to everyone. The invited
 * administrator accepts or apologises from his own application, and the head may withdraw an invitation
 * or invite someone else instead.
 */
export function TeamPicker({ team, setTeam, groupNumber }: { team: TeamPick; setTeam: (t: TeamPick) => void; groupNumber: number }) {
  const timers = useRef<number[]>([]);
  return (
    <div className="mt-3 space-y-4">
      {TEAM_ROLES.map((role) => (
        <RoleSlot key={role.key} role={role} invite={team[role.key]} groupNumber={groupNumber} timers={timers} onChange={(inv) => setTeam({ ...team, [role.key]: inv })} />
      ))}
    </div>
  );
}

function RoleSlot({
  role,
  invite,
  groupNumber,
  timers,
  onChange,
}: {
  role: (typeof TEAM_ROLES)[number];
  invite: Invite | undefined;
  groupNumber: number;
  timers: React.RefObject<number[]>;
  onChange: (inv: Invite | undefined) => void;
}) {
  const admin = useAdmin()!;
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [freeOnly, setFreeOnly] = useState(true);
  const [open, setOpen] = useState(false);
  const results = searchRoster(role.key, query, freeOnly);
  const shown = query.trim() || open ? results.slice(0, 6) : [];

  const send = (c: Candidate) => {
    onChange({ candidate: c, at: nowMs(), status: "pending" });
    setQuery("");
    setOpen(false);
    logAdmin(admin.id, `دعوة فردية إلى ${role.label} في المجموعة ${groupNumber}`, c.name, `الرقم الوطني ${maskNationalId(c.id)} — ${c.office} — نتيجة التأهيل ${c.score}`);
    toast({ title: `أُرسلت الدعوة إلى ${c.name}`, body: "تصله وحده، ويوافق أو يعتذر من تطبيقه.", icon: "✉️", tone: "info" });
    const t = window.setTimeout(() => onChange({ candidate: c, at: nowMs(), status: "accepted" }), 2600);
    timers.current.push(t);
  };

  const withdraw = () => {
    if (!invite) return;
    logAdmin(admin.id, `سحب دعوة ${role.label}`, invite.candidate.name, `المجموعة ${groupNumber}`);
    onChange(undefined);
    toast({ title: "سُحبت الدعوة", body: `${invite.candidate.name} — يمكنك دعوة غيره.`, icon: "↩️", tone: "info" });
  };

  const decline = () => {
    if (!invite) return;
    const reason = DECLINE_REASONS[Math.floor(Math.random() * DECLINE_REASONS.length)];
    onChange({ ...invite, status: "declined", reason });
    logAdmin(admin.id, `اعتذار عن دعوة ${role.label}`, invite.candidate.name, reason);
  };

  return (
    <div className={cn("rounded-2xl border-2 p-4 transition", invite?.status === "accepted" ? "border-green-light/60 bg-green-light/5" : invite?.status === "declined" ? "border-maroon/40 bg-maroon/5" : "border-gold/40 bg-white")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-bold text-ink">
          <UsersRound className="size-4 text-gold-dark" /> {role.label}
        </p>
        {invite?.status === "accepted" ? (
          <Badge tone="green">
            <UserCheck className="size-3.5" /> وافق من تطبيقه
          </Badge>
        ) : invite?.status === "pending" ? (
          <Badge tone="gold">
            <Loader2 className="size-3.5 animate-spin" /> بانتظار موافقته
          </Badge>
        ) : (
          <Badge tone="ink">لم تُرسل دعوة بعد</Badge>
        )}
      </div>
      <p className="mt-0.5 text-xs text-hint">{role.note}</p>

      <AnimatePresence mode="wait">
        {invite ? (
          <motion.div key="picked" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white/70 p-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sand font-display font-bold text-green-dark">{invite.candidate.name.replace("الشيخ ", "")[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{invite.candidate.name}</p>
              <p className="text-xs text-ink-soft">
                {invite.candidate.office} — {invite.candidate.area} — نتيجة التأهيل {invite.candidate.score}
              </p>
              {invite.status === "declined" && <p className="mt-0.5 text-xs font-bold text-maroon">اعتذر: {invite.reason}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {invite.status === "pending" && (
                <button type="button" onClick={decline} className="rounded-full border border-dashed border-maroon/40 px-3 py-1 text-xs font-semibold text-maroon/80">
                  محاكاة: يعتذر
                </button>
              )}
              <Button size="sm" variant="ghost" onClick={withdraw}>
                {invite.status === "declined" ? <><RotateCcw className="size-4" /> ادعُ غيره</> : invite.status === "accepted" ? <><X className="size-4" /> استبدال</> : <><X className="size-4" /> سحب الدعوة</>}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-0 flex-1">
                <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-hint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setOpen(true)}
                  placeholder={`ابحث عن ${role.label} بالاسم أو المنطقة أو الرقم الوطني`}
                  aria-label={`البحث عن ${role.label}`}
                  className="h-12 w-full rounded-2xl border-2 border-gold/50 bg-white pr-10 pl-4 text-sm outline-none focus:border-green-light"
                />
              </label>
              <button
                type="button"
                aria-pressed={freeOnly}
                onClick={() => setFreeOnly(!freeOnly)}
                className={cn("rounded-full border-2 px-3 py-2 text-xs font-bold transition", freeOnly ? "border-green-dark bg-green-dark text-white" : "border-gold/50 bg-white text-ink-soft")}
              >
                المتاحون فقط
              </button>
              {!query.trim() && (
                <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>
                  {open ? "إخفاء" : "تصفّح الناجحين"}
                </Button>
              )}
            </div>
            {shown.length === 0 && (query.trim() || open) && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-sand px-3 py-2.5 text-sm text-hint">
                <UserRoundX className="size-4" /> لا نتائج مطابقة{freeOnly ? " بين المتاحين" : ""}.
              </p>
            )}
            <ul className="mt-3 space-y-2">
              {shown.map((c) => (
                <li key={c.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl border p-3", c.taken ? "border-dashed border-gold/40 bg-sand/60" : "border-gold/30 bg-white")}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sand font-display font-bold text-green-dark">{c.name.replace("الشيخ ", "")[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      {c.name}
                      {c.rating !== null && (
                        <span className="flex items-center gap-1 rounded-full bg-gold/25 px-2 py-0.5 text-xs font-bold text-maroon">
                          <Star className="size-3" /> {c.rating}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {c.office} — {c.area} — نتيجة التأهيل {c.score} — {c.seasons ? `${c.seasons} مواسم خبرة` : "أول موسم"}
                    </p>
                    <p className="text-xs text-hint">{c.skills.map(skillLabel).join("، ")}</p>
                  </div>
                  {c.taken ? (
                    <Badge tone="maroon">في المجموعة {c.taken}</Badge>
                  ) : (
                    <Button size="sm" onClick={() => send(c)}>
                      <Send className="size-4" /> دعوة فردية
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
