"use client";

import { BadgeCheck, CreditCard, FileSignature, FileStack, IdCard, Receipt, Stamp, UserRound, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Card } from "@/components/portal/shell";
import { groupInfo } from "@/lib/assignment";
import { groupName } from "@/lib/groups";
import type { Assignment } from "@/lib/journey";
import type { Member } from "@/lib/rules";
import { relationLabel } from "@/lib/registry";
import type { Application, DocStatus as UploadStatus, PilgrimVisa, PostAcceptance } from "@/lib/store";
import { formatUSD } from "@/lib/utils";
import { HajjCard } from "./cards";
import { ContractDocument, day } from "./contract";
import { DocFrame, DocStub, DocViewer, UploadedFile, useFileUrl, type DocStatus, type DocTone } from "./doc";
import { docStatus, paidAt, type costLines } from "./post/model";

/**
 * The family's documents, each drawn in the one design of doc.tsx: the acceptance notice, the contract with the
 * group, a receipt for every cost, the flight tickets, and for every member the digital card, the visa, the
 * passport and the personal photo. «خزنة الوثائق» holds them all (it took the place of the visa and payments pages). The drawings of the passport, the visa and the photo are the demo's, never real
 * ones; a visa the group's head uploaded is shown as the file it is.
 */

/** A document in a list: its stub, and what it opens */
export type VaultDoc = {
  id: string;
  tone: DocTone;
  kind: string;
  icon: LucideIcon;
  title: string;
  sub?: string;
  code?: string;
  status: DocStatus;
  ready: boolean;
  view: () => ReactNode;
  /** What goes on paper when it differs from the screen */
  print?: () => ReactNode;
  wide?: boolean;
};

const UPLOAD: Record<UploadStatus, DocStatus> = {
  approved: { label: "مقبولة", tone: "green" },
  uploaded: { label: "عند المراجعة", tone: "gold" },
  rejected: { label: "أُعيدت", tone: "maroon" },
  missing: { label: "لم تُرفع", tone: "ink" },
};

/** The demo's passport number for a person: the same on every screen */
const passportNo = (m: Member) => `N${m.person.id.slice(-7)}`;
const visaNo = (app: Application, i: number) => `HV-1448-${app.number}-${i + 1}`;
const nameOf = (m: Member) => `${m.person.firstName} ${m.person.fatherName} ${m.person.lastName}`;
const roleOf = (m: Member) => (m.relation === "self" ? "صاحب الطلب" : relationLabel(m.relation, m.person.gender));
const verify = (what: string) => `https://hajj-demo.sy/verify/${what}`;

/** The demo's drawing of a personal photo: white background, recent, no glasses */
function Portrait({ m, className }: { m: Member; className?: string }) {
  const f = m.person.gender === "F";
  return (
    <div className={className}>
      <div className="relative grid aspect-[4/5] place-items-end overflow-hidden rounded-xl bg-white ring-1 ring-ink/10">
        <svg viewBox="0 0 120 150" className="h-full w-full" aria-hidden>
          <circle cx="60" cy="58" r="28" fill={f ? "#c9b48a" : "#b49a72"} />
          {f && <path d="M28 64 Q30 22 60 22 Q90 22 92 64 L92 96 Q60 84 28 96 Z" fill="#5b4636" opacity=".85" />}
          <circle cx="60" cy="60" r="24" fill="#e8cfae" />
          <path d="M14 150 Q18 102 60 98 Q102 102 106 150 Z" fill={f ? "#5b4636" : "#2f4a5a"} />
        </svg>
      </div>
    </div>
  );
}

// ───────────────────────── The documents ─────────────────────────

function PhotoDoc({ m, status }: { m: Member; status: DocStatus }) {
  return (
    <DocFrame
      tone="green"
      kind="الصورة الشخصية"
      icon={UserRound}
      title={`${m.person.firstName} ${m.person.lastName}`}
      sub={roleOf(m)}
      demo
      aside={<Portrait m={m} className="w-36" />}
      qrCaption="كما رُفعت إلى المنصة"
      fields={[
        { k: "الاسم", v: nameOf(m), wide: true },
        { k: "المواصفات", v: "خلفية بيضاء، حديثة، دون نظارات", wide: true },
        { k: "الحالة", v: status.label },
        { k: "تُرفع", v: "بعد الدفعة الأولى" },
      ]}
      footer="تُستعمل الصورة في بطاقة الحاج الرقمية وسوار المعصم، وفي ملف التأشيرة."
    />
  );
}

