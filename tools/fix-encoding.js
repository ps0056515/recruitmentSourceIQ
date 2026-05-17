const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const SKIP = /node_modules|[\/\\]\.git[\/\\]|[\/\\]dist[\/\\]|package-lock|\.vite[\/\\]|\.prisma[\/\\]client/;
const EXTENSIONS = new Set([".ts",".tsx",".js",".jsx",".json",".css",".html",".prisma",".py",".yml",".yaml",".md",".mjs",".cjs",".ps1"]);
function shouldProcess(filePath, name) {
  if (SKIP.test(filePath)) return false;
  const ext = path.extname(name).toLowerCase();
  if (EXTENSIONS.has(ext)) return true;
  return name === ".env" || name.startsWith(".env");
}
function detect(buf) {
  if (buf.length < 2) return null;
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return "utf8-bom";
  if (buf[0] === 0xff && buf[1] === 0xfe) return "utf16le-bom";
  if (buf[0] === 0xfe && buf[1] === 0xff) return "utf16be-bom";
  let nulls = 0;
  const sample = Math.min(120, buf.length);
  for (let i = 0; i < sample; i++) if (buf[i] === 0) nulls++;
  if (nulls > 15) {
    if (buf[0] === 0 && buf[1] >= 32 && buf[1] < 127) return "utf16be";
    if (buf[1] === 0 && buf[0] >= 32 && buf[0] < 127) return "utf16le";
  }
  return null;
}
function decodeUtf16Be(buf) {
  let out = "";
  for (let i = 0; i + 1 < buf.length; i += 2) out += String.fromCharCode(buf.readUInt16BE(i));
  return out;
}
function decode(buf, kind) {
  switch (kind) {
    case "utf8-bom": return buf.slice(3).toString("utf8");
    case "utf16le-bom": return buf.slice(2).toString("utf16le");
    case "utf16le": return buf.toString("utf16le");
    case "utf16be-bom": return decodeUtf16Be(buf.slice(2));
    case "utf16be": return decodeUtf16Be(buf);
    default: return buf.toString("utf8");
  }
}
function walk(dir, fixed) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP.test(p + path.sep)) walk(p, fixed);
    } else if (shouldProcess(p, ent.name)) {
      const buf = fs.readFileSync(p);
      const kind = detect(buf);
      if (!kind) continue;
      fs.writeFileSync(p, decode(buf, kind), "utf8");
      fixed.push({ path: p, kind });
    }
  }
}
const fixed = [];
walk(ROOT, fixed);
if (fixed.length === 0) console.log("No encoding issues found.");
else {
  console.log("Fixed " + fixed.length + " file(s):");
  fixed.forEach((f) => console.log("  " + f.kind + "  " + path.relative(ROOT, f.path)));
}