"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Copy, KeyRound, Save, ShieldAlert, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { CATALOG, PERM_SYSTEM, VERBS, VERB_LABEL, keysOf, scopeKindOf, systemKeys, viewKeys, type PermGrant, type PermSystem, type ResourceDef, type ScopeKind } from "@/lib/permissions";
import { SCOPE_LABEL } from "@/lib/permissions";
import type { StaffUser } from "@/lib/staff";
import { actions, useStore } from "@/lib/store";
import { SYSTEM_KEYS, systemActions, useStaffAccounts, type SystemKey } from "@/lib/systems";
import { cn, nowMs } from "@/lib/utils";
import { useAdminsStatus } from "../admins/desk";
import { useEmployeesStatus } from "../employees/desk";
import { Chip, Pick, Segments, selectClass } from "../exam/_components/ui";
import { useRegistrationStatus } from "../hajj/desk";
import { SearchBox } from "../_components/ops-ui";
import { can, fmtDate, Gate, logAs, PageHeader, useGrantSummary, useScopeNames, useScopeOptions, useStaffUser } from "../_components/kit";
import { EditHeader, EditLayout, EmptyRow, ListTable, RowActions, RowLink, Tag } from "../_components/wp";
import { BASE, FileOverview, useExamStatus, useFlightsStatus, type Status } from "./overview";

/**
 * «صلاحيات الموظفين»: nobody is assigned a system; each permission is granted to an employee directly — viewing a
 * resource, adding to it, changing it, deleting from it, or a named act on it (lib/permissions.ts) — and some for
 * a scope only (a hall, an airport, an operation…). The page lists the employees (`?id=` opens one, system by
 * system, resource by resource, the verbs side by side), who holds what in each system (`?system=`), and how the
 * management files stand. Every grant and every withdrawal is an important event in the audit log.
 */
export function AccessView() {
  return (
    <Gate perms={viewKeys("access")}>
      <Access />
    </Gate>
  );
}

type View = "people" | "systems" | "files";

function Access() {
  const params = useSearchParams();
  const user = useStaffUser()!;
  const accounts = useStaffAccounts();
  const id = params.get("id");
  const system = params.get("system");
  const account = accounts.find((a) => a.id === id);
  const [view, setView] = useState<View>(() => (params.get("view") === "systems" ? "systems" : params.get("view") === "files" ? "files" : "people"));

  if (account && can(user, "access.permissions.GET")) return <EmployeeScreen key={account.id} account={account} />;
  if (system && PERM_SYSTEM[system] && can(user, "access.permissions.GET")) return <SystemScreen key={system} sys={PERM_SYSTEM[system]} />;

  const views = [
    can(user, "access.permissions.GET") && { value: "people" as const, label: "الموظفون وصلاحياتهم" },
    can(user, "access.permissions.GET") && { value: "systems" as const, label: "من يملك ماذا" },
    (can(user, "access.important-events.GET") || can(user, "access.escalations.GET")) && { value: "files" as const, label: "ملفات الإدارة" },
  ].filter((x): x is { value: View; label: string } => !!x);
  const shown = views.some((v) => v.value === view) ? view : views[0]?.value;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="بوابة الموظفين"
        title="صلاحيات الموظفين"
        icon={<KeyRound />}
        description="لا يُسند موظف إلى نظام: تُمنح له على كل نظام الصلاحيات التي يحتاجها وحدها — عرض، إضافة، تعديل، حذف، وأفعال بأسمائها كالاعتماد والنشر — وبعضها لقاعة أو مطار أو عملية بعينها. والعرض نفسه صلاحية: لا يظهر نظام في قائمة موظف لا يملك فيه عرض شيء."
      />
      {views.length > 1 && <Segments value={shown!} onChange={setView} items={views} label="عرض الصفحة" />}
      {shown === "people" && <People />}
      {shown === "systems" && <Systems />}
      {shown === "files" && <Files />}
    </div>
  );
}

// ───────────────────────── The employees ─────────────────────────

