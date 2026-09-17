"use client";

import { useMemo } from "react";
import type { SeasonRules } from "./rules";
import { SEASON } from "./season";
import { useStore, type SeasonOverrides } from "./store";

export type LiveSeason = {
  rules: SeasonRules;
  quota: number;
  directShare: number;
  directSeats: number;
  lotterySeats: number;
  acceptedDirectAge: number;
  fees: { registrationPerPerson: number; hajjCost: number; hady: number; privateRoomDiff: number; administratorRegistration: number; groupFormation: number; clusterFormation: number };
  overridden: (keyof SeasonOverrides)[];
};

/** Pure merge — usable outside React (e.g. to evaluate seeded applications) */
export function mergeSeason(o: SeasonOverrides): LiveSeason {
  const quota = o.quota ?? SEASON.quota;
  const directShare = o.directShare ?? SEASON.directShare;
  const directSeats = Math.round(quota * directShare);
  return {
    rules: {
      applicantMaxBirthYear: o.applicantMaxBirthYear ?? SEASON.rules.applicantMaxBirthYear,
      companionMaxBirthYear: o.companionMaxBirthYear ?? SEASON.rules.companionMaxBirthYear,
      womanNeedsMahramMinBirthYear: o.womanNeedsMahramMinBirthYear ?? SEASON.rules.womanNeedsMahramMinBirthYear,
      elderlyNeedsCompanionMaxBirthYear: o.elderlyNeedsCompanionMaxBirthYear ?? SEASON.rules.elderlyNeedsCompanionMaxBirthYear,
      maxCompanions: o.maxCompanions ?? SEASON.rules.maxCompanions,
      maxCompanionsFamily: o.maxCompanionsFamily ?? SEASON.rules.maxCompanionsFamily,
    },
    quota,
    directShare,
    directSeats,
    lotterySeats: quota - directSeats,
    acceptedDirectAge: o.acceptedDirectAge ?? SEASON.acceptedDirectAge,
    fees: {
      ...SEASON.fees,
      registrationPerPerson: o.registrationPerPerson ?? SEASON.fees.registrationPerPerson,
      hajjCost: o.hajjCost ?? SEASON.fees.hajjCost,
      hady: o.hady ?? SEASON.fees.hady,
    },
    overridden: Object.keys(o) as (keyof SeasonOverrides)[],
  };
}

/** Season settings as currently configured by the season director (defaults from SEASON) */
export function useSeason(): LiveSeason {
  const overrides = useStore((s) => s.season);
  return useMemo(() => mergeSeason(overrides), [overrides]);
}
