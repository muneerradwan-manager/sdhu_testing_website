// Lets `node --test` run the project's TypeScript as it is: resolves the "@/" alias and extensionless
// imports to the .ts/.tsx file, as the bundler does. Node strips the types itself.
import { existsSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");

registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.includes("/node_modules/")) return next(specifier, context);
    // Next's subpath entries («next/navigation», «next/link») are files without an exports map: the bundler adds ".js"
    if (/^next\/[a-z-]+$/.test(specifier)) return next(`${specifier}.js`, context);
    let spec = specifier;
    if (spec.startsWith("@/")) spec = pathToFileURL(resolvePath(root, spec.slice(2))).href;
    if ((spec.startsWith(".") || spec.startsWith("file:")) && context.parentURL) {
      const base = spec.startsWith("file:") ? fileURLToPath(spec) : resolvePath(dirname(fileURLToPath(context.parentURL)), spec);
      for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
        if (existsSync(cand) && statSync(cand).isFile()) return next(pathToFileURL(cand).href, context);
      }
    }
    return next(spec, context);
  },
});
