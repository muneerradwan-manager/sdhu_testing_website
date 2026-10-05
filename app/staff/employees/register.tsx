"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ChevronLeft, FilterX, IdCard, UserPlus, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CURRENT_SEASON, GOVERNORATES, JOB_TITLES, MISSIONS, employeeHaystack, fullName, inSeason, matches } from "@/lib/ops";
import { cn, formatNumber } from "@/lib/utils";
import { Empty, Panel, Tabs } from "../_components/kit";
import { Avatar, Chip, FilterSelect, SearchBox } from "../_components/ops-ui";
import { SystemRecords } from "../_components/system";
import { missingOf, useEmployeesDesk } from "./desk";
import { useEmployeePanels } from "./sheet";

type Kind = "all" | "permanent" | "external";
const PAGE = 40;

/**
 * The register, the first tab of the employees file: the directorate's own staff and those other bodies
 * delegate for the season, searched by any part of a name, title, governorate, phone or the last digits of
 * a national number, each opening his sheet. A link from the summary opens one sheet (`?e=`) or the
 * incomplete records (`?f=incomplete`). The tab's records are under the list.
 */
export function Register() {
  const params = useSearchParams();
  const desk = useEmployeesDesk();
  const panels = useEmployeePanels(params.get("e"));
  const { employees, postings } = desk;

  const [kind, setKind] = useState<Kind>("all");
  const [q, setQ] = useState("");
  const [mission, setMission] = useState("");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState(params.get("f") === "incomplete" ? "incomplete" : "");
  const [shown, setShown] = useState(PAGE);

  const filtersOn = [mission, title, city, gender, status].some(Boolean);
  const clear = () => {
    [setMission, setTitle, setCity, setGender, setStatus].forEach((f) => f(""));
    setQ("");
  };

  const rows = useMemo(
    () =>
      employees
        .filter((e) => kind === "all" || e.kind === kind)
        .filter((e) => !mission || e.mission === mission)
        .filter((e) => !title || e.jobTitle === title)
        .filter((e) => !city || e.city === city)
        .filter((e) => !gender || e.gender === gender)
        .filter((e) => !status || (status === "incomplete" ? missingOf(e).length > 0 : status === "suspended" ? e.suspended : !e.suspended))
        .filter((e) => matches(q, employeeHaystack(e)))
        .sort((a, b) => fullName(a).localeCompare(fullName(b), "ar")),
    [employees, kind, mission, title, city, gender, status, q],
  );

  const usedTitles = JOB_TITLES.filter((t) => employees.some((e) => e.jobTitle === t));
  const usedCities = GOVERNORATES.filter((t) => employees.some((e) => e.city === t));

  return (
    <div className="space-y-6">
      <Panel
        icon={<IdCard />}
        title="سجل الموظفين"
        bodyClass="space-y-3"
        action={
          <Button size="sm" variant="gold" onClick={panels.create}>
            <UserPlus className="size-4" /> إضافة موظف
          </Button>
        }
      >
        <p className="text-sm leading-7 text-white/70">موظفو الإدارة الدائمون ومن تنتدبهم الجهات الأخرى للموسم. ابحث بأي جزء من الاسم أو المسمى أو المحافظة أو الهاتف أو آخر أرقام الرقم الوطني. ومن المشاركين منهم في الموسم يُختار من يُسند إلى الملفات التشغيلية.</p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Tabs<Kind>
            id="emp-kind"
            value={kind}
            onChange={(v) => {
              setKind(v);
              setShown(PAGE);
            }}
            tabs={[
              { value: "all", label: "الكل", count: employees.length },
              { value: "permanent", label: "الدائمون", count: desk.permanent },
              { value: "external", label: "المنتدبون", count: desk.external },
            ]}
          />
          <SearchBox
            className="flex-1"
            value={q}
            onChange={(v) => {
              setQ(v);
              setShown(PAGE);
            }}
            label="بحث في الموظفين"
            placeholder="اسم، مسمى وظيفي، محافظة، هاتف، رقم وطني..."
          />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          <FilterSelect label="البعثة" all="كل البعثات" value={mission} onChange={setMission} options={MISSIONS} />
          <FilterSelect label="المسمى الوظيفي" all="كل المسميات" value={title} onChange={setTitle} options={usedTitles} />
          <FilterSelect label="المحافظة" all="كل المحافظات" value={city} onChange={setCity} options={usedCities} />
          <FilterSelect label="الجنس" all="الجنسان" value={gender} onChange={setGender} options={[{ value: "male", label: "ذكور" }, { value: "female", label: "إناث" }]} />
          <FilterSelect
            label="الحالة"
            all="الحالة: الكل"
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: "على رأس العمل" },
              { value: "suspended", label: "موقوفون" },
              { value: "incomplete", label: "سجلات ناقصة" },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-white/75">
            <span className="font-bold text-white tabular-nums">{formatNumber(rows.length)}</span> موظفاً
            {(q || filtersOn) && " يطابقون البحث"}
          </p>
          {(q || filtersOn) && (
            <button onClick={clear} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-gold hover:bg-white/10">
              <FilterX className="size-3.5" /> مسح البحث والتصفية
            </button>
          )}
        </div>
      </Panel>

      <Panel bodyClass="-mx-5 md:-mx-6" delay={0.05}>
        {rows.length === 0 ? (
          <div className="px-5 md:px-6">
            <Empty icon={<UserX />} title="لا أحد يطابق هذا البحث" text="جرّب كلمة أقصر، أو امسح التصفية. البحث يتجاهل الهمزات والتشكيل." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-right text-xs text-gold">
                  <th className="px-5 pb-3 font-bold md:px-6">الموظف</th>
                  <th className="pb-3 font-bold">المحافظة</th>
                  <th className="pb-3 font-bold">البعثة</th>
                  <th className="pb-3 font-bold">الهاتف</th>
                  <th className="pb-3 font-bold">موسم {CURRENT_SEASON}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.slice(0, shown).map((e, i) => {
                  const missing = missingOf(e);
                  return (
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
                              {e.staffId && <Chip tone="gold">حساب بوابة</Chip>}
                              {e.suspended && <Chip tone="maroon">موقوف</Chip>}
                              {missing.length > 0 && <Chip tone="maroon">ناقص: {missing.join("، ")}</Chip>}
                            </p>
                            <p className="text-xs text-white/65">
                              {e.jobTitle}
                              {e.kind === "external" && <span className="text-gold/90"> · منتدب من {e.organization}</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-white/85">{e.city}</td>
                      <td className="py-2.5 text-white/85">{e.mission.replace("البعثة ", "")}</td>
                      <td className="py-2.5 tabular-nums text-white/85" dir="ltr">
                        <span className="block text-right">{e.phoneSy || "—"}</span>
                      </td>
                      <td className="py-2.5">{postings.has(e.id) ? <Chip tone="gold">مُسند</Chip> : inSeason(e) ? <Chip tone="green">مشارك</Chip> : <span className="text-xs text-white/45">غير مشارك</span>}</td>
                      <td className="py-2.5 pl-4 text-white/40">
                        <ChevronLeft className="size-4" />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length > shown && (
              <div className="mt-4 text-center">
                <Button variant="glass" size="sm" onClick={() => setShown((s) => s + PAGE)}>
                  عرض {Math.min(PAGE, rows.length - shown)} آخرين — بقي {rows.length - shown}
                </Button>
              </div>
            )}
          </div>
        )}
      </Panel>

      <SystemRecords system="staff" area="register" title="سجل الإضافة والتعديل والإيقاف" />
      {panels.node}
    </div>
  );
}
