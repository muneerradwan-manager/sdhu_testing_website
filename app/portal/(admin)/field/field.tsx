"use client";

import Link from "next/link";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import {
  Accessibility,
  Bus,
  Check,
  CircleAlert,
  ClipboardList,
  CheckCheck,
  FileText,
  Landmark,
  Megaphone,
  Plane,
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
import { actions, getState, useStore, type DailyReport, type Ticket, type TicketKind } from "@/lib/store";
import { groupName } from "@/lib/groups";
import { CmsImage } from "@/components/cms/image";
import { groupSeed } from "@/lib/group-profile";
import { CATALOG, JAMARAT, JAMARAT_DAYS, MINA_NIGHTS, MUZDALIFA_LEVELS, doneWhen, performed, performedText, riteOf, umrahLabel, useGroupRites, type FieldRecordKind, type GroupMuster } from "@/lib/musters";
import type { GroupPost } from "@/lib/store";
import { cn, nowMs } from "@/lib/utils";
import { effectiveRole, isClusterRole, logAdmin, positionLabelOf, useAdmin } from "@/app/administrator/_lib/admin";
import { useClusterDay, useMyDailyReports, type TeamReport } from "@/lib/daily-reports";
import { useToday } from "@/lib/operations";
import { buildRoster, type RosterEntry } from "@/app/administrator/_lib/group";
import { useFieldGroups } from "@/app/administrator/_lib/field-groups";
import { AdminShell, LockedCard, ViewOnlyNote } from "@/app/administrator/_components/ui";
import { useAdminScope, viewOnlyText } from "@/app/administrator/_lib/scope";

const TABS = [
  { key: "muster", label: "أداء المناسك", icon: UserRoundCheck },
  { key: "visits", label: "المزارات", icon: Landmark },
  { key: "travel", label: "السفر", icon: Plane },
] as const;

/**
 * The tools of the group's day that every administrator with a place uses — not only its coordinator and head, who
 * record the rites, the visits and the journey in «الميدان»: each a page of its own in the menu
 */
export type GroupTool = "channel" | "ticket" | "day";
const TOOLS: Record<GroupTool, { title: string; subtitle: string; image: string }> = {
  channel: { title: "قناة المجموعة", subtitle: "ما تنشره لحجاج المجموعة: يصلهم في بوابتهم، بمن يعنيهم منهم.", image: "/images/tawaf-night.jpg" },
  ticket: { title: "بلاغ لغرفة العمليات", subtitle: "حالة صحية، مفقود، نقل، غرفة، وجبات: تصل إلى غرفة العمليات فوراً، وتتابع ما جرى عليها.", image: "/images/tawaf-night.jpg" },
  day: { title: "يومي", subtitle: "يوم المجموعة كما يجري: ما مضى منه، وما يأتي.", image: "/images/tawaf-night.jpg" },
};
type TabKey = (typeof TABS)[number]["key"];

/** The group the field's tools work on: picked by whoever works in several, his own for a group head */
/** The group in the field, with its cluster: the same group number exists in more than one cluster */
const FieldGroup = createContext<{ number: number; home?: number; clusterId?: string }>({ number: 0 });
const useFieldGroup = () => useContext(FieldGroup);

export function AdminField({ only }: { only?: GroupTool } = {}) {
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
  // The coordinator acts on his groups, a group's head and assistant on theirs; the cluster's head, its assistant
  // and its accountant follow; the guides have the religious lessons and activities, not the field
  const scope = useAdminScope();
  // The group's tools (its channel, a report, its day) are any administrator's who works in it; the records are its team's
  const canAct = !!g && (only ? true : scope.canAct(g.number));
  const tool = only ? TOOLS[only] : null;
  // Whoever follows only reads the records: the rites, the visits and the journey
  const tabs = TABS.filter((t) => canAct || t.key === "muster" || t.key === "visits" || t.key === "travel");

  if (scope.kind === "guide" && !only) {
    return (
      <AdminShell title="الميدان" subtitle="سجلات المجموعة في الموسم: أداء المناسك، والمزارات، والسفر.">
        <LockedCard title="الميدان لفريق عمليات المجموعة" text="يعمل فيه المنسق التقني ورئيس المجموعة ومعاونه. عمل الموجّه والموجّهة في الدروس الدينية والنشاطات الدينية." href="/portal/guide-lessons" cta="الدروس الدينية" />
      </AdminShell>
    );
  }
  if (!groups.length) {
    return (
      <AdminShell title={tool?.title ?? "الميدان"} subtitle={tool?.subtitle ?? "سجلات المجموعة في الموسم: أداء المناسك، والمزارات، والسفر."}>
        <LockedCard title={`${tool?.title ?? "الميدان"} بعد اعتماد المجموعة`} text="تُفعَّل أدوات الميدان بعد اعتماد مجموعتك، أو حين يوزّعك رئيس تكتلك على مجموعات منه." href="/portal/groups" cta="إدارة المجموعة" />
      </AdminShell>
    );
  }

  // «يومي» of the cluster's head (and its assistant): the day of all its groups, not of one
  const clusterDay = only === "day" && (isClusterRole(admin.profile) || admin.profile?.servesIn?.role === "cluster-assistant");
  if (clusterDay) {
    const clusterName = admin.profile?.cluster?.name ?? admin.profile?.servesIn?.clusterName ?? "التكتل";
    return (
      <AdminShell image="/images/tawaf-night.jpg" title={`يومي — ${clusterName}`} subtitle="يوم مجموعات التكتل كما وصلتك تقاريرها، وتقرير التكتل إلى الإدارة.">
        <ClusterDay groups={groups} clusterId={groups[0]?.clusterId} clusterName={clusterName} headId={isClusterRole(admin.profile) ? admin.id : admin.profile?.servesIn?.headId} />
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
          {tool?.title ?? "الميدان"} — {groupName(g.number)}
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-normal text-gold">
            <span className="relative flex size-2"><span className="absolute inset-0 animate-ping rounded-full bg-green-light" /><span className="relative size-2 rounded-full bg-green-light" /></span>
            موسم 1448 مباشر
          </span>
        </span>
      }
      subtitle={several ? `تعمل الآن على ${groupName(g.number)}، رئيسها ${g.head}. كل ما تفتحه هنا لها وحدها.` : (tool?.subtitle ?? "سجلات المجموعة بعد كل منسك ومزار ومحطة سفر: تصل إلى حجاجها في بوابتهم.")}
    >
      {picker}
      {scope.viewOnly && !only && <ViewOnlyNote>{viewOnlyText(scope, "أداء المناسك والمزارات والسفر")}</ViewOnlyNote>}
      {only ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {only === "channel" && <Channel count={roster.length} />}
          {only === "ticket" && <TicketDesk roster={roster} />}
          {only === "day" && <DayPlan />}
        </motion.div>
      ) : (
      <>
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
            <button key={t.key} role="tab" aria-selected={tab === t.key} type="button" onClick={() => setTab(t.key)} className={cn("relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition", tab === t.key ? "text-white" : "text-ink-soft hover:text-ink")}>
              {tab === t.key && <motion.span layoutId="field-tab" className="absolute inset-0 rounded-xl bg-green-dark" transition={{ type: "spring", damping: 28, stiffness: 320 }} />}
              <t.icon className="relative size-4" />
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
          {tab === "muster" && <RiteTool cat="rites" roster={roster} canAct={canAct} />}
          {tab === "visits" && <RiteTool key="visits" cat="visits" roster={roster} canAct={canAct} />}
          {tab === "travel" && <RiteTool key="travel" cat="travel" roster={roster} canAct={canAct} />}
        </motion.div>
      </AnimatePresence>
      </>
      )}
    </AdminShell>
    </FieldGroup.Provider>
  );
}

