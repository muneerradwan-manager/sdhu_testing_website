"use client";

import { Newspaper } from "lucide-react";
import { useArticles } from "@/lib/cms/content";
import { useT } from "@/lib/i18n";

/** عدد المنشورات في ترويسة صفحة الأخبار — يتغيّر مع ما يُنشر أو يُؤرشف من اللوحة */
export function NewsCount() {
  const count = useArticles().length;
  const t = useT();
  return (
    <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/85 ring-1 ring-white/15 backdrop-blur">
      <Newspaper className="size-4 text-gold" />
      {t(
        `${count} منشورات في موسم 1448هـ — المصدر الرسمي الوحيد لإعلانات الإدارة`,
        `${count} posts in the 1448 AH season — the only official source of the Administration's announcements`,
      )}
    </p>
  );
}
