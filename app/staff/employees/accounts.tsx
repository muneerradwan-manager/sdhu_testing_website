"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Link2, Link2Off, Send, Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { employeeHaystack, fullName, matches, opsActions, type Employee } from "@/lib/ops";
import { grantSummary, PERM_SYSTEM } from "@/lib/permissions";
import { isGrantor } from "@/lib/staff";
import { SYSTEMS } from "@/lib/systems";
import { digitsOnly } from "@/lib/utils";
import { can, Drawer, logAs, useCan, useScopeNames, useStaffUser } from "../_components/kit";
import { Chip, InfoGrid, SearchBox, SectionTitle } from "../_components/ops-ui";
import { RecordHistory } from "../_components/system";
import { EmptyRow, ListTable, RecordsBox, RowActions, RowLink, Tag } from "../_components/wp";
import { useEmployeesDesk, type AccountRow } from "./desk";
import { maskPhone } from "./sheet";
import { FilterLinks, HowTo, ListToolbar } from "./list-ui";

/** The field posts its permissions give an account: a hall it supervises, an airport it represents */
const fieldPostsOf = (r: AccountRow) => [...r.halls.map((c) => ({ id: c.id, label: `مشرف قاعة امتحانية — ${c.name}` })), ...r.airports.map((a) => ({ id: a.id, label: `مندوب ${a.name}` }))];

/** The views of the list a link may ask for (`?f=`) */
type Show = "" | "unlinked" | "managed" | "field" | "none";
const SHOWS: Show[] = ["unlinked", "managed", "field", "none"];
const inShow = (show: Show, r: AccountRow) => !show || (show === "unlinked" ? !r.employee : show === "managed" ? r.managed.length > 0 : show === "field" ? fieldPostsOf(r).length > 0 : !r.account.grants.length);

/** The phone a temporary password goes to: the one in his record, when it is whole */
const phoneOf = (r: AccountRow) => (r.employee && digitsOnly(r.employee.phoneSy).length >= 10 ? r.employee.phoneSy : null);

/** Linking an account to its record, unlinking it, and sending a temporary password — each by its permission, each logged */
function useAccountActions() {
  const user = useStaffUser()!;
  const toast = useToast();
  const refused = (key: string, what: string) => !can(user, key) && (toast({ title: "ليست لك صلاحيته", body: what, tone: "warning", icon: "🔒" }), true);
  return {
    link(account: AccountRow["account"], e: Employee) {
      if (refused("staff.accounts.PUT", "ربط الحساب بسجل")) return;
      opsActions.saveEmployee({ ...e, staffId: account.id });
      logAs(user, { action: "ربط حساب بسجل موظف", target: account.name, after: `${fullName(e)} (${e.id})`, system: "staff", area: "accounts", ref: account.id });
      toast({ title: "رُبط الحساب بسجل صاحبه", body: `${account.username} — ${fullName(e)}`, tone: "success", icon: "🔗" });
    },
    unlink(account: AccountRow["account"], e: Employee) {
      if (refused("staff.accounts.PUT", "فك ربط الحساب")) return;
      opsActions.saveEmployee({ ...e, staffId: undefined });
      logAs(user, { action: "فك ربط حساب", target: account.name, before: `${fullName(e)} (${e.id})`, after: "بلا سجل", system: "staff", area: "accounts", ref: account.id });
      toast({ title: "فُكّ ربط الحساب", body: `${account.username} بلا سجل موظف الآن.`, tone: "info", icon: "✂️" });
    },
    sendPassword(account: AccountRow["account"], to: string) {
      if (refused("staff.accounts.reset-password", "إرسال كلمة مرور مؤقتة")) return;
      logAs(user, { action: "إرسال كلمة مرور مؤقتة", target: account.name, detail: `برسالة إلى ${to}`, system: "staff", area: "accounts", ref: account.id });
      toast({ title: "أُرسلت كلمة مرور مؤقتة", body: `إلى ${can(user, "staff.employees-pii.GET") ? to : maskPhone(to)}. يغيّرها ${account.name} عند أول دخول.`, tone: "success", icon: "🔑" });
    },
  };
}

/**
 * Every login to the staff portal, the second operation of the employees file, as a site's users list: its
 * views with their counts, a search, and a table whose rows open each account's sheet on its name — what
 * its permissions open, the field posts other files gave it, the record it belongs to (linked or unlinked
 * there), and a temporary password sent to the phone in that record. The accounts themselves are fixed in
 * this demo. A link from the summary opens one (`?a=`) or a view (`?f=`). The records wait closed at the end.
 */
