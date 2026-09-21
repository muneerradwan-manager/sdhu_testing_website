"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  BadgeCheck,
  Ban,
  Building,
  CalendarDays,
  CircleCheck,
  Hotel,
  LoaderCircle,
  MapPin,
  Megaphone,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Badge, useToast } from "@/components/ui/widgets";
import { useClusters } from "@/lib/cms/content";
import { findEntity, HOTLINE, suggestEntities, UNAPPROVED, type EntityMatch } from "@/lib/data/clusters";
import { cn, formatNumber } from "@/lib/utils";

export function EntityCheck({ onOpenCluster }: { onOpenCluster: (slug: string) => void }) {
  const CLUSTERS = useClusters();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [checking, setChecking] = useState(false);
  const [match, setMatch] = useState<EntityMatch | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestions = suggestEntities(query, CLUSTERS);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function run(value: string) {
    const v = value.trim();
    if (!v) return;
    setQuery(v);
    setOpen(false);
    setHighlight(-1);
    setChecking(true);
    setMatch(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setMatch(findEntity(v, CLUSTERS));
      setChecking(false);
    }, 1100);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    run(highlight >= 0 && open ? suggestions[highlight] : query);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <form onSubmit={submit} className="relative" role="search">
        <label htmlFor="entity-q" className="sr-only">
          اسم التكتل أو الحملة
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute right-5 top-1/2 size-6 -translate-y-1/2 text-gold-dark" />
          <input
            id="entity-q"
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls="entity-list"
            aria-autocomplete="list"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlight(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setHighlight((h) => Math.min(suggestions.length - 1, h + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(-1, h - 1));
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="اكتب اسم التكتل أو الحملة… مثال: تكتل النور"
            className="h-16 w-full rounded-3xl border-2 border-gold/50 bg-white pl-32 pr-14 text-lg text-ink shadow-[0_20px_50px_-35px_rgba(0,89,79,.6)] outline-none transition placeholder:text-hint focus:border-green-light focus:ring-8 focus:ring-green-light/10"
          />
          <button
            type="submit"
            className="absolute left-2 top-2 flex h-12 items-center gap-2 rounded-2xl bg-green-dark px-5 font-bold text-white transition hover:bg-green active:scale-95"
          >
            {checking ? <LoaderCircle className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />}
            تحقّق
          </button>
        </div>

        <AnimatePresence>
          {open && suggestions.length > 0 && (
            <motion.ul
              id="entity-list"
              role="listbox"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-gold/40 bg-white p-1.5 shadow-2xl"
            >
              {suggestions.map((s, i) => {
                return (
                  <li key={s} role="option" aria-selected={i === highlight}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => run(s)}
                      onMouseEnter={() => setHighlight(i)}
                      className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition", i === highlight ? "bg-sand" : "")}
                    >
                      <Building className="size-4 text-gold-dark" />
                      <span className="flex-1 text-sm font-semibold text-ink">{s}</span>
                      <Search className="size-3.5 text-hint" />
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="text-ink-soft">جرّب:</span>
        {[CLUSTERS[0]?.name ?? "", UNAPPROVED[0].name, "مكتب السفر الذهبي"].filter(Boolean).map((n) => (
          <button key={n} onClick={() => run(n)} className="rounded-full border border-gold/50 bg-white px-3 py-1.5 text-ink transition hover:border-green-light hover:text-green">
            {n}
          </button>
        ))}
      </div>

      <div className="relative mt-10 min-h-72">
        <AnimatePresence mode="wait">
          {checking && <Checking key="checking" />}
          {!checking && match?.kind === "approved" && <Approved key={`a-${match.cluster.slug}`} match={match} onOpen={onOpenCluster} />}
          {!checking && match && match.kind !== "approved" && <NotApproved key={`n-${query}`} match={match} />}
          {!checking && !match && <Hint key="hint" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

const panel = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
};

function Hint() {
  return (
    <motion.div {...panel} className="grid gap-4 sm:grid-cols-3">
      {[
        { icon: ShieldCheck, t: "ابحث قبل أن تدفع", d: "لا تدفع أي مبلغ لجهة قبل التأكد أنها معتمدة للموسم الحالي." },
        { icon: Ban, t: "لا يوجد مقعد مضمون", d: "القبول يتم فقط وفق الأكبر سناً أو بالقرعة الرسمية." },
        { icon: Megaphone, t: "أبلغ عن المخالفين", d: `الخط الساخن ${HOTLINE} أو نموذج الإبلاغ في هذه الصفحة.` },
      ].map((x) => (
        <div key={x.t} className="rounded-3xl border border-gold/40 bg-white p-5">
          <x.icon className="size-7 text-green" />
          <p className="mt-3 font-bold text-ink">{x.t}</p>
          <p className="mt-1 text-sm leading-7 text-ink-soft">{x.d}</p>
        </div>
      ))}
    </motion.div>
  );
}

function Checking() {
  return (
    <motion.div {...panel} className="flex flex-col items-center py-10 text-center">
      <div className="relative h-24 w-64 overflow-hidden rounded-2xl border border-gold/50 bg-white p-4">
        <div className="space-y-2">
          <div className="skeleton h-3 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
        </div>
        <motion.div
          className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-green-light/30 to-transparent"
          initial={{ top: "-30%" }}
          animate={{ top: "100%" }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <p className="mt-5 font-semibold text-green-dark">نبحث في سجل الجهات المعتمدة لموسم 1448…</p>
    </motion.div>
  );
}

function Stamp({ text, tone }: { text: string; tone: "green" | "red" | "amber" }) {
  const colors = { green: "border-green text-green", red: "border-red-600 text-red-600", amber: "border-amber-600 text-amber-600" }[tone];
  return (
    <div className="pointer-events-none relative">
      <motion.div
        initial={{ scale: 3, opacity: 0, rotate: -35 }}
        animate={{ scale: 1, opacity: 1, rotate: -12 }}
        transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.15 }}
        className={cn("relative rounded-2xl border-[5px] border-double px-5 py-2 text-center font-display text-3xl font-bold tracking-wide md:text-4xl", colors)}
        style={{ maskImage: "radial-gradient(circle at 30% 40%, black 60%, rgba(0,0,0,.75) 100%)" }}
      >
        {text}
        <span className="block text-[11px] font-sans tracking-normal">موسم 1448هـ</span>
      </motion.div>
      <motion.span
        className={cn("absolute inset-0 rounded-2xl border-4", colors)}
        initial={{ scale: 1, opacity: 0.7 }}
        animate={{ scale: 1.8, opacity: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
      />
    </div>
  );
}

function Approved({ match, onOpen }: { match: Extract<EntityMatch, { kind: "approved" }>; onOpen: (slug: string) => void }) {
  const c = match.cluster;
  const facts = [
    { icon: CalendarDays, k: "يعمل منذ", v: `${c.since}هـ` },
    { icon: Users, k: "المجموعات والحجاج", v: `${c.groupsCount} مجموعة · نحو ${formatNumber(c.pilgrims)} حاج` },
    { icon: Hotel, k: "السكن في مكة", v: `${c.makkah.hotel} – ${c.makkah.area} · ${c.makkah.distance}` },
    { icon: MapPin, k: "السكن في المدينة", v: `${c.madinah.hotel} · ${c.madinah.distance}` },
    { icon: Building, k: "المكتب المشرف", v: c.office },
    { icon: BadgeCheck, k: "اعتماد البرنامج", v: `${c.approvedOn} — لجنة الإعلانات ومدير المكتب` },
  ];
  return (
    <motion.div {...panel} className="relative overflow-hidden rounded-[2rem] border border-green-light/30 bg-white shadow-[0_40px_80px_-50px_rgba(0,89,79,.7)]">
      <div className="relative flex flex-col gap-6 bg-gradient-to-br from-green-light/10 via-white to-white p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
        <div>
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-green">
            <CircleCheck className="size-4" /> جهة معتمدة من إدارة الحج والعمرة
          </span>
          <h3 className="mt-2 font-display text-3xl font-bold text-green-dark">{c.name}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="gold">مستوى الخدمة: {c.level}</Badge>
            <Badge>{c.specialty}</Badge>
          </div>
        </div>
        <Stamp text="معتمدة" tone="green" />
      </div>
      <dl className="grid gap-px bg-gold/30 sm:grid-cols-2">
        {facts.map((f, i) => (
          <motion.div
            key={f.k}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.06 }}
            className="flex gap-3 bg-white p-5"
          >
            <f.icon className="mt-0.5 size-5 shrink-0 text-gold-dark" />
            <div>
              <dt className="text-xs text-ink-soft">{f.k}</dt>
              <dd className="mt-0.5 font-semibold text-ink">{f.v}</dd>
            </div>
          </motion.div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 md:px-8">
        <p className="text-sm text-ink-soft">الانضمام في مرحلة التفويج بعد القبول: تتواصل مع المجموعة فيسجّلك منسقها ويوقّع معك العقد.</p>
        <button
          onClick={() => onOpen(c.slug)}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-green-dark px-5 font-bold text-white transition hover:bg-green active:scale-95"
        >
          <Hotel className="size-4" /> عرض البرنامج في دليل الخدمات
        </button>
      </div>
    </motion.div>
  );
}

function NotApproved({ match }: { match: Exclude<EntityMatch, { kind: "approved" }> }) {
  const push = useToast();
  const entity = match.kind === "unapproved" ? match.entity : null;
  const [source, setSource] = useState("واتساب");
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  function report(e: FormEvent) {
    e.preventDefault();
    const ticket = `BL-1448-${String(10000 + Math.floor(Math.random() * 89999))}`;
    setSent(ticket);
    push({
      title: "تم استلام بلاغك",
      body: `رقم التذكرة ${ticket}. يتابع فريق الرقابة البلاغ، ولن نشارك بياناتك مع الجهة المُبلَّغ عنها.`,
      tone: "success",
      icon: <ShieldCheck className="size-5 text-green" />,
    });
  }

  return (
    <motion.div {...panel}>
      <motion.div
        animate={{ x: [0, -12, 12, -8, 8, -4, 0] }}
        transition={{ duration: 0.55, delay: 0.35 }}
        className="relative overflow-hidden rounded-[2rem] border-2 border-red-200 bg-white shadow-[0_40px_80px_-40px_rgba(220,38,38,.45)]"
      >
        <motion.div
          className="pointer-events-none absolute inset-0 bg-red-500"
          initial={{ opacity: 0.25 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
        <div className="relative flex flex-col gap-6 bg-gradient-to-br from-red-50 to-white p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-red-700">
              <ShieldAlert className="size-4" /> {entity ? "جهة غير معتمدة — احذر" : "غير مدرجة في سجل الجهات المعتمدة"}
            </span>
            <h3 className="mt-2 font-display text-3xl font-bold text-ink">{match.kind === "unapproved" ? match.entity.name : match.query}</h3>
            {entity && <p className="mt-2 text-sm text-ink-soft">بلاغات سابقة من المواطنين: <span className="font-bold text-red-700">{entity.reports}</span></p>}
          </div>
          <Stamp text={entity ? "غير معتمدة" : "غير مدرجة"} tone={entity ? "red" : "amber"} />
        </div>

        <div className="relative grid gap-6 p-6 md:grid-cols-2 md:p-8">
          <div>
            <div className="rounded-2xl bg-red-50 p-5 ring-1 ring-red-100">
              <p className="flex items-center gap-2 font-bold text-red-800">
                <TriangleAlert className="size-5" /> تحذير مهم
              </p>
              <p className="mt-2 text-sm leading-7 text-red-900/80">
                لا توجد أي جهة تستطيع ضمان مقعد حج. القبول يتم فقط وفق الأكبر سناً أو بالقرعة الرسمية، ولا تُدفع تكاليف الحج إلا بعد القبول
                وبإيصال رقمي صادر عن المنصة.
              </p>
            </div>
            {entity && (
              <div className="mt-4">
                <p className="text-sm font-bold text-ink">ما تدّعيه هذه الجهة:</p>
                <ul className="mt-2 space-y-2">
                  {entity.claims.map((c, i) => (
                    <motion.li
                      key={c}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="flex items-start gap-2 text-sm text-ink-soft"
                    >
                      <Ban className="mt-0.5 size-4 shrink-0 text-red-600" /> {c}
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}
            <a
              href={`tel:${HOTLINE}`}
              className="mt-5 flex items-center gap-4 rounded-2xl bg-maroon-dark p-4 text-white transition hover:bg-maroon"
            >
              <span className="flex size-12 animate-pulse-ring items-center justify-center rounded-full bg-gold text-maroon-dark">
                <Phone className="size-5" />
              </span>
              <span>
                <span className="block text-xs text-white/70">الخط الساخن للإبلاغ — مجاني على مدار الساعة</span>
                <span className="block font-display text-3xl font-bold tracking-widest text-gold">{HOTLINE}</span>
              </span>
            </a>
          </div>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center rounded-2xl border border-green-light/30 bg-green-light/5 p-6 text-center"
              >
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                  <CircleCheck className="size-14 text-green-light" />
                </motion.span>
                <p className="mt-3 font-display text-xl font-bold text-green-dark">شكراً لك، وصل بلاغك</p>
                <p className="mt-1 text-sm text-ink-soft">رقم التذكرة</p>
                <p className="mt-1 font-mono text-xl font-bold text-ink" dir="ltr">
                  {sent}
                </p>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={report} className="rounded-2xl border border-gold/40 bg-sand/60 p-5">
                <p className="flex items-center gap-2 font-bold text-ink">
                  <Megaphone className="size-5 text-maroon" /> أبلغ عن هذه الجهة
                </p>
                <label className="mt-4 block text-sm font-semibold text-ink" htmlFor="rep-src">
                  أين وصلك الإعلان؟
                </label>
                <select
                  id="rep-src"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-gold/50 bg-white px-3 text-sm outline-none focus:border-green-light focus:ring-4 focus:ring-green-light/15"
                >
                  {["واتساب", "فيسبوك", "اتصال هاتفي", "مكتب أو لافتة", "شخص وسيط", "أخرى"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <label className="mt-3 block text-sm font-semibold text-ink" htmlFor="rep-details">
                  التفاصيل <span className="font-normal text-hint">(اختياري)</span>
                </label>
                <textarea
                  id="rep-details"
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="مثال: طلبوا 500 دولار مقابل مقعد مضمون"
                  className="mt-1.5 w-full resize-none rounded-xl border border-gold/50 bg-white p-3 text-sm outline-none focus:border-green-light focus:ring-4 focus:ring-green-light/15"
                />
                <button
                  type="submit"
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-maroon font-bold text-white transition hover:bg-maroon-dark active:scale-[.98]"
                >
                  <Megaphone className="size-4" /> إرسال البلاغ
                </button>
                <p className="mt-2 text-center text-[11px] text-hint">يمكنك الإبلاغ دون ذكر اسمك</p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
