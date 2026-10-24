"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  ExternalLink,
  FileClock,
  GripVertical,
  RotateCcw,
  Save,
  Send,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/widgets";
import { CmsIcon } from "@/components/cms/bits";
import { getCollectionDef } from "@/lib/cms/collections";
import { sectionDefaults } from "@/lib/cms/schema";
import { cms, hasDraft, pageState, readDraftValues, readOrder, STATUS_LABEL, useCms } from "@/lib/cms/store";
import type { PageDef, PageStatus, SectionDef } from "@/lib/cms/types";
import { cn, countOf } from "@/lib/utils";
import type { StaffUser } from "@/lib/staff";
import { can, Empty, fmtDateTime, logAs, Panel } from "../../_components/kit";
import { FieldInput, FieldRow, ListField } from "./fields";

/** من ينفّذ التعديل — يُحفظ مع كل نسخة في سجل المراجعات */
type StaffAuthor = { name: string; title?: string };

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * One page: its sections and their fields. Editing them needs `content.pages.PUT`; publishing, discarding, its
 * status and resetting it each their own permission (`content.pages.publish`, `.discard`, `.set-status`, `.reset`).
 */
export function PageEditor({ page, user, onBack, onOpenRevisions }: { page: PageDef; user: StaffUser; onBack: () => void; onOpenRevisions: () => void }) {
  const toast = useToast();
  const author: StaffAuthor = useMemo(() => ({ name: user.name, title: user.title }), [user]);
  const editable = can(user, "content.pages.PUT");
  const mayPublish = can(user, "content.pages.publish");
  const mayDiscard = can(user, "content.pages.discard");
  const mayStatus = can(user, "content.pages.set-status");
  const mayReset = can(user, "content.pages.reset");

  const state = useCms((s) => pageState(s, page.id));
  const dirty = useCms((s) => hasDraft(s, page.id));
  const order = useCms((s) => readOrder(s, page.id));
  const draft = state.draft ?? state.sections;

  const sections = useMemo(() => {
    const map = new Map(page.sections.map((s) => [s.id, s]));
    return order.map((id) => map.get(id)).filter((s): s is SectionDef => !!s);
  }, [order, page.sections]);

  const live = sections.filter((s) => !draft[s.id]?.archived);
  const [activeId, setActiveId] = useState("");
  // القسم المعروض يُشتق أثناء العرض: إن أُرشف المختار انتقل التحرير تلقائياً إلى أول قسم متاح
  const active = live.find((s) => s.id === activeId) ?? live[0] ?? sections[0];

  const publish = () => {
    if (!mayPublish) return;
    cms.publish(page.id, author);
    logAs(user, { action: "نشر محتوى صفحة", target: page.label, detail: "أصبحت التعديلات ظاهرة للزوار" });
    toast({ title: "نُشرت التعديلات", body: `${page.label} — يراها الزوار الآن`, tone: "success", icon: "✅" });
  };

  const save = () => {
    if (!editable) return;
    cms.saveDraft(page.id, author);
    logAs(user, { action: "حفظ مسودة صفحة", target: page.label });
    toast({ title: "حُفظت المسودة", body: "لم تُنشر بعد — فعّل المعاينة لتراها", tone: "info", icon: "💾" });
  };

  const discard = () => {
    if (!mayDiscard) return;
    cms.discardDraft(page.id, author);
    logAs(user, { action: "تجاهل مسودة", target: page.label });
    toast({ title: "أُلغيت التعديلات غير المنشورة", tone: "warning", icon: "↩️" });
  };

  const setStatus = (status: PageStatus) => {
    if (!mayStatus) return;
    cms.setPageStatus(page.id, status, author);
    logAs(user, { action: "تغيير حالة صفحة", target: page.label, after: STATUS_LABEL[status] });
    toast({ title: `الصفحة الآن ${STATUS_LABEL[status]}`, tone: status === "published" ? "success" : "warning", icon: status === "published" ? "🌍" : "📦" });
  };

  const resetPage = () => {
    if (!mayReset) return;
    cms.resetPage(page.id, author);
    logAs(user, { action: "إرجاع صفحة إلى المحتوى الأصلي", target: page.label });
    toast({ title: "أُعيدت الصفحة إلى محتواها الأصلي", tone: "warning", icon: "♻️" });
  };

  return (
    <div className="space-y-5">
      {/* ── شريط الإجراءات ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-2 rounded-3xl border border-gold/30 bg-gradient-to-br from-green-dark/95 to-[#00352f]/95 p-3 shadow-[0_24px_60px_-36px_rgba(0,0,0,.7)] md:p-4"
      >
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20">
          <ArrowRight className="size-4" /> كل الصفحات
        </button>

        <div className="min-w-0 px-1">
          <h2 className="truncate font-display text-lg font-bold text-white md:text-xl">{page.label}</h2>
          <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-white/60">
            <StatusChip status={state.status} />
            {state.updatedAt && <span>آخر تعديل {fmtDateTime(state.updatedAt)}</span>}
            {state.updatedBy && <span>· {state.updatedBy}</span>}
          </p>
        </div>

        <div className="mr-auto flex flex-wrap items-center gap-2">
          <Link
            href={page.path}
            target="_blank"
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white/85 transition hover:bg-white/20 hover:text-white"
          >
            <ExternalLink className="size-4" /> معاينة
          </Link>
          {can(user, "content.revisions.GET") && (
            <button onClick={onOpenRevisions} className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white/85 transition hover:bg-white/20 hover:text-white">
              <FileClock className="size-4" /> النسخ السابقة
            </button>
          )}
          {dirty && mayDiscard && (
            <button onClick={discard} className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white/85 transition hover:bg-maroon/40 hover:text-white">
              <Undo2 className="size-4" /> تجاهل
            </button>
          )}
          {editable && (
            <button onClick={save} className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20">
              <Save className="size-4" /> حفظ كمسودة
            </button>
          )}
          {mayPublish && (
            <button
              onClick={publish}
              disabled={!dirty && state.status === "published"}
              className="flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-ink shadow-lg transition hover:bg-gold-light disabled:opacity-40"
            >
              <Send className="size-4" /> نشر
            </button>
          )}
          {(mayStatus || mayReset) && <PageMenu page={page} status={state.status} onStatus={mayStatus ? setStatus : undefined} onReset={mayReset ? resetPage : undefined} />}
        </div>
      </motion.div>

      {dirty && (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm text-gold"
        >
          <FileClock className="size-4 shrink-0" />
          في هذه الصفحة تعديلات لم تُنشر بعد. الزوار ما زالوا يرون النسخة المنشورة حتى تضغط «نشر».
        </motion.p>
      )}
      {!editable && <p className="rounded-2xl bg-white/10 px-4 py-2.5 text-sm text-white/75 ring-1 ring-white/15">للاطلاع فقط: تحرير الصفحة يحتاج صلاحية «تعديل — الصفحات وأقسامها».</p>}

      {/* ── محتوى الصفحة الذي في مجموعات: ترويستها هنا وعناصرها هناك ── */}
      {page.related && <RelatedCollections items={page.related} />}

      {/* ── الأقسام + النموذج ── */}
      <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <SectionList
          page={page}
          sections={sections}
          draft={draft}
          activeId={active?.id ?? ""}
          onSelect={setActiveId}
          user={user}
          author={author}
          editable={editable}
        />
        {active ? (
          <SectionForm key={active.id} pageId={page.id} pageLabel={page.label} section={active} user={user} author={author} editable={editable} />
        ) : (
          <Panel>
            <Empty icon={<Archive />} title="كل أقسام هذه الصفحة مؤرشفة" text="استعد قسماً من القائمة لتعديله." />
          </Panel>
        )}
      </div>
    </div>
  );
}

