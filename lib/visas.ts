import { simulateGroupFlights } from "./flights";
import { fullName } from "./registry";
import { actions, getState, type PilgrimVisa } from "./store";

/**
 * التأشيرات: the Saudi foreign ministry emails each pilgrim's visa to his group's head, who adds it to the pilgrim
 * from the administrators' platform (a picture or a PDF of it, and its number). Once every member of an
 * application has his, its visa step is done: the family's flights, hotels and season open in its portal.
 */
export function addVisa(sid: string, personId: string, visa: PilgrimVisa) {
  const { applications, post, admins } = getState();
  const app = applications[sid];
  const p = post[sid];
  if (!app || !p) return { complete: false };
  const visas = { ...p.visas, [personId]: visa };
  const complete = app.members.every((m) => visas[m.person.id]);
  actions.setPost(sid, { visas, ...(complete && !p.visaAt ? { visaAt: visa.at } : {}) });
  const member = app.members.find((m) => m.person.id === personId);
  actions.logEvent({ actor: visa.by, role: "رئيس المجموعة", action: "إضافة تأشيرة حاج", target: `طلب ${app.number}`, detail: `${member ? fullName(member.person) : personId} — ${visa.number}${complete ? " — اكتملت تأشيرات الطلب" : ""}` });
  // the family travels with its group: on the group's flights, as its cluster's head put it on them
  if (complete && !p.visaAt) simulateGroupFlights(sid, app, { ...p, visas }, admins, post, applications);
  return { complete };
}

/** Take a visa back (a wrong file): the step opens again until it is added */
export function removeVisa(sid: string, personId: string, by: string) {
  const { applications, post } = getState();
  const app = applications[sid];
  const p = post[sid];
  if (!app || !p?.visas?.[personId]) return;
  const visas = { ...p.visas };
  delete visas[personId];
  actions.setPost(sid, { visas });
  actions.logEvent({ actor: by, role: "رئيس المجموعة", action: "حذف تأشيرة حاج", target: `طلب ${app.number}` });
}

/** A visa number in the ministry's pattern, for the demo's simulated email */
export const demoVisaNumber = (appNumber: string | number, i: number) => `HV-1448-${appNumber}-${i + 1}`;
