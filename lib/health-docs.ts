import { fullName } from "./registry";
import { actions, getState, type HealthDoc, type HealthDocKind } from "./store";

/**
 * الوثائق الصحية: the Ministry of Health certifies each pilgrim before Hajj — fit, every vaccine taken, or with a
 * condition — and some carry prescriptions or reports of a condition. The administration adds them to the pilgrim
 * from the administrators' platform: his group's head, or the coordinator its cluster sorted to the group. They
 * show in the pilgrim's «خزنة الوثائق», and every one is written to the events log on his application.
 */

export const HEALTH_KIND: Record<HealthDocKind, { label: string; one: string }> = {
  certificate: { label: "الشهادة الصحية — وزارة الصحة", one: "الشهادة الصحية" },
  prescription: { label: "وصفة طبية", one: "وصفة طبية" },
  condition: { label: "تقرير حالة صحية", one: "تقرير حالة صحية" },
};

export function addHealthDoc(sid: string, personId: string, doc: HealthDoc) {
  const { applications, post } = getState();
  const app = applications[sid];
  const p = post[sid];
  if (!app || !p) return;
  const list = p.healthDocs?.[personId] ?? [];
  // One certificate a pilgrim: a new one takes the old one's place
  const next = doc.kind === "certificate" ? [doc, ...list.filter((d) => d.kind !== "certificate")] : [...list, doc];
  actions.setPost(sid, { healthDocs: { ...p.healthDocs, [personId]: next } });
  const member = app.members.find((m) => m.person.id === personId);
  const what = doc.kind === "certificate" ? `${HEALTH_KIND.certificate.one}: ${doc.fit ? "سليم ولقاحاته مكتملة" : `حالة صحية — ${doc.note ?? ""}`}` : `${HEALTH_KIND[doc.kind].one}${doc.note ? `: ${doc.note}` : ""}`;
  actions.logEvent({ actor: doc.by.name, role: doc.by.role, action: "إضافة وثيقة صحية لحاج", target: `طلب ${app.number}`, detail: `${member ? fullName(member.person) : personId} — ${what}${doc.name ? ` — الملف ${doc.name}` : ""}` });
}

/** Take a health document back (a wrong file) */
export function removeHealthDoc(sid: string, personId: string, id: string, by: { name: string; role: string }) {
  const { applications, post } = getState();
  const app = applications[sid];
  const p = post[sid];
  const list = p?.healthDocs?.[personId];
  if (!app || !p || !list) return;
  const doc = list.find((d) => d.id === id);
  actions.setPost(sid, { healthDocs: { ...p.healthDocs, [personId]: list.filter((d) => d.id !== id) } });
  const member = app.members.find((m) => m.person.id === personId);
  actions.logEvent({ actor: by.name, role: by.role, action: "حذف وثيقة صحية لحاج", target: `طلب ${app.number}`, detail: `${member ? fullName(member.person) : personId} — ${doc ? HEALTH_KIND[doc.kind].one : ""}` });
}
