import type { MetadataRoute } from "next";
import { asset } from "@/lib/utils";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: asset("/"),
    name: "المنصة الوطنية للحج — نسخة تجريبية",
    short_name: "منصة الحج",
    description: "رحلة الحاج كاملة في تطبيق واحد: الأكاديمية، مواقيت الصلاة، التقديم، المتابعة، والرحلة. جميع البيانات وهمية.",
    lang: "ar",
    dir: "rtl",
    start_url: asset("/?source=pwa"),
    scope: asset("/"),
    display: "standalone",
    orientation: "portrait",
    background_color: "#00594F",
    theme_color: "#00594F",
    categories: ["travel", "education", "lifestyle"],
    icons: [
      { src: asset("/icons/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: asset("/icons/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: asset("/icons/maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "طلبي", short_name: "طلبي", url: asset("/portal/application"), icons: [{ src: asset("/icons/icon-192.png"), sizes: "192x192" }] },
      { name: "حالتي الآن", short_name: "حالتي", url: asset("/portal/season"), icons: [{ src: asset("/icons/icon-192.png"), sizes: "192x192" }] },
      { name: "مواقيت الصلاة", short_name: "المواقيت", url: asset("/prayer-times"), icons: [{ src: asset("/icons/icon-192.png"), sizes: "192x192" }] },
      { name: "الأكاديمية", short_name: "الأكاديمية", url: asset("/academy"), icons: [{ src: asset("/icons/icon-192.png"), sizes: "192x192" }] },
    ],
  };
}
