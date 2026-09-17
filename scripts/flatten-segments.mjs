/**
 * Static export post-step (GitHub Pages).
 * Next writes some prefetch segment payloads as nested folders, e.g. `academy/__next.academy/__PAGE__.txt`,
 * while the client router requests the flat name `academy/__next.academy.__PAGE__.txt`.
 * Static hosts can't rewrite, so we add the flat copies. Existing files are never overwritten.
 */
import fs from "node:fs";
import path from "node:path";

const out = path.resolve(process.argv[2] ?? "out");
let created = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("__next.")) flatten(full, dir, entry.name);
    else walk(full);
  }
}

/** Copies every file below `segDir` to `<parent>/<segName>.<relative path joined by dots>` */
function flatten(segDir, parent, segName) {
  const stack = [[segDir, segName]];
  while (stack.length) {
    const [dir, prefix] = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const name = `${prefix}.${entry.name}`;
      if (entry.isDirectory()) stack.push([full, name]);
      else {
        const target = path.join(parent, name);
        if (!fs.existsSync(target)) {
          fs.copyFileSync(full, target);
          created++;
        }
      }
    }
  }
}

walk(out);
console.log(`flatten-segments: ${created} segment files added in ${path.relative(process.cwd(), out) || "."}`);
