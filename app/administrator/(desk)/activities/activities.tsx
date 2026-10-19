"use client";

import { motion } from "motion/react";
import { BookMarked, Check, ClipboardPen, Plus, Search, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Modal, useToast } from "@/components/ui/widgets";
import { NAWAWI } from "@/lib/data/quran";
import { groupName } from "@/lib/groups";
import { AUDIENCES, AUDIENCE_LABEL, fits, lessonRoleOf, type LessonAudience } from "@/lib/lessons";
import {
  GRADE_LABEL,
  KIND_HINT,
  KIND_LABEL,
  activitiesActions,
  activitiesOfGroups,
  isIn,
  khatmaRead,
  progressOf,
  standing,
  unitLabel,
  unitsFor,
  useActivities,
  type Activity,
  type ActivityKind,
  type Grade,
} from "@/lib/religious";
import { useStore } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { AdminShell, LockedCard } from "../../_components/ui";
import { positionLabelOf, useAdmin } from "../../_lib/admin";
import { useFieldGroups } from "../../_lib/field-groups";
import { buildRoster, type RosterEntry } from "../../_lib/group";

type Person = RosterEntry & { group: number };

/**
 * «النشاطات الدينية»: what a guide follows pilgrim by pilgrim — memorising the Quran (page, surah, part), hadith
 * (which of the forty), the supplications of Hajj, and a shared reading of the Quran. Its guide adds pilgrims or
 * they join from their portal; at each sitting he records what each one recited, with a grade, and both sides
 * see where each one is. The group's head and the cluster's head follow them.
 */
