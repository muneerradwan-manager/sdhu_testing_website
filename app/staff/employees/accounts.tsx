"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, KeyRound, Link2, Link2Off, Send, Star, UserX } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { employeeHaystack, fullName, matches, opsActions, type Employee } from "@/lib/ops";
import { holdsAll, PERMISSION_LABELS } from "@/lib/staff";
import { SYSTEM_KEYS, SYSTEMS, useHolders } from "@/lib/systems";
import { cn, digitsOnly } from "@/lib/utils";
import { Drawer, Empty, Panel, fmtDate, logAs, useStaffUser } from "../_components/kit";
import { Chip, FilterSelect, InfoGrid, SearchBox, SectionTitle } from "../_components/ops-ui";
import { RecordHistory, SystemRecords } from "../_components/system";
import { useEmployeesDesk, type AccountRow } from "./desk";

/** The field posts other files gave an account: a hall from the exams file, an airport from the flights file */
const fieldPostsOf = (r: AccountRow) => [...r.halls.map((c) => ({ id: c.id, label: `مشرف قاعة امتحانية — ${c.name}`, by: SYSTEMS.exams.label })), ...r.airports.map((a) => ({ id: a.id, label: `مندوب ${a.name}`, by: SYSTEMS.flights.label }))];

/** The views of the list a link may ask for (`?f=`) */
const SHOWS = ["unlinked", "managed", "field", "none"];

/**
 * Every login to the staff portal, the second tab of the employees file: its title, what its permissions
 * open, the field posts other files gave it, and the employee record it belongs to. The owner links an
 * account to its record or unlinks it, and sends a temporary password to the phone in that record. The
 * accounts themselves are fixed in this demo. A link from the summary opens one (`?a=`) or a filter (`?f=`).
 */
