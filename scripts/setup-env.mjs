#!/usr/bin/env node
/**
 * Copy .env.example → .env (repo root) and apps/api/.env if missing.
 * Normalize legacy PORT=4001 → PORT=3333 in existing env files.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pairs = [
  [join(root, ".env.example"), join(root, ".env")],
  [join(root, ".env.example"), join(root, "apps", "api", ".env")],
];

function normalizePort(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  if (!/^PORT=4001\s*$/m.test(content) && !content.includes("PORT=4001")) return;
  const next = content.replace(/^PORT=4001\b/gm, "PORT=3333");
  if (next !== content) {
    writeFileSync(filePath, next);
    console.log(`updated PORT=3333 in ${filePath}`);
  }
}

for (const [src, dest] of pairs) {
  if (!existsSync(src)) {
    console.warn(`skip: ${src} not found`);
    continue;
  }
  if (existsSync(dest)) {
    console.log(`exists: ${dest}`);
    normalizePort(dest);
    continue;
  }
  copyFileSync(src, dest);
  console.log(`created: ${dest}`);
}

console.log("\nEdit apps/api/.env — set DATABASE_URL, JWT_SECRET, and ANTHROPIC_API_KEY.");
console.log("API dev port is 3333 (set in package.json dev script). Web: http://localhost:2222");
