/**
 * Demo data for creating an account: for each situation of a pilgrim, and for each role an administrator applies
 * for, a citizen of the simulated civil registry who fits it — gender and year of birth — and has no account yet
 * on this device. Pressing its card fills the form (national ID, first name, phone, password); the rest of the way
 * (the code, the civil registry) is the platform's own. The people are found, not written: each card searches its
 * own run of national numbers for the first fitting citizen, so they stay the same on every device.
 */
import { getPerson, type Gender, type Person } from "./registry";
import DATA from "@/testdata/demo/signups.json";

export type SignupDemo = { key: string; title: string; note: string; person: Person; phone: string; password: string; section?: string };

type Want = { key: string; title: string; note: string; gender: Gender; born: [number, number]; section?: string };

/** The first fitting, generated citizen in `prefix`'s run of numbers (prefix: 7 digits) that is not taken */
function find(prefix: string, w: Want, taken: (id: string) => boolean): Person | null {
  for (let k = 0; k < 10_000; k++) {
    const id = `${prefix}${String(k).padStart(4, "0")}`;
    const p = getPerson(id);
    if (!p?.generated || p.gender !== w.gender || taken(id)) continue;
    const y = Number(p.birthDate.slice(0, 4));
    if (y >= w.born[0] && y <= w.born[1]) return p;
  }
  return null;
}

const phoneOf = (id: string) => `0944${id.slice(-6)}`;

/** The cards, each list with its run of national numbers and its password (testdata/demo/signups.json) */
const SIGNUPS = DATA as { example: { key: string; id: string; title: string; note: string; password: string }; pilgrims: Cards; members: Cards; admins: Cards };
type Cards = { prefix: string; password: string; cards: Want[] };

function build({ cards, prefix, password }: Cards, taken: (id: string) => boolean): SignupDemo[] {
  return cards.flatMap((w, i) => {
    const person = find(`${prefix}${String(i).padStart(2, "0")}`, w, taken);
    return person ? [{ key: w.key, title: w.title, note: w.note, section: w.section, person, phone: phoneOf(person.id), password }] : [];
  });
}

/** The pilgrims' cards: the guides' full example first (محمد الخطيب), then one citizen for each situation */
export function pilgrimSignups(taken: (id: string) => boolean): SignupDemo[] {
  const { id, ...card } = SIGNUPS.example;
  const example = getPerson(id)!;
  const first: SignupDemo[] = taken(example.id) ? [] : [{ ...card, person: example, phone: phoneOf(example.id) }];
  return [...first, ...build(SIGNUPS.pilgrims, taken)];
}

/** The members' cards: people who register for nothing this season */
export function memberSignups(taken: (id: string) => boolean): SignupDemo[] {
  return build(SIGNUPS.members, taken);
}

/** The administrators' cards: one citizen for every role open for application */
export function adminSignups(taken: (id: string) => boolean): SignupDemo[] {
  return build(SIGNUPS.admins, taken);
}
