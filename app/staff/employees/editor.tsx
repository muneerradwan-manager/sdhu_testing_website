"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Save, UserX } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { itineraryOf, TRAVEL_LABEL, useFlightsData } from "@/lib/flights";
import { CURRENT_SEASON, fullName, inSeason, postingsOf, useEmployees, useOpFiles, usePlaces, type Employee } from "@/lib/ops";
import { useStaffAccounts } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { Drawer, Empty, useCan, useGrantSummary } from "../_components/kit";
import { Chip } from "../_components/ops-ui";
import { RecordHistory } from "../_components/system";
import { Box, EditHeader, EditLayout, Tag } from "../_components/wp";
import { MyFiles } from "../my-files/my-files";
import { missingOf, seasonLock } from "./desk";
import { EmployeeForm, emptyDraft } from "./employee-form";
import { useEmployeeActions, useSuspend } from "./sheet";

const FORM = "employee-form";

/**
 * One employee on his own screen, as a site's user editor: his record in the middle, saved once from the
 * side; on the side whether he works and takes part in the season, where he is posted and on which
 * flights, his portal account, the seasons he served, and his history. No `?id=` adds a new one.
 */
export function EmployeeEditor() {
  const params = useSearchParams();
  const id = params.get("id");
  const employees = useEmployees();
  const e = id ? employees.find((x) => x.id === id) : undefined;
  if (id && !e)
    return (
      <div>
        <EditHeader back="/staff/employees/manage" backLabel="سجل الموظفين" title="موظف غير موجود" />
        <Empty icon={<UserX />} title="لا موظف بهذا الرقم في السجل" text="ارجع إلى السجل وابحث عنه بالاسم." />
      </div>
    );
  return <Editor key={e?.id ?? "new"} e={e} />;
}

