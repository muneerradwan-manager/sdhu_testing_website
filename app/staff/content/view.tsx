"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Archive,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileClock,
  FileText,
  ImagePlus,
  LayoutList,
  PencilLine,
  Search,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/widgets";
import { CmsIcon } from "@/components/cms/bits";
import { CMS_COLLECTIONS, getCollectionDef } from "@/lib/cms/collections";
import { CMS_GROUPS, CMS_PAGES, getPageDef } from "@/lib/cms/schema";
import {
  archivedItems,
  archivedSections,
  cms,
  cmsMemo,
  editedFieldCount,
  editedItemCount,
  hasCollectionDraft,
  hasDraft,
  pageState,
  readCollection,
  useCms,
  useCmsHydrated,
} from "@/lib/cms/store";
import type { CmsState, CollectionDef, PageDef } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { Empty, Gate, Kpi, PageHeader, Panel, Tabs, fmtDateTime, useStaffUser } from "../_components/kit";
import { ArchiveView } from "./_components/archive";
import { CollectionEditor } from "./_components/collection";
import { PageEditor, StatusChip } from "./_components/editor";
import { MediaLibrary } from "./_components/media";
import { RevisionsView } from "./_components/revisions";

type Tab = "pages" | "media" | "revisions" | "archive";

export function ContentView() {
  return (
    <Gate perms={["content.manage"]}>
      <Inner />
    </Gate>
  );
}

function Inner() {
  const user = useStaffUser();
  const hydrated = useCmsHydrated();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("pages");
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusRevision, setFocusRevision] = useState<string | undefined>();

  const preview = useCms((s) => s.preview);
  const stats = useCms(summarise);
  const page = openId ? getPageDef(openId) : null;
  const collection = openId ? getCollectionDef(openId) : null;

  if (!user) return null;

  const goto = (id: string) => {
    setOpenId(id);
    setTab("pages");
  };

  const openRevisions = (id: string) => {
    setFocusRevision(id);
    setOpenId(null);
    setTab("revisions");
  };

  return (
    <>
      <PageHeader
        eyebrow="إدارة محتوى الموقع"
        title="محتوى المنصة"
        icon={<PencilLine />}
        description="عدّل كل ما يظهر للزوار: النصوص والصور والروابط والقوائم، صفحة بصفحة وقسماً بقسم. احفظ مسودة، عاينها، ثم انشرها — ولك أن تخفي أي قسم أو تؤرشفه وتستعيده لاحقاً."
        actions={
          <>
            <button
              onClick={() => {
                cms.setPreview(!preview);
                toast({
                  title: preview ? "أُوقف وضع المعاينة" : "شُغّل وضع المعاينة",
                  body: preview ? "تصفّح الموقع كما يراه الزوار" : "الموقع يعرض لك الآن المسودات غير المنشورة",
                  tone: preview ? "info" : "gold",
                  icon: preview ? "👁️" : "🔍",
                });
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition",
                preview ? "bg-gold text-ink hover:bg-gold-light" : "bg-white/10 text-white hover:bg-white/20",
              )}
            >
              {preview ? <Eye className="size-4" /> : <EyeOff className="size-4" />} وضع المعاينة
            </button>
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-white/20"
            >
              <ExternalLink className="size-4" /> فتح الموقع
            </Link>
            <BackupButtons />
          </>
        }
      />

      {!hydrated ? (
        <Panel>
          <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
        </Panel>
      ) : page ? (
        <PageEditor page={page} user={user} onBack={() => setOpenId(null)} onOpenRevisions={() => openRevisions(page.id)} />
      ) : collection ? (
        <CollectionEditor collection={collection} user={user} onBack={() => setOpenId(null)} onOpenRevisions={() => openRevisions(collection.id)} />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="صفحات منشورة" value={stats.published} icon={<FileText />} tone="green" hint="يراها الزوار الآن" />
            <Kpi label="مسودات غير منشورة" value={stats.drafts} icon={<FileClock />} tone="gold" hint="صفحات ومجموعات بانتظار النشر" delay={0.05} />
            <Kpi label="عناصر معدّلة" value={stats.edited} icon={<PencilLine />} tone="teal" hint="حقول وأقسام ومقالات" delay={0.1} />
            <Kpi label="في الأرشيف" value={stats.archived} icon={<Archive />} tone="maroon" hint="صفحات وأقسام وعناصر قابلة للاستعادة" delay={0.15} />
          </div>

          <Tabs
            id="content"
            value={tab}
            onChange={(v) => setTab(v)}
            tabs={[
              { value: "pages", label: "الصفحات والأقسام", count: CMS_PAGES.length + CMS_COLLECTIONS.length },
              { value: "media", label: "مكتبة الوسائط", count: stats.media },
              { value: "revisions", label: "النسخ السابقة", count: stats.revisions },
              { value: "archive", label: "الأرشيف", count: stats.archived },
            ]}
          />

          {tab === "pages" && <PagesList onOpen={goto} />}
          {tab === "media" && (
            <Panel title="مكتبة الوسائط" icon={<ImagePlus />}>
              <MediaLibrary by={user.name} />
            </Panel>
          )}
          {tab === "revisions" && <RevisionsView user={user} focusPage={focusRevision} onOpenPage={goto} />}
          {tab === "archive" && <ArchiveView user={user} onOpenPage={goto} />}
        </div>
      )}
    </>
  );
}

