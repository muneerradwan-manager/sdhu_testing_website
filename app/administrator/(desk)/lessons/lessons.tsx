"use client";

import { motion } from "motion/react";
import { Ban, CalendarClock, Check, CheckCheck, ClipboardCheck, Clock, Eye, HandHelping, MapPin, Pencil, Plus, Search, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Modal, useToast } from "@/components/ui/widgets";
import { groupName } from "@/lib/groups";
import {
  AUDIENCES,
  AUDIENCE_LABEL,
  ROLE_LABEL,
  STAGE_LABEL,
  STATE_LABEL,
  TOPICS,
  attended,
  fits,
  lessonRoleOf,
  lessonsActions,
  lessonsOfGroups,
  stateOf,
  useLessons,
  type GroupLesson,
  type LessonAudience,
  type LessonStage,
  type LessonState,
} from "@/lib/lessons";
import { useStore } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { AdminShell, LockedCard } from "../../_components/ui";
import { positionLabelOf, useAdmin } from "../../_lib/admin";
import { useFieldGroups } from "../../_lib/field-groups";
import { buildRoster, type RosterEntry } from "../../_lib/group";

/**
 * «الدروس الدينية»: a group's guide gives lessons to its men or to all of it, a cluster's female guide to the
 * women of her groups; each with its topic and stage, its time and place, and a word for the pilgrims, who see
 * it in their portal and say they will come. At the lesson its guide ticks off who is there, as at a muster,
 * and closes it. The group's head and the cluster's head follow their groups' lessons.
 */
export function AdminLessons() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const role = lessonRoleOf(p);
  const groups = useFieldGroups();
  const all = useLessons();
  const applications = useStore((s) => s.applications);
  const post = useStore((s) => s.post);
  const [tab, setTab] = useState<"upcoming" | "done" | "cancelled">("upcoming");
  const [editing, setEditing] = useState<GroupLesson | "new" | null>(null);
  const [roll, setRoll] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<GroupLesson | null>(null);
  // the page's moment: what is to come and what is past
  const [now] = useState(() => Date.now());
  const clusterId = groups[0]?.clusterId;
  const lessons = useMemo(() => lessonsOfGroups(all, groups.map((g) => g.number), clusterId), [all, groups, clusterId]);
  // each group's pilgrims, as the field lists them
  const rosters = useMemo(() => new Map(groups.map((g) => [g.number, buildRoster(p, applications, post, { groupNumber: g.number, size: g.size })])), [groups, p, applications, post]);
  const audienceOf = (l: GroupLesson): (RosterEntry & { group: number })[] =>
    l.groups.filter((n) => rosters.has(n)).flatMap((n) => (rosters.get(n) ?? []).filter((e) => fits(l.audience, e.gender)).map((e) => ({ ...e, group: n })));

  if (!groups.length || (!role && !p?.cluster && p?.positions[0] !== "group-head")) {
    return (
      <AdminShell title="الدروس الدينية" subtitle="دروس الموجّهين والموجّهات لحجاج مجموعاتهم، وحضورها.">
        <LockedCard title="الدروس لموجّهي المجموعات وموجّهات التكتل" text="يعطي موجّه المجموعة دروسه لرجالها أو لها كلها، وموجّهة التكتل لحاجّات مجموعاتها. تظهر هنا حين تُجلس في مقعد الموجّه أو تُختارين موجّهةً لتكتل." href="/administrator/dashboard" cta="ملفي" />
      </AdminShell>
    );
  }

  const states = lessons.map((l) => ({ l, s: stateOf(l, now) }));
  const shown = states.filter(({ s }) => (tab === "upcoming" ? s === "upcoming" || s === "open" || s === "unrecorded" : tab === "done" ? s === "done" : s === "cancelled"));
  const done = states.filter(({ s }) => s === "done");
  const rate = done.length ? Math.round((done.reduce((n, { l }) => { const a = audienceOf(l); return n + (a.length ? a.filter((e) => attended(l, e.id)).length / a.length : 0); }, 0) / done.length) * 100) : 0;
  const mine = (l: GroupLesson) => l.byId === admin.id;
  const actor = { name: admin.name, role: positionLabelOf(p?.positions[0] ?? "") };
  const rolled = lessons.find((l) => l.id === roll);

  return (
    <AdminShell
      image="/images/quba-quran.jpg"
      title="الدروس الدينية"
      subtitle={role === "guide-f" ? "دروسك لحاجّات مجموعاتك، وحضورها." : role === "guide" ? `دروسك لـ${groups.map((g) => groupName(g.number)).join("، ")}: لرجالها أو لها كلها، وحضورها.` : "دروس موجّهي مجموعاتك وموجّهاتها، وحضورها. للمتابعة."}
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { k: "دروس قادمة", v: states.filter(({ s }) => s === "upcoming" || s === "open").length },
          { k: "دروس أُعطيت", v: done.length },
          { k: "متوسط الحضور", v: `${rate}%` },
          { k: "قالوا سيحضرون القادمة", v: states.filter(({ s }) => s === "upcoming").reduce((n, { l }) => n + l.interested.length, 0) },
        ].map((x, i) => (
          <motion.div key={x.k} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-3xl border border-gold/30 bg-white p-4">
            <p className="font-display text-2xl font-bold text-green-dark">{typeof x.v === "number" ? formatNumber(x.v) : x.v}</p>
            <p className="text-xs text-hint">{x.k}</p>
          </motion.div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-2xl bg-sand p-1" role="tablist" aria-label="الدروس">
          {([["upcoming", "القادمة"], ["done", "المنتهية"], ["cancelled", "الملغاة"]] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("rounded-xl px-4 py-2 text-sm font-bold transition", tab === k ? "bg-green-dark text-white" : "text-ink-soft hover:text-ink")}>
              {label}
            </button>
          ))}
        </div>
        {role && (
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> درس جديد
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {shown.map(({ l, s }) => (
          <LessonCard key={l.id} l={l} state={s} audience={audienceOf(l)} own={mine(l)} onEdit={() => setEditing(l)} onRoll={() => { if (s !== "done") lessonsActions.open(l.id); setRoll(l.id); }} onCancel={() => setCancelling(l)} />
        ))}
        {shown.length === 0 && <p className="rounded-3xl border border-dashed border-gold/40 bg-white/70 p-8 text-center text-ink-soft lg:col-span-2">{tab === "upcoming" ? (role ? "لا دروس قادمة. أضف درساً من «درس جديد»." : "لا دروس قادمة لمجموعاتك بعد.") : tab === "done" ? "لم يُسجَّل حضور درس بعد." : "لا دروس ملغاة."}</p>}
      </div>

      {editing && role && <LessonForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? undefined : editing} role={role} groups={groups.map((g) => g.number)} clusterId={clusterId} onClose={() => setEditing(null)} />}
      {rolled && <Roll l={rolled} audience={audienceOf(rolled)} own={mine(rolled) && !rolled.closedAt} actor={actor} onClose={() => setRoll(null)} />}
      {cancelling && <CancelLesson l={cancelling} actor={actor} onClose={() => setCancelling(null)} />}
    </AdminShell>
  );
}

