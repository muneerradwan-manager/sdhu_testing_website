"use client";

import { useCallback, useState } from "react";
import { groupName } from "@/lib/groups";
import { groupInfo } from "@/lib/assignment";
import { actions, useStore } from "@/lib/store";
import { ReturnHome } from "./_components/evaluation";
import { StageRating } from "./_components/notices";
import { NowCard } from "./_components/now-card";
import { DayScrubber } from "./_components/scrubber";
import { SeasonPage } from "./_components/season-shell";

/**
 * «حالتي الآن»: where the pilgrim is in the season, and only that — the day and its moment, and where he is, his
 * room or tent, his next move and meal. Everything else of the season is a page of its own in the sidebar (the
 * notifications, the gatherings, the meals, his reports, the lost items). After the return: the evaluation and
 * the certificate.
 */
export default function SeasonNow() {
  const sessionId = useStore((s) => s.sessionId)!;
  const [momentIdx, setMomentIdx] = useState(0);
  const post = useStore((s) => s.post[sessionId]);
  const group = groupInfo(post?.clusterId, post?.groupNumber);
  const onDay = useCallback(
    (i: number) => {
      setMomentIdx(0);
      actions.setInSeason(sessionId, { day: Math.max(0, Math.min(28, i)) });
    },
    [sessionId],
  );

  return (
    <SeasonPage title="حالتي الآن" subtitle={`${groupName(group.number)} — ${group.clusterName}`} moment={momentIdx}>
      {({ ctx }) => (
        <div className="space-y-8">
          <DayScrubber day={ctx.day} momentIdx={Math.min(momentIdx, ctx.day.moments.length - 1)} onDay={onDay} onMoment={setMomentIdx} />
          {ctx.where === "home" ? (
            <>
              <StageRating ctx={ctx} />
              <ReturnHome ctx={ctx} />
            </>
          ) : (
            <>
              <NowCard ctx={ctx} />
              <StageRating ctx={ctx} />
            </>
          )}
        </div>
      )}
    </SeasonPage>
  );
}