function People() {
  const accounts = useStaffAccounts();
  const nameOf = useScopeNames();
  const [q, setQ] = useState("");
  const rows = accounts.filter((a) => !q.trim() || `${a.name} ${a.title} ${a.username}`.includes(q.trim()));
  return (
    <div className="space-y-4">
      <SearchBox value={q} onChange={setQ} placeholder="ابحث باسم الموظف أو صفته" label="بحث في الموظفين" className="max-w-md" />
      <ListTable head={["الموظف", "صلاحياته نظاماً نظاماً", "العدد", "آخر منح"]} minWidth="48rem">
        {rows.length === 0 && <EmptyRow cols={4}>لا موظف بهذا الاسم.</EmptyRow>}
        {rows.map((a) => {
          const last = a.grants.reduce<PermGrant | null>((m, g) => (g.at && (!m?.at || g.at > m.at) ? g : m), null);
          return (
            <tr key={a.id} className="align-top">
              <td className="p-3">
                <p className="flex items-center gap-2 font-bold text-white">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-gold to-gold-dark font-display text-ink">{a.initials}</span>
                  <Link href={`${BASE}?id=${a.id}`} className="hover:text-gold">
                    {a.name}
                  </Link>
                </p>
                <p className="mt-0.5 text-xs text-white/60">{a.title}</p>
                <RowActions>
                  <RowLink href={`${BASE}?id=${a.id}`}>صلاحياته</RowLink>
                </RowActions>
              </td>
              <td className="p-3">
                <span className="flex flex-wrap gap-1">
                  {grantLines(a, nameOf).map((x) => (
                    <Chip key={x} tone="muted">
                      {x}
                    </Chip>
                  ))}
                  {!a.grants.length && <span className="text-xs text-white/50">بلا صلاحية: يرى «ملفاتي التشغيلية» وحدها</span>}
                </span>
              </td>
              <td className="p-3 font-display text-lg font-bold tabular-nums text-white">{a.grants.length}</td>
              <td className="p-3 text-xs text-white/65">{last?.at ? `${fmtDate(last.at)}${last.by ? ` — ${last.by}` : ""}` : "—"}</td>
            </tr>
          );
        })}
      </ListTable>
    </div>
  );
}

/** «إدارة الطيران — كاملة», «قاعة الامتحان — مركز دمشق» */
function grantLines(a: StaffUser, nameOf: (kind: ScopeKind, id: string) => string) {
  return CATALOG.flatMap((s) => {
    const held = a.grants.filter((g) => g.key.startsWith(`${s.key}.`));
    if (!held.length) return [];
    const total = systemKeys(s.key).length;
    const scoped = s.scope ? [...new Set(held.flatMap((g) => (g.scope ?? []).map((id) => nameOf(s.scope!, id))))] : [];
    return [`${s.label} — ${scoped.length ? scoped.join("، ") : held.length >= total ? "كاملة" : `${held.length} من ${total}`}`];
  });
}

// ───────────────────────── Who holds what ─────────────────────────

function Systems() {
  const accounts = useStaffAccounts();
  return (
    <ListTable head={["النظام", "صلاحياته", "من يملك فيه شيئاً"]} minWidth="44rem">
      {CATALOG.map((s) => {
        const keys = systemKeys(s.key);
        const holders = accounts.filter((a) => a.grants.some((g) => g.key.startsWith(`${s.key}.`)));
        return (
          <tr key={s.key} className="align-top">
            <td className="p-3">
              <Link href={`${BASE}?system=${s.key}`} className="font-bold text-white hover:text-gold">
                {s.label}
              </Link>
              <p className="mt-0.5 max-w-sm text-xs leading-5 text-white/60">{s.desc}</p>
              {s.scope && <p className="mt-1 text-[11px] text-gold">تُمنح لـ{SCOPE_LABEL[s.scope]} بعينها</p>}
            </td>
            <td className="p-3 text-xs text-white/70">
              {keys.length} صلاحية في {s.resources.length} موارد
            </td>
            <td className="p-3 text-xs text-white/80">{holders.length ? holders.map((h) => h.name).join("، ") : <Tag tone="maroon">لا أحد</Tag>}</td>
          </tr>
        );
      })}
    </ListTable>
  );
}

