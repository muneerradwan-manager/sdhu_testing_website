"use client";

import { AlertTriangle, Ban, CheckCircle2, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { fullName } from "@/lib/registry";
import { actions, type CivilClaim } from "@/lib/store";
import { cn, maskNationalId } from "@/lib/utils";
import { useCivilClaims, type CivilItem } from "../_components/data";
import { fmtDateTime, logAs, textareaClass, useStaffUser } from "../_components/kit";
import { Box, EditHeader, EditLayout, EmptyRow, ListTable, RowActions, RowLink, Tag } from "../_components/wp";
import { Segments } from "../exam/_components/ui";

const BASE = "/staff/reviews?view=civil";
const href = (id: string) => `/staff/reviews?view=civil&id=${encodeURIComponent(id)}`;

type Filter = CivilClaim["status"] | "all";

const STATUS: Record<CivilClaim["status"], { label: string; tone: "gold" | "green" | "maroon" }> = {
  pending: { label: "غير مؤكدة — بانتظار القرار", tone: "gold" },
  approved: { label: "صُحّحت", tone: "green" },
  rejected: { label: "رُفض التصحيح", tone: "maroon" },
};

/**
 * «تصحيح البيانات المدنية»: what pilgrims said the civil registry got wrong when they created their accounts,
 * with the document that proves it. Each is decided on its own screen, with a reason the pilgrim reads.
 */
export function CivilClaims({ id }: { id: string | null }) {
  const items = useCivilClaims();
  if (id) return <CivilScreen item={items.find((x) => x.id === id)} />;
  return <CivilList items={items} />;
}

function CivilList({ items }: { items: CivilItem[] }) {
  const [filter, setFilter] = useState<Filter>("pending");
  const count = (f: Filter) => (f === "all" ? items.length : items.filter((x) => x.claim.status === f).length);
  const list = useMemo(() => items.filter((x) => filter === "all" || x.claim.status === filter), [items, filter]);

  return (
    <div className="space-y-4">
      <Segments
        value={filter}
        onChange={setFilter}
        label="تصفية التصحيحات"
        items={[
          { value: "pending", label: "بانتظار القرار", count: count("pending") },
          { value: "approved", label: "صُحّحت", count: count("approved") },
          { value: "rejected", label: "مرفوضة", count: count("rejected") },
          { value: "all", label: "الكل", count: count("all") },
        ]}
      />
      <ListTable head={["الحاج", "الحالة", "الحقول", "الوثيقة", "أُرسل"]}>
        {list.length === 0 && <EmptyRow cols={5}>لا تصحيحات هنا. يرسلها الحاج من «البيانات غير صحيحة» عند إنشاء حسابه.</EmptyRow>}
        {list.map((x) => (
          <tr key={x.id} className="align-top">
            <td className="p-3">
              <RowLink href={href(x.id)}>
                <span className="font-bold text-white hover:text-gold">{fullName(x.person)}</span>
              </RowLink>
              <p className="text-xs text-white/60" dir="ltr">
                {maskNationalId(x.id)}
              </p>
              <RowActions>
                <RowLink href={href(x.id)}>{x.claim.status === "pending" ? "مراجعة" : "عرض القرار"}</RowLink>
              </RowActions>
            </td>
            <td className="p-3">
              <Tag tone={STATUS[x.claim.status].tone}>{STATUS[x.claim.status].label}</Tag>
            </td>
            <td className="p-3 text-white/80">{x.claim.fields.map((f) => f.label).join("، ")}</td>
            <td className="p-3 text-white/80">{x.claim.doc.kind}</td>
            <td className="p-3 text-xs text-white/70">{fmtDateTime(x.claim.at)}</td>
          </tr>
        ))}
      </ListTable>
    </div>
  );
}

const section = "rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10";

function CivilScreen({ item }: { item?: CivilItem }) {
  if (!item) {
    return (
      <div>
        <EditHeader back={BASE} backLabel="كل التصحيحات" title="التصحيح غير موجود" />
        <p className="text-white/70">لم يعد هذا التصحيح في القائمة.</p>
      </div>
    );
  }
  const { claim, person } = item;
  return (
    <div>
      <EditHeader back={BASE} backLabel="كل التصحيحات" title={`تصحيح بيانات ${fullName(person)}`}>
        {STATUS[claim.status].label}
      </EditHeader>
      <EditLayout
        main={
          <>
            {claim.decision && (
              <div className={cn("rounded-2xl p-4 ring-1", claim.status === "approved" ? "bg-green-light/20 ring-green-light/50" : "bg-maroon/50 ring-maroon")}>
                <p className="flex items-center gap-2 font-bold text-white">
                  {claim.status === "approved" ? <CheckCircle2 className="size-4 text-gold" /> : <Ban className="size-4 text-gold" />}
                  {STATUS[claim.status].label} — {claim.decision.by} — {fmtDateTime(claim.decision.at)}
                </p>
                <p className="mt-1 text-sm text-white/90">السبب: {claim.decision.note}</p>
              </div>
            )}
            <section className={section}>
              <h2 className="mb-3 font-display text-lg font-bold text-gold">ما في السجل المدني، وما يقوله الحاج</h2>
              <ListTable head={["الحقل", "في السجل المدني", "يقول الحاج"]} minWidth="28rem">
                {claim.fields.map((f) => (
                  <tr key={f.key}>
                    <td className="p-3 font-bold text-white">{f.label}</td>
                    <td className="p-3 text-white/75 line-through decoration-maroon/80">{f.registry}</td>
                    <td className="p-3 font-bold text-gold">{f.claimed}</td>
                  </tr>
                ))}
              </ListTable>
              {claim.note && <p className="mt-3 rounded-xl bg-white/[.06] p-3 text-sm leading-6 text-white/90">ملاحظة الحاج: {claim.note}</p>}
            </section>
            <section className={section}>
              <h2 className="mb-2 flex items-center gap-2 font-display font-bold text-gold">
                <FileText className="size-4" /> الوثيقة المرفوعة
              </h2>
              <p className="text-sm text-white">
                {claim.doc.kind} — <span dir="ltr">{claim.doc.name}</span>
              </p>
              <p className="mt-1 text-xs text-white/60">طابِق كل حقل مع الوثيقة. لا يُعتمد إلا ما تثبته.</p>
            </section>
          </>
        }
        side={
          <>
            <Box title="القرار">
              <CivilDecision key={claim.status} item={item} />
            </Box>
            <Box title="عن الحاج">
              <dl className="space-y-1.5">
                {[
                  ["الرقم الوطني", maskNationalId(person.id)],
                  ["المحافظة", person.governorate],
                  ["مكان القيد", person.registry],
                  ["أُرسل", fmtDateTime(claim.at)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-white/60">{k}</dt>
                    <dd className="text-left font-bold text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            </Box>
          </>
        }
      />
    </div>
  );
}

/** Approve or reject, with a reason the pilgrim reads in his profile; logged under the officer's name */
function CivilDecision({ item }: { item: CivilItem }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const valid = note.trim().length >= 8;
  const name = fullName(item.person);

  const decide = (status: "approved" | "rejected") => {
    setTried(true);
    if (!valid) return;
    const before = STATUS[item.claim.status].label;
    actions.decideCivil(item.id, status, { note: note.trim(), by: user.name, at: Date.now() });
    logAs(user, {
      action: status === "approved" ? "اعتماد تصحيح بيانات مدنية" : "رفض تصحيح بيانات مدنية",
      target: `${name} (${maskNationalId(item.id)})`,
      detail: `${item.claim.fields.map((f) => `${f.label}: ${f.registry} ← ${f.claimed}`).join("، ")} — ${note.trim()}`,
      before,
      after: STATUS[status].label,
    });
    toast(
      status === "approved"
        ? { title: `صُحّحت بيانات ${name}`, body: "يرى الحاج القرار في ملفه، وسُجّل باسمك في سجل الأحداث.", tone: "success", icon: "✅" }
        : { title: `رُفض تصحيح ${name}`, body: "يرى الحاج سبب الرفض في ملفه، وتبقى بياناته كما في السجل المدني.", tone: "warning", icon: "⛔" },
    );
    setNote("");
    setTried(false);
  };

  return (
    <div className="space-y-3">
      {item.claim.status !== "pending" && <p className="text-xs text-white/60">قرار جديد يحل محل القرار الحالي، ويُسجَّل الاثنان.</p>}
      <label className="block">
        <span className="mb-1.5 block font-bold text-white">
          سبب القرار <span className="text-xs font-normal text-white/60">(إلزامي — يراه الحاج)</span>
        </span>
        <textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="مثال: اسم الأم في بيان القيد المرفوع «آمنة»، مطابق لما كتبه الحاج"
          className={cn(textareaClass, "resize-none text-sm", tried && !valid && "border-gold! bg-maroon/40!")}
        />
        {tried && !valid && (
          <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-gold">
            <AlertTriangle className="size-4 shrink-0" /> اكتب سبباً واضحاً (8 أحرف على الأقل)
          </span>
        )}
      </label>
      <div className="flex gap-2">
        <Button variant="gold" className="flex-1" onClick={() => decide("approved")}>
          <CheckCircle2 className="size-4" /> اعتماد
        </Button>
        <Button variant="maroon" className="flex-1" onClick={() => decide("rejected")}>
          <Ban className="size-4" /> رفض
        </Button>
      </div>
    </div>
  );
}
