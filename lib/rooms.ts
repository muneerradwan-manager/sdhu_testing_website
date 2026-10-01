/**
 * Where the pilgrims sleep. By default the shared accommodation: the men in their rooms and the women in
 * theirs, at no extra cost. A request may ask instead for private rooms of its own, spread as the family likes
 * so that every member has a bed: a single room with its own bathroom, or rooms of two, three or four beds —
 * four people in one room of four or in two rooms of two, six in two rooms of three. The fewer the beds in a
 * room, the dearer each bed: every cluster sets what each room type adds per person.
 */

export type RoomBeds = 1 | 2 | 3 | 4;

/** What each private room type adds per person, in dollars, by its number of beds */
export type RoomPrices = Record<RoomBeds, number>;

/** How many rooms of each type a request asks for */
export type RoomCounts = Record<RoomBeds, number>;

export const ROOM_BEDS: RoomBeds[] = [1, 2, 3, 4];

export const ROOM_LABEL: Record<RoomBeds, string> = {
  1: "غرفة مفردة بسرير واحد وحمّامها",
  2: "غرفة بسريرين",
  3: "غرفة بثلاثة أسرّة",
  4: "غرفة بأربعة أسرّة",
};

export const ROOM_SHORT: Record<RoomBeds, string> = { 1: "مفردة", 2: "سريران", 3: "ثلاثة أسرّة", 4: "أربعة أسرّة" };

export const GENERAL_LABEL = "السكن العام";
export const GENERAL_DETAIL = "الرجال وحدهم والنساء وحدهن — دون كلفة إضافية";

export type Accommodation = { kind: "general" } | { kind: "private"; rooms: RoomCounts };

export const NO_ROOMS: RoomCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };

/** The beds the rooms hold: one per member when the rooms fit the request */
export function bedsOf(r: RoomCounts) {
  return ROOM_BEDS.reduce((a, b) => a + b * r[b], 0);
}

export function roomsOf(r: RoomCounts) {
  return ROOM_BEDS.reduce((a, b) => a + r[b], 0);
}

/** The fewest rooms for a request: rooms of four, then one room for the rest */
export function defaultRooms(people: number): RoomCounts {
  const r = { ...NO_ROOMS, 4: Math.floor(people / 4) };
  const rest = people % 4;
  if (rest) r[rest as RoomBeds] += 1;
  return r;
}

const KIND: Record<RoomBeds, string> = { 1: "مفردة", 2: "بسريرين", 3: "بثلاثة أسرّة", 4: "بأربعة أسرّة" };

function roomsPhrase(beds: RoomBeds, count: number) {
  if (count === 1) return `غرفة ${KIND[beds]}`;
  if (count === 2) return beds === 1 ? "غرفتان مفردتان" : `غرفتان ${KIND[beds]}`;
  return `${count} غرف ${KIND[beds]}`;
}

/** "غرفة بأربعة أسرّة وغرفة بسريرين", from the largest room to the smallest */
export function describeRooms(r: RoomCounts) {
  return [...ROOM_BEDS]
    .reverse()
    .filter((b) => r[b] > 0)
    .map((b) => roomsPhrase(b, r[b]))
    .join(" و");
}

/** A saved choice as it can be read: anything without rooms (an earlier one-room choice) is the shared accommodation */
export function readAccommodation(a: Accommodation | undefined): Accommodation {
  return a?.kind === "private" && a.rooms ? a : { kind: "general" };
}

/** What a request's accommodation adds with a cluster's prices; the shared accommodation adds nothing */
export function accommodationCost(saved: Accommodation | undefined, prices: RoomPrices) {
  const a = readAccommodation(saved);
  if (a.kind === "general") return null;
  const parts = [...ROOM_BEDS]
    .reverse()
    .filter((b) => a.rooms[b] > 0)
    .map((b) => ({ beds: b, count: a.rooms[b], people: b * a.rooms[b], perPerson: prices[b], amount: b * a.rooms[b] * prices[b] }));
  return { rooms: a.rooms, parts, amount: parts.reduce((s, p) => s + p.amount, 0) };
}

/** "4 × 50 $ + 2 × 175 $": each room type's beds at its price per person */
export function costBreakdown(parts: NonNullable<ReturnType<typeof accommodationCost>>["parts"]) {
  return parts.map((p) => `${p.people} × ${p.perPerson.toLocaleString("en-US")} $`).join(" + ");
}

/** The four prices on one line, for comparisons and change logs */
export function formatRoomPrices(p: RoomPrices) {
  return ROOM_BEDS.map((b) => `${ROOM_SHORT[b]} ${p[b]} $`).join(" · ");
}

/** "From … to …" per person, from the four-bed room to the single */
export function priceRange(p: RoomPrices) {
  return { from: p[4], to: p[1] };
}
