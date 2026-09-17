import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Emblem } from "@/components/brand/logo";
import { MORE, NAV } from "@/lib/nav";

const SOCIAL = [
  {
    label: "فيسبوك",
    path: "M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v9h4v-9h3l1-4h-4V9c0-.6.4-1 1-1z",
  },
  {
    label: "يوتيوب",
    path: "M22 8.2c-.2-1.6-1-2.7-2.6-2.9C16.9 5 12 5 12 5s-4.9 0-7.4.3C3 5.5 2.2 6.6 2 8.2 1.8 9.6 1.8 12 1.8 12s0 2.4.2 3.8c.2 1.6 1 2.7 2.6 2.9 2.5.3 7.4.3 7.4.3s4.9 0 7.4-.3c1.6-.2 2.4-1.3 2.6-2.9.2-1.4.2-3.8.2-3.8s0-2.4-.2-3.8zM10 15V9l5.2 3z",
  },
  {
    label: "تيليغرام",
    path: "M21.5 3.5L2.8 10.7c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.5.2 1.8-.8l3.2-15.1c.3-1.3-.5-1.9-1.8-1.1zM8.9 13.4l9.3-5.9c.4-.3.9-.1.5.2l-7.9 7.2-.3 3.3z",
  },
];

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-ink text-white/75">
      <div className="bg-pattern absolute inset-0 opacity-[.07]" />
      <div className="h-1.5 bg-gradient-to-l from-green-dark via-gold-dark to-maroon" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-2 md:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-3">
            <Emblem className="size-14" />
            <div>
              <p className="font-display text-xl font-bold text-white">المنصة الوطنية للحج</p>
              <p className="text-sm text-gold">إدارة الحج والعمرة السورية</p>
            </div>
          </div>
          <p className="mt-5 max-w-sm leading-8">
            منصة واحدة لرحلة الحاج كاملة: من إنشاء الحساب والتسجيل والقرعة، إلى السكن والرحلات والمشاعر، حتى العودة إلى الوطن بسلام.
          </p>
          <div className="mt-6 flex gap-2">
            {SOCIAL.map((s) => (
              <a key={s.label} href="#" aria-label={s.label} className="grid size-10 place-items-center rounded-xl bg-white/5 text-gold transition hover:-translate-y-0.5 hover:bg-gold hover:text-ink">
                <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-5 font-display text-lg font-bold text-white">البوابة العامة</h3>
          <ul className="space-y-3">
            {NAV.slice(1).map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="transition hover:text-gold">{n.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-5 font-display text-lg font-bold text-white">خدمات الحاج</h3>
          <ul className="space-y-3">
            <li><Link href="/register" className="transition hover:text-gold">إنشاء حساب حاج</Link></li>
            <li><Link href="/portal/apply" className="transition hover:text-gold">تقديم طلب حج</Link></li>
            <li><Link href="/portal/application" className="transition hover:text-gold">متابعة الطلب</Link></li>
            {MORE.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="inline-flex items-center gap-2 transition hover:text-gold">
                  {m.label}
                  {m.soon && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold">قريباً</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-5 font-display text-lg font-bold text-white">تواصل معنا</h3>
          <ul className="space-y-4">
            <li className="flex gap-3"><MapPin className="size-5 shrink-0 text-gold" /> دمشق — المزة، أوتوستراد المزة، بناء الإدارة (عنوان وهمي)</li>
            <li className="flex gap-3"><Phone className="size-5 shrink-0 text-gold" /> <span dir="ltr">+963 11 000 1448</span></li>
            <li className="flex gap-3"><Mail className="size-5 shrink-0 text-gold" /> info@hajj-demo.sy</li>
          </ul>
          <p className="mt-5 rounded-2xl border border-gold/20 bg-white/5 p-3 text-xs leading-6">
            أوقات الدوام: الأحد – الخميس، 8:30 صباحاً – 3:30 عصراً
          </p>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-white/50 md:flex-row md:px-8">
          <p>© موسم 1448هـ — منصة تجريبية للعرض فقط. لا تمثل أي جهة رسمية ولا تجمع أي بيانات حقيقية.</p>
          <p>الصور ومقاطع الفيديو من Wikimedia Commons بتراخيص مفتوحة</p>
        </div>
      </div>
    </footer>
  );
}