function Editor({ e }: { e?: Employee }) {
  const router = useRouter();
  const act = useEmployeeActions();
  const suspend = useSuspend();
  const employees = useEmployees();
  const missing = e ? missingOf(e) : [];
  const may = useCan();
  const writable = may(e ? "staff.employees.PUT" : "staff.employees.POST");
  // A new record is entered whole; an existing one shows and changes his personal data by their own permissions
  const pii = !e || may("staff.employees-pii.PUT") ? "edit" : may("staff.employees-pii.GET") ? "view" : "hidden";

  const save = (d: Parameters<typeof act.save>[0]) => {
    // What changes from elsewhere while the form is open (a suspension, an account linked) stays as it is now
    const saved = act.save(e ? { ...d, suspended: e.suspended, staffId: e.staffId } : d);
    if (!e && saved) router.replace(`/staff/employees/manage/edit?id=${saved.id}`);
  };

  return (
    <div>
      <EditHeader back="/staff/employees/manage" backLabel="سجل الموظفين" title={e ? fullName(e) : "إضافة موظف"}>
        {e ? `${e.jobTitle} · ${e.mission}` : "بياناته كما في البطاقة، ثم «إضافة الموظف» في الجانب."}
      </EditHeader>

      <EditLayout
        main={
          <>
            {missing.length > 0 && (
              <p className="flex items-start gap-2 rounded-2xl bg-maroon/20 p-3 text-sm leading-6 text-white ring-1 ring-maroon/50">
                <AlertTriangle className="mt-1 size-4 shrink-0 text-gold" /> ينقص سجله: {missing.join("، ")}. أكمله قبل أن يُسند إلى موقع أو يُوضع على رحلة.
              </p>
            )}
            <section className="rounded-2xl bg-white/[.04] p-5 ring-1 ring-white/10">
              <EmployeeForm id={FORM} initial={e ? { ...e } : emptyDraft()} all={employees} lock={e ? seasonLock(act.postsOf(e.id)) : null} onSave={save} readOnly={!writable} pii={pii} season={{ add: may("staff.season-participation.POST"), remove: may("staff.season-participation.DELETE") }} />
            </section>
          </>
        }
        side={
          <>
            <Box title={e ? "الحفظ والحالة" : "الحفظ"}>
              {e && (
                <div className="flex flex-wrap gap-1.5">
                  <Tag tone={e.kind === "permanent" ? "muted" : "gold"}>{e.kind === "permanent" ? "موظف دائم" : `منتدب — ${e.organization ?? "جهة لم تُذكر"}`}</Tag>
                  {inSeason(e) ? <Tag tone="green">مشارك في {CURRENT_SEASON}</Tag> : <Tag>غير مشارك في {CURRENT_SEASON}</Tag>}
                  {e.suspended ? <Tag tone="maroon">موقوف</Tag> : <Tag tone="green">على رأس العمل</Tag>}
                </div>
              )}
              <Button type="submit" form={FORM} variant="gold" className="w-full" disabled={!writable}>
                <Save className="size-4" /> {e ? "حفظ التعديلات" : "إضافة الموظف"}
              </Button>
              <p className="text-xs leading-5 text-white/55">{writable ? "يُسجَّل كل تغيير باسمك ووقته." : `للاطلاع: ${e ? "تعديل السجل" : "إضافة موظف"} يحتاج صلاحية «${e ? "تعديل" : "إضافة"} — سجل الموظفين».`}</p>
              {e && may("staff.employees.suspend") && (
                <button type="button" onClick={() => suspend.toggle(e)} className={cn("text-xs font-bold hover:underline", e.suspended ? "text-gold" : "text-[#ffb4c8]")}>
                  {e.suspended ? "إعادته إلى العمل" : "إيقافه عن العمل"}
                </button>
              )}
            </Box>
            {e && <Posts e={e} />}
            {e && inSeason(e) && <Flights e={e} />}
            {e && <Account e={e} />}
            {e && (
              <Box title="المواسم التي شارك فيها" open={false}>
                <div className="flex flex-wrap gap-1.5">
                  {[1443, 1444, 1445, 1446, 1447, CURRENT_SEASON].map((y) => (
                    <span key={y} className={cn("rounded-xl px-2.5 py-1 text-sm font-bold tabular-nums ring-1", e.seasons.includes(y) ? "bg-green-light/20 text-white ring-green-light/40" : "text-white/30 ring-white/10")}>
                      {y}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-white/55">مواسم سابقة مع البعثة: {e.seasons.filter((y) => y < CURRENT_SEASON).length}</p>
              </Box>
            )}
            {e && (
              <Box title="سجلّه" open={false}>
                <RecordHistory system="staff" refId={e.id} bare />
              </Box>
            )}
          </>
        }
      />
      {suspend.node}
    </div>
  );
}

/** Where the operational files posted him, this season and before, and his page as he sees it */
function Posts({ e }: { e: Employee }) {
  const files = useOpFiles();
  const places = usePlaces();
  const [preview, setPreview] = useState(false);
  const all = postingsOf(e.id, files, places).sort((a, b) => b.file.season - a.file.season);
  return (
    <Box title="المواقع في الملفات التشغيلية" open={all.length > 0}>
      {all.length === 0 ? (
        <p className="text-white/60">لم يُسند إلى أي ملف تشغيلي بعد. يُسند من «الملفات التشغيلية» إن كان مشاركاً في الموسم.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {all.map((p, i) => (
              <li key={i} className={cn("rounded-xl p-2.5 ring-1", p.file.season === CURRENT_SEASON ? "bg-gold/10 ring-gold/30" : "bg-white/5 ring-white/10")}>
                <p className="flex flex-wrap items-center justify-between gap-1 font-bold text-white">
                  {p.role.name} <Tag tone={p.file.season === CURRENT_SEASON ? "gold" : "muted"}>{p.file.season}</Tag>
                </p>
                <p className="text-xs text-white/70">
                  {p.type.short}
                  {p.outer && ` · ${p.outer.name}`}
                  {p.inner && ` · ${p.inner.name}`}
                </p>
                {p.housing && <p className="text-xs text-white/55">يسكن في: {p.housing.name}</p>}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setPreview(true)} className="text-xs font-bold text-gold hover:underline">
            صفحته كما يراها ←
          </button>
          <Drawer open={preview} onClose={() => setPreview(false)} title={`ملفات ${fullName(e)} التشغيلية — كما تظهر له`} width="max-w-5xl">
            <MyFiles employee={e} travels={e.seasons.includes(CURRENT_SEASON)} />
          </Drawer>
        </>
      )}
    </Box>
  );
}

/** His seats this season, as the flights file holds them */
function Flights({ e }: { e: Employee }) {
  const flights = useFlightsData();
  const trip = itineraryOf(e.id, flights);
  const flightNo = (id?: string) => flights.flights.find((f) => f.id === id)?.flightNo;
  return (
    <Box title={`رحلتاه في موسم ${CURRENT_SEASON}`}>
      <Tag tone={trip.outbound ? "green" : "muted"}>{TRAVEL_LABEL[trip.status]}</Tag>
      <dl className="grid grid-cols-2 gap-2">
        {(
          [
            ["الذهاب", flightNo(trip.outbound?.flightId)],
            ["العودة", flightNo(trip.return?.flightId)],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] font-bold text-gold/90">{k}</dt>
            <dd className="font-mono text-sm text-white" dir="ltr">
              {v ?? "—"}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-white/55">يضعه على رحلتيه مسؤول الطيران.</p>
    </Box>
  );
}

/** His login to the portal, when he has one */
function Account({ e }: { e: Employee }) {
  const account = useStaffAccounts().find((a) => a.id === e.staffId);
  const summary = useGrantSummary(account ?? null);
  if (!account)
    return (
      <Box title="حساب البوابة" open={false}>
        <p className="text-white/60">لا حساب له في بوابة الموظفين. تُربط الحسابات بسجلات أصحابها من «حسابات البوابة».</p>
        <Link href="/staff/employees/manage/accounts?f=unlinked" className="text-xs font-bold text-gold hover:underline">
          الحسابات بلا سجل ←
        </Link>
      </Box>
    );
  return (
    <Box title="حساب البوابة">
      <p className="text-white/80">
        <span className="font-bold text-gold" dir="ltr">
          {account.username}
        </span>{" "}
        — {account.title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {summary.map((x) => (
          <Chip key={x}>{x}</Chip>
        ))}
      </div>
      <Link href={`/staff/employees/manage/accounts?a=${account.id}`} className="text-xs font-bold text-gold hover:underline">
        افتح الحساب وسجلّه ←
      </Link>
    </Box>
  );
}
