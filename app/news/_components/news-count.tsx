"use client";

import { Newspaper } from "lucide-react";
import { useArticles } from "@/lib/cms/content";

/** عدد المنشورات في ترويسة صفحة الأخبار — يتغيّر مع ما يُنشر أو يُؤرشف من اللوحة */
export function NewsCount() {
  const count = useArticles().length;
  return (
    <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/85 ring-1 ring-white/15 backdrop-blur">
      <Newspaper className="size-4 text-gold" />
      {count} منشورات في موسم 1448هـ — المصدر الرسمي الوحيد لإعلانات الإدارة
    </p>
  );
}
