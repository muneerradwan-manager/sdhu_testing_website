"use client";

import { Archive, Eye, Megaphone, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { audienceLabel, circularActions, KIND_LABEL, useAudience, useCirculars, type Audience, type Circular, type CircularKind } from "@/lib/circulars";
import { FILE_TYPES } from "@/lib/ops";
import { useStaffAccounts } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { EvidencePicker, EvidenceView } from "@/app/administrator/_components/evidence";
import { Field, Pick } from "../exam/_components/ui";
import { fmtDate, fmtDateTime, logAs, textareaClass, useCan, useStaffUser } from "../_components/kit";
import { fieldClass } from "../_components/ops-ui";
import { AddButton, Box, EditHeader, EditLayout, EmptyRow, ListTable, RowActions, RowLink, Tag, Title } from "../_components/wp";
import { Help, Lead, NotFound, TitleCell, Views, useHrefWith, useOpenId, useView } from "../admins/_components/ui";

const BASE = "/staff/employees/manage/circulars";
const SHELVES = ["published", "draft", "archived"] as const;
const SHELF_LABEL = { published: "المنشورة", draft: "المسودات", archived: "المؤرشفة" } as const;

/**
 * «القرارات والتعميمات» in the employees' file: the decisions and circulars the administration issues to its staff, as a
 * list per shelf (published, drafts, archived), each opening on its own screen (`?id=`, `?id=new` for a new one). A draft
 * is written and saved, then published (`staff.circulars.publish`); once published it reaches every employee it is for, and
 * the screen shows who has read it.
 */
export function Circulars() {
  const id = useOpenId();
  return id ? <CircularScreen key={id} id={id} /> : <CircularList />;
}

function CircularList() {
  const list = useCirculars();
  const may = useCan();
  const hrefWith = useHrefWith();
  const { recipients } = useAudience();
  const accounts = useStaffAccounts();
  const nameOf = (sid: string) => accounts.find((a) => a.id === sid)?.name ?? sid;
  const shelf = useView("s", SHELVES);
  const rows = list.filter((c) => c.status === shelf).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="space-y-4">
      <Views tabs param="s" value={shelf} label="القرارات والتعميمات" items={SHELVES.map((k) => ({ key: k, label: SHELF_LABEL[k], count: list.filter((c) => c.status === k).length }))} />
      <Title action={may("staff.circulars.POST") && <AddButton href={hrefWith({ id: "new" })}>إصدار قرار أو تعميم</AddButton>}>{SHELF_LABEL[shelf]}</Title>
      <Lead>
        {shelf === "published"
          ? "ما وصل إلى الموظفين، ومن اطّلع عليه منهم. افتحه لترى نصه ومن قرأه."
          : shelf === "draft"
            ? "ما كُتب ولم يُنشر بعد: لا يراه أحد من الموظفين حتى يُنشر."
            : "ما أُرشف بعد نشره: لا يظهر للموظفين، ويبقى محفوظاً بنصه ومن قرأه."}
      </Lead>
      <ListTable head={["القرار أو التعميم", "النوع", "إلى", "التاريخ", "القراءة"]} minWidth="44rem">
        {rows.length === 0 && <EmptyRow cols={5}>لا شيء هنا.</EmptyRow>}
        {rows.map((c) => {
          const to = recipients(c);
          const read = to.filter((u) => c.reads?.[u.id]).length;
          const href = hrefWith({ id: c.id });
          return (
            <tr key={c.id}>
              <TitleCell
                title={c.title}
                href={href}
                sub={`${KIND_LABEL[c.kind]} رقم ${c.number}`}
                actions={
                  <RowActions>
                    <RowLink href={href}>{may("staff.circulars.PUT") && c.status === "draft" ? "تعديل" : "عرض"}</RowLink>
                  </RowActions>
                }
              />
              <td className="p-3 align-top">
                <Tag tone={c.kind === "decision" ? "gold" : "muted"}>{KIND_LABEL[c.kind]}</Tag>
              </td>
              <td className="p-3 align-top text-xs leading-5 text-white/80">{audienceLabel(c.audience, nameOf)}</td>
              <td className="p-3 align-top text-xs text-white/75">{fmtDate(new Date(`${c.date}T12:00:00`).getTime())}</td>
              <td className="p-3 align-top text-sm tabular-nums text-white/85">{c.status === "draft" ? <span className="text-white/40">—</span> : `${read} من ${to.length}`}</td>
            </tr>
          );
        })}
      </ListTable>
      <Help>
        <p>القرار يصدر بشأن البعثة وموظفيها (تشكيل، تسمية، إيقاف…)، والتعميم تعليمات عمل. لكل منهما رقمه وتاريخه، ونصه، ومرفقاته من صور أو مستندات.</p>
        <p>يُكتب مسودةً ويُحفظ، ثم يُنشر فيصل إلى من وُجّه إليهم: كل الموظفين، أو موظفو ملفات تشغيلية بعينها كما أُسندوا هذا الموسم، أو أشخاص بأسمائهم. يراه كل منهم في «القرارات والتعميمات» في قائمته، ويضغط «اطّلعت عليه».</p>
        <p>المنشور لا يُعدَّل نصه: إن احتاج تصحيحاً يُؤرشف ويصدر غيره برقم جديد.</p>
      </Help>
    </div>
  );
}

