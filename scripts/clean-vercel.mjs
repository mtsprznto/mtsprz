// scripts/clean-vercel.mjs
// Limpia .vercel/output antes de `pnpm build`.
// MOTIVO: el hook `astro:build:start` de @astrojs/vercel hace `emptyDir()` ->
// `fs.rm(recursive)` de Node. En Windows NTFS, borrar el arbol pnpm
// (miles de dirs de _render.func) con fs.rm puede colgarse indefinidamente.
// En Windows usamos `cmd /c rmdir /s /q` (builtin nativo, rapido, sin cuelgue).
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import nodePath from "node:path";

const root = nodePath.resolve(nodePath.dirname(fileURLToPath(import.meta.url)), "..");
const target = nodePath.join(root, ".vercel", "output");

if (!existsSync(target)) {
  console.log(`[clean-vercel] no existe: ${target} (ok)`);
  process.exit(0);
}

if (process.platform === "win32") {
  const r = spawnSync("cmd", ["/c", "rmdir", "/s", "/q", target], { encoding: "utf-8" });
  if (r.status === 0) {
    console.log(`[clean-vercel] eliminado: ${target}`);
  } else {
    console.error(`[clean-vercel] fallo rmdir (status ${r.status})`);
    if (r.stderr) console.error(r.stderr);
    process.exit(r.status ?? 1);
  }
} else {
  rmSync(target, { recursive: true, force: true });
  console.log(`[clean-vercel] eliminado: ${target}`);
}