export function Accounts() {
  const params = useSearchParams();
  const desk = useEmployeesDesk();
  const nameOf = useScopeNames();
  const may = useCan();
  const act = useAccountActions();
  const [q, setQ] = useState("");
  const [show, setShow] = useState<Show>(SHOWS.find((x) => x === params.get("f")) ?? "");
  const [openId, setOpenId] = useState<string | null>(params.get("a"));
  const open = desk.accounts.find((r) => r.account.id === openId) ?? null;
  const count = (v: Show) => desk.accounts.filter((r) => inShow(v, r)).length;

  const rows = desk.accounts
    .filter((r) => inShow(show, r))
    .filter((r) => matches(q, [r.account.name, r.account.username, r.account.title, r.employee && fullName(r.employee)]))
    // Those waiting for their record first
    .sort((a, b) => Number(!!a.employee) - Number(!!b.employee));

  return (
    <div className="space-y-4">
      <ListToolbar
        filters={
          <FilterLinks<Show>
            label="عرض الحسابات"
            value={show}
            onChange={setShow}
            items={[
              { value: "", label: "الكل", count: desk.accounts.length },
              { value: "unlinked", label: "بلا سجل موظف", count: desk.unlinked.length, alert: true },
              { value: "managed", label: "بصلاحية إدارة ملف", count: count("managed") },
              { value: "field", label: "بموقع ميداني", count: count("field") },
              { value: "none", label: "بلا صلاحية", count: count("none") },
            ]}
          />
        }
      >
        <SearchBox className="flex-1" value={q} onChange={setQ} label="بحث في الحسابات" placeholder="اسم، اسم دخول، صفة..." />
      </ListToolbar>

      <ListTable head={["الحساب", "الصلاحيات والمواقع", "سجل الموظف"]} minWidth="44rem">
        {rows.length === 0 ? (
          <EmptyRow cols={3}>لا حساب يطابق هذا البحث. امسح البحث أو اختر «الكل».</EmptyRow>
        ) : (
          rows.map((r) => {
            const phone = phoneOf(r);
            return (
              <tr key={r.account.id} className={r.employee ? "align-top" : "bg-maroon/10 align-top"}>
                <td className="p-3">
                  <button type="button" onClick={() => setOpenId(r.account.id)} className="text-right font-bold text-white hover:text-gold">
                    {r.account.name}
                  </button>
                  <p className="text-xs text-white/65">
                    <span className="font-mono text-gold" dir="ltr">
                      {r.account.username}
                    </span>{" "}
                    · {r.account.title}
                  </p>
                  <RowActions>
                    <RowLink onClick={() => setOpenId(r.account.id)}>{r.employee || !may("staff.accounts.PUT") ? "فتح" : "ربط بسجل"}</RowLink>
                    {r.employee && <RowLink href={`/staff/employees/manage/edit?id=${r.employee.id}`}>سجله</RowLink>}
                    {phone && may("staff.accounts.reset-password") && <RowLink onClick={() => act.sendPassword(r.account, phone)}>إرسال كلمة مرور</RowLink>}
                  </RowActions>
                </td>
                <td className="p-3">
                  <span className="flex flex-wrap gap-1">
                    {/* System by system: a management file in gold, a field post (a hall, an airport) in green */}
                    {grantSummary(r.account, nameOf).map((x) => (
                      <Chip key={x} tone={r.managed.some((k) => x.startsWith(`${SYSTEMS[k].label} —`)) ? "gold" : x.startsWith(`${PERM_SYSTEM.hall.label} —`) || x.startsWith(`${PERM_SYSTEM.airport.label} —`) ? "green" : "muted"}>
                        {x}
                      </Chip>
                    ))}
                    {!r.account.grants.length && <span className="text-xs text-white/50">بلا صلاحية</span>}
                  </span>
                </td>
                <td className="p-3">{r.employee ? <Tag tone="green">{r.employee.id}</Tag> : <Tag tone="maroon">بلا سجل</Tag>}</td>
              </tr>
            );
          })
        )}
      </ListTable>

      <HowTo>
        <p>كل من يدخل بوابة الموظفين: صفته، وما يملكه في كل نظام، والقاعة أو المطار الذي تخصه صلاحياته، وسجل الموظف الذي يعود إليه.</p>
        <p>اربط كل حساب بسجل صاحبه، فمنه تُعرف بياناته وإليه تُرسل كلمة المرور المؤقتة.</p>
        <p>الحسابات ثابتة في هذا العرض: لا يُفتح منه حساب جديد، ولا تُعدَّل منه الصلاحيات. تُمنح الصلاحيات وتُسحب واحدة واحدة من «صلاحيات الموظفين».</p>
      </HowTo>
      <RecordsBox system="staff" area="accounts" title="سجل الحسابات" />
      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open ? `حساب ${open.account.name}` : ""} width="max-w-xl">
        {open && <AccountSheet key={open.account.id} r={open} />}
      </Drawer>
    </div>
  );
}