function PassportDoc({ m }: { m: Member }) {
  const p = m.person;
  const mrz = `P<SYR${p.id.slice(0, 9)}<<<<<<<<<<<<<<<<<<<<<<<<<<`.slice(0, 44);
  return (
    <DocFrame
      tone="ink"
      kind="جواز سفر — صفحة البيانات"
      icon={IdCard}
      title={`${p.firstName} ${p.lastName}`}
      sub={roleOf(m)}
      code={passportNo(m)}
      demo
      aside={<Portrait m={m} className="w-24" />}
      qrCaption="صورة الجواز"
      fields={[
        { k: "الاسم", v: nameOf(m), wide: true },
        { k: "رقم الجواز", v: passportNo(m), ltr: true },
        { k: "تاريخ الميلاد", v: p.birthDate, ltr: true },
        { k: "مكان الولادة", v: p.birthPlace },
        { k: "الجنس", v: p.gender === "F" ? "أنثى" : "ذكر" },
        // Valid five years from its issue in 1447, ending on its holder's birthday
        { k: "تاريخ الانتهاء", v: `2031-${p.birthDate.slice(5)}`, ltr: true },
        { k: "الجنسية", v: "سورية" },
      ]}
      footer={
        <span className="block font-mono text-[11px] tracking-widest" dir="ltr">
          {mrz}
        </span>
      }
    />
  );
}

/** The visa as the group's head added it: the file he uploaded from the ministry's email, else the demo's drawing of it */
function VisaDoc({ app, m, i, at, visa }: { app: Application; m: Member; i: number; at: number; visa?: PilgrimVisa }) {
  const url = useFileUrl(visa?.ref);
  const no = visa?.number ?? visaNo(app, i);
  const file = !!(visa?.ref && url);
  return (
    <DocFrame
      tone="gold"
      kind="تأشيرة حج"
      icon={Stamp}
      title={`${m.person.firstName} ${m.person.lastName}`}
      sub={roleOf(m)}
      code={no}
      demo={!file}
      qr={verify(`visa/${no}`)}
      qrCaption="رمز التحقق"
      fields={[
        { k: "الاسم", v: nameOf(m), wide: true },
        { k: "رقم التأشيرة", v: no, ltr: true },
        { k: "رقم الجواز", v: passportNo(m), ltr: true },
        { k: "النوع", v: "حج — موسم 1448هـ" },
        { k: "تاريخ الإصدار", v: day(visa?.at ?? at) },
        ...(visa ? [{ k: "أضافها", v: visa.by }] : []),
        { k: "صالحة للدخول", v: "1 ذو القعدة – 30 ذو الحجة 1448", wide: true },
      ]}
      footer={
        file ? (
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span>
              أضافها {visa!.by} من بريد وزارة الخارجية السعودية — {day(visa!.at)}
            </span>
            <a href={url} download={visa!.name} target="_blank" rel="noreferrer" className="font-bold text-green-dark hover:underline">
              تنزيل ملف التأشيرة
            </a>
          </span>
        ) : (
          "تصدر من وزارة الخارجية السعودية وتصل بالبريد إلى رئيس مجموعتكم، فيضيفها إليكم هنا."
        )
      }
    >
      {file && (
        <div className="pt-2">
          <UploadedFile url={url} type={visa!.type} alt={`تأشيرة ${m.person.firstName}`} />
        </div>
      )}
    </DocFrame>
  );
}

function AcceptanceDoc({ app, acceptedBy }: { app: Application; acceptedBy: string }) {
  const self = app.members.find((m) => m.relation === "self") ?? app.members[0];
  return (
    <DocFrame
      tone="green"
      kind="إشعار القبول"
      icon={BadgeCheck}
      title="قُبل طلبكم لأداء فريضة الحج"
      sub={`تُشعركم إدارة الحج والعمرة بقبول الطلب العائلي رقم ${app.number}`}
      code={`QB-1448-${app.number}`}
      qr={verify(`notice/${app.number}`)}
      qrCaption="رمز التحقق من الإشعار"
      fields={[
        { k: "رقم الطلب", v: app.number, ltr: true },
        { k: "صاحب الطلب", v: nameOf(self) },
        { k: "الموسم", v: "حج 1448هـ" },
        { k: "طريقة القبول", v: acceptedBy, wide: true },
        { k: `أفراد الطلب (${app.members.length})`, v: app.members.map((m) => `${m.person.firstName} ${m.person.lastName}`).join("، "), wide: true },
      ]}
      footer="أكملوا خطوات ما بعد القبول في «طلبي وخطواته»: تأكيد القبول، ثم الدفعات والوثائق، حتى التأشيرة والرحلة."
    />
  );
}

