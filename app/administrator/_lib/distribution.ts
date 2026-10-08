/**
 * Distributing a cluster's coordinators and its female guides and murshidas on its groups. Each of them carries
 * groups up to his role's quota of units, and no more: a group weighs its category's units (الأولى 1 … الرابعة 4),
 * and the quota is the tier's — one coordinator for every `perCoordinator` units, one female guide for every
 * `perGuide`. A group has one coordinator and one female guide; a person takes as many groups as his units allow.
 * Kept free of imports, so the season's seeded clusters are distributed by the same rule.
 */

/** A group as the distribution weighs it */
export type Unit = { number: number; units: number };

/** The units a person carries: the groups put on him, by their categories */
export function loadOf(groups: Unit[], map: Record<number, string>, id: string) {
  return groups.reduce((n, g) => n + (map[g.number] === id ? g.units : 0), 0);
}

/** Whether this group can go to this person without taking him over his quota (his own group counted once) */
export function fits(groups: Unit[], map: Record<number, string>, id: string, group: Unit, quota: number) {
  return loadOf(groups, map, id) - (map[group.number] === id ? group.units : 0) + group.units <= quota;
}

/** The heaviest groups first, each on whoever has the most room left (`spread`) or the least that still takes it (`pack`) */
function place(groups: Unit[], people: string[], quota: number, how: "spread" | "pack") {
  const map: Record<number, string> = {};
  const left: number[] = [];
  const load = new Map(people.map((id) => [id, 0]));
  for (const g of [...groups].sort((a, b) => b.units - a.units || a.number - b.number)) {
    const room = people.filter((id) => load.get(id)! + g.units <= quota).sort((a, b) => (how === "spread" ? 1 : -1) * (load.get(a)! - load.get(b)!));
    if (!room.length) {
      left.push(g.number);
      continue;
    }
    map[g.number] = room[0];
    load.set(room[0], load.get(room[0])! + g.units);
  }
  return { map, left };
}

/**
 * Puts every group on someone within the quota, spread evenly when that fits, packed when it is the only way.
 * Returns who takes each group, and the groups no one's quota can take.
 */
export function distribute(groups: Unit[], people: string[], quota: number): { map: Record<number, string>; left: number[] } {
  const spread = place(groups, people, quota, "spread");
  if (!spread.left.length) return spread;
  const packed = place(groups, people, quota, "pack");
  return packed.left.length < spread.left.length ? packed : spread;
}

/**
 * How many a cluster needs of a role carried by units: the tier's count, one for every `per` units of the sum
 * (rounded, as the administration set it — none when it rounds to none), and never fewer than can carry every
 * group within the quota.
 */
export function peopleFor(units: number[], per: number) {
  if (per <= 0) return 0;
  const count = Math.round(units.reduce((a, b) => a + b, 0) / per);
  if (count === 0) return 0;
  const groups = units.map((u, i) => ({ number: i, units: u }));
  for (let k = count; k < units.length; k++) {
    if (!distribute(groups, Array.from({ length: k }, (_, i) => String(i)), per).left.length) return k;
  }
  return Math.max(count, units.length);
}
