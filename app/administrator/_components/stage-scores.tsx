"use client";

import { motion } from "motion/react";
import type { StageScores } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Stage } from "../_lib/evaluation";

/**
 * The season's stages, each with a score out of 5 and a note — mandatory under 3. The same form for the
 * administrator's self-evaluation, his cluster head's rating and the posted staff's: `tone` follows the portal
 * («light» the administrators', «dark» the staff's). `others`: what someone else gave each stage, shown beside it.
 */
export function StageScoresForm({
  stages,
  value,
  onChange,
  readOnly = false,
  tried = false,
  tone = "light",
  others,
}: {
  stages: Stage[];
  value: StageScores;
  onChange?: (next: StageScores) => void;
  readOnly?: boolean;
  /** After a send was tried: the notes still missing are marked */
  tried?: boolean;
  tone?: "light" | "dark";
  others?: Record<string, { label: string; score: number | null }[]>;
}) {
  const dark = tone === "dark";
  const set = (key: string, patch: Partial<{ score: number; note: string }>) => {
    const cur = value[key] ?? { score: 0 };
    onChange?.({ ...value, [key]: { ...cur, ...patch } });
  };
  return (
    <ol className="space-y-3">
      {stages.map((st, i) => {
        const v = value[st.key]?.score ?? 0;
        const note = value[st.key]?.note ?? "";
        const needNote = v > 0 && v < 3 && !note.trim();
        return (
          <li
            key={st.key}
            className={cn(
              "rounded-2xl p-4 ring-1 transition",
              dark ? (tried && needNote ? "bg-maroon/40 ring-gold/50" : "bg-white/[.06] ring-white/10") : tried && needNote ? "bg-maroon/5 ring-maroon/40" : v ? "bg-green-light/5 ring-green-light/30" : "bg-white ring-gold/30",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex min-w-0 items-start gap-3">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl text-sm font-bold", dark ? "bg-white/10 text-gold" : "bg-sand text-gold-dark")}>{i + 1}</span>
                <span className="min-w-0">
                  <span className={cn("block font-bold", dark ? "text-white" : "text-ink")}>{st.label}</span>
                  <span className={cn("block text-xs", dark ? "text-white/60" : "text-hint")}>{st.hint}</span>
                  {others?.[st.key]?.some((o) => o.score !== null) && (
                    <span className={cn("mt-1 flex flex-wrap gap-1.5 text-[11px] font-bold", dark ? "text-gold" : "text-maroon")}>
                      {others[st.key].filter((o) => o.score !== null).map((o) => (
                        <span key={o.label} className={cn("rounded-full px-2 py-0.5", dark ? "bg-white/10" : "bg-gold/25")}>
                          {o.label}: {o.score}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </span>
              <div className="flex gap-1" role="radiogroup" aria-label={st.label}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={v === n}
                    disabled={readOnly}
                    whileTap={readOnly ? undefined : { scale: 0.9 }}
                    onClick={() => set(st.key, { score: n })}
                    className={cn(
                      "grid size-9 place-items-center rounded-xl text-sm font-bold transition disabled:cursor-default",
                      v === n
                        ? n < 3
                          ? "bg-maroon text-white"
                          : n === 3
                            ? "bg-gold text-ink"
                            : "bg-green-light text-white"
                        : v > n
                          ? dark
                            ? "bg-gold/30 text-white"
                            : "bg-gold/30 text-ink"
                          : dark
                            ? "bg-white/10 text-white/90 ring-1 ring-white/15 hover:ring-gold/60"
                            : "bg-sand text-ink-soft ring-1 ring-gold/30 hover:ring-green-dark/40",
                    )}
                  >
                    {n}
                  </motion.button>
                ))}
              </div>
            </div>
            {(v > 0 || note) &&
              (readOnly ? (
                note && <p className={cn("mt-2 text-sm leading-7", dark ? "text-white/75" : "text-ink-soft")}>{note}</p>
              ) : (
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => set(st.key, { note: e.target.value })}
                  placeholder={v < 3 ? "ملاحظة إلزامية: ما الذي حدث في هذه المرحلة؟" : "ملاحظة (اختيارية)"}
                  aria-label={`ملاحظة ${st.label}`}
                  className={cn(
                    "mt-2 w-full rounded-xl border-2 p-3 text-sm leading-7 outline-none",
                    dark ? "border-white/15 bg-white/5 text-white placeholder:text-white/40 focus:border-gold" : "border-gold/40 bg-white focus:border-green-light",
                    tried && needNote && (dark ? "border-gold" : "border-maroon"),
                  )}
                />
              ))}
          </li>
        );
      })}
    </ol>
  );
}

/** What a send needs: one stage scored at least, and a note under every score below 3 */
export function scoresReady(stages: Stage[], value: StageScores, all = false) {
  const scored = stages.filter((st) => (value[st.key]?.score ?? 0) > 0);
  const missingNotes = scored.filter((st) => value[st.key]!.score < 3 && !(value[st.key]!.note ?? "").trim());
  return { scored: scored.length, missingNotes: missingNotes.length, ok: (all ? scored.length === stages.length : scored.length > 0) && missingNotes.length === 0 };
}

/** Only the stages scored, their notes trimmed */
export function cleanScores(value: StageScores): StageScores {
  return Object.fromEntries(Object.entries(value).filter(([, x]) => x.score > 0).map(([k, x]) => [k, { score: x.score, ...(x.note?.trim() ? { note: x.note.trim() } : {}) }]));
}
