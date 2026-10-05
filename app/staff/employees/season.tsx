"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { CalendarCheck, FilterX, UserMinus, UserPlus, UserX } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { CURRENT_SEASON, MISSIONS, employeeHaystack, fullName, matches, postingLabel, type Employee } from "@/lib/ops";
import { cn, formatNumber } from "@/lib/utils";
import { Empty, Panel, Tabs } from "../_components/kit";
import { Avatar, Chip, FilterSelect, SearchBox } from "../_components/ops-ui";
import { SystemRecords } from "../_components/system";
import { useEmployeesDesk } from "./desk";
import { useEmployeeActions, useEmployeePanels } from "./sheet";

type View = "in" | "out";
type State = "posted" | "free" | "noflight" | "suspended";
const STATES: { value: State; label: string }[] = [
  { value: "posted", label: "مُسندون" },
  { value: "free", label: "متاحون للإسناد" },
  { value: "noflight", label: "بلا رحلة ذهاب" },
  { value: "suspended", label: "موقوفون" },
];
const PAGE = 40;

/**
 * Participation in the current season, the last tab of the employees file: who travels with the mission
 * this year, where the operational files posted each and on which flights he goes, and who is not
 * registered. Only participants are offered to the operational files and the flights, so registering is
 * free while leaving is barred to whoever holds a post — here, in his sheet and in the form alike.
 * A link from the summary opens a filter (`?f=free`). The tab's records are under the list.
 */
