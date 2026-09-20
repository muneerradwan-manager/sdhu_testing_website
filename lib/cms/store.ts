"use client";

/**
 * مخزن المحتوى. منفصل عن مخزن العرض التجريبي (lib/store.ts) بمفتاح خاص به،
 * حتى لا يضيع محتوى الموقع عند «إعادة ضبط العرض».
 *
 * نموذج ووردبريس: لكل صفحة محتوى «منشور» يراه الزوار، ومسودة اختيارية تحمل تعديلات
 * لم تُنشر بعد. النشر ينقل المسودة إلى المنشور ويحفظ نسخة سابقة في سجل المراجعات.
 */

import { useSyncExternalStore } from "react";
import { getCollectionDef, CMS_COLLECTIONS } from "./collections";
import { CMS_PAGES, sectionDefaults } from "./schema";
import type {
  CmsState,
  CollectionItemState,
  CollectionState,
  MediaMeta,
  PageState,
  PageStatus,
  Revision,
  SectionState,
} from "./types";

const KEY = "sdhu-cms-v1";
/** عدد المراجعات المحفوظة لكل صفحة */
const MAX_REVISIONS_PER_PAGE = 20;

const initial: CmsState = { pages: {}, collections: {}, revisions: [], media: [], preview: false };

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

let state: CmsState = initial;
let loaded = false;
const listeners = new Set<() => void>();

/**
 * useSyncExternalStore يقارن اللقطات بـ Object.is، فلو أعاد القارئ كائناً جديداً في كل مرة
 * لدار العرض بلا نهاية. لذلك تُحفظ كل قيمة مشتقة مقرونةً بالحالة التي حُسبت منها،
 * وكل تعديل ينتج حالة جديدة فتُحسب من جديد.
 *
 * لحالة البداية ذاكرة منفصلة: React يطلب لقطة الخادم ولقطة المتصفح بالتناوب أثناء الترطيب،
 * ولو تشاركتا ذاكرة واحدة لتبادلتا الإبطال وعاد كل نداء بكائن جديد.
 */
const derived = new Map<string, { from: CmsState; value: unknown }>();
const derivedInitial = new Map<string, unknown>();

export function cmsMemo<T>(key: string, from: CmsState, compute: () => T): T {
  if (from === initial) {
    if (!derivedInitial.has(key)) derivedInitial.set(key, compute());
    return derivedInitial.get(key) as T;
  }
  const hit = derived.get(key);
  if (hit && hit.from === from) return hit.value as T;
  const value = compute();
  derived.set(key, { from, value });
  return value;
}

/** كائنات ثابتة تُعاد بدل إنشاء فارغ جديد في كل قراءة */
const EMPTY_PAGE: PageState = Object.freeze({ status: "published" as const, sections: Object.freeze({}) });
const EMPTY_VALUES: Record<string, unknown> = Object.freeze({});
const EMPTY_COLLECTION: CollectionState = Object.freeze({ items: Object.freeze({}) });

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...initial, ...JSON.parse(raw) };
  } catch {
    // وضع التصفح الخاص أو تخزين محجوب — المحتوى يعمل من الذاكرة في هذه الجلسة
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* تجاهل — المتصفح رفض الحفظ */
  }
}

function set(updater: (s: CmsState) => CmsState) {
  load();
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCms<T>(selector: (s: CmsState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return selector(state);
    },
    () => selector(initial),
  );
}

/** حالة الصفحة كما هي محفوظة، أو حالة افتراضية منشورة فارغة */
export function pageState(s: CmsState, pageId: string): PageState {
  return s.pages[pageId] ?? EMPTY_PAGE;
}

function withPage(s: CmsState, pageId: string, patch: (p: PageState) => PageState): CmsState {
  return { ...s, pages: { ...s.pages, [pageId]: patch(pageState(s, pageId)) } };
}

/** المسودة الحالية = المسودة المحفوظة إن وُجدت، وإلا نسخة من المنشور */
function draftOf(p: PageState) {
  return p.draft ?? p.sections;
}