type Lines = ReturnType<typeof costLines>;

function ContractDoc({ app, post, lines, total }: { app: Application; post: PostAcceptance; lines: Lines; total: number }) {
  const g = groupInfo(post.clusterId, post.groupNumber);
  const c = post.contract;
  const by = c?.decidedBy ?? post.enrolledBy?.name ?? c?.uploadedBy.name ?? "موظف المكتب";
  const state = !c || c.status === "approved" ? "نافذ" : c.status === "pending" ? "عند المكتب" : `أُعيد: ${c.reason ?? ""}`;
  return (
    <div className="space-y-5">
      <DocFrame
        tone="maroon"
        kind="عقد الحاج مع المجموعة"
        icon={FileSignature}
        title={`عقد ${groupName(g.number)}`}
        sub={`طلب الحج رقم ${app.number} — ${app.members.length} أفراد`}
        code={`ع-${app.number}`}
        qr={verify(`contract/${app.number}`)}
        qrCaption="رمز التحقق من العقد"
        fields={[
          { k: "المجموعة", v: groupName(g.number) },
          { k: "رئيس المجموعة", v: g.leader },
          { k: "التكتل", v: g.clusterName },
          { k: "مستوى الخدمة", v: g.level },
          { k: "المكتب", v: g.office },
          { k: "التكلفة", v: formatUSD(total) },
          { k: "الحالة", v: state },
          { k: "التوقيع في المكتب", v: day(c?.uploadedAt ?? post.groupApprovedAt) },
          { k: "الإلحاق بالمجموعة", v: `${by} — ${day(post.groupApprovedAt)}`, wide: true },
          ...(c ? [{ k: "النسخة الموقّعة", v: c.file.name, wide: true }] : []),
        ]}
        footer={
          post.transfers?.length
            ? post.transfers.map((t) => `انتقلتم من ${groupName(t.from)} إلى ${groupName(t.to)} بعقد جديد — ${day(t.at)}`).join("، ")
            : "وقّعتم العقد مع المجموعة في المكتب، فألحقكم موظفه بها والطلب كله معاً. والانتقال إلى مجموعة أخرى بعقد جديد يُوقَّع في المكتب."
        }
      />
      <div className="rounded-[2rem] bg-white p-5 ring-1 ring-gold/30 md:p-6">
        <ContractDocument app={app} post={post} group={g} lines={lines} total={total} by={by} />
      </div>
    </div>
  );
}

export type ReceiptRow = { key: string; title: string; detail?: string; number: string; amount: number; at?: number; due?: string };

function ReceiptDoc({ app, r }: { app: Application; r: ReceiptRow }) {
  return (
    <DocFrame
      tone="green"
      kind="إيصال رقمي"
      icon={Receipt}
      title={r.title}
      sub={r.detail}
      code={r.number}
      qr={verify(r.number)}
      qrCaption="رمز التحقق من الإيصال"
      fields={[
        { k: "المبلغ", v: <span className="font-display text-2xl text-green-dark">{formatUSD(r.amount)}</span> },
        { k: "تاريخ الدفع", v: day(r.at) },
        { k: "الحالة", v: "مسدَّد ✓" },
        { k: "رقم الإيصال", v: r.number, ltr: true },
        { k: "رقم الطلب", v: app.number, ltr: true },
        { k: "أفراد الطلب", v: `${app.members.length}` },
      ]}
      footer="لكل تكلفة إيصال مستقل، يتحقق منه أي موظف بمسح رمزه أو من صفحة «التحقق»."
    />
  );
}

// ───────────────────────── The lists ─────────────────────────

/** Where a member's visa stands, and when it was issued */
function visaOf(post: PostAcceptance, m: Member) {
  const visa = post.visas?.[m.person.id];
  return { visa, at: visa?.at ?? post.visaAt, issued: !!(visa || post.visaAt) };
}

