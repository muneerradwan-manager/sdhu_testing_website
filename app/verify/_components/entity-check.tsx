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
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Badge, useToast } from "@/components/ui/widgets";
import { useClusterDirectory } from "@/lib/cluster-profile";
import { findEntity, HOTLINE, suggestEntities, UNAPPROVED, type EntityMatch } from "@/lib/data/clusters";
import { levelEn } from "@/app/conditions/_lib/en";
import { useT } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";

/** What the known unapproved «campaigns» claim (lib/data/clusters), in English */
const CLAIMS_EN: Record<string, string> = {
  "تعد بمقعد حج مضمون دون قرعة": "Promises a guaranteed Hajj place without the lottery",
  "تطلب مبلغاً مقدماً نقداً أو بالحوالة": "Asks for money up front, in cash or by transfer",
  "تتواصل عبر واتساب فقط": "Communicates only through WhatsApp",
  "يعرض تأشيرات حج خارج الحصة الرسمية": "Offers Hajj visas outside the official quota",
  "يطلب صورة الهوية وكلمة مرور الحساب": "Asks for a copy of your ID and your account password",
};

/** Where the report says the advert came from: the value kept as it was, shown in the page's language */
const SOURCES: [string, string][] = [
  ["واتساب", "WhatsApp"],
  ["فيسبوك", "Facebook"],
  ["اتصال هاتفي", "Phone call"],
  ["مكتب أو لافتة", "Office or sign"],
  ["شخص وسيط", "A middleman"],
  ["أخرى", "Other"],
];

export function EntityCheck({ onOpenCluster }: { onOpenCluster: (slug: string) => void }) {
  const t = useT();
  // The approved clusters only, as the administrators' platform holds them
  const CLUSTERS = useClusterDirectory();
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
    <div className="w-full">
      <form onSubmit={submit} className="relative" role="search">
        <label htmlFor="entity-q" className="sr-only">
          {t("اسم التكتل أو الحملة", "Name of the cluster or campaign")}
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute start-5 top-1/2 size-6 -translate-y-1/2 text-gold-dark" />
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
            placeholder={t("اكتب اسم التكتل أو الحملة… مثال: تكتل النور", "Type the name of the cluster or campaign… e.g. تكتل النور")}
            className="h-16 w-full rounded-3xl border-2 border-gold/50 bg-white ps-14 pe-32 text-lg text-ink shadow-[0_20px_50px_-35px_rgba(0,89,79,.6)] outline-none transition placeholder:text-hint focus:border-green-light focus:ring-8 focus:ring-green-light/10"
          />
          <button
            type="submit"
            className="absolute end-2 top-2 flex h-12 items-center gap-2 rounded-2xl bg-green-dark px-5 font-bold text-white transition hover:bg-green active:scale-95"
          >
            {checking ? <LoaderCircle className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />}
            {t("تحقّق", "Check")}
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
        <span className="text-ink-soft">{t("جرّب:", "Try:")}</span>
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
  const t = useT();
  return (
    <motion.div {...panel} className="grid gap-4 sm:grid-cols-3">
      {[
        {
          icon: ShieldCheck,
          t: t("ابحث قبل أن تدفع", "Check before you pay"),
          d: t("لا تدفع أي مبلغ لجهة قبل التأكد أنها معتمدة للموسم الحالي.", "Do not pay any organisation anything until you are sure it is approved for the current season."),
        },
        { icon: Ban, t: t("لا يوجد مقعد مضمون", "There is no guaranteed place"), d: t("القبول يتم فقط وفق الأكبر سناً أو بالقرعة الرسمية.", "Acceptance is only by age, oldest first, or by the official lottery.") },
        { icon: Megaphone, t: t("أبلغ عن المخالفين", "Report offenders"), d: t(`الخط الساخن ${HOTLINE} أو نموذج الإبلاغ في هذه الصفحة.`, `The ${HOTLINE} hotline, or the report form on this page.`) },
      ].map((x, i) => (
        <div key={i} className="rounded-3xl border border-gold/40 bg-white p-5">
          <x.icon className="size-7 text-green" />
          <p className="mt-3 font-bold text-ink">{x.t}</p>
          <p className="mt-1 text-sm leading-7 text-ink-soft">{x.d}</p>
        </div>
      ))}
    </motion.div>
  );
}

