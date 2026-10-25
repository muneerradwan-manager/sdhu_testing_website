"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Copy, KeyRound, Save, ShieldAlert, Undo2 } from "lucide-react";
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
import { Pick, Segments, selectClass } from "../exam/_components/ui";
import { useRegistrationStatus } from "../hajj/desk";
import { SearchBox } from "../_components/ops-ui";
import { can, fmtDate, Gate, logAs, PageHeader, useScopeNames, useScopeOptions, useStaffUser } from "../_components/kit";
import { Box, EditHeader, EmptyRow, ListTable, RowActions, RowLink, Tag, Title } from "../_components/wp";
import { Filters, Help, Lead } from "../admins/_components/ui";
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
      {views.length > 1 && <Segments value={shown!} onChange={setView} items={views} label="عرض الصفحة" tabs />}
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
      <Title>الموظفون وصلاحياتهم</Title>
      <Lead>كل موظف بالأنظمة التي يملك فيها شيئاً. افتح الموظف لتمنحه صلاحياته أو تسحبها، ثم احفظ.</Lead>
      <SearchBox value={q} onChange={setQ} placeholder="ابحث باسم الموظف أو صفته" label="بحث في الموظفين" className="max-w-md" />
      <ListTable head={["الموظف", "الأنظمة", "الصلاحيات", "آخر منح"]} minWidth="44rem">
        {rows.length === 0 && <EmptyRow cols={4}>لا موظف بهذا الاسم.</EmptyRow>}
        {rows.map((a) => {
          const last = a.grants.reduce<PermGrant | null>((m, g) => (g.at && (!m?.at || g.at > m.at) ? g : m), null);
          const lines = grantLines(a, nameOf);
          return (
            <tr key={a.id} className="align-top">
              <td className="p-3">
                <Link href={`${BASE}?id=${a.id}`} className="font-bold text-white hover:text-gold">
                  {a.name}
                </Link>
                <p className="mt-0.5 text-xs text-white/60">{a.title}</p>
                <RowActions>
                  <RowLink href={`${BASE}?id=${a.id}`}>صلاحياته</RowLink>
                </RowActions>
              </td>
              <td className="max-w-md p-3 text-xs leading-6 text-white/80">
                {!lines.length ? (
                  <span className="text-white/50">بلا صلاحية: يرى «ملفاتي التشغيلية» وحدها</span>
                ) : lines.length === CATALOG.length && lines.every((l) => l.endsWith("كاملة")) ? (
                  "كل الأنظمة — كاملة"
                ) : lines.length > 4 ? (
                  `${lines.slice(0, 3).join("، ")}، و${lines.length - 3} أنظمة أخرى`
                ) : (
                  lines.join("، ")
                )}
              </td>
              <td className="p-3 font-bold tabular-nums text-white">{a.grants.length}</td>
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
    <div className="space-y-4">
      <Title>من يملك ماذا</Title>
      <Lead>كل نظام بعدد صلاحياته ومن يملك فيه شيئاً. افتح النظام لترى كل صلاحية فيه ومن يملكها.</Lead>
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
    </div>
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
      <div>
        <Title>ملفات الإدارة</Title>
        <Lead>كيف يقف كل ملف من ملفات الإدارة الخمسة، وما رفعه أصحابها إليك.</Lead>
      </div>
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
  const editable = can(user, "access.permissions.PUT");
  const canCopy = editable && can(user, "access.permissions.copy");
  const [draft, setDraft] = useState<Draft>(() => draftOf(account.grants));
  const [q, setQ] = useState("");
  const [onlyHeld, setOnlyHeld] = useState(true);
  const [from, setFrom] = useState("");
  const [reviewing, setReviewing] = useState(false);

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
    setOnlyHeld(true);
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
  const heldSystems = CATALOG.filter((s) => systemKeys(s.key).some((k) => draft.keys.has(k)));
  const scope = onlyHeld && heldSystems.length ? "held" : "all";
  const systems = CATALOG.filter((s) => (scope === "all" || systemKeys(s.key).some((k) => draft.keys.has(k))) && (!needle || s.label.includes(needle) || s.resources.some((r) => r.label.includes(needle))));

  return (
    <div className="space-y-4">
      <EditHeader back={BASE} backLabel="صلاحيات الموظفين" title={`صلاحيات ${account.name}`}>
        {account.title} — {draft.keys.size} صلاحية{dirty && <span className="text-gold"> (لم تُحفظ)</span>}
      </EditHeader>
      <Lead>{editable ? "فعّل لكل مورد ما يُسمح له به أو أوقفه، ثم احفظ: تُعرض الفروق قبل الحفظ، ويُسجَّل كل منح وسحب في سجل الأحداث." : "للاطلاع: تعديل الصلاحيات يحتاج صلاحية «تعديل — صلاحيات الموظفين»."}</Lead>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Filters
          label="الأنظمة المعروضة"
          value={scope}
          onChange={(v) => setOnlyHeld(v === "held")}
          items={[
            { key: "held" as const, label: "ما يملكه", count: heldSystems.length },
            { key: "all" as const, label: "كل الأنظمة", count: CATALOG.length },
          ]}
        />
        <SearchBox value={q} onChange={setQ} placeholder="ابحث عن نظام أو مورد" label="بحث في الأنظمة" className="md:w-80" />
      </div>
      {systems.map((s) => (
        <SystemTable key={s.key} sys={s} draft={draft} editable={editable} toggle={toggle} set={set} setScope={setScope} options={options} />
      ))}
      {systems.length === 0 && <p className="rounded-2xl bg-white/[.06] p-6 text-center text-sm text-white/60 ring-1 ring-white/10">لا نظام يطابق البحث.</p>}

      {editable && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="gold" disabled={!dirty || selfLock} onClick={() => setReviewing(true)}>
            <Save className="size-4" /> حفظ الصلاحيات
          </Button>
          {dirty && (
            <Button variant="glass" onClick={() => setDraft(draftOf(account.grants))}>
              <Undo2 className="size-4" /> التراجع
            </Button>
          )}
          <span className="text-xs text-white/60">{dirty ? "لديك تعديلات لم تُحفظ." : "لا تعديلات."}</span>
        </div>
      )}
      {selfLock && (
        <p className="flex items-start gap-1.5 rounded-xl bg-maroon/30 p-2 text-xs leading-5 text-white ring-1 ring-maroon/50">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" /> لا تسحب من نفسك «تعديل — صلاحيات الموظفين»: لن يبقى من يعيدها. يسحبها منك غيرك ممن يملكها.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Help>
          <p>كل فعل على مورد يحتاج عرضه، فيُمنح العرض معه. وسحب العرض يسحب ما عداه من المورد نفسه.</p>
          <p>«حساس»: بيانات شخصية أو سرية، تُمنح وحدها لمن يحتاجها.</p>
          <p>لا يظهر نظام في قائمة الموظف الجانبية إلا إن ملك فيه عرض شيء.</p>
        </Help>
        {canCopy && (
          <Box title="خيارات متقدمة" open={false}>
            <p className="font-bold text-white">نسخ صلاحيات موظف آخر</p>
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
            <Button size="sm" variant="glass" disabled={!from} onClick={copyFrom}>
              <Copy className="size-4" /> نسخ صلاحياته
            </Button>
            <p className="text-xs leading-5 text-white/55">تحل محل ما في المسودة مرة واحدة، ولا يُحفظ دور مشترك: يبقى لكل موظف صلاحياته وحده.</p>
          </Box>
        )}
      </div>

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

type TableProps = {
  sys: PermSystem;
  draft: Draft;
  editable: boolean;
  toggle: (key: string) => void;
  set: (keys: string[], on: boolean) => void;
  setScope: (group: string, v: "all" | string[]) => void;
  options: Record<ScopeKind, { id: string; label: string }[]>;
};

/** On or off, the way «صلاحيات الصفات» shows it */
function Toggle({ on, onClick, disabled, label }: { on: boolean; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn("inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition disabled:cursor-not-allowed disabled:opacity-60", on ? "justify-end bg-gold" : "justify-start bg-white/15")}
    >
      <span className={cn("size-5 rounded-full", on ? "bg-green-dark" : "bg-white/60")} />
    </button>
  );
}

/** One system: its title with how much of it he holds, then its resources as rows and the verbs as switches */
function SystemTable({ sys, draft, editable, toggle, set, setScope, options }: TableProps) {
  const all = systemKeys(sys.key);
  const held = all.filter((k) => draft.keys.has(k)).length;
  const gets = viewKeys(sys.key);
  const quick = [
    { label: "كل العرض", on: gets.every((k) => draft.keys.has(k)), run: () => set(gets, !gets.every((k) => draft.keys.has(k))) },
    { label: "النظام كله", on: held === all.length, run: () => set(all, held !== all.length) },
    ...(held > 0 ? [{ label: "لا شيء", on: false, run: () => set(all, false) }] : []),
  ];
  return (
    <section className="space-y-2 pt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-white">
          {sys.label} <span className="text-sm font-normal text-white/55">— {held} من {all.length}</span>
        </h2>
        {editable && (
          <span className="flex items-center gap-1 text-sm">
            {quick.map((x, i) => (
              <span key={x.label} className="flex items-center gap-1">
                {i > 0 && <span className="text-white/25">|</span>}
                <button type="button" onClick={x.run} className={cn("rounded-md px-1 font-bold", x.on ? "text-white" : "text-gold hover:underline")}>
                  {x.label}
                </button>
              </span>
            ))}
          </span>
        )}
      </div>
      <p className="text-xs leading-5 text-white/55">{sys.desc}</p>
      {sys.scope && <ScopeRow group={sys.key} kind={sys.scope} draft={draft} editable={editable} setScope={setScope} options={options} />}
      <ListTable
        head={[
          "المورد",
          ...VERBS.map((v) => (
            <span key={v} className="block text-center">
              {VERB_LABEL[v]}
            </span>
          )),
          "أفعال خاصة",
        ]}
        minWidth="44rem"
      >
        {sys.resources.map((r) => (
          <ResourceRow key={r.key} sys={sys} r={r} draft={draft} editable={editable} toggle={toggle} setScope={setScope} options={options} />
        ))}
      </ListTable>
    </section>
  );
}

function ResourceRow({ sys, r, draft, editable, toggle, setScope, options }: Pick<TableProps, "sys" | "draft" | "editable" | "toggle" | "setScope" | "options"> & { r: ResourceDef }) {
  const key = (v: string) => `${sys.key}.${r.key}.${v}`;
  return (
    <>
      <tr>
        <td className="p-3 align-top">
          <p className="font-bold text-white">
            {r.label} {r.sensitive && <Tag tone="maroon">حساس</Tag>}
          </p>
          {r.note && <p className="text-xs text-white/55">{r.note}</p>}
        </td>
        {VERBS.map((v) => (
          <td key={v} className="p-3 text-center align-top">
            {r.verbs.includes(v) ? <Toggle on={draft.keys.has(key(v))} disabled={!editable} onClick={() => toggle(key(v))} label={`${VERB_LABEL[v]} — ${r.label}`} /> : <span className="text-white/20">—</span>}
          </td>
        ))}
        <td className="p-3 align-top">
          <span className="flex flex-col gap-2">
            {(r.special ?? []).map(([k, label]) => (
              <span key={k} className="flex items-center gap-2 text-xs text-white/80">
                <Toggle on={draft.keys.has(key(k))} disabled={!editable} onClick={() => toggle(key(k))} label={`${label} — ${r.label}`} />
                {label}
              </span>
            ))}
          </span>
        </td>
      </tr>
      {r.scope && (
        <tr>
          <td colSpan={6} className="px-3 pb-3">
            <ScopeRow group={`${sys.key}.${r.key}`} kind={r.scope} draft={draft} editable={editable} setScope={setScope} options={options} />
          </td>
        </tr>
      )}
    </>
  );
}

/** For which halls, airports, operations… the permissions of a group are granted */
function ScopeRow({ group, kind, draft, editable, setScope, options }: { group: string; kind: ScopeKind } & Pick<TableProps, "draft" | "editable" | "setScope" | "options">) {
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
