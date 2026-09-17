/**
 * Static-export image loader (GitHub Pages): no optimisation server, so serve the original file
 * under the site's base path. The width is kept as a query string only to satisfy Next's loader contract.
 */
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) return src;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${src}?w=${width}`;
}
