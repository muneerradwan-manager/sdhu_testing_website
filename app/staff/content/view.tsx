"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, ExternalLink, Eye, EyeOff, PencilLine, Search, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/widgets";
import { CMS_COLLECTIONS, getCollectionDef } from "@/lib/cms/collections";
import { CMS_GROUPS, CMS_PAGES, getPageDef } from "@/lib/cms/schema";
import { cms, editedFieldCount, editedItemCount, hasCollectionDraft, hasDraft, pageState, readCollection, useCms, useCmsHydrated } from "@/lib/cms/store";
import type { CmsState } from "@/lib/cms/types";
import { cn, countOf } from "@/lib/utils";
import { Gate, PageHeader, Panel, fmtDateTime, useStaffUser } from "../_components/kit";
import { FilterSelect } from "../_components/ops-ui";
import { Box, EmptyRow, ListTable, RowActions, RowLink, Tag } from "../_components/wp";
import { Segments } from "../exam/_components/ui";
import { ArchiveView } from "./_components/archive";
import { CollectionEditor } from "./_components/collection";
import { PageEditor, StatusChip } from "./_components/editor";
import { MediaLibrary } from "./_components/media";
import { RevisionsView } from "./_components/revisions";
import { useContentSummary } from "./_components/summary";

type Tab = "pages" | "media" | "revisions" | "archive";
const TABS: Tab[] = ["pages", "media", "revisions", "archive"];
const BASE = "/staff/content";

export function ContentView() {
  return (
    <Gate perms={["content.manage"]}>
      <Inner />
    </Gate>
  );
}

/**
 * The site's content, as a site's admin: the pages and collections in a list, each edited on its own screen
 * (`?id=` for a page, `?collection=` for a collection); the media, the earlier versions and the archive beside it
 * (`?tab=`). Its numbers are on «لوحتي».
 */
function Inner() {
  const user = useStaffUser();
  const hydrated = useCmsHydrated();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const preview = useCms((s) => s.preview);
  const stats = useContentSummary();

  const openId = params.get("id");
  const tabParam = params.get("tab") as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : "pages";
  const focus = params.get("focus") ?? undefined;
  // A collection opens by its own parameter: a page and a collection may share an id («الأخبار» and its articles)
  const collectionId = params.get("collection");
  const page = openId ? getPageDef(openId) : null;
  const collection = collectionId ? getCollectionDef(collectionId) : openId && !page ? getCollectionDef(openId) : null;

  if (!user) return null;

  const goto = (id: string) => router.push(`${BASE}?id=${encodeURIComponent(id)}`);
  const gotoCollection = (id: string) => router.push(`${BASE}?collection=${encodeURIComponent(id)}`);
  const back = () => router.push(BASE);
  const openRevisions = (id: string) => router.push(`${BASE}?tab=revisions&focus=${encodeURIComponent(id)}`);

  return (
    <>
      <PageHeader
        title="محتوى الموقع"
        icon={<PencilLine />}
        description="ما يظهر لزوار الموقع: عدّل، احفظ مسودة، عاين، ثم انشر."
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
              className={cn("flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition", preview ? "bg-gold text-ink hover:bg-gold-light" : "bg-white/10 text-white hover:bg-white/20")}
            >
              {preview ? <Eye className="size-4" /> : <EyeOff className="size-4" />} وضع المعاينة
            </button>
            <Link href="/" target="_blank" className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-white/20">
              <ExternalLink className="size-4" /> فتح الموقع
            </Link>
          </>
        }
      />

      {!hydrated ? (
        <Panel>
          <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
        </Panel>
      ) : page ? (
        <PageEditor key={page.id} page={page} user={user} onBack={back} onOpenRevisions={() => openRevisions(page.id)} />
      ) : collection ? (
        <CollectionEditor key={collection.id} collection={collection} user={user} onBack={back} onOpenRevisions={() => openRevisions(collection.id)} />
      ) : (
        <div className="space-y-5">
          <Segments
            value={tab}
            onChange={(v) => router.replace(v === "pages" ? BASE : `${BASE}?tab=${v}`, { scroll: false })}
            label="أقسام المحتوى"
            items={[
              { value: "pages", label: "الصفحات والمجموعات", count: CMS_PAGES.length + CMS_COLLECTIONS.length },
              { value: "media", label: "مكتبة الوسائط", count: stats.media },
              { value: "revisions", label: "النسخ السابقة", count: stats.revisions },
              { value: "archive", label: "الأرشيف", count: stats.archived },
            ]}
          />

          {tab === "pages" && <PagesList onOpen={goto} onOpenCollection={gotoCollection} onRevisions={openRevisions} />}
          {tab === "media" && <MediaLibrary by={user.name} />}
          {tab === "revisions" && <RevisionsView key={focus ?? "all"} user={user} focusPage={focus} onOpenPage={goto} />}
          {tab === "archive" && <ArchiveView user={user} onOpenPage={goto} />}
        </div>
      )}
    </>
  );
}

