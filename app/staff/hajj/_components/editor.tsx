"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Eye, Lock, Rocket, Undo2 } from "lucide-react";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { useDraft, useNowKey, useRegSeasons, useSeasonVersions } from "@/lib/registration/client";
import { ACTIVE_SEASON } from "@/lib/registration/defaults";
import { run } from "@/lib/registration/run";
import { discardDraft, editDraft, publishDraft, type DraftMeta } from "@/lib/registration/service";
import type { RegConfig } from "@/lib/registration/types";
import { diffConfigs, validateConfig, type Issue } from "@/lib/registration/validate";
import { useSeason } from "@/lib/season-live";
import { cn } from "@/lib/utils";
import { can, smallInputClass, textareaClass, useStaffUser } from "../../_components/kit";
import { selectClass } from "../../exam/_components/ui";

/**
 * The season being worked on, shared by every page of the file (it lives in the manage layout, so moving
 * between pages keeps it). The active season unless another is picked in «الإصدارات والمواسم».
 */
const SeasonCtx = createContext<{ season: number; setSeason: (y: number) => void }>({ season: ACTIVE_SEASON, setSeason: () => {} });

export function RegSeasonProvider({ children }: { children: ReactNode }) {
  const [season, setSeason] = useState<number>(ACTIVE_SEASON);
  return <SeasonCtx.Provider value={{ season, setSeason }}>{children}</SeasonCtx.Provider>;
}

/**
 * What every page edits: the season's draft — every change is kept there until «نشر التغييرات» — with its
 * checks and what it changes from what pilgrims see now. `edit` makes one change through the service
 * (which checks the permission and writes the audit trail). `may(resource, verb)`: whether this employee holds
 * `registration.‹resource›.‹verb›` and the season is not archived — the screens show only what he may do.
 */
export function useRegEditor() {
  const { season, setSeason } = useContext(SeasonCtx);
  const toast = useToast();
  const seasons = useRegSeasons();
  const info = seasons.find((s) => s.year === season) ?? seasons[0];
  const draft = useDraft(season);
  const versions = useSeasonVersions(season);
  const { fees } = useSeason();
  const config = draft.config;
  const issues = useMemo(() => validateConfig(config, { previous: versions.list, hajjCost: fees.hajjCost }), [config, versions.list, fees.hajjCost]);
  const live = versions.list.length ? versions.live : null;
  const changes = useMemo(() => (live ? diffConfigs(live.config, config) : []), [live, config]);
  const readOnly = info?.status === "archived";
  const user = useStaffUser();
  const may = (resource: string, verb: string) => !readOnly && can(user, `registration.${resource}.${verb}`);

  const edit = (change: (c: RegConfig) => RegConfig, meta: DraftMeta) => {
    const r = run((s) => editDraft(s, season, change, meta, Date.now()));
    if (!r.ok) toast({ title: "لم يُحفظ", body: r.errors[0].message, icon: "⛔", tone: "gold" });
    return r.ok;
  };

  return { season, setSeason, seasons, info, draft, config, versions, live, issues, errors: issues.filter((i) => i.level === "error"), changes, readOnly, may, edit, hajjCost: fees.hajjCost };
}

export type RegEditor = ReturnType<typeof useRegEditor>;

/** Where an issue can be fixed */
function issueHref(i: Issue, config: RegConfig) {
  if (i.ref && config.stages.some((s) => s.id === i.ref)) return `/staff/hajj/manage/edit?id=${i.ref}`;
  if (i.ref && config.postSteps.some((s) => s.id === i.ref)) return `/staff/hajj/manage/steps/edit?id=${i.ref}`;
  if (i.ref && config.eligibility.some((s) => s.id === i.ref)) return `/staff/hajj/manage/rules/edit?id=${i.ref}`;
  if (i.where.startsWith("الدفعات") || i.where.startsWith("مسارات")) return "/staff/hajj/manage/payments";
  if (i.where.startsWith("القاعدتان")) return "/staff/hajj/manage/rules";
  return "/staff/hajj/manage";
}

/**
 * On top of every page, as a site's «نشر» button: whether what is here is what pilgrims see, and if not,
 * preview it and publish it in one click — or drop the changes. Nothing else about versions to learn.
 */