// ───────────────────────── أداء المناسك ─────────────────────────

/** The words of each kind of record the field keeps: the rites, the visits, the journey's legs */
const WORDS: Record<FieldRecordKind, { head: string; intro: string; all: string; did: string; notDid: string; log: string; empty: string; when: string; future: string; why: string; saved: string; icon: string; required: boolean; reasons: string[] }> = {
  rites: {
    head: "تسجيل منسك أُدّي",
    intro: "يُسجَّل المنسك بعد أن تؤديه المجموعة: اختره، واكتب متى أُدّي، ثم حدّد من أدّاه من القائمة، وسبب من لم يؤدّه. يصل إلى الحجاج جاهزاً، دون أن يُسألوا عنه قبله.",
    all: "الكل أدّاه",
    did: "أدّاه",
    notDid: "لم يؤدّه",
    log: "سجل أداء المناسك",
    empty: "لم يُسجَّل منسك بعد. يُسجَّل كل منسك بعد أن تؤديه المجموعة.",
    when: "متى أُدّي: التاريخ والساعة",
    future: "لا يُسجَّل منسك قبل أن يُؤدّى.",
    why: "لماذا لم يؤدّه؟",
    saved: "يظهر لحجاج المجموعة في «أداء المناسك» من بوابتهم.",
    icon: "🕋",
    required: true,
    reasons: ["مريض — في العيادة أو في الفندق", "أدّاه وحده أو مع مجموعة أخرى", "وكّل غيره (كبار السن والمرضى)", "مع مرافقه المريض", "تأخّر عن المجموعة ولحق بها", "لم يُعثر عليه — أُبلغت غرفة العمليات"],
  },
  visits: {
    head: "تسجيل مزار زارته المجموعة",
    intro: "يُسجَّل المزار بعد أن تزوره المجموعة: اختره، واكتب متى زارته، ثم حدّد من ذهب من الحجاج. المزار ليس منسكاً: من لم يذهب لا يُسأل عن سبب، ولك أن تكتبه.",
    all: "الكل زاره",
    did: "زاره",
    notDid: "لم يزره",
    log: "سجل المزارات",
    empty: "لم يُسجَّل مزار بعد. يُسجَّل كل مزار بعد أن تزوره المجموعة.",
    when: "متى زارته المجموعة: التاريخ والساعة",
    future: "لا يُسجَّل مزار قبل زيارته.",
    why: "لماذا لم يذهب؟",
    saved: "يظهر لحجاج المجموعة في «أداء المناسك» من بوابتهم، تحت «المزارات».",
    icon: "🕌",
    required: false,
    reasons: ["مريض أو متعب — بقي في الفندق", "اختار ألا يذهب", "زاره وحده أو مع مجموعة أخرى", "مع مرافقه"],
  },
  travel: {
    head: "تسجيل محطة من السفر",
    intro: "تُسجَّل كل محطة من سفر المجموعة بعد أن تتم: من الانطلاق إلى مطار دمشق حتى الوصول إليها. حدّد من كان مع المجموعة فيها، وسبب من لم يكن معها: الحاج الغائب عن محطة تعرفه غرفة العمليات.",
    all: "الكل مع المجموعة",
    did: "مع المجموعة",
    notDid: "لم يكن مع المجموعة",
    log: "سجل السفر",
    empty: "لم تُسجَّل محطة بعد. تُسجَّل كل محطة بعد أن تتم.",
    when: "متى تمّت: التاريخ والساعة",
    future: "لا تُسجَّل محطة قبل أن تتم.",
    why: "لماذا لم يكن مع المجموعة؟",
    saved: "يظهر لحجاج المجموعة في «أداء المناسك» من بوابتهم، تحت «السفر».",
    icon: "✈️",
    required: true,
    reasons: ["مريض — بقي في الفندق أو المستشفى", "سافر قبل المجموعة أو بعدها", "مع مرافقه المريض", "تأخّر ولحق بالمجموعة", "لم يُعثر عليه — أُبلغت غرفة العمليات"],
  },
};
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
function RiteTool({ cat, roster, canAct }: { cat: FieldRecordKind; roster: RosterEntry[]; canAct: boolean }) {
  const W = WORDS[cat];
  const LIST = CATALOG[cat];
  const ABSENCE_REASONS = W.reasons;
  const admin = useAdmin()!;
  const toast = useToast();
  const g = useFieldGroup();
  const records = useGroupRites(g.number, cat);
  const umrahs = records.filter((m) => m.kind === "umrah").length;
  const [kind, setKind] = useState(LIST[0].key);
  const [jamDay, setJamDay] = useState("10");
  const [when, setWhen] = useState(() => localInput(nowMs()));
  const [place, setPlace] = useState(LIST[0].place);
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
  const optional = !W.required || (kind === "umrah" && umrahs > 0);
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
    logAdmin(admin.id, `${W.log}: تسجيل «${title}»`, groupName(g.number), `${doneWhen(doneAt)} — ${W.did} ${performers.length} من ${roster.length}${notDone.length ? ` — ${W.notDid}: ${notDone.map((r) => `${r.name}${reasons[r.id] ? ` (${reasons[r.id]})` : ""}`).join("، ")}` : ""}`);
    toast({ title: `سُجّل «${title}»`, body: `${W.did} ${performers.length} من ${roster.length}. ${W.saved}`, icon: W.icon, tone: "success" });
    pick(kind === "umrah" ? "umrah" : kind);
    setWhen(localInput(nowMs()));
  };

  const doneCount = roster.length - notDone.length;
  const log = <RiteLog W={W} records={records} expected={roster.length} roster={roster} canAct={canAct} />;
  if (!canAct) return log;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="relative overflow-hidden md:p-8">
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark"><Plus className="size-6 text-gold-dark" /> {W.head} — {groupName(g.number)}</h2>
        <p className="mt-1 text-ink-soft">{W.intro}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {LIST.map((x) => (
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
            <span className="mb-1 block font-bold">{W.when}</span>
            <input type="datetime-local" value={when} max={localInput(nowMs())} onChange={(e) => setWhen(e.target.value)} aria-label="تاريخ الأداء وساعته" className={cn("h-12 w-full rounded-2xl border-2 px-3 outline-none focus:border-green-light", tried && (!Number.isFinite(doneAt) || doneAt > nowMs() + 60_000) ? "border-maroon" : "border-gold/50")} />
            <span className="mt-1 block text-xs text-hint">{Number.isFinite(doneAt) ? (doneAt > nowMs() + 60_000 ? W.future : doneWhen(doneAt)) : "اختر التاريخ والساعة"}</span>
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
            <CheckCheck className="size-4" /> {rite.mode === "muzdalifa" ? "الكل حتى الفجر" : rite.mode === "mina" ? "الكل الليالي كلها" : rite.mode === "jamarat" ? "الكل رمى" : W.all}
          </Button>
        </div>
        <p className="mt-2 text-sm font-semibold text-ink-soft">{W.did} {doneCount} من {roster.length}{notDone.length ? ` — ${W.notDid} ${notDone.length}` : ""}</p>

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
                    <input type="checkbox" checked={done} onChange={() => setPresent((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))} className="size-7 shrink-0 accent-[#00594f]" aria-label={`${r.name} ${W.did}`} />
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
                      aria-label={`${W.why} ${r.name}`}
                      className={cn("h-10 min-w-0 flex-1 rounded-xl border-2 bg-white px-2 text-sm outline-none focus:border-green-light", missing && tried ? "border-maroon" : "border-gold/40")}
                    >
                      <option value="">{optional ? `${W.why} (اختياري)` : `${W.why} (إلزامي)`}</option>
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
            {notDone.length === 0 ? `${W.did} الجميع: ${roster.length}.` : unexplained.length ? `بقي سبب ${unexplained.length} ${unexplained.length === 1 ? "حاج" : "حجاج"}: ${W.notDid}.` : `${W.notDid} ${notDone.length}${!W.required ? "" : optional ? " — عمرة اختيارية" : "، ولكلٍّ سببه"}.`}
          </p>
          <Button size="lg" variant={unexplained.length ? "outline" : "gold"} onClick={save} disabled={!place.trim()}>
            <Send className="size-5" /> حفظ «{title}» في {W.log}
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        {log}
        <Link href="/portal/report" className="flex w-full items-center gap-3 rounded-3xl border-2 border-dashed border-maroon/30 bg-white p-4 text-right text-sm font-bold text-maroon hover:bg-maroon/5">
          <Siren className="size-5" /> بلاغ لغرفة العمليات
        </Link>
      </div>
    </div>
  );
}

/** The group's record of rites done: each with when, who recorded it, and who did it — open one for its detail */
function RiteLog({ W, records, expected, roster, canAct }: { W: (typeof WORDS)[FieldRecordKind]; records: GroupMuster[]; expected: number; roster: RosterEntry[]; canAct: boolean }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const [open, setOpen] = useState<GroupMuster | null>(null);
  const [removing, setRemoving] = useState(false);
  const nameOf = (id: string) => roster.find((r) => r.id === id)?.name ?? id;
  const remove = (m: GroupMuster) => {
    const mine = getState().admins[m.byId];
    if (!mine) return;
    actions.upsertAdmin(m.byId, { musters: mine.musters.filter((x) => x.id !== m.id) });
    logAdmin(admin.id, `حذف «${m.title}» من ${W.log}`, groupName(m.groupNumber ?? 0), m.doneAt ? doneWhen(m.doneAt) : undefined);
    toast({ title: "حُذف من السجل", body: `«${m.title}» — لم يعد يظهر لحجاج المجموعة.`, icon: "✖️", tone: "info" });
    setRemoving(false);
    setOpen(null);
  };
  return (
    <Card className="md:p-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><ClipboardList className="size-5 text-gold-dark" /> {W.log}</h3>
      {records.length === 0 ? (
        <p className="mt-3 text-sm text-hint">{W.empty}</p>
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

/** The group's hotel, as a report from the field names it */
const HOTEL = "فندق أبراج النور — البرج (ب)";

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
    logAdmin(admin.id, "رفع بلاغ إلى غرفة العمليات", app ? `طلب ${app.number} — البلاغ ${id}` : `البلاغ ${id}`, `${form.name} — ${KINDS.find((k) => k.k === form.kind)?.label} — ${SEVERITY.find((s) => s.k === form.severity)?.label} — ${form.place} — ${groupName(g.number)}`);
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


const timeOf = (at: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { hour: "2-digit", minute: "2-digit" }).format(at);
const dateOf = (at: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { weekday: "long", day: "numeric", month: "long" }).format(at);

/** The four lines of a day's report */
const REPORT_FIELDS = [
  ["general", "الحالة العامة"],
  ["health", "الحالات الصحية"],
  ["complaints", "الشكاوى"],
  ["notes", "ملاحظات"],
] as const;

function ReportLines({ r }: { r: Pick<DailyReport, "general" | "health" | "complaints" | "notes"> }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {REPORT_FIELDS.filter(([k]) => k !== "notes" || r.notes).map(([k, l]) => (
        <div key={k} className="rounded-xl bg-sand px-3 py-2">
          <dt className="text-[11px] text-hint">{l}</dt>
          <dd className="text-sm font-semibold text-ink">{r[k]}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The group's day as it happened: nobody writes it. The platform gathers it from what the group's team did on it —
 * a rite, a visit or a leg of the journey recorded, a post to its channel, a report to the operations room, the day's
 * report — each with its hour and who did it, the latest days first.
 */
function GroupDayLog() {
  const g = useFieldGroup();
  const events = useStore((s) => s.events);
  const name = groupName(g.number);
  const days = useMemo(() => {
    const mine = events.filter((e) => e.target?.startsWith(name) || e.detail?.endsWith(`— ${name}`)).sort((a, b) => b.at - a.at).slice(0, 40);
    const out: { day: string; items: typeof mine }[] = [];
    for (const e of mine) {
      const day = dateOf(e.at);
      const last = out.at(-1);
      if (last?.day === day) last.items.push(e);
      else out.push({ day, items: [e] });
    }
    return out.map((d) => ({ ...d, items: [...d.items].reverse() }));
  }, [events, name]);
  return (
    <Card className="md:p-8">
      <h3 className="font-display text-xl font-bold text-green-dark">يوم {name} كما جرى</h3>
      <p className="mt-1 text-sm text-ink-soft">لا يكتبه أحد: تجمعه المنصة مما يسجّله فريق المجموعة عليها — منسك أو مزار أو محطة سفر، وإعلان في قناة المجموعة، وبلاغ لغرفة العمليات، والتقرير اليومي — بساعته ومن قام به.</p>
      {days.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-sand p-5 text-center text-sm text-ink-soft">لم يجرِ شيء بعد. كل ما يفعله فريق المجموعة على المنصة يظهر هنا وحده.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {days.map((d) => (
            <section key={d.day}>
              <p className="mb-3 text-sm font-bold text-gold-dark">{d.day}</p>
              <ol className="relative space-y-4 border-r-2 border-gold-light pr-6">
                {d.items.map((e, i) => (
                  <motion.li key={e.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }} className="relative">
                    <span className="absolute -right-[35px] top-1 grid size-5 place-items-center rounded-full bg-white ring-2 ring-gold-dark">
                      <span className="size-2 rounded-full bg-maroon" />
                    </span>
                    <p className="font-mono text-sm font-bold text-maroon">{timeOf(e.at)}</p>
                    <p className="font-semibold text-ink">{e.action}</p>
                    <p className="mt-0.5 text-xs text-hint">{e.actor}</p>
                    {e.detail && <p className="mt-0.5 line-clamp-2 text-sm text-green">↳ {e.detail}</p>}
                  </motion.li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}

/**
 * «يومي» for whoever works in a group: the group's day, and its report, sent to the head of its cluster. He sees
 * whether the head read it, and the reports he sent before.
 */
function DayPlan() {
  const admin = useAdmin()!;
  const toast = useToast();
  const g = useFieldGroup();
  const day = useToday();
  const mine = useMyDailyReports(admin.id).filter((r) => r.to === "cluster" && r.groupNumber === g.number);
  const today = mine.find((r) => r.day === day);
  const clusterName = admin.profile?.coordinatorIn?.clusterName ?? admin.profile?.servesIn?.clusterName ?? (g.clusterId ? "تكتلك" : "");
  const [report, setReport] = useState({ general: "مستقرة", health: "حالتان في العيادة — مستقرتان", complaints: "3 مفتوحة (تكييف 1214، وجبة خاصة، مصعد)", notes: "" });

  const send = () => {
    if (!g.clusterId) return toast({ title: "لم تدخل مجموعتك تكتلاً بعد", body: "يصل التقرير اليومي إلى رئيس التكتل حين تدخله المجموعة.", tone: "warning", icon: "⏳" });
    const role = admin.profile ? positionLabelOf(effectiveRole(admin.profile)) : "إداري";
    actions.sendDailyReport({ day, byId: admin.id, by: admin.name, role, to: "cluster", clusterId: g.clusterId, groupNumber: g.number, general: report.general, health: report.health, complaints: report.complaints, notes: report.notes.trim() || undefined });
    logAdmin(admin.id, "إرسال التقرير اليومي", groupName(g.number), `إلى رئيس ${clusterName} — الحالة: ${report.general} — الصحية: ${report.health} — الشكاوى: ${report.complaints}${report.notes ? ` — ${report.notes}` : ""}`);
    toast({ title: "أُرسل التقرير اليومي", body: `إلى رئيس ${clusterName}، ويُحفظ في «يومي». ترى هنا متى قرأه.`, icon: "📋", tone: "success" });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <GroupDayLog />
      <div className="space-y-4">
        <Card className="md:p-7">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><ClipboardList className="size-5 text-gold-dark" /> التقرير اليومي</h3>
          <p className="mt-1 text-sm text-ink-soft">يصل إلى رئيس {clusterName || "التكتل"}، ويقرؤه مع تقارير بقية مجموعات التكتل.</p>
          {today ? (
            <div className="mt-4 space-y-3">
              <ReportLines r={today} />
              <p className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold", today.readAt ? "bg-green-light/10 text-green" : "bg-gold/20 text-maroon")}>
                <Check className="size-4" /> أُرسل {timeOf(today.at)} — {today.readAt ? `قرأه ${today.readBy ?? "رئيس التكتل"} ${timeOf(today.readAt)}` : "لم يقرأه رئيس التكتل بعد"}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-3">
                {REPORT_FIELDS.map(([k, l]) => (
                  <label key={k} className="block text-sm font-bold">
                    {l}
                    <input value={report[k]} onChange={(e) => setReport({ ...report, [k]: e.target.value })} placeholder={k === "notes" ? "اختياري" : undefined} className="mt-1.5 h-11 w-full rounded-xl border-2 border-gold/50 px-3 font-normal outline-none focus:border-green-light" />
                  </label>
                ))}
              </div>
              <Button size="lg" className="mt-5 w-full" onClick={send}>
                <Send className="size-5" /> إرسال التقرير إلى رئيس التكتل
              </Button>
            </>
          )}
        </Card>
        {mine.filter((r) => r.day !== day).length > 0 && (
          <Card className="md:p-6">
            <h3 className="font-display text-lg font-bold text-green-dark">تقاريري السابقة</h3>
            <ul className="mt-3 space-y-2">
              {mine.filter((r) => r.day !== day).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-sand px-3 py-2 text-sm">
                  <span className="font-semibold">{dateOf(r.at)}</span>
                  <span className={r.readAt ? "text-green" : "text-hint"}>{r.readAt ? "قُرئ" : "لم يُقرأ"}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * «يومي» for the head of a cluster and its assistant: the day of every group of the cluster — in each group every
 * administrator who works in it, with the report he sent today or that it has not come yet (everyone sends his own) —
 * then the cluster's report, which either of them sends to the administration's operations room.
 */
function ClusterDay({ groups, clusterId, clusterName, headId }: { groups: { number: number; head: string }[]; clusterId?: string; clusterName: string; headId?: string }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const day = useToday();
  const all = useClusterDay(clusterId, groups);
  // Those who read the reports do not send one: the cluster's head (in his own group) is their reader
  const rows = all.map((r) => ({ ...r, members: r.members.filter((m) => m.id !== headId && m.id !== admin.id) }));
  const expected = rows.reduce((n, r) => n + r.members.length, 0);
  const arrived = rows.reduce((n, r) => n + r.members.filter((m) => m.report).length, 0);
  const [openId, setOpenId] = useState<string | null>(null);
  // The demo's reports from people not on this device are read for this visit
  const [seen, setSeen] = useState<string[]>([]);
  const sentToday = useStore((s) => s.dailyReports).filter((r) => r.to === "administration" && r.clusterId === clusterId && r.day === day).sort((a, b) => b.at - a.at)[0];
  const [report, setReport] = useState({ general: "مستقرة", health: "", complaints: "", notes: "" });
  const reports = rows.flatMap((r) => r.members.flatMap((m) => (m.report ? [m.report] : [])));

  const open = (m: TeamReport) => {
    setOpenId(openId === m.id ? null : m.id);
    if (!m.report) return;
    if (m.seed) setSeen((x) => (x.includes(m.id) ? x : [...x, m.id]));
    else if (!m.report.readAt) actions.readDailyReport(m.report.id, admin.name);
  };
  const isRead = (m: TeamReport) => !!m.report?.readAt || seen.includes(m.id);
  const send = () => {
    const health = report.health.trim() || [...new Set(reports.map((r) => r.health).filter((h) => h !== "لا حالات"))].join("؛ ") || "لا حالات";
    const complaints = report.complaints.trim() || [...new Set(reports.map((r) => r.complaints).filter((c) => c !== "لا شكاوى"))].join("؛ ") || "لا شكاوى";
    const role = isClusterRole(admin.profile) ? "رئيس التكتل" : "معاون التكتل";
    actions.sendDailyReport({ day, byId: admin.id, by: admin.name, role, to: "administration", clusterId, clusterName, general: `${report.general} — وصل ${arrived} من ${expected} تقريراً من ${rows.length} مجموعات`, health, complaints, notes: report.notes.trim() || undefined });
    logAdmin(admin.id, "إرسال تقرير التكتل اليومي", clusterName, `إلى غرفة العمليات — ${arrived} من ${expected} تقريراً`);
    toast({ title: "أُرسل تقرير التكتل اليومي", body: "إلى غرفة العمليات في الإدارة. يراه رئيس التكتل ومعاونه هنا، ومتى قُرئ.", icon: "📋", tone: "success" });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Card className="md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark"><ClipboardList className="size-5 text-gold-dark" /> تقارير مجموعات {clusterName} — اليوم</h3>
          <Badge tone={arrived === expected ? "green" : "gold"}>وصل {arrived} من {expected}</Badge>
        </div>
        <p className="mt-1 text-sm text-ink-soft">يرسل كل إداري يعمل في مجموعة تقريره اليومي عنها: رئيسها ومعاونها وموجّهها ومنسقها. يقرؤها رئيس التكتل ومعاونه، ومن يفتح تقريراً يعرف مرسله أنه قُرئ.</p>
        <div className="mt-4 space-y-4">
          {rows.map(({ group, members }) => {
            const got = members.filter((m) => m.report).length;
            return (
              <section key={group.number} className="rounded-2xl border border-gold/30">
                <p className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/30 bg-sand/60 px-3 py-2">
                  <span className="font-bold text-green-dark">{groupName(group.number)}</span>
                  <span className={cn("text-xs font-bold", got === members.length ? "text-green" : "text-maroon")}>{got} من {members.length}</span>
                </p>
                <ul className="divide-y divide-gold/20">
                  {members.map((m) => (
                    <li key={m.id}>
                      <button type="button" disabled={!m.report} onClick={() => open(m)} aria-expanded={openId === m.id} className="flex w-full flex-wrap items-center gap-3 px-3 py-2.5 text-start disabled:cursor-default">
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-ink">{m.name}</span>
                          <span className="block text-xs text-ink-soft">{m.role}{m.report ? ` · أرسله ${timeOf(m.report.at)}` : " · لم يصل تقريره بعد"}</span>
                        </span>
                        {m.report ? <Badge tone={isRead(m) ? "green" : "maroon"}>{isRead(m) ? "مقروء" : "جديد"}</Badge> : <Badge tone="ink">لم يصل</Badge>}
                      </button>
                      {m.report && openId === m.id && (
                        <div className="px-3 pb-3">
                          <ReportLines r={m.report} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </Card>
      <div className="space-y-4">
        <Card className="md:p-7">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><Send className="size-5 text-gold-dark" /> تقرير التكتل إلى الإدارة</h3>
          <p className="mt-1 text-sm text-ink-soft">يرسله رئيس التكتل أو معاونه إلى غرفة العمليات في الإدارة، مرة في اليوم. ما تتركه فارغاً من الحالات والشكاوى يُجمع من تقارير المجموعات.</p>
          {sentToday ? (
            <div className="mt-4 space-y-3">
              <ReportLines r={sentToday} />
              <p className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold", sentToday.readAt ? "bg-green-light/10 text-green" : "bg-gold/20 text-maroon")}>
                <Check className="size-4" /> أرسله {sentToday.by} {timeOf(sentToday.at)} — {sentToday.readAt ? `قرأته غرفة العمليات (${sentToday.readBy}) ${timeOf(sentToday.readAt)}` : "لم تقرأه غرفة العمليات بعد"}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-3">
                {REPORT_FIELDS.map(([k, l]) => (
                  <label key={k} className="block text-sm font-bold">
                    {l}
                    <input value={report[k]} onChange={(e) => setReport({ ...report, [k]: e.target.value })} placeholder={k === "general" ? undefined : k === "notes" ? "اختياري" : "يُجمع من تقارير المجموعات إن تركته"} className="mt-1.5 h-11 w-full rounded-xl border-2 border-gold/50 px-3 font-normal outline-none focus:border-green-light" />
                  </label>
                ))}
              </div>
              <Button size="lg" className="mt-5 w-full" onClick={send}>
                <Send className="size-5" /> إرسال تقرير التكتل إلى الإدارة
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
