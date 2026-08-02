"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GelirGider, Rol, ToplamMaliyet } from "@/lib/types";
import { bugunISO, paraFormat, tarihFormat } from "@/lib/client-utils";
import { ONAY_ETIKET, varsayilanOnay } from "@/lib/onay";
import { MaliyetGrafik } from "@/components/MaliyetGrafik";

export function GelirGiderSekmesi({
  santiyeId,
  kayitlar,
  maliyet,
  rol,
  kullaniciId,
}: {
  santiyeId: string;
  kayitlar: GelirGider[];
  maliyet: ToplamMaliyet | null;
  rol: Rol;
  kullaniciId?: string;
}) {
  const router = useRouter();
  const [tip, setTip] = useState<"gelir" | "gider">("gider");
  const [kategori, setKategori] = useState("");
  const [tutar, setTutar] = useState("");
  const [tarih, setTarih] = useState(bugunISO());
  const [aciklama, setAciklama] = useState("");
  const [mesaj, setMesaj] = useState("");

  const ekleyebilir =
    rol === "admin" || rol === "santiye_sefi" || rol === "saha_gorevlisi";

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from("gelir_gider").insert({
      santiye_id: santiyeId,
      tip,
      kategori: kategori || null,
      tutar: Number(tutar),
      tarih,
      aciklama: aciklama || null,
      onay_durumu: varsayilanOnay(rol),
      ...(kullaniciId ? { kaydeden_kullanici_id: kullaniciId } : {}),
    });
    if (error) {
      setMesaj("Kayıt başarısız: " + error.message);
      return;
    }
    setMesaj("Kayıt eklendi");
    setTutar("");
    setKategori("");
    setAciklama("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {maliyet && (
        <div className="kart p-5">
          <h3 className="font-display font-semibold">Maliyet Özeti</h3>
          <div className="mt-4 h-64">
            <MaliyetGrafik data={[maliyet]} />
          </div>
        </div>
      )}

      {ekleyebilir && (
        <form onSubmit={kaydet} className="kart space-y-4 p-5">
          <h3 className="font-display font-semibold">Gelir / Gider Ekle</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Tip</label>
              <select
                className="input"
                value={tip}
                onChange={(e) => setTip(e.target.value as "gelir" | "gider")}
              >
                <option value="gelir">Gelir</option>
                <option value="gider">Gider</option>
              </select>
            </div>
            <div>
              <label className="label">Kategori</label>
              <input
                className="input"
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                placeholder="Hakediş, Kira, Yemek…"
              />
            </div>
            <div>
              <label className="label">Tutar (₺)</label>
              <input
                className="input"
                type="number"
                value={tutar}
                onChange={(e) => setTutar(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Tarih</label>
              <input
                className="input"
                type="date"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Açıklama</label>
              <input
                className="input"
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">
            Kaydet
          </button>
        </form>
      )}

      {mesaj && <p className="text-sm text-perre-700">{mesaj}</p>}

      <div className="kart overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-perre-50 text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Tip</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">Tutar</th>
                <th className="px-4 py-3 font-medium">Açıklama</th>
                <th className="px-4 py-3 font-medium">Onay</th>
              </tr>
            </thead>
            <tbody>
              {kayitlar.map((k) => (
                <tr key={k.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">{tarihFormat(k.tarih)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        k.tip === "gelir"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {k.tip === "gelir" ? "Gelir" : "Gider"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{k.kategori ?? "—"}</td>
                  <td className="px-4 py-3">{paraFormat(Number(k.tutar))}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {k.aciklama ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {k.onay_durumu ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          k.onay_durumu === "onaylandi"
                            ? "bg-emerald-100 text-emerald-800"
                            : k.onay_durumu === "bekliyor"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {ONAY_ETIKET[k.onay_durumu]}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {kayitlar.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[var(--muted)]"
                  >
                    Kayıt yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
