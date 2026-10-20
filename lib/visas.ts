import { simulateGroupFlights } from "./flights";
import { fullName } from "./registry";
import { actions, getState, setState, type PilgrimVisa } from "./store";

/**
 * التأشيرات: the Saudi foreign ministry emails each pilgrim's visa to his group; the technical coordinator sorted
 * to the group adds it to the pilgrim from the administrators' platform (a picture or a PDF of it, and its number).
 * Once every member of an application has his, its visa step is done: the family's flights, hotels and season open
 * in its portal. The demo's generated families keep theirs in `groupVisas`.
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
  actions.logEvent({ actor: visa.by, role: "المنسق التقني", action: "إضافة تأشيرة حاج", target: `طلب ${app.number}`, detail: `${member ? fullName(member.person) : personId} — ${visa.number}${complete ? " — اكتملت تأشيرات الطلب" : ""}` });
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
  actions.setPost(sid, { visas, visaAt: undefined });
  actions.logEvent({ actor: by, role: "المنسق التقني", action: "حذف تأشيرة حاج", target: `طلب ${app.number}` });
}

/** A visa of a generated family's member (one that is not an application on this device) */
export function setGroupVisa(personId: string, name: string, visa: PilgrimVisa | null, by: string) {
  setState((s) => {
    const next = { ...s.groupVisas };
    if (visa) next[personId] = visa;
    else delete next[personId];
    return { ...s, groupVisas: next };
  });
  actions.logEvent({ actor: by, role: "المنسق التقني", action: visa ? "إضافة تأشيرة حاج" : "حذف تأشيرة حاج", target: name, detail: visa?.number });
}

/** A visa number in the ministry's pattern, for the demo's simulated email */
export const demoVisaNumber = (appNumber: string | number, i: number) => `HV-1448-${appNumber}-${i + 1}`;