export function Season() {
  const params = useSearchParams();
  const desk = useEmployeesDesk();
  const act = useEmployeeActions();
  const panels = useEmployeePanels();
  const asked = params.get("f");
  const [view, setView] = useState<View>("in");
  const [state, setState] = useState<State | "">(STATES.find((s) => s.value === asked)?.value ?? "");
  const [mission, setMission] = useState("");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);

  const lists: Record<State, { e: Employee }[]> = { posted: desk.posted, free: desk.free, noflight: desk.noOutbound, suspended: desk.suspendedIn };
  const inState = state ? new Set(lists[state].map((p) => p.e.id)) : null;
  const participants = desk.participants.filter((p) => (!inState || inState.has(p.e.id)) && (!mission || p.e.mission === mission) && matches(q, employeeHaystack(p.e)));
  const outside = desk.outside.filter((e) => (!mission || e.mission === mission) && matches(q, employeeHaystack(e)));
  const count = view === "in" ? participants.length : outside.length;
  const filtersOn = !!(q || mission || (view === "in" && state));
  const clear = () => {
    setQ("");
    setMission("");
    setState("");
  };
  // The row opens his sheet; its button acts on the row alone
  const only = (f: () => void) => (ev: MouseEvent) => {
    ev.stopPropagation();
    f();
  };

  return (
    <div className="space-y-6">
      <Panel icon={<CalendarCheck />} title={`المشاركون في موسم ${CURRENT_SEASON}`} bodyClass="space-y-3">
        <p className="text-sm leading-7 text-white/70">
          المشارك في الموسم وحده يظهر في قوائم الإسناد في الملفات التشغيلية وفي قوائم الطيران: يسنده {desk.posters.length ? desk.posters.join(" و") : "صاحب «الملفات التشغيلية»"} إلى موقعه، ويضعه صاحب «إدارة الطيران» على رحلتيه. ولا تُلغى مشاركة من أُسند إلى موقع قبل أن يُزال منه، وإلغاء أي مشاركة يصل إلى مديرة الموسم.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Chip tone="gold">{desk.posted.length} مُسندون</Chip>
          <Chip tone="green">{desk.free.length} متاحون للإسناد</Chip>
          <Chip>{desk.noOutbound.length} بلا رحلة ذهاب</Chip>
          {desk.suspendedIn.length > 0 && <Chip tone="maroon">{desk.suspendedIn.length} موقوفون</Chip>}
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Tabs<View>
            id="season-view"
            value={view}
            onChange={(v) => {
              setView(v);
              setShown(PAGE);
            }}
            tabs={[
              { value: "in", label: "المشاركون", count: desk.participants.length },
              { value: "out", label: "غير المشاركين", count: desk.outside.length },
            ]}
          />
          <SearchBox
            className="flex-1"
            value={q}
            onChange={(v) => {
              setQ(v);
              setShown(PAGE);
            }}
            label="بحث في المشاركين"
            placeholder="اسم، مسمى وظيفي، محافظة، هاتف..."
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FilterSelect label="البعثة" all="كل البعثات" value={mission} onChange={setMission} options={MISSIONS} />
          {view === "in" && <FilterSelect label="الحال" all="الحال: الكل" value={state} onChange={(v) => setState(v as State | "")} options={STATES} />}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-white/75">
            <span className="font-bold text-white tabular-nums">{formatNumber(count)}</span> {view === "in" ? "مشاركاً" : "غير مشارك"}
            {filtersOn && " يطابقون البحث"}
          </p>
          {filtersOn && (
            <button onClick={clear} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-gold hover:bg-white/10">
              <FilterX className="size-3.5" /> مسح البحث والتصفية
            </button>
          )}
        </div>
      </Panel>

      <Panel bodyClass="-mx-5 md:-mx-6" delay={0.05}>
        {count === 0 ? (
          <div className="px-5 md:px-6">
            <Empty icon={<UserX />} title="لا أحد هنا" text={filtersOn ? "جرّب كلمة أقصر، أو امسح التصفية." : view === "in" ? "لم يُسجَّل أحد في الموسم بعد." : "كل الموظفين مشاركون في الموسم."} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {view === "in" ? (
              <table className="w-full min-w-[52rem] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-right text-xs text-gold">
                    <th className="px-5 pb-3 font-bold md:px-6">المشارك</th>
                    <th className="pb-3 font-bold">مواقعه في الملفات</th>
                    <th className="pb-3 font-bold">الذهاب</th>
                    <th className="pb-3 font-bold">العودة</th>
                    <th className="w-36" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {participants.slice(0, shown).map(({ e, posts, trip }, i) => (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i, 20) * 0.015 }}
                      onClick={() => panels.open(e.id)}
                      className={cn("cursor-pointer transition hover:bg-white/[.05]", e.suspended && "bg-maroon/10")}
                    >
                      <td className="px-5 py-2.5 md:px-6">
                        <div className="flex items-center gap-3">
                          <Avatar e={e} />
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-1.5 font-bold text-white">
                              {fullName(e)}
                              {e.suspended && <Chip tone="maroon">موقوف</Chip>}
                            </p>
                            <p className="text-xs text-white/65">
                              {e.jobTitle} · {e.mission.replace("البعثة ", "")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5">
                        {posts.length ? (
                          <span className="block max-w-[16rem] text-xs font-semibold leading-5 text-gold">{posts.map((p) => postingLabel(p, true)).join("، ")}</span>
                        ) : e.suspended ? (
                          <span className="text-xs text-white/40">—</span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-white/85">
                            <span className="size-1.5 rounded-full bg-green-light" />
                            متاح للإسناد
                          </span>
                        )}
                      </td>
                      <td className="py-2.5">{trip.out ? <span className="font-mono text-xs font-bold text-white" dir="ltr">{trip.out.flightNo}</span> : <span className="text-xs text-white/45">{trip.status === "otherMeans" ? "وسيلة أخرى" : "—"}</span>}</td>
                      <td className="py-2.5">{trip.back ? <span className="font-mono text-xs font-bold text-white" dir="ltr">{trip.back.flightNo}</span> : <span className="text-xs text-white/45">—</span>}</td>
                      <td className="py-2.5 pl-4 text-left">
                        <Button size="sm" variant="glass" className={cn("hover:bg-maroon/50", posts.length > 0 && "opacity-60")} onClick={only(() => act.setSeason(e, false))}>
                          <UserMinus className="size-4" /> إلغاء المشاركة
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-right text-xs text-gold">
                    <th className="px-5 pb-3 font-bold md:px-6">الموظف</th>
                    <th className="pb-3 font-bold">المواسم السابقة</th>
                    <th className="w-36" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {outside.slice(0, shown).map((e, i) => (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i, 20) * 0.015 }}
                      onClick={() => panels.open(e.id)}
                      className={cn("cursor-pointer transition hover:bg-white/[.05]", e.suspended && "opacity-60")}
                    >
                      <td className="px-5 py-2.5 md:px-6">
                        <div className="flex items-center gap-3">
                          <Avatar e={e} />
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-1.5 font-bold text-white">
                              {fullName(e)}
                              {e.suspended && <Chip tone="maroon">موقوف</Chip>}
                            </p>
                            <p className="text-xs text-white/65">
                              {e.jobTitle} · {e.mission.replace("البعثة ", "")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-xs text-white/75 tabular-nums">{e.seasons.length ? e.seasons.join("، ") : "لم يشارك بعد"}</td>
                      <td className="py-2.5 pl-4 text-left">
                        <Button size="sm" variant="gold" onClick={only(() => act.setSeason(e, true))}>
                          <UserPlus className="size-4" /> تسجيله
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
            {count > shown && (
              <div className="mt-4 text-center">
                <Button variant="glass" size="sm" onClick={() => setShown((s) => s + PAGE)}>
                  عرض {Math.min(PAGE, count - shown)} آخرين — بقي {count - shown}
                </Button>
              </div>
            )}
          </div>
        )}
      </Panel>

      <SystemRecords system="staff" area="season" title="سجل المشاركة في الموسم" />
      {panels.node}
    </div>
  );
}
