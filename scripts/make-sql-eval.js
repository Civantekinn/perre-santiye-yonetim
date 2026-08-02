const fs = require("fs");
const path = require("path");

const sql = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "migrations", "018_sirket_risk_duzeltmeleri.sql"),
  "utf8"
);
const mid = Math.floor(sql.length / 2);
let cut = sql.lastIndexOf("\n-- =", mid);
if (cut < 0) cut = mid;
const parts = [sql.slice(0, cut), sql.slice(cut)];

parts.forEach((p, i) => {
  const letter = i === 0 ? "a" : "b";
  const expr =
    "(()=>{ const sql=" +
    JSON.stringify(p) +
    "; const eds=window.monaco?.editor?.getEditors?.()||[]; if(!eds.length) return 'no-editor'; eds[eds.length-1].setValue(sql); return 'ok:'+sql.length; })()";
  const out = path.join(process.env.TEMP || ".", `perre018${letter}_expr.txt`);
  fs.writeFileSync(out, expr, "utf8");
  console.log(letter, p.length, expr.length, out);
});
