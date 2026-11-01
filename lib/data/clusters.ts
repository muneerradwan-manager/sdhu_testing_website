/**
 * Approved service clusters (التكتلات) for season 1448, their published programmes,
 * known unapproved "campaigns", and the digital documents the platform issues.
 * All fictional. Room numbers and pilgrim names are operational data and never appear here.
 * The data itself is in testdata/clusters/ (programmes, hotels on the map, covers, galleries, unapproved entities,
 * issued documents); this module types it and holds the helpers.
 */

import { getPerson } from "@/lib/registry";
import PROGRAMMES from "@/testdata/clusters/programmes.json";
import HOTEL_LOCATIONS from "@/testdata/clusters/hotel-locations.json";
import COVERS from "@/testdata/clusters/covers.json";
import GALLERIES from "@/testdata/clusters/galleries.json";
import UNAPPROVED_ENTITIES from "@/testdata/clusters/unapproved.json";
import ISSUED_DOCUMENTS from "@/testdata/clusters/documents.json";
import type { RoomPrices } from "../rooms";

export type LatLng = { lat: number; lng: number };

/** The two mosques the hotels are measured from */
export const HARAM: LatLng = { lat: 21.4225, lng: 39.8262 };
export const NABAWI: LatLng = { lat: 24.4672, lng: 39.6111 };

/** The administration's three tiers, for the clusters and their groups alike (a group is in its cluster's tier) */
export type ServiceLevel = "اقتصادي" | "اقتصادي محسن" | "خمس نجوم";

export type ClusterGroup = { no: number; leader: string; capacity: number; remaining: number };

/**
 * One of the cluster's administrators as the public may know him: his place in the cluster, his role this season,
 * his experience on the platform and the rating of his last season, and his phone for the pilgrims to call — except
 * the female religious guides'. Never his id or his age.
 */
export type TeamMember = { id: string; name: string; post: string; role: string; seasons: number; rating: number | null; branch: string; female?: boolean; phone?: string; photo?: string };

/** A group as the public page shows it: its head, the guides and assistants in its seats, and the cluster's coordinator and female guide sorted to it */
export type TeamGroup = { no: number; category: string; capacity: number; pilgrims: number; own: boolean; head: TeamMember; guides: TeamMember[]; assistants: TeamMember[]; coordinator?: string; femaleGuide?: string };

/** The cluster's people, read from its approved request in the administrators' platform */
export type ClusterTeam = {
  tier: string;
  head: TeamMember;
  accountant?: TeamMember;
  assistants: TeamMember[];
  coordinators: TeamMember[];
  femaleGuides: TeamMember[];
  groups: TeamGroup[];
  /** Everyone in the cluster's cadre, each once */
  size: number;
  badges: { age: boolean; guidance: boolean; timeliness: boolean };
  ageAvg: number | null;
};

export type Cluster = {
  slug: string;
  name: string;
  since: number;
  /** The cluster's tier, from its approved request: اقتصادي، اقتصادي محسن، خمس نجوم */
  level: ServiceLevel;
  rating: number;
  reviews: number;
  governorate: string;
  office: string;
  specialty: string;
  about: string;
  approvedOn: string;
  /** Its groups and their pilgrims, from its approved request */
  groupsCount: number;
  pilgrims: number;
  /** The hotels as the staff's reference list gives them (lib/ops Hotel): `at` the hotel on the map, `stars` its rating */
  makkah: { hotel: string; area: string; distance: string; rooms: string; features: string[]; at?: LatLng; stars?: number };
  madinah: { hotel: string; area: string; distance: string; at?: LatLng; stars?: number };
  transport: string[];
  meals: string[];
  programs: string[];
  /** What each private room type adds per person (the shared accommodation adds nothing) — see lib/rooms */
  rooms: RoomPrices;
  /** Its main picture, at the top of its page and on its card (else the seeded one, coverOf) */
  cover?: string;
  /** Its photo gallery, as its team published it (images of the site or uploaded to the media library) */
  gallery?: string[];
  /** Its groups with their heads and the seats left, from its approved request */
  groups: ClusterGroup[];
  tone: "green" | "gold" | "maroon";
  /** Its head, accountant and cadre, from its approved request («التكتلات والمجموعات» and its pages) */
  team?: ClusterTeam;
};