const fmtWhen = (ts: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(ts);
const fmtHijri = (ts: number) => new Intl.DateTimeFormat("ar-SY-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long" }).format(ts);
const fmtTime = (ts: number) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Damascus" }).format(ts);
const STATE_TONE: Record<LessonState, "green" | "gold" | "maroon" | "ink"> = { upcoming: "green", open: "gold", unrecorded: "maroon", done: "ink", cancelled: "maroon" };

function LessonCard({ l, state, audience, own, onEdit, onRoll, onCancel }: { l: GroupLesson; state: LessonState; audience: RosterEntry[]; own: boolean; onEdit: () => void; onRoll: () => void; onCancel: () => void }) {
  const came = audience.filter((e) => attended(l, e.id)).length;
  return (
    <div data-lesson={l.id} className="flex flex-col rounded-3xl border border-gold/30 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={l.audience === "women" ? "maroon" : l.audience === "men" ? "green" : "gold"}>{AUDIENCE_LABEL[l.audience]}</Badge>
          <Badge tone="ink">{STAGE_LABEL[l.stage]}</Badge>
        </div>
        <Badge tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Badge>
      </div>
      <p className="mt-2 font-display text-xl font-bold leading-8 text-green-dark">{l.title}</p>
      <p className="text-sm text-gold-dark">{l.topic}</p>
      <dl className="mt-3 grid gap-1.5 text-sm text-ink-soft">
        <p className="flex items-center gap-2"><CalendarClock className="size-4 text-gold-dark" /> {fmtWhen(l.at)} ({fmtHijri(l.at)}) — {fmtTime(l.at)}</p>
        <p className="flex items-center gap-2"><Clock className="size-4 text-gold-dark" /> {l.minutes} دقيقة</p>
        <p className="flex items-center gap-2"><MapPin className="size-4 text-gold-dark" /> {l.place}</p>
        <p className="flex items-center gap-2"><UsersRound className="size-4 text-gold-dark" /> {l.groups.map(groupName).join("، ")} — {l.byName} ({ROLE_LABEL[l.byRole]})</p>
      </dl>
      {l.summary && <p className="mt-3 rounded-2xl bg-sand p-3 text-sm leading-6">{l.summary}</p>}
      {l.cancelledAt && <p className="mt-3 rounded-2xl bg-maroon/10 p-3 text-sm text-maroon">أُلغي: {l.cancelReason}</p>}
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <span className="font-bold text-ink">المدعوون: {audience.length}</span>
        {!l.closedAt && <span className="flex items-center gap-1 text-green"><HandHelping className="size-4" /> قالوا سيحضرون: {l.interested.filter((id) => audience.some((e) => e.id === id)).length}</span>}
        {l.closedAt && <span className="font-bold text-green">حضر {came} من {audience.length} ({audience.length ? Math.round((came / audience.length) * 100) : 0}%)</span>}
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {state === "done" && (
          <Button size="sm" variant="outline" onClick={onRoll}><Eye className="size-4" /> الحضور</Button>
        )}
        {own && (state === "upcoming" || state === "open" || state === "unrecorded") && (
          <>
            <Button size="sm" onClick={onRoll}><ClipboardCheck className="size-4" /> {state === "open" ? "متابعة الحضور" : "تسجيل الحضور"}</Button>
            {state !== "open" && <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="size-4" /> تعديل</Button>}
            <Button size="sm" variant="ghost" className="text-maroon" onClick={onCancel}><Ban className="size-4" /> إلغاء الدرس</Button>
          </>
        )}
        {!own && state !== "done" && state !== "cancelled" && <span className="text-xs text-hint">يسجّل حضوره {l.byName}.</span>}
      </div>
    </div>
  );
}