export function AdminActivities() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const role = lessonRoleOf(p);
  const groups = useFieldGroups();
  const all = useActivities();
  const applications = useStore((s) => s.applications);
  const post = useStore((s) => s.post);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const clusterId = groups[0]?.clusterId;
  const activities = useMemo(() => activitiesOfGroups(all, groups.map((g) => g.number), clusterId), [all, groups, clusterId]);
  const rosters = useMemo(() => new Map(groups.map((g) => [g.number, buildRoster(p, applications, post, { groupNumber: g.number, size: g.size })])), [groups, p, applications, post]);
  const audienceOf = (a: Activity): Person[] => a.groups.filter((n) => rosters.has(n)).flatMap((n) => (rosters.get(n) ?? []).filter((e) => fits(a.audience, e.gender)).map((e) => ({ ...e, group: n })));

  if (!groups.length || (!role && !p?.cluster && p?.positions[0] !== "group-head")) {
    return (
      <AdminShell title="النشاطات الدينية" subtitle="تحفيظ القرآن والحديث والأدعية، والختمة الجماعية، ومتابعة كل حاج فيها.">
        <LockedCard title="النشاطات لموجّهي المجموعات وموجّهات التكتل" text="يتابع موجّه المجموعة وموجّهة التكتل حفظ الحجاج وقراءتهم حاجاً حاجاً. تظهر هنا حين تُجلس في مقعد الموجّه أو تُختارين موجّهةً لتكتل." href="/administrator/dashboard" cta="ملفي" />
      </AdminShell>
    );
  }

  const people = new Set(activities.flatMap((a) => audienceOf(a).filter((e) => isIn(a, e.id)).map((e) => e.id)));
  const opened = activities.find((a) => a.id === open);

  return (
    <AdminShell
      image="/images/quba-quran.jpg"
      title="النشاطات الدينية"
      subtitle={role ? "حلقاتك في تحفيظ القرآن والحديث والأدعية، والختمة الجماعية: من في كل منها، وأين وصل كل واحد." : "نشاطات موجّهي مجموعاتك وموجّهاتها، وأين وصل كل حاج. للمتابعة."}
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { k: "نشاطات", v: activities.length },
          { k: "حجاج مشاركون", v: people.size },
          { k: "تسميعات مسجّلة", v: activities.reduce((n, a) => n + a.sittings.length, 0) },
          { k: "متوسط الإنجاز", v: `${avg(activities.filter((a) => a.kind !== "khatma").map((a) => meanProgress(a, audienceOf(a))))}%` },
        ].map((x, i) => (
          <motion.div key={x.k} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-3xl border border-gold/30 bg-white p-4">
            <p className="font-display text-2xl font-bold text-green-dark">{typeof x.v === "number" ? formatNumber(x.v) : x.v}</p>
            <p className="text-xs text-hint">{x.k}</p>
          </motion.div>
        ))}
      </div>

      {role && (
        <div className="mb-5 flex justify-end">
          <Button onClick={() => setCreating(true)}><Plus className="size-4" /> نشاط جديد</Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {activities.map((a) => {
          const aud = audienceOf(a);
          const inIt = aud.filter((e) => isIn(a, e.id));
          const read = a.kind === "khatma" ? khatmaRead(a, aud.map((e) => e.id)).size : 0;
          return (
            <div key={a.id} data-activity={a.id} className="flex flex-col rounded-3xl border border-gold/30 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge tone="gold">{KIND_LABEL[a.kind]}</Badge>
                <Badge tone={a.audience === "women" ? "maroon" : a.audience === "men" ? "green" : "ink"}>{AUDIENCE_LABEL[a.audience]}</Badge>
              </div>
              <p className="mt-2 font-display text-xl font-bold text-green-dark">{a.title}</p>
              <p className="text-sm text-ink-soft">{a.goal}</p>
              <p className="mt-2 text-sm text-ink-soft">{a.schedule} — {a.place}</p>
              <p className="text-xs text-hint">{a.groups.map(groupName).join("، ")} — {a.byName}</p>
              <div className="mt-3">
                <div className="flex justify-between text-xs">
                  <span className="font-bold">{a.kind === "khatma" ? `قُرئ ${read} من 30 جزءاً` : `متوسط الإنجاز ${meanProgress(a, aud)}%`}</span>
                  <span className="text-hint">المشاركون {inIt.length} من {aud.length}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand">
                  <div className="h-full rounded-full bg-green" style={{ width: `${a.kind === "khatma" ? (read / 30) * 100 : meanProgress(a, aud)}%` }} />
                </div>
              </div>
              <div className="mt-auto pt-4">
                <Button size="sm" onClick={() => setOpen(a.id)}><BookMarked className="size-4" /> المتابعة</Button>
              </div>
            </div>
          );
        })}
        {activities.length === 0 && <p className="rounded-3xl border border-dashed border-gold/40 bg-white/70 p-8 text-center text-ink-soft lg:col-span-2">{role ? "لا نشاطات بعد. ابدأ حلقة تحفيظ أو ختمة من «نشاط جديد»." : "لا نشاطات لمجموعاتك بعد."}</p>}
      </div>

      {creating && role && <ActivityForm role={role} groups={groups.map((g) => g.number)} clusterId={clusterId} onClose={() => setCreating(false)} />}
      {opened && <Tracker a={opened} audience={audienceOf(opened)} own={opened.byId === admin.id} actor={{ name: admin.name, role: positionLabelOf(p?.positions[0] ?? "") }} onClose={() => setOpen(null)} />}
    </AdminShell>
  );
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((n, x) => n + x, 0) / xs.length) : 0);
/** The mean share of its units its participants mastered */
function meanProgress(a: Activity, audience: Person[]) {
  const inIt = audience.filter((e) => isIn(a, e.id));
  return avg(inIt.map((e) => (standing(a, e.id).count / a.units.length) * 100));
}

const KINDS: ActivityKind[] = ["quran", "hadith", "adhkar", "khatma"];
const TITLES: Record<ActivityKind, string> = { quran: "تحفيظ جزء عمّ", hadith: "الأربعون النووية", adhkar: "أدعية الحج والعمرة", khatma: "ختمة جماعية" };
const field = "h-11 w-full rounded-2xl border-2 border-gold/40 bg-white px-3 text-sm";

