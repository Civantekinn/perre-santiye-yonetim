const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const raw = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

(async () => {
  for (const t of [
    "santiyeler",
    "personeller",
    "malzemeler",
    "gelir_gider",
    "puantaj",
    "ofis_personeller",
    "depo_malzemeler",
    "kullanici_santiye",
    "audit_log",
    "oturum_log",
    "yedekleme_durumu",
    "profiller",
  ]) {
    const { count, error } = await s.from(t).select("*", { count: "exact", head: true });
    console.log(t, error ? error.message : count);
  }
  const { data } = await s.from("profiller").select("email,rol,ad_soyad");
  console.log("profiles", JSON.stringify(data, null, 2));
  const { data: u } = await s.auth.admin.listUsers({ perPage: 50 });
  console.log(
    "auth",
    (u.users || []).map((x) => x.email)
  );
})();
