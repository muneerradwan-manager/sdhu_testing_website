"use client";

import { useEffect, useState } from "react";
import type { Evidence } from "./store";

/**
 * The evidence an objection or its answers carry: a photo, a recording, a video or a document. It is kept in the
 * browser's IndexedDB under its own database — not in the site's media library, where the content team would see it —
 * and the objection holds only its reference («ev:<id>»), as the media library's references are held.
 */
const DB_NAME = "sdhu-evidence";
const STORE = "files";
const PREFIX = "ev:";
/** The most a single piece may weigh */
export const MAX_EVIDENCE_BYTES = 12 * 1024 * 1024;
/** What may be attached: pictures, sound, video, PDF, Word, Excel and plain text */
export const EVIDENCE_ACCEPT = "image/*,audio/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt";

const DOCS = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

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

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = run(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

/** The kind of a piece, for how it is shown */
export const evidenceKind = (type: string): "image" | "audio" | "video" | "file" => (type.startsWith("image/") ? "image" : type.startsWith("audio/") ? "audio" : type.startsWith("video/") ? "video" : "file");

/** Keeps a file and returns what the objection holds of it; throws a message the screen shows when it cannot be kept */
export async function uploadEvidence(file: File): Promise<Evidence> {
  if (file.size > MAX_EVIDENCE_BYTES) throw new Error("حجم الملف أكبر من 12 ميغابايت");
  const ok = file.type.startsWith("image/") || file.type.startsWith("audio/") || file.type.startsWith("video/") || DOCS.has(file.type) || /\.(docx?|xlsx?|txt)$/i.test(file.name);
  if (!ok) throw new Error("يُقبل رفع الصور والصوت والفيديو ومستندات PDF وWord وExcel");
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  await tx("readwrite", (s) => s.put({ id, name: file.name, type: file.type, blob: file }));
  return { name: file.name, ref: `${PREFIX}${id}`, type: file.type || "application/octet-stream" };
}

/** A piece's address for showing: it is read from the browser's store, then freed when the screen leaves */
export function useEvidenceUrl(ref: string): string {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!ref.startsWith(PREFIX)) return;
    let made = "";
    let gone = false;
    tx<{ blob: Blob } | undefined>("readonly", (s) => s.get(ref.slice(PREFIX.length)))
      .then((row) => {
        if (gone || !row) return;
        made = URL.createObjectURL(row.blob);
        setUrl(made);
      })
      .catch(() => null);
    return () => {
      gone = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [ref]);
  return url;
}