/** A member's own documents: the digital card (when the assignments are given), the visa, the passport and the photo */
export function memberDocs(app: Application, post: PostAcceptance, opts: { assignments?: Assignment[]; emergency?: string } = {}): { m: Member; docs: VaultDoc[] }[] {
  return app.members.map((m, i) => {
    const name = `${m.person.firstName} ${m.person.lastName}`;
    const v = visaOf(post, m);
    const photo = UPLOAD[docStatus(post, m, "photo")];
    const passport = UPLOAD[docStatus(post, m, "passport")];
    const viewable = (s: UploadStatus) => s === "approved" || s === "uploaded";
    const a = opts.assignments?.find((x) => x.person.id === m.person.id);
    const docs: VaultDoc[] = [];
    if (a)
      docs.push({
        id: `card-${m.person.id}`,
        tone: "green",
        kind: "بطاقة الحاج الرقمية",
        icon: CreditCard,
        title: name,
        sub: roleOf(m),
        code: a.bracelet,
        ready: !!post.visaAt,
        status: post.visaAt ? { label: "على سوار المعصم", tone: "green" } : { label: "بعد صدور التأشيرة", tone: "ink" },
        view: () => (
          <div className="grid place-items-center gap-3 py-2">
            <HajjCard a={a} emergency={opts.emergency ?? ""} index={0} />
            <p className="max-w-md text-center text-sm leading-6 text-hint">اضغط البطاقة لقلبها. تُطبع أيضاً على سوار المعصم، وعند مسح رمزها يرى الموظف أو الإداري المخوّل ما تسمح به صلاحيته فقط؛ والاحتياجات الطبية للفريق الطبي وحده.</p>
          </div>
        ),
      });
    docs.push(
      {
        id: `visa-${m.person.id}`,
        tone: "gold",
        kind: "التأشيرة",
        icon: Stamp,
        title: name,
        sub: roleOf(m),
        code: v.issued ? (v.visa?.number ?? visaNo(app, i)) : undefined,
        ready: v.issued,
        status: v.issued ? { label: "صادرة", tone: "green" } : { label: "لم تصدر", tone: "ink" },
        view: () => <VisaDoc app={app} m={m} i={i} at={v.at!} visa={v.visa} />,
      },
      {
        id: `passport-${m.person.id}`,
        tone: "ink",
        kind: "جواز السفر",
        icon: IdCard,
        title: name,
        sub: roleOf(m),
        code: passportNo(m),
        ready: viewable(docStatus(post, m, "passport")),
        status: passport,
        view: () => <PassportDoc m={m} />,
      },
      {
        id: `photo-${m.person.id}`,
        tone: "green",
        kind: "الصورة الشخصية",
        icon: UserRound,
        title: name,
        sub: roleOf(m),
        ready: viewable(docStatus(post, m, "photo")),
        status: photo,
        view: () => <PhotoDoc m={m} status={photo} />,
      },
    );
    return { m, docs };
  });
}

/** Every cost's receipt: paid ones open, the rest wait for their due date */
export function receiptDocs(app: Application, post: PostAcceptance, lines: Lines, registration: number): VaultDoc[] {
  const rows: (ReceiptRow & { paid: boolean })[] = [
    { key: "fee", title: "رسم التسجيل", detail: `${app.members.length} أفراد`, number: app.receipt, amount: registration, at: app.submittedAt, paid: true },
    ...lines.map((l) => {
      const at = paidAt(l, app, post);
      return { key: l.key, title: l.title, detail: l.detail, number: l.receipt, amount: l.amount, at, due: l.due, paid: !!at };
    }),
  ];
  return rows.map((r) => ({
    id: `receipt-${r.key}`,
    tone: "green",
    kind: "إيصال رقمي",
    icon: Receipt,
    title: r.title,
    sub: `${formatUSD(r.amount)}${r.detail ? ` — ${r.detail}` : ""}`,
    code: r.paid ? r.number : undefined,
    ready: r.paid,
    status: r.paid ? { label: "مسدَّد", tone: "green" } : { label: r.due ? `مستحق ${r.due}` : "لم يُسدَّد", tone: "gold" },
    view: () => <ReceiptDoc app={app} r={r} />,
  }));
}

/** The application's own documents: the acceptance notice and the contract with the group */
export function familyDocs(app: Application, post: PostAcceptance, lines: Lines, opts: { acceptedBy: string; total: number }): VaultDoc[] {
  const g = groupInfo(post.clusterId, post.groupNumber);
  const c = post.contract;
  return [
    {
      id: "notice",
      tone: "green",
      kind: "إشعار القبول",
      icon: BadgeCheck,
      title: `الطلب رقم ${app.number}`,
      sub: opts.acceptedBy,
      code: `QB-1448-${app.number}`,
      ready: true,
      status: { label: "صادر", tone: "green" },
      view: () => <AcceptanceDoc app={app} acceptedBy={opts.acceptedBy} />,
    },
    {
      id: "contract",
      tone: "maroon",
      kind: "العقد مع المجموعة",
      icon: FileSignature,
      title: post.groupApprovedAt ? `عقد ${groupName(g.number)}` : "عقد المجموعة",
      sub: post.groupApprovedAt ? `${g.clusterName} — ${formatUSD(opts.total)}` : "يُوقَّع في المكتب عند الإلحاق بمجموعة",
      code: post.groupApprovedAt ? `ع-${app.number}` : undefined,
      ready: !!post.groupApprovedAt,
      status: !post.groupApprovedAt ? { label: "بعد الإلحاق بمجموعة", tone: "ink" } : !c || c.status === "approved" ? { label: "نافذ", tone: "green" } : c.status === "pending" ? { label: "عند المكتب", tone: "gold" } : { label: "أُعيد", tone: "maroon" },
      view: () => <ContractDoc app={app} post={post} lines={lines} total={opts.total} />,
      print: () => <ContractDocument app={app} post={post} group={g} lines={lines} total={opts.total} by={c?.decidedBy ?? post.enrolledBy?.name ?? c?.uploadedBy.name ?? "موظف المكتب"} print />,
      wide: true,
    },
  ];
}