/**
 * What the content team publishes of a cluster: its programme. Its tier, groups and people are not written here:
 * they come from its approved request in the administrators' platform (app/administrator/_lib/directory), under
 * the same id, so the directory never shows a head or a group the administrators do not have.
 */
export type ClusterProgramme = Omit<Cluster, "level" | "groupsCount" | "pilgrims" | "groups" | "team">;

/** The seeded clusters' hotels on the map, as far from the two mosques as their programmes say */
export const CLUSTER_HOTELS: Record<string, { makkah: LatLng; madinah: LatLng }> = HOTEL_LOCATIONS;

/** The seeded clusters' main pictures, until their teams choose theirs */
export const CLUSTER_COVER: Record<string, string> = COVERS;

/** A cluster's main picture: its team's, else the seeded one, else the Kaaba */
export const coverOf = (c: { slug: string; cover?: string }) => c.cover || CLUSTER_COVER[c.slug] || "/images/kaaba-hajj.jpg";

/** The seeded clusters' galleries: the site's own pictures, until their teams upload theirs */
export const CLUSTER_GALLERY: Record<string, string[]> = GALLERIES;

export const CLUSTERS: ClusterProgramme[] = PROGRAMMES as ClusterProgramme[];

export type UnapprovedEntity = { name: string; claims: string[]; reports: number };

export const UNAPPROVED: UnapprovedEntity[] = UNAPPROVED_ENTITIES;

export const HOTLINE = "9449";

/** Arabic-insensitive normalisation for name search */
export function normalizeArabic(s: string) {
  return s
    .trim()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

export type EntityMatch<C extends ClusterProgramme = Cluster> = { kind: "approved"; cluster: C } | { kind: "unapproved"; entity: UnapprovedEntity } | { kind: "unknown"; query: string };

/** `clusters`: «التكتلات والمجموعات» — the approved clusters only, as the administrators' platform holds them */
export function findEntity<C extends ClusterProgramme>(query: string, clusters: C[]): EntityMatch<C> {
  const q = normalizeArabic(query);
  if (!q) return { kind: "unknown", query };
  const cluster = clusters.find((c) => normalizeArabic(c.name) === q) ?? clusters.find((c) => q.length >= 3 && normalizeArabic(c.name).includes(q));
  if (cluster) return { kind: "approved", cluster };
  const entity = UNAPPROVED.find((u) => normalizeArabic(u.name) === q) ?? UNAPPROVED.find((u) => q.length >= 3 && normalizeArabic(u.name).includes(q));
  if (entity) return { kind: "unapproved", entity };
  return { kind: "unknown", query };
}

export function suggestEntities(query: string, clusters: ClusterProgramme[]) {
  const q = normalizeArabic(query);
  const all = [...clusters.map((c) => c.name), ...UNAPPROVED.map((u) => u.name)];
  if (!q) return all.slice(0, 5);
  return all.filter((n) => normalizeArabic(n).includes(q)).slice(0, 6);
}

// ───────────────────────── Documents ─────────────────────────

export type IssuedDocument = {
  number: string;
  type: string;
  kind: "receipt" | "certificate";
  amount?: number;
  date: string;
  holder: string;
  detail: string;
};

/** «محمد أ. الخ•••»: a document shows its holder's name masked, from his civil record (testdata/people/citizens.json) */
function masked(id: string) {
  const p = getPerson(id);
  return p ? `${p.firstName} ${[...p.fatherName][0]}. ${[...p.lastName].slice(0, 3).join("")}•••` : "";
}

export const DOCUMENTS: IssuedDocument[] = (ISSUED_DOCUMENTS as (Omit<IssuedDocument, "holder"> & { holderId: string })[]).map(({ holderId, ...d }) => ({ ...d, holder: masked(holderId) }));

export function findDocument(no: string) {
  const n = no.trim().toUpperCase().replace(/\s+/g, "").replace(/[–—_]/g, "-");
  return DOCUMENTS.find((d) => d.number === n) ?? null;
}
