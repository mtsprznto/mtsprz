#!/usr/bin/env node
/**
 * patch-nft-symlink.mjs
 * Parchea @astrojs/internal-helpers/dist/fs.js para usar fs.cp en vez de
 * fs.symlink en Windows. Sin Developer Mode, Windows bloquea symlinks (EPERM).
 *
 * Se ejecuta automáticamente via "postinstall" en package.json.
 * Si el parche ya está aplicado, no hace nada.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "win32") process.exit(0);

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const candidates = [
  // pnpm hoisted structure
  resolve(projectRoot, "node_modules/.pnpm/@astrojs+internal-helpers@0.10.2/node_modules/@astrojs/internal-helpers/dist/fs.js"),
  resolve(projectRoot, "node_modules/.pnpm/@astrojs+internal-helpers@0.10.1/node_modules/@astrojs/internal-helpers/dist/fs.js"),
  // flat/hoisted node_modules
  resolve(projectRoot, "node_modules/@astrojs/internal-helpers/dist/fs.js"),
];

const MARKER = "/* patched: no-symlink-win32 */";

const PATCHED_BLOCK = `    if (isSymlink) {
      if (!existsSync(dest)) {
        if (process.platform === "win32") {
          /* patched: no-symlink-win32 */
          await fs.cp(realpath, fileURLToPath(dest), { recursive: true });
        } else {
          const realdest = fileURLToPath(new URL(nodePath.relative(commonAncestor, realpath), outDir));
          const target = nodePath.relative(fileURLToPath(new URL(".", dest)), realdest);
          await fs.symlink(target, dest, isDir ? "dir" : "file");
        }
      }
    } else if (!isDir) {`;

const ORIGINAL_BLOCK = `    if (isSymlink) {
      const realdest = fileURLToPath(new URL(nodePath.relative(commonAncestor, realpath), outDir));
      const target = nodePath.relative(fileURLToPath(new URL(".", dest)), realdest);
      if (!existsSync(dest)) {
        await fs.symlink(target, dest, isDir ? "dir" : "file");
      }
    } else if (!isDir) {`;

// v0.10.2 variant: existsSymlink wraps the symlink call
const ORIGINAL_BLOCK_V2 = `    if (isSymlink) {
      if (!existsSync(dest)) {
        const realdest = fileURLToPath(new URL(nodePath.relative(commonAncestor, realpath), outDir));
        const target = nodePath.relative(fileURLToPath(new URL(".", dest)), realdest);
        await fs.symlink(target, dest, isDir ? "dir" : "file");
      }
    } else if (!isDir) {`;

let patched = 0;
for (const file of candidates) {
  if (!existsSync(file)) continue;
  const code = readFileSync(file, "utf-8");
  if (code.includes(MARKER)) {
    console.log(`[patch-nft] ya parcheado: ${file}`);
    patched++;
    continue;
  }
  if (code.includes(ORIGINAL_BLOCK)) {
    writeFileSync(file, code.replace(ORIGINAL_BLOCK, PATCHED_BLOCK));
    console.log(`[patch-nft] parcheado: ${file}`);
    patched++;
  } else if (code.includes(ORIGINAL_BLOCK_V2)) {
    writeFileSync(file, code.replace(ORIGINAL_BLOCK_V2, PATCHED_BLOCK));
    console.log(`[patch-nft] parcheado (v0.10.2): ${file}`);
    patched++;
  } else {
    console.log(`[patch-nft] bloque original no encontrado en ${file} (¿versión diferente?)`);
  }
}

if (patched === 0) {
  console.log("[patch-nft] ningún archivo para parchear (¿fuera de Windows?)");
}