function Checking() {
  const t = useT();
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
      <p className="mt-5 font-semibold text-green-dark">{t("نبحث في سجل الجهات المعتمدة لموسم 1448…", "Searching the register of organisations approved for the 1448 season…")}</p>
    </motion.div>
  );
}

function Stamp({ text, tone }: { text: string; tone: "green" | "red" | "amber" }) {
  const t = useT();
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
        <span className="block text-[11px] font-sans tracking-normal">{t("موسم 1448هـ", "1448 AH season")}</span>
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
  const t = useT();
  const c = match.cluster;
  const facts = [
    { icon: CalendarDays, k: t("يعمل منذ", "Working since"), v: t(`${c.since}هـ`, `${c.since} AH`) },
    ...(c.team ? [{ icon: UserRound, k: t("رئيس التكتل", "Head of the cluster"), v: <bdi>{c.team.head.name}</bdi> }] : []),
    { icon: Users, k: t("المجموعات والحجاج", "Groups and pilgrims"), v: t(`${c.groupsCount} مجموعة · نحو ${formatNumber(c.pilgrims)} حاج`, `${c.groupsCount} groups · about ${formatNumber(c.pilgrims)} pilgrims`) },
    { icon: Hotel, k: t("السكن في مكة", "Housing in Makkah"), v: (
        <>
          <bdi>{c.makkah.hotel}</bdi> – {c.makkah.area} · {c.makkah.distance}
        </>
      ),
    },
    { icon: MapPin, k: t("السكن في المدينة", "Housing in Madinah"), v: (
        <>
          <bdi>{c.madinah.hotel}</bdi> · {c.madinah.distance}
        </>
      ),
    },
    { icon: Building, k: t("المكتب المشرف", "Supervising office"), v: c.office },
    { icon: BadgeCheck, k: t("اعتماد البرنامج", "Programme approved"), v: t(`${c.approvedOn} — لجنة الإعلانات ومدير المكتب`, `${c.approvedOn} — by the Announcements Committee and the office director`) },
  ];
  return (
    <motion.div {...panel} className="relative overflow-hidden rounded-[2rem] border border-green-light/30 bg-white shadow-[0_40px_80px_-50px_rgba(0,89,79,.7)]">
      <div className="relative flex flex-col gap-6 bg-gradient-to-br from-green-light/10 via-white to-white p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
        <div>
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-green">
            <CircleCheck className="size-4" /> {t("جهة معتمدة من إدارة الحج والعمرة", "Approved by the Hajj and Umrah Administration")}
          </span>
          <h3 className="mt-2 font-display text-3xl font-bold text-green-dark">{c.name}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="gold">{t(`مستوى الخدمة: ${c.level}`, `Service level: ${levelEn(c.level)}`)}</Badge>
            <Badge>{c.specialty}</Badge>
          </div>
        </div>
        <Stamp text={t("معتمدة", "Approved")} tone="green" />
      </div>
      <dl className="grid gap-px bg-gold/30 sm:grid-cols-2">
        {facts.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.06 }}
            className="flex gap-3 bg-white p-5 sm:odd:last:col-span-2"
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
        <p className="text-sm text-ink-soft">
          {t(
            "الالتحاق بعد القبول بعقد مع المجموعة يرفعه رئيسها أو منسقها ويعتمده المكتب — لا من المنصة نفسها.",
            "After acceptance, you join through a contract with the group, submitted by its leader or coordinator and approved by the office — not through the platform itself.",
          )}
        </p>
        <button
          onClick={() => onOpen(c.slug)}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-green-dark px-5 font-bold text-white transition hover:bg-green active:scale-95"
        >
          <Hotel className="size-4" /> {t("عرض التكتل في «التكتلات والمجموعات»", "View the cluster in Clusters and groups")}
        </button>
      </div>
    </motion.div>
  );
}

