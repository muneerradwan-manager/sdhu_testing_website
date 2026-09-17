import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "المنصة الوطنية للحج — نسخة تجريبية",
    short_name: "منصة الحج",
    description: "رحلة الحاج كاملة في تطبيق واحد: الأكاديمية، مواقيت الصلاة، التقديم، المتابعة، والرحلة. جميع البيانات وهمية.",
    lang: "ar",
    dir: "rtl",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#00594F",
    theme_color: "#00594F",
    categories: ["travel", "education", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "طلبي", short_name: "طلبي", url: "/portal/application", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "حالتي الآن", short_name: "حالتي", url: "/portal/season", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "مواقيت الصلاة", short_name: "المواقيت", url: "/prayer-times", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "الأكاديمية", short_name: "الأكاديمية", url: "/academy", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
