"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import {
  Accessibility,
  BellRing,
  Bus,
  CalendarClock,
  Check,
  CircleAlert,
  ClipboardList,
  CheckCheck,
  FileText,
  Megaphone,
  Phone,
  Plus,
  Search,
  Send,
  Siren,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, Modal, useToast } from "@/components/ui/widgets";
import { isActive, useFlightsData } from "@/lib/flights";
import { actions, getState, useStore, type Ticket, type TicketKind } from "@/lib/store";
import { groupName } from "@/lib/groups";
import { CmsImage } from "@/components/cms/image";
import { groupSeed } from "@/lib/group-profile";
import { ageOf, fullName, relationLabel } from "@/lib/registry";
import { JAMARAT, JAMARAT_DAYS, MINA_NIGHTS, MUZDALIFA_LEVELS, RITES, doneWhen, performed, performedText, riteOf, umrahLabel, useGroupRites, type GroupMuster } from "@/lib/musters";
import type { GroupPost } from "@/lib/store";
import { cn, nowMs, seeded } from "@/lib/utils";
import { logAdmin, useAdmin } from "../../_lib/admin";
import { MISSING_ID, buildRoster, type RosterEntry } from "../../_lib/group";
import { useFieldGroups } from "../../_lib/field-groups";
import { AdminShell, LockedCard, ViewOnlyNote } from "../../_components/ui";
import { useAdminScope, viewOnlyText } from "../../_lib/scope";

