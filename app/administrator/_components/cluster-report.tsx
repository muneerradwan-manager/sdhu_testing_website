"use client";

import type { ReactNode } from "react";
import { Emblem } from "@/components/brand/logo";
import { groupName } from "@/lib/groups";
import { dayHijri, dayLabel, useToday } from "@/lib/operations";
import { useStore } from "@/lib/store";
import { cn, formatNumber, gregorianDate } from "@/lib/utils";
import { ACCOUNTANT_TITLE, BADGES, DEPUTY_TITLE, POOLS, STATUS, roleOfPerson, type ClusterRequest } from "../_lib/formation";
import { roleName, useCadre, useStructure } from "../_lib/structure";

/**
 * A request's report as the administration's platform prints it: the cluster's data, its numbers and badges,
 * its coordinators and female guides, every group with its head and seats, and the signatures — the head's,
 * the stamp, the branch director's approval. The head reviews it before sending; the staff read it to decide.
 */
export function ClusterReport({ req, dark = false, signatures = false }: { req: ClusterRequest; dark?: boolean; signatures?: boolean }) {
  const s = useStructure();
  const cadre = useCadre();
  const admins = useStore((x) => x.admins);
  const c = req.cluster;
  const yes = (x?: { status: string }) => x?.status === "accepted";
  const role = (id: string) => roleName(roleOfPerson(id, admins, cadre), s);
  const names = (xs: { id: string; name: string; status: string }[]) => xs.filter(yes).map((x) => x.name).join("، ") || "—";
  const tier = s.tiers.find((t) => t.id === c.tier)?.name ?? "—";
  const box = dark ? "bg-white/[.06] ring-1 ring-white/10" : "bg-sand";
  const soft = dark ? "text-white/60" : "text-hint";
  const strong = dark ? "text-white" : "text-ink";
  const accent = dark ? "text-gold" : "text-green-dark";
  const earned = (Object.keys(BADGES) as (keyof typeof BADGES)[]).filter((k) => req.badges[k]);

  return (
    <div className="space-y-5" id="cluster-report">
      <div className={cn("rounded-2xl p-4", box)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={cn("font-display text-lg font-bold", accent)}>بيانات التكتل</p>
          <span className="flex flex-wrap gap-2 text-xs font-bold">
            {c.byAdministration && <span className={cn("rounded-full px-2.5 py-1", dark ? "bg-gold/20 text-gold" : "bg-gold/30 text-maroon")}>🛠️ أنشأته الإدارة نيابة عن رئيسه</span>}
            <span className={cn("rounded-full px-2.5 py-1", dark ? "bg-white/10 text-white" : "bg-white text-ink-soft")}>{STATUS[c.status].label}</span>
          </span>
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {[
            ["اسم التكتل", c.name || "—"],
            ["رئيس التكتل", req.headName],
            ["الفرع", req.branches.join(" و")],
            ["الموسم", "1448"],
            ["مستوى التكتل", tier],
            [DEPUTY_TITLE, yes(c.deputy) ? c.deputy!.name : "—"],
            ["معاون التكتل", names(c.assistants)],
            [ACCOUNTANT_TITLE, yes(c.accountant) ? `${c.accountant!.name} (${role(c.accountant!.id)})` : "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-wrap gap-x-2">
              <dt className={soft}>{k}:</dt>
              <dd className={cn("font-bold", strong)}>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            [formatNumber(req.pilgrims), "عدد الحجاج"],
            [formatNumber(req.cadre), "عدد الكوادر"],
            [formatNumber(req.groups.length), "عدد المجموعات"],
            [formatNumber(req.weight), "إجمالي الفئات"],
            [req.age.avg === null ? "—" : `${req.age.avg} سنة`, "متوسط الأعمار"],
          ].map(([v, k]) => (
            <div key={k} className={cn("rounded-xl p-2 text-center", dark ? "bg-white/5" : "bg-white")}>
              <p className={cn("font-display text-xl font-bold", accent)}>{v}</p>
              <p className={cn("text-[11px]", soft)}>{k}</p>
            </div>
          ))}
        </div>
        {earned.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {earned.map((k) => (
              <span key={k} title={BADGES[k].hint} className={cn("rounded-full px-3 py-1 text-xs font-bold", dark ? "bg-green-light/20 text-green-light" : "bg-green-light/15 text-green")}>
                {BADGES[k].icon} {BADGES[k].label}
              </span>
            ))}
          </div>
        )}
      </div>

      {[
        { title: "المنسقون", list: c.coordinators },
        { title: "الموجّهات والمرشدات الدينيات", list: c.femaleGuides },
      ].map(({ title, list }) =>
        list.some(yes) ? (
          <div key={title} className={cn("rounded-2xl p-4", box)}>
            <p className={cn("font-bold", strong)}>
              {title} ({list.filter(yes).length})
            </p>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {list.filter(yes).map((x) => (
                <li key={x.id} className={cn("rounded-xl px-3 py-1.5", dark ? "bg-white/5 text-white/90" : "bg-white")}>
                  {x.name} <span className={cn("text-xs", soft)}>— {role(x.id)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}

      <div>
        <p className={cn("mb-2 flex flex-wrap items-center justify-between gap-2 font-bold", strong)}>
          مجموعات التكتل <span className={cn("text-xs font-normal", soft)}>{req.groups.length} مجموعة — مجموع الفئات {req.weight}</span>
        </p>
        <ul className="grid gap-3 md:grid-cols-2">
          {req.groups.map((g) => {
            const seats = (c.seats[g.number] ?? []).filter((x) => yes(x.who));
            const coordinator = c.coordinators.find((x) => yes(x) && x.id === c.sorting[g.number]);
            return (
              <li key={g.number} className={cn("rounded-2xl p-3", box)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={cn("font-bold", accent)}>{groupName(g.number)}</p>
                    <p className={cn("text-xs", soft)}>
                      رئيسها: {g.head}
                      {g.headId === c.deputy?.id && yes(c.deputy) ? ` (${DEPUTY_TITLE})` : ""}
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", dark ? "bg-gold/20 text-gold" : "bg-gold/30 text-maroon")}>
                    {g.categoryName} — {s.categories.find((x) => x.id === g.category)?.weight ?? 0}
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {seats.map((x, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className={strong}>
                        {x.who!.name}
                        {x.who!.id === c.accountant?.id && yes(c.accountant) ? <span className={soft}> · {ACCOUNTANT_TITLE}</span> : null}
                      </span>
                      <span className={cn("text-xs", soft)}>{role(x.who!.id)}</span>
                    </li>
                  ))}
                  {coordinator && (
                    <li className="flex justify-between gap-2">
                      <span className={strong}>{coordinator.name}</span>
                      <span className={cn("text-xs", soft)}>منسقها</span>
                    </li>
                  )}
                  {!seats.length && !coordinator && <li className={cn("text-xs", soft)}>رئيسها وحده بفئتها في هذا المستوى</li>}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>

      {signatures && (
        <div className="grid grid-cols-3 gap-3 pt-6 text-center text-sm">
          {[`${req.headName}\n${c.name}\nتوقيع رئيس التكتل`, "الختم", "اعتماد مدير الفرع\nالتوقيع"].map((t) => (
            <div key={t} className={cn("whitespace-pre-line rounded-2xl border-2 border-dashed p-4", dark ? "border-white/20 text-white/70" : "border-gold/50 text-ink-soft")}>
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** A table's cells on paper: thin black rules, a lightly tinted head */
const TH = "border border-black/50 bg-[#e6efec] px-2 py-1 text-right align-middle font-bold";
const TD = "border border-black/50 px-2 py-1 align-top";

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-3">
      {/* Room above the title: a tanween («رابعاً») drawn above its line would otherwise stay on the page before */}
      <h2 className="mb-2 flex items-center gap-2 pt-2 text-[12pt] leading-loose font-bold break-inside-avoid break-after-avoid">
        <span aria-hidden className="h-[1.1em] w-1 shrink-0 bg-[#00594F]" />
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The report on paper — what «طباعة» gives, inside a PrintSheet: one official A4 document with the platform's
 * heading, the cluster's data and numbers, its own cadre, every group with its head and cadre, the
 * administration's notes, and the signatures (the head's, the stamp, the branch director's approval).
 */
export function ClusterPrint({ req }: { req: ClusterRequest }) {
  const s = useStructure();
  const cadre = useCadre();
  const admins = useStore((x) => x.admins);
  const today = useToday();
  const c = req.cluster;
  const yes = (x?: { status: string }) => x?.status === "accepted";
  /** A group head off this device has no profile here: his group in the cluster says what he is */
  const role = (id: string) => {
    const key = roleOfPerson(id, admins, cadre) || (req.groups.some((g) => g.headId === id) ? "group-head" : undefined);
    return key ? roleName(key, s) : "—";
  };
  const date = (ms?: number) => (ms ? gregorianDate(new Date(ms)) : "—");
  const earned = (Object.keys(BADGES) as (keyof typeof BADGES)[]).filter((k) => req.badges[k]);
  const sortedTo = (id: string) => req.groups.filter((g) => c.sorting[g.number] === id).map((g) => groupName(g.number));
  const team = [
    ...(yes(c.deputy) ? [{ ...c.deputy!, task: DEPUTY_TITLE, note: "" }] : []),
    ...(yes(c.accountant) ? [{ ...c.accountant!, task: ACCOUNTANT_TITLE, note: "" }] : []),
    ...c.assistants.filter(yes).map((x) => ({ ...x, task: POOLS["cluster-assistant"].title, note: "" })),
    ...c.coordinators.filter(yes).map((x) => ({ ...x, task: POOLS.tech.title, note: sortedTo(x.id).join("، ") })),
    ...c.femaleGuides.filter(yes).map((x) => ({ ...x, task: POOLS["guide-f"].title, note: "" })),
  ];
  const capacity = req.groups.reduce((n, g) => n + g.capacity, 0);
  const data: [string, string][] = [
    ["اسم التكتل", c.name || "—"],
    ["رئيس التكتل", req.headName],
    ["الفرع", req.branches.join(" و") || "—"],
    ["مستوى التكتل", s.tiers.find((t) => t.id === c.tier)?.name ?? "—"],
    [DEPUTY_TITLE, yes(c.deputy) ? c.deputy!.name : "—"],
    [ACCOUNTANT_TITLE, yes(c.accountant) ? c.accountant!.name : "—"],
    ["حالة الطلب", STATUS[c.status].label],
    ["تاريخ الإرسال", date(c.sentAt)],
  ];
  if (c.decision) data.push([c.decision.status === "approved" ? "اعتمده" : "أعاده بملاحظات", `${c.decision.by} — ${date(c.decision.at)}`]);

  return (
    <article className="text-[10pt] leading-relaxed text-black">
      <header className="flex items-center justify-between gap-6 border-b-2 border-[#00594F] pb-3">
        <div className="flex items-center gap-3">
          <Emblem className="size-16" gradientId="emblem-gold-print" />
          <div className="leading-snug">
            <p className="font-display text-[15pt] font-bold text-[#00594F]">المنصة الوطنية للحج</p>
            <p className="text-[10.5pt] font-bold">إدارة الحج والعمرة السورية</p>
            <p className="text-[9pt] text-black/70">إدارة الإداريين — تشكيل التكتلات</p>
          </div>
        </div>
        <div className="text-left text-[9pt] leading-6">
          <p>
            الموسم: <b>1448هـ</b>
          </p>
          <p>
            تاريخ الطباعة: <b>{dayLabel(today, true)}</b>
          </p>
          <p className="text-black/70">{dayHijri(today)}</p>
        </div>
      </header>

      <div className="mt-5 text-center">
        <h1 className="font-display text-[18pt] font-bold">تقرير تشكيل تكتل</h1>
        <p className="mt-1 font-display text-[14pt] font-bold text-[#00594F]">{c.name || "—"}</p>
        {c.byAdministration && <p className="mt-1 text-[9pt]">أنشأته الإدارة نيابة عن رئيسه — {c.byAdministration.reason}</p>}
      </div>

      <Part title="أولاً: بيانات التكتل">
        <table className="w-full border-collapse">
          <tbody>
            {Array.from({ length: Math.ceil(data.length / 2) }, (_, i) => data.slice(i * 2, i * 2 + 2)).map((row) => (
              <tr key={row[0][0]} className="break-inside-avoid">
                {row.map(([k, v], j) => (
                  <Pair key={k} k={k} v={v} span={row.length === 1 && j === 0} />
                ))}
              </tr>
            ))}
            <tr className="break-inside-avoid">
              <td className={cn(TD, "w-[18%] bg-[#f4f7f6] font-bold")}>معاون التكتل</td>
              <td className={TD} colSpan={3}>
                {c.assistants.filter(yes).map((x) => x.name).join("، ") || "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </Part>

      <Part title="ثانياً: أرقام التكتل">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr>
              {["عدد المجموعات", "إجمالي الفئات", "عدد الحجاج", "عدد الكوادر", "متوسط أعمار الكادر"].map((k) => (
                <th key={k} className={cn(TH, "text-center")}>
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {[formatNumber(req.groups.length), formatNumber(req.weight), formatNumber(req.pilgrims), formatNumber(req.cadre), req.age.avg === null ? "—" : `${req.age.avg} سنة`].map((v, i) => (
                <td key={i} className={cn(TD, "text-center text-[13pt] font-bold")}>
                  {v}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        {req.pilgrims !== capacity && (
          <p className="mt-2">
            الحجاج: {formatNumber(capacity)} بفئات المجموعات، و{formatNumber(req.pilgrims - capacity)} يأخذهم «معاون بعدد».
          </p>
        )}
        <p className="mt-1">
          الشارات المستحقة: <b>{earned.length ? earned.map((k) => BADGES[k].label).join("، ") : "لا شارات"}</b>
        </p>
      </Part>

      <Part title="ثالثاً: كادر التكتل العام">
        {team.length ? (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={cn(TH, "w-8 text-center")}>#</th>
                <th className={TH}>الاسم</th>
                <th className={TH}>الصفة الإدارية</th>
                <th className={TH}>المهمة في التكتل</th>
                <th className={TH}>المجموعات الموزّعة عليه</th>
              </tr>
            </thead>
            <tbody>
              {team.map((x, i) => (
                <tr key={`${x.task}-${x.id}`} className="break-inside-avoid">
                  <td className={cn(TD, "text-center")}>{i + 1}</td>
                  <td className={cn(TD, "font-bold")}>{x.name}</td>
                  <td className={TD}>{role(x.id)}</td>
                  <td className={TD}>{x.task}</td>
                  <td className={TD}>{x.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>لم يقبل أحد بعد.</p>
        )}
      </Part>

      <Part title="رابعاً: مجموعات التكتل">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={cn(TH, "w-8 text-center")}>#</th>
              <th className={TH}>المجموعة</th>
              <th className={TH}>الفئة</th>
              <th className={cn(TH, "text-center")}>الحجاج</th>
              <th className={TH}>رئيس المجموعة</th>
              <th className={TH}>كادر المجموعة</th>
              <th className={TH}>المنسق</th>
            </tr>
          </thead>
          <tbody>
            {req.groups.map((g, i) => {
              const seats = (c.seats[g.number] ?? []).filter((x) => yes(x.who));
              const coordinator = c.coordinators.find((x) => yes(x) && x.id === c.sorting[g.number]);
              return (
                <tr key={g.number} className="break-inside-avoid">
                  <td className={cn(TD, "text-center")}>{i + 1}</td>
                  <td className={cn(TD, "font-bold")}>{groupName(g.number)}</td>
                  <td className={TD}>
                    {g.categoryName} ({s.categories.find((x) => x.id === g.category)?.weight ?? 0})
                  </td>
                  <td className={cn(TD, "text-center")}>{formatNumber(g.capacity)}</td>
                  <td className={TD}>
                    {g.head}
                    {g.headId === c.deputy?.id && yes(c.deputy) ? <span className="block text-[8.5pt]">{DEPUTY_TITLE}</span> : null}
                  </td>
                  <td className={TD}>
                    {seats.length
                      ? seats.map((x, j) => (
                          <span key={j} className="block">
                            {x.who!.name} <span className="text-[8.5pt] text-black/70">— {role(x.who!.id)}{x.who!.id === c.accountant?.id && yes(c.accountant) ? ` · ${ACCOUNTANT_TITLE}` : ""}</span>
                          </span>
                        ))
                      : "رئيسها وحده"}
                  </td>
                  <td className={TD}>{coordinator?.name ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="break-inside-avoid font-bold">
              <td className={cn(TD, "bg-[#f4f7f6]")} colSpan={2}>
                المجموع: {formatNumber(req.groups.length)} {req.groups.length === 1 ? "مجموعة" : req.groups.length === 2 ? "مجموعتان" : req.groups.length <= 10 ? "مجموعات" : "مجموعة"}
              </td>
              <td className={cn(TD, "bg-[#f4f7f6]")}>{formatNumber(req.weight)}</td>
              <td className={cn(TD, "bg-[#f4f7f6] text-center")}>{formatNumber(capacity)}</td>
              <td className={cn(TD, "bg-[#f4f7f6]")} colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </Part>

      {c.decision?.note && (
        <Part title="ملاحظات الإدارة">
          <p className="border border-black/50 p-2">{c.decision.note}</p>
        </Part>
      )}
      {!req.complete && (
        <Part title="شروط لم تكتمل بعد">
          <ul className="list-disc pr-5">
            {req.checks
              .filter((x) => !x.ok && !x.warn)
              .map((x) => (
                <li key={x.key}>{x.label}</li>
              ))}
          </ul>
        </Part>
      )}

      <section className="mt-10 grid grid-cols-3 gap-6 text-center break-inside-avoid">
        <div>
          <p className="font-bold">رئيس التكتل</p>
          <p className="mt-1">{req.headName}</p>
          <p className="mt-10 border-t border-black/60 pt-1 text-[9pt]">التوقيع</p>
        </div>
        <div>
          <p className="font-bold">الختم</p>
          <div className="mx-auto mt-2 size-24 rounded-full border border-dashed border-black/60" />
        </div>
        <div>
          <p className="font-bold">اعتماد مدير الفرع</p>
          <p className="mt-1">{req.branches.join(" و") || "—"}</p>
          <p className="mt-10 border-t border-black/60 pt-1 text-[9pt]">الاسم والتوقيع</p>
        </div>
      </section>

      <footer className="mt-8 border-t border-black/30 pt-2 text-center text-[8.5pt] text-black/70">
        طُبع من المنصة الوطنية للحج — بوابة الإداريين — {dayLabel(today, true)}
      </footer>
    </article>
  );
}

function Pair({ k, v, span }: { k: string; v: string; span: boolean }) {
  return (
    <>
      <td className={cn(TD, "w-[18%] bg-[#f4f7f6] font-bold")}>{k}</td>
      <td className={TD} colSpan={span ? 3 : 1}>
        {v}
      </td>
    </>
  );
}

/** One request's numbers in a line, for lists */
export function requestLine(req: ClusterRequest) {
  return `${req.groups.length} مجموعات — مجموع الفئات ${req.weight} — ${formatNumber(req.pilgrims)} حاجاً — ${req.cadre} من الكادر`;
}