/** One system, resource by resource: who holds each verb, and for which scope */
function SystemScreen({ sys }: { sys: PermSystem }) {
  const accounts = useStaffAccounts();
  const nameOf = useScopeNames();
  const who = (key: string) =>
    accounts.flatMap((a) => {
      const g = a.grants.find((x) => x.key === key);
      if (!g) return [];
      const kind = scopeKindOf(key);
      return [g.scope?.length && kind ? `${a.name} (${g.scope.map((id) => nameOf(kind, id)).join("، ")})` : a.name];
    });
  return (
    <div>
      <EditHeader back={`${BASE}?view=systems`} backLabel="من يملك ماذا" title={`${sys.label}: من يملك ماذا`}>
        {sys.desc}
      </EditHeader>
      <ListTable head={["المورد", "الصلاحية", "من يملكها"]} minWidth="40rem">
        {sys.resources.flatMap((r) =>
          keysOf(sys.key, r).map((key, i) => {
            const verb = key.split(".")[2];
            const holders = who(key);
            return (
              <tr key={key} className={cn("align-top", i === 0 && "border-t-2 border-white/15")}>
                <td className="p-3">
                  {i === 0 && (
                    <p className="font-bold text-white">
                      {r.label} {r.sensitive && <Tag tone="maroon">حساس</Tag>}
                    </p>
                  )}
                </td>
                <td className="p-3 text-sm text-white/85">{verbLabel(r, verb)}</td>
                <td className="p-3 text-xs text-white/75">{holders.length ? holders.join("، ") : <span className="text-white/40">لا أحد</span>}</td>
              </tr>
            );
          }),
        )}
      </ListTable>
    </div>
  );
}

const verbLabel = (r: ResourceDef, verb: string) => (VERB_LABEL as Record<string, string>)[verb] ?? r.special?.find(([k]) => k === verb)?.[1] ?? verb;

// ───────────────────────── The management files ─────────────────────────

function Files() {
  const seen = useStore((s) => s.systems?.seen);
  // What was new when the page opened stays marked while he reads it
  const [since] = useState(() => seen ?? {});
  useEffect(() => {
    for (const k of SYSTEM_KEYS) systemActions.seen(k);
  }, []);
  const status: Record<SystemKey, Status> = { staff: useEmployeesStatus(), registration: useRegistrationStatus(), admins: useAdminsStatus(), exams: useExamStatus(), flights: useFlightsStatus() };
  return (
    <div className="space-y-6">
      {SYSTEM_KEYS.map((k) => (
        <FileOverview key={k} system={k} since={since[k] ?? 0} status={status[k]} />
      ))}
    </div>
  );
}

// ───────────────────────── One employee ─────────────────────────

/** The grants being edited: each key held, and each scope group's ids (`"all"`: everywhere) */
type Draft = { keys: Set<string>; scopes: Record<string, "all" | string[]> };

/** The keys sharing one scope: a resource with its own (`season.windows`), else the whole system (`hall`) */
function groupOf(key: string) {
  const [sys, res] = key.split(".");
  const s = PERM_SYSTEM[sys];
  if (s?.resources.find((r) => r.key === res)?.scope) return `${sys}.${res}`;
  return s?.scope ? sys : null;
}

function draftOf(grants: PermGrant[]): Draft {
  const scopes: Record<string, "all" | string[]> = {};
  for (const g of grants) {
    const group = groupOf(g.key);
    if (!group) continue;
    const had = scopes[group];
    scopes[group] = had === "all" || !g.scope?.length ? "all" : [...new Set([...(had ?? []), ...g.scope])];
  }
  return { keys: new Set(grants.map((g) => g.key)), scopes };
}

function grantsOf(d: Draft, before: PermGrant[], by: string, at: number): PermGrant[] {
  return [...d.keys].map((key) => {
    const group = groupOf(key);
    const sc = group ? d.scopes[group] : undefined;
    const scope = sc && sc !== "all" && sc.length ? [...sc].sort() : undefined;
    const old = before.find((g) => g.key === key);
    const same = old && JSON.stringify([...(old.scope ?? [])].sort()) === JSON.stringify(scope ?? []);
    return { key, ...(scope && { scope }), ...(same ? { by: old.by, at: old.at } : { by, at }) };
  });
}