/** What this page shows besides its header — its tracks, lessons, questions, articles — and where it is edited */
function RelatedCollections({ items }: { items: NonNullable<PageDef["related"]> }) {
  const defs = items.map((x) => getCollectionDef(x.collection)).filter((d): d is NonNullable<typeof d> => !!d);
  if (!defs.length) return null;
  return (
    <section className="rounded-3xl border border-gold/30 bg-white/[.05] p-4 ring-1 ring-white/10">
      <h3 className="font-display text-lg font-bold text-white">محتوى هذه الصفحة</h3>
      <p className="mt-1 text-sm text-white/65">ما أدناه ترويسة الصفحة فقط. محتواها نفسه في مجموعات، تفتح كل واحدة لتعدّل عناصرها:</p>
      <ul className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {defs.map((d) => (
          <li key={d.id}>
            <Link href={`/staff/content?collection=${d.id}`} className="block rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10 transition hover:ring-gold/50">
              <span className="block font-bold text-gold">{d.label}</span>
              <span className="mt-0.5 block text-xs leading-5 text-white/65">{d.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ───────────────────────── قائمة الأقسام ─────────────────────────

function SectionList({
  page,
  sections,
  draft,
  activeId,
  onSelect,
  user,
  author,
  editable,
}: {
  page: PageDef;
  sections: SectionDef[];
  draft: Record<string, { hidden?: boolean; archived?: boolean; values?: Record<string, unknown> }>;
  activeId: string;
  onSelect: (id: string) => void;
  user: StaffUser;
  author: StaffAuthor;
  editable: boolean;
}) {
  const toast = useToast();

  const move = (s: SectionDef, dir: -1 | 1) => {
    cms.moveSection(page.id, s.id, dir, author);
    logAs(user, { action: "ترتيب أقسام صفحة", target: `${page.label} — ${s.label}`, after: dir < 0 ? "لأعلى" : "لأسفل" });
  };

  const toggleHidden = (s: SectionDef) => {
    const next = !draft[s.id]?.hidden;
    cms.setSectionHidden(page.id, s.id, next, author);
    logAs(user, { action: next ? "إخفاء قسم" : "إظهار قسم", target: `${page.label} — ${s.label}` });
    toast({ title: next ? "أُخفي القسم" : "أُظهر القسم", body: "انشر الصفحة ليظهر الأثر للزوار", tone: "info", icon: next ? "🙈" : "👁️" });
  };

  const archive = (s: SectionDef) => {
    cms.setSectionArchived(page.id, s.id, true, author);
    logAs(user, { action: "أرشفة قسم", target: `${page.label} — ${s.label}` });
    toast({ title: "أُرشف القسم", body: "يمكنك استعادته من سلة الأرشيف", tone: "warning", icon: "📦" });
  };

  const restore = (s: SectionDef) => {
    cms.setSectionArchived(page.id, s.id, false, author);
    logAs(user, { action: "استعادة قسم من الأرشيف", target: `${page.label} — ${s.label}` });
    toast({ title: "استُعيد القسم", tone: "success", icon: "↩️" });
  };

  const archived = sections.filter((s) => draft[s.id]?.archived);
  const live = sections.filter((s) => !draft[s.id]?.archived);

  return (
    <Panel title="أقسام الصفحة" icon={<GripVertical />} className="self-start lg:sticky lg:top-24" bodyClass="space-y-1.5">
      {live.map((s, i) => {
        const active = s.id === activeId;
        const hidden = draft[s.id]?.hidden;
        const edits = countEdits(page.id, s.id, draft[s.id]?.values);
        return (
          <div key={s.id} className={cn("group rounded-2xl transition", active ? "bg-gold text-ink" : "bg-white/[.04] hover:bg-white/10")}>
            <div className="flex items-center gap-1 p-1.5">
              <button onClick={() => onSelect(s.id)} className="flex min-w-0 flex-1 items-center gap-2.5 px-1.5 py-1.5 text-right">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", active ? "bg-green-dark text-gold" : "bg-white/10 text-gold")}>
                  {s.icon ? <CmsIcon name={s.icon} className="size-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm font-bold", active ? "text-green-dark" : "text-white", hidden && "line-through opacity-60")}>
                    {s.label}
                  </span>
                  {edits > 0 && <span className={cn("text-[10px]", active ? "text-green-dark/70" : "text-gold")}>{countOf(edits, { zero: "", one: "حقل واحد معدَّل", two: "حقلان معدَّلان", few: "حقول معدَّلة", many: "حقلاً معدَّلاً" })}</span>}
                </span>
              </button>
              {editable && (
                <div className="flex shrink-0 items-center opacity-70 transition group-hover:opacity-100">
                  <button
                    onClick={() => move(s, -1)}
                    disabled={i === 0}
                    title="تحريك لأعلى"
                    className={cn("grid size-7 place-items-center rounded-lg transition disabled:opacity-25", active ? "hover:bg-green-dark/15" : "hover:bg-white/15")}
                  >
                    <ChevronDown className="size-3.5 rotate-180" />
                  </button>
                  <button
                    onClick={() => move(s, 1)}
                    disabled={i === live.length - 1}
                    title="تحريك لأسفل"
                    className={cn("grid size-7 place-items-center rounded-lg transition disabled:opacity-25", active ? "hover:bg-green-dark/15" : "hover:bg-white/15")}
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                  {!s.required && (
                    <>
                      <button
                        onClick={() => toggleHidden(s)}
                        title={hidden ? "إظهار للزوار" : "إخفاء عن الزوار"}
                        className={cn("grid size-7 place-items-center rounded-lg transition", active ? "hover:bg-green-dark/15" : "hover:bg-white/15")}
                      >
                        {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                      <button
                        onClick={() => archive(s)}
                        title="أرشفة القسم"
                        className={cn("grid size-7 place-items-center rounded-lg transition", active ? "hover:bg-green-dark/15" : "hover:bg-maroon/40")}
                      >
                        <Archive className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {archived.length > 0 && (
        <div className="!mt-4 border-t border-white/10 pt-3">
          <p className="mb-2 text-xs font-bold text-white/55">أقسام مؤرشفة في هذه الصفحة</p>
          {archived.map((s) => (
            <div key={s.id} className="mb-1.5 flex items-center gap-2 rounded-2xl bg-white/[.03] px-3 py-2">
              <Archive className="size-4 shrink-0 text-white/40" />
              <span className="min-w-0 flex-1 truncate text-sm text-white/60">{s.label}</span>
              {editable && (
                <button onClick={() => restore(s)} title="استعادة" className="grid size-7 place-items-center rounded-lg text-gold transition hover:bg-white/15">
                  <ArchiveRestore className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function countEdits(pageId: string, sectionId: string, values?: Record<string, unknown>) {
  if (!values) return 0;
  const defs = sectionDefaults(pageId, sectionId);
  return Object.entries(values).filter(([k, v]) => !same(v, defs[k])).length;
}

// ───────────────────────── نموذج القسم ─────────────────────────

function SectionForm({
  pageId,
  pageLabel,
  section,
  user,
  author,
  editable,
}: {
  pageId: string;
  pageLabel: string;
  section: SectionDef;
  user: StaffUser;
  author: StaffAuthor;
  editable: boolean;
}) {
  const toast = useToast();
  const saved = useCms((s) => readDraftValues(s, pageId, section.id));
  const defs = useMemo(() => sectionDefaults(pageId, section.id), [pageId, section.id]);

  /** تعديلات لم تُكتب في المخزن بعد — تُكتب بعد توقف الكتابة بلحظة، حتى لا يُحفظ كل حرف */
  const [pending, setPending] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!Object.keys(pending).length) return;
    const t = setTimeout(() => {
      for (const [k, v] of Object.entries(pending)) cms.setField(pageId, section.id, k, v, author);
      setPending({});
    }, 350);
    return () => clearTimeout(t);
  }, [pending, pageId, section.id, author]);

  const valueOf = (key: string) => (key in pending ? pending[key] : key in saved ? saved[key] : defs[key]);

  const resetSection = () => {
    setPending({});
    cms.resetSection(pageId, section.id, author);
    logAs(user, { action: "إرجاع قسم إلى نصه الأصلي", target: `${pageLabel} — ${section.label}` });
    toast({ title: "أُعيد القسم إلى محتواه الأصلي", tone: "warning", icon: "♻️" });
  };

  const edited = section.fields.filter((f) => !same(valueOf(f.key), f.def)).length;

  return (
    <Panel
      title={section.label}
      icon={<CmsIcon name={section.icon} />}
      action={
        edited > 0 &&
        editable && (
          <button onClick={resetSection} className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/20 hover:text-white">
            <RotateCcw className="size-3.5" /> إرجاع القسم للأصل
          </button>
        )
      }
    >
      {section.note && <p className="mb-4 rounded-2xl bg-white/5 px-4 py-2.5 text-sm leading-6 text-white/65">{section.note}</p>}

      {/* Without `content.pages.PUT` every field reads only: a disabled fieldset disables all it holds */}
      <fieldset disabled={!editable} className="grid min-w-0 gap-4 md:grid-cols-2">
        {section.fields.map((f) => {
          const v = valueOf(f.key);
          const isEdited = !same(v, f.def);
          const set = (next: unknown) => setPending((p) => ({ ...p, [f.key]: next }));
          const reset = () => {
            setPending((p) => {
              const n = { ...p };
              delete n[f.key];
              return n;
            });
            cms.resetField(pageId, section.id, f.key, author);
            logAs(user, { action: "إرجاع حقل إلى نصه الأصلي", target: `${pageLabel} — ${section.label}`, detail: f.label });
          };
          return (
            <FieldRow key={f.key} field={f} edited={isEdited} onReset={reset}>
              {f.kind === "list" ? <ListField field={f} value={v} onChange={set} by={user.name} /> : <FieldInput field={f} value={v} onChange={set} by={user.name} />}
            </FieldRow>
          );
        })}
      </fieldset>

      <p className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-white/50">
        <CheckCircle2 className="size-4 text-green-light" />
        يُحفظ كل تعديل في المسودة تلقائياً. اضغط «نشر» ليراه الزوار.
      </p>
    </Panel>
  );
}

// ───────────────────────── قطع صغيرة ─────────────────────────

export function StatusChip({ status }: { status: PageStatus }) {
  const map = {
    published: "bg-green-light/20 text-green-light",
    draft: "bg-gold/20 text-gold",
    archived: "bg-maroon/30 text-white/80",
  } as const;
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", map[status])}>{STATUS_LABEL[status]}</span>;
}

/** The page's other acts: its status (`onStatus`) and resetting it (`onReset`), each offered only when given */
function PageMenu({ page, status, onStatus, onReset }: { page: PageDef; status: PageStatus; onStatus?: (s: PageStatus) => void; onReset?: () => void }) {
  const [open, setOpen] = useState(false);
  const canArchive = !page.required;

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="grid size-10 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20" aria-expanded={open} title="خيارات أخرى">
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <button className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} aria-hidden tabIndex={-1} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              className="absolute left-0 top-12 z-20 w-60 overflow-hidden rounded-2xl border border-gold/30 bg-[#00352f] p-1.5 shadow-2xl"
            >
              {onStatus && status !== "published" && (
                <MenuItem icon={<Eye className="size-4" />} onClick={() => (onStatus("published"), setOpen(false))}>
                  نشر الصفحة للزوار
                </MenuItem>
              )}
              {onStatus && status !== "draft" && (
                <MenuItem icon={<EyeOff className="size-4" />} onClick={() => (onStatus("draft"), setOpen(false))}>
                  تحويلها إلى مسودة
                </MenuItem>
              )}
              {onStatus && canArchive && status !== "archived" && (
                <MenuItem icon={<Archive className="size-4" />} tone="maroon" onClick={() => (onStatus("archived"), setOpen(false))}>
                  أرشفة الصفحة
                </MenuItem>
              )}
              {onReset && (
                <MenuItem icon={<RotateCcw className="size-4" />} tone="maroon" onClick={() => (onReset(), setOpen(false))}>
                  إرجاع كل محتواها للأصل
                </MenuItem>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ icon, children, onClick, tone }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; tone?: "maroon" }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-right text-sm font-bold text-white/85 transition",
        tone === "maroon" ? "hover:bg-maroon/40 hover:text-white" : "hover:bg-white/10 hover:text-white",
      )}
    >
      <span className="text-gold">{icon}</span>
      {children}
    </button>
  );
}
