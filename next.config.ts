import type { NextConfig } from "next";

/**
 * Two targets:
 * - default (`npm run dev` / `npm start`): full Next.js server, including the /api/tts voice route.
 * - GitHub Pages (`GITHUB_PAGES=true npm run build`): static export under /sdhu_testing_website.
 *   The deploy workflow removes app/api first, because a static site has no server.
 */
const pages = process.env.GITHUB_PAGES === "true";
const basePath = pages ? "/sdhu_testing_website" : "";

const nextConfig: NextConfig = pages
  ? {
      output: "export",
      basePath,
      trailingSlash: true,
      env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_STATIC_EXPORT: "true" },
      images: { loader: "custom", loaderFile: "./lib/image-loader.ts", qualities: [70, 85] },
    }
  : {
      // Opening the dev server from another device on the local network (e.g. the TV used for demos)
      allowedDevOrigins: ["10.2.0.2", "10.*.*.*", "192.168.*.*", "172.16.*.*"],
      env: { NEXT_PUBLIC_BASE_PATH: "", NEXT_PUBLIC_STATIC_EXPORT: "false" },
      images: { qualities: [70, 85] },
      serverExternalPackages: ["msedge-tts"],
      async headers() {
        return [
          {
            source: "/(.*)",
            headers: [
              { key: "X-Content-Type-Options", value: "nosniff" },
              { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            ],
          },
          {
            source: "/sw.js",
            headers: [
              { key: "Content-Type", value: "application/javascript; charset=utf-8" },
              { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
            ],
          },
        ];
      },
    };

export default nextConfig;