function NotApproved({ match }: { match: Exclude<EntityMatch, { kind: "approved" }> }) {
  const t = useT();
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
      title: t("تم استلام بلاغك", "Your report has been received"),
      body: t(
        `رقم التذكرة ${ticket}. يتابع فريق الرقابة البلاغ، ولن نشارك بياناتك مع الجهة المُبلَّغ عنها.`,
        `Ticket number ${ticket}. The monitoring team will follow up, and we will not share your details with the organisation you reported.`,
      ),
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
              <ShieldAlert className="size-4" /> {entity ? t("جهة غير معتمدة — احذر", "Not approved — beware") : t("غير مدرجة في سجل الجهات المعتمدة", "Not in the register of approved organisations")}
            </span>
            <h3 className="mt-2 font-display text-3xl font-bold text-ink">{match.kind === "unapproved" ? match.entity.name : match.query}</h3>
            {entity && <p className="mt-2 text-sm text-ink-soft">{t("بلاغات سابقة من المواطنين:", "Earlier reports from citizens:")} <span className="font-bold text-red-700">{entity.reports}</span></p>}
          </div>
          <Stamp text={entity ? t("غير معتمدة", "Not approved") : t("غير مدرجة", "Not listed")} tone={entity ? "red" : "amber"} />
        </div>

        <div className="relative grid gap-6 p-6 md:grid-cols-2 md:p-8">
          <div>
            <div className="rounded-2xl bg-red-50 p-5 ring-1 ring-red-100">
              <p className="flex items-center gap-2 font-bold text-red-800">
                <TriangleAlert className="size-5" /> {t("تحذير مهم", "Important warning")}
              </p>
              <p className="mt-2 text-sm leading-7 text-red-900/80">
                {t(
                  "لا توجد أي جهة تستطيع ضمان مقعد حج. القبول يتم فقط وفق الأكبر سناً أو بالقرعة الرسمية، ولا تُدفع تكاليف الحج إلا بعد القبول وبإيصال رقمي صادر عن المنصة.",
                  "No organisation can guarantee a Hajj place. Acceptance is only by age, oldest first, or by the official lottery, and Hajj costs are paid only after acceptance, against a digital receipt issued by the platform.",
                )}
              </p>
            </div>
            {entity && (
              <div className="mt-4">
                <p className="text-sm font-bold text-ink">{t("ما تدّعيه هذه الجهة:", "What this organisation claims:")}</p>
                <ul className="mt-2 space-y-2">
                  {entity.claims.map((c, i) => (
                    <motion.li
                      key={c}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="flex items-start gap-2 text-sm text-ink-soft"
                    >
                      <Ban className="mt-0.5 size-4 shrink-0 text-red-600" /> {t(c, CLAIMS_EN[c] ?? c)}
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
                <span className="block text-xs text-white/70">{t("الخط الساخن للإبلاغ — مجاني على مدار الساعة", "Reporting hotline — free, 24 hours a day")}</span>
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
                <p className="mt-3 font-display text-xl font-bold text-green-dark">{t("شكراً لك، وصل بلاغك", "Thank you, your report has arrived")}</p>
                <p className="mt-1 text-sm text-ink-soft">{t("رقم التذكرة", "Ticket number")}</p>
                <p className="mt-1 font-mono text-xl font-bold text-ink" dir="ltr">
                  {sent}
                </p>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={report} className="rounded-2xl border border-gold/40 bg-sand/60 p-5">
                <p className="flex items-center gap-2 font-bold text-ink">
                  <Megaphone className="size-5 text-maroon" /> {t("أبلغ عن هذه الجهة", "Report this organisation")}
                </p>
                <label className="mt-4 block text-sm font-semibold text-ink" htmlFor="rep-src">
                  {t("أين وصلك الإعلان؟", "Where did you see the advert?")}
                </label>
                <select
                  id="rep-src"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-gold/50 bg-white px-3 text-sm outline-none focus:border-green-light focus:ring-4 focus:ring-green-light/15"
                >
                  {SOURCES.map(([ar, en]) => (
                    <option key={ar} value={ar}>
                      {t(ar, en)}
                    </option>
                  ))}
                </select>
                <label className="mt-3 block text-sm font-semibold text-ink" htmlFor="rep-details">
                  {t("التفاصيل", "Details")} <span className="font-normal text-hint">{t("(اختياري)", "(optional)")}</span>
                </label>
                <textarea
                  id="rep-details"
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={t("مثال: طلبوا 500 دولار مقابل مقعد مضمون", "e.g. they asked for 500 dollars for a guaranteed place")}
                  className="mt-1.5 w-full resize-none rounded-xl border border-gold/50 bg-white p-3 text-sm outline-none focus:border-green-light focus:ring-4 focus:ring-green-light/15"
                />
                <button
                  type="submit"
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-maroon font-bold text-white transition hover:bg-maroon-dark active:scale-[.98]"
                >
                  <Megaphone className="size-4" /> {t("إرسال البلاغ", "Send the report")}
                </button>
                <p className="mt-2 text-center text-[11px] text-hint">{t("يمكنك الإبلاغ دون ذكر اسمك", "You can report without giving your name")}</p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
