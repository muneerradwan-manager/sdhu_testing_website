"use client";

import { useMemo } from "react";
import { structureFacts } from "@/app/administrator/_lib/directory";
import { teamOf } from "@/app/administrator/_lib/directory-team";
import { useClusterRequests } from "@/app/administrator/_lib/formation";
import { useCadre, useStructure } from "@/app/administrator/_lib/structure";
import { useClusters } from "./cms/content";
import type { Cluster } from "./data/clusters";
import { useStore } from "./store";
import { formatRoomPrices, type RoomPrices } from "./rooms";

/**
 * The part of a cluster's public page that belongs to the cluster itself: its programme, its housing,
 * its transport and its meals. The head writes it, because he is the one who contracted the hotels and
 * the buses — but the page carries the administration's approval, so nothing he writes reaches the
 * pilgrims before the administration approves it.
 *
 * What he may NOT touch: the rating and the number of reviews (they come from the pilgrims), the
 * service level and the approval date (the administration's), and the groups (they join by contract).
 */
export type ClusterProfileFields = {
  specialty: string;
  about: string;
  makkahHotel: string;
  makkahArea: string;
  makkahDistance: string;
  makkahRooms: string;
  makkahFeatures: string[];
  madinahHotel: string;
  madinahArea: string;
  madinahDistance: string;
  transport: string[];
  meals: string[];
  programs: string[];
  /** What each private room type adds per person */
  rooms: RoomPrices;
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
  makkahHotel: "فندق مكة",
  makkahArea: "منطقة السكن في مكة",
  makkahDistance: "المسافة عن الحرم",
  makkahRooms: "نوع الغرف",
  makkahFeatures: "مزايا سكن مكة",
  madinahHotel: "فندق المدينة",
  madinahArea: "منطقة السكن في المدينة",
  madinahDistance: "المسافة عن المسجد النبوي",
  transport: "النقل",
  meals: "الإعاشة",
  programs: "البرامج",
  rooms: "السكن الخاص — للفرد بحسب أسرّة الغرفة",
};

export function fieldsOf(c: Cluster): ClusterProfileFields {
  return {
    specialty: c.specialty,
    about: c.about,
    makkahHotel: c.makkah.hotel,
    makkahArea: c.makkah.area,
    makkahDistance: c.makkah.distance,
    makkahRooms: c.makkah.rooms,
    makkahFeatures: [...c.makkah.features],
    madinahHotel: c.madinah.hotel,
    madinahArea: c.madinah.area,
    madinahDistance: c.madinah.distance,
    transport: [...c.transport],
    meals: [...c.meals],
    programs: [...c.programs],
    rooms: { ...c.rooms },
  };
}

export function withFields(c: Cluster, f: ClusterProfileFields): Cluster {
  return {
    ...c,
    specialty: f.specialty,
    about: f.about,
    makkah: { hotel: f.makkahHotel, area: f.makkahArea, distance: f.makkahDistance, rooms: f.makkahRooms, features: f.makkahFeatures },
    madinah: { hotel: f.madinahHotel, area: f.madinahArea, distance: f.madinahDistance },
    transport: f.transport,
    meals: f.meals,
    programs: f.programs,
    rooms: f.rooms,
  };
}

/** What changed between what the pilgrims see now and what the head submitted */
export function diffFields(before: ClusterProfileFields, after: ClusterProfileFields) {
  return (Object.keys(PROFILE_LABELS) as (keyof ClusterProfileFields)[])
    .map((k) => {
      const show = (v: ClusterProfileFields[typeof k]) => (k === "rooms" ? formatRoomPrices(v as RoomPrices) : Array.isArray(v) ? v.join(" · ") : String(v));
      const a = show(before[k]);
      const b = show(after[k]);
      return { key: k, label: PROFILE_LABELS[k], before: a, after: b, changed: a !== b };
    })
    .filter((x) => x.changed);
}

/**
 * The clusters as the pilgrims see them: each published programme (the version its head published, once the
 * administration approved it), joined to the cluster's request in the administrators' platform under the same id —
 * its level, its groups with their heads and the seats left, and its people. Only clusters whose request is
 * approved (and not archived) are in the directory.
 */
export function useClusterDirectory(): Cluster[] {
  const clusters = useClusters();
  const profiles = useStore((s) => s.clusterProfiles);
  const admins = useStore((s) => s.admins);
  const requests = useClusterRequests();
  const structure = useStructure();
  const cadre = useCadre();
  return useMemo(
    () =>
      clusters.flatMap((c) => {
        const r = requests.find((x) => x.cluster.id === c.slug && x.status === "approved" && !x.archived);
        if (!r) return [];
        const published = profiles[c.slug]?.approved ? withFields(c, profiles[c.slug].approved!.fields) : c;
        return [{ ...published, ...structureFacts(structure, r), team: teamOf(structure, cadre, admins, r) }];
      }),
    [clusters, profiles, requests, structure, cadre, admins],
  );
}
