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
  CreditCard,
  FileText,
  Megaphone,
  Phone,
  Plus,
  Search,
  Send,
  Siren,
  Star,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { actions, useStore, type Ticket, type TicketKind } from "@/lib/store";
import { cn } from "@/lib/utils";
import { logAdmin, resultOf, useAdmin } from "../../_lib/admin";
import { MISSING_ID, buildRoster, type RosterEntry } from "../../_lib/group";
import { AdminShell, LockedCard, SimButton } from "../../_components/ui";

const TABS = [
  { key: "muster", label: "التجمّع", icon: UserRoundCheck },
  { key: "channel", label: "قناة المجموعة", icon: Megaphone },
  { key: "roster", label: "الحجاج", icon: UsersRound },
  { key: "ticket", label: "بلاغ لغرفة العمليات", icon: Siren },
  { key: "day", label: "يومي", icon: CalendarClock },
  { key: "evaluation", label: "تقييماتي", icon: Star },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function AdminField() {
  const admin = useAdmin()!;
  const g = admin.profile?.group;
  const applications = useStore((s) => s.applications);
  const roster = useMemo(() => buildRoster(admin.profile, applications), [admin.profile, applications]);
  const [tab, setTab] = useState<TabKey>("muster");

  if (!g?.approvedAt || !g.contractSignedAt) {
    return (
      <AdminShell title="الميدان" subtitle="أدوات رئيس المجموعة في الموسم: التجمّع والحضور، الإعلانات، البلاغات، والتقرير اليومي.">
        <LockedCard title="وضع الميدان بعد اعتماد المجموعة" text="تُفعَّل أدوات الميدان تلقائياً بعد اعتماد مجموعتك وتوقيع العقود." href="/administrator/group" cta="مجموعتي" />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      image="/images/tawaf-night.jpg"
      title={
        <span className="flex flex-wrap items-center gap-3">
          الميدان — المجموعة {g.number}
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-normal text-gold">
            <span className="relative flex size-2"><span className="absolute inset-0 animate-ping rounded-full bg-green-light" /><span className="relative size-2 rounded-full bg-green-light" /></span>
            موسم 1448 مباشر
          </span>
        </span>
      }
      subtitle="يوم في حياة رئيس المجموعة: لكل خطوة أثر يظهر في المنصة."
    >
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
          {tab === "muster" && <MusterTool roster={roster} onReport={() => setTab("ticket")} />}
          {tab === "channel" && <Channel count={roster.length} />}
          {tab === "roster" && <Roster roster={roster} />}
          {tab === "ticket" && <TicketDesk roster={roster} />}
          {tab === "day" && <DayPlan />}
          {tab === "evaluation" && <Evaluations />}
        </motion.div>
      </AnimatePresence>
    </AdminShell>
  );
}

// ───────────────────────── Muster ─────────────────────────

const MUSTER_PRESETS = ["ساحة المزة ← المطار", "صعود الحافلة 32 إلى مكة", "الفندق ← منى", "الانطلاق إلى الجمرات", "بهو الفندق — العمرة الأولى"];

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => String(Math.round(v)));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.35 });
    return () => c.stop();
  }, [mv, value]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

