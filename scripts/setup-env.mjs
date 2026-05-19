#!/usr/bin/env node
/**
 * Copy .env.example → .env (repo root) and apps/api/.env if missing.
 */
import { copyFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pairs = [
  [join(root, ".env.example"), join(root, ".env")],
  [join(root, ".env.example"), join(root, "apps", "api", ".env")],
];

for (const [src, dest] of pairs) {
  if (!existsSync(src)) {
    console.warn(`skip: ${src} not found`);
    continue;
  }
  if (existsSync(dest)) {
    console.log(`exists: ${dest}`);
    continue;
  }
  copyFileSync(src, dest);
  console.log(`created: ${dest}`);
}

console.log("\nEdit apps/api/.env — set DATABASE_URL, JWT_SECRET, and ANTHROPIC_API_KEY.");