/** A new activity: its kind and what it covers, its audience as the guide's role allows, its time and place */
function ActivityForm({ role, groups, clusterId, onClose }: { role: "guide" | "guide-f"; groups: number[]; clusterId?: string; onClose: () => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const choices = AUDIENCES[role];
  const [kind, setKind] = useState<ActivityKind>("quran");
  const [title, setTitle] = useState(TITLES.quran);
  const [from, setFrom] = useState(30);
  const [to, setTo] = useState(30);
  const [shortFirst, setShortFirst] = useState(true);
  const [audience, setAudience] = useState<LessonAudience>(choices[0]);
  const [chosen, setChosen] = useState(groups);
  const [schedule, setSchedule] = useState("");
  const [place, setPlace] = useState("");
  const [date, setDate] = useState("");
  const pickKind = (k: ActivityKind) => {
    setKind(k);
    setTitle(TITLES[k]);
    if (k === "quran") { setFrom(30); setTo(30); }
    if (k === "hadith") { setFrom(1); setTo(20); }
  };
  const goal = kind === "quran" ? (from === to ? `الجزء ${from}${from === 30 ? " (جزء عمّ)" : ""}` : `من الجزء ${Math.min(from, to)} إلى الجزء ${Math.max(from, to)}`) + (shortFirst ? "، من آخره" : "") : kind === "hadith" ? `الأحاديث ${Math.min(from, to)} – ${Math.max(from, to)} من الأربعين النووية` : kind === "adhkar" ? "أدعية الحج والعمرة العشرة" : "ختمة كاملة: 30 جزءاً";
  const missing = !title.trim() ? "اكتب اسم النشاط" : !schedule.trim() ? "اكتب موعد الحلقات" : !place.trim() ? "اكتب المكان" : !date ? "اختر تاريخ البدء" : !chosen.length ? "اختر مجموعة" : null;

  const save = () => {
    if (missing) return;
    const a: Activity = {
      id: `ac-${Date.now().toString(36)}`,
      clusterId,
      groups: chosen,
      byId: admin.id,
      byName: admin.name,
      byRole: role,
      kind,
      title: title.trim(),
      goal,
      units: unitsFor(kind, Math.min(from, to), Math.max(from, to), shortFirst),
      audience,
      schedule: schedule.trim(),
      place: place.trim(),
      startAt: new Date(`${date}T12:00:00+03:00`).getTime(),
      createdAt: Date.now(),
      joined: [],
      left: [],
      progress: {},
      sittings: [],
    };
    activitiesActions.save(a, { name: admin.name, role: positionLabelOf(admin.profile?.positions[0] ?? "") });
    toast({ title: "بدأ النشاط", body: `${a.title} — يراه المدعوون في بوابتهم وينضمون إليه، أو تضيفهم أنت.`, tone: "success", icon: "📗" });
    onClose();
  };

  return (
    <Modal open onClose={onClose} className="max-w-2xl">
      <h2 className="font-display text-2xl font-bold text-green-dark">نشاط جديد</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="نوع النشاط">
        {KINDS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => pickKind(k)} className={cn("rounded-2xl border-2 p-3 text-right transition", kind === k ? "border-green bg-green/5" : "border-gold/30 hover:bg-sand/60")}>
            <span className="block font-bold text-green-dark">{KIND_LABEL[k]}</span>
            <span className="block text-xs text-ink-soft">{KIND_HINT[k]}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-bold text-ink-soft">اسم النشاط</span>
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        {(kind === "quran" || kind === "hadith") && (
          <>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-bold text-ink-soft">{kind === "quran" ? "من الجزء" : "من الحديث"}</span>
              <select className={field} value={from} onChange={(e) => setFrom(Number(e.target.value))}>
                {Array.from({ length: kind === "quran" ? 30 : 42 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{kind === "quran" ? `الجزء ${n}` : `${n}. ${NAWAWI[n - 1]}`}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-bold text-ink-soft">{kind === "quran" ? "إلى الجزء" : "إلى الحديث"}</span>
              <select className={field} value={to} onChange={(e) => setTo(Number(e.target.value))}>
                {Array.from({ length: kind === "quran" ? 30 : 42 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{kind === "quran" ? `الجزء ${n}` : `${n}. ${NAWAWI[n - 1]}`}</option>)}
              </select>
            </label>
            {kind === "quran" && (
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" className="accent-green" checked={shortFirst} onChange={(e) => setShortFirst(e.target.checked)} />
                من آخر الجزء: السور القصيرة أولاً، كما يُحفظ جزء عمّ
              </label>
            )}
          </>
        )}
        <p className="rounded-2xl bg-sand p-3 text-sm sm:col-span-2">ما يغطيه: <b>{goal}</b>{kind === "quran" ? ` — ${unitsFor(kind, Math.min(from, to), Math.max(from, to)).length} صفحة` : ""}</p>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-bold text-ink-soft">موعد الحلقات</span>
          <input className={field} value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="مثل: الأحد والأربعاء بعد العصر" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-bold text-ink-soft">تاريخ البدء</span>
          <input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-bold text-ink-soft">المكان</span>
          <input className={field} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="مثل: قاعة الفندق" />
        </label>
        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-bold text-ink-soft">لمن النشاط</span>
          <div className="flex gap-1 rounded-2xl bg-sand p-1" role="radiogroup" aria-label="لمن النشاط">
            {choices.map((x) => (
              <button key={x} type="button" role="radio" aria-checked={audience === x} onClick={() => setAudience(x)} className={cn("flex-1 rounded-xl px-3 py-2 text-sm font-bold", audience === x ? "bg-green-dark text-white" : "text-ink-soft")}>
                {AUDIENCE_LABEL[x]}
              </button>
            ))}
          </div>
        </div>
        {groups.length > 1 && (
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {groups.map((n) => {
              const on = chosen.includes(n);
              return (
                <button key={n} type="button" aria-pressed={on} onClick={() => setChosen(on ? chosen.filter((x) => x !== n) : [...chosen, n])} className={cn("flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-bold", on ? "border-green bg-green/5 text-green" : "border-gold/40 text-ink-soft")}>
                  {on && <Check className="size-3.5" />} {groupName(n)}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-maroon">{missing ?? ""}</span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>رجوع</Button>
          <Button onClick={save} disabled={!!missing}><Check className="size-4" /> بدء النشاط</Button>
        </div>
      </div>
    </Modal>
  );
}

const GRADES: Grade[] = ["excellent", "vgood", "good", "review"];
const fmtDay = (ts: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "long" }).format(ts);

/** One activity followed pilgrim by pilgrim: who is in it and where each one is, and each sitting's record */
function Tracker({ a, audience, own, actor, onClose }: { a: Activity; audience: Person[]; own: boolean; actor: { name: string; role: string }; onClose: () => void }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [rec, setRec] = useState<Person | null>(null);
  const inIt = audience.filter((e) => isIn(a, e.id));
  const out = audience.filter((e) => !isIn(a, e.id));
  const rows = (adding ? out : inIt).filter((e) => !q.trim() || e.name.includes(q.trim()));
  const several = new Set(audience.map((e) => e.group)).size > 1;
  const readers = (unit: string) => inIt.filter((e) => progressOf(a, e.id)[unit]);

  return (
    <Modal open onClose={onClose} className="max-w-4xl">
      <div className="pe-10">
        <p className="text-xs font-bold text-gold-dark">{KIND_LABEL[a.kind]} — {AUDIENCE_LABEL[a.audience]} — {a.schedule}</p>
        <h2 className="font-display text-2xl font-bold text-green-dark">{a.title}</h2>
        <p className="text-sm text-ink-soft">{a.goal}</p>
      </div>

      {a.kind === "khatma" && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold text-ink">الأجزاء الثلاثون: {khatmaRead(a, audience.map((e) => e.id)).size} مقروءة</p>
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {a.units.map((u) => {
              const r = readers(u);
              return (
                <div key={u} title={r.map((e) => e.name).join("، ") || "لم يُقرأ"} className={cn("rounded-xl p-1.5 text-center text-xs", r.length ? "bg-green text-white" : "bg-sand text-ink-soft")}>
                  <span className="block font-bold">{u.slice(1)}</span>
                  <span className="block truncate text-[10px] opacity-80">{r[0]?.name.split(" ")[0] ?? "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute right-3 top-3.5 size-4 text-hint" />
          <input aria-label="بحث بالاسم" className="h-11 w-full rounded-2xl border-2 border-gold/40 pr-9 pl-3 text-sm" placeholder="بحث بالاسم" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {own && (
          <Button variant={adding ? "primary" : "outline"} onClick={() => { setAdding(!adding); setPicked([]); }}>
            <UserPlus className="size-4" /> {adding ? "عرض المشاركين" : `إضافة مشاركين (${out.length})`}
          </Button>
        )}
      </div>

      {adding ? (
        <>
          <ul className="mt-3 max-h-[45vh] divide-y divide-gold/15 overflow-y-auto rounded-2xl border border-gold/25">
            {rows.map((e) => {
              const on = picked.includes(e.id);
              return (
                <li key={e.id}>
                  <button type="button" aria-pressed={on} onClick={() => setPicked(on ? picked.filter((x) => x !== e.id) : [...picked, e.id])} className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-right text-sm", on ? "bg-green/5" : "hover:bg-sand/60")}>
                    <span className={cn("grid size-6 place-items-center rounded-md border-2", on ? "border-green bg-green text-white" : "border-gold/50")}>{on && <Check className="size-4" />}</span>
                    <span className="font-bold">{e.name}</span>
                    <span className="text-xs text-hint">{e.age} عاماً{several ? ` — ${groupName(e.group)}` : ""}</span>
                  </button>
                </li>
              );
            })}
            {rows.length === 0 && <li className="p-6 text-center text-sm text-hint">كل المدعوين في النشاط.</li>}
          </ul>
          <div className="mt-3 flex justify-end">
            <Button disabled={!picked.length} onClick={() => { activitiesActions.setIn(a.id, picked, true, actor); toast({ title: `أُضيف ${picked.length} إلى النشاط`, body: a.title, tone: "success", icon: "📗" }); setPicked([]); setAdding(false); }}>
              <Check className="size-4" /> إضافة {picked.length || ""}
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-3 max-h-[50vh] overflow-auto rounded-2xl border border-gold/25">
          {/* On a phone the last sitting goes under the name and the next unit is left out, so the button stays in view */}
          <table className="w-full text-sm sm:min-w-[640px]">
            <thead className="sticky top-0 bg-sand text-right text-xs text-hint">
              <tr><th className="p-2">الحاج</th><th className="p-2">الإنجاز</th><th className="hidden p-2 sm:table-cell">آخر تسميع</th><th className="hidden p-2 sm:table-cell">{a.kind === "khatma" ? "أجزاؤه" : "التالي"}</th><th className="p-2" /></tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const st = standing(a, e.id);
                const pct = st.total ? Math.round((st.count / st.total) * 100) : 0;
                return (
                  <tr key={e.id} className="border-t border-gold/15 align-top">
                    <td className="p-2">
                      <span className="font-bold">{e.name}</span>
                      <span className="block text-xs text-hint">{e.age} عاماً{several ? ` — ${groupName(e.group)}` : ""}</span>
                      <span className="mt-1 block text-xs text-ink-soft sm:hidden">{st.last ? `${unitLabel(a.kind, st.last.unit)} — ${GRADE_LABEL[st.last.grade]}` : "لم يسمّع بعد"}</span>
                    </td>
                    <td className="p-2">
                      {st.total ? (
                        <>
                          <span className="text-xs font-bold tabular-nums">{st.count}/{st.total}</span>
                          <div className="mt-1 h-1.5 w-16 overflow-hidden sm:w-28 rounded-full bg-sand"><div className="h-full bg-green" style={{ width: `${pct}%` }} /></div>
                        </>
                      ) : (
                        <span className="text-xs font-bold">{st.count} {st.count === 1 ? "جزء" : "أجزاء"}</span>
                      )}
                    </td>
                    <td className="hidden p-2 text-xs sm:table-cell">{st.last ? <>{unitLabel(a.kind, st.last.unit)}<span className="block text-hint">{GRADE_LABEL[st.last.grade]} — {fmtDay(st.last.at)}</span></> : <span className="text-hint">لم يسمّع بعد</span>}</td>
                    <td className="hidden p-2 text-xs sm:table-cell">{a.kind === "khatma" ? Object.keys(progressOf(a, e.id)).map((u) => u.slice(1)).join("، ") || "—" : st.next ? unitLabel(a.kind, st.next) : <span className="font-bold text-green">أتمّ الحفظ</span>}</td>
                    <td className="p-2">{own && <Button size="sm" variant="outline" onClick={() => setRec(e)}><ClipboardPen className="size-4" /> {a.kind === "khatma" ? "قرأ" : "تسميع"}</Button>}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-hint">لا مشاركين بعد. {own ? "أضفهم من «إضافة مشاركين»، أو ينضمون من بوابتهم." : ""}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Keyed by the pilgrim: pressing «تسميع» on another row starts his own sitting, not the last one's pages */}
      {rec && <Record key={rec.id} a={a} person={rec} actor={actor} onClose={() => setRec(null)} />}
    </Modal>
  );
}

/** One sitting for one pilgrim: what he recited (pages from–to, hadith, supplications, or the parts he read) and its grade */
function Record({ a, person, actor, onClose }: { a: Activity; person: Person; actor: { name: string; role: string }; onClose: () => void }) {
  const toast = useToast();
  const done = progressOf(a, person.id);
  const next = a.units.find((u) => !done[u]) ?? a.units[0];
  const ranged = a.kind === "quran";
  const [from, setFrom] = useState(next);
  const [to, setTo] = useState(next);
  const [units, setUnits] = useState<string[]>([]);
  const [grade, setGrade] = useState<Grade>("vgood");
  const [note, setNote] = useState("");
  const chosen = ranged ? a.units.slice(Math.min(a.units.indexOf(from), a.units.indexOf(to)), Math.max(a.units.indexOf(from), a.units.indexOf(to)) + 1) : units;
  // It opens under the table: brought into view, else it would wait below the dialog's fold
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), []);

  return (
    <div ref={ref} className="mt-4 scroll-mb-2 rounded-3xl border-2 border-green/40 bg-green/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-green-dark">{a.kind === "khatma" ? "ما قرأه" : "تسميع"}: {person.name}</p>
        <button type="button" aria-label="إغلاق التسميع" onClick={onClose} className="grid size-8 place-items-center rounded-full bg-white"><X className="size-4" /></button>
      </div>
      {ranged ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {([["من", from, setFrom], ["إلى", to, setTo]] as const).map(([label, v, set]) => (
            <label key={label} className="block text-sm">
              <span className="mb-1 block text-xs font-bold text-ink-soft">{label}</span>
              <select className={field} value={v} onChange={(e) => set(e.target.value)}>
                {a.units.map((u) => <option key={u} value={u}>{unitLabel(a.kind, u)}{done[u] ? " ✓" : ""}</option>)}
              </select>
            </label>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
          {a.units.map((u) => {
            const on = units.includes(u);
            return (
              <button key={u} type="button" aria-pressed={on} onClick={() => setUnits(on ? units.filter((x) => x !== u) : [...units, u])} className={cn("rounded-xl border px-2.5 py-1 text-xs font-bold", on ? "border-green bg-green text-white" : done[u] ? "border-green/40 bg-white text-green" : "border-gold/40 bg-white text-ink-soft")}>
                {a.kind === "khatma" ? `الجزء ${u.slice(1)}` : a.kind === "hadith" ? `${u.slice(1)}` : unitLabel(a.kind, u)}{done[u] ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      )}
      {a.kind !== "khatma" && (
        <div className="mt-3 flex flex-wrap gap-1 rounded-2xl bg-white p-1" role="radiogroup" aria-label="التقدير">
          {GRADES.map((g) => (
            <button key={g} type="button" role="radio" aria-checked={grade === g} onClick={() => setGrade(g)} className={cn("flex-1 rounded-xl px-3 py-1.5 text-sm font-bold", grade === g ? (g === "review" ? "bg-maroon text-white" : "bg-green-dark text-white") : "text-ink-soft")}>
              {GRADE_LABEL[g]}
            </button>
          ))}
        </div>
      )}
      <input aria-label="ملاحظة" className={cn(field, "mt-3")} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختيارية): مثل مراجعة أحكام المدّ" />
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-ink-soft">{chosen.length} {a.kind === "quran" ? "صفحة" : a.kind === "hadith" ? "حديث" : a.kind === "khatma" ? "جزء" : "دعاء"}</span>
        <Button
          disabled={!chosen.length}
          onClick={() => {
            activitiesActions.record(a.id, person.id, chosen, a.kind === "khatma" ? "excellent" : grade, note.trim() || undefined, actor, person.name);
            toast({ title: "سُجّل التسميع", body: `${person.name}: ${chosen.length === 1 ? unitLabel(a.kind, chosen[0]) : `${chosen.length} وحدات`}${a.kind === "khatma" ? "" : ` — ${GRADE_LABEL[grade]}`}`, tone: "success", icon: "📗" });
            onClose();
          }}
        >
          <Check className="size-4" /> حفظ
        </Button>
      </div>
    </div>
  );
}
