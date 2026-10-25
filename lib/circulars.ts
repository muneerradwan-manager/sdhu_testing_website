"use client";

import { useCallback, useMemo } from "react";
import { CURRENT_SEASON, FILE_TYPES, postingsOf, useEmployees, useOpFiles, usePlaces, type FileTypeCode } from "./ops";
import type { StaffUser } from "./staff";
import { useStaffAccounts } from "./systems";
import { setState, useStore, type Evidence } from "./store";

/**
 * «القرارات والتعميمات»: what the administration issues to its own staff — a decision («قرار») or a circular («تعميم»),
 * numbered and dated, with its text and attachments, to every employee, to those posted in some operational files this
 * season, or to named employees. «إدارة الموظفين» drafts and publishes them (`staff.circulars.*`); every employee reads
 * those addressed to him in his own page, beside «ملفاتي التشغيلية», and marks each one read, so its issuer knows who has.
 */
export type CircularKind = "decision" | "circular";
export type Audience = { kind: "all" } | { kind: "files"; files: FileTypeCode[] } | { kind: "staff"; ids: string[] };

export type Circular = {
  id: string;
  kind: CircularKind;
  /** «14/1448» */
  number: string;
  title: string;
  body: string;
  /** Its date as issued, YYYY-MM-DD */
  date: string;
  audience: Audience;
  attachments?: Evidence[];
  status: "draft" | "published" | "archived";
  createdBy: string;
  publishedAt?: number;
  publishedBy?: string;
  /** Staff account id → when he marked it read */
  reads?: Record<string, number>;
};

export const KIND_LABEL: Record<CircularKind, string> = { decision: "قرار", circular: "تعميم" };

const AT = (d: string) => new Date(`${d}T09:00:00`).getTime();

const SEED: Circular[] = [
  {
    id: "cir-1",
    kind: "decision",
    number: "14/1448",
    title: "تشكيل بعثة الحج لموسم 1448",
    body: "بناءً على الخطة التشغيلية لموسم 1448، تُشكَّل بعثة الحج من موظفي الإدارة الدائمين والمنتدبين المسجّلين في «المشاركون في الموسم»، ويُسند كل منهم إلى موقعه في الملفات التشغيلية.\nيلتزم كل موظف بما يُسند إليه من مهام، ويراجع «ملفاتي التشغيلية» في بوابة الموظفين لمعرفة موقعه ورحلتيه.",
    date: "2026-09-01",
    audience: { kind: "all" },
    status: "published",
    createdBy: "سامي حلاق (أبو سامي)",
    publishedAt: AT("2026-09-01"),
    publishedBy: "سامي حلاق (أبو سامي)",
    reads: { abusami: AT("2026-09-01"), "nour.a": AT("2026-09-02"), ghassan: AT("2026-09-03") },
  },
  {
    id: "cir-2",
    kind: "circular",
    number: "3/1448",
    title: "الدوام في المكتب خلال مدة التسجيل على الحج",
    body: "خلال مدة التسجيل على الحج يمتد الدوام في المكتب حتى الساعة الخامسة مساءً من الأحد إلى الخميس، ويُفتح المكتب يوم السبت من التاسعة حتى الثانية لاستقبال المراجعين.\nتُسجَّل الطلبات من «التسجيل على الحج» في البوابة، ولا يُقبل طلب ورقي.",
    date: "2026-09-10",
    audience: { kind: "all" },
    status: "published",
    createdBy: "سامي حلاق (أبو سامي)",
    publishedAt: AT("2026-09-10"),
    publishedBy: "سامي حلاق (أبو سامي)",
    reads: { abusami: AT("2026-09-10"), razan: AT("2026-09-11") },
  },
  {
    id: "cir-3",
    kind: "circular",
    number: "5/1448",
    title: "استلام الغرف في فنادق مكة المكرمة",
    body: "يستلم مشرف كل برج الغرف من إدارة الفندق قبل وصول أول فوج بيوم، ويتأكد من مطابقتها لكشف التسكين، ويرفع أي نقص إلى مدير شؤون البعثة فوراً.\nلا تُسلَّم غرفة لحاج قبل إدخاله في كشف التسكين.",
    date: "2026-10-01",
    audience: { kind: "files", files: ["makkah-housing"] },
    status: "published",
    createdBy: "سامي حلاق (أبو سامي)",
    publishedAt: AT("2026-10-01"),
    publishedBy: "سامي حلاق (أبو سامي)",
    reads: {},
  },
  {
    id: "cir-4",
    kind: "decision",
    number: "15/1448",
    title: "تسمية أعضاء لجنة التقييم",
    body: "يُسمّى أعضاء لجنة التقييم لموسم 1448 كما في ملف «لجنة التقييم»، وتتولى اللجنة البتّ في اعتراضات الإداريين واعتماد نتائجهم النهائية.",
    date: "2026-10-20",
    audience: { kind: "files", files: ["evaluation-committee"] },
    status: "draft",
    createdBy: "سامي حلاق (أبو سامي)",
  },
];

export function useCirculars(): Circular[] {
  return useStore((s) => s.staffCirculars) ?? SEED;
}

function patch(fn: (list: Circular[]) => Circular[]) {
  setState((s) => ({ ...s, staffCirculars: fn(s.staffCirculars ?? SEED) }));
}

export const circularActions = {
  save(c: Circular) {
    patch((list) => (list.some((x) => x.id === c.id) ? list.map((x) => (x.id === c.id ? c : x)) : [c, ...list]));
  },
  remove(id: string) {
    patch((list) => list.filter((x) => x.id !== id));
  },
  read(id: string, staffId: string) {
    patch((list) => list.map((x) => (x.id === id ? { ...x, reads: { ...x.reads, [staffId]: Date.now() } } : x)));
  },
};

export function audienceLabel(a: Audience, nameOf: (id: string) => string = (id) => id) {
  if (a.kind === "all") return "كل الموظفين";
  if (a.kind === "files") return `موظفو ${a.files.map((f) => FILE_TYPES.find((t) => t.code === f)?.short ?? f).join(" و")}`;
  return a.ids.map(nameOf).join("، ");
}

/** Who a circular is for: every staff account it reaches now (an operational file's people as posted this season) */
export function useAudience() {
  const accounts = useStaffAccounts();
  const employees = useEmployees();
  const files = useOpFiles();
  const places = usePlaces();
  const season = useMemo(() => files.filter((f) => f.season === CURRENT_SEASON), [files]);
  const reaches = useCallback(
    (c: Circular, user: StaffUser) => {
      const a = c.audience;
      if (a.kind === "all") return true;
      if (a.kind === "staff") return a.ids.includes(user.id);
      const employee = employees.find((e) => e.staffId === user.id);
      return !!employee && postingsOf(employee.id, season, places).some((p) => a.files.includes(p.type.code));
    },
    [employees, season, places],
  );
  const recipients = useCallback((c: Circular) => accounts.filter((u) => reaches(c, u)), [accounts, reaches]);
  return { reaches, recipients };
}

/** What the signed-in employee has been issued: published ones addressed to him, newest first */
export function useMyCirculars(user: StaffUser | null) {
  const list = useCirculars();
  const { reaches } = useAudience();
  return useMemo(() => (user ? list.filter((c) => c.status === "published" && reaches(c, user)).sort((a, b) => b.date.localeCompare(a.date)) : []), [list, reaches, user]);
}
