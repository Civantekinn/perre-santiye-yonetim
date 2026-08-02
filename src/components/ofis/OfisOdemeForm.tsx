"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { OfisOdeme, OfisPersonel, Rol } from "@/lib/types";
import { bugunISO, paraFormat, tarihFormat } from "@/lib/client-utils";
import { varsayilanOnay } from "@/lib/onay";

export function OfisOdemeForm({
  odemeler,
  personeller,
  rol,
  kullaniciId,
}: {
  odemeler: OfisOdeme[];
  personeller: OfisPersonel[];
  rol: Rol;
  kullaniciId: string;
}) {
  const router = useRouter();
  const yazabilir = rol === "admin" || rol === "ofis_admin" || rol === "ofis_personeli";
  const [personelId, setPersonelId] = useState(personeller[0]?.id ?? "");
  const [tutar, setTutar] = useState("");
  const [bas, setBas] = useState("");
  const [bit, setBit] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [mesaj, setMesaj] = useState("");

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from("ofis_odemeler").insert({
      ofis_personel_id: personelId || null,
      tutar: Number(tutar),
      donem_baslangic: bas || null,
      donem_bitis: bit || null,
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
    setMesaj("Ödeme kaydı eklendi");
    router.refresh();
  }

  async function odendi(id: string) {
    const supabase = createClient();
    await supabase
      .from("ofis_odemeler")
      .update({ odendi_mi: true, odeme_tarihi: bugunISO() })
      .eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {yazabilir && (
        <form onSubmit={kaydet} className="kart grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <select className="input" value={personelId} onChange={(e) => setPersonelId(e.target.value)}>
            <option value="">Personel seçin</option>
            {personeller.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ad_soyad}
              </option>
            ))}
          </select>
          <input className="input" type="number" placeholder="Tutar" value={tutar} onChange={(e) => setTutar(e.target.value)} required />
          <input className="input" type="date" value={bas} onChange={(e) => setBas(e.target.value)} />
          <input className="input" type="date" value={bit} onChange={(e) => setBit(e.target.value)} />
          <input className="input" placeholder="Açıklama" value={aciklama} onChange={(e) => setAciklama(e.target.value)} />
          <button type="submit" className="btn-primary">Ödeme Kaydet</button>
        </form>
      )}
      {mesaj && <p className="text-sm text-perre-800">{mesaj}</p>}
      <div className="kart overflow-hidden">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-perre-50 text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Personel</th>
              <th className="px-4 py-3">Tutar</th>
              <th className="px-4 py-3">Dönem</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {odemeler.map((o) => (
              <tr key={o.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">{o.ofis_personeller?.ad_soyad ?? "—"}</td>
                <td className="px-4 py-3 font-medium">{paraFormat(Number(o.tutar))}</td>
                <td className="px-4 py-3 text-xs">
                  {tarihFormat(o.donem_baslangic)} – {tarihFormat(o.donem_bitis)}
                </td>
                <td className="px-4 py-3">{o.odendi_mi ? "Ödendi" : "Bekliyor"}</td>
                <td className="px-4 py-3">
                  {yazabilir && !o.odendi_mi ? (
                    <button type="button" className="btn-secondary text-xs" onClick={() => odendi(o.id)}>
                      Ödendi işaretle
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {odemeler.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                  Ofis ödeme kaydı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
