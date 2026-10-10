"use client";

import { useMemo } from "react";
import { useClockTime, useToday } from "../operations";
import { useStore } from "../store";
import { ACTIVE_SEASON } from "./defaults";
import { draftOf, liveVersion, pinnedVersion, regOf, scheduledVersions, seasonsOf, versionsOf } from "./engine";
import type { RegState } from "./types";

/** The registration state as stored, made whole */
export function useReg(): RegState {
  const r = useStore((s) => s.registration);
  return useMemo(() => regOf({ registration: r }), [r]);
}

/** "YYYY-MM-DDTHH:MM" on the platform's clock */
export function useNowKey() {
  const today = useToday();
  const time = useClockTime();
  return `${today}T${time}`;
}

/** The version new applications of the season start on now */
export function useLiveVersion(season: number = ACTIVE_SEASON) {
  const reg = useReg();
  const now = useNowKey();
  return useMemo(() => liveVersion(reg, season, now), [reg, season, now]);
}

/** The version an application or a draft keeps */
export function usePinnedVersion(id: string | undefined, season: number = ACTIVE_SEASON) {
  const reg = useReg();
  return useMemo(() => pinnedVersion(reg, id, season), [reg, id, season]);
}

export function useRegSeasons() {
  const reg = useReg();
  return useMemo(() => seasonsOf(reg), [reg]);
}

export function useSeasonVersions(season: number) {
  const reg = useReg();
  const now = useNowKey();
  return useMemo(() => ({ list: versionsOf(reg, season), live: liveVersion(reg, season, now), scheduled: scheduledVersions(reg, season, now) }), [reg, season, now]);
}

export function useDraft(season: number) {
  const reg = useReg();
  const now = useNowKey();
  return useMemo(() => draftOf(reg, season, now), [reg, season, now]);
}
