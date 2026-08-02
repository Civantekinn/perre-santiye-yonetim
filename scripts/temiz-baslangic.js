/**
 * Temiz başlangıç — service role ile tüm operasyonel veriyi siler, admin kalır.
 */
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const p = path.join(__dirname, "..", ".env.local");
  const raw = fs.readFileSync(p, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return env;
}

async function delAll(supabase, table) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  // bazı tablolarda id yok
  if (error) {
    const r2 = await supabase.from(table).delete().gte("created_at", "1970-01-01");
    if (r2.error) {
      // kullanici_santiye gibi
      const r3 = await supabase
        .from(table)
        .delete()
        .not("kullanici_id", "is", null);
      if (r3.error) throw new Error(table + ": " + (error.message || r3.error.message));
      return r3.count ?? 0;
    }
    return r2.count ?? 0;
  }
  return count ?? 0;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const order = [
    "puantaj",
    "malzeme_hareket",
    "isci_maas_odemeleri",
    "gelir_gider",
    "odemeler",
    "malzemeler",
    "personeller",
    "kullanici_santiye",
    "santiyeler",
    "ofis_odemeler",
    "ofis_masraflar",
    "ofis_personeller",
    "depo_hareket",
    "depo_malzemeler",
    "oturum_log",
    "audit_log",
    "yedekleme_durumu",
  ];

  for (const t of order) {
    try {
      // filter that matches all rows
      let q = supabase.from(t).delete({ count: "exact" });
      if (t === "kullanici_santiye") {
        q = q.not("kullanici_id", "is", null);
      } else if (t === "yedekleme_durumu") {
        q = q.gte("updated_at", "1970-01-01");
      } else {
        q = q.gte("created_at", "1970-01-01");
      }
      // fallback for tables without created_at
      let { error, count } = await q;
      if (error) {
        const r = await supabase.from(t).delete({ count: "exact" }).not("id", "is", null);
        error = r.error;
        count = r.count;
      }
      console.log(t, error ? "ERR " + error.message : "ok deleted~" + count);
    } catch (e) {
      console.log(t, "EX", e.message);
    }
  }

  // Non-admin profiller
  const { data: nonAdmins } = await supabase
    .from("profiller")
    .select("id, email, rol")
    .neq("rol", "admin");
  console.log("non-admin profiles", (nonAdmins || []).length);

  for (const p of nonAdmins || []) {
    const { error } = await supabase.auth.admin.deleteUser(p.id);
    console.log("delete user", p.email || p.id, error ? error.message : "ok");
  }

  // Orphan auth users without admin profile
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) {
      console.log("listUsers", error.message);
      break;
    }
    const users = data.users || [];
    if (users.length === 0) break;
    for (const u of users) {
      const { data: prof } = await supabase
        .from("profiller")
        .select("rol")
        .eq("id", u.id)
        .maybeSingle();
      if (!prof || prof.rol !== "admin") {
        const { error: de } = await supabase.auth.admin.deleteUser(u.id);
        console.log("purge auth", u.email, de ? de.message : "ok");
      } else {
        console.log("keep admin", u.email);
      }
    }
    if (users.length < 100) break;
    page++;
  }

  // Re-seed yedekleme
  const rows = [];
  const groups = {
    santiye: [
      "santiyeler",
      "personeller",
      "puantaj",
      "malzemeler",
      "malzeme_hareket",
      "gelir_gider",
      "isci_maas_odemeleri",
    ],
    ofis: ["ofis_personeller", "ofis_masraflar", "ofis_odemeler"],
    depo: ["depo_malzemeler", "depo_hareket"],
    sistem: ["profiller", "audit_log", "oturum_log"],
  };
  for (const katman of ["firebase", "yerel"]) {
    for (const [grup, tablolar] of Object.entries(groups)) {
      for (const tablo of tablolar) {
        rows.push({
          katman,
          tablo_adi: tablo,
          kayit_sayisi: 0,
          durum: "aktif",
          mesaj: "Hazır",
          veri_grubu: grup,
          son_senkron: new Date().toISOString(),
        });
      }
    }
  }
  const { error: ye } = await supabase.from("yedekleme_durumu").insert(rows);
  console.log("yedekleme seed", ye ? ye.message : "ok " + rows.length);

  const { count: adminCount } = await supabase
    .from("profiller")
    .select("id", { count: "exact", head: true })
    .eq("rol", "admin");
  const { count: sCount } = await supabase
    .from("santiyeler")
    .select("id", { count: "exact", head: true });
  const { count: pCount } = await supabase
    .from("personeller")
    .select("id", { count: "exact", head: true });

  console.log("RESULT admins=", adminCount, "santiyeler=", sCount, "personeller=", pCount);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
