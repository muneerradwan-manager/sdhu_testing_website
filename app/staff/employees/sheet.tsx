"use client";

import { PauseCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { itineraryOf, useFlightsData } from "@/lib/flights";
import { CURRENT_SEASON, fullName, inSeason, newId, opsActions, postingLabel, postingsOf, useEmployees, useOpFiles, usePlaces, type Employee } from "@/lib/ops";
import { can, logAs, useStaffUser } from "../_components/kit";
import { seasonLock } from "./desk";
import type { Draft } from "./employee-form";

/** A phone without its holder's permission to see it: its last three digits */
export const maskPhone = (p: string) => `•••• ${p.replace(/\D/g, "").slice(-3)}`;

/** His national id, phones and email: seen and changed by `staff.employees-pii` alone */
export const PII_FIELDS = ["nationalId", "phoneSy", "phoneSa", "email"] as const;

/** The fields an edit's record names when they change, by their label in the form */
const FIELDS: [keyof Employee, string][] = [
  ["firstName", "الاسم"],
  ["fatherName", "الاسم"],
  ["surname", "الاسم"],
  ["gender", "الجنس"],
  ["birthYear", "سنة الميلاد"],
  ["nationalId", "الرقم الوطني"],
  ["city", "المحافظة"],
  ["jobTitle", "المسمى الوظيفي"],
  ["mission", "البعثة"],
  ["kind", "نوع الموظف"],
  ["organization", "الجهة المنتدِبة"],
  ["phoneSy", "هاتف سوريا"],
  ["phoneSa", "هاتف السعودية"],
  ["email", "البريد الإلكتروني"],
  ["languages", "اللغات"],
  ["notes", "الملاحظات"],
];

/**
 * The changes to a record that other files depend on, with their guards, wherever they are made — the
 * register's rows, the season's rows, his edit screen: no one leaves the season while he holds a post in it, and suspending
 * or reinstating someone who holds one, like taking anyone out of the season, reaches the director. Each change
 * checks its own permission here too, whatever screen asked for it.
 */
export function useEmployeeActions() {
  const user = useStaffUser()!;
  const toast = useToast();
  const employees = useEmployees();
  const refuse = (what: string) => toast({ title: "ليست لك صلاحيته", body: what, tone: "warning", icon: "🔒" });
  const files = useOpFiles();
  const places = usePlaces();
  const flights = useFlightsData();
  const postsOf = (id: string) => postingsOf(id, files.filter((f) => f.season === CURRENT_SEASON), places);
  // The seats he keeps once out of the season, for whoever runs the flights to cancel
  const seatsOf = (id: string) => {
    const it = itineraryOf(id, flights);
    return [it.outbound, it.return].flatMap((a) => flights.flights.filter((f) => f.id === a?.flightId).map((f) => f.flightNo));
  };

  const logSeason = (e: Employee, on: boolean) => {
    const seats = on ? [] : seatsOf(e.id);
    logAs(user, {
      action: on ? `تسجيل موظف في موسم ${CURRENT_SEASON}` : `إلغاء مشاركة موظف في موسم ${CURRENT_SEASON}`,
      target: fullName(e),
      detail: seats.length ? `ما زال على ${seats.join(" و")}، ويلغي مقعده مسؤول الطيران` : undefined,
      system: "staff",
      area: "season",
      ref: e.id,
      important: !on || undefined,
    });
    return seats;
  };

  return {
    postsOf,
    setSeason(e: Employee, on: boolean) {
      if (on === inSeason(e)) return;
      if (!can(user, on ? "staff.season-participation.POST" : "staff.season-participation.DELETE")) return refuse(on ? "تسجيل موظف في الموسم" : "إلغاء مشاركة موظف في الموسم");
      const lock = on ? null : seasonLock(postsOf(e.id));
      if (lock) {
        toast({ title: "لا تُلغى مشاركته الآن", body: lock, tone: "warning", icon: "⚠️" });
        return;
      }
      opsActions.saveEmployee({ ...e, seasons: on ? [...e.seasons, CURRENT_SEASON].sort() : e.seasons.filter((y) => y !== CURRENT_SEASON) });
      const seats = logSeason(e, on);
      toast({
        title: on ? `سُجّل في موسم ${CURRENT_SEASON}` : `أُلغيت مشاركته في موسم ${CURRENT_SEASON}`,
        body: on ? `${fullName(e)}: يظهر الآن في قوائم الإسناد والطيران.` : seats.length ? `ما زال على ${seats.join(" و")}. يصل الخبر إلى مدير الموسم.` : "يصل الخبر إلى مدير الموسم.",
        tone: on ? "success" : "info",
        icon: on ? "✅" : "↩️",
      });
    },
    setSuspended(e: Employee, on: boolean) {
      if (!can(user, "staff.employees.suspend")) return refuse("إيقاف موظف وإعادته");
      const posts = postsOf(e.id);
      opsActions.saveEmployee({ ...e, suspended: on || undefined });
      logAs(user, {
        action: on ? "إيقاف موظف" : "إعادة موظف إلى العمل",
        target: fullName(e),
        detail: posts.length ? `مُسند في ${posts.map((p) => postingLabel(p, true)).join("، ")}` : undefined,
        system: "staff",
        area: "register",
        ref: e.id,
        important: posts.length > 0 || undefined,
      });
      toast({ title: on ? "أُوقف الموظف" : "عاد إلى العمل", body: on && posts.length ? "ما زال مُسنداً في الملفات التشغيلية حتى يُستبدل، ويصل الخبر إلى مدير الموسم." : undefined, tone: on ? "warning" : "success", icon: on ? "⏸️" : "✅" });
    },
    save(d: Draft): Employee | null {
      const before = d.id ? employees.find((e) => e.id === d.id) : undefined;
      if (!can(user, before ? "staff.employees.PUT" : "staff.employees.POST")) {
        refuse(before ? "تعديل سجل موظف" : "إضافة موظف");
        return null;
      }
      // Without the personal data's permission his national id, phones and email stay as they were
      if (before && !can(user, "staff.employees-pii.PUT")) for (const k of PII_FIELDS) (d as Record<string, unknown>)[k] = before[k];
      // The form keeps him in the season while he holds a post; the record keeps it whatever the form sent
      const kept = before && inSeason(before) && !d.seasons.includes(CURRENT_SEASON) && seasonLock(postsOf(before.id));
      const e: Employee = { ...d, id: d.id ?? newId("E"), seasons: kept ? before.seasons : d.seasons };
      opsActions.saveEmployee(e);
      if (!before) logAs(user, { action: "إضافة موظف", target: fullName(e), detail: `${e.jobTitle} — ${e.mission}`, system: "staff", area: "register", ref: e.id });
      else {
        const changed = [...new Set(FIELDS.filter(([k]) => JSON.stringify(before[k]) !== JSON.stringify(e[k])).map(([, label]) => label))];
        const renamed = fullName(before) !== fullName(e);
        if (changed.length) logAs(user, { action: "تعديل بيانات موظف", target: fullName(e), before: renamed ? fullName(before) : undefined, after: renamed ? fullName(e) : undefined, detail: changed.join("، "), system: "staff", area: "register", ref: e.id });
      }
      if (inSeason(e) !== (before ? inSeason(before) : false)) logSeason(e, inSeason(e));
      toast({ title: before ? "حُفظت التعديلات" : "أُضيف الموظف", body: fullName(e), tone: "success", icon: "✅" });
      return e;
    },
  };
}

/**
 * Suspending someone who holds a post leaves his post held by someone who does not work: it is asked
 * first. `useSuspend` gives the action for a row or a screen, and the question it may need.
 */
export function useSuspend() {
  const act = useEmployeeActions();
  const [asking, setAsking] = useState<Employee | null>(null);
  const posts = asking ? act.postsOf(asking.id) : [];
  const toggle = (e: Employee) => (e.suspended ? act.setSuspended(e, false) : act.postsOf(e.id).length ? setAsking(e) : act.setSuspended(e, true));
  const node = (
    <Modal open={!!asking} onClose={() => setAsking(null)} className="max-w-md border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
      {asking && (
        <div>
          <p className="font-display text-xl font-bold">إيقاف {fullName(asking)}؟</p>
          <p className="mt-2 text-sm leading-7 text-white/75">مُسند في {posts.map((p) => postingLabel(p, true)).join("، ")}: يبقى موقعه مشغولاً بمن لا يعمل حتى يُستبدل في «الملفات التشغيلية»، ويصل الخبر إلى مدير الموسم.</p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="maroon"
              onClick={() => {
                act.setSuspended(asking, true);
                setAsking(null);
              }}
            >
              <PauseCircle className="size-4" /> إيقاف
            </Button>
            <Button variant="glass" onClick={() => setAsking(null)}>
              تراجع
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
  return { toggle, node };
}
