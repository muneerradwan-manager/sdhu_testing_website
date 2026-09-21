import type { Metadata, Viewport } from "next";
import { Amiri } from "next/font/google";
import localFont from "next/font/local";
import { GuidedTour } from "@/components/app/tour";
import { PwaSupport } from "@/components/app/pwa";
import { Splash } from "@/components/app/splash";
import { PreviewBar } from "@/components/cms/bits";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { ToastProvider } from "@/components/ui/widgets";
import { asset } from "@/lib/utils";
import "./globals.css";

/** itf Qomra — the platform's brand typeface (same as the mobile app) */
const qomra = localFont({
  variable: "--font-qomra",
  display: "swap",
  src: [
    { path: "./fonts/itfQomraArabic-Light.otf", weight: "300", style: "normal" },
    { path: "./fonts/itfQomraArabic-Regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/itfQomraArabic-Bold.otf", weight: "700", style: "normal" },
  ],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "المنصة الوطنية للحج — إدارة الحج والعمرة السورية (تجريبية)",
    template: "%s | المنصة الوطنية للحج",
  },
  description: "منصة تجريبية تعرض رحلة الحاج السوري كاملة: الأكاديمية، مواقيت الصلاة، الأخبار، التسجيل والقرعة ومتابعة الطلب. جميع البيانات وهمية.",
  applicationName: "منصة الحج",
  icons: {
    icon: [{ url: asset("/icons/icon-192.png"), sizes: "192x192", type: "image/png" }],
    apple: [{ url: asset("/icons/apple-touch-icon.png"), sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "منصة الحج", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#00594F",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" className={`${qomra.variable} ${amiri.variable} antialiased`}>
      <body className="flex min-h-[calc(100dvh/var(--zoom))] flex-col">
        <Splash />
        <ToastProvider>
          <Header />
          {/* Clip stray horizontal overflow (slide-in animations etc.) so phones never get a sideways scroll */}
          <main className="flex-1 overflow-x-clip">{children}</main>
          <Footer />
          <GuidedTour />
          <PwaSupport />
          <PreviewBar />
        </ToastProvider>
      </body>
    </html>
  );
}
