"use client";

import { CalendarPlus } from "lucide-react";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { useReg } from "@/lib/registration/client";
import { allVersions } from "@/lib/registration/engine";
import { run } from "@/lib/registration/run";
import { createSeason, restoreVersion } from "@/lib/registration/service";
import { diffConfigs } from "@/lib/registration/validate";
import { fmtDateTime, smallInputClass } from "../../_components/kit";
import { useSystemEvents } from "../../_components/system";
import { selectClass } from "../../exam/_components/ui";
import { Box, Kind, ListTable, RowActions, RowLink, SeasonPicker, Title, useRegEditor } from "./editor";

/**
 * Everything published, newest first — what changed in each, who published it and since when — with a way
 * back to any of them; the file's activity; and the seasons, a new one prepared by copying.
 */
export function HistoryPage() {
  const ed = useRegEditor();
  const toast = useToast();
  const reg = useReg();
  const events = useSystemEvents("registration");
  const [open, setOpen] = useState<string | null>(null);
  const list = ed.versions.list;

  return (
    <div className="space-y-6">
      <Title action={<SeasonPicker />}>ما نُشر في {ed.info?.label}</Title>
      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/20 p-6 text-center text-white/65">لم يُنشر شيء لهذا الموسم بعد.</p>
      ) : (
        <ListTable head={["الإصدار", "يظهر للحجاج منذ", "نشره", "الحالة"]}>
          {list.map((v, i) => {
            const prev = list[i + 1];
            const changes = prev ? diffConfigs(prev.config, v.config) : [];
            const live = ed.versions.live?.id === v.id && !ed.versions.scheduled.includes(v);
            const scheduled = ed.versions.scheduled.includes(v);
            return (
              <Fragment key={v.id}>
                <tr className="align-top">
                  <td className="p-3">
                    <p className="font-bold text-white">
                      {v.number}. {v.note}
                    </p>
                    <RowActions>
                      {prev && <RowLink onClick={() => setOpen(open === v.id ? null : v.id)}>{open === v.id ? "إخفاء التغييرات" : `ما الذي تغيّر (${changes.length})`}</RowLink>}
                      {!ed.readOnly && !live && (
                        <RowLink
                          onClick={() => {
                            const r = run((s) => restoreVersion(s, v.id, Date.now()));
                            toast(r.ok ? { title: `أُعيد الإصدار ${v.number} إلى التعديلات`, body: "انشره من الشريط في الأعلى ليراه الحجاج.", icon: "↩️", tone: "info" } : { title: "لم يُستعد", body: r.errors[0].message, icon: "⛔" });
                          }}
                        >
                          الرجوع إليه
                        </RowLink>
                      )}
                    </RowActions>
                  </td>
                  <td className="p-3 text-white/80">{v.effectiveFrom.replace("T", " ")}</td>
                  <td className="p-3 text-white/80">
                    {v.publishedBy}
                    <span className="block text-xs text-white/50">{fmtDateTime(v.publishedAt)}</span>
                  </td>
                  <td className="p-3">{live ? <Kind tone="green">يظهر الآن</Kind> : scheduled ? <Kind tone="gold">مجدول</Kind> : <Kind>سابق</Kind>}</td>
                </tr>
                {open === v.id && (
                  <tr>
                    <td colSpan={4} className="bg-black/15 px-5 py-3">
                      <ul className="space-y-1 text-sm text-white/80">
                        {changes.length === 0 && <li>لا فرق في المحتوى.</li>}
                        {changes.map((c, k) => (
                          <li key={k}>• {c.text}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </ListTable>
      )}

      <Box title="سجل النشاط">
        {events.length === 0 ? (
          <p className="text-white/60">لا نشاط بعد.</p>
        ) : (
          <ul className="space-y-1.5">
            {events.slice(0, 30).map((e) => (
              <li key={e.id} className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-1.5">
                <span>
                  {e.action}
                  {e.detail ? <span className="text-white/55"> — {e.detail}</span> : null}
                </span>
                <span className="text-xs text-white/45">
                  {e.actor} · {fmtDateTime(e.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Box>

      <NewSeason versions={allVersions(reg)} />
    </div>
  );
}

function NewSeason({ versions }: { versions: ReturnType<typeof allVersions> }) {
  const ed = useRegEditor();
  const toast = useToast();
  const next = Math.max(...ed.seasons.map((s) => s.year)) + 1;
  const [year, setYear] = useState(next);
  const [from, setFrom] = useState(ed.live?.id ?? versions[versions.length - 1]?.id ?? "");
  return (
    <Box title="إعداد موسم جديد" open={false}>
      <p className="text-xs leading-5 text-white/60">تُنسخ صفحات موسم سابق وأسئلته ودفعاته إلى الموسم الجديد، فتعدّلها وتنشرها حين تجهز دون أن يتأثر الموسم الجاري.</p>
      <div className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-end">
        <label className="text-xs">
          السنة الهجرية
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={smallInputClass} dir="ltr" />
        </label>
        <label className="text-xs">
          انسخ من
          <select value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass}>
            {versions
              .slice()
              .reverse()
              .map((v) => (
                <option key={v.id} value={v.id}>
                  موسم {v.season} — {v.note}
                </option>
              ))}
          </select>
        </label>
        <Button
          variant="gold"
          disabled={ed.seasons.some((s) => s.year === year)}
          onClick={() => {
            const r = run((s) => createSeason(s, year, from, Date.now()));
            if (!r.ok) return toast({ title: "لم يُنشأ", body: r.errors[0].message, icon: "⛔", tone: "gold" });
            ed.setSeason(year);
            toast({ title: `أُنشئ موسم ${year}هـ`, body: "تعمل الآن على صفحاته. لا يتأثر الموسم الجاري.", icon: "🗓️", tone: "success" });
          }}
        >
          <CalendarPlus className="size-4" /> إنشاء
        </Button>
      </div>
    </Box>
  );
}
