/**
 * migrations/*.sql dosyalarını sırayla birleştirip KURULUM_HEPSI.sql üretir.
 * Kullanım: npm run kurulum:rebuild
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const migDir = path.join(root, "supabase", "migrations");
const outFile = path.join(root, "supabase", "KURULUM_HEPSI.sql");

const files = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

const parts = [
  "-- Perre Şantiye Yönetim — TEK SEFERDE KURULUM",
  "-- Bu dosya scripts/rebuild-kurulum.js ile üretilir. Elle düzenlemeyin.",
  `-- Üretim: ${new Date().toISOString()}`,
  `-- Migration sayısı: ${files.length}`,
  "",
];

for (const f of files) {
  const body = fs.readFileSync(path.join(migDir, f), "utf8").replace(/^\uFEFF/, "");
  parts.push(`-- SECTION: supabase/migrations/${f}`);
  parts.push("-- ------------------------------------------------------------");
  parts.push(body.trimEnd());
  parts.push("");
}

fs.writeFileSync(outFile, parts.join("\n"), "utf8");
console.log(`KURULUM_HEPSI.sql güncellendi (${files.length} migration)`);
files.forEach((f) => console.log(" -", f));