// ───────────────────────── قائمة الصفحات ─────────────────────────

function PagesList({ onOpen }: { onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const state = useCms((s) => s);

  const needle = q.trim();

  const matches = useMemo(() => {
    if (!needle) return CMS_PAGES;
    return CMS_PAGES.filter(
      (p) =>
        p.label.includes(needle) ||
        (p.description ?? "").includes(needle) ||
        p.path.includes(needle) ||
        p.sections.some((s) => s.label.includes(needle) || s.fields.some((f) => f.label.includes(needle))),
    );
  }, [needle]);

  const collectionMatches = useMemo(() => {
    if (!needle) return CMS_COLLECTIONS;
    return CMS_COLLECTIONS.filter(
      (c) =>
        c.label.includes(needle) ||
        c.itemName.includes(needle) ||
        (c.description ?? "").includes(needle) ||
        c.fields.some((f) => f.label.includes(needle)),
    );
  }, [needle]);

  return (
    <div className="space-y-4">
      <label className="relative block">
        <Search className="absolute right-4 top-1/2 size-4.5 -translate-y-1/2 text-white/50" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن صفحة أو قسم أو مجموعة… مثل «الشريط العاجل» أو «المقالات»"
          className="h-12 w-full rounded-2xl border-2 border-white/15 bg-white/10 pr-11 text-base text-white outline-none transition placeholder:text-white/40 focus:border-gold focus:ring-4 focus:ring-gold/15"
        />
      </label>

      {matches.length === 0 && collectionMatches.length === 0 && (
        <Panel>
          <Empty icon={<Search />} title="لا نتائج" text="جرّب كلمة أخرى — يبحث الحقل في أسماء الصفحات والأقسام والحقول." />
        </Panel>
      )}

      {CMS_GROUPS.map((group) => {
        const pages = matches.filter((p) => p.group === group);
        if (!pages.length) return null;
        return (
          <Panel key={group} title={group} icon={<LayoutList />} action={<span className="text-xs text-white/55">{pages.length} صفحة</span>} bodyClass="grid gap-3 md:grid-cols-2">
            {pages.map((p, i) => (
              <PageCard key={p.id} page={p} state={state} delay={i * 0.04} onOpen={() => onOpen(p.id)} />
            ))}
          </Panel>
        );
      })}

      {collectionMatches.length > 0 && (
        <Panel
          title="مجموعات المحتوى"
          icon={<LayoutList />}
          action={<span className="text-xs text-white/55">{collectionMatches.length} مجموعة</span>}
          bodyClass="grid gap-3 md:grid-cols-2"
        >
          {collectionMatches.map((c, i) => (
            <CollectionCard key={c.id} collection={c} state={state} delay={i * 0.04} onOpen={() => onOpen(c.id)} />
          ))}
        </Panel>
      )}
    </div>
  );
}

function CollectionCard({ collection, state, delay, onOpen }: { collection: CollectionDef; state: CmsState; delay: number; onOpen: () => void }) {
  const all = readCollection(state, collection.id);
  const live = all.filter((i) => !i.archived).length;
  const created = all.filter((i) => i.isNew).length;
  const dirty = hasCollectionDraft(state, collection.id);
  const edited = editedItemCount(state, collection.id);
  const updatedAt = state.collections[collection.id]?.updatedAt;

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="group flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[.04] p-4 text-right transition hover:border-gold/50 hover:bg-white/[.08]"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-gold transition group-hover:bg-gold group-hover:text-ink">
        {collection.icon ? <CmsIcon name={collection.icon} className="size-5" /> : <FileText className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-display text-base font-bold text-white">{collection.label}</span>
          <span className="rounded-full bg-green-light/20 px-2 py-0.5 text-[10px] font-bold text-green-light">{live} منشوراً</span>
          {dirty && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold">مسودة غير منشورة</span>}
        </p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/60">{collection.description}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/45">
          {edited > 0 && <span className="text-gold">{edited} {collection.itemName}اً معدَّلاً</span>}
          {created > 0 && <span>{created} أُنشئ من اللوحة</span>}
          {collection.slots && <span>حتى {collection.slots.length} {collection.itemName}اً جديداً</span>}
          {updatedAt && <span>آخر تعديل {fmtDateTime(updatedAt)}</span>}
        </p>
      </div>
      <span className="shrink-0 self-center rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition group-hover:bg-gold group-hover:text-ink">فتح</span>
    </motion.button>
  );
}

function PageCard({ page, state, delay, onOpen }: { page: PageDef; state: CmsState; delay: number; onOpen: () => void }) {
  const p = pageState(state, page.id);
  const dirty = hasDraft(state, page.id);
  const edited = editedFieldCount(state, page.id, true);
  const hidden = Object.values(p.draft ?? p.sections).filter((s) => s.hidden || s.archived).length;

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="group flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[.04] p-4 text-right transition hover:border-gold/50 hover:bg-white/[.08]"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-gold transition group-hover:bg-gold group-hover:text-ink">
        {page.icon ? <CmsIcon name={page.icon} className="size-5" /> : <FileText className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-display text-base font-bold text-white">{page.label}</span>
          <StatusChip status={p.status} />
          {dirty && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold">مسودة غير منشورة</span>}
        </p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/60">{page.description}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/45">
          <span>{page.sections.length} قسماً</span>
          {edited > 0 && <span className="text-gold">{edited} حقلاً معدَّلاً</span>}
          {hidden > 0 && <span>{hidden} مخفي/مؤرشف</span>}
          {p.updatedAt && <span>آخر تعديل {fmtDateTime(p.updatedAt)}</span>}
        </p>
      </div>
      <span className="shrink-0 self-center rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition group-hover:bg-gold group-hover:text-ink">تعديل</span>
    </motion.button>
  );
}

// ───────────────────────── نسخ احتياطي ─────────────────────────

function BackupButtons() {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(cms.snapshot(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `محتوى-المنصة-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "نُزّل ملف المحتوى", body: "يحوي نصوص الصفحات دون ملفات الصور", tone: "success", icon: "⬇️" });
  };

  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || !("pages" in parsed)) throw new Error("ملف غير صالح");
      cms.importState(parsed);
      toast({ title: "استُورد المحتوى", body: "حدّث الصفحة لترى النتيجة", tone: "success", icon: "⬆️" });
    } catch {
      toast({ title: "تعذّر الاستيراد", body: "تأكد أنه ملف صدّرته من هذه اللوحة", tone: "warning", icon: "⚠️" });
    }
  };

  return (
    <>
      <button onClick={exportJson} title="تنزيل نسخة من المحتوى" className="grid size-10 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20">
        <Download className="size-4" />
      </button>
      <button onClick={() => input.current?.click()} title="استيراد محتوى" className="grid size-10 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20">
        <Upload className="size-4" />
      </button>
      <input
        ref={input}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          void importJson(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );
}

function summarise(s: CmsState) {
  return cmsMemo("contentSummary", s, () => compute(s));
}

function compute(s: CmsState) {
  let published = 0;
  let drafts = 0;
  let edited = 0;
  let archivedPages = 0;
  for (const p of CMS_PAGES) {
    const st = pageState(s, p.id);
    if (st.status === "published") published++;
    if (st.status === "archived") archivedPages++;
    if (hasDraft(s, p.id)) drafts++;
    edited += editedFieldCount(s, p.id, true);
  }
  for (const c of CMS_COLLECTIONS) {
    if (hasCollectionDraft(s, c.id)) drafts++;
    edited += editedItemCount(s, c.id);
  }
  return {
    published,
    drafts,
    edited,
    archived: archivedPages + archivedSections(s).length + archivedItems(s).length,
    media: s.media.length,
    revisions: s.revisions.length,
  };
}
