"use client";

/**
 * خطّافات جاهزة للعناصر التي تظهر في كل الصفحات (الهوية، القوائم، التذييل).
 *
 * أثناء التوليد على الخادم وأول عرض في المتصفح يعيد المخزن الحالة الابتدائية،
 * أي القيم الافتراضية من الوصف — وهي نفسها المحتوى الأصلي — فلا يحدث اختلاف في الترطيب
 * ولا ومضة قبل ظهور المحتوى المعدَّل.
 */

import { useSection } from "./store";

export type NavItem = { href: string; label: string };
export type MoreItem = NavItem & { note: string; soon?: boolean };
export type SocialItem = { label: string; href: string; network: string };
export type FooterLink = { label: string; href: string };

/** فرع من دليل الفروع، كما يدخله الموظف في «من نحن ← دليل الفروع» */
export type Branch = {
  slug: string;
  name: string;
  city: string;
  address: string;
  hours: string;
  phone: string;
  lat: number;
  lng: number;
  head?: boolean;
};

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const text = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

export function useSiteIdentity() {
  const v = useSection("global", "identity");
  return {
    name: text(v.name, "المنصة الوطنية للحج"),
    authority: text(v.authority, "إدارة الحج والعمرة السورية"),
    season: text(v.season, "موسم 1448هـ"),
  };
}

export function useNav() {
  const v = useSection("global", "nav");
  return {
    nav: arr<NavItem>(v.items).filter((i) => i.href),
    more: arr<MoreItem>(v.more).filter((i) => i.href),
  };
}

export function useFooter() {
  const v = useSection("global", "footer");
  return {
    about: text(v.about),
    col1Title: text(v.col1Title, "البوابة العامة"),
    col2Title: text(v.col2Title, "خدمات الحاج"),
    col2: arr<FooterLink>(v.col2).filter((i) => i.href),
    contactTitle: text(v.contactTitle, "تواصل معنا"),
    address: text(v.address),
    phone: text(v.phone),
    email: text(v.email),
    hours: text(v.hours),
    social: arr<SocialItem>(v.social).filter((s) => s.network),
    legal: text(v.legal),
    credits: text(v.credits),
  };
}

/** مسارات أيقونات الشبكات الاجتماعية — يختار الموظف الشبكة، لا المسار */
export const SOCIAL_PATHS: Record<string, string> = {
  facebook: "M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v9h4v-9h3l1-4h-4V9c0-.6.4-1 1-1z",
  youtube:
    "M22 8.2c-.2-1.6-1-2.7-2.6-2.9C16.9 5 12 5 12 5s-4.9 0-7.4.3C3 5.5 2.2 6.6 2 8.2 1.8 9.6 1.8 12 1.8 12s0 2.4.2 3.8c.2 1.6 1 2.7 2.6 2.9 2.5.3 7.4.3 7.4.3s4.9 0 7.4-.3c1.6-.2 2.4-1.3 2.6-2.9.2-1.4.2-3.8.2-3.8s0-2.4-.2-3.8zM10 15V9l5.2 3z",
  telegram:
    "M21.5 3.5L2.8 10.7c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.5.2 1.8-.8l3.2-15.1c.3-1.3-.5-1.9-1.8-1.1zM8.9 13.4l9.3-5.9c.4-.3.9-.1.5.2l-7.9 7.2-.3 3.3z",
  x: "M18.9 2H22l-7 8 8.2 12h-6.4l-5-7.3L5.9 22H2.8l7.5-8.6L2.4 2h6.6l4.5 6.7zM17.8 20.1h1.7L8.3 3.8H6.5z",
  whatsapp:
    "M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20zm4.4-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 01-3.2-2.8c-.1-.2 0-.4.1-.5l.4-.5.2-.4v-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.2.7 3 .6.5 0 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.4-.3z",
};