function MusterTool({ roster, onReport }: { roster: RosterEntry[]; onReport: () => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const g = admin.profile!.group!;
  const musters = admin.profile!.musters;
  const open = [...musters].reverse().find((m) => !m.closedAt);
  const [title, setTitle] = useState(MUSTER_PRESETS[0]);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<string[]>(open?.present ?? []);
  const [scanKey, setScanKey] = useState(open?.id);
  if (open?.id !== scanKey) {
    setScanKey(open?.id);
    setScanned(open?.present ?? []);
    setScanning(false);
  }

  const targets = useMemo(() => roster.filter((r) => r.id !== MISSING_ID).map((r) => r.id), [roster]);
  const expected = roster.length;
  const present = scanned.length;
  const scanDone = !!open && targets.every((id) => scanned.includes(id));
  const missing = scanDone ? roster.filter((r) => !scanned.includes(r.id)) : [];
  const complete = present >= expected;
  const lastScanned = scanned.slice(-4).reverse().map((id) => roster.find((r) => r.id === id)).filter(Boolean) as RosterEntry[];

  const persist = (present: string[]) => {
    if (!open) return;
    actions.upsertAdmin(admin.id, { musters: musters.map((m) => (m.id === open.id ? { ...m, present } : m)) });
  };

  useEffect(() => {
    if (!scanning || !open) return;
    const next = targets.find((id) => !scanned.includes(id));
    if (!next) return;
    const t = setTimeout(() => {
      const list = [...scanned, next];
      setScanned(list);
      if (targets.every((id) => list.includes(id))) {
        setScanning(false);
        persist(list);
        const miss = roster.filter((r) => !list.includes(r.id));
        logAdmin(admin.id, `مسح البطاقات في تجمّع «${open.title}»`, `المجموعة ${g.number}`, `الحاضرون ${list.length} من ${expected}${miss.length ? ` — الغائب: ${miss.map((m) => m.name).join("، ")}` : ""}`);
        if (miss.length) toast({ title: `الحاضرون ${list.length} من ${expected}`, body: `الغائب: ${miss.map((m) => m.name).join("، ")}`, icon: "⚠️", tone: "warning" });
      }
    }, 55 + (scanned.length % 4) * 30);
    return () => clearTimeout(t);
    // persist reads the latest musters; re-running on scanned is what drives the animation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning, scanned, targets, open?.id]);

  const create = () => {
    const m = { id: `m-${Date.now().toString(36)}`, title: title.trim() || MUSTER_PRESETS[0], at: Date.now(), present: [] as string[] };
    actions.upsertAdmin(admin.id, { musters: [...musters, m] });
    logAdmin(admin.id, `فتح تجمّع «${m.title}»`, `المجموعة ${g.number}`, `المتوقع: ${expected}`);
    toast({ title: "فُتح التجمّع", body: `«${m.title}» — المتوقع ${expected} حاجاً. ابدأ مسح البطاقات.`, icon: "📍", tone: "info" });
  };

  const arrive = (r: RosterEntry) => {
    const list = [...scanned, r.id];
    setScanned(list);
    persist(list);
    logAdmin(admin.id, `وصل ${r.name} — مسح البطاقة`, `تجمّع «${open!.title}»`, `الحاضرون ${list.length} من ${expected}`);
    toast({ title: `وصل ${r.name}`, body: `الحاضرون ${list.length} من ${expected}`, icon: "✅", tone: "success" });
  };

  const close = () => {
    if (!open) return;
    actions.upsertAdmin(admin.id, { musters: musters.map((m) => (m.id === open.id ? { ...m, present: scanned, closedAt: Date.now() } : m)) });
    logAdmin(admin.id, `إغلاق تجمّع «${open.title}» وإرسال «انطلقنا» للجميع`, `المجموعة ${g.number}`, `الحاضرون ${scanned.length} من ${expected}`);
    toast({ title: "انطلقنا 🚌", body: `وصل إلى ${expected} حاجاً: «انطلقت حافلة المجموعة ${g.number}.»`, icon: "📣", tone: "success" });
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ["#D9C89E", "#00594F", "#289E92"] });
  };

  const report = (r: RosterEntry) => {
    const id = actions.addTicket({
      name: r.name,
      kind: "missing",
      severity: "high",
      location: `المجموعة ${g.number} — تجمّع «${open?.title ?? ""}»`,
      text: `تأخر ${r.name} (${r.age} عاماً، الغرفة ${r.room}) عن التجمّع، والهاتف لا يرد. أبلغ عنه رئيس المجموعة خلال 5 دقائق من اكتشاف الغياب.`,
      assignee: "غرفة العمليات — فادي سلوم",
    });
    logAdmin(admin.id, "الإبلاغ عن تأخر حاج", `البلاغ ${id}`, `${r.name} — تجمّع «${open?.title}»`);
    toast({ title: `البلاغ ${id} وصل إلى غرفة العمليات`, body: "فادي سلوم يتابع الحالة الآن.", icon: "🚨", tone: "warning" });
  };

  const pct = expected ? present / expected : 0;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="relative overflow-hidden md:p-8">
        {!open ? (
          <div>
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark"><Plus className="size-6 text-gold-dark" /> فتح تجمّع جديد</h2>
            <p className="mt-1 text-ink-soft">يُمسح كل حاج عند وصوله، فترى المتوقع والحاضر والغائب مباشرة.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {MUSTER_PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => setTitle(p)} className={cn("rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition", title === p ? "border-green-dark bg-green-dark text-white" : "border-gold/50 text-ink-soft hover:border-green-dark/40")}>{p}</button>
              ))}
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-4 h-14 w-full rounded-2xl border-2 border-gold/50 px-4 text-lg outline-none focus:border-green-light" aria-label="عنوان التجمّع" />
            <Button size="lg" className="mt-5" onClick={create}>
              <UserRoundCheck className="size-5" /> فتح التجمّع — المتوقع {expected}
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-hint">تجمّع مفتوح منذ {new Date(open.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
                <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">تجمّع: {open.title}</h2>
              </div>
              <Badge tone={complete ? "green" : "gold"}>{complete ? "اكتمل الحضور" : scanning ? "المسح جارٍ..." : "مفتوح"}</Badge>
            </div>

            <div className="mt-6 grid items-center gap-6 sm:grid-cols-[auto_1fr]">
              <div className="relative mx-auto size-48">
                <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#E4DDD3" strokeWidth="8" />
                  <motion.circle cx="50" cy="50" r="44" fill="none" stroke={complete ? "#289E92" : "#00594F"} strokeWidth="8" strokeLinecap="round" strokeDasharray="276.5" animate={{ strokeDashoffset: 276.5 - 276.5 * pct }} transition={{ duration: 0.3 }} />
                </svg>
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="font-display text-5xl font-bold text-green-dark"><AnimatedNumber value={present} /></p>
                    <p className="text-sm text-hint">من {expected}</p>
                  </div>
                </div>
                {complete && <motion.span initial={{ scale: 0.8, opacity: 0.8 }} animate={{ scale: 1.25, opacity: 0 }} transition={{ repeat: Infinity, duration: 1.6 }} className="absolute inset-0 rounded-full border-4 border-green-light" />}
              </div>
              <div>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-sand p-3"><dt className="text-xs text-hint">المتوقع</dt><dd className="font-display text-2xl font-bold">{expected}</dd></div>
                  <div className="rounded-2xl bg-green-light/10 p-3"><dt className="text-xs text-hint">الحاضرون</dt><dd className="font-display text-2xl font-bold text-green"><AnimatedNumber value={present} /></dd></div>
                  <div className={cn("rounded-2xl p-3", missing.length ? "bg-maroon/10" : "bg-sand")}><dt className="text-xs text-hint">الغائب</dt><dd className={cn("font-display text-2xl font-bold", missing.length ? "text-maroon" : "")}>{scanDone ? missing.length : "—"}</dd></div>
                </dl>
                <div className="mt-4 h-28 overflow-hidden rounded-2xl bg-sand p-2">
                  <AnimatePresence initial={false}>
                    {lastScanned.map((r) => (
                      <motion.div key={r.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="mb-1 flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm">
                        <CreditCard className="size-4 text-green-light" />
                        <span className="flex-1 truncate font-semibold">{r.name}</span>
                        <Check className="size-4 text-green-light" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {lastScanned.length === 0 && <p className="grid h-full place-items-center text-sm text-hint">لم تُمسح أي بطاقة بعد</p>}
                </div>
              </div>
            </div>

            {!scanDone && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={() => setScanning(true)} disabled={scanning}>
                  <CreditCard className="size-5" /> {scanning ? "نمسح البطاقات..." : "بدء مسح البطاقات"}
                </Button>
                <span className="text-xs text-hint">محاكاة: يمرر الحجاج بطاقاتهم الرقمية على جهاز المعاون ياسر عبد الله.</span>
              </div>
            )}

            <AnimatePresence>
              {missing.map((r) => (
                <motion.div key={r.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-6 rounded-3xl border-2 border-maroon/40 bg-maroon/5 p-5">
                    <div className="flex flex-wrap items-center gap-4">
                      <motion.span animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} className="grid size-14 place-items-center rounded-2xl bg-maroon font-display text-2xl font-bold text-white">{r.name[0]}</motion.span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-maroon">الغائب: 1</p>
                        <p className="font-display text-xl font-bold text-ink">{r.name} — {r.age} عاماً</p>
                        <p className="text-sm text-ink-soft">الغرفة {r.room} — {r.needs.join("، ") || "لا احتياجات"} — آخر حدث: «غادر الفندق 00:40»</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => { logAdmin(admin.id, `اتصال بالحاج ${r.name}`, `تجمّع «${open.title}»`); toast({ title: `جارٍ الاتصال بـ ${r.name}...`, body: "لا يرد. جرّب إرسال تنبيه أو الإبلاغ عن التأخر.", icon: "📞", tone: "info" }); }}>
                        <Phone className="size-4" /> اتصال
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { logAdmin(admin.id, `إرسال تنبيه إلى ${r.name}`, `تجمّع «${open.title}»`); toast({ title: "أُرسل تنبيه", body: `إلى ${r.name} وجهة اتصاله للطوارئ: «الحافلة تنتظرك في ${open.title.split("←")[0].trim()}».`, icon: "🔔", tone: "gold" }); }}>
                        <BellRing className="size-4" /> إرسال تنبيه
                      </Button>
                      <Button size="sm" variant="maroon" onClick={() => report(r)}>
                        <Siren className="size-4" /> الإبلاغ عن تأخر
                      </Button>
                      <SimButton onClick={() => arrive(r)}>محاكاة: وصل {r.name.split(" ")[0]} ومسح بطاقته</SimButton>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {scanDone && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gold-light pt-6">
                <p className="text-sm text-ink-soft">{complete ? `الحاضرون ${present} من ${expected}. جاهزون للانطلاق.` : "لا يُغلق التجمّع قبل وصول الجميع أو معالجة كل غياب."}</p>
                <Button size="lg" variant={complete ? "gold" : "outline"} disabled={!complete} onClick={close}>
                  <Send className="size-5" /> إغلاق التجمّع وإرسال «انطلقنا» للجميع
                </Button>
              </div>
            )}
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
              {[...musters].reverse().map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl bg-sand px-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-semibold">{m.title}</span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold", m.closedAt ? "bg-green-light/15 text-green" : "bg-gold/40 text-maroon")}>
                    {m.closedAt ? `أُغلق ${m.present.length}/${expected}` : "مفتوح"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="rounded-3xl bg-green-dark p-5 text-sm leading-7 text-white/85">
          <p className="font-bold text-gold">التتبع بالأحداث</p>
          لا نقطة متحركة لكل حاج، بل آخر حدث مسجّل له عند مسح البطاقة. أوفر للبطارية وأحفظ للخصوصية.
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
  const g = admin.profile!.group!;
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
    logAdmin(admin.id, "نشر إعلان في قناة المجموعة", `المجموعة ${g.number} — ${audience}`, p.text);
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

      <div className="rounded-[2rem] bg-[#e9e2d6] p-4 md:p-6">
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-green-dark px-4 py-3 text-white">
          <span className="grid size-10 place-items-center rounded-xl bg-gold font-display font-bold text-ink">{g.number}</span>
          <div>
            <p className="font-bold">قناة المجموعة {g.number}</p>
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

function Roster({ roster }: { roster: RosterEntry[] }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const [q, setQ] = useState("");
  const [needsOnly, setNeedsOnly] = useState(false);
  const last = [...admin.profile!.musters].reverse().find((m) => m.present.length > 0);
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
      <p className="mt-3 text-xs text-hint">صلاحية رئيس المجموعة: الاسم والغرفة والاحتياجات — لا يظهر الملف الطبي التفصيلي.</p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((r, i) => {
          const here = last?.present.includes(r.id);
          return (
            <motion.li key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 20) * 0.015 }} className={cn("flex items-center gap-3 rounded-2xl border p-3", r.real ? "border-gold-dark/60 bg-gold/10" : "border-gold/25", r.id === MISSING_ID && !here && last && "border-maroon/40 bg-maroon/5")}>
              <span className={cn("relative grid size-10 shrink-0 place-items-center rounded-xl font-display font-bold", r.gender === "F" ? "bg-maroon/10 text-maroon" : "bg-green-dark/10 text-green-dark")}>
                {r.name[0]}
                {last && <span className={cn("absolute -bottom-0.5 -left-0.5 size-3 rounded-full ring-2 ring-white", here ? "bg-green-light" : "bg-maroon")} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{r.name} <span className="font-normal text-hint">{r.age}</span></p>
                <p className="flex flex-wrap items-center gap-1 text-xs text-ink-soft">
                  الغرفة {r.room}
                  {r.real && <span className="rounded-full bg-gold/50 px-1.5 font-bold text-maroon">من بوابة الحاج</span>}
                  {r.needs.map((n) => <span key={n} className="rounded-full bg-maroon/10 px-1.5 font-bold text-maroon">{n}</span>)}
                </p>
              </div>
              <button type="button" onClick={() => toast({ title: `اتصال بـ ${r.name}`, body: r.phone, icon: "📞", tone: "info" })} className="grid size-9 shrink-0 place-items-center rounded-xl text-green-dark hover:bg-sand" aria-label={`اتصال بـ ${r.name}`}>
                <Phone className="size-4" />
              </button>
            </motion.li>
          );
        })}
      </ul>
    </Card>
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

function TicketDesk({ roster }: { roster: RosterEntry[] }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const g = admin.profile!.group!;
  const tickets = useStore((s) => s.tickets);
  const mine = useMemo(() => tickets.filter((t) => t.location.startsWith(`المجموعة ${g.number} —`)), [tickets, g.number]);
  const [form, setForm] = useState({ kind: "room" as TicketKind, severity: "medium" as Ticket["severity"], name: "المجموعة كاملة", place: "فندق أبراج النور — البرج (ب) — الغرفة 1214", text: "التكييف في الغرفة 1214 لا يعمل منذ الصباح، والحاج كبير في السن." });

  const submit = () => {
    if (!form.text.trim()) return;
    const id = actions.addTicket({
      name: form.name,
      kind: form.kind,
      severity: form.severity,
      location: `المجموعة ${g.number} — ${form.place}`,
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
  const g = admin.profile!.group!;
  const [sent, setSent] = useState(false);
  const [report, setReport] = useState({ general: "مستقرة", health: "حالتان في العيادة — مستقرتان", complaints: "3 مفتوحة (تكييف 1214، وجبة خاصة، مصعد)", notes: "" });

  const send = () => {
    setSent(true);
    logAdmin(admin.id, "إرسال التقرير اليومي", `المجموعة ${g.number}`, `الحالة: ${report.general} — الصحية: ${report.health} — الشكاوى: ${report.complaints}${report.notes ? ` — ${report.notes}` : ""}`);
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

// ───────────────────────── Evaluations ─────────────────────────

const STAFF_RATINGS = [
  { who: "ماهر عيسى", scope: "شؤون الإداريين", item: "اكتمال طلب المشاركة من أول مرة", v: 5 },
  { who: "ماهر عيسى", scope: "شؤون الإداريين", item: "طلب التشكيل كامل والعقود خلال 48 ساعة", v: 5 },
  { who: "رنا حداد", scope: "إدارة التسجيل", item: "الاستجابة قبل الموسم — الرد على الانتساب خلال 3 ساعات", v: 5 },
  { who: "نادر قاسم", scope: "مشرف القطاع", item: "التحضير قبل السفر — الدروس 4 من 4، اللقاء 96%", v: 5 },
  { who: "هيثم زيدان", scope: "المواصلات", item: "انضباط التجمّع — أُغلق 01:32 قبل الانطلاق", v: 5 },
  { who: "نادر قاسم وفادي سلوم", scope: "المشاعر", item: "دقة التجمّعات، المفقود خلال 5 دقائق، سلامة كبار السن", v: 5 },
];

const WEIGHTS = [
  { src: "الموظفون", what: "تقييمات المراحل", score: "4.9 من 5", pct: 98, w: 40 },
  { src: "الحجاج", what: "التقييم الشامل + التعليقات", score: "4.8 من 5", pct: 96, w: 25 },
  { src: "رئيس التكتل", what: "القيادة والالتزام", score: "5 من 5", pct: 100, w: 10 },
  { src: "مؤشرات آلية", what: "دقة التجمّعات، سرعة الرد، التقرير اليومي", score: "97%", pct: 97, w: 15 },
];

function Evaluations() {
  const admin = useAdmin()!;
  const r = resultOf(admin.profile);
  const qual = r.final ?? 84.4;
  const rows = [...WEIGHTS, { src: "التأهيل", what: "نتيجة الامتحان النهائية", score: String(qual), pct: qual, w: 10 }];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="md:p-8">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark"><Star className="size-6 text-gold-dark" /> تقييمات الموظفين — كلٌّ في نطاق عمله</h3>
          <ul className="mt-5 space-y-4">
            {STAFF_RATINGS.map((s, i) => (
              <li key={s.item}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-ink">{s.item}</span>
                  <span className="font-bold text-maroon">{s.v} من 5</span>
                </div>
                <div className="mt-1.5 flex gap-1" dir="ltr">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <motion.span key={n} className="h-2.5 flex-1 rounded-full bg-sand" initial={{ backgroundColor: "#F7F4EF" }} animate={{ backgroundColor: n <= s.v ? "#00594F" : "#F7F4EF" }} transition={{ delay: 0.15 + i * 0.12 + n * 0.06 }} />
                  ))}
                </div>
                <p className="mt-1 text-xs text-hint">{s.who} — {s.scope}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="md:p-8">
          <h3 className="font-display text-xl font-bold text-green-dark">تقييم الحجاج</h3>
          <div className="mt-4 flex items-center gap-5">
            <p className="font-display text-6xl font-bold text-gold-dark">4.8</p>
            <div>
              <p className="text-2xl text-gold-dark">★★★★★</p>
              <p className="text-sm text-hint">46 من 48 قيّموا</p>
            </div>
          </div>
          <ul className="mt-5 space-y-2">
            {[
              { s: 5, n: 38 },
              { s: 4, n: 7 },
              { s: 3, n: 1 },
              { s: 2, n: 0 },
              { s: 1, n: 0 },
            ].map((x, i) => (
              <li key={x.s} className="flex items-center gap-3 text-sm">
                <span className="w-8 text-hint">{x.s}★</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-sand">
                  <motion.span className="block h-full rounded-full bg-gold-dark" initial={{ width: 0 }} animate={{ width: `${(x.n / 46) * 100}%` }} transition={{ delay: 0.2 + i * 0.1, duration: 0.8 }} />
                </span>
                <span className="w-6 text-left font-bold tabular-nums">{x.n}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-5 space-y-2">
            {["«المجموعة 27 كانت كالعائلة»", "«موجود دائماً»", "«عرفنا كل شيء قبل أن نسافر»"].map((c) => (
              <li key={c} className="rounded-2xl bg-sand px-4 py-2 text-sm italic text-ink-soft">{c}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-xl font-bold text-green-dark">درجة الأداء في الموسم</h3>
            <p className="text-sm text-hint">بأوزان تحددها الإدارة في إعدادات الموسم</p>
          </div>
          <div className="flex items-center gap-3 rounded-3xl bg-green-dark px-6 py-4 text-white">
            <p className="font-display text-5xl font-bold text-gold"><AnimatedNumber value={93} /></p>
            <p className="text-sm leading-5 text-white/75">من 100<br />1448 — رئيس مجموعة</p>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-right text-sm">
            <thead>
              <tr className="border-b-2 border-gold-light text-hint">
                <th className="py-2 font-semibold">المصدر</th>
                <th className="py-2 font-semibold">ما يُقاس</th>
                <th className="py-2 font-semibold">درجتك</th>
                <th className="w-40 py-2 font-semibold">الوزن</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x, i) => (
                <tr key={x.src} className="border-b border-gold-light/60">
                  <td className="py-3 font-bold">{x.src}</td>
                  <td className="py-3 text-ink-soft">{x.what}</td>
                  <td className="py-3 font-bold text-green">{x.score}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-sand">
                        <motion.span className="block h-full bg-maroon" initial={{ width: 0 }} animate={{ width: `${x.w * 2.5}%` }} transition={{ delay: 0.2 + i * 0.1 }} />
                      </span>
                      <span className="w-9 font-bold">{x.w}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-5 rounded-2xl bg-gold/15 p-4 text-sm leading-7">
          <b>ملاحظة مشرف القطاع:</b> «من أفضل رؤساء المجموعات في القطاع. يُرشَّح لمعاون رئيس تكتل في 1449.»
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/administrator/dashboard" variant="outline">ملفي كإداري</ButtonLink>
        </div>
      </Card>
    </div>
  );
}
