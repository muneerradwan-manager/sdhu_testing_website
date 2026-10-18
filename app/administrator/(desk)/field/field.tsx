"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import confetti from "canvas-confetti";
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
import { flightsActions, isActive, useFlightsData } from "@/lib/flights";
import { actions, useStore, type Ticket, type TicketKind } from "@/lib/store";
import { groupName } from "@/lib/groups";
import { CmsImage } from "@/components/cms/image";
import { groupSeed } from "@/lib/group-profile";
import { ageOf, fullName, relationLabel } from "@/lib/registry";
import { cn, nowMs, seeded } from "@/lib/utils";
import { effectiveRole, logAdmin, positionLabelOf, useAdmin } from "../../_lib/admin";
import { acceptedGroups, headRecordOf } from "../../_lib/cluster";
import { MISSING_ID, buildRoster, groupCount, type RosterEntry } from "../../_lib/group";
import { AdminShell, LockedCard } from "../../_components/ui";

const TABS = [
  { key: "muster", label: "التجمّع", icon: UserRoundCheck },
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

/**
 * The groups he works in the field: a group head his own; the cluster's head and its assistant, every
 * group of the cluster; a coordinator, a guide or a female guide the groups the cluster's head sorted to him —
 * each with as many pilgrims as its cluster counts for it.
 */
function useFieldGroups() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const admins = useStore((x) => x.admins);
  const overrides = useStore((x) => x.formation.overrides);
  const post = useStore((x) => x.post);
  const applications = useStore((x) => x.applications);
  return useMemo(() => {
    const rec = headRecordOf(p, admins, overrides);
    const all = rec ? acceptedGroups(rec.cluster).map((g) => ({ number: g.number, head: g.name, pilgrims: g.pilgrims })).sort((a, b) => Number(b.number === rec.headGroup) - Number(a.number === rec.headGroup)) : [];
    const pick = (ns: number[]) => all.filter((g) => ns.includes(g.number));
    const groups =
      p?.cluster
        ? all
        : p?.coordinatorIn
          ? pick(p.coordinatorIn.groups)
          : p?.servesIn
            ? p.servesIn.role === "cluster-assistant"
              ? all
              : pick(p.servesIn.groups)
            : p?.group?.approvedAt
              ? [{ number: p.group.number, head: admin.name, pilgrims: 0 }]
              : [];
    const home = p?.group?.number;
    const clusterId = rec?.cluster.id ?? p?.group?.clusterId;
    return groups.map((g) => ({ ...g, clusterId, size: g.number === home && !all.length ? undefined : groupCount(g.number, post, applications, all.find((x) => x.number === g.number), home) }));
  }, [p, admins, overrides, post, applications, admin.name]);
}

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

  if (!groups.length) {
    return (
      <AdminShell title="الميدان" subtitle="أدوات الميدان في الموسم: التجمّع والحضور، قناة المجموعة، البلاغات، والتقرير اليومي.">
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
          const open = mustersOf(admin.profile?.musters ?? [], x.number, home).some((m) => !m.closedAt);
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
                {open && <span className="absolute end-1 top-1 size-2.5 rounded-full bg-green-light ring-2 ring-white" title="تجمّع مفتوح" />}
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
          {TABS.map((t) => (
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
          {tab === "muster" && <MusterTool roster={roster} onReport={() => setTab("ticket")} />}
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

// ───────────────────────── Muster ─────────────────────────

/**
 * Why the group gathers, in the season's order — the Umrahs first, as most musters are for them — each with where
 * it usually gathers, which the head changes to wherever his group meets. The muster to Damascus airport boards
 * the group's outbound flight. `required`: everyone must be there (the travel, the rites), so whoever is not has
 * his reason written; the others (the visits) are optional.
 */
type MusterKind = { key: string; label: string; place: string; flight?: true; required?: true };
const MUSTER_KINDS: { title: string; items: MusterKind[] }[] = [
  { title: "العمرات", items: [{ key: "umrah", label: "عمرة", place: "بهو الفندق في مكة" }] },
  {
    title: "السفر والتنقّل",
    items: [
      { key: "to-airport", label: "السفر: إلى مطار دمشق", place: "مطار دمشق الدولي — صالة الحجاج", flight: true, required: true },
      { key: "to-makkah", label: "الوصول: من مطار جدة إلى الفندق في مكة", place: "صالة الحجاج في مطار جدة", required: true },
      { key: "to-madinah", label: "الانتقال: من مكة إلى المدينة المنورة", place: "بهو الفندق في مكة", required: true },
      { key: "return", label: "العودة: إلى مطار المدينة المنورة", place: "بهو الفندق في المدينة", required: true },
    ],
  },
  {
    title: "المشاعر",
    items: [
      { key: "mina", label: "يوم التروية: إلى منى", place: "بهو الفندق في مكة", required: true },
      { key: "arafat", label: "يوم عرفة: من منى إلى عرفات", place: "مخيم المجموعة في منى", required: true },
      { key: "muzdalifa", label: "النفرة: من عرفات إلى مزدلفة", place: "مخيم المجموعة في عرفات", required: true },
      { key: "muzdalifa-night", label: "المبيت في مزدلفة", place: "نقطة المجموعة في مزدلفة", required: true },
      { key: "muzdalifa-mina", label: "الدفع من مزدلفة إلى منى بعد الفجر", place: "نقطة المجموعة في مزدلفة", required: true },
      { key: "jamarat", label: "رمي الجمرات", place: "مخيم المجموعة في منى", required: true },
      { key: "ifada", label: "طواف الإفاضة", place: "مخيم المجموعة في منى", required: true },
      { key: "farewell", label: "طواف الوداع", place: "بهو الفندق في مكة", required: true },
    ],
  },
  {
    // The visits of the season: in Madinah, and the landmarks of Makkah (a muster kept as «ziyarat» is Quba's)
    title: "المزارات",
    items: [
      { key: "nabawi", label: "زيارة المسجد النبوي والروضة الشريفة", place: "بهو الفندق في المدينة" },
      { key: "ziyarat", label: "زيارة مسجد قباء", place: "بهو الفندق في المدينة" },
      { key: "uhud", label: "زيارة جبل أحد ومقبرة شهداء أحد", place: "بهو الفندق في المدينة" },
      { key: "baqi", label: "زيارة مقبرة البقيع", place: "باب البقيع — الساحات الشرقية للمسجد النبوي" },
      { key: "qiblatain", label: "زيارة مسجد القبلتين والمساجد السبعة", place: "بهو الفندق في المدينة" },
      { key: "hira", label: "زيارة جبل النور وغار حراء", place: "بهو الفندق في مكة" },
      { key: "thawr", label: "زيارة جبل ثور", place: "بهو الفندق في مكة" },
    ],
  },
];
const MUSTER_KIND = (key: string) => MUSTER_KINDS.flatMap((x) => x.items).find((x) => x.key === key);

/** The group's Umrahs in order: the first is the Umrah of tamattu', then the ones its pilgrims choose to make */
const UMRAH_ORDINALS = ["عمرة التمتّع", "العمرة الثانية", "العمرة الثالثة", "العمرة الرابعة", "العمرة الخامسة"];
const umrahLabel = (done: number) => UMRAH_ORDINALS[done] ?? `العمرة رقم ${done + 1}`;

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => String(Math.round(v)));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.35 });
    return () => c.stop();
  }, [mv, value]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

/** Why a pilgrim was not at a muster: a required one asks it of each, an optional one lets it be */
const ABSENCE_REASONS = ["مريض — في العيادة أو في الفندق", "تأخّر وسيلحق بالمجموعة", "مع مرافقه أو مع مجموعة أخرى", "وكّل غيره (كبار السن والمرضى)", "اعتذر عن الحضور", "لم يُعثر عليه — أُبلغت غرفة العمليات"];
const OTHER_REASON = "__other";

/**
 * The muster: no cards to scan — the pilgrims are older, so their head ticks each one off the group's list as he
 * comes. A required muster (the travel, the rites) closes only once everyone not ticked has his reason; an optional
 * one (the visits) closes whenever, its reasons optional.
 */
function MusterTool({ roster, onReport }: { roster: RosterEntry[]; onReport: () => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const g = useFieldGroup();
  const all = admin.profile!.musters;
  const musters = mustersOf(all, g.number, g.home);
  const open = [...musters].reverse().find((m) => !m.closedAt);
  // the group's outbound flight, so the muster to the airport doubles as boarding
  const fd = useFlightsData();
  const outFlight = useMemo(() => {
    const a = fd.assignments.find((x) => x.groupNumber === g.number && (!g.clusterId || x.clusterId === g.clusterId) && isActive(x) && fd.flights.find((f) => f.id === x.flightId)?.direction === "outbound");
    return a ? fd.flights.find((f) => f.id === a.flightId) : undefined;
  }, [fd, g.number, g.clusterId]);
  const boardsFlight = open?.flightId ? fd.flights.find((f) => f.id === open.flightId) : undefined;
  const [kind, setKind] = useState("umrah");
  const [place, setPlace] = useState(MUSTER_KINDS[0].items[0].place);
  const [other, setOther] = useState("");
  const [otherRequired, setOtherRequired] = useState(false);
  // The Umrahs this group gathered for already: the next one takes its place in the order
  const umrahs = musters.filter((m) => m.kind === "umrah").length;
  const labelOf = (k: string) => (k === "umrah" ? umrahLabel(umrahs) : k === "other" ? other.trim() : (MUSTER_KIND(k)?.label ?? ""));
  // The Umrah of tamattu' is part of the Hajj; the ones after it are the pilgrims' choice
  const requiredOf = (k: string) => (k === "umrah" ? umrahs === 0 : k === "other" ? otherRequired : !!MUSTER_KIND(k)?.required);
  const pick = (k: string) => {
    setKind(k);
    const def = MUSTER_KIND(k);
    if (def) setPlace(def.place);
  };
  const title = labelOf(kind);

  // The open muster's list: who is ticked, and why the others were not there
  const [present, setPresent] = useState<string[]>(open?.present ?? []);
  const [absent, setAbsent] = useState<Record<string, string>>(open?.absent ?? {});
  const [othering, setOthering] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [q, setQ] = useState("");
  const [listKey, setListKey] = useState(open?.id);
  if (open?.id !== listKey) {
    setListKey(open?.id);
    setPresent(open?.present ?? []);
    setAbsent(open?.absent ?? {});
    setOthering({});
    setTried(false);
  }

  const expected = roster.length;
  const required = !!open?.required;
  const notThere = roster.filter((r) => !present.includes(r.id));
  const unexplained = notThere.filter((r) => !(absent[r.id] ?? "").trim());
  const canClose = !!open && (!required || unexplained.length === 0);
  const shown = q.trim() ? roster.filter((r) => r.name.includes(q.trim()) || String(r.room).includes(q.trim())) : roster;

  const save = (p: string[], a: Record<string, string>) => {
    if (!open) return;
    actions.upsertAdmin(admin.id, { musters: all.map((m) => (m.id === open.id ? { ...m, present: p, absent: a } : m)) });
  };
  const toggle = (r: RosterEntry) => {
    const p = present.includes(r.id) ? present.filter((x) => x !== r.id) : [...present, r.id];
    setPresent(p);
    save(p, absent);
  };
  const everyone = () => {
    const p = roster.map((r) => r.id);
    setPresent(p);
    save(p, absent);
    logAdmin(admin.id, `تحضير الجميع في تجمّع «${open!.title}»`, groupName(g.number), `الحاضرون ${p.length} من ${expected}`);
  };
  const setReason = (id: string, reason: string) => {
    const a = { ...absent };
    if (reason.trim()) a[id] = reason;
    else delete a[id];
    setAbsent(a);
    save(present, a);
  };

  const create = () => {
    if (!title || !place.trim()) return;
    const toAirport = MUSTER_KIND(kind)?.flight ? outFlight : undefined;
    const at = nowMs();
    const req = requiredOf(kind);
    const m = { id: `m-${at.toString(36)}`, title, kind, place: place.trim(), at, groupNumber: g.number, present: [] as string[], required: req, absent: {}, ...(toAirport ? { flightId: toAirport.id } : {}) };
    actions.upsertAdmin(admin.id, { musters: [...all, m] });
    logAdmin(admin.id, `فتح تجمّع «${m.title}» في ${m.place}`, groupName(g.number), `${req ? "ضروري" : "اختياري"} — المتوقع: ${expected}${toAirport ? ` — الرحلة ${toAirport.flightNo}` : ""}`);
    toast({ title: "فُتح التجمّع", body: `«${m.title}» في ${m.place} — حدّد من حضر من القائمة (${expected} حاجاً).${req ? " تجمّع ضروري: سبب غياب كل من لم يحضر." : " تجمّع اختياري."}`, icon: "📍", tone: "info" });
  };

  const close = () => {
    if (!open) return;
    if (!canClose) {
      setTried(true);
      return;
    }
    // Only the reasons of those not there are kept
    const reasons = Object.fromEntries(notThere.filter((r) => (absent[r.id] ?? "").trim()).map((r) => [r.id, absent[r.id].trim()]));
    actions.upsertAdmin(admin.id, { musters: all.map((m) => (m.id === open.id ? { ...m, present, absent: reasons, closedAt: Date.now() } : m)) });
    logAdmin(
      admin.id,
      `إغلاق تجمّع «${open.title}» وإرسال «انطلقنا» للجميع`,
      groupName(g.number),
      `الحاضرون ${present.length} من ${expected}${notThere.length ? ` — لم يحضر: ${notThere.map((r) => `${r.name}${reasons[r.id] ? ` (${reasons[r.id]})` : ""}`).join("، ")}` : ""}`,
    );
    if (open.flightId) flightsActions.markBoarded(open.flightId, present, { name: admin.name, role: positionLabelOf(effectiveRole(admin.profile)) || "رئيس مجموعة" });
    toast({ title: "انطلقنا 🚌", body: `الحاضرون ${present.length} من ${expected}: «انطلقت حافلة ${groupName(g.number)}.»`, icon: "📣", tone: "success" });
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ["#D9C89E", "#00594F", "#289E92"] });
  };

  // Opened by mistake, or no longer wanted: it goes as if never opened — nothing is sent, nothing kept in the record
  const cancel = () => {
    if (!open) return;
    actions.upsertAdmin(admin.id, { musters: all.filter((m) => m.id !== open.id) });
    logAdmin(admin.id, `إلغاء تجمّع «${open.title}»`, groupName(g.number), present.length ? `أُلغي بعد تحديد ${present.length} من ${expected}` : "أُلغي قبل البدء");
    toast({ title: "أُلغي التجمّع", body: `«${open.title}» — لم يُرسل شيء إلى الحجاج.`, icon: "✖️", tone: "info" });
    setCancelling(false);
  };

  const report = (r: RosterEntry) => {
    const id = actions.addTicket({
      name: r.name,
      kind: "missing",
      severity: "high",
      location: `${groupName(g.number)} — تجمّع «${open?.title ?? ""}»${open?.place ? ` في ${open.place}` : ""}`,
      text: `تأخر ${r.name} (${r.age} عاماً، الغرفة ${r.room}) عن التجمّع، والهاتف لا يرد. أبلغ عنه رئيس المجموعة خلال 5 دقائق من اكتشاف الغياب.`,
      assignee: "غرفة العمليات — فادي سلوم",
    });
    setReason(r.id, ABSENCE_REASONS[5]);
    logAdmin(admin.id, "الإبلاغ عن تأخر حاج", `البلاغ ${id}`, `${r.name} — تجمّع «${open?.title}»`);
    toast({ title: `البلاغ ${id} وصل إلى غرفة العمليات`, body: "فادي سلوم يتابع الحالة الآن.", icon: "🚨", tone: "warning" });
  };

  const pct = expected ? present.length / expected : 0;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="relative overflow-hidden md:p-8">
        {!open ? (
          <div>
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark"><Plus className="size-6 text-gold-dark" /> فتح تجمّع جديد — {groupName(g.number)}</h2>
            <p className="mt-1 text-ink-soft">اختر سبب التجمّع، ثم اكتب مكانه كما ستجتمع مجموعتك فعلاً. بعد فتحه تظهر قائمة حجاج المجموعة، فتحدّد كل من حضر.</p>
            {/* The Umrahs first: most musters are for them */}
            <button type="button" onClick={() => pick("umrah")} aria-pressed={kind === "umrah"} className={cn("mt-5 flex w-full items-center justify-between gap-3 rounded-3xl border-2 p-4 text-start transition", kind === "umrah" ? "border-green-dark bg-green-dark text-white" : "border-gold/50 hover:border-green-dark/40")}>
              <span>
                <span className="block font-display text-xl font-bold">{umrahLabel(umrahs)}</span>
                <span className={cn("block text-sm", kind === "umrah" ? "text-white/75" : "text-ink-soft")}>{umrahs ? `أدّت المجموعة ${umrahs === 1 ? "عمرة واحدة" : `${umrahs} عمرات`} — هذه التالية، اختيارية` : "أول عمرة للمجموعة بعد الوصول إلى مكة — ضرورية"}</span>
              </span>
              <span className={cn("rounded-full px-3 py-1 text-xs font-bold", kind === "umrah" ? "bg-gold text-ink" : "bg-gold/30 text-maroon")}>الأكثر</span>
            </button>
            {MUSTER_KINDS.slice(1).map((sec) => (
              <div key={sec.title} className="mt-4">
                <p className="mb-2 text-xs font-bold text-hint">{sec.title}</p>
                <div className="flex flex-wrap gap-2">
                  {sec.items.map((x) => (
                    <button key={x.key} type="button" onClick={() => pick(x.key)} aria-pressed={kind === x.key} className={cn("rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition", kind === x.key ? "border-green-dark bg-green-dark text-white" : "border-gold/50 text-ink-soft hover:border-green-dark/40")}>
                      {x.label}
                      {!x.required && <span className={cn("ms-1.5 text-[11px] font-semibold", kind === x.key ? "text-white/70" : "text-hint")}>اختياري</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setKind("other")} aria-pressed={kind === "other"} className={cn("mt-4 rounded-full border-2 border-dashed px-3.5 py-1.5 text-sm font-bold transition", kind === "other" ? "border-green-dark bg-green-dark text-white" : "border-gold/50 text-ink-soft hover:border-green-dark/40")}>
              تجمّع آخر
            </button>
            {kind === "other" && (
              <>
                <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="سبب التجمّع، مثل: درس في قاعة الفندق" className="mt-3 h-12 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" aria-label="سبب التجمّع" />
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
                  <input type="checkbox" checked={otherRequired} onChange={(e) => setOtherRequired(e.target.checked)} className="size-5 accent-[#00594f]" /> تجمّع ضروري: يلزم سبب غياب كل من لم يحضر
                </label>
              </>
            )}
            <label className="mt-5 block">
              <span className="mb-1 block font-bold">مكان التجمّع</span>
              <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="أين تجتمع المجموعة؟" className="h-14 w-full rounded-2xl border-2 border-gold/50 px-4 text-lg outline-none focus:border-green-light" aria-label="مكان التجمّع" />
              <span className="mt-1 block text-xs text-hint">اقتراح بحسب السبب — غيّره إلى حيث تجتمع مجموعتك: باب في الفندق، أو موقف حافلات، أو مدخل المخيم.</span>
            </label>
            <p className={cn("mt-3 rounded-2xl p-3 text-sm font-semibold", requiredOf(kind) ? "bg-maroon/8 text-maroon" : "bg-sand text-ink-soft")}>
              {requiredOf(kind) ? "تجمّع ضروري: لا يُغلق إلا بعد كتابة سبب غياب كل من لم يحضر." : "تجمّع اختياري: من لم يحضر لا يلزم سبب غيابه، ولك أن تكتبه."}
            </p>
            {MUSTER_KIND(kind)?.flight && outFlight && <p className="mt-3 rounded-2xl bg-gold/20 p-3 text-sm font-bold text-maroon">مرتبط برحلة المجموعة <span dir="ltr" className="font-mono">{outFlight.flightNo}</span>: من تحدّده حاضراً يُسجَّل صعوده في ملف الطيران.</p>}
            <Button size="lg" className="mt-5" onClick={create} disabled={!title || !place.trim()}>
              <UserRoundCheck className="size-5" /> فتح تجمّع «{title || "…"}» — المتوقع {expected}
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-hint">تجمّع مفتوح منذ {new Date(open.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
                <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">تجمّع: {open.title}</h2>
                {open.place && <p className="mt-1 font-bold text-ink-soft">المكان: {open.place}</p>}
                {boardsFlight && <p className="mt-1 text-sm font-bold text-gold-dark">مرتبط بالرحلة <span dir="ltr" className="font-mono">{boardsFlight.flightNo}</span>: من تحدّده حاضراً يُسجَّل صعوده في ملف الطيران.</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={required ? "maroon" : "ink"}>{required ? "ضروري" : "اختياري"}</Badge>
                <button type="button" onClick={() => setCancelling(true)} className="flex items-center gap-1 rounded-full border-2 border-maroon/30 px-3 py-1 text-xs font-bold text-maroon transition hover:bg-maroon hover:text-white" aria-label="إلغاء التجمّع">
                  <X className="size-4" /> إلغاء التجمّع
                </button>
              </div>
            </div>
            <Modal open={cancelling} onClose={() => setCancelling(false)} className="max-w-md">
              <p className="flex items-center gap-2 font-display text-xl font-bold text-maroon">
                <X className="size-5" /> إلغاء تجمّع «{open.title}»؟
              </p>
              <p className="mt-2 leading-7 text-ink-soft">
                يُحذف التجمّع كأنه لم يُفتح: لا تُرسل «انطلقنا» ولا أي رسالة إلى الحجاج، ولا يدخل سجل التجمّعات.
                {present.length > 0 && <b className="text-maroon"> ويضيع تحديد {present.length} من الحاضرين.</b>}
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="maroon" onClick={cancel}>
                  <X className="size-4" /> نعم، ألغِ التجمّع
                </Button>
                <Button variant="outline" onClick={() => setCancelling(false)}>
                  لا، أكمل التجمّع
                </Button>
              </div>
            </Modal>

            <div className="mt-5 flex items-center gap-4">
              <div className="relative size-20 shrink-0">
                <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#E4DDD3" strokeWidth="10" />
                  <motion.circle cx="50" cy="50" r="42" fill="none" stroke={pct >= 1 ? "#289E92" : "#00594F"} strokeWidth="10" strokeLinecap="round" strokeDasharray="263.9" animate={{ strokeDashoffset: 263.9 - 263.9 * pct }} transition={{ duration: 0.3 }} />
                </svg>
                <span className="absolute inset-0 grid place-items-center font-display text-lg font-bold text-green-dark"><AnimatedNumber value={present.length} /></span>
              </div>
              <dl className="grid flex-1 grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-sand p-2.5"><dt className="text-xs text-hint">المتوقع</dt><dd className="font-display text-xl font-bold">{expected}</dd></div>
                <div className="rounded-2xl bg-green-light/10 p-2.5"><dt className="text-xs text-hint">حضروا</dt><dd className="font-display text-xl font-bold text-green">{present.length}</dd></div>
                <div className={cn("rounded-2xl p-2.5", notThere.length ? "bg-maroon/10" : "bg-sand")}><dt className="text-xs text-hint">لم يحضروا</dt><dd className={cn("font-display text-xl font-bold", notThere.length ? "text-maroon" : "")}>{notThere.length}</dd></div>
              </dl>
            </div>
            <p className={cn("mt-3 rounded-2xl p-3 text-sm font-semibold", required ? "bg-maroon/8 text-maroon" : "bg-sand text-ink-soft")}>
              {required ? "تجمّع ضروري: اكتب سبب غياب كل من لم يحضر قبل الإغلاق." : "تجمّع اختياري: سبب الغياب اختياري."}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">ابحث في حجاج المجموعة</span>
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hint" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الغرفة" className="h-11 w-full rounded-2xl bg-sand ps-9 pe-3 text-sm outline-none focus:ring-4 focus:ring-green-light/15" />
              </label>
              <Button size="sm" variant="outline" onClick={everyone} disabled={present.length === expected}>
                <CheckCheck className="size-4" /> الكل حاضر
              </Button>
            </div>

            <ul className="mt-3 max-h-[34rem] space-y-2 overflow-y-auto overscroll-contain pe-1">
              {shown.map((r) => {
                const here = present.includes(r.id);
                const reason = absent[r.id] ?? "";
                const preset = ABSENCE_REASONS.includes(reason);
                const writing = othering[r.id] || (!!reason && !preset);
                const missingReason = required && !here && !reason.trim();
                return (
                  <li key={r.id} className={cn("rounded-2xl border-2 p-3 transition", here ? "border-green-light/50 bg-green-light/5" : missingReason && tried ? "border-maroon/50 bg-maroon/5" : "border-gold/30 bg-white")}>
                    <label className="flex cursor-pointer items-center gap-3">
                      <input type="checkbox" checked={here} onChange={() => toggle(r)} className="size-7 shrink-0 accent-[#00594f]" aria-label={`${r.name} حاضر`} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-ink">{r.name}</span>
                        <span className="block text-xs text-ink-soft">
                          {r.age} عاماً · الغرفة {r.room}
                          {r.needs.length > 0 && ` · ${r.needs.join("، ")}`}
                        </span>
                      </span>
                      {here && <Check className="size-5 shrink-0 text-green-light" />}
                    </label>
                    {!here && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 ps-10">
                        <select
                          value={writing ? OTHER_REASON : preset ? reason : ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === OTHER_REASON) {
                              setOthering((o) => ({ ...o, [r.id]: true }));
                              setReason(r.id, "");
                            } else {
                              setOthering((o) => ({ ...o, [r.id]: false }));
                              setReason(r.id, v);
                            }
                          }}
                          aria-label={`سبب غياب ${r.name}`}
                          className={cn("h-10 min-w-0 flex-1 rounded-xl border-2 bg-white px-2 text-sm outline-none focus:border-green-light", missingReason && tried ? "border-maroon" : "border-gold/40")}
                        >
                          <option value="">{required ? "سبب الغياب (إلزامي)" : "سبب الغياب (اختياري)"}</option>
                          {ABSENCE_REASONS.map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                          <option value={OTHER_REASON}>سبب آخر…</option>
                        </select>
                        <button type="button" onClick={() => { logAdmin(admin.id, `اتصال بالحاج ${r.name}`, `تجمّع «${open.title}»`); toast({ title: `جارٍ الاتصال بـ ${r.name}...`, body: "إن لم يرد فأرسل بلاغاً إلى غرفة العمليات.", icon: "📞", tone: "info" }); }} className="grid size-10 place-items-center rounded-xl bg-sand text-green-dark hover:bg-green-dark hover:text-white" aria-label={`اتصال بـ ${r.name}`}>
                          <Phone className="size-4" />
                        </button>
                        {required && (
                          <button type="button" onClick={() => report(r)} className="grid size-10 place-items-center rounded-xl bg-maroon/10 text-maroon hover:bg-maroon hover:text-white" aria-label={`الإبلاغ عن تأخر ${r.name}`}>
                            <Siren className="size-4" />
                          </button>
                        )}
                        {writing && (
                          <input autoFocus value={preset ? "" : reason} onChange={(e) => setReason(r.id, e.target.value)} placeholder="اكتب السبب" aria-label={`السبب الآخر لغياب ${r.name}`} className="h-10 w-full rounded-xl border-2 border-gold/40 px-3 text-sm outline-none focus:border-green-light" />
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
              {shown.length === 0 && <li className="rounded-2xl bg-sand p-4 text-center text-sm text-hint">لا أحد بهذا الاسم أو الغرفة.</li>}
            </ul>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gold-light pt-6">
              <p className={cn("text-sm", tried && !canClose ? "font-bold text-maroon" : "text-ink-soft")}>
                {notThere.length === 0
                  ? `حضر الجميع: ${present.length} من ${expected}. جاهزون للانطلاق.`
                  : required
                    ? unexplained.length
                      ? `بقي سبب غياب ${unexplained.length} ${unexplained.length === 1 ? "حاج" : "حجاج"}: لا يُغلق التجمّع الضروري قبل كتابته.`
                      : `لم يحضر ${notThere.length}، ولكلٍّ سبب غيابه.`
                    : `لم يحضر ${notThere.length} — تجمّع اختياري.`}
              </p>
              <Button size="lg" variant={canClose ? "gold" : "outline"} onClick={close}>
                <Send className="size-5" /> إغلاق التجمّع وإرسال «انطلقنا» للجميع
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Card className="md:p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><ClipboardList className="size-5 text-gold-dark" /> سجل التجمّعات</h3>
          {musters.length === 0 ? (
            <p className="mt-3 text-sm text-hint">لا تجمّعات بعد.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {[...musters].reverse().map((m) => {
                const gone = Object.keys(m.absent ?? {}).length;
                return (
                  <li key={m.id} className="rounded-xl bg-sand px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{m.title}</span>
                        {m.place && <span className="block truncate text-xs text-hint">{m.place}</span>}
                      </span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold", m.closedAt ? "bg-green-light/15 text-green" : "bg-gold/40 text-maroon")}>
                        {m.closedAt ? `أُغلق ${m.present.length}/${expected}` : "مفتوح"}
                      </span>
                    </div>
                    {m.closedAt && gone > 0 && <p className="mt-1 text-[11px] text-ink-soft">{gone === 1 ? "غائب واحد بسببه" : `${gone} غائبين بأسبابهم`}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <div className="rounded-3xl bg-green-dark p-5 text-sm leading-7 text-white/85">
          <p className="font-bold text-gold">التحضير من القائمة</p>
          لا بطاقات تُمسح: حجاجنا من كبار السن، فيحدّد رئيس المجموعة أو معاونها كل من حضر من قائمة المجموعة. التجمّعات الضرورية (السفر والمشاعر وعمرة التمتّع) يُكتب فيها سبب غياب كل من لم يحضر.
        </div>
        <button type="button" onClick={onReport} className="flex w-full items-center gap-3 rounded-3xl border-2 border-dashed border-maroon/30 bg-white p-4 text-right text-sm font-bold text-maroon hover:bg-maroon/5">
          <Siren className="size-5" /> بلاغ آخر لغرفة العمليات
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Channel ─────────────────────────

const TEMPLATES = [
  { k: "درس", icon: "📖", text: "درس الليلة 20:30 مع الشيخ خالد الرفاعي في قاعة الطابق 12 — الموضوع: أعمال يوم التروية." },
  { k: "تجمّع", icon: "📍", text: "تجمّع المجموعة في بهو الفندق 21:00 — الحافلة 21:30. لا تنسَ بطاقتك الرقمية." },
  { k: "وجبات", icon: "🍽️", text: "العشاء اليوم 19:30 – 22:00 في مطعم الطابق (م). الوجبات الخاصة يسلّمها ياسر عبد الله." },
  { k: "رحلة", icon: "🚌", text: "حافلة التنعيم غداً 16:00 — التجمّع: البوابة الجنوبية 15:45 — المشرف: ياسر عبد الله." },
];

type Post = { id: string; text: string; audience: string; at: number; reach: number };

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
  const [posts, setPosts] = useState<Post[]>([{ id: "welcome", text: "مرحباً بكم. العمرة الليلة: تجمّع في بهو الفندق 21:00. الحافلة 21:30.", audience: "المجموعة كاملة", at: 0, reach: count }]);
  const audiences = [
    { k: "المجموعة كاملة", n: count },
    { k: "الرجال", n: Math.round(count * 0.52) },
    { k: "السيدات", n: count - Math.round(count * 0.52) },
    { k: "كبار السن ومرافقوهم", n: 14 },
  ];
  const reach = audiences.find((a) => a.k === audience)?.n ?? count;

  const post = () => {
    if (!text.trim()) return;
    const p: Post = { id: Date.now().toString(36), text: text.trim(), audience, at: Date.now(), reach };
    setPosts([p, ...posts]);
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
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {posts.map((p) => (
              <motion.li key={p.id} layout initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="max-w-[92%] rounded-2xl rounded-tr-sm bg-white p-4 shadow-sm">
                <p className="text-xs font-bold text-maroon">{admin.name} — {p.audience}</p>
                <p className="mt-1 leading-8">{p.text}</p>
                <p className="mt-2 flex items-center justify-between gap-3 text-xs text-hint">
                  <span>{p.at ? new Date(p.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "24 ذو القعدة"}</span>
                  <span className="flex items-center gap-1 text-green">
                    <Check className="size-3.5" /><Check className="-mr-2.5 size-3.5" /> قرأه {p.at ? <ReadCounter to={p.reach - 2} /> : p.reach} من {p.reach}
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
  const mine = useMemo(() => tickets.filter((t) => t.location.startsWith(`${groupName(g.number)} —`)), [tickets, g.number]);
  const [form, setForm] = useState({ kind: "room" as TicketKind, severity: "medium" as Ticket["severity"], name: about ?? "المجموعة كاملة", place: about ? `${HOTEL} — الغرفة ${roster.find((r) => r.name === about)?.room ?? ""}` : `${HOTEL} — الغرفة 1214`, text: about ? "" : "التكييف في الغرفة 1214 لا يعمل منذ الصباح، والحاج كبير في السن." });

  const submit = () => {
    if (!form.text.trim()) return;
    const id = actions.addTicket({
      name: form.name,
      kind: form.kind,
      severity: form.severity,
      location: `${groupName(g.number)} — ${form.place}`,
      text: form.text.trim(),
      assignee: form.kind === "health" ? "د. ليلى شمس" : form.kind === "transport" ? "هيثم زيدان" : form.kind === "room" || form.kind === "meal" ? "وسام خوري" : "غرفة العمليات — فادي سلوم",
    });
    logAdmin(admin.id, "رفع بلاغ إلى غرفة العمليات", `البلاغ ${id}`, `${KINDS.find((k) => k.k === form.kind)?.label} — ${SEVERITY.find((s) => s.k === form.severity)?.label} — ${form.place}`);
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