// ───────────────────────── قائمة الصفحات ─────────────────────────

function PagesList({ onOpen, onOpenCollection, onRevisions }: { onOpen: (id: string) => void; onOpenCollection: (id: string) => void; onRevisions: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [drafts, setDrafts] = useState<"all" | "drafts">("all");
  const state = useCms((s) => s);
  const needle = q.trim();

  const pages = useMemo(
    () =>
      CMS_PAGES.filter(
        (p) =>
          (!group || p.group === group) &&
          (drafts === "all" || hasDraft(state, p.id)) &&
          (!needle || p.label.includes(needle) || (p.description ?? "").includes(needle) || p.path.includes(needle) || p.sections.some((s) => s.label.includes(needle) || s.fields.some((f) => f.label.includes(needle)))),
      ),
    [needle, group, drafts, state],
  );

  const collections = useMemo(
    () =>
      CMS_COLLECTIONS.filter(
        (c) =>
          (drafts === "all" || hasCollectionDraft(state, c.id)) &&
          (!needle || c.label.includes(needle) || c.itemName.includes(needle) || (c.description ?? "").includes(needle) || c.fields.some((f) => f.label.includes(needle))),
      ),
    [needle, drafts, state],
  );

  const draftCount = CMS_PAGES.filter((p) => hasDraft(state, p.id)).length + CMS_COLLECTIONS.filter((c) => hasCollectionDraft(state, c.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segments
          value={drafts}
          onChange={setDrafts}
          label="تصفية"
          items={[
            { value: "all", label: "الكل", count: CMS_PAGES.length + CMS_COLLECTIONS.length },
            { value: "drafts", label: "فيها مسودة غير منشورة", count: draftCount },
          ]}
        />
        <div className="w-full sm:w-52">
          <FilterSelect value={group} onChange={setGroup} label="القسم" all="كل أقسام الموقع" options={CMS_GROUPS} />
        </div>
        <label className="relative w-full flex-1 sm:min-w-64">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن صفحة أو قسم أو حقل… مثل «الشريط العاجل»"
            aria-label="بحث في الصفحات"
            className="h-11 w-full rounded-xl border-2 border-white/15 bg-white/10 pr-9 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-gold"
          />
        </label>
      </div>

      <ListTable head={["الصفحة", "قسم الموقع", "الحالة", "آخر تعديل"]}>
        {pages.length === 0 && <EmptyRow cols={4}>لا صفحات مطابقة.</EmptyRow>}
        {pages.map((p) => (
          <PageRow key={p.id} id={p.id} state={state} onOpen={onOpen} onRevisions={onRevisions} />
        ))}
      </ListTable>

      {!group && (
        <>
          <h2 className="pt-2 font-display text-xl font-bold text-white">مجموعات المحتوى</h2>
          <ListTable head={["المجموعة", "المنشور", "الحالة", "آخر تعديل"]}>
            {collections.length === 0 && <EmptyRow cols={4}>لا مجموعات مطابقة.</EmptyRow>}
            {collections.map((c) => (
              <CollectionRow key={c.id} id={c.id} state={state} onOpen={onOpenCollection} onRevisions={onRevisions} />
            ))}
          </ListTable>
        </>
      )}

      <Box title="خيارات متقدمة: نسخة احتياطية من المحتوى" open={false}>
        <BackupButtons />
      </Box>
    </div>
  );
}

function PageRow({ id, state, onOpen, onRevisions }: { id: string; state: CmsState; onOpen: (id: string) => void; onRevisions: (id: string) => void }) {
  const page = getPageDef(id)!;
  const p = pageState(state, id);
  const dirty = hasDraft(state, id);
  const edited = editedFieldCount(state, id, true);
  const hidden = Object.values(p.draft ?? p.sections).filter((s) => s.hidden || s.archived).length;
  return (
    <tr className="align-top">
      <td className="p-3">
        <button type="button" onClick={() => onOpen(id)} className="text-right font-bold text-white hover:text-gold">
          {page.label}
        </button>
        <p className="line-clamp-1 text-xs text-white/55">{page.description}</p>
        <RowActions>
          <RowLink onClick={() => onOpen(id)}>تعديل</RowLink>
          <RowLink href={page.path}>عرض</RowLink>
          <RowLink onClick={() => onRevisions(id)}>النسخ السابقة</RowLink>
        </RowActions>
      </td>
      <td className="p-3 text-xs text-white/70">{page.group}</td>
      <td className="p-3">
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusChip status={p.status} />
          {dirty && <Tag tone="gold">مسودة غير منشورة</Tag>}
        </span>
        <span className="mt-1 block text-[11px] text-white/50">
          {page.sections.length} قسماً
          {edited > 0 && ` · ${countOf(edited, { zero: "", one: "حقل واحد معدَّل", two: "حقلان معدَّلان", few: "حقول معدَّلة", many: "حقلاً معدَّلاً" })}`}
          {hidden > 0 && ` · ${hidden} مخفي/مؤرشف`}
        </span>
      </td>
      <td className="p-3 text-xs text-white/60">{p.updatedAt ? fmtDateTime(p.updatedAt) : "—"}</td>
    </tr>
  );
}

function CollectionRow({ id, state, onOpen, onRevisions }: { id: string; state: CmsState; onOpen: (id: string) => void; onRevisions: (id: string) => void }) {
  const collection = getCollectionDef(id)!;
  const all = readCollection(state, id);
  const live = all.filter((i) => !i.archived).length;
  const created = all.filter((i) => i.isNew).length;
  const dirty = hasCollectionDraft(state, id);
  const edited = editedItemCount(state, id);
  const updatedAt = state.collections[id]?.updatedAt;
  return (
    <tr className="align-top">
      <td className="p-3">
        <button type="button" onClick={() => onOpen(id)} className="text-right font-bold text-white hover:text-gold">
          {collection.label}
        </button>
        <p className="line-clamp-1 text-xs text-white/55">{collection.description}</p>
        <RowActions>
          <RowLink onClick={() => onOpen(id)}>فتح</RowLink>
          <RowLink onClick={() => onRevisions(id)}>النسخ السابقة</RowLink>
        </RowActions>
      </td>
      <td className="p-3 text-white/80">
        {collection.itemsName} المنشورة: {live}
        <span className="block text-[11px] text-white/50">
          {edited > 0 && `${edited} معدَّلاً · `}
          {created > 0 && `${created} أُنشئ من اللوحة · `}
          {collection.slots && `حتى ${collection.slots.length} جديداً`}
        </span>
      </td>
      <td className="p-3">{dirty ? <Tag tone="gold">مسودة غير منشورة</Tag> : <Tag tone="green">منشورة</Tag>}</td>
      <td className="p-3 text-xs text-white/60">{updatedAt ? fmtDateTime(updatedAt) : "—"}</td>
    </tr>
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
      <p className="text-white/65">ملف بنصوص الموقع كلها (دون الصور)، للحفظ أو للنقل إلى جهاز آخر. الاستيراد يستبدل المحتوى الحالي.</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={exportJson} className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20">
          <Download className="size-4" /> تنزيل نسخة من المحتوى
        </button>
        <button onClick={() => input.current?.click()} className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20">
          <Upload className="size-4" /> استيراد محتوى
        </button>
      </div>
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