function withCollection(s: CmsState, colId: string, patch: (c: CollectionState) => CollectionState): CmsState {
  return { ...s, collections: { ...s.collections, [colId]: patch(collectionState(s, colId)) } };
}

function colDraftOf(c: CollectionState) {
  return c.draft ?? c.items;
}

function touchedCollection(c: CollectionState, by: string): CollectionState {
  return { ...c, updatedAt: Date.now(), updatedBy: by };
}

function touched(p: PageState, by: string): PageState {
  return { ...p, updatedAt: Date.now(), updatedBy: by };
}

// ───────────────────────── قراءة المحتوى ─────────────────────────

/**
 * قيم قسم واحد بعد دمج الافتراضي مع ما عدّله الموظف.
 * `preview` يجعل الموقع يعرض المسودة بدل المنشور — للموظف فقط.
 */
export function readSection(s: CmsState, pageId: string, sectionId: string): Record<string, unknown> {
  return cmsMemo(`section:${pageId}:${sectionId}`, s, () => {
    const page = pageState(s, pageId);
    const src = s.preview ? draftOf(page) : page.sections;
    return { ...sectionDefaults(pageId, sectionId), ...(src[sectionId]?.values ?? EMPTY_VALUES) };
  });
}

/** هل يظهر القسم للزائر؟ */
export function readSectionVisible(s: CmsState, pageId: string, sectionId: string): boolean {
  const page = pageState(s, pageId);
  if (page.status === "archived") return false;
  const src = s.preview ? draftOf(page) : page.sections;
  const sec = src[sectionId];
  return !sec?.archived && !sec?.hidden;
}

/** ترتيب أقسام الصفحة: ما حُفظ أولاً، ثم ما لم يُذكر بترتيبه الأصلي */
export function readOrder(s: CmsState, pageId: string): string[] {
  return cmsMemo(`order:${pageId}`, s, () => {
    const def = CMS_PAGES.find((p) => p.id === pageId);
    if (!def) return [];
    const all = def.sections.map((x) => x.id);
    const saved = pageState(s, pageId).order?.filter((id) => all.includes(id)) ?? [];
    return [...saved, ...all.filter((id) => !saved.includes(id))];
  });
}

// ───────────────────────── قراءة المجموعات ─────────────────────────

export type CollectionItem = {
  id: string;
  values: Record<string, unknown>;
  archived: boolean;
  /** عنصر أنشأه الموظف في خانة محجوزة */
  isNew: boolean;
  createdAt?: number;
};

export function collectionState(s: CmsState, colId: string): CollectionState {
  return s.collections[colId] ?? EMPTY_COLLECTION;
}

/** ما يراه الزائر: المنشور، أو المسودة حين يكون الموظف في وضع المعاينة */
function liveSource(s: CmsState, colId: string) {
  const c = collectionState(s, colId);
  return s.preview ? (c.draft ?? c.items) : c.items;
}

/** ما يراه المحرّر: المسودة دائماً، فما أنشأه أو أرشفه يظهر له قبل النشر */
function draftSource(s: CmsState, colId: string) {
  const c = collectionState(s, colId);
  return c.draft ?? c.items;
}

/** قيم العنصر الافتراضية: الأصلية من الشيفرة، أو افتراضيات الحقول لعنصر جديد */
function itemDefaults(colId: string, itemId: string): Record<string, unknown> {
  const def = getCollectionDef(colId);
  if (!def) return EMPTY_VALUES;
  const builtIn = def.builtIn.find((b) => b.id === itemId);
  const blank = Object.fromEntries(def.fields.map((f) => [f.key, f.def]));
  return builtIn ? { ...blank, ...builtIn.values } : blank;
}

/**
 * كل عناصر المجموعة مرتبةً: ما أنشأه الموظف أولاً (الأحدث أولاً)، ثم الأصلية بترتيبها،
 * مع دمج التعديلات فوق القيم الأصلية. المؤرشفة تبقى في القائمة ويميّزها `archived`.
 */
