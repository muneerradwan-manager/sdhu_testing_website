import { withStaffNames } from "@/lib/staff";
import HOTELS from "@/testdata/ops/hotels.json";
import SECTORS from "@/testdata/ops/sectors.json";
import CENTERS from "@/testdata/ops/centers.json";
import CAMPS from "@/testdata/ops/camps.json";
import FILES_RAW from "@/testdata/ops/files.json";
import type { Camp, Center, Hotel, OpFile, Sector } from "../ops";

const FILES = withStaffNames(FILES_RAW);

/**
 * Reference data and the operational files for two seasons, so the demo shows what changes from one
 * year to the next: 1447 (ended) and 1448 (drafts still being staffed, with a few posts left empty).
 * Files: Makkah housing (sectors → towers), Madinah housing (hotels), Mina camps and Arafat camps
 * (centres → camps), and the teams with no places (the flights' supervisors, the evaluation committee).
 * The seven cluster hotels match testdata/clusters (their stars, rooms, amenities and place on the map are
 * what their clusters' pages said) and camp 42 in Mina matches lib/journey.ts; every other name is invented.
 * The data is in testdata/ops/: the files hold their posts by employee id (lib/data/employees-seed.ts) and the
 * places by the reference lists' ids. 1448's drafts leave required posts empty on purpose (the fifth sector's
 * head, two of its towers' supervisors, Mina's centre 16 and camps 55–56, Arafat's camp 123).
 */

export const HOTELS_SEED: Hotel[] = HOTELS as Hotel[];

export const SECTORS_SEED: Sector[] = SECTORS;

export const CENTERS_SEED: Center[] = CENTERS as Center[];

export const CAMPS_SEED: Camp[] = CAMPS as Camp[];

export const FILES_SEED: OpFile[] = FILES as OpFile[];