export function Accounts() {
  const params = useSearchParams();
  const desk = useEmployeesDesk();
  const [q, setQ] = useState("");
  const [show, setShow] = useState(SHOWS.find((x) => x === params.get("f")) ?? "");
  const [openId, setOpenId] = useState<string | null>(params.get("a"));
  const open = desk.accounts.find((r) => r.account.id === openId) ?? null;

  const rows = desk.accounts
    .filter((r) => !show || (show === "unlinked" ? !r.employee : show === "managed" ? r.managed.length > 0 : show === "field" ? fieldPostsOf(r).length > 0 : !r.account.permissions.length))
    .filter((r) => matches(q, [r.account.name, r.account.username, r.account.title, r.employee && fullName(r.employee)]))
    // Those waiting for their record first
    .sort((a, b) => Number(!!a.employee) - Number(!!b.employee));

  return (
    <div className="space-y-6">
      <Panel icon={<KeyRound />} title="حسابات البوابة" bodyClass="space-y-3">
        <p className="text-sm leading-7 text-white/70">
          كل من يدخل بوابة الموظفين: صفته، وما تفتحه له صلاحياته، والمواقع الميدانية التي أسندتها إليه الملفات الأخرى، وسجل الموظف الذي يعود إليه. اربط كل حساب بسجل صاحبه، فمنه تُعرف بياناته وإليه تُرسل كلمة المرور المؤقتة.
        </p>
        <p className="rounded-2xl bg-white/[.06] px-3 py-2 text-xs leading-5 text-white/65 ring-1 ring-white/10">الحسابات ثابتة في هذا العرض: لا يُفتح منه حساب جديد، ولا تُعدَّل صلاحيات المهام. وصلاحيات إدارة الملفات تمنحها مديرة الموسم من «صلاحيات الإدارة».</p>
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
          <SearchBox value={q} onChange={setQ} label="بحث في الحسابات" placeholder="اسم، اسم دخول، صفة..." />
          <FilterSelect
            label="الحسابات"
            all={`كل الحسابات (${desk.accounts.length})`}
            value={show}
            onChange={setShow}
            options={[
              { value: "unlinked", label: `بلا سجل موظف (${desk.unlinked.length})` },
              { value: "managed", label: "بصلاحية إدارة ملف" },
              { value: "field", label: "بموقع ميداني" },
              { value: "none", label: "بلا صلاحية" },
            ]}
          />
        </div>
      </Panel>

      {rows.length === 0 ? (
        <Empty icon={<UserX />} title="لا حساب يطابق هذا البحث" text="امسح البحث أو اختر «كل الحسابات»." />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {rows.map((r, i) => (
            <motion.li key={r.account.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 16) * 0.02 }}>
              <button onClick={() => setOpenId(r.account.id)} className={cn("w-full rounded-2xl p-3 text-right ring-1 transition hover:ring-gold/50", r.employee ? "bg-white/[.06] ring-white/10" : "bg-maroon/15 ring-maroon/40")}>
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block font-bold text-white">
                      {r.account.name}{" "}
                      <span className="font-mono text-xs text-gold" dir="ltr">
                        {r.account.username}
                      </span>
                    </span>
                    <span className="block text-xs text-white/65">{r.account.title}</span>
                  </span>
                  {r.employee ? <Chip tone="green">سجل {r.employee.id}</Chip> : <Chip tone="maroon">بلا سجل</Chip>}
                </span>
                <span className="mt-2 flex flex-wrap gap-1">
                  {/* The director's task permissions in one chip: she holds them all */}
                  {holdsAll(r.account) && <Chip>كل صلاحيات المهام</Chip>}
                  {r.account.permissions
                    .filter((p) => r.managed.includes(p) || !holdsAll(r.account))
                    .map((p) => (
                      <Chip key={p} tone={r.managed.includes(p) ? "gold" : "muted"}>
                        {r.managed.includes(p) && <Star className="size-3 fill-gold" />}
                        {PERMISSION_LABELS[p]}
                      </Chip>
                    ))}
                  {fieldPostsOf(r).map((x) => (
                    <Chip key={x.id} tone="green">
                      {x.label}
                    </Chip>
                  ))}
                  {!r.account.permissions.length && !fieldPostsOf(r).length && <span className="text-xs text-white/50">بلا صلاحية ولا موقع ميداني</span>}
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      <SystemRecords system="staff" area="accounts" title="سجل الحسابات" />
      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open ? `حساب ${open.account.name}` : ""} width="max-w-xl">
        {open && <AccountSheet key={open.account.id} r={open} />}
      </Drawer>
    </div>
  );
}

/** One account: what it opens and why, the record it belongs to, and its own history */
function AccountSheet({ r }: { r: AccountRow }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const desk = useEmployeesDesk();
  const holders = useHolders();
  const { account, employee } = r;
  // The record is looked up by the account holder's name, as HR would
  const [q, setQ] = useState(account.name.replace(/^د\.\s*/, "").replace(/\s*\(.*\)$/, ""));
  const candidates = desk.withoutAccount.filter((e) => matches(q, employeeHaystack(e)));
  // The temporary password goes to the phone in his record, so it needs both
  const phone = employee && digitsOnly(employee.phoneSy).length >= 10 ? employee.phoneSy : null;

  const link = (e: Employee) => {
    opsActions.saveEmployee({ ...e, staffId: account.id });
    logAs(user, { action: "ربط حساب بسجل موظف", target: account.name, after: `${fullName(e)} (${e.id})`, system: "staff", area: "accounts", ref: account.id });
    toast({ title: "رُبط الحساب بسجل صاحبه", body: `${account.username} — ${fullName(e)}`, tone: "success", icon: "🔗" });
  };
  const unlink = (e: Employee) => {
    opsActions.saveEmployee({ ...e, staffId: undefined });
    logAs(user, { action: "فك ربط حساب", target: account.name, before: `${fullName(e)} (${e.id})`, after: "بلا سجل", system: "staff", area: "accounts", ref: account.id });
    toast({ title: "فُكّ ربط الحساب", body: `${account.username} بلا سجل موظف الآن.`, tone: "info", icon: "✂️" });
  };
  const sendPassword = (to: string) => {
    logAs(user, { action: "إرسال كلمة مرور مؤقتة", target: account.name, detail: `برسالة إلى ${to}`, system: "staff", area: "accounts", ref: account.id });
    toast({ title: "أُرسلت كلمة مرور مؤقتة", body: `إلى ${to}. يغيّرها ${account.name} عند أول دخول.`, tone: "success", icon: "🔑" });
  };

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
      {account.permissions.length === 0 ? (
        <p className="text-sm leading-6 text-white/65">لا صلاحية له: لا يرى في البوابة إلا ما أسندته إليه الملفات الأخرى.</p>
      ) : (
        <ul className="space-y-1.5">
          {r.managed.map((p) => {
            const key = SYSTEM_KEYS.find((k) => SYSTEMS[k].permission === p)!;
            const grant = holders[key].find((h) => h.staffId === account.id);
            return (
              <li key={p} className="rounded-xl bg-gold/10 px-3 py-2 ring-1 ring-gold/30">
                <p className="flex items-center gap-1.5 text-sm font-bold text-gold">
                  <Star className="size-3.5 fill-gold" /> {PERMISSION_LABELS[p]}
                </p>
                <p className="text-xs leading-5 text-white/70">
                  تمنحها مديرة الموسم من صلاحيات الإدارة{grant?.by ? ` — منحتها ${grant.by}` : ""}
                  {grant?.at ? ` في ${fmtDate(grant.at)}` : ""}.
                </p>
              </li>
            );
          })}
          {r.account.permissions.length > r.managed.length && (
            <li className="flex flex-wrap gap-1.5 pt-1">
              {account.permissions
                .filter((p) => !r.managed.includes(p))
                .map((p) => (
                  <Chip key={p}>{PERMISSION_LABELS[p]}</Chip>
                ))}
            </li>
          )}
        </ul>
      )}

      <SectionTitle>المواقع الميدانية</SectionTitle>
      {fieldPostsOf(r).length === 0 ? (
        <p className="text-sm text-white/60">لا موقع ميداني له.</p>
      ) : (
        <ul className="space-y-1.5">
          {fieldPostsOf(r).map((x) => (
            <li key={x.id} className="rounded-xl bg-white/[.06] px-3 py-2 ring-1 ring-white/10">
              <p className="text-sm font-bold text-white">{x.label}</p>
              <p className="text-xs text-white/60">أسندها إليه صاحب «{x.by}»، وتظهر له في قائمته.</p>
            </li>
          ))}
        </ul>
      )}

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
            <Link href={`/staff/employees/manage?e=${employee.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-2xl bg-gold px-4 text-sm font-semibold text-ink transition hover:bg-gold-light">
              افتح سجله <ArrowLeft className="size-4" />
            </Link>
            <Button size="sm" variant="glass" className="hover:bg-maroon/50" onClick={() => unlink(employee)}>
              <Link2Off className="size-4" /> فك الربط
            </Button>
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
                  <Button size="sm" variant="gold" onClick={() => link(e)}>
                    <Link2 className="size-4" /> ربط
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <SectionTitle>كلمة المرور</SectionTitle>
      <Button size="sm" variant="glass" disabled={!phone} onClick={() => phone && sendPassword(phone)}>
        <Send className="size-4" /> إرسال كلمة مرور مؤقتة
      </Button>
      <p className="mt-2 text-xs leading-5 text-white/55">{phone ? `تصله برسالة على ${phone}، هاتفه في سجله، ويغيّرها عند أول دخول.` : employee ? "لا هاتف سوري كامل في سجله: أكمله أولاً." : "تُرسل إلى الهاتف في سجله: اربط الحساب بسجل صاحبه أولاً."}</p>

      <div className="mt-6">
        <RecordHistory system="staff" refId={account.id} />
      </div>
    </div>
  );
}