function buildCollection(s: CmsState, colId: string, src: Record<string, CollectionItemState>): CollectionItem[] {
  const def = getCollectionDef(colId);
  if (!def) return [];
  const c = collectionState(s, colId);

  const builtInIds = def.builtIn.map((b) => b.id);
  const createdIds = (def.slots ?? [])
    .filter((slot) => src[slot]?.createdAt)
    .sort((a, b) => (src[b]?.createdAt ?? 0) - (src[a]?.createdAt ?? 0));

  const natural = [...createdIds, ...builtInIds];
  const saved = c.order?.filter((id) => natural.includes(id)) ?? [];
  const ids = [...saved, ...natural.filter((id) => !saved.includes(id))];

  return ids.map((id) => ({
    id,
    values: { ...itemDefaults(colId, id), ...(src[id]?.values ?? EMPTY_VALUES) },
    archived: !!src[id]?.archived,
    isNew: !builtInIds.includes(id),
    createdAt: src[id]?.createdAt,
  }));
}

/** كل العناصر كما يراها المحرّر — من المسودة، والمؤرشف منها مُعلَّم لا محذوف */
export function readCollection(s: CmsState, colId: string): CollectionItem[] {
  return cmsMemo(`collection:${colId}`, s, () => buildCollection(s, colId, draftSource(s, colId)));
}

/** ما يراه الزائر: المنشور بلا المؤرشف */
export function readLiveCollection(s: CmsState, colId: string): CollectionItem[] {
  return cmsMemo(`collectionLive:${colId}`, s, () => buildCollection(s, colId, liveSource(s, colId)).filter((i) => !i.archived));
}

export function readItem(s: CmsState, colId: string, itemId: string): CollectionItem | null {
  return readCollection(s, colId).find((i) => i.id === itemId) ?? null;
}

/** العنصر كما يراه الزائر، أو null إن كان مؤرشفاً أو غير منشور بعد */
export function readLiveItem(s: CmsState, colId: string, itemId: string): CollectionItem | null {
  return readLiveCollection(s, colId).find((i) => i.id === itemId) ?? null;
}

/** الخانات المحجوزة غير المستعملة بعد */
export function freeSlots(s: CmsState, colId: string): string[] {
  return cmsMemo(`freeSlots:${colId}`, s, () => {
    const def = getCollectionDef(colId);
    if (!def?.slots) return [];
    // المسودة هي المرجع: عنصران يُنشآن قبل النشر يجب ألّا يتقاسما رابطاً واحداً
    const src = draftSource(s, colId);
    return def.slots.filter((slot) => !src[slot]?.createdAt);
  });
}

// ───────────────────────── خطّافات الواجهة ─────────────────────────

/** يقرأ قسماً من المحتوى ويعيد قيمه مدموجة مع الافتراضي */
export function useSection<T extends Record<string, unknown> = Record<string, unknown>>(pageId: string, sectionId: string): T {
  return useCms((s) => readSection(s, pageId, sectionId)) as T;
}

/** هل يظهر القسم؟ تستعمله الصفحات لإخفاء قسم كامل أخفاه الموظف */
export function useSectionVisible(pageId: string, sectionId: string) {
  return useCms((s) => readSectionVisible(s, pageId, sectionId));
}

/** هل الصفحة منشورة؟ */
export function usePageStatus(pageId: string): PageStatus {
  return useCms((s) => pageState(s, pageId).status);
}

/** كل عناصر المجموعة كما يراها الزائر */
export function useCollection(colId: string) {
  return useCms((s) => readLiveCollection(s, colId));
}

/** كل العناصر بما فيها المؤرشف — للوحة التحكم */
export function useCollectionAll(colId: string) {
  return useCms((s) => readCollection(s, colId));
}

export function useCollectionItem(colId: string, itemId: string) {
  return useCms((s) => readItem(s, colId, itemId));
}

export function usePreview() {
  return useCms((s) => s.preview);
}

export function useMediaList() {
  return useCms((s) => s.media);
}

