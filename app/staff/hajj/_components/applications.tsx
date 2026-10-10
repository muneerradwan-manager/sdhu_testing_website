"use client";

import { useSearchParams } from "next/navigation";
import { ClipboardList, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { outcomeOf, stageAt, trackOf } from "@/lib/journey";
import { usePublishedDraw } from "@/lib/lottery";
import { useLiveVersion, useReg } from "@/lib/registration/client";
import { formatAnswer, pinnedVersion, postStepsOf } from "@/lib/registration/engine";
import { costLines, stepsDone } from "@/lib/registration/post";
import { consentPeople } from "@/lib/registration/service";
import type { Answers, RegVersion } from "@/lib/registration/types";
import { fullName, getPerson } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { useSeason } from "@/lib/season-live";
import { useStore, type Application, type ApplyDraft } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { Drawer, Empty, Panel, fmtDateTime, smallInputClass, useNow } from "../../_components/kit";
import { RecordHistory } from "../../_components/system";
import { Segments } from "../../exam/_components/ui";
import { Kind } from "./editor";

/** Which stage a saved history screen belongs to, by the platform's screens */
const BLOCK_OF: Record<string, string> = {
  track: "track",
  forWhom: "applicant",
  otherId: "applicant",
  residence: "residence",
  companions: "members",
  method: "members",
  booklet: "members",
  count: "members",
  adder: "members",
  review: "members",
  elderly: "members",
  eligibility: "eligibility",
  consents: "consents",
  summary: "summary",
  payment: "payment",
};

type Row = {
  owner: string;
  name: string;
  number?: string;
  members: Member[];
  track: "direct" | "lottery";
  /** The application's status (its decision), apart from where its owner is in the screens */
  status: string;
  statusTone: "green" | "gold" | "maroon" | "muted";
  /** What its owner sees now: a registration stage, or a step after acceptance */
  stage: string;
  version: RegVersion;
  app?: Application;
  draft?: ApplyDraft;
  consents: { done: number; of: number };
  updated: number;
};

export function ApplicationsPage() {
  const params = useSearchParams();
  const applications = useStore((s) => s.applications);
  const drafts = useStore((s) => s.drafts);
  const post = useStore((s) => s.post);
  const reviews = useStore((s) => s.reviews);
  const reg = useReg();
  const live = useLiveVersion();
  const draw = usePublishedDraw();
  const { fees, acceptedDirectAge } = useSeason();
  const now = useNow(5000);
  const [filter, setFilter] = useState<"all" | "draft" | "waiting" | "submitted" | "accepted">((params.get("f") as "waiting") ?? "all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const out: Row[] = [];
    for (const [owner, d] of Object.entries(drafts)) {
      const version = pinnedVersion(reg, d.configVersion);
      const last = d.history[d.history.length - 1] ?? "";
      const stage = last.startsWith("stage:") ? version.config.stages.find((s) => s.id === last.slice(6)) : version.config.stages.find((s) => s.system === BLOCK_OF[last]);
      const people = consentPeople(d.members, owner);
      const self = d.members.find((m) => m.relation === "self")?.person ?? getPerson(owner);
      out.push({
        owner,
        name: self ? fullName(self) : owner,
        members: d.members,
        track: d.track,
        status: "قيد التعبئة",
        statusTone: "muted",
        stage: stage ? stage.name || stage.title : "البداية",
        version,
        draft: d,
        consents: { done: people.filter((m) => d.consents[m.person.id]?.status === "approved").length, of: people.length },
        updated: d.updatedAt,
      });
    }
    for (const app of Object.values(applications)) {
      const version = pinnedVersion(reg, app.configVersion, app.season);
      const out1 = outcomeOf(app, draw, app.policy?.acceptedDirectAge ?? acceptedDirectAge);
      const { stage: st } = stageAt(out1.steps, (now - app.submittedAt) / 1000);
      const rejected = reviews[app.applicantId]?.status === "rejected";
      let stage = "متابعة الطلب";
      if (st.key === "accepted" && !rejected) {
        const steps = postStepsOf(version.config);
        const p = post[app.applicantId] ?? { documents: {}, payments: {}, ratings: {} };
        const done = stepsDone(p, app, costLines(app, fees), steps);
        const next = steps.find((s) => !done[s.id]);
        stage = next ? `خطوة «${next.title}»` : "اكتملت الخطوات — ملف الرحلة";
      }
      const self = app.members.find((m) => m.relation === "self") ?? app.members[0];
      out.push({
        owner: app.applicantId,
        name: fullName(self.person),
        number: app.number,
        members: app.members,
        track: trackOf(app),
        status: rejected ? "موقوف بقرار المراجعة" : st.title,
        statusTone: rejected || st.key === "notAccepted" ? "maroon" : st.key === "accepted" ? "green" : "gold",
        stage,
        version,
        app,
        consents: { done: 0, of: 0 },
        updated: app.submittedAt,
      });
    }
    return out.sort((a, b) => b.updated - a.updated);
  }, [drafts, applications, reg, draw, acceptedDirectAge, now, reviews, post, fees]);

  const shown = rows.filter(
    (r) =>
      (filter === "all" ||
        (filter === "draft" && !r.app) ||
        (filter === "waiting" && !r.app && r.consents.done < r.consents.of) ||
        (filter === "submitted" && r.app) ||
        (filter === "accepted" && r.statusTone === "green")) &&
      (!q.trim() || r.name.includes(q.trim()) || r.number?.includes(q.trim())),
  );
  const row = rows.find((r) => r.owner === open);

  return (
    <div className="space-y-6">
      <Panel icon={<ClipboardList />} title="الطلبات">
        <p className="mb-4 text-sm leading-7 text-white/70">
          <b className="text-white">حالة الطلب</b> قرار المنصة والموظفين (مقدَّم، تدقيق البيانات، مؤهل، اعتماد القبول أو القرعة، مقبول) — لا تتغير من هنا ولا بتعديل الصفحات. <b className="text-white">المرحلة</b> ما يراه صاحب الطلب الآن. وكل طلب على إصدار الإعدادات الذي بدأ عليه.
        </p>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Segments
            value={filter}
            onChange={setFilter}
            label="تصفية"
            items={[
              { value: "all", label: "الكل", count: rows.length },
              { value: "draft", label: "قيد التعبئة", count: rows.filter((r) => !r.app).length },
              { value: "waiting", label: "تنتظر موافقات", count: rows.filter((r) => !r.app && r.consents.done < r.consents.of).length },
              { value: "submitted", label: "مقدَّمة", count: rows.filter((r) => r.app).length },
              { value: "accepted", label: "مقبولة", count: rows.filter((r) => r.statusTone === "green").length },
            ]}
          />
          <label className="relative mr-auto w-full max-w-xs">
            <Search className="absolute right-3 top-3 size-4 text-white/50" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم أو رقم طلب" className={cn(smallInputClass, "pr-9")} aria-label="بحث" />
          </label>
        </div>
        {shown.length === 0 ? (
          <Empty icon={<ClipboardList />} title="لا طلبات هنا" text="تظهر الطلبات حين يبدأ الحجاج التسجيل أو يسجّلهم المكتب." />
        ) : (
          <div className="overflow-x-auto rounded-2xl ring-1 ring-white/10">
            <table className="w-full min-w-[54rem] text-sm">
              <thead className="bg-black/20 text-white/70">
                <tr>
                  <th className="p-2.5 text-right">صاحب الطلب</th>
                  <th className="p-2.5 text-right">الأفراد</th>
                  <th className="p-2.5 text-right">المسار</th>
                  <th className="p-2.5 text-right">حالة الطلب</th>
                  <th className="p-2.5 text-right">المرحلة التي يراها</th>
                  <th className="p-2.5 text-right">الإصدار</th>
                  <th className="p-2.5 text-right">الموافقات / المدفوع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white">
                {shown.map((r) => (
                  <tr key={r.owner} className="cursor-pointer hover:bg-white/[.04]" onClick={() => setOpen(r.owner)}>
                    <td className="p-2.5">
                      <button type="button" className="font-bold hover:text-gold" onClick={() => setOpen(r.owner)}>
                        {r.name}
                      </button>
                      <span className="block text-xs text-white/55">{r.number ? `طلب ${r.number}` : `آخر حفظ ${fmtDateTime(r.updated)}`}</span>
                    </td>
                    <td className="p-2.5 tabular-nums">{r.members.length}</td>
                    <td className="p-2.5">{r.track === "lottery" ? "القرعة" : "القبول المباشر"}</td>
                    <td className="p-2.5">
                      <Kind tone={r.statusTone}>{r.status}</Kind>
                    </td>
                    <td className="p-2.5 text-white/85">{r.stage}</td>
                    <td className="p-2.5">
                      {r.version.number} {r.version.id !== live.id && <Kind tone="gold">سابق</Kind>}
                    </td>
                    <td className="p-2.5 tabular-nums">{r.app ? formatUSD(r.app.paid) : r.consents.of ? `${r.consents.done} من ${r.consents.of}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {row && <ApplicationDrawer row={row} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ApplicationDrawer({ row, onClose }: { row: Row; onClose: () => void }) {
  const reg = useReg();
  const fields = [...row.version.config.stages.flatMap((s) => s.fields), ...row.version.config.postSteps.flatMap((p) => p.fields)];
  const answers: Answers = row.app?.answers ?? row.draft?.answers ?? {};
  const memberAnswers = row.app?.memberAnswers ?? row.draft?.memberAnswers ?? {};
  const ledger = Object.values(reg.ledger).filter((p) => p.owner === row.owner);
  // The selector returns what is stored (a fresh `{}` from it would re-render forever)
  const custom = useStore((s) => s.post[row.owner]?.custom) ?? {};
  const label = (key: string) => fields.find((f) => f.key === key);
  return (
    <Drawer open onClose={onClose} title={`${row.name}${row.number ? ` — طلب ${row.number}` : ""}`}>
      <div className="space-y-5 text-sm">
        <div className="flex flex-wrap gap-2">
          <Kind tone={row.statusTone}>{row.status}</Kind>
          <Kind>{row.stage}</Kind>
          <Kind tone="gold">
            الإصدار {row.version.number} — {row.version.note}
          </Kind>
        </div>
        <section>
          <p className="mb-2 font-bold text-gold">الأفراد</p>
          <ul className="space-y-1">
            {row.members.map((m) => (
              <li key={m.person.id} className="flex flex-wrap items-center gap-2 text-white/85">
                {fullName(m.person)}
                {row.draft && consentPeople(row.members, row.owner).some((x) => x.person.id === m.person.id) && (
                  <Kind tone={row.draft.consents[m.person.id]?.status === "approved" ? "green" : "gold"}>{row.draft.consents[m.person.id]?.status === "approved" ? `وافق ${fmtDateTime(row.draft.consents[m.person.id].respondedAt!)}` : "لم يوافق بعد"}</Kind>
                )}
              </li>
            ))}
          </ul>
          {row.draft?.applicantConsent && <p className="mt-2 text-xs text-white/60">موافقة صاحب الطلب برمز على هاتفه — {fmtDateTime(row.draft.applicantConsent.at)}</p>}
        </section>
        <section>
          <p className="mb-2 font-bold text-gold">الإجابات</p>
          {Object.keys(answers).length === 0 && Object.keys(memberAnswers).length === 0 && <p className="text-white/60">لا إجابات على أسئلة الإدارة.</p>}
          <ul className="space-y-1">
            {Object.entries(answers).map(([k, v]) => (
              <li key={k} className="text-white/85">
                <span className="text-white/55">{label(k)?.label ?? k}: </span>
                {formatAnswer(label(k), v)}
              </li>
            ))}
            {Object.entries(memberAnswers).flatMap(([id, a]) =>
              Object.entries(a).map(([k, v]) => (
                <li key={`${id}-${k}`} className="text-white/85">
                  <span className="text-white/55">
                    {label(k)?.label ?? k} — {getPerson(id)?.firstName}:{" "}
                  </span>
                  {formatAnswer(label(k), v)}
                </li>
              )),
            )}
          </ul>
          <p className="mt-1 text-xs text-white/45">تُقرأ التسميات من إصدار الطلب، فتبقى صحيحة وإن عُدّل السؤال أو حُذف لاحقاً.</p>
        </section>
        {Object.keys(custom).length > 0 && (
          <section>
            <p className="mb-2 font-bold text-gold">خطوات الإدارة بعد القبول</p>
            <ul className="space-y-1 text-white/85">
              {Object.entries(custom).map(([id, c]) => (
                <li key={id}>
                  {row.version.config.postSteps.find((p) => p.id === id)?.title ?? id} — {fmtDateTime(c.at)}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <p className="mb-2 font-bold text-gold">الدفعات المؤكَّدة</p>
          {ledger.length === 0 ? (
            <p className="text-white/60">{row.app ? `مدفوع مع التسجيل: ${formatUSD(row.app.paid)}` : "لا دفع بعد."}</p>
          ) : (
            <ul className="space-y-1 text-white/85">
              {ledger.map((p) => (
                <li key={p.id}>
                  {formatUSD(p.amount)} — {p.method === "bank" ? "المصرف" : "شام كاش"} — {fmtDateTime(p.at)} <span className="text-white/50">({p.usedFor ? `لـ ${p.usedFor}` : "لم يُستعمل بعد"})</span>
                </li>
              ))}
            </ul>
          )}
          {row.app?.policy && (
            <p className="mt-1 text-xs text-white/50">
              شروطه المحفوظة: رسم {formatUSD(row.app.policy.fees.registrationPerPerson)} للفرد، تكلفة {formatUSD(row.app.policy.fees.hajjCost)} في {row.app.policy.fees.schedule.length} دفعات، عمر القبول المباشر {row.app.policy.acceptedDirectAge}.
            </p>
          )}
        </section>
        <section>
          <p className="mb-2 font-bold text-gold">سجلّه</p>
          <RecordHistory system="registration" refId={row.owner} bare />
        </section>
      </div>
    </Drawer>
  );
}
