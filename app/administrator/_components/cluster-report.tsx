"use client";

import { groupName } from "@/lib/groups";
import { useStore } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { ACCOUNTANT_TITLE, BADGES, DEPUTY_TITLE, STATUS, roleOfPerson, type ClusterRequest } from "../_lib/formation";
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

/** One request's numbers in a line, for lists */
export function requestLine(req: ClusterRequest) {
  return `${req.groups.length} مجموعات — مجموع الفئات ${req.weight} — ${formatNumber(req.pilgrims)} حاجاً — ${req.cadre} من الكادر`;
}