const MINUTES = [30, 45, 60, 75, 90, 120];
const iso = (ts: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Damascus", year: "numeric", month: "2-digit", day: "2-digit" }).format(ts);

/** A new lesson, or one changed before it is given: its audience as the guide's role allows */
function LessonForm({ initial, role, groups, clusterId, onClose }: { initial?: GroupLesson; role: "guide" | "guide-f"; groups: number[]; clusterId?: string; onClose: () => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const choices = AUDIENCES[role];
  const [f, setF] = useState({
    title: initial?.title ?? "",
    topic: initial?.topic ?? TOPICS[0],
    stage: (initial?.stage ?? "pretravel") as LessonStage,
    date: initial ? iso(initial.at) : "",
    time: initial ? fmtTime(initial.at) : "18:00",
    minutes: initial?.minutes ?? 60,
    place: initial?.place ?? "",
    audience: (initial?.audience ?? choices[0]) as LessonAudience,
    groups: initial?.groups ?? groups,
    summary: initial?.summary ?? "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const missing = !f.title.trim() ? "اكتب عنوان الدرس" : !f.date ? "اختر تاريخ الدرس" : !f.place.trim() ? "اكتب مكان الدرس" : !f.groups.length ? "اختر مجموعة على الأقل" : null;
  const field = "h-11 w-full rounded-2xl border-2 border-gold/40 bg-white px-3 text-sm";

  const save = () => {
    if (missing) return;
    const at = new Date(`${f.date}T${f.time}:00+03:00`).getTime();
    const l: GroupLesson = {
      ...(initial ?? { id: `ls-${Date.now().toString(36)}`, createdAt: Date.now(), interested: [] }),
      clusterId,
      groups: f.groups,
      byId: admin.id,
      byName: admin.name,
      byRole: role,
      title: f.title.trim(),
      topic: f.topic,
      stage: f.stage,
      at,
      minutes: f.minutes,
      place: f.place.trim(),
      audience: f.audience,
      summary: f.summary.trim() || undefined,
    };
    lessonsActions.save(l, { name: admin.name, role: ROLE_LABEL[role] });
    toast({ title: initial ? "حُفظ الدرس" : "أُضيف الدرس", body: `${l.title} — يراه ${AUDIENCE_LABEL[l.audience].replace("لل", "")} في ${l.groups.map(groupName).join("، ")} في بوابة الحاج.`, tone: "success", icon: "📖" });
    onClose();
  };

  return (
    <Modal open onClose={onClose} className="max-w-2xl">
      <h2 className="font-display text-2xl font-bold text-green-dark">{initial ? "تعديل الدرس" : "درس جديد"}</h2>
      <p className="mt-1 text-sm text-ink-soft">{role === "guide-f" ? "دروس موجّهة التكتل للحاجّات وحدهن." : "لرجال المجموعة، أو للمجموعة كلها."} يظهر الدرس للحجاج المدعوين في بوابتهم فور حفظه.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-bold text-ink-soft">عنوان الدرس</span>
          <input className={field} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="مثل: أحكام الإحرام ومحظوراته" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-bold text-ink-soft">الموضوع</span>
          <select className={field} value={f.topic} onChange={(e) => set("topic", e.target.value)}>
            {TOPICS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-bold text-ink-soft">المرحلة</span>
          <select className={field} value={f.stage} onChange={(e) => set("stage", e.target.value as LessonStage)}>
            {(Object.keys(STAGE_LABEL) as LessonStage[]).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-bold text-ink-soft">التاريخ</span>
          <input type="date" className={field} value={f.date} onChange={(e) => set("date", e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-bold text-ink-soft">الساعة</span>
            <input type="time" className={field} value={f.time} onChange={(e) => set("time", e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-bold text-ink-soft">المدة</span>
            <select className={field} value={f.minutes} onChange={(e) => set("minutes", Number(e.target.value))}>
              {MINUTES.map((m) => <option key={m} value={m}>{m} دقيقة</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-bold text-ink-soft">المكان</span>
          <input className={field} value={f.place} onChange={(e) => set("place", e.target.value)} placeholder="مثل: فندق روضة طيبة — قاعة الطابق (م)" />
        </label>
        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-bold text-ink-soft">لمن الدرس</span>
          <div className="flex gap-1 rounded-2xl bg-sand p-1" role="radiogroup" aria-label="لمن الدرس">
            {choices.map((a) => (
              <button key={a} type="button" role="radio" aria-checked={f.audience === a} onClick={() => set("audience", a)} className={cn("flex-1 rounded-xl px-3 py-2 text-sm font-bold transition", f.audience === a ? "bg-green-dark text-white" : "text-ink-soft hover:text-ink")}>
                {AUDIENCE_LABEL[a]}
              </button>
            ))}
          </div>
          {role === "guide-f" && <p className="mt-1 text-xs text-hint">دروس الموجّهة للنساء وحدهن، فلا يظهر الدرس إلا للحاجّات.</p>}
        </div>
        {groups.length > 1 && (
          <div className="sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-ink-soft">المجموعات</span>
            <div className="flex flex-wrap gap-2">
              {groups.map((n) => {
                const on = f.groups.includes(n);
                return (
                  <button key={n} type="button" aria-pressed={on} onClick={() => set("groups", on ? f.groups.filter((x) => x !== n) : [...f.groups, n])} className={cn("flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-bold", on ? "border-green bg-green/5 text-green" : "border-gold/40 text-ink-soft")}>
                    {on && <Check className="size-3.5" />} {groupName(n)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-bold text-ink-soft">كلمة للحجاج (اختيارية)</span>
          <textarea rows={3} className="w-full rounded-2xl border-2 border-gold/40 p-3 text-sm leading-7" value={f.summary} onChange={(e) => set("summary", e.target.value)} placeholder="ما يحضرونه معهم، أو ما يقرؤونه قبل الدرس" />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-maroon">{missing ?? ""}</span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>رجوع</Button>
          <Button onClick={save} disabled={!!missing}><Check className="size-4" /> {initial ? "حفظ" : "إضافة الدرس"}</Button>
        </div>
      </div>
    </Modal>
  );
}

/** The attendance at a lesson: its audience to tick off as they come, saved as it goes; closed with who came */
function Roll({ l, audience, own, actor, onClose }: { l: GroupLesson; audience: (RosterEntry & { group: number })[]; own: boolean; actor: { name: string; role: string }; onClose: () => void }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const present = l.closedAt ? audience.filter((e) => attended(l, e.id)).map((e) => e.id) : (l.present ?? []);
  const toggle = (id: string) => lessonsActions.setPresent(l.id, present.includes(id) ? present.filter((x) => x !== id) : [...present, id]);
  const rows = audience.filter((e) => !q.trim() || e.name.includes(q.trim()) || e.room.includes(q.trim()));
  const several = new Set(audience.map((e) => e.group)).size > 1;

  return (
    <Modal open onClose={onClose} className="max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-gold-dark">{AUDIENCE_LABEL[l.audience]} — {fmtWhen(l.at)} {fmtTime(l.at)}</p>
          <h2 className="font-display text-2xl font-bold text-green-dark">{l.title}</h2>
        </div>
        <button type="button" aria-label="إغلاق" onClick={onClose} className="grid size-9 place-items-center rounded-full bg-sand"><X className="size-4" /></button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { k: "المدعوون", v: audience.length },
          { k: "حضروا", v: present.length },
          { k: "لم يحضروا", v: audience.length - present.length },
        ].map((x) => (
          <div key={x.k} className="rounded-2xl bg-sand p-2">
            <p className="font-display text-2xl font-bold text-green-dark">{x.v}</p>
            <p className="text-xs text-hint">{x.k}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute right-3 top-3.5 size-4 text-hint" />
          <input aria-label="بحث بالاسم أو الغرفة" className="h-11 w-full rounded-2xl border-2 border-gold/40 pr-9 pl-3 text-sm" placeholder="بحث بالاسم أو الغرفة" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {own && (
          <Button variant="outline" onClick={() => lessonsActions.setPresent(l.id, audience.map((e) => e.id))}>
            <CheckCheck className="size-4" /> الكل حاضر
          </Button>
        )}
      </div>
      <ul className="mt-3 max-h-[50vh] divide-y divide-gold/15 overflow-y-auto rounded-2xl border border-gold/25">
        {rows.map((e) => {
          const on = present.includes(e.id);
          return (
            <li key={e.id}>
              <button type="button" disabled={!own} aria-pressed={on} onClick={() => toggle(e.id)} className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-right text-sm", on ? "bg-green/5" : own && "hover:bg-sand/60")}>
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-md border-2", on ? "border-green bg-green text-white" : "border-gold/50")}>{on && <Check className="size-4" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{e.name}</span>
                  <span className="block text-xs text-hint">{e.age} عاماً — الغرفة {e.room}{several ? ` — ${groupName(e.group)}` : ""}{e.needs.length ? ` — ${e.needs.join("، ")}` : ""}</span>
                </span>
                {l.interested.includes(e.id) && <span className="rounded-full bg-green-light/15 px-2 py-0.5 text-[11px] font-bold text-green">قال سيحضر</span>}
              </button>
            </li>
          );
        })}
        {rows.length === 0 && <li className="p-6 text-center text-sm text-hint">لا أحد يطابق البحث.</li>}
      </ul>
      {own ? (
        <div className="mt-4 flex flex-wrap justify-between gap-2">
          <Button variant="ghost" className="text-maroon" onClick={() => { lessonsActions.discard(l.id); onClose(); }}>تراجع عن فتح الحضور</Button>
          <Button onClick={() => { lessonsActions.close(l.id, actor, audience.length); toast({ title: "سُجّل حضور الدرس", body: `حضر ${present.length} من ${audience.length}. يرى كل حاج حضوره في بوابته.`, tone: "success", icon: "📖" }); onClose(); }}>
            <ClipboardCheck className="size-4" /> إنهاء الدرس وحفظ الحضور
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-hint">{l.closedAt ? `سجّل الحضور ${l.byName}.` : `يسجّل الحضور ${l.byName}.`}</p>
      )}
    </Modal>
  );
}

function CancelLesson({ l, actor, onClose }: { l: GroupLesson; actor: { name: string; role: string }; onClose: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  return (
    <Modal open onClose={onClose} className="max-w-md">
      <h2 className="font-display text-xl font-bold text-green-dark">إلغاء الدرس</h2>
      <p className="mt-1 text-sm text-ink-soft">«{l.title}». يرى المدعوون الإلغاء وسببه في بوابتهم.</p>
      <textarea rows={3} className="mt-3 w-full rounded-2xl border-2 border-gold/40 p-3 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="السبب: مثل تأجيل إلى موعد آخر" aria-label="سبب الإلغاء" />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>رجوع</Button>
        <Button variant="maroon" disabled={reason.trim().length < 3} onClick={() => { lessonsActions.cancel(l.id, reason.trim(), actor); toast({ title: "أُلغي الدرس", body: l.title, tone: "info" }); onClose(); }}>
          <Ban className="size-4" /> إلغاء الدرس
        </Button>
      </div>
    </Modal>
  );
}

