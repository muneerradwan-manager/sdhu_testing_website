"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { AlertTriangle, Eye, KeyRound, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { itineraryOf, TRAVEL_LABEL, useFlightsData } from "@/lib/flights";
import { CURRENT_SEASON, fullName, inSeason, newId, opsActions, postingLabel, postingsOf, useEmployees, useOpFiles, usePlaces, type Employee } from "@/lib/ops";
import { SEASON } from "@/lib/season";
import { MANAGEMENT_PERMISSIONS, PERMISSION_LABELS } from "@/lib/staff";
import { useStaffAccounts } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { Drawer, logAs, useStaffUser } from "../_components/kit";
import { Avatar, Chip, InfoGrid, SectionTitle } from "../_components/ops-ui";
import { RecordHistory } from "../_components/system";
import { MyFiles } from "../my-files/my-files";
import { missingOf, seasonLock } from "./desk";
import { EmployeeForm, emptyDraft, type Draft } from "./employee-form";

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
 * The changes to a record that other files depend on, with their guards, wherever they are made — his
 * sheet, the season tab, the form: no one leaves the season while he holds a post in it, and suspending
 * or reinstating someone who holds one, like taking anyone out of the season, reaches the director.
 */
export function useEmployeeActions() {
  const user = useStaffUser()!;
  const toast = useToast();
  const employees = useEmployees();
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
      detail: seats.length ? `ما زال على ${seats.join(" و")}، ويلغي مقعده صاحب «إدارة الطيران»` : undefined,
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
      const lock = on ? null : seasonLock(postsOf(e.id));
      if (lock) {
        toast({ title: "لا تُلغى مشاركته الآن", body: lock, tone: "warning", icon: "⚠️" });
        return;
      }
      opsActions.saveEmployee({ ...e, seasons: on ? [...e.seasons, CURRENT_SEASON].sort() : e.seasons.filter((y) => y !== CURRENT_SEASON) });
      const seats = logSeason(e, on);
      toast({
        title: on ? `سُجّل في موسم ${CURRENT_SEASON}` : `أُلغيت مشاركته في موسم ${CURRENT_SEASON}`,
        body: on ? `${fullName(e)}: يظهر الآن في قوائم الإسناد والطيران.` : seats.length ? `ما زال على ${seats.join(" و")}. يصل الخبر إلى مديرة الموسم.` : "يصل الخبر إلى مديرة الموسم.",
        tone: on ? "success" : "info",
        icon: on ? "✅" : "↩️",
      });
    },
    setSuspended(e: Employee, on: boolean) {
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
      toast({ title: on ? "أُوقف الموظف" : "عاد إلى العمل", body: on && posts.length ? "ما زال مُسنداً في الملفات التشغيلية حتى يُستبدل، ويصل الخبر إلى مديرة الموسم." : undefined, tone: on ? "warning" : "success", icon: on ? "⏸️" : "✅" });
    },
    save(d: Draft): Employee {
      const before = d.id ? employees.find((e) => e.id === d.id) : undefined;
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
 * An employee's sheet and his form, for any tab of the management page: the register, the season tab, or
 * a link from the summary (`?e=`) opens the same sheet, and editing from it opens the same form.
 */
export function useEmployeePanels(initial: string | null = null) {
  const employees = useEmployees();
  const act = useEmployeeActions();
  const [openId, setOpenId] = useState<string | null>(initial);
  const [editing, setEditing] = useState<Draft | null>(null);
  const open = employees.find((e) => e.id === openId) ?? null;

  const save = (d: Draft) => {
    const e = act.save(d);
    setEditing(null);
    setOpenId(e.id);
  };

  const node = (
    <>
      <Drawer open={!!open && !editing} onClose={() => setOpenId(null)} title="ملف الموظف" width="max-w-xl">
        {open && <EmployeeSheet e={open} onEdit={() => setEditing({ ...open })} />}
      </Drawer>
      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? `تعديل: ${fullName(editing)}` : "إضافة موظف"} width="max-w-2xl">
        {editing && <EmployeeForm key={editing.id ?? "new"} initial={editing} all={employees} lock={editing.id ? seasonLock(act.postsOf(editing.id)) : null} onSave={save} onCancel={() => setEditing(null)} />}
      </Drawer>
    </>
  );

  return { open: setOpenId, create: () => setEditing(emptyDraft()), node };
}