const empty = (by: string): Circular => ({ id: "", kind: "circular", number: "", title: "", body: "", date: new Date().toISOString().slice(0, 10), audience: { kind: "all" }, status: "draft", createdBy: by });

function CircularScreen({ id }: { id: string }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const router = useRouter();
  const may = useCan();
  const list = useCirculars();
  const accounts = useStaffAccounts();
  const { recipients } = useAudience();
  const found = id === "new" ? empty(user.name) : list.find((c) => c.id === id);
  const [draft, setDraft] = useState<Circular | undefined>(found);
  if (!found || !draft) return <NotFound back={BASE} backLabel="القرارات والتعميمات" what="هذا القرار أو التعميم" />;

  const isNew = id === "new";
  const editable = found.status === "draft" && may(isNew ? "staff.circulars.POST" : "staff.circulars.PUT");
  const set = (p: Partial<Circular>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const ready = draft.title.trim().length >= 5 && draft.number.trim() && draft.body.trim().length >= 20 && (draft.audience.kind === "all" || (draft.audience.kind === "files" ? draft.audience.files.length : draft.audience.ids.length) > 0);
  const to = recipients(draft);
  const read = to.filter((u) => draft.reads?.[u.id]);
  const nameOf = (sid: string) => accounts.find((a) => a.id === sid)?.name ?? sid;

  const save = (publish: boolean) => {
    if (!ready) return;
    const next: Circular = { ...draft, id: draft.id || `cir-${Date.now().toString(36)}`, title: draft.title.trim(), number: draft.number.trim(), body: draft.body.trim(), ...(publish && { status: "published" as const, publishedAt: Date.now(), publishedBy: user.name, reads: {} }) };
    circularActions.save(next);
    logAs(user, { action: publish ? `نشر ${KIND_LABEL[next.kind]}` : `حفظ مسودة ${KIND_LABEL[next.kind]}`, target: `${next.number} — ${next.title}`, detail: publish ? `إلى ${audienceLabel(next.audience, nameOf)} (${recipients(next).length})` : undefined, system: "staff", area: "circulars", ref: next.id, important: publish });
    toast({ title: publish ? `نُشر ${KIND_LABEL[next.kind]}` : "حُفظت المسودة", body: publish ? `وصل إلى ${recipients(next).length} موظفاً في «القرارات والتعميمات».` : "لا يراه أحد من الموظفين قبل نشره.", icon: publish ? "📣" : "💾", tone: "success" });
    if (isNew || publish) router.replace(publish ? `${BASE}` : `${BASE}?s=draft&id=${next.id}`);
  };
  const archive = () => {
    circularActions.save({ ...found, status: "archived" });
    logAs(user, { action: `أرشفة ${KIND_LABEL[found.kind]}`, target: `${found.number} — ${found.title}`, system: "staff", area: "circulars", ref: found.id });
    router.replace(`${BASE}?s=archived`);
  };
  const remove = () => {
    circularActions.remove(found.id);
    logAs(user, { action: `حذف مسودة ${KIND_LABEL[found.kind]}`, target: `${found.number} — ${found.title}`, system: "staff", area: "circulars", ref: found.id });
    router.replace(`${BASE}?s=draft`);
  };
  const setAudience = (a: Audience) => set({ audience: a });

  return (
    <div>
      <EditHeader back={`${BASE}${found.status === "published" ? "" : `?s=${found.status}`}`} backLabel="القرارات والتعميمات" title={isNew ? "قرار أو تعميم جديد" : `${KIND_LABEL[found.kind]} رقم ${found.number}`}>
        {isNew ? "يُحفظ مسودةً ثم يُنشر." : found.status === "draft" ? `مسودة — كتبها ${found.createdBy}` : found.status === "published" ? `منشور ${found.publishedAt ? fmtDateTime(found.publishedAt) : ""} — ${found.publishedBy ?? ""}` : "مؤرشف"}
      </EditHeader>
      <EditLayout
        main={
          editable ? (
            <div className="space-y-4">
              <div role="radiogroup" aria-label="النوع" className="flex gap-2">
                {(["decision", "circular"] as CircularKind[]).map((k) => (
                  <Pick key={k} on={draft.kind === k} onClick={() => set({ kind: k })}>
                    {KIND_LABEL[k]}
                  </Pick>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="الرقم">
                  <input value={draft.number} onChange={(e) => set({ number: e.target.value })} placeholder="16/1448" dir="ltr" className={fieldClass} />
                </Field>
                <Field label="التاريخ">
                  <input type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} className={fieldClass} />
                </Field>
              </div>
              <Field label="العنوان">
                <input value={draft.title} onChange={(e) => set({ title: e.target.value })} className={fieldClass} />
              </Field>
              <Field label="النص" hint="كل سطر فقرة.">
                <textarea rows={8} value={draft.body} onChange={(e) => set({ body: e.target.value })} className={textareaClass} />
              </Field>
              <div className="space-y-2">
                <p className="text-sm font-bold text-white">إلى من</p>
                <div className="flex flex-wrap gap-2">
                  <Pick on={draft.audience.kind === "all"} onClick={() => setAudience({ kind: "all" })}>
                    كل الموظفين
                  </Pick>
                  <Pick on={draft.audience.kind === "files"} onClick={() => setAudience({ kind: "files", files: [] })}>
                    موظفو ملفات تشغيلية
                  </Pick>
                  <Pick on={draft.audience.kind === "staff"} onClick={() => setAudience({ kind: "staff", ids: [] })}>
                    موظفون بأسمائهم
                  </Pick>
                </div>
                {draft.audience.kind === "files" && (
                  <div className="flex flex-wrap gap-1.5">
                    {FILE_TYPES.map((t) => {
                      const a = draft.audience as Extract<Audience, { kind: "files" }>;
                      const on = a.files.includes(t.code);
                      return (
                        <Pick key={t.code} on={on} onClick={() => setAudience({ kind: "files", files: on ? a.files.filter((f) => f !== t.code) : [...a.files, t.code] })}>
                          {t.short}
                        </Pick>
                      );
                    })}
                  </div>
                )}
                {draft.audience.kind === "staff" && (
                  <div className="flex flex-wrap gap-1.5">
                    {accounts.map((u) => {
                      const a = draft.audience as Extract<Audience, { kind: "staff" }>;
                      const on = a.ids.includes(u.id);
                      return (
                        <Pick key={u.id} on={on} onClick={() => setAudience({ kind: "staff", ids: on ? a.ids.filter((x) => x !== u.id) : [...a.ids, u.id] })}>
                          {u.name}
                        </Pick>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-white/55">يصل إلى {to.length} موظفاً الآن.</p>
              </div>
              <EvidencePicker tone="dark" value={draft.attachments ?? []} onChange={(v) => set({ attachments: v })} label="إرفاق صورة أو مستند" />
            </div>
          ) : (
            <Reading c={found} />
          )
        }
        side={
          <>
            <Box title="النشر">
              <p>
                {KIND_LABEL[draft.kind]} — إلى {audienceLabel(draft.audience, nameOf)}
              </p>
              {editable && (
                <div className="flex flex-col gap-2">
                  <Button variant="glass" disabled={!ready} onClick={() => save(false)}>
                    <Save className="size-4" /> حفظ المسودة
                  </Button>
                  <Button variant="gold" disabled={!ready || !may("staff.circulars.publish")} onClick={() => save(true)} title={may("staff.circulars.publish") ? undefined : "يحتاج صلاحية «نشر قرار أو تعميم»"}>
                    <Megaphone className="size-4" /> نشر
                  </Button>
                  {!ready && <p className="text-xs leading-5 text-white/55">أكمل الرقم والعنوان (5 أحرف) والنص (20 حرفاً) ومن يصل إليهم.</p>}
                  {!isNew && may("staff.circulars.DELETE") && (
                    <button type="button" onClick={remove} className="flex items-center gap-1.5 text-xs font-bold text-[#ffb4c8] hover:underline">
                      <Trash2 className="size-3.5" /> حذف المسودة
                    </button>
                  )}
                </div>
              )}
              {found.status === "published" && may("staff.circulars.PUT") && (
                <Button size="sm" variant="glass" onClick={archive}>
                  <Archive className="size-4" /> أرشفة
                </Button>
              )}
            </Box>
            {found.status !== "draft" && (
              <Box title={`من اطّلع عليه (${read.length} من ${to.length})`}>
                <ul className="space-y-1.5 text-xs">
                  {to.map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-2">
                      <span className="text-white">{u.name}</span>
                      {draft.reads?.[u.id] ? <span className="text-green-light">{fmtDateTime(draft.reads[u.id])}</span> : <span className="text-white/45">لم يطّلع</span>}
                    </li>
                  ))}
                </ul>
              </Box>
            )}
          </>
        }
      />
    </div>
  );
}

/** A circular as its readers see it: its title, its text paragraph by paragraph, and its attachments */
export function Reading({ c }: { c: Circular }) {
  return (
    <article className="space-y-3 rounded-2xl bg-white/[.06] p-5 ring-1 ring-white/10">
      <p className="flex flex-wrap items-center gap-2 text-xs text-white/60">
        <Tag tone={c.kind === "decision" ? "gold" : "muted"}>{KIND_LABEL[c.kind]}</Tag> رقم {c.number} — {fmtDate(new Date(`${c.date}T12:00:00`).getTime())}
      </p>
      <h2 className="font-display text-2xl font-bold text-white">{c.title}</h2>
      {c.body.split("\n").filter(Boolean).map((p, i) => (
        <p key={i} className={cn("leading-8 text-white/90")}>
          {p}
        </p>
      ))}
      <EvidenceView items={c.attachments} tone="dark" />
      <p className="flex items-center gap-1.5 text-xs text-white/50">
        <Eye className="size-3.5" /> أصدرته الإدارة{c.publishedBy ? ` — نشره ${c.publishedBy}` : ""}
      </p>
    </article>
  );
}
