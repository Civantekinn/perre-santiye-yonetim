import { requireRol, tarihFormat } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { YedeklemeDurumu } from "@/lib/types";
import { Database, Cloud, HardDrive } from "lucide-react";
import { YedekAksiyonlar } from "@/components/admin/YedekAksiyonlar";
import { firebaseYapilandirilmis } from "@/lib/firebase-admin";

const GRUP_ETIKET: Record<string, string> = {
  sistem: "Sistem (hesap, oturum, audit)",
  ofis: "Ofis",
  santiye: "Şantiye",
  depo: "Depo",
};

export default async function AdminYedeklemePage() {
  await requireRol(["admin"]);
  const supabase = createClient();
  const { data } = await supabase
    .from("yedekleme_durumu")
    .select("*")
    .order("veri_grubu")
    .order("katman");

  const liste = (data ?? []) as YedeklemeDurumu[];
  const gruplar = ["sistem", "ofis", "santiye", "depo"] as const;
  const firebaseHazir = firebaseYapilandirilmis();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Gruplu Yedekleme</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Bilgisayar (Excel) + Firebase (bulut) — Sistem / Ofis / Şantiye / Depo
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="kart p-5">
          <div className="flex items-center gap-2 text-perre-700">
            <Database className="h-5 w-5" />
            <h2 className="font-display font-semibold">Katman 1 — Supabase</h2>
          </div>
          <p className="mt-2 text-lg font-semibold text-emerald-700">Aktif</p>
        </div>
        <div className="kart p-5">
          <div className="flex items-center gap-2 text-perre-700">
            <Cloud className="h-5 w-5" />
            <h2 className="font-display font-semibold">Katman 2 — Firebase</h2>
          </div>
          <p
            className={`mt-2 text-lg font-semibold ${
              firebaseHazir ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {firebaseHazir ? "Hazır" : "Anahtar bekleniyor"}
          </p>
        </div>
        <div className="kart p-5">
          <div className="flex items-center gap-2 text-perre-700">
            <HardDrive className="h-5 w-5" />
            <h2 className="font-display font-semibold">Katman 3 — Yerel</h2>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">Excel · npm run yedek</p>
        </div>
      </div>

      <YedekAksiyonlar firebaseHazir={firebaseHazir} />

      {gruplar.map((g) => {
        const rows = liste.filter((y) => y.veri_grubu === g);
        return (
          <section key={g} className="kart overflow-hidden">
            <div className="border-b border-[var(--line)] bg-perre-50 px-5 py-3 font-display font-semibold">
              {GRUP_ETIKET[g]}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3">Yedek katmanı</th>
                    <th className="px-4 py-3">Tablo</th>
                    <th className="px-4 py-3">Kayıt</th>
                    <th className="px-4 py-3">Son senkron</th>
                    <th className="px-4 py-3">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((y) => (
                    <tr key={y.id} className="border-t border-[var(--line)]">
                      <td className="px-4 py-3 capitalize">{y.katman}</td>
                      <td className="px-4 py-3">{y.tablo_adi ?? "—"}</td>
                      <td className="px-4 py-3">{y.kayit_sayisi}</td>
                      <td className="px-4 py-3">
                        {y.son_senkron ? tarihFormat(y.son_senkron) : "—"}
                      </td>
                      <td className="px-4 py-3">{y.durum}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-[var(--muted)]">
                        Bu grup için yedek satırı yok (SQL migrate sonrası oluşur).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