/** Stubs in a grid, each opening its document */
export function DocGrid({ docs, className = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" }: { docs: VaultDoc[]; className?: string }) {
  const [open, setOpen] = useState<VaultDoc | null>(null);
  return (
    <>
      <div className={className}>
        {docs.map((d, i) => (
          <DocStub key={d.id} tone={d.tone} kind={d.kind} icon={d.icon} title={d.title} sub={d.sub} code={d.code} status={d.status} ready={d.ready} index={i} onOpen={() => setOpen(d)} />
        ))}
      </div>
      <DocViewer open={!!open} onClose={() => setOpen(null)} print={open?.print?.()} wide={open?.wide}>
        {open?.view()}
      </DocViewer>
    </>
  );
}

function Shelf({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text?: string; children: ReactNode }) {
  return (
    <Card className="md:p-8">
      <p className="flex items-center gap-3 font-display text-2xl font-bold text-green-dark">
        <span className="grid size-11 place-items-center rounded-2xl bg-green-dark text-gold shadow-lg">
          <Icon className="size-5" />
        </span>
        {title}
      </p>
      {text && <p className="mt-2 text-sm leading-7 text-ink-soft">{text}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

/**
 * «خزنة الوثائق»: every document of the application in one place — its own (the acceptance notice, the contract,
 * the flight tickets), its receipts, and each member's — whatever has been issued opens, the rest say when.
 */
export function DocumentVault({ app, post, lines, total, registration, acceptedBy, assignments, emergency, flights, visa }: { app: Application; post: PostAcceptance; lines: Lines; total: number; registration: number; acceptedBy: string; assignments: Assignment[]; emergency: string; flights: VaultDoc[]; visa?: ReactNode }) {
  const family = [...familyDocs(app, post, lines, { acceptedBy, total }), ...flights];
  const receipts = receiptDocs(app, post, lines, registration);
  const members = memberDocs(app, post, { assignments, emergency });
  const all = [...family, ...receipts, ...members.flatMap((x) => x.docs)];
  const ready = all.filter((d) => d.ready).length;
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-dark via-green to-green-dark p-6 text-white md:p-8">
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="absolute -left-16 -top-16 size-56 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-sm font-bold text-gold">طلب الحج رقم {app.number} — موسم 1448هـ</p>
            <p className="mt-1 font-display text-3xl font-bold">كل وثائقكم في مكان واحد</p>
            <p className="mt-2 leading-7 text-white/75">إشعار القبول والعقد وبطاقات الرحلة والإيصالات، ولكل فرد بطاقته الرقمية وتأشيرته وجوازه وصورته. ما صدر منها يُفتح ويُطبع، وما لم يصدر بعد يقول متى.</p>
          </div>
          <div className="rounded-3xl bg-white/10 px-6 py-4 text-center backdrop-blur">
            <p className="font-display text-5xl font-bold text-gold">
              {ready}
              <span className="text-2xl text-white/60">/{all.length}</span>
            </p>
            <p className="text-sm text-white/70">وثيقة صادرة</p>
          </div>
        </div>
      </div>
      <Shelf icon={FileStack} title="وثائق الطلب" text="إشعار القبول، والعقد مع المجموعة، وبطاقتا رحلة الذهاب والعودة.">
        <DocGrid docs={family} />
      </Shelf>
      <Shelf icon={Receipt} title="الإيصالات" text="لكل تكلفة إيصال مستقل قابل للتحقق.">
        <DocGrid docs={receipts} />
      </Shelf>
      {visa}
      {members.map(({ m, docs }) => (
        <Shelf key={m.person.id} icon={UserRound} title={`${m.person.firstName} ${m.person.lastName}`} text={roleOf(m)}>
          <DocGrid docs={docs} className="grid gap-4 sm:grid-cols-2" />
        </Shelf>
      ))}
    </div>
  );
}
