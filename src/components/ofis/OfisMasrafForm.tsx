"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { OfisMasraf, Rol } from "@/lib/types";
import { bugunISO, paraFormat, tarihFormat } from "@/lib/client-utils";
import { varsayilanOnay } from "@/lib/onay";

export function OfisMasrafForm({
  kayitlar,
  rol,
  kullaniciId,
}: {
  kayitlar: OfisMasraf[];
  rol: Rol;
  kullaniciId: string;
}) {
  const router = useRouter();
  const yazabilir = rol === "admin" || rol === "ofis_admin";
  const [tip, setTip] = useState<"gelir" | "gider">("gider");
  const [kategori, setKategori] = useState("");
  const [tutar, setTutar] = useState("");
  const [tarih, setTarih] = useState(bugunISO());
  const [aciklama, setAciklama] = useState("");
  const [mesaj, setMesaj] = useState("");

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from("ofis_masraflar").insert({
      tip,
      kategori: kategori || null,
      tutar: Number(tutar),
      tarih,
      aciklama: aciklama || null,
      kaydeden_kullanici_id: kullaniciId,
      onay_durumu: varsayilanOnay(rol),
    });
    if (error) {
      setMesaj(error.message);
      return;
    }
    setTutar("");
    setAciklama("");
    setMesaj("Kayıt eklendi");
    router.refresh();
  }

  async function sil(id: string) {
    if (!confirm("Silinsin mi?")) return;
    const supabase = createClient();
    await supabase.from("ofis_masraflar").update({ silindi: true }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {yazabilir && (
        <form onSubmit={kaydet} className="kart grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <select className="input" value={tip} onChange={(e) => setTip(e.target.value as "gelir" | "gider")}>
            <option value="gider">Gider / Masraf</option>
            <option value="gelir">Gelir</option>
          </select>
          <input className="input" placeholder="Kategori" value={kategori} onChange={(e) => setKategori(e.target.value)} />
          <input className="input" type="number" placeholder="Tutar" value={tutar} onChange={(e) => setTutar(e.target.value)} required />
          <input className="input" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} required />
          <input className="input" placeholder="Açıklama" value={aciklama} onChange={(e) => setAciklama(e.target.value)} />
          <button type="submit" className="btn-primary">Kaydet</button>
        </form>
      )}
      {mesaj && <p className="text-sm text-perre-800">{mesaj}</p>}
      <div className="kart overflow-hidden">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-perre-50 text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Tip</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Tutar</th>
              <th className="px-4 py-3">Açıklama</th>
              <th className="px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {kayitlar.map((k) => (
              <tr key={k.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">{tarihFormat(k.tarih)}</td>
                <td className="px-4 py-3">{k.tip === "gelir" ? "Gelir" : "Gider"}</td>
                <td className="px-4 py-3">{k.kategori ?? "—"}</td>
                <td className={`px-4 py-3 font-medium ${k.tip === "gelir" ? "text-emerald-700" : ""}`}>
                  {paraFormat(Number(k.tutar))}
                </td>
                <td className="px-4 py-3">{k.aciklama ?? "—"}</td>
                <td className="px-4 py-3">
                  {yazabilir ? (
                    <button type="button" className="text-xs font-semibold text-red-700" onClick={() => sil(k.id)}>
                      Sil
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {kayitlar.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                  Ofis masraf/gelir kaydı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