export function PublishBar() {
  const ed = useRegEditor();
  const toast = useToast();
  const now = useNowKey();
  const [publishing, setPublishing] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [at, setAt] = useState({ day: now.slice(0, 10), time: "08:00" });
  const [note, setNote] = useState("");
  const n = ed.changes.length;
  const pending = n > 0 || !ed.live;

  const publish = () => {
    const auto = ed.changes.slice(0, 3).map((c) => c.text).join("؛ ") || "الإصدار الأول";
    const r = run((s) => publishDraft(s, ed.season, { note: note.trim() || auto, effectiveFrom: when === "later" ? `${at.day}T${at.time}` : undefined }, Date.now()));
    if (!r.ok) return toast({ title: "لم يُنشر", body: r.errors[0].message, icon: "⛔", tone: "gold" });
    setPublishing(false);
    setNote("");
    toast({
      title: r.value.effectiveFrom > now ? "جُدول النشر" : "نُشرت التغييرات",
      body: r.value.effectiveFrom > now ? `تظهر للحجاج من ${r.value.effectiveFrom.replace("T", " الساعة ")}.` : "يراها الحجاج الآن في كل طلب جديد. من بدأ طلبه قبل الآن يكمله كما بدأه.",
      icon: "🚀",
      tone: "success",
    });
  };

  if (ed.readOnly) {
    return (
      <Bar tone="muted">
        <Lock className="size-5 shrink-0" /> {ed.info?.label}: موسم مؤرشف، للاطلاع فقط.
      </Bar>
    );
  }

  return (
    <>
      {!pending ? (
        <Bar tone="green">
          <CheckCircle2 className="size-5 shrink-0 text-green-light" />
          <span className="flex-1">كل شيء منشور: ما تراه هنا هو ما يراه الحجاج الآن.</span>
          {ed.versions.scheduled.length > 0 && <span className="text-xs text-gold">وتغييرات مجدولة تظهر لاحقاً</span>}
        </Bar>
      ) : ed.errors.length ? (
        <Bar tone="maroon">
          <AlertTriangle className="size-5 shrink-0" />
          <span className="flex-1">
            لديك {n} تعديلات لم تُنشر، وفيها {ed.errors.length} {ed.errors.length === 1 ? "ملاحظة يجب" : "ملاحظات يجب"} إصلاحها قبل النشر.
          </span>
          <Button size="sm" variant="gold" onClick={() => setFixing(true)}>
            ما الذي يجب إصلاحه؟
          </Button>
          <PreviewLink />
          {ed.may("draft", "discard") && (
            <Button size="sm" variant="glass" onClick={() => setDiscarding(true)}>
              <Undo2 className="size-4" /> تجاهل التعديلات
            </Button>
          )}
        </Bar>
      ) : (
        <Bar tone="gold">
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inset-0 animate-ping rounded-full bg-gold" />
            <span className="relative size-2.5 rounded-full bg-gold" />
          </span>
          <span className="flex-1">
            {ed.live ? `لديك ${n} ${n === 1 ? "تعديل لم يُنشر" : "تعديلات لم تُنشر"} بعد — لا يراها الحجاج حتى تنشرها.` : "إعدادات هذا الموسم لم تُنشر بعد."}
          </span>
          <PreviewLink />
          {ed.may("draft", "publish") && (
            <Button size="sm" variant="gold" onClick={() => setPublishing(true)}>
              <Rocket className="size-4" /> نشر التغييرات
            </Button>
          )}
          {ed.live && ed.may("draft", "discard") && (
            <Button size="sm" variant="glass" onClick={() => setDiscarding(true)}>
              <Undo2 className="size-4" /> تجاهلها
            </Button>
          )}
        </Bar>
      )}

      <Modal open={publishing} onClose={() => setPublishing(false)} className="max-w-xl border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        <p className="font-display text-2xl font-bold">نشر التغييرات</p>
        {n > 0 && (
          <>
            <p className="mt-3 text-sm font-bold text-gold">ما الذي سيتغيّر عند الحجاج:</p>
            <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto text-sm text-white/85">
              {ed.changes.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-gold">•</span> {c.text}
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-4 text-sm font-bold text-gold">متى تظهر؟</p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={when === "now"} onChange={() => setWhen("now")} className="accent-[#D9C89E]" /> الآن
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={when === "later"} onChange={() => setWhen("later")} className="accent-[#D9C89E]" /> في يوم وساعة أحددهما
          </label>
        </div>
        {when === "later" && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input type="date" value={at.day} min={now.slice(0, 10)} onChange={(e) => setAt({ ...at, day: e.target.value })} className={smallInputClass} dir="ltr" aria-label="اليوم" />
            <input type="time" value={at.time} onChange={(e) => setAt({ ...at, time: e.target.value })} className={smallInputClass} dir="ltr" aria-label="الساعة" />
          </div>
        )}
        <label className="mt-4 block text-sm font-bold text-gold">
          ملاحظة للسجل (اختياري)
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={cn(textareaClass, "mt-1 font-normal")} placeholder="مثال: إضافة سؤال السكن" />
        </label>
        <p className="mt-3 rounded-xl bg-white/[.06] p-3 text-xs leading-6 text-white/70">من بدأ طلبه قبل النشر يكمله كما بدأه، والطلبات المقدَّمة لا تتغير. ويمكنك الرجوع إلى ما كان من «الإصدارات والمواسم».</p>
        <div className="mt-4 flex gap-2">
          <Button variant="gold" onClick={publish}>
            <Rocket className="size-4" /> {when === "later" ? "جدولة النشر" : "نشر الآن"}
          </Button>
          <Button variant="glass" onClick={() => setPublishing(false)}>
            إلغاء
          </Button>
        </div>
      </Modal>

      <Modal open={fixing} onClose={() => setFixing(false)} className="max-w-xl border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        <p className="font-display text-2xl font-bold">ما الذي يجب إصلاحه قبل النشر</p>
        <ul className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
          {ed.errors.map((i, k) => (
            <li key={k} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <p className="text-sm font-bold text-white">{i.where}</p>
              <p className="text-sm text-white/75">{i.message}</p>
              <Link href={issueHref(i, ed.config)} onClick={() => setFixing(false)} className="mt-1 inline-block text-sm font-bold text-gold underline">
                أصلحها
              </Link>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal open={discarding} onClose={() => setDiscarding(false)} className="max-w-md border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        <p className="font-display text-xl font-bold">تجاهل التعديلات؟</p>
        <p className="mt-2 text-sm leading-7 text-white/75">تُحذف كل التعديلات التي لم تُنشر ({n})، ويعود كل شيء كما يراه الحجاج الآن.</p>
        <div className="mt-4 flex gap-2">
          <Button
            variant="maroon"
            onClick={() => {
              run((s) => discardDraft(s, ed.season, Date.now()));
              setDiscarding(false);
            }}
          >
            تجاهلها
          </Button>
          <Button variant="glass" onClick={() => setDiscarding(false)}>
            رجوع
          </Button>
        </div>
      </Modal>
    </>
  );
}

function PreviewLink() {
  const user = useStaffUser();
  if (!can(user, "registration.preview.GET")) return null;
  return (
    <Link href="/staff/hajj/manage/preview" className="inline-flex h-9 items-center gap-1.5 rounded-2xl border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20">
      <Eye className="size-4" /> معاينة
    </Link>
  );
}

function Bar({ tone, children }: { tone: "green" | "gold" | "maroon" | "muted"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "sticky top-24 z-20 mb-5 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-lg ring-1 backdrop-blur",
        tone === "green" ? "bg-[#00352f]/90 ring-green-light/30" : tone === "gold" ? "bg-[#4a3f1c]/90 ring-gold/50" : tone === "maroon" ? "bg-maroon/85 ring-maroon-light" : "bg-black/40 ring-white/10",
      )}
    >
      {children}
    </div>
  );
}

// ───────────────────────── The pieces every page is made of: the portal's shared kit ─────────────────────────

export { Box, ListTable, RowActions, RowLink, Tag as Kind, Title } from "../../_components/wp";

/** The issues the checks found on one item, in a line under it */
export function IssuesFor({ refs, where }: { refs?: string[]; where?: string }) {
  const { issues } = useRegEditor();
  const mine = issues.filter((i) => (refs && i.ref && refs.includes(i.ref)) || (where && i.where.startsWith(where)));
  if (!mine.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {mine.map((i, n) => (
        <li key={n} className={cn("flex items-start gap-1.5 text-xs leading-5", i.level === "error" ? "text-[#ffb4c8]" : "text-gold")}>
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {i.message}
        </li>
      ))}
    </ul>
  );
}

/** A short generated id for a new page, question, option or rule */
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 5)}`;

/** Moves an item up (-1) or down (+1) in a list */
export function move<T>(list: T[], index: number, by: -1 | 1): T[] {
  const to = index + by;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** The season picker, where seasons are managed */
export function SeasonPicker() {
  const ed = useRegEditor();
  return (
    <select value={ed.season} onChange={(e) => ed.setSeason(Number(e.target.value))} className={cn(selectClass, "h-10 w-56")} aria-label="الموسم">
      {ed.seasons.map((s) => (
        <option key={s.year} value={s.year}>
          {s.label} — {s.status === "active" ? "الجاري" : s.status === "preparing" ? "قيد الإعداد" : "مؤرشف"}
        </option>
      ))}
    </select>
  );
}