/** One account: what it opens and why, the record it belongs to, and its own history */
function AccountSheet({ r }: { r: AccountRow }) {
  const act = useAccountActions();
  const desk = useEmployeesDesk();
  const user = useStaffUser();
  const nameOf = useScopeNames();
  const may = useCan();
  const { account, employee } = r;
  // The record is looked up by the account holder's name, as HR would
  const [q, setQ] = useState(account.name.replace(/^د\.\s*/, "").replace(/\s*\(.*\)$/, ""));
  const candidates = desk.withoutAccount.filter((e) => matches(q, employeeHaystack(e, may("staff.employees-pii.GET"))));
  // The temporary password goes to the phone in his record, so it needs both
  const phone = phoneOf(r);
  const link = (e: Employee) => act.link(account, e);
  const unlink = (e: Employee) => act.unlink(account, e);
  const sendPassword = (to: string) => act.sendPassword(account, to);

  return (
    <div>
      <p className="font-display text-2xl font-bold text-white">{account.name}</p>
      <p className="text-sm text-white/70">
        <span className="font-mono text-gold" dir="ltr">
          {account.username}
        </span>{" "}
        · {account.title}
      </p>

      <SectionTitle>الصلاحيات</SectionTitle>
      {account.grants.length === 0 ? (
        <p className="text-sm leading-6 text-white/65">لا صلاحية له: لا يرى في البوابة إلا «ملفاتي التشغيلية».</p>
      ) : (
        <ul className="space-y-1.5">
          {grantSummary(account, nameOf).map((x) => (
            <li key={x} className="flex items-center gap-1.5 rounded-xl bg-white/[.06] px-3 py-2 text-sm text-white ring-1 ring-white/10">
              {r.managed.some((key) => x.startsWith(`${SYSTEMS[key].label} —`)) && <Star className="size-3.5 shrink-0 fill-gold text-gold" />}
              {x}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs leading-5 text-white/60">
        تُمنح الصلاحيات وتُسحب من «صلاحيات الموظفين»، صلاحيةً صلاحية، وبعضها لقاعة أو مطار بعينه.
        {isGrantor(user) && (
          <>
            {" "}
            <Link href={`/staff/access?id=${account.id}`} className="inline-flex items-center gap-1 font-bold text-gold hover:underline">
              <KeyRound className="size-3" /> صلاحياته
            </Link>
          </>
        )}
      </p>

      <SectionTitle>سجل الموظف</SectionTitle>
      {employee ? (
        <>
          <InfoGrid
            rows={[
              ["الاسم", fullName(employee)],
              ["رقم السجل", employee.id],
              ["المسمى الوظيفي", employee.jobTitle],
              ["البعثة", employee.mission],
            ]}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/staff/employees/manage/edit?id=${employee.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-2xl bg-gold px-4 text-sm font-semibold text-ink transition hover:bg-gold-light">
              افتح سجله <ArrowLeft className="size-4" />
            </Link>
            {may("staff.accounts.PUT") && (
              <Button size="sm" variant="glass" className="hover:bg-maroon/50" onClick={() => unlink(employee)}>
                <Link2Off className="size-4" /> فك الربط
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-sm leading-6 text-white/70">هذا الحساب لا يعود إلى أي سجل موظف. ابحث عن سجل صاحبه بين الموظفين الذين لا حساب لهم، واربطه به.</p>
          <SearchBox value={q} onChange={setQ} label="بحث عن سجل صاحب الحساب" placeholder="اسم، مسمى، هاتف، رقم وطني..." />
          {candidates.length === 0 ? (
            <p className="text-xs leading-5 text-white/55">لا سجل بلا حساب يطابق هذا البحث. إن لم يكن له سجل بعد فأضفه من «السجل» ثم اربطه هنا.</p>
          ) : (
            <ul className="space-y-1.5">
              {candidates.slice(0, 6).map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/[.06] px-3 py-2 ring-1 ring-white/10">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-white">{fullName(e)}</span>
                    <span className="block text-xs text-white/60">
                      {e.id} · {e.jobTitle} · {e.city}
                    </span>
                  </span>
                  <Button size="sm" variant="gold" disabled={!may("staff.accounts.PUT")} onClick={() => link(e)}>
                    <Link2 className="size-4" /> ربط
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <SectionTitle>كلمة المرور</SectionTitle>
      <Button size="sm" variant="glass" disabled={!phone || !may("staff.accounts.reset-password")} onClick={() => phone && sendPassword(phone)}>
        <Send className="size-4" /> إرسال كلمة مرور مؤقتة
      </Button>
      <p className="mt-2 text-xs leading-5 text-white/55">{!may("staff.accounts.reset-password") ? "يحتاج صلاحية «إرسال كلمة مرور مؤقتة»." : phone ? `تصله برسالة على ${may("staff.employees-pii.GET") ? phone : maskPhone(phone)}، هاتفه في سجله، ويغيّرها عند أول دخول.` : employee ? "لا هاتف سوري كامل في سجله: أكمله أولاً." : "تُرسل إلى الهاتف في سجله: اربط الحساب بسجل صاحبه أولاً."}</p>

      <div className="mt-6">
        <RecordHistory system="staff" refId={account.id} />
      </div>
    </div>
  );
}