/** What saving changes, system by system */
function diffOf(before: PermGrant[], after: PermGrant[]) {
  const was = new Map(before.map((g) => [g.key, g]));
  const now = new Map(after.map((g) => [g.key, g]));
  const scopeOf = (g?: PermGrant) => JSON.stringify([...(g?.scope ?? [])].sort());
  return CATALOG.flatMap((s) => {
    const keys = systemKeys(s.key);
    const added = keys.filter((k) => now.has(k) && !was.has(k));
    const removed = keys.filter((k) => was.has(k) && !now.has(k));
    const rescoped = keys.filter((k) => was.has(k) && now.has(k) && scopeOf(was.get(k)) !== scopeOf(now.get(k)));
    return added.length + removed.length + rescoped.length ? [{ sys: s, added, removed, rescoped }] : [];
  });
}

/** «عرض — الرحلات» */
function shortLabel(key: string) {
  const [sys, res, verb] = key.split(".");
  const r = PERM_SYSTEM[sys]?.resources.find((x) => x.key === res);
  return r ? `${verbLabel(r, verb)} — ${r.label}` : key;
}

function EmployeeScreen({ account }: { account: StaffUser }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const accounts = useStaffAccounts();
  const options = useScopeOptions();
  const nameOf = useScopeNames();
  const summary = useGrantSummary(account);
  const editable = can(user, "access.permissions.PUT");
  const canCopy = editable && can(user, "access.permissions.copy");
  const [draft, setDraft] = useState<Draft>(() => draftOf(account.grants));
  const [q, setQ] = useState("");
  const [onlyHeld, setOnlyHeld] = useState(false);
  const [from, setFrom] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [open, setOpen] = useState<Set<string>>(() => new Set(CATALOG.filter((s) => account.grants.some((g) => g.key.startsWith(`${s.key}.`))).map((s) => s.key)));

  const next = useMemo(() => grantsOf(draft, account.grants, user.name, 0), [draft, account.grants, user.name]);
  const diff = useMemo(() => diffOf(account.grants, next), [account.grants, next]);
  const dirty = diff.length > 0;
  // Nobody takes away his own right to grant: the portal would be left without anyone who can give it back
  const selfLock = account.id === user.id && can(user, "access.permissions.PUT") && !draft.keys.has("access.permissions.PUT");

  const set = (keys: string[], on: boolean) =>
    setDraft((d) => {
      const k = new Set(d.keys);
      for (const key of keys) {
        if (on) {
          k.add(key);
          // Any act on a resource needs viewing it: granted with it
          const [sys, res, verb] = key.split(".");
          const r = PERM_SYSTEM[sys]?.resources.find((x) => x.key === res);
          if (verb !== "GET" && r?.verbs.includes("GET")) k.add(`${sys}.${res}.GET`);
        } else {
          k.delete(key);
          // Without viewing a resource nothing else on it is left
          const [sys, res, verb] = key.split(".");
          const r = PERM_SYSTEM[sys]?.resources.find((x) => x.key === res);
          if (verb === "GET" && r) for (const other of keysOf(sys, r)) k.delete(other);
        }
      }
      return { ...d, keys: k };
    });
  const setScope = (group: string, v: "all" | string[]) => setDraft((d) => ({ ...d, scopes: { ...d.scopes, [group]: v } }));
  const toggle = (key: string) => set([key], !draft.keys.has(key));

  const copyFrom = () => {
    const src = accounts.find((a) => a.id === from);
    if (!src) return;
    setDraft(draftOf(src.grants));
    setOpen(new Set(CATALOG.filter((s) => src.grants.some((g) => g.key.startsWith(`${s.key}.`))).map((s) => s.key)));
    toast({ title: `نُسخت صلاحيات ${src.name}`, body: `${src.grants.length} صلاحية في المسودة. راجعها ثم احفظ: لا يُحفظ شيء قبل التأكيد.`, tone: "info", icon: "📋" });
  };

  const save = () => {
    if (selfLock) return;
    const at = nowMs();
    const grants = grantsOf(draft, account.grants, user.name, at);
    actions.setStaffPermissions(account.id, grants);
    for (const d of diffOf(account.grants, grants)) {
      const parts = [
        d.added.length && `مُنحت: ${d.added.map(shortLabel).join("، ")}`,
        d.removed.length && `سُحبت: ${d.removed.map(shortLabel).join("، ")}`,
        d.rescoped.length && `تغيّر نطاقها: ${d.rescoped.map(shortLabel).join("، ")}`,
      ].filter(Boolean);
      logAs(user, {
        action: d.added.length && !d.removed.length ? "منح صلاحيات" : d.removed.length && !d.added.length ? "سحب صلاحيات" : "تعديل صلاحيات",
        target: `${account.name} — ${d.sys.label}`,
        before: String(account.grants.filter((g) => g.key.startsWith(`${d.sys.key}.`)).length),
        after: String(grants.filter((g) => g.key.startsWith(`${d.sys.key}.`)).length),
        detail: parts.join(" — "),
        system: "access",
        area: d.sys.key,
        ref: account.id,
        important: true,
      });
    }
    setReviewing(false);
    toast({ title: `حُفظت صلاحيات ${account.name}`, body: `${grants.length} صلاحية. تظهر له الأنظمة التي يملك فيها عرض شيء، ويُسجَّل كل تغيير باسمك.`, tone: "success", icon: "🔑" });
  };

  const needle = q.trim();
  const systems = CATALOG.filter((s) => (!onlyHeld || systemKeys(s.key).some((k) => draft.keys.has(k))) && (!needle || s.label.includes(needle) || s.resources.some((r) => r.label.includes(needle))));

  return (
    <div>
      <EditHeader back={BASE} backLabel="صلاحيات الموظفين" title={`صلاحيات ${account.name}`}>
        {account.title}. {editable ? "اختر لكل مورد ما يُسمح له به، ثم احفظ: تُعرض الفروق قبل الحفظ، ويُسجَّل كل منح وسحب في سجل الأحداث." : "للاطلاع: تعديل الصلاحيات يحتاج صلاحية «تعديل — صلاحيات الموظفين»."}
      </EditHeader>
      <EditLayout
        main={
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <SearchBox value={q} onChange={setQ} placeholder="ابحث عن نظام أو مورد" label="بحث في الأنظمة" className="min-w-56 flex-1" />
              <Pick on={onlyHeld} onClick={() => setOnlyHeld((v) => !v)}>
                ما يملكه فقط
              </Pick>
            </div>
            {systems.map((s) => (
              <SystemCard
                key={s.key}
                sys={s}
                draft={draft}
                editable={editable}
                open={open.has(s.key) || !!needle}
                onOpen={() => setOpen((o) => (o.has(s.key) ? new Set([...o].filter((k) => k !== s.key)) : new Set([...o, s.key])))}
                toggle={toggle}
                set={set}
                setScope={setScope}
                options={options}
              />
            ))}
            {systems.length === 0 && <p className="rounded-2xl bg-white/[.06] p-6 text-center text-sm text-white/60 ring-1 ring-white/10">لا نظام يطابق البحث.</p>}
          </div>
        }
        side={
          <>
            <div className="space-y-3 rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
              <p className="text-sm font-bold text-white">
                {draft.keys.size} صلاحية{dirty && <span className="text-gold"> — لم تُحفظ</span>}
              </p>
              <ul className="space-y-1 text-xs text-white/75">
                {(dirty ? grantLines({ ...account, grants: next }, nameOf) : summary).map((x) => (
                  <li key={x}>{x}</li>
                ))}
                {draft.keys.size === 0 && <li className="text-white/50">بلا صلاحية: يرى «ملفاتي التشغيلية» وحدها.</li>}
              </ul>
              {editable && (
                <>
                  {selfLock && (
                    <p className="flex items-start gap-1.5 rounded-xl bg-maroon/30 p-2 text-xs leading-5 text-white ring-1 ring-maroon/50">
                      <ShieldAlert className="mt-0.5 size-3.5 shrink-0" /> لا تسحب من نفسك «تعديل — صلاحيات الموظفين»: لن يبقى من يعيدها. يسحبها منك غيرك ممن يملكها.
                    </p>
                  )}
                  <Button variant="gold" className="w-full" disabled={!dirty || selfLock} onClick={() => setReviewing(true)}>
                    <Save className="size-4" /> مراجعة التغييرات وحفظها
                  </Button>
                  {dirty && (
                    <Button variant="glass" className="w-full" onClick={() => setDraft(draftOf(account.grants))}>
                      <Undo2 className="size-4" /> التراجع عن التعديلات
                    </Button>
                  )}
                </>
              )}
            </div>
            {canCopy && (
              <div className="space-y-2 rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
                <p className="text-sm font-bold text-white">نسخ من موظف آخر</p>
                <select value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass} aria-label="الموظف الذي تُنسخ صلاحياته">
                  <option value="">— اختر موظفاً —</option>
                  {accounts
                    .filter((a) => a.id !== account.id)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — {a.grants.length} صلاحية
                      </option>
                    ))}
                </select>
                <Button variant="glass" className="w-full" disabled={!from} onClick={copyFrom}>
                  <Copy className="size-4" /> نسخ صلاحياته
                </Button>
                <p className="text-xs leading-5 text-white/55">تحل محل ما في المسودة مرة واحدة، ولا يُحفظ دور مشترك: يبقى لكل موظف صلاحياته وحده.</p>
              </div>
            )}
            <div className="rounded-2xl bg-white/[.04] p-4 text-xs leading-6 text-white/60 ring-1 ring-white/10">
              <p>كل فعل على مورد يحتاج عرضه، فيُمنح العرض معه. وسحب العرض يسحب ما عداه من المورد نفسه.</p>
              <p className="mt-1">«حساس»: بيانات شخصية أو سرية، تُمنح وحدها لمن يحتاجها.</p>
            </div>
          </>
        }
      />

      <Modal open={reviewing} onClose={() => setReviewing(false)} className="max-w-2xl border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        <p className="text-xs font-bold text-gold">قبل الحفظ</p>
        <h3 className="mt-1 font-display text-xl font-bold">ما يتغير في صلاحيات {account.name}</h3>
        <div className="mt-4 max-h-[55vh] space-y-3 overflow-y-auto">
          {diff.map((d) => (
            <div key={d.sys.key} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <p className="font-bold">{d.sys.label}</p>
              {d.added.length > 0 && (
                <p className="mt-1 text-xs leading-6 text-white/85">
                  <span className="font-bold text-green-light">تُمنح ({d.added.length}): </span>
                  {d.added.map(shortLabel).join("، ")}
                </p>
              )}
              {d.removed.length > 0 && (
                <p className="mt-1 text-xs leading-6 text-white/85">
                  <span className="font-bold text-[#ffb4c8]">تُسحب ({d.removed.length}): </span>
                  {d.removed.map(shortLabel).join("، ")}
                </p>
              )}
              {d.rescoped.length > 0 && (
                <p className="mt-1 text-xs leading-6 text-white/85">
                  <span className="font-bold text-gold">يتغير نطاقها ({d.rescoped.length}): </span>
                  {d.rescoped.map(shortLabel).join("، ")}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-white/60">يُسجَّل كل نظام تغيّر حدثاً مهماً في سجل الأحداث باسمك، ويرى الموظف أنظمته الجديدة في قائمته عند دخوله التالي.</p>
        <div className="mt-4 flex gap-2">
          <Button variant="gold" onClick={save}>
            <Save className="size-4" /> حفظ
          </Button>
          <Button variant="glass" onClick={() => setReviewing(false)}>
            رجوع
          </Button>
        </div>
      </Modal>
    </div>
  );
}

type CardProps = {
  sys: PermSystem;
  draft: Draft;
  editable: boolean;
  open: boolean;
  onOpen: () => void;
  toggle: (key: string) => void;
  set: (keys: string[], on: boolean) => void;
  setScope: (group: string, v: "all" | string[]) => void;
  options: Record<ScopeKind, { id: string; label: string }[]>;
};

/** One system: its resources as rows, the four verbs and the named acts as columns */
function SystemCard({ sys, draft, editable, open, onOpen, toggle, set, setScope, options }: CardProps) {
  const all = systemKeys(sys.key);
  const held = all.filter((k) => draft.keys.has(k)).length;
  const gets = viewKeys(sys.key);
  return (
    <section className={cn("overflow-hidden rounded-2xl ring-1", held ? "bg-white/[.07] ring-gold/30" : "bg-white/[.04] ring-white/10")}>
      <button type="button" onClick={onOpen} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-4 text-start">
        <span className="min-w-0">
          <span className="block font-bold text-white">{sys.label}</span>
          <span className="block text-xs text-white/55">{sys.desc}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Chip tone={held === all.length ? "gold" : held ? "green" : "muted"}>
            {held} من {all.length}
          </Chip>
          <ChevronDown className={cn("size-4 text-white/60 transition", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-white/10 p-4">
          {editable && (
            <div className="flex flex-wrap gap-1.5">
              <Pick on={gets.every((k) => draft.keys.has(k))} onClick={() => set(gets, !gets.every((k) => draft.keys.has(k)))}>
                كل العرض
              </Pick>
              <Pick on={held === all.length} onClick={() => set(all, held !== all.length)}>
                النظام كله
              </Pick>
              {held > 0 && (
                <Pick on={false} onClick={() => set(all, false)}>
                  لا شيء
                </Pick>
              )}
            </div>
          )}
          {sys.scope && <ScopeRow group={sys.key} kind={sys.scope} draft={draft} editable={editable} setScope={setScope} options={options} />}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-xs text-white/55">
                  <th className="p-2 text-start font-semibold">المورد</th>
                  {VERBS.map((v) => (
                    <th key={v} className="w-16 p-2 text-center font-semibold">
                      {VERB_LABEL[v]}
                    </th>
                  ))}
                  <th className="p-2 text-start font-semibold">أفعال خاصة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {sys.resources.map((r) => (
                  <ResourceRow key={r.key} sys={sys} r={r} draft={draft} editable={editable} toggle={toggle} setScope={setScope} options={options} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function ResourceRow({ sys, r, draft, editable, toggle, setScope, options }: Pick<CardProps, "sys" | "draft" | "editable" | "toggle" | "setScope" | "options"> & { r: ResourceDef }) {
  const key = (v: string) => `${sys.key}.${r.key}.${v}`;
  return (
    <>
      <tr className="align-top">
        <td className="p-2">
          <p className="font-semibold text-white">
            {r.label} {r.sensitive && <Tag tone="maroon">حساس</Tag>}
          </p>
          {r.note && <p className="text-[11px] text-gold">{r.note}</p>}
        </td>
        {VERBS.map((v) => (
          <td key={v} className="p-2 text-center">
            {r.verbs.includes(v) ? (
              <input
                type="checkbox"
                className="size-4 accent-gold disabled:opacity-60"
                checked={draft.keys.has(key(v))}
                disabled={!editable}
                onChange={() => toggle(key(v))}
                aria-label={`${VERB_LABEL[v]} — ${r.label}`}
              />
            ) : (
              <span className="text-white/20">—</span>
            )}
          </td>
        ))}
        <td className="p-2">
          <span className="flex flex-wrap gap-1">
            {(r.special ?? []).map(([k, label]) => (
              <Pick key={k} on={draft.keys.has(key(k))} disabled={!editable} onClick={() => toggle(key(k))}>
                {label}
              </Pick>
            ))}
          </span>
        </td>
      </tr>
      {r.scope && (
        <tr>
          <td colSpan={6} className="px-2 pb-3">
            <ScopeRow group={`${sys.key}.${r.key}`} kind={r.scope} draft={draft} editable={editable} setScope={setScope} options={options} />
          </td>
        </tr>
      )}
    </>
  );
}

/** For which halls, airports, operations… the permissions of a group are granted */
function ScopeRow({ group, kind, draft, editable, setScope, options }: { group: string; kind: ScopeKind } & Pick<CardProps, "draft" | "editable" | "setScope" | "options">) {
  const list = options[kind];
  const v = draft.scopes[group] ?? "all";
  if (!list.length)
    return <p className="rounded-xl bg-black/15 px-3 py-2 text-xs leading-5 text-white/65">النطاق: {SCOPE_LABEL[kind]} — يقيّم حيث رابط في الملفات التشغيلية، فلا يُختار هنا.</p>;
  const picked = v === "all" ? [] : v;
  const flip = (id: string) => {
    const nextList = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    setScope(group, nextList.length ? nextList : "all");
  };
  return (
    <div className="rounded-xl bg-black/15 px-3 py-2">
      <p className="mb-1.5 text-xs font-bold text-gold">النطاق: {SCOPE_LABEL[kind]}</p>
      <div className="flex flex-wrap gap-1.5">
        <Pick on={v === "all"} disabled={!editable} onClick={() => setScope(group, "all")}>
          الكل
        </Pick>
        {list.map((o) => (
          <Pick key={o.id} on={picked.includes(o.id)} disabled={!editable} onClick={() => flip(o.id)}>
            {o.label}
          </Pick>
        ))}
      </div>
    </div>
  );
}
