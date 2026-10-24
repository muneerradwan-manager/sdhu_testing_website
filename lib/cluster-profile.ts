"use client";

import { useMemo } from "react";
import { structureFacts } from "@/app/administrator/_lib/directory";
import { teamOf } from "@/app/administrator/_lib/directory-team";
import { useClusterRequests } from "@/app/administrator/_lib/formation";
import { branchOf, useCadre, useStructure } from "@/app/administrator/_lib/structure";
import { useClusters } from "./cms/content";
import { SEASON } from "./season";
import { coverOf, type Cluster } from "./data/clusters";
import { CURRENT_SEASON, useHotels, type Hotel } from "./ops";
import { useStore } from "./store";
import { formatRoomPrices, type RoomPrices } from "./rooms";
import { photosLabel } from "./group-profile";

/**
 * The part of a cluster's public page that belongs to the cluster itself: its programme, its housing,
 * its transport and its meals. The head writes it — but the page carries the administration's approval, so
 * nothing he writes reaches the pilgrims before the administration approves it.
 *
 * The hotels are not written: every fact about a hotel (its name, its area, its stars, its rooms, its amenities, its
 * place on the map and the distance from the mosque) is entered by the staff in «البيانات المرجعية»
 * (lib/ops Hotel). The head only picks the cluster's two hotels from that list, one in Makkah and one in Madinah.
 *
 * What he may NOT touch: the rating and the number of reviews (they come from the pilgrims), the
 * service level and the approval date (the administration's), and the groups (they join by contract).
 */
export type ClusterProfileFields = {
  specialty: string;
  about: string;
  /** The cluster's two hotels, picked from the reference list (lib/ops Hotel ids); empty: not picked yet */
  makkahHotelId: string;
  madinahHotelId: string;
  transport: string[];
  meals: string[];
  programs: string[];
  /** What each private room type adds per person */
  rooms: RoomPrices;
  /** Its main picture, at the top of its page and on its card */
  cover: string;
  /** Its photo gallery: the hotels, the camps, the buses, past seasons */
  gallery: string[];
};

export type ClusterProfileChange = {
  fields: ClusterProfileFields;
  at: number;
  by: string;
  note?: string;
};

export type ClusterProfileState = {
  /** Waiting for the administration */
  pending?: ClusterProfileChange;
  /** Live on the public page */
  approved?: ClusterProfileChange & { approvedAt: number; approvedBy: string };
  /** Sent back with a reason */
  rejected?: { at: number; by: string; reason: string; fields: ClusterProfileFields };
};

export const PROFILE_LABELS: Record<keyof ClusterProfileFields, string> = {
  specialty: "التخصص — سطر تحت الاسم",
  about: "نبذة عن التكتل",
  makkahHotelId: "فندق مكة",
  madinahHotelId: "فندق المدينة",
  transport: "النقل",
  meals: "الإعاشة",
  programs: "البرامج",
  rooms: "السكن الخاص — للفرد بحسب أسرّة الغرفة",
  cover: "الصورة الرئيسية",
  gallery: "معرض الصور",
};

/** The hotels a cluster may pick in a city: this season's live ones, from the staff's reference list */
export const hotelsIn = (hotels: Hotel[], city: Hotel["city"]) => hotels.filter((h) => h.season === CURRENT_SEASON && h.city === city && !h.archived);

/** The hotel a published programme names, by its name in the city: the seeded programmes name theirs in words */
const hotelIdOf = (name: string, city: Hotel["city"], hotels: Hotel[]) => hotelsIn(hotels, city).find((h) => h.name === name)?.id ?? "";

export function fieldsOf(c: Cluster, hotels: Hotel[]): ClusterProfileFields {
  return {
    specialty: c.specialty,
    about: c.about,
    makkahHotelId: hotelIdOf(c.makkah.hotel, "makkah", hotels),
    madinahHotelId: hotelIdOf(c.madinah.hotel, "madinah", hotels),
    transport: [...c.transport],
    meals: [...c.meals],
    programs: [...c.programs],
    rooms: { ...c.rooms },
    cover: coverOf(c),
    gallery: [...(c.gallery ?? [])],
  };
}

/** The cluster as its page shows it: the two hotels read whole from the reference list, whatever the programme said before */
export function withFields(c: Cluster, f: ClusterProfileFields, hotels: Hotel[]): Cluster {
  const mk = hotels.find((h) => h.id === f.makkahHotelId);
  const md = hotels.find((h) => h.id === f.madinahHotelId);
  return {
    ...c,
    specialty: f.specialty,
    about: f.about,
    makkah: mk ? { hotel: mk.name, area: mk.area, distance: mk.distance, rooms: mk.rooms ?? "", features: mk.features ?? [], at: mk.at, stars: mk.stars } : c.makkah,
    madinah: md ? { hotel: md.name, area: md.area, distance: md.distance, at: md.at, stars: md.stars } : c.madinah,
    transport: f.transport,
    meals: f.meals,
    programs: f.programs,
    rooms: f.rooms,
    cover: f.cover ?? c.cover,
    gallery: f.gallery ?? c.gallery ?? [],
  };
}

