"use client";

import { BarChart3, ClipboardList, FileCheck2, Hourglass, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { outcomeOf, stageAt, trackOf } from "@/lib/journey";
import { usePublishedDraw } from "@/lib/lottery";
import { useReg } from "@/lib/registration/client";
import { pinnedVersion } from "@/lib/registration/engine";
import { useSeason } from "@/lib/season-live";
import { BarList, Kpi, PageHeader, Panel, useNow } from "../_components/kit";
import { HowItWorks } from "../_components/wp";
import { Escalate } from "../_components/system";
import { useRegistrationDesk } from "./desk";

/** The platform's screens, by the stage they belong to (a saved application's last screen) */
const BLOCK_OF: Record<string, string> = { track: "track", forWhom: "applicant", otherId: "applicant", residence: "residence", companions: "members", method: "members", booklet: "members", count: "members", adder: "members", review: "members", elderly: "members", eligibility: "eligibility", consents: "consents", summary: "summary", payment: "payment" };

/**
 * The file's dashboard: numbers only — how many applied, where they are, where those still filling in
 * stopped — and, for whoever opens the file for the first time, how the work goes. Nothing is edited here.
 */
/** `embedded`: inside «لوحة الإدارة العليا», which has its own heading: the figures only, without this page's heading and «كيف تعمل» */
export function RegistrationSummary({ embedded = false }: { embedded?: boolean } = {}) {
  const desk = useRegistrationDesk();
  const reg = useReg();
  const draw = usePublishedDraw();
  const { acceptedDirectAge } = useSeason();
  const now = useNow(10_000);
  const [raise, setRaise] = useState(false);

  const stats = useMemo(() => {
    const status: Record<string, number> = {};
    const track: Record<string, number> = {};
    const office: Record<string, number> = {};
    let people = 0;
    for (const a of desk.apps) {
      const out = outcomeOf(a, draw, a.policy?.acceptedDirectAge ?? acceptedDirectAge);
      const { stage } = stageAt(out.steps, (now - a.submittedAt) / 1000);
      status[stage.title] = (status[stage.title] ?? 0) + 1;
      const t = trackOf(a) === "lottery" ? "القرعة" : "القبول المباشر";
      track[t] = (track[t] ?? 0) + 1;
      office[a.office] = (office[a.office] ?? 0) + 1;
      people += a.members.length;
    }
    const where: Record<string, number> = {};
    for (const [, d] of desk.inProgress) {
      const v = pinnedVersion(reg, d.configVersion);
      const last = d.history[d.history.length - 1] ?? "";
      const st = last.startsWith("stage:") ? v.config.stages.find((s) => s.id === last.slice(6)) : v.config.stages.find((s) => s.system === BLOCK_OF[last]);
      const name = st ? st.name || st.title : "البداية";
      where[name] = (where[name] ?? 0) + 1;
    }
    const list = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, key: label }));
    return { status: list(status), track: list(track), office: list(office), where: list(where), people };
  }, [desk.apps, desk.inProgress, draw, acceptedDirectAge, now, reg]);

  return (
    <div className="space-y-6">
      {!embedded && (
        <>
        <PageHeader eyebrow="إدارة التسجيل على الحج" title="الإحصائيات والسجل" icon={<BarChart3 />} description="أرقام التسجيل على الحج في هذا الموسم. للتعديل استعمل القائمة الجانبية." />

        </>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="طلبات مقدَّمة" value={desk.apps.length} icon={<ClipboardList />} />
        <Kpi label="حجاج في هذه الطلبات" value={stats.people} icon={<UsersRound />} delay={0.05} />
        <Kpi label="مقبولة" value={desk.accepted.length} icon={<FileCheck2 />} tone="gold" delay={0.1} />
        <Kpi label="ما زالت تُعبَّأ" value={desk.inProgress.length} icon={<Hourglass />} hint={desk.waiting.length ? `${desk.waiting.length} تنتظر موافقات` : undefined} delay={0.15} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Chart title="الطلبات حسب حالتها" items={stats.status} empty="لا طلبات مقدَّمة بعد." />
        <Chart title="أين توقّف من لم يكمل طلبه" items={stats.where} empty="لا طلبات قيد التعبئة." />
        <Chart title="الطلبات حسب المسار" items={stats.track} empty="لا طلبات مقدَّمة بعد." />
        <Chart title="الطلبات حسب المكتب" items={stats.office} empty="لا طلبات مقدَّمة بعد." />
      </div>

      <Escalate system="registration" open={raise} onClose={() => setRaise(false)} example="مثال: نحتاج مساراً ثالثاً للتسجيل (المنح)، وهو منطق قبول جديد لا تدعمه المنصة." />
      {!embedded && (
        <>
          <HowItWorks
            steps={[
              { title: "عدّل", text: "الصفحات والأسئلة والخطوات والدفعات. كل تعديل يُحفظ ولا يراه الحجاج بعد.", href: "/staff/hajj/manage", link: "صفحات التسجيل" },
              { title: "عاين", text: "شاهد التسجيل كما سيراه الحاج، صفحة بعد صفحة، دون أن يُحفظ شيء.", href: "/staff/hajj/manage/preview", link: "معاينة" },
              { title: "انشر", text: "زر «نشر التغييرات» في أعلى كل صفحة. من بدأ طلبه قبل النشر يكمله كما بدأه.", href: "/staff/hajj/manage", link: "إلى الصفحات" },
            ]}
          />
          <button type="button" onClick={() => setRaise(true)} className="text-xs font-bold text-white/60 hover:text-white hover:underline">
            تحتاج شيئاً لا تستطيعه من هنا؟ ارفعه إلى مدير الموسم
          </button>
        </>
      )}
    </div>
  );
}

function Chart({ title, items, empty }: { title: string; items: { label: string; value: number; key: string }[]; empty: string }) {
  return (
    <Panel icon={<BarChart3 />} title={title}>
      {items.length ? <BarList items={items} color="bg-gold" /> : <p className="text-sm text-white/60">{empty}</p>}
    </Panel>
  );
}