/** One employee whole: his record, his posts and flights this season, his portal account, and his history */
function EmployeeSheet({ e, onEdit }: { e: Employee; onEdit: () => void }) {
  const act = useEmployeeActions();
  const files = useOpFiles();
  const places = usePlaces();
  const flights = useFlightsData();
  const account = useStaffAccounts().find((a) => a.id === e.staffId);
  const [preview, setPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const all = postingsOf(e.id, files, places).sort((a, b) => b.file.season - a.file.season);
  const current = all.filter((p) => p.file.season === CURRENT_SEASON);
  const missing = missingOf(e);
  const trip = itineraryOf(e.id, flights);
  const flightNo = (id?: string) => flights.flights.find((f) => f.id === id)?.flightNo;

  const suspend = () => {
    act.setSuspended(e, true);
    setConfirming(false);
  };

  return (
    <div>
      <div className="flex items-start gap-4">
        <Avatar e={e} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl font-bold text-white">{fullName(e)}</p>
          <p className="text-sm text-white/70">
            {e.jobTitle} · {e.mission}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone={e.kind === "permanent" ? "muted" : "gold"}>{e.kind === "permanent" ? "موظف دائم" : `منتدب — ${e.organization ?? "جهة لم تُذكر"}`}</Chip>
            {inSeason(e) ? <Chip tone="green">مشارك في {CURRENT_SEASON}</Chip> : <Chip>غير مشارك في {CURRENT_SEASON}</Chip>}
            {e.suspended && <Chip tone="maroon">موقوف</Chip>}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="gold" onClick={onEdit}>
          <Pencil className="size-4" /> تعديل البيانات
        </Button>
        <Button size="sm" variant="glass" onClick={() => act.setSeason(e, !inSeason(e))}>
          {inSeason(e) ? `إلغاء المشاركة في ${CURRENT_SEASON}` : `تسجيله في موسم ${CURRENT_SEASON}`}
        </Button>
        <Button size="sm" variant="glass" className={e.suspended ? "" : "hover:bg-maroon/50"} onClick={() => (e.suspended ? act.setSuspended(e, false) : current.length ? setConfirming(true) : suspend())}>
          {e.suspended ? "إعادته إلى العمل" : "إيقاف"}
        </Button>
      </div>
      {confirming && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 rounded-2xl bg-maroon/25 p-3 text-sm leading-6 text-white ring-1 ring-maroon/50">
          <p>إيقافه وهو مُسند في {current.map((p) => postingLabel(p, true)).join("، ")}: يبقى موقعه مشغولاً بمن لا يعمل حتى يستبدله صاحب «الملفات التشغيلية»، ويصل الخبر إلى مديرة الموسم.</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="maroon" onClick={suspend}>
              إيقاف
            </Button>
            <Button size="sm" variant="ghost" className="text-white" onClick={() => setConfirming(false)}>
              تراجع
            </Button>
          </div>
        </motion.div>
      )}

      {missing.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-maroon/20 p-3 text-sm text-white ring-1 ring-maroon/50">
          <AlertTriangle className="size-4 shrink-0 text-gold" />
          <p className="min-w-0 flex-1 leading-6">ينقص سجله: {missing.join("، ")}. أكمله قبل أن يُسند إلى موقع أو يُوضع على رحلة.</p>
          <Button size="sm" variant="gold" onClick={onEdit}>
            أكمله
          </Button>
        </div>
      )}
      {e.notes && <p className="mt-4 rounded-2xl bg-gold/10 p-3 text-sm leading-6 text-gold ring-1 ring-gold/25">{e.notes}</p>}

      <SectionTitle
        action={
          all.length > 0 && (
            <button onClick={() => setPreview(true)} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-gold hover:bg-white/10">
              <Eye className="size-3.5" /> صفحته كما يراها
            </button>
          )
        }
      >
        المواقع في الملفات التشغيلية
      </SectionTitle>
      <Drawer open={preview} onClose={() => setPreview(false)} title={`ملفات ${fullName(e)} التشغيلية — كما تظهر له`} width="max-w-5xl">
        <MyFiles employee={e} />
      </Drawer>
      {all.length === 0 ? (
        <p className="text-sm text-white/60">لم يُسند إلى أي ملف تشغيلي بعد.</p>
      ) : (
        <ul className="space-y-2">
          {all.map((p, i) => (
            <li key={i} className={cn("rounded-2xl p-3 ring-1", p.file.season === CURRENT_SEASON ? "bg-gold/10 ring-gold/30" : "bg-white/5 ring-white/10")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-white">{p.role.name}</p>
                <Chip tone={p.file.season === CURRENT_SEASON ? "gold" : "muted"}>موسم {p.file.season}</Chip>
              </div>
              <p className="mt-0.5 text-xs text-white/70">
                {p.type.short}
                {p.outer && ` · ${p.outer.name}`}
                {p.inner && ` · ${p.inner.name}`}
              </p>
              {p.housing && <p className="text-xs text-white/55">يسكن في: {p.housing.name}</p>}
            </li>
          ))}
        </ul>
      )}

      {inSeason(e) && (
        <>
          <SectionTitle action={<Chip tone={trip.outbound ? "green" : "muted"}>{TRAVEL_LABEL[trip.status]}</Chip>}>رحلتاه في موسم {CURRENT_SEASON}</SectionTitle>
          <InfoGrid
            rows={[
              ["الذهاب", flightNo(trip.outbound?.flightId) && <span key="o" dir="ltr" className="font-mono">{flightNo(trip.outbound?.flightId)}</span>],
              ["العودة", flightNo(trip.return?.flightId) && <span key="r" dir="ltr" className="font-mono">{flightNo(trip.return?.flightId)}</span>],
            ]}
          />
          <p className="mt-2 text-xs text-white/55">يضعه على رحلتيه صاحب «إدارة الطيران».</p>
        </>
      )}

      <SectionTitle>البيانات الشخصية</SectionTitle>
      <InfoGrid
        rows={[
          ["الاسم الأول", e.firstName],
          ["اسم الأب", e.fatherName],
          ["الكنية", e.surname],
          ["الجنس", e.gender === "male" ? "ذكر" : "أنثى"],
          ["سنة الميلاد", `${e.birthYear} (${SEASON.gregorianYear - e.birthYear} سنة في موسم الحج)`],
          ["الرقم الوطني", <span key="n" dir="ltr" className="tabular-nums">{e.nationalId}</span>],
          ["المحافظة", e.city],
          ["اللغات", e.languages.join("، ")],
        ]}
      />

      <SectionTitle>التواصل</SectionTitle>
      <InfoGrid
        rows={[
          ["هاتف سوريا", e.phoneSy && <span key="s" dir="ltr" className="tabular-nums">{e.phoneSy}</span>],
          ["هاتف السعودية", e.phoneSa && <span key="a" dir="ltr" className="tabular-nums">{e.phoneSa}</span>],
          ["البريد الإلكتروني", e.email && <span key="m" dir="ltr">{e.email}</span>],
        ]}
      />

      <SectionTitle>المواسم التي شارك فيها</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {[1443, 1444, 1445, 1446, 1447, CURRENT_SEASON].map((y) => (
          <span key={y} className={cn("rounded-xl px-3 py-1.5 text-sm font-bold tabular-nums ring-1", e.seasons.includes(y) ? "bg-green-light/20 text-white ring-green-light/40" : "text-white/30 ring-white/10")}>
            {y}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-white/55">مواسم سابقة مع البعثة: {e.seasons.filter((y) => y < CURRENT_SEASON).length}</p>

      {account && (
        <>
          <SectionTitle
            action={
              <Link href={`/staff/employees/manage/accounts?a=${account.id}`} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-gold hover:bg-white/10">
                <KeyRound className="size-3.5" /> الحساب
              </Link>
            }
          >
            حساب بوابة الموظفين
          </SectionTitle>
          <p className="text-sm text-white/80">
            اسم الدخول <span className="font-bold text-gold" dir="ltr">{account.username}</span> — {account.title}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {account.permissions.map((p) => (
              <Chip key={p} tone={MANAGEMENT_PERMISSIONS.includes(p) ? "gold" : "muted"}>
                {PERMISSION_LABELS[p]}
              </Chip>
            ))}
          </div>
          <div className="mt-3">
            <RecordHistory system="staff" refId={account.id} bare />
          </div>
        </>
      )}

      <div className="mt-6">
        <RecordHistory system="staff" refId={e.id} />
      </div>
    </div>
  );
}