const TABS = [
  { key: "muster", label: "أداء المناسك", icon: UserRoundCheck },
  { key: "channel", label: "قناة المجموعة", icon: Megaphone },
  { key: "roster", label: "الحجاج", icon: UsersRound },
  { key: "ticket", label: "بلاغ لغرفة العمليات", icon: Siren },
  { key: "day", label: "يومي", icon: CalendarClock },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/** The group the field's tools work on: picked by whoever works in several, his own for a group head */
/** The group in the field, with its cluster: the same group number exists in more than one cluster */
const FieldGroup = createContext<{ number: number; home?: number; clusterId?: string }>({ number: 0 });
const useFieldGroup = () => useContext(FieldGroup);

/** His musters of one group (a muster kept before groups were picked is his own group's) */
const mustersOf = <T extends { groupNumber?: number }>(all: T[], number: number, home?: number) => all.filter((m) => (m.groupNumber ?? home) === number);

export function AdminField() {
  const admin = useAdmin()!;
  const home = admin.profile?.group?.number;
  const applications = useStore((s) => s.applications);
  const post = useStore((s) => s.post);
  const groups = useFieldGroups();
  // Whoever works in several groups starts on the first (the head's own), the others above it to switch to
  const [picked, setPicked] = useState<number | null>(null);
  const g = groups.find((x) => x.number === picked) ?? groups[0];
  const pages = useStore((s) => s.groupProfiles);
  const roster = useMemo(() => (g ? buildRoster(admin.profile, applications, post, { groupNumber: g.number, size: g.size }) : []), [admin.profile, applications, post, g]);
  const [tab, setTab] = useState<TabKey>("muster");
  // A report opened from a pilgrim's details starts on him
  const [reportOn, setReportOn] = useState<string>();
  // The coordinator acts on his groups, a group's head and assistant on theirs; the cluster's head, its assistant
  // and its accountant follow; the guides have the religious lessons and activities, not the field
  const scope = useAdminScope();
  const canAct = !!g && scope.canAct(g.number);
  const tabs = TABS.filter((t) => canAct || t.key === "muster" || t.key === "roster");

  if (scope.kind === "guide") {
    return (
      <AdminShell title="الميدان" subtitle="أدوات الميدان في الموسم: أداء المناسك، قناة المجموعة، البلاغات، والتقرير اليومي.">
        <LockedCard title="الميدان لفريق عمليات المجموعة" text="يعمل فيه المنسق التقني ورئيس المجموعة ومعاونه. عمل الموجّه والموجّهة في الدروس الدينية والنشاطات الدينية." href="/administrator/lessons" cta="الدروس الدينية" />
      </AdminShell>
    );
  }
  if (!groups.length) {
    return (
      <AdminShell title="الميدان" subtitle="أدوات الميدان في الموسم: أداء المناسك، قناة المجموعة، البلاغات، والتقرير اليومي.">
        <LockedCard title="وضع الميدان بعد اعتماد المجموعة" text="تُفعَّل أدوات الميدان بعد اعتماد مجموعتك، أو حين يوزّعك رئيس تكتلك على مجموعات منه." href="/administrator/groups" cta="إدارة المجموعة" />
      </AdminShell>
    );
  }

  const several = groups.length > 1;
  // The groups as the groups' pages show them: each with its picture, the chosen one's tools right under
  const picker = several && (
    <Card className="mb-6 md:p-5">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-green-dark">
        <UsersRound className="size-4 text-gold-dark" /> مجموعاتك في الميدان ({groups.length})
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" role="radiogroup" aria-label="المجموعة">
        {groups.map((x) => {
          const on = g.number === x.number;
          const cover = pages[String(x.number)]?.approved?.fields.cover ?? groupSeed(x.number).cover;
          return (
            <button
              key={x.number}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setPicked(x.number);
                setReportOn(undefined);
              }}
              className={cn("flex items-center gap-2 overflow-hidden rounded-2xl border-2 p-1.5 text-start transition", on ? "border-green-dark bg-green-dark text-white" : "border-gold/30 hover:border-gold-dark")}
            >
              <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-sand">
                <CmsImage src={cover} alt="" fill sizes="48px" className="object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{groupName(x.number)}</span>
                <span className={cn("block truncate text-[11px]", on ? "text-white/75" : "text-ink-soft")}>
                  {x.head}
                  {x.size !== undefined && ` · ${x.size} حاجاً`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );

  return (
    <FieldGroup.Provider value={{ number: g.number, home, clusterId: g.clusterId }}>
    <AdminShell
      image="/images/tawaf-night.jpg"
      title={
        <span className="flex flex-wrap items-center gap-3">
          الميدان — {groupName(g.number)}
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-normal text-gold">
            <span className="relative flex size-2"><span className="absolute inset-0 animate-ping rounded-full bg-green-light" /><span className="relative size-2 rounded-full bg-green-light" /></span>
            موسم 1448 مباشر
          </span>
        </span>
      }
      subtitle={several ? `تعمل الآن على ${groupName(g.number)}، رئيسها ${g.head}. كل ما تفتحه هنا لها وحدها.` : "يوم في حياة رئيس المجموعة: لكل خطوة أثر يظهر في المنصة."}
    >
      {picker}
      {scope.viewOnly && <ViewOnlyNote>{viewOnlyText(scope, "أداء المناسك وقناة المجموعة والبلاغات")}</ViewOnlyNote>}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { k: "حاجاً في المجموعة", v: roster.length, icon: UsersRound },
          { k: "في العيادة", v: 2, icon: Accessibility },
          { k: "شكاوى مفتوحة", v: 3, icon: CircleAlert },
          { k: "رحلات اليوم", v: 2, icon: Bus },
        ].map((s, i) => (
          <motion.div key={s.k} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-3 rounded-3xl border border-gold/30 bg-white p-4">
            <span className="grid size-11 place-items-center rounded-2xl bg-sand text-green-dark"><s.icon className="size-5" /></span>
            <div>
              <p className="font-display text-2xl font-bold text-green-dark">{s.v}</p>
              <p className="text-xs text-hint">{s.k}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="scrollbar-none -mx-4 mb-6 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex w-max gap-1 rounded-2xl border border-gold/30 bg-white p-1" role="tablist">
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} type="button" onClick={() => { setReportOn(undefined); setTab(t.key); }} className={cn("relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition", tab === t.key ? "text-white" : "text-ink-soft hover:text-ink")}>
              {tab === t.key && <motion.span layoutId="field-tab" className="absolute inset-0 rounded-xl bg-green-dark" transition={{ type: "spring", damping: 28, stiffness: 320 }} />}
              <t.icon className="relative size-4" />
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
          {tab === "muster" && <RiteTool roster={roster} onReport={() => setTab("ticket")} canAct={canAct} />}
          {tab === "channel" && <Channel count={roster.length} />}
          {tab === "roster" && <Roster roster={roster} onReport={(name) => { setReportOn(name); setTab("ticket"); }} />}
          {tab === "ticket" && <TicketDesk roster={roster} about={reportOn} />}
          {tab === "day" && <DayPlan />}
        </motion.div>
      </AnimatePresence>
    </AdminShell>
    </FieldGroup.Provider>
  );
}

// ───────────────────────── أداء المناسك ─────────────────────────

/** Why a pilgrim did not do a rite with his group */
const ABSENCE_REASONS = ["مريض — في العيادة أو في الفندق", "أدّاه وحده أو مع مجموعة أخرى", "وكّل غيره (كبار السن والمرضى)", "مع مرافقه المريض", "تأخّر عن المجموعة ولحق بها", "لم يُعثر عليه — أُبلغت غرفة العمليات"];
const OTHER_REASON = "__other";

/** «YYYY-MM-DDTHH:mm» in the device's time, for the date-and-time field */
const localInput = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * «أداء المناسك»: a rite is recorded after it was done, never before — its date, day and hour; who of the group did
 * it, and what each did where it has degrees (Muzdalifah's night, the Jamarat thrown, Mina's nights); and why
 * whoever did not. It reaches the pilgrims done, in their portal. The cluster's head, its assistant and its
 * accountant read the record only.
 */
function RiteTool({ roster, onReport, canAct }: { roster: RosterEntry[]; onReport: () => void; canAct: boolean }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const g = useFieldGroup();
  const records = useGroupRites(g.number);
  const umrahs = records.filter((m) => m.kind === "umrah").length;
  const [kind, setKind] = useState("umrah");
  const [jamDay, setJamDay] = useState("10");
  const [when, setWhen] = useState(() => localInput(nowMs()));
  const [place, setPlace] = useState(RITES[0].place);
  const [present, setPresent] = useState<string[]>([]);
  const [detail, setDetail] = useState<Record<string, string[]>>({});
  const [absent, setAbsent] = useState<Record<string, string>>({});
  const [othering, setOthering] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const [q, setQ] = useState("");
  const rite = riteOf(kind)!;
  const day = JAMARAT_DAYS.find((d) => d.key === jamDay)!;
  const jamarat = JAMARAT.filter((x) => !day.only || day.only.includes(x.key));
  const title = kind === "umrah" ? umrahLabel(umrahs) : kind === "jamarat" ? `${rite.label} — ${day.label}` : rite.label;
  // The Umrahs after tamattu' are the pilgrims' choice: whoever did not make one needs no reason
  const optional = kind === "umrah" && umrahs > 0;
  const doneAt = new Date(when).getTime();
  const draft = { kind, present, detail };
  const did = (id: string) => performed(draft, id);
  const notDone = roster.filter((r) => !did(r.id));
  const unexplained = optional ? [] : notDone.filter((r) => !(absent[r.id] ?? "").trim());
  const shown = q.trim() ? roster.filter((r) => r.name.includes(q.trim()) || String(r.room).includes(q.trim())) : roster;

  const pick = (k: string) => {
    setKind(k);
    setPlace(riteOf(k)?.place ?? "");
    setPresent([]);
    setDetail({});
    setAbsent({});
    setOthering({});
    setTried(false);
  };
  const setOne = (id: string, d: string[]) => setDetail((x) => ({ ...x, [id]: d }));
  const toggleIn = (id: string, key: string) => {
    const cur = detail[id] ?? [];
    setOne(id, cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key]);
  };
  const everyone = () => {
    if (rite.mode === "done") setPresent(roster.map((r) => r.id));
    else setDetail(Object.fromEntries(roster.map((r) => [r.id, rite.mode === "muzdalifa" ? ["fajr"] : rite.mode === "mina" ? MINA_NIGHTS.map((x) => x.key) : jamarat.map((x) => x.key)])));
  };
  const setReason = (id: string, reason: string) =>
    setAbsent((a) => {
      const next = { ...a };
      if (reason.trim()) next[id] = reason;
      else delete next[id];
      return next;
    });

  const save = () => {
    if (!place.trim() || !Number.isFinite(doneAt) || doneAt > nowMs() + 60_000) return setTried(true);
    if (unexplained.length) return setTried(true);
    const at = nowMs();
    const performers = roster.filter((r) => did(r.id)).map((r) => r.id);
    const reasons = Object.fromEntries(notDone.filter((r) => (absent[r.id] ?? "").trim()).map((r) => [r.id, absent[r.id].trim()]));
    const kept = rite.mode === "done" ? undefined : Object.fromEntries(Object.entries(detail).filter(([id, d]) => d.length && roster.some((r) => r.id === id)));
    const m = { id: `r-${at.toString(36)}`, title, kind, place: place.trim(), at, doneAt, closedAt: at, groupNumber: g.number, present: performers, absent: reasons, required: !optional, ...(kept ? { detail: kept } : {}) };
    actions.upsertAdmin(admin.id, { musters: [...admin.profile!.musters, m] });
    logAdmin(admin.id, `تسجيل أداء «${title}»`, groupName(g.number), `${doneWhen(doneAt)} — أدّاه ${performers.length} من ${roster.length}${notDone.length ? ` — لم يؤدّه: ${notDone.map((r) => `${r.name}${reasons[r.id] ? ` (${reasons[r.id]})` : ""}`).join("، ")}` : ""}`);
    toast({ title: `سُجّل أداء «${title}»`, body: `أدّاه ${performers.length} من ${roster.length}. يظهر لحجاج المجموعة في «أداء المناسك» من بوابتهم.`, icon: "🕋", tone: "success" });
    pick(kind === "umrah" ? "umrah" : kind);
    setWhen(localInput(nowMs()));
  };

  const doneCount = roster.length - notDone.length;
  const log = <RiteLog records={records} expected={roster.length} roster={roster} canAct={canAct} />;
  if (!canAct) return log;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="relative overflow-hidden md:p-8">
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark"><Plus className="size-6 text-gold-dark" /> تسجيل منسك أُدّي — {groupName(g.number)}</h2>
        <p className="mt-1 text-ink-soft">يُسجَّل المنسك بعد أن تؤديه المجموعة: اختره، واكتب متى أُدّي، ثم حدّد من أدّاه من القائمة، وسبب من لم يؤدّه. يصل إلى الحجاج جاهزاً، دون أن يُسألوا عنه قبله.</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {RITES.map((x) => (
            <button key={x.key} type="button" onClick={() => pick(x.key)} aria-pressed={kind === x.key} className={cn("rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition", kind === x.key ? "border-green-dark bg-green-dark text-white" : "border-gold/50 text-ink-soft hover:border-green-dark/40")}>
              {x.key === "umrah" ? umrahLabel(umrahs) : x.label}
            </button>
          ))}
        </div>
        {rite.note && <p className="mt-2 text-xs text-hint">{rite.key === "umrah" && umrahs ? `أدّت المجموعة ${umrahs === 1 ? "عمرة واحدة" : `${umrahs} عمرات`} — هذه التالية، يختارها الحاج: لا يلزم سبب لمن لم يؤدّها.` : rite.note}</p>}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {kind === "jamarat" && (
            <label className="block sm:col-span-2">
              <span className="mb-1 block font-bold">يوم الرمي</span>
              <select value={jamDay} onChange={(e) => { setJamDay(e.target.value); setDetail({}); }} aria-label="يوم الرمي" className="h-12 w-full rounded-2xl border-2 border-gold/50 bg-white px-3 outline-none focus:border-green-light">
                {JAMARAT_DAYS.map((d) => <option key={d.key} value={d.key}>{d.label}{d.only ? " — جمرة العقبة وحدها" : " — الجمرات الثلاث"}</option>)}
              </select>
            </label>
          )}
          <label className="block">
            <span className="mb-1 block font-bold">متى أُدّي: التاريخ والساعة</span>
            <input type="datetime-local" value={when} max={localInput(nowMs())} onChange={(e) => setWhen(e.target.value)} aria-label="تاريخ الأداء وساعته" className={cn("h-12 w-full rounded-2xl border-2 px-3 outline-none focus:border-green-light", tried && (!Number.isFinite(doneAt) || doneAt > nowMs() + 60_000) ? "border-maroon" : "border-gold/50")} />
            <span className="mt-1 block text-xs text-hint">{Number.isFinite(doneAt) ? (doneAt > nowMs() + 60_000 ? "لا يُسجَّل منسك قبل أن يُؤدّى." : doneWhen(doneAt)) : "اختر التاريخ والساعة"}</span>
          </label>
          <label className="block">
            <span className="mb-1 block font-bold">المكان</span>
            <input value={place} onChange={(e) => setPlace(e.target.value)} aria-label="مكان الأداء" className="h-12 w-full rounded-2xl border-2 border-gold/50 px-3 outline-none focus:border-green-light" />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">ابحث في حجاج المجموعة</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الغرفة" className="h-11 w-full rounded-2xl bg-sand ps-9 pe-3 text-sm outline-none focus:ring-4 focus:ring-green-light/15" />
          </label>
          <Button size="sm" variant="outline" onClick={everyone}>
            <CheckCheck className="size-4" /> {rite.mode === "muzdalifa" ? "الكل حتى الفجر" : rite.mode === "mina" ? "الكل الليالي كلها" : rite.mode === "jamarat" ? "الكل رمى" : "الكل أدّاه"}
          </Button>
        </div>
        <p className="mt-2 text-sm font-semibold text-ink-soft">أدّاه {doneCount} من {roster.length}{notDone.length ? ` — لم يؤدّه ${notDone.length}` : ""}</p>

        <ul className="mt-3 max-h-[34rem] space-y-2 overflow-y-auto overscroll-contain pe-1">
          {shown.map((r) => {
            const done = did(r.id);
            const d = detail[r.id] ?? [];
            const reason = absent[r.id] ?? "";
            const preset = ABSENCE_REASONS.includes(reason);
            const writing = othering[r.id] || (!!reason && !preset);
            const missing = !optional && !done && !reason.trim();
            return (
              <li key={r.id} className={cn("rounded-2xl border-2 p-3 transition", done ? "border-green-light/50 bg-green-light/5" : missing && tried ? "border-maroon/50 bg-maroon/5" : "border-gold/30 bg-white")}>
                <div className="flex flex-wrap items-center gap-3">
                  {rite.mode === "done" && (
                    <input type="checkbox" checked={done} onChange={() => setPresent((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))} className="size-7 shrink-0 accent-[#00594f]" aria-label={`${r.name} أدّاه`} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-ink">{r.name}</span>
                    <span className="block text-xs text-ink-soft">
                      {r.age} عاماً · الغرفة {r.room}
                      {r.needs.length > 0 && ` · ${r.needs.join("، ")}`}
                    </span>
                  </span>
                  {done && rite.mode === "done" && <Check className="size-5 shrink-0 text-green-light" />}
                </div>
                {rite.mode === "muzdalifa" && (
                  <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label={`مبيت ${r.name} في مزدلفة`}>
                    {MUZDALIFA_LEVELS.map((x) => {
                      const on = (d[0] ?? "") === x.key;
                      return (
                        <button key={x.key} type="button" role="radio" aria-checked={on} onClick={() => setOne(r.id, [x.key])} className={cn("rounded-full border-2 px-3 py-1 text-xs font-bold transition", on ? (x.key === "none" ? "border-maroon bg-maroon text-white" : "border-green-dark bg-green-dark text-white") : "border-gold/40 text-ink-soft hover:border-green-dark/40")}>
                          {x.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {(rite.mode === "jamarat" || rite.mode === "mina") && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(rite.mode === "jamarat" ? jamarat : MINA_NIGHTS).map((x) => {
                      const on = d.includes(x.key);
                      return (
                        <label key={x.key} className={cn("flex cursor-pointer items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-bold transition", on ? "border-green-dark bg-green-dark text-white" : "border-gold/40 text-ink-soft")}>
                          <input type="checkbox" checked={on} onChange={() => toggleIn(r.id, x.key)} className="sr-only" aria-label={`${r.name}: ${rite.mode === "jamarat" ? `الجمرة ${x.label}` : x.label}`} />
                          {on && <Check className="size-3.5" />} {rite.mode === "jamarat" ? `الجمرة ${x.label}` : x.label}
                        </label>
                      );
                    })}
                  </div>
                )}
                {!done && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 ps-1">
                    <select
                      value={writing ? OTHER_REASON : preset ? reason : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setOthering((o) => ({ ...o, [r.id]: v === OTHER_REASON }));
                        setReason(r.id, v === OTHER_REASON ? "" : v);
                      }}
                      aria-label={`سبب عدم أداء ${r.name}`}
                      className={cn("h-10 min-w-0 flex-1 rounded-xl border-2 bg-white px-2 text-sm outline-none focus:border-green-light", missing && tried ? "border-maroon" : "border-gold/40")}
                    >
                      <option value="">{optional ? "لماذا لم يؤدّه؟ (اختياري)" : "لماذا لم يؤدّه؟ (إلزامي)"}</option>
                      {ABSENCE_REASONS.map((x) => <option key={x} value={x}>{x}</option>)}
                      <option value={OTHER_REASON}>سبب آخر…</option>
                    </select>
                    {writing && <input autoFocus value={preset ? "" : reason} onChange={(e) => setReason(r.id, e.target.value)} placeholder="اكتب السبب" aria-label={`السبب الآخر لـ ${r.name}`} className="h-10 w-full rounded-xl border-2 border-gold/40 px-3 text-sm outline-none focus:border-green-light" />}
                  </div>
                )}
              </li>
            );
          })}
          {shown.length === 0 && <li className="rounded-2xl bg-sand p-4 text-center text-sm text-hint">لا أحد بهذا الاسم أو الغرفة.</li>}
        </ul>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gold-light pt-6">
          <p className={cn("text-sm", tried && unexplained.length ? "font-bold text-maroon" : "text-ink-soft")}>
            {notDone.length === 0 ? `أدّاه الجميع: ${roster.length}.` : unexplained.length ? `بقي سبب ${unexplained.length} ${unexplained.length === 1 ? "حاج" : "حجاج"} لم يؤدّوه.` : `لم يؤدّه ${notDone.length}${optional ? " — عمرة اختيارية" : "، ولكلٍّ سببه"}.`}
          </p>
          <Button size="lg" variant={unexplained.length ? "outline" : "gold"} onClick={save} disabled={!place.trim()}>
            <Send className="size-5" /> حفظ «{title}» في سجل أداء المناسك
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        {log}
        <button type="button" onClick={onReport} className="flex w-full items-center gap-3 rounded-3xl border-2 border-dashed border-maroon/30 bg-white p-4 text-right text-sm font-bold text-maroon hover:bg-maroon/5">
          <Siren className="size-5" /> بلاغ لغرفة العمليات
        </button>
      </div>
    </div>
  );
}

/** The group's record of rites done: each with when, who recorded it, and who did it — open one for its detail */
function RiteLog({ records, expected, roster, canAct }: { records: GroupMuster[]; expected: number; roster: RosterEntry[]; canAct: boolean }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const [open, setOpen] = useState<GroupMuster | null>(null);
  const [removing, setRemoving] = useState(false);
  const nameOf = (id: string) => roster.find((r) => r.id === id)?.name ?? id;
  const remove = (m: GroupMuster) => {
    const mine = getState().admins[m.byId];
    if (!mine) return;
    actions.upsertAdmin(m.byId, { musters: mine.musters.filter((x) => x.id !== m.id) });
    logAdmin(admin.id, `حذف «${m.title}» من سجل أداء المناسك`, groupName(m.groupNumber ?? 0), m.doneAt ? doneWhen(m.doneAt) : undefined);
    toast({ title: "حُذف من السجل", body: `«${m.title}» — لم يعد يظهر لحجاج المجموعة.`, icon: "✖️", tone: "info" });
    setRemoving(false);
    setOpen(null);
  };
  return (
    <Card className="md:p-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><ClipboardList className="size-5 text-gold-dark" /> سجل أداء المناسك</h3>
      {records.length === 0 ? (
        <p className="mt-3 text-sm text-hint">لم يُسجَّل منسك بعد. يُسجَّل كل منسك بعد أن تؤديه المجموعة.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {records.map((m) => {
            const done = roster.filter((r) => performed(m, r.id)).length || m.present.length;
            return (
              <li key={m.id}>
                <button type="button" onClick={() => setOpen(m)} className="w-full rounded-xl bg-sand px-3 py-2 text-start text-sm transition hover:bg-gold/20">
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-semibold">{m.title}</span>
                    <span className="shrink-0 rounded-full bg-green-light/15 px-2 py-0.5 text-xs font-bold text-green">{done}/{expected}</span>
                  </span>
                  <span className="block truncate text-xs text-hint">{doneWhen(m.doneAt ?? m.at)} — سجّله {m.by}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Modal open={!!open} onClose={() => { setOpen(null); setRemoving(false); }} className="max-w-2xl">
        {open && (
          <div>
            <p className="font-display text-2xl font-bold text-green-dark">{open.title}</p>
            <p className="mt-1 text-sm text-ink-soft">{doneWhen(open.doneAt ?? open.at)}{open.place ? ` — ${open.place}` : ""} — سجّله {open.by}</p>
            <ul className="mt-4 max-h-[26rem] space-y-1.5 overflow-y-auto pe-1">
              {roster.map((r) => {
                const done = performed(open, r.id);
                return (
                  <li key={r.id} className={cn("flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm", done ? "bg-green-light/8" : "bg-maroon/5")}>
                    <span className="font-bold">{nameOf(r.id)}</span>
                    <span className={cn("text-xs font-semibold", done ? "text-green" : "text-maroon")}>
                      {performedText(open, r.id)}
                      {!done && open.absent?.[r.id] ? ` — ${open.absent[r.id]}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
            {canAct && open.byId === admin.id && (
              <div className="mt-4 border-t border-gold-light pt-4">
                {removing ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-maroon">يُحذف من السجل ولا يعود يظهر لحجاج المجموعة. متأكد؟</p>
                    <Button size="sm" variant="maroon" onClick={() => remove(open)}><X className="size-4" /> نعم، احذفه</Button>
                    <Button size="sm" variant="outline" onClick={() => setRemoving(false)}>لا</Button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setRemoving(true)} className="text-sm font-bold text-maroon hover:underline">سُجّل خطأً؟ احذفه من السجل</button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}

// ───────────────────────── Channel ─────────────────────────

const TEMPLATES = [
  { k: "درس", icon: "📖", text: "درس الليلة 20:30 مع الشيخ خالد الرفاعي في قاعة الطابق 12 — الموضوع: أعمال يوم التروية." },
  { k: "تجمّع", icon: "📍", text: "تجمّع المجموعة في بهو الفندق 21:00 — الحافلة 21:30. لا تنسَ بطاقتك الرقمية." },
  { k: "وجبات", icon: "🍽️", text: "العشاء اليوم 19:30 – 22:00 في مطعم الطابق (م). الوجبات الخاصة يسلّمها ياسر عبد الله." },
  { k: "رحلة", icon: "🚌", text: "حافلة التنعيم غداً 16:00 — التجمّع: البوابة الجنوبية 15:45 — المشرف: ياسر عبد الله." },
];

type Post = GroupPost & { reach: number };

function ReadCounter({ to }: { to: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => String(Math.round(v)));
  useEffect(() => {
    const c = animate(mv, to, { duration: 6, ease: "easeOut" });
    return () => c.stop();
  }, [mv, to]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

function Channel({ count }: { count: number }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const g = useFieldGroup();
  const [text, setText] = useState("");
  const [audience, setAudience] = useState("المجموعة كاملة");
  // The posts are kept with the administrator, by group, and reach the group's families in their portal
  const mine = admin.profile?.groupPosts ?? [];
  const audiences = [
    { k: "المجموعة كاملة", n: count },
    { k: "الرجال", n: Math.round(count * 0.52) },
    { k: "السيدات", n: count - Math.round(count * 0.52) },
    { k: "كبار السن ومرافقوهم", n: 14 },
  ];
  const reach = audiences.find((a) => a.k === audience)?.n ?? count;
  const reachOf = (k: string) => audiences.find((a) => a.k === k)?.n ?? count;
  const posts: Post[] = mine.filter((p) => p.groupNumber === g.number).map((p) => ({ ...p, reach: reachOf(p.audience) })).sort((a, b) => b.at - a.at);

  const post = () => {
    if (!text.trim()) return;
    const at = nowMs();
    const p: GroupPost = { id: at.toString(36), text: text.trim(), audience, at, groupNumber: g.number };
    actions.upsertAdmin(admin.id, { groupPosts: [...mine, p] });
    setText("");
    logAdmin(admin.id, "نشر إعلان في قناة المجموعة", `${groupName(g.number)} — ${audience}`, p.text);
    toast({ title: `وصل إشعار إلى ${reach} حاجاً`, body: p.text, icon: "📣", tone: "success" });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card className="md:p-7">
        <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark"><Megaphone className="size-6 text-gold-dark" /> إعلان جديد</h3>
        <p className="mt-1 text-sm text-hint">قناة المجموعة منفصلة عن الإعلانات الرسمية للإدارة.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <motion.button whileTap={{ scale: 0.95 }} key={t.k} type="button" onClick={() => setText(t.text)} className="flex items-center gap-1.5 rounded-full border border-gold/50 bg-sand px-3 py-1.5 text-sm font-bold hover:border-gold-dark">
              <span>{t.icon}</span> {t.k}
            </motion.button>
          ))}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={280} placeholder="اكتب إعلاناً قصيراً وواضحاً..." className="mt-4 w-full rounded-2xl border-2 border-gold/50 p-4 leading-8 outline-none focus:border-green-light" aria-label="نص الإعلان" />
        <p className="text-left text-xs text-hint">{text.length}/280</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {audiences.map((a) => (
            <button key={a.k} type="button" onClick={() => setAudience(a.k)} className={cn("rounded-xl px-3 py-2 text-xs font-bold transition", audience === a.k ? "bg-green-dark text-white" : "bg-sand text-ink-soft")}>
              {a.k} ({a.n})
            </button>
          ))}
        </div>
        <Button size="lg" className="mt-5 w-full" onClick={post} disabled={!text.trim()}>
          <Send className="size-5" /> نشر إلى {reach} حاجاً
        </Button>
      </Card>

      <div className="rounded-[2rem] bg-sand p-4 md:p-6">
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-green-dark px-4 py-3 text-white">
          <span className="grid size-10 place-items-center rounded-xl bg-gold font-display font-bold text-ink">{g.number}</span>
          <div>
            <p className="font-bold">قناة {groupName(g.number)}</p>
            <p className="text-xs text-white/70">{count} عضواً — المشرف: {admin.name}</p>
          </div>
        </div>
        {posts.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-hint">لا إعلانات بعد. ما تنشره هنا يصل إلى عائلات المجموعة في «مجموعتي» و«الإشعارات» في بوابتهم.</p>}
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {posts.map((p) => (
              <motion.li key={p.id} layout initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="max-w-[92%] rounded-2xl rounded-tr-sm bg-white p-4 shadow-sm">
                <p className="text-xs font-bold text-maroon">{admin.name} — {p.audience}</p>
                <p className="mt-1 leading-8">{p.text}</p>
                <p className="mt-2 flex items-center justify-between gap-3 text-xs text-hint">
                  <span>{new Date(p.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="flex items-center gap-1 text-green">
                    <Check className="size-3.5" /><Check className="-mr-2.5 size-3.5" /> قرأه <ReadCounter to={Math.max(0, p.reach - 2)} /> من {p.reach}
                  </span>
                </p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

// ───────────────────────── Roster ─────────────────────────

function Roster({ roster, onReport }: { roster: RosterEntry[]; onReport: (name: string) => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [needsOnly, setNeedsOnly] = useState(false);
  const fg = useFieldGroup();
  const last = [...mustersOf(admin.profile!.musters, fg.number, fg.home)].reverse().find((m) => m.present.length > 0);
  const shown = roster.filter((r) => (!q || r.name.includes(q) || r.room.includes(q)) && (!needsOnly || r.needs.length > 0));
  return (
    <Card className="md:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-gold-dark" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الغرفة" className="h-12 w-full rounded-2xl border-2 border-gold/50 pr-12 outline-none focus:border-green-light" />
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-sand px-4 py-3 text-sm font-bold">
          <input type="checkbox" checked={needsOnly} onChange={(e) => setNeedsOnly(e.target.checked)} className="accent-maroon" /> ذوو الاحتياجات فقط
        </label>
        <Badge tone="ink">{shown.length} من {roster.length}</Badge>
      </div>
      <p className="mt-3 text-xs text-hint">اضغط على الحاج لترى تفاصيله. صلاحية رئيس المجموعة: الاسم والغرفة والاحتياجات والعائلة والحضور — لا يظهر الملف الطبي التفصيلي.</p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((r, i) => {
          const here = last?.present.includes(r.id);
          return (
            <motion.li key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 20) * 0.015 }} className={cn("relative flex items-center gap-3 rounded-2xl border p-3 transition hover:border-gold-dark hover:shadow-md", r.real ? "border-gold-dark/60 bg-gold/10" : "border-gold/25", r.id === MISSING_ID && !here && last && "border-maroon/40 bg-maroon/5")}>
              {/* The whole card opens the details; the phone button sits above it */}
              <button type="button" onClick={() => setOpenId(r.id)} className="absolute inset-0 rounded-2xl" aria-label={`تفاصيل ${r.name}`} />
              <span className={cn("relative grid size-10 shrink-0 place-items-center rounded-xl font-display font-bold", r.gender === "F" ? "bg-maroon/10 text-maroon" : "bg-green-dark/10 text-green-dark")}>
                {r.name[0]}
                {last && <span className={cn("absolute -bottom-0.5 -left-0.5 size-3 rounded-full ring-2 ring-white", here ? "bg-green-light" : "bg-maroon")} />}
              </span>
              <div className="pointer-events-none relative min-w-0 flex-1">
                <p className="truncate font-bold">{r.name} <span className="font-normal text-hint">{r.age}</span></p>
                <p className="flex flex-wrap items-center gap-1 text-xs text-ink-soft">
                  الغرفة {r.room}
                  {r.real && <span className="rounded-full bg-gold/50 px-1.5 font-bold text-maroon">من بوابة الحاج</span>}
                  {r.needs.map((n) => <span key={n} className="rounded-full bg-maroon/10 px-1.5 font-bold text-maroon">{n}</span>)}
                </p>
              </div>
              <button type="button" onClick={() => toast({ title: `اتصال بـ ${r.name}`, body: r.phone, icon: "📞", tone: "info" })} className="relative grid size-9 shrink-0 place-items-center rounded-xl text-green-dark hover:bg-sand" aria-label={`اتصال بـ ${r.name}`}>
                <Phone className="size-4" />
              </button>
            </motion.li>
          );
        })}
      </ul>
      <PilgrimSheet entry={roster.find((r) => r.id === openId) ?? null} onClose={() => setOpenId(null)} onReport={(name) => { setOpenId(null); onReport(name); }} />
    </Card>
  );
}

const HOTEL = "فندق أبراج النور — البرج (ب)";
const KIN = ["ابنه", "ابنته", "زوجته", "أخوه", "ابن أخيه"];

/**
 * One pilgrim of the group, opened from the roster: who he is, where he sleeps, what he needs, who travels
 * with him, whom to call if he goes missing, whether he came to each muster, his flights, and the reports
 * about him — what the head needs in the field. The detailed medical file is not his to see.
 */
function PilgrimSheet({ entry, onClose, onReport }: { entry: RosterEntry | null; onClose: () => void; onReport: (name: string) => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const g = useFieldGroup();
  const applications = useStore((s) => s.applications);
  const tickets = useStore((s) => s.tickets);
  const fd = useFlightsData();
  const d = useMemo(() => {
    if (!entry) return null;
    // A pilgrim who came through the pilgrims' portal: his family is his application
    const app = entry.real ? Object.values(applications).find((a) => a.members.some((m) => m.person.id === entry.id)) : undefined;
    const me = app?.members.find((m) => m.person.id === entry.id);
    const family = app?.members.filter((m) => m.person.id !== entry.id) ?? [];
    const companion = me?.companionId ? app?.members.find((m) => m.person.id === me.companionId) : undefined;
    // Whom to call: his companion or the application's holder; for the others, the contact in his file
    const rnd = seeded(`${entry.id}-contact`);
    const contact = companion
      ? { who: `${fullName(companion.person)} (مرافقه في الطلب)`, phone: `09${companion.person.id.slice(-8)}` }
      : app && app.members[0].person.id !== entry.id
        ? { who: `${fullName(app.members[0].person)} (صاحب الطلب)`, phone: `09${app.members[0].person.id.slice(-8)}` }
        : { who: KIN[Math.floor(rnd() * KIN.length)], phone: `09${String(Math.floor(rnd() * 1e8)).padStart(8, "0")}` };
    // His seat if he has one; otherwise the flight the whole group is on
    const flightOf = (direction: "outbound" | "return") => {
      const mine = fd.assignments.find((a) => a.travelerId === entry.id && isActive(a) && fd.flights.find((f) => f.id === a.flightId)?.direction === direction);
      const any = mine ?? fd.assignments.find((a) => a.groupNumber === g.number && (!g.clusterId || a.clusterId === g.clusterId) && isActive(a) && fd.flights.find((f) => f.id === a.flightId)?.direction === direction);
      const flight = any ? fd.flights.find((f) => f.id === any.flightId) : undefined;
      return flight ? { flight, seat: mine?.seat } : undefined;
    };
    return {
      app,
      family,
      contact,
      flights: [flightOf("outbound"), flightOf("return")].filter((x): x is NonNullable<typeof x> => !!x),
      reports: tickets.filter((t) => t.name === entry.name),
      musters: mustersOf(admin.profile!.musters, g.number, g.home).filter((m) => m.present.length > 0 || !m.closedAt),
    };
  }, [entry, applications, tickets, fd, g.number, g.home, g.clusterId, admin.profile]);

  return (
    <Modal open={!!entry} onClose={onClose} className="max-w-2xl! md:p-8">
      {entry && d && (
        <div className="space-y-6">
          <header className="flex items-center gap-4 pl-8">
            <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl font-display text-2xl font-bold", entry.gender === "F" ? "bg-maroon/10 text-maroon" : "bg-green-dark/10 text-green-dark")}>{entry.name[0]}</span>
            <div className="min-w-0">
              <h3 className="font-display text-2xl font-bold text-green-dark">{entry.name}</h3>
              <p className="text-sm text-ink-soft">
                {entry.gender === "F" ? "حاجّة" : "حاج"} — {entry.age} عاماً — {groupName(g.number)}
                {entry.real && <span className="mr-2 rounded-full bg-gold/50 px-2 py-0.5 text-xs font-bold text-maroon">من بوابة الحاج</span>}
              </p>
            </div>
          </header>

          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ["السكن", `${HOTEL} — الغرفة ${entry.room}`],
              ["هاتفه", entry.phone],
              ["للطوارئ", `${d.contact.who} — ${d.contact.phone}`],
              ["الاحتياجات", entry.needs.length ? entry.needs.join("، ") : "لا احتياجات مسجّلة"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-sand p-3">
                <dt className="text-xs text-hint">{k}</dt>
                <dd className="mt-0.5 text-sm font-bold leading-6" dir={k === "هاتفه" ? "ltr" : undefined}>{v}</dd>
              </div>
            ))}
          </dl>

          {d.app && (
            <section>
              <h4 className="font-bold text-ink">من معه في الطلب</h4>
              {d.family.length ? (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {d.family.map((m) => (
                    <li key={m.person.id} className="flex items-center justify-between gap-2 rounded-xl border border-gold/30 px-3 py-2">
                      <span className="font-semibold">{fullName(m.person)}</span>
                      <span className="text-xs text-ink-soft">{m.relation === "self" ? "صاحب الطلب" : relationLabel(m.relation, m.person.gender)} — {ageOf(m.person)} عاماً</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ink-soft">يحج وحده في طلبه.</p>
              )}
            </section>
          )}

          <section>
            <h4 className="font-bold text-ink">الحضور في التجمّعات</h4>
            {d.musters.length ? (
              <ul className="mt-2 space-y-1.5 text-sm">
                {d.musters.map((m) => {
                  const here = m.present.includes(entry.id);
                  return (
                    <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl bg-sand/70 px-3 py-2">
                      <span>{m.title}</span>
                      <Badge tone={here ? "green" : m.closedAt ? "maroon" : "gold"}>{here ? "حضر" : m.closedAt ? "غاب" : "لم يُمسح بعد"}</Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">لم يُفتح تجمّع بعد.</p>
            )}
          </section>

          {d.flights.length > 0 && (
            <section>
              <h4 className="font-bold text-ink">رحلاته</h4>
              <ul className="mt-2 space-y-1.5 text-sm">
                {d.flights.map(({ flight, seat }) => (
                  <li key={flight.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/30 px-3 py-2">
                    <span>
                      {flight.direction === "outbound" ? "الذهاب" : "العودة"} — <span dir="ltr" className="font-mono font-bold">{flight.flightNo}</span>
                    </span>
                    <span className="text-xs text-ink-soft">{new Intl.DateTimeFormat("ar-SY-u-nu-latn", { weekday: "long", day: "numeric", month: "long" }).format(flight.departAt)}{seat ? ` — المقعد ${seat}` : " — مع المجموعة"}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h4 className="font-bold text-ink">البلاغات عنه</h4>
            {d.reports.length ? (
              <ul className="mt-2 space-y-1.5 text-sm">
                {d.reports.map((t) => (
                  <li key={t.id} className="rounded-xl bg-sand/70 px-3 py-2">
                    <span className="font-semibold">{KINDS.find((k) => k.k === t.kind)?.label}</span> — {STATUS[t.status]}
                    <span className="block text-xs leading-5 text-ink-soft">{t.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">لا بلاغ عنه.</p>
            )}
          </section>

          <div className="flex flex-wrap gap-2 border-t border-gold/30 pt-5">
            <Button onClick={() => { logAdmin(admin.id, `اتصال بالحاج ${entry.name}`, groupName(g.number)); toast({ title: `جارٍ الاتصال بـ ${entry.name}`, body: entry.phone, icon: "📞", tone: "info" }); }}>
              <Phone className="size-4" /> اتصال
            </Button>
            <Button variant="outline" onClick={() => { logAdmin(admin.id, `إرسال تنبيه إلى ${entry.name}`, groupName(g.number)); toast({ title: "أُرسل تنبيه", body: `إلى ${entry.name} وجهة اتصاله للطوارئ.`, icon: "🔔", tone: "gold" }); }}>
              <BellRing className="size-4" /> تنبيه
            </Button>
            <Button variant="outline" onClick={() => onReport(entry.name)}>
              <Siren className="size-4" /> بلاغ عنه لغرفة العمليات
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ───────────────────────── Ticket ─────────────────────────

const KINDS: { k: TicketKind; label: string; icon: string }[] = [
  { k: "health", label: "حالة صحية", icon: "🩺" },
  { k: "missing", label: "مفقود", icon: "🔎" },
  { k: "transport", label: "نقل", icon: "🚌" },
  { k: "room", label: "غرفة", icon: "🛏️" },
  { k: "meal", label: "وجبات", icon: "🍽️" },
  { k: "lost", label: "مفقودات", icon: "🧳" },
  { k: "complaint", label: "شكوى", icon: "📝" },
];
const SEVERITY: { k: Ticket["severity"]; label: string; c: string }[] = [
  { k: "low", label: "منخفضة", c: "bg-green-light" },
  { k: "medium", label: "متوسطة", c: "bg-gold-dark" },
  { k: "high", label: "عالية", c: "bg-maroon-light" },
  { k: "critical", label: "حرجة", c: "bg-maroon" },
];
const STATUS: Record<Ticket["status"], string> = { open: "مفتوح", in_progress: "قيد المعالجة", resolved: "مغلق" };

function TicketDesk({ roster, about }: { roster: RosterEntry[]; about?: string }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const g = useFieldGroup();
  const tickets = useStore((s) => s.tickets);
  const applications = useStore((s) => s.applications);
  const mine = useMemo(() => tickets.filter((t) => t.location.startsWith(`${groupName(g.number)} —`)), [tickets, g.number]);
  const [form, setForm] = useState({ kind: "room" as TicketKind, severity: "medium" as Ticket["severity"], name: about ?? "المجموعة كاملة", place: about ? `${HOTEL} — الغرفة ${roster.find((r) => r.name === about)?.room ?? ""}` : `${HOTEL} — الغرفة 1214`, text: about ? "" : "التكييف في الغرفة 1214 لا يعمل منذ الصباح، والحاج كبير في السن." });

  const submit = () => {
    if (!form.text.trim()) return;
    // A ticket about a pilgrim of the platform goes to his application too: he follows it in «بلاغاتي»
    const who = roster.find((r) => r.name === form.name && r.real);
    const app = who ? Object.values(applications).find((a) => a.members.some((m) => m.person.id === who.id)) : undefined;
    const id = actions.addTicket({
      ...(app && { applicantId: app.applicantId }),
      name: form.name,
      kind: form.kind,
      severity: form.severity,
      location: `${groupName(g.number)} — ${form.place}`,
      text: form.text.trim(),
      assignee: form.kind === "health" ? "د. ليلى شمس" : form.kind === "transport" ? "هيثم زيدان" : form.kind === "room" || form.kind === "meal" ? "وسام خوري" : "غرفة العمليات — فادي سلوم",
    });
    logAdmin(admin.id, "رفع بلاغ إلى غرفة العمليات", app ? `طلب ${app.number} — البلاغ ${id}` : `البلاغ ${id}`, `${form.name} — ${KINDS.find((k) => k.k === form.kind)?.label} — ${SEVERITY.find((s) => s.k === form.severity)?.label} — ${form.place}`);
    toast({ title: `البلاغ ${id} وصل إلى غرفة العمليات`, body: form.severity === "critical" ? "بلاغ حرج: يُصعَّد تلقائياً إن لم يُغلق خلال 15 دقيقة." : "ستصلك تحديثات الحالة هنا.", icon: "🚨", tone: form.severity === "critical" ? "warning" : "info" });
    setForm({ ...form, text: "" });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card className="md:p-7">
        <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark"><Siren className="size-6 text-maroon" /> بلاغ إلى غرفة العمليات</h3>
        <p className="mt-1 text-sm text-hint">يُربط البلاغ بالمجموعة والمكان، ويصل مباشرة إلى المختص.</p>
        <p className="mt-5 text-sm font-bold">نوع البلاغ</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {KINDS.map((k) => (
            <button key={k.k} type="button" onClick={() => setForm({ ...form, kind: k.k })} className={cn("flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-xs font-bold transition", form.kind === k.k ? "border-maroon bg-maroon/5 text-maroon" : "border-gold/40 text-ink-soft hover:border-gold-dark")}>
              <span className="text-2xl">{k.icon}</span> {k.label}
            </button>
          ))}
        </div>
        <p className="mt-5 text-sm font-bold">الخطورة</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SEVERITY.map((s) => (
            <button key={s.k} type="button" onClick={() => setForm({ ...form, severity: s.k })} className={cn("flex items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-sm font-bold", form.severity === s.k ? "border-ink bg-ink text-white" : "border-gold/40")}>
              <span className={cn("size-2.5 rounded-full", s.c)} /> {s.label}
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold">
            الحاج المعني
            <select value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 h-12 w-full rounded-2xl border-2 border-gold/50 bg-white px-3 font-normal outline-none focus:border-green-light">
              <option>المجموعة كاملة</option>
              {roster.map((r) => <option key={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold">
            المكان
            <input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} className="mt-2 h-12 w-full rounded-2xl border-2 border-gold/50 px-3 font-normal outline-none focus:border-green-light" />
          </label>
        </div>
        <label className="mt-4 block text-sm font-bold">
          الوصف
          <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={3} className="mt-2 w-full rounded-2xl border-2 border-gold/50 p-3 font-normal leading-7 outline-none focus:border-green-light" />
        </label>
        <Button size="lg" variant="maroon" className="mt-5 w-full" onClick={submit} disabled={!form.text.trim()}>
          <Send className="size-5" /> إرسال البلاغ
        </Button>
      </Card>

      <Card className="md:p-7">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><FileText className="size-5 text-gold-dark" /> بلاغات مجموعتي</h3>
        <p className="text-xs text-hint">تتحدث الحالة مباشرة حين يعالجها الموظف المختص.</p>
        {mine.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-sand p-4 text-sm text-ink-soft">لا بلاغات مرفوعة بعد.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            <AnimatePresence initial={false}>
              {mine.map((t) => (
                <motion.li key={t.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-gold/30 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">#{t.id} — {KINDS.find((k) => k.k === t.kind)?.icon} {t.name}</span>
                    <Badge tone={t.status === "resolved" ? "green" : t.status === "in_progress" ? "gold" : "maroon"}>{STATUS[t.status]}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-soft">{t.text}</p>
                  <p className="mt-1 text-xs text-hint">المختص: {t.assignee}</p>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Card>
    </div>
  );
}

// ───────────────────────── Day plan ─────────────────────────

const DAY = [
  { time: "04:00", does: "يتابع حافلة الفجر إلى الحرم من غرفته: 22 مسجّلاً", shows: "ياسر يفتح التجمّع ويمسح — أحمد يرى 22 من 22 مباشرة" },
  { time: "08:30", does: "يفتح لوحة مجموعته: 48 حاجاً — 2 في العيادة — 3 شكاوى مفتوحة", shows: "أين كل حاج (آخر حدث)، الشكاوى، البلاغات، رحلات اليوم" },
  { time: "09:00", does: "يتصل بمشرف البرج بخصوص تكييف الغرفة 1214", shows: "الشكوى مربوطة بالغرفة والبرج — وسام يغيّرها إلى «قيد المعالجة»" },
  { time: "11:00", does: "ينشر إعلان المجموعة: «درس الليلة 20:30 — وحافلة التنعيم غداً 16:00»", shows: "يصل إشعار إلى 48 حاجاً — يظهر عدد من قرأه" },
  { time: "13:30", does: "يمر على مطعم الطابق (م) ويتأكد من الوجبات الخاصة", shows: "ياسر يسجّل تسليم 5 وجبات خاصة" },
  { time: "16:00", does: "يزور الحاج الذي يحتاج أكسجيناً ليلياً مع د. ليلى", shows: "ملاحظة في الملف الطبي — يراها الفريق الطبي فقط" },
  { time: "20:30", does: "يحضر درس الشيخ خالد ويتابع الحضور", shows: "الحضور 51 من 63 مهتماً" },
  { time: "22:30", does: "يرسل التقرير اليومي بضغطة زر", shows: "يصل إلى رئيس التكتل ومشرف القطاع — ويُحفظ في ملفه" },
];

function DayPlan() {
  const admin = useAdmin()!;
  const toast = useToast();
  const g = useFieldGroup();
  const [sent, setSent] = useState(false);
  const [report, setReport] = useState({ general: "مستقرة", health: "حالتان في العيادة — مستقرتان", complaints: "3 مفتوحة (تكييف 1214، وجبة خاصة، مصعد)", notes: "" });

  const send = () => {
    setSent(true);
    logAdmin(admin.id, "إرسال التقرير اليومي", groupName(g.number), `الحالة: ${report.general} — الصحية: ${report.health} — الشكاوى: ${report.complaints}${report.notes ? ` — ${report.notes}` : ""}`);
    toast({ title: "أُرسل التقرير اليومي", body: "إلى رئيس التكتل عبد الرحمن العلي ومشرف القطاع نادر قاسم.", icon: "📋", tone: "success" });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="md:p-8">
        <h3 className="font-display text-xl font-bold text-green-dark">27 ذو القعدة — يوم عادي في مكة</h3>
        <ol className="relative mt-6 space-y-4 border-r-2 border-gold-light pr-6">
          {DAY.map((d, i) => (
            <motion.li key={d.time} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="relative">
              <span className="absolute -right-[35px] top-1 grid size-5 place-items-center rounded-full bg-white ring-2 ring-gold-dark">
                <span className="size-2 rounded-full bg-maroon" />
              </span>
              <p className="font-mono text-sm font-bold text-maroon" dir="ltr">{d.time}</p>
              <p className="font-semibold text-ink">{d.does}</p>
              <p className="mt-0.5 text-sm text-green">↳ {d.shows}</p>
            </motion.li>
          ))}
        </ol>
      </Card>
      <Card className="md:p-7">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><ClipboardList className="size-5 text-gold-dark" /> التقرير اليومي</h3>
        <div className="mt-4 space-y-3">
          {([
            ["general", "الحالة العامة"],
            ["health", "الحالات الصحية"],
            ["complaints", "الشكاوى"],
            ["notes", "ملاحظات"],
          ] as const).map(([k, l]) => (
            <label key={k} className="block text-sm font-bold">
              {l}
              <input value={report[k]} onChange={(e) => setReport({ ...report, [k]: e.target.value })} placeholder={k === "notes" ? "اختياري" : undefined} className="mt-1.5 h-11 w-full rounded-xl border-2 border-gold/50 px-3 font-normal outline-none focus:border-green-light" />
            </label>
          ))}
        </div>
        <Button size="lg" className="mt-5 w-full" variant={sent ? "outline" : "primary"} onClick={send} disabled={sent}>
          {sent ? <><Check className="size-5" /> أُرسل التقرير — 22:30</> : <><Send className="size-5" /> إرسال التقرير بضغطة زر</>}
        </Button>
      </Card>
    </div>
  );
}
