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
  fees: { registrationPerPerson: number; hajjCost: number; firstInstallment: number; installmentCount: 1 | 2; hady: number; privateRoomDiff: number; administratorRegistration: number; groupFormation: number; clusterFormation: number };
  administrators: { keepRoleMinRating: number; clusterCount: number; clusterHeadSeasons: number; clusterHeadMinRating: number; deputySeasons: number };
  documents: Record<string, number>;
  /** End-of-season classification: the shares that move between tiers, and how many are honoured */
  grading: { tiers: typeof SEASON.grading.tiers; promoteShare: number; demoteShare: number; honorTop: number; entryTier: number };
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
      firstInstallment: Math.min(o.firstInstallment ?? SEASON.fees.firstInstallment, o.hajjCost ?? SEASON.fees.hajjCost),
      installmentCount: (o.installmentCount ?? SEASON.installments.count) === 1 ? 1 : 2,
      hady: o.hady ?? SEASON.fees.hady,
      administratorRegistration: o.administratorRegistration ?? SEASON.fees.administratorRegistration,
      groupFormation: o.groupFormation ?? SEASON.fees.groupFormation,
      clusterFormation: o.clusterFormation ?? SEASON.fees.clusterFormation,
    },
    administrators: {
      keepRoleMinRating: o.keepRoleMinRating ?? SEASON.administrators.keepRole.minRating,
      clusterCount: o.clusterCount ?? SEASON.administrators.clusters.count,
      clusterHeadSeasons: o.clusterHeadSeasons ?? SEASON.administrators.clusters.candidacy.consecutiveSeasons,
      clusterHeadMinRating: o.clusterHeadMinRating ?? SEASON.administrators.clusters.candidacy.minRating,
      deputySeasons: o.deputySeasons ?? SEASON.administrators.clusters.deputySeasons,
    },
    /** How long each administrator document stays valid, in seasons (0 = never expires) */
    documents: {
      degree: 0,
      "first-aid": o.firstAidValidSeasons ?? 3,
      record: o.recordValidSeasons ?? 1,
      recommendation: o.recommendationValidSeasons ?? 2,
    } as Record<string, number>,
    grading: {
      ...SEASON.grading,
      promoteShare: (o.promoteShare ?? SEASON.grading.promoteShare * 100) / 100,
      demoteShare: (o.demoteShare ?? SEASON.grading.demoteShare * 100) / 100,
      honorTop: o.honorTop ?? SEASON.grading.honorTop,
    },
    overridden: Object.keys(o) as (keyof SeasonOverrides)[],
  };
}

/** Season settings as currently configured by the season director (defaults from SEASON) */
export function useSeason(): LiveSeason {
  const overrides = useStore((s) => s.season);
  return useMemo(() => mergeSeason(overrides), [overrides]);
}
