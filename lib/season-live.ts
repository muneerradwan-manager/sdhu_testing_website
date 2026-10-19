"use client";

import { useMemo } from "react";
import type { ScheduleLine } from "./installments";
import { resolveSchedule } from "./registration/engine";
import { useLiveVersion } from "./registration/client";
import type { PaymentsConfig } from "./registration/types";
import type { RoomPrices } from "./rooms";
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
  fees: {
    registrationPerPerson: number;
    hajjCost: number;
    firstInstallment: number;
    installmentCount: 1 | 2;
    /** The installments as the published registration version sets them, per person (1 to 4) */
    schedule: ScheduleLine[];
    /** The post-acceptance step the sacrifice and private rooms are paid at */
    extrasStep: string;
    hady: number;
    roomExample: RoomPrices;
    administratorRegistration: number;
    groupFormation: number;
    clusterFormation: number;
  };
  administrators: { keepRoleMinRating: number };
  documents: Record<string, number>;
  /** End-of-season classification: the shares that move between tiers, and how many are honoured */
  grading: { tiers: typeof SEASON.grading.tiers; promoteShare: number; demoteShare: number; honorTop: number; entryTier: number };
  /** The four meals of the season, as the administration timed them: breakfast and lunch in each hotel */
  meals: MealTimes;
  overridden: (keyof SeasonOverrides)[];
};

export type MealTimes = { makkah: { breakfast: string; lunch: string }; madinah: { breakfast: string; lunch: string }; menus?: { makkah: { breakfast?: string; lunch?: string }; madinah: { breakfast?: string; lunch?: string } } };

/** The meal times before the administration sets its own */
export const DEFAULT_MEALS: MealTimes = { makkah: { breakfast: "06:00 – 09:00", lunch: "13:00 – 15:00" }, madinah: { breakfast: "05:30 – 08:30", lunch: "13:00 – 15:00" } };

/**
 * Pure merge — usable outside React (e.g. to evaluate seeded applications). `payments`: the published
 * registration version's installments; without it, the season's two default installments.
 */
export function mergeSeason(o: SeasonOverrides, payments?: PaymentsConfig): LiveSeason {
  const quota = o.quota ?? SEASON.quota;
  const hajjCost = o.hajjCost ?? SEASON.fees.hajjCost;
  const schedule: ScheduleLine[] = payments
    ? resolveSchedule(payments.installments, hajjCost).map((i) => ({ key: i.key, label: i.label, perPerson: i.perPerson, dueLabel: i.dueLabel, dueStep: i.dueStep }))
    : [];
  const firstInstallment = schedule.length ? schedule[0].perPerson : Math.min(o.firstInstallment ?? SEASON.fees.firstInstallment, hajjCost);
  const installmentCount: 1 | 2 = schedule.length ? (schedule.length === 1 ? 1 : 2) : (o.installmentCount ?? SEASON.installments.count) === 1 ? 1 : 2;
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
      hajjCost,
      firstInstallment,
      installmentCount,
      schedule,
      extrasStep: payments?.extrasStep ?? "payment",
      hady: o.hady ?? SEASON.fees.hady,
      administratorRegistration: o.administratorRegistration ?? SEASON.fees.administratorRegistration,
      groupFormation: o.groupFormation ?? SEASON.fees.groupFormation,
      clusterFormation: o.clusterFormation ?? SEASON.fees.clusterFormation,
    },
    administrators: {
      keepRoleMinRating: o.keepRoleMinRating ?? SEASON.administrators.keepRole.minRating,
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
    meals: {
      makkah: { breakfast: o.mealMakkahBreakfast ?? DEFAULT_MEALS.makkah.breakfast, lunch: o.mealMakkahLunch ?? DEFAULT_MEALS.makkah.lunch },
      madinah: { breakfast: o.mealMadinahBreakfast ?? DEFAULT_MEALS.madinah.breakfast, lunch: o.mealMadinahLunch ?? DEFAULT_MEALS.madinah.lunch },
      menus: {
        makkah: { breakfast: o.menuMakkahBreakfast || undefined, lunch: o.menuMakkahLunch || undefined },
        madinah: { breakfast: o.menuMadinahBreakfast || undefined, lunch: o.menuMadinahLunch || undefined },
      },
    },
    overridden: Object.keys(o) as (keyof SeasonOverrides)[],
  };
}

/** Season settings as currently configured by the season director (defaults from SEASON) */
export function useSeason(): LiveSeason {
  const overrides = useStore((s) => s.season);
  const payments = useLiveVersion().config.payments;
  return useMemo(() => mergeSeason(overrides, payments), [overrides, payments]);
}
