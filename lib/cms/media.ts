"use client";

/**
 * مكتبة الوسائط. الصور التي يرفعها الموظف تُخزَّن في IndexedDB لا في localStorage،
 * لأن localStorage لا يتّسع لأكثر من بضعة ميغابايت، وصورة واحدة قد تتجاوزها.
 *
 * تُصغَّر كل صورة قبل الحفظ (عرض أقصى 1920 بكسل) حتى يبقى العرض التجريبي خفيفاً.
 * يُخزَّن في المحتوى مرجع نصي فقط: "cms:<المعرّف>".
 */

import { useEffect, useSyncExternalStore } from "react";
import { asset } from "@/lib/utils";
import { cms } from "./store";
import { MEDIA_PREFIX, isMediaRef, mediaId, type MediaMeta } from "./types";

const DB_NAME = "sdhu-cms-media";
const STORE = "files";
const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.85;
/** حد أقصى للملف قبل التصغير */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

// ───────────────────────── ذاكرة وسيطة + اشتراك ─────────────────────────

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();
const watchers = new Set<() => void>();

function notify() {
  watchers.forEach((w) => w());
}

function subscribeMedia(listener: () => void) {
  watchers.add(listener);
  return () => {
    watchers.delete(listener);
  };
}

export function getCachedUrl(id: string) {
  return cache.get(id) ?? null;
}

export function loadMedia(id: string): Promise<string | null> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  const inFlight = pending.get(id);
  if (inFlight) return inFlight;
  const p = tx<{ id: string; dataUrl: string } | undefined>("readonly", (s) => s.get(id))
    .then((row) => {
      pending.delete(id);
      if (!row?.dataUrl) return null;
      cache.set(id, row.dataUrl);
      notify();
      return row.dataUrl;
    })
    .catch(() => {
      pending.delete(id);
      return null;
    });
  pending.set(id, p);
  return p;
}

// ───────────────────────── الرفع ─────────────────────────

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("تعذّر قراءة الصورة"));
    img.src = src;
  });
}

/** يصغّر الصورة إن تجاوزت الحد، ويعيد رابط بيانات جاهزاً للتخزين */
async function shrink(dataUrl: string, type: string) {
  // SVG لا يُرسم على canvas بأمان، والملفات الصغيرة لا تحتاج تصغيراً
  if (type === "image/svg+xml" || type === "image/gif") return { dataUrl, width: undefined, height: undefined };
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  if (scale === 1 && dataUrl.length < 900_000) return { dataUrl, width: img.naturalWidth, height: img.naturalHeight };
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl, width: img.naturalWidth, height: img.naturalHeight };
  ctx.drawImage(img, 0, 0, w, h);
  // الشفافية تُفقد بالتحويل إلى JPEG، فتبقى PNG على حالها
  const encoded = type === "image/png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return { dataUrl: encoded, width: w, height: h };
}

export type UploadResult = { ref: string; meta: MediaMeta };

/** يرفع ملفاً إلى المكتبة ويعيد مرجعه النصي */
export async function uploadMedia(file: File, by?: string): Promise<UploadResult> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("حجم الملف أكبر من 12 ميغابايت");
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) throw new Error("يُقبل رفع الصور ومقاطع الفيديو فقط");

  const raw = await readAsDataUrl(file);
  const isImage = file.type.startsWith("image/");
  const { dataUrl, width, height } = isImage ? await shrink(raw, file.type) : { dataUrl: raw, width: undefined, height: undefined };

  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  await tx("readwrite", (s) => s.put({ id, dataUrl }));
  cache.set(id, dataUrl);
  notify();

  const meta: MediaMeta = {
    id,
    name: file.name,
    type: file.type,
    // الطول بعد التصغير تقريباً: كل 4 محارف base64 = 3 بايت
    size: Math.round((dataUrl.length * 3) / 4),
    width,
    height,
    at: Date.now(),
    by,
    alt: "",
  };
  cms.addMedia(meta);
  return { ref: `${MEDIA_PREFIX}${id}`, meta };
}

export async function deleteMedia(id: string) {
  await tx("readwrite", (s) => s.delete(id)).catch(() => null);
  cache.delete(id);
  cms.removeMedia(id);
  notify();
}

/** يحذف من IndexedDB كل ما لم يعد مذكوراً في فهرس الوسائط */
export async function purgeOrphans(keep: string[]) {
  const ids = await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
  await Promise.all(ids.filter((k) => !keep.includes(String(k))).map((k) => tx("readwrite", (s) => s.delete(k as string))));
}

// ───────────────────────── الاستخدام في الواجهة ─────────────────────────

/**
 * يحوّل ما هو محفوظ في المحتوى إلى رابط صالح للعرض:
 * مرجع مكتبة ← رابط بيانات من IndexedDB، ومسار عادي ← مسار الموقع، ورابط خارجي كما هو.
 */
export function useMediaUrl(ref: unknown): string {
  const raw = typeof ref === "string" ? ref : "";
  const id = isMediaRef(raw) ? mediaId(raw) : null;

  // الذاكرة الوسيطة مصدر خارجي للحالة: نشترك فيها بدل نسخ قيمتها في حالة محلية
  const cached = useSyncExternalStore(
    subscribeMedia,
    () => (id ? (getCachedUrl(id) ?? "") : ""),
    () => "",
  );

  useEffect(() => {
    if (id) void loadMedia(id);
  }, [id]);

  if (id) return cached;
  if (!raw) return "";
  return /^(https?:)?\/\/|^data:/.test(raw) ? raw : asset(raw);
}

/** نسخة غير تفاعلية، لمعرفة إن كان المرجع من المكتبة */
export { isMediaRef, mediaId, MEDIA_PREFIX };

export function formatBytes(n: number) {
  if (n < 1024) return `${n} بايت`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} كيلوبايت`;
  return `${(n / (1024 * 1024)).toFixed(1)} ميغابايت`;
}