/** قيم قسم في المسودة كما هي محفوظة (دون دمج الافتراضي) — لنموذج التحرير */
export function readDraftValues(s: CmsState, pageId: string, sectionId: string): Record<string, unknown> {
  const p = pageState(s, pageId);
  return (p.draft ?? p.sections)[sectionId]?.values ?? EMPTY_VALUES;
}

/** false أثناء التوليد على الخادم وأول عرض، true بعدها */
export function useCmsHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

// ───────────────────────── الإجراءات ─────────────────────────

type Author = { name: string; title?: string };

function pushRevision(s: CmsState, pageId: string, by: Author, note: string, snapshot: PageState): CmsState {
  const rev: Revision = {
    id: uid(),
    pageId,
    at: Date.now(),
    by: by.name,
    byTitle: by.title,
    note,
    snapshot: { sections: snapshot.sections, order: snapshot.order, status: snapshot.status },
  };
  const forPage = s.revisions.filter((r) => r.pageId === pageId);
  const drop = forPage.length >= MAX_REVISIONS_PER_PAGE ? forPage.slice(MAX_REVISIONS_PER_PAGE - 1).map((r) => r.id) : [];
  return { ...s, revisions: [rev, ...s.revisions.filter((r) => !drop.includes(r.id))] };
}

export const cms = {
  /** تعديل حقل واحد — يكتب في المسودة دائماً */
  setField(pageId: string, sectionId: string, key: string, value: unknown, by: Author) {
    set((s) =>
      withPage(s, pageId, (p) => {
        const draft = draftOf(p);
        const sec: SectionState = draft[sectionId] ?? {};
        return touched({ ...p, draft: { ...draft, [sectionId]: { ...sec, values: { ...sec.values, [key]: value } } } }, by.name);
      }),
    );
  },

  /** إرجاع حقل واحد إلى قيمته الأصلية */
  resetField(pageId: string, sectionId: string, key: string, by: Author) {
    set((s) =>
      withPage(s, pageId, (p) => {
        const draft = draftOf(p);
        const sec: SectionState = draft[sectionId] ?? {};
        const values = { ...sec.values };
        delete values[key];
        return touched({ ...p, draft: { ...draft, [sectionId]: { ...sec, values } } }, by.name);
      }),
    );
  },

  /** إرجاع القسم كاملاً إلى محتواه الأصلي */
  resetSection(pageId: string, sectionId: string, by: Author) {
    set((s) =>
      withPage(s, pageId, (p) => {
        const draft = draftOf(p);
        return touched({ ...p, draft: { ...draft, [sectionId]: { ...draft[sectionId], values: {} } } }, by.name);
      }),
    );
  },

  /** إخفاء القسم عن الزوار أو إظهاره (يُطبّق على المسودة) */
  setSectionHidden(pageId: string, sectionId: string, hidden: boolean, by: Author) {
    set((s) =>
      withPage(s, pageId, (p) => {
        const draft = draftOf(p);
        return touched({ ...p, draft: { ...draft, [sectionId]: { ...draft[sectionId], hidden } } }, by.name);
      }),
    );
  },

  /** أرشفة قسم أو استعادته من الأرشيف */
  setSectionArchived(pageId: string, sectionId: string, archived: boolean, by: Author) {
    set((s) =>
      withPage(s, pageId, (p) => {
        const draft = draftOf(p);
        return touched(
          { ...p, draft: { ...draft, [sectionId]: { ...draft[sectionId], archived, archivedAt: archived ? Date.now() : undefined } } },
          by.name,
        );
      }),
    );
  },

  /** تحريك قسم لأعلى أو لأسفل داخل الصفحة */
  moveSection(pageId: string, sectionId: string, dir: -1 | 1, by: Author) {
    set((s) => {
      const order = readOrder(s, pageId);
      const i = order.indexOf(sectionId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= order.length) return s;
      const next = [...order];
      [next[i], next[j]] = [next[j], next[i]];
      return withPage(s, pageId, (p) => touched({ ...p, order: next }, by.name));
    });
  },

  /** حفظ المسودة كما هي (التعديلات محفوظة أصلاً؛ هذا يثبّت وقت الحفظ) */
  saveDraft(pageId: string, by: Author) {
    set((s) => withPage(s, pageId, (p) => touched({ ...p, draft: draftOf(p) }, by.name)));
  },

  /** نشر المسودة: تصبح هي المحتوى الذي يراه الزوار، وتُحفظ النسخة السابقة */
  publish(pageId: string, by: Author, note = "نشر تعديلات الصفحة") {
    set((s) => {
      const before = pageState(s, pageId);
      const withRev = pushRevision(s, pageId, by, note, before);
      return withPage(withRev, pageId, (p) => ({
        ...p,
        status: p.status === "archived" ? "published" : p.status === "draft" ? "published" : p.status,
        sections: draftOf(p),
        draft: undefined,
        updatedAt: Date.now(),
        updatedBy: by.name,
        publishedAt: Date.now(),
        publishedBy: by.name,
        archivedAt: undefined,
      }));
    });
  },

  /** التراجع عن كل التعديلات غير المنشورة */
  discardDraft(pageId: string, by: Author) {
    set((s) => withPage(s, pageId, (p) => touched({ ...p, draft: undefined }, by.name)));
  },

  /** تغيير حالة الصفحة: منشورة / مسودة (مخفية عن الزوار) / مؤرشفة */
  setPageStatus(pageId: string, status: PageStatus, by: Author) {
    set((s) => {
      const before = pageState(s, pageId);
      const withRev = pushRevision(s, pageId, by, `تغيير حالة الصفحة إلى ${STATUS_LABEL[status]}`, before);
      return withPage(withRev, pageId, (p) =>
        touched({ ...p, status, archivedAt: status === "archived" ? Date.now() : undefined }, by.name),
      );
    });
  },

  /** استعادة نسخة سابقة إلى المسودة، ليراجعها الموظف قبل النشر */
  restoreRevision(revisionId: string, by: Author) {
    set((s) => {
      const rev = s.revisions.find((r) => r.id === revisionId);
      if (!rev) return s;
      if (rev.scope === "collection" && rev.itemsSnapshot) {
        const snap = rev.itemsSnapshot;
        return withCollection(s, rev.pageId, (c) => touchedCollection({ ...c, draft: snap.items, order: snap.order }, by.name));
      }
      return withPage(s, rev.pageId, (p) => touched({ ...p, draft: rev.snapshot.sections, order: rev.snapshot.order }, by.name));
    });
  },

  /** حذف نسخة من السجل */
  deleteRevision(revisionId: string) {
    set((s) => ({ ...s, revisions: s.revisions.filter((r) => r.id !== revisionId) }));
  },

  /** إرجاع الصفحة كاملة إلى محتواها الأصلي (يُنشر مباشرة بعد حفظ نسخة) */
  resetPage(pageId: string, by: Author) {
    set((s) => {
      const before = pageState(s, pageId);
      const withRev = pushRevision(s, pageId, by, "إرجاع الصفحة إلى المحتوى الأصلي", before);
      return withPage(withRev, pageId, () => ({
        status: "published",
        sections: {},
        draft: undefined,
        updatedAt: Date.now(),
        updatedBy: by.name,
        publishedAt: Date.now(),
        publishedBy: by.name,
      }));
    });
  },

  // ── المجموعات ──

  /** تعديل حقل في عنصر — يكتب في مسودة المجموعة */
  setItemField(colId: string, itemId: string, key: string, value: unknown, by: Author) {
    set((s) =>
      withCollection(s, colId, (c) => {
        const draft = colDraftOf(c);
        const item: CollectionItemState = draft[itemId] ?? {};
        return touchedCollection({ ...c, draft: { ...draft, [itemId]: { ...item, values: { ...item.values, [key]: value } } } }, by.name);
      }),
    );
  },

  /** إرجاع حقل واحد في عنصر إلى قيمته الأصلية */
  resetItemField(colId: string, itemId: string, key: string, by: Author) {
    set((s) =>
      withCollection(s, colId, (c) => {
        const draft = colDraftOf(c);
        const item: CollectionItemState = draft[itemId] ?? {};
        const values = { ...item.values };
        delete values[key];
        return touchedCollection({ ...c, draft: { ...draft, [itemId]: { ...item, values } } }, by.name);
      }),
    );
  },

  /** إرجاع العنصر كاملاً إلى محتواه الأصلي */
  resetItem(colId: string, itemId: string, by: Author) {
    set((s) =>
      withCollection(s, colId, (c) => {
        const draft = colDraftOf(c);
        return touchedCollection({ ...c, draft: { ...draft, [itemId]: { ...draft[itemId], values: {} } } }, by.name);
      }),
    );
  },

  /** أرشفة عنصر أو استعادته */
  setItemArchived(colId: string, itemId: string, archived: boolean, by: Author) {
    set((s) =>
      withCollection(s, colId, (c) => {
        const draft = colDraftOf(c);
        return touchedCollection(
          { ...c, draft: { ...draft, [itemId]: { ...draft[itemId], archived, archivedAt: archived ? Date.now() : undefined } } },
          by.name,
        );
      }),
    );
  },

  /** تحريك عنصر في ترتيب المجموعة */
  moveItem(colId: string, itemId: string, dir: -1 | 1, by: Author) {
    set((s) => {
      const ids = readCollection(s, colId).map((i) => i.id);
      const i = ids.indexOf(itemId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ids.length) return s;
      const next = [...ids];
      [next[i], next[j]] = [next[j], next[i]];
      return withCollection(s, colId, (c) => touchedCollection({ ...c, order: next }, by.name));
    });
  },

  /**
   * إنشاء عنصر جديد في أول خانة محجوزة. يعيد معرّف الخانة (وهو رابط العنصر في الموقع)،
   * أو null إن نفدت الخانات.
   */
  createItem(colId: string, values: Record<string, unknown>, by: Author): string | null {
    let slot: string | null = null;
    set((s) => {
      slot = freeSlots(s, colId)[0] ?? null;
      if (!slot) return s;
      const id = slot;
      return withCollection(s, colId, (c) => {
        const draft = colDraftOf(c);
        return touchedCollection(
          { ...c, draft: { ...draft, [id]: { values, createdAt: Date.now(), createdBy: by.name } } },
          by.name,
        );
      });
    });
    return slot;
  },

  /** حذف عنصر أنشأه الموظف، فتعود خانته متاحة */
  deleteCreatedItem(colId: string, itemId: string, by: Author) {
    set((s) =>
      withCollection(s, colId, (c) => {
        const draft = { ...colDraftOf(c) };
        delete draft[itemId];
        return touchedCollection({ ...c, draft }, by.name);
      }),
    );
  },

  saveCollectionDraft(colId: string, by: Author) {
    set((s) => withCollection(s, colId, (c) => touchedCollection({ ...c, draft: colDraftOf(c) }, by.name)));
  },

  /** نشر مسودة المجموعة، مع حفظ نسخة سابقة */
  publishCollection(colId: string, by: Author, note = "نشر تعديلات المجموعة") {
    set((s) => {
      const before = collectionState(s, colId);
      const rev: Revision = {
        id: uid(),
        pageId: colId,
        scope: "collection",
        at: Date.now(),
        by: by.name,
        byTitle: by.title,
        note,
        snapshot: { sections: {}, status: "published" },
        itemsSnapshot: { items: before.items, order: before.order },
      };
      const forCol = s.revisions.filter((r) => r.pageId === colId);
      const drop = forCol.length >= MAX_REVISIONS_PER_PAGE ? forCol.slice(MAX_REVISIONS_PER_PAGE - 1).map((r) => r.id) : [];
      const withRev = { ...s, revisions: [rev, ...s.revisions.filter((r) => !drop.includes(r.id))] };
      return withCollection(withRev, colId, (c) => ({
        ...c,
        items: colDraftOf(c),
        draft: undefined,
        updatedAt: Date.now(),
        updatedBy: by.name,
        publishedAt: Date.now(),
        publishedBy: by.name,
      }));
    });
  },

  discardCollectionDraft(colId: string, by: Author) {
    set((s) => withCollection(s, colId, (c) => touchedCollection({ ...c, draft: undefined }, by.name)));
  },

  /** وضع المعاينة: يعرض الموقع المسودات بدل المنشور */
  setPreview(preview: boolean) {
    set((s) => ({ ...s, preview }));
  },

  // ── مكتبة الوسائط ──
  addMedia(meta: MediaMeta) {
    set((s) => ({ ...s, media: [meta, ...s.media] }));
  },
  updateMedia(id: string, patch: Partial<MediaMeta>) {
    set((s) => ({ ...s, media: s.media.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  },
  removeMedia(id: string) {
    set((s) => ({ ...s, media: s.media.filter((m) => m.id !== id) }));
  },

  /** محو كل تعديلات المحتوى ومكتبة الوسائط */
  resetAll() {
    set(() => initial);
  },

  /** تصدير المحتوى كملف JSON قابل للاستيراد */
  snapshot(): CmsState {
    load();
    return state;
  },

  /** استيراد محتوى سبق تصديره */
  importState(next: CmsState) {
    set(() => ({ ...initial, ...next, preview: false }));
  },
};

export const STATUS_LABEL: Record<PageStatus, string> = {
  published: "منشورة",
  draft: "مسودة",
  archived: "مؤرشفة",
};

// ───────────────────────── إحصاءات للوحة التحكم ─────────────────────────

/** هل في الصفحة تعديلات لم تُنشر؟ */
export function hasDraft(s: CmsState, pageId: string) {
  const p = s.pages[pageId];
  return !!p?.draft && JSON.stringify(p.draft) !== JSON.stringify(p.sections);
}

/** عدد الحقول المعدّلة في صفحة (مقارنة بالمحتوى الأصلي) */
export function editedFieldCount(s: CmsState, pageId: string, useDraft = false) {
  const p = s.pages[pageId];
  if (!p) return 0;
  const src = useDraft ? draftOf(p) : p.sections;
  return Object.values(src).reduce((n, sec) => n + Object.keys(sec.values ?? {}).length, 0);
}

/** هل في المجموعة تعديلات لم تُنشر؟ */
export function hasCollectionDraft(s: CmsState, colId: string) {
  const c = s.collections[colId];
  return !!c?.draft && JSON.stringify(c.draft) !== JSON.stringify(c.items);
}

/** عدد العناصر المعدّلة أو المنشأة في مجموعة */
export function editedItemCount(s: CmsState, colId: string) {
  const c = s.collections[colId];
  if (!c) return 0;
  const src = c.draft ?? c.items;
  return Object.values(src).filter((i) => Object.keys(i.values ?? {}).length > 0 || i.createdAt).length;
}

/** عناصر مؤرشفة في كل المجموعات — لسلة الأرشيف */
export function archivedItems(s: CmsState) {
  return cmsMemo("archivedItems", s, () => {
    const out: { colId: string; itemId: string; title: string; at?: number }[] = [];
    for (const def of CMS_COLLECTIONS) {
      for (const item of readCollection(s, def.id)) {
        if (!item.archived) continue;
        const title = item.values[def.titleKey];
        out.push({ colId: def.id, itemId: item.id, title: typeof title === "string" ? title : item.id, at: undefined });
      }
    }
    return out;
  });
}

/** أقسام مؤرشفة في كل الصفحات — لسلة الأرشيف */
export function archivedSections(s: CmsState) {
  return cmsMemo("archivedSections", s, () => {
    const out: { pageId: string; sectionId: string; at?: number }[] = [];
    for (const page of CMS_PAGES) {
      const p = s.pages[page.id];
      if (!p) continue;
      for (const [sectionId, sec] of Object.entries(draftOf(p))) {
        if (sec.archived) out.push({ pageId: page.id, sectionId, at: sec.archivedAt });
      }
    }
    return out.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  });
}