/** What changed between what the pilgrims see now and what the head submitted */
export function diffFields(before: ClusterProfileFields, after: ClusterProfileFields, hotels: Hotel[]) {
  return (Object.keys(PROFILE_LABELS) as (keyof ClusterProfileFields)[])
    .map((k) => {
      const show = (v: ClusterProfileFields[typeof k]) =>
        k === "rooms"
          ? formatRoomPrices(v as RoomPrices)
          : k === "gallery"
            ? photosLabel(((v as string[] | undefined) ?? []).length)
            : k === "cover"
              ? v
                ? "صورة"
                : ""
              : k === "makkahHotelId" || k === "madinahHotelId"
                ? (hotels.find((h) => h.id === v)?.name ?? "")
              : Array.isArray(v)
                ? v.join(" · ")
                : String(v ?? "");
      const a = show(before[k]);
      const b = show(after[k]);
      // A gallery whose photos changed but not their number still changed
      const changed = JSON.stringify(before[k] ?? []) !== JSON.stringify(after[k] ?? []);
      return { key: k, label: PROFILE_LABELS[k], before: a, after: b === a && changed ? `${b} (تغيّرت الصور)` : b, changed };
    })
    .filter((x) => x.changed);
}

/** A blank programme for an approved cluster that has none yet: its team writes it (app/administrator/(desk)/cluster-page) */
function blankProgramme(id: string, name: string, branch: string): Cluster {
  return {
    slug: id,
    name,
    since: SEASON.hijriYear,
    level: "اقتصادي",
    rating: 0,
    reviews: 0,
    governorate: branch,
    office: branch,
    specialty: "",
    about: "",
    approvedOn: "",
    groupsCount: 0,
    pilgrims: 0,
    makkah: { hotel: "", area: "", distance: "", rooms: "", features: [] },
    madinah: { hotel: "", area: "", distance: "" },
    transport: [],
    meals: [],
    programs: [],
    rooms: { 1: 0, 2: 0, 3: 0, 4: 0 },
    groups: [],
    tone: "green",
  };
}

/**
 * The programme of every approved cluster, as its team writes it and the administration approves it: the version
 * the content team published (lib/data/clusters), else a blank one. `listed`: it has a published programme — the
 * content team's, or one its team wrote and the administration approved — so it shows in the directory.
 */
export function useClusterProgrammes(): { cluster: Cluster; listed: boolean }[] {
  const clusters = useClusters();
  const profiles = useStore((s) => s.clusterProfiles);
  const requests = useClusterRequests();
  const cadre = useCadre();
  return useMemo(
    () =>
      requests
        .filter((r) => r.status === "approved" && !r.archived)
        .map((r) => {
          const own = clusters.find((c) => c.slug === r.cluster.id);
          const branch = branchOf(r.headId, cadre);
          return { cluster: own ?? blankProgramme(r.cluster.id, r.cluster.name, branch), listed: !!own || !!profiles[r.cluster.id]?.approved };
        }),
    [clusters, profiles, requests, cadre],
  );
}

/**
 * The clusters as the pilgrims see them: each published programme (the version its head published, once the
 * administration approved it), joined to the cluster's request in the administrators' platform under the same id —
 * its level, its groups with their heads and the seats left, and its people. Only clusters whose request is
 * approved (and not archived) and that have a published programme are in the directory.
 */
export function useClusterDirectory(): Cluster[] {
  const programmes = useClusterProgrammes();
  const profiles = useStore((s) => s.clusterProfiles);
  const admins = useStore((s) => s.admins);
  const requests = useClusterRequests();
  const structure = useStructure();
  const cadre = useCadre();
  const hotels = useHotels();
  return useMemo(
    () =>
      programmes.flatMap(({ cluster: c, listed }) => {
        const r = requests.find((x) => x.cluster.id === c.slug);
        if (!r || !listed) return [];
        // Its hotels are the staff's reference entries: a published programme names them, the approved one picks them
        const published = withFields(c, profiles[c.slug]?.approved ? { ...fieldsOf(c, hotels), ...profiles[c.slug].approved!.fields } : fieldsOf(c, hotels), hotels);
        return [{ ...published, ...structureFacts(structure, r), team: teamOf(structure, cadre, admins, r) }];
      }),
    [programmes, profiles, requests, structure, cadre, admins, hotels],
  );
}
