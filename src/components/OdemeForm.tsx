"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profil } from "@/lib/types";

export function OdemeForm({ kullanicilar }: { kullanicilar: Profil[] }) {
  const router = useRouter();
  const [kullaniciId, setKullaniciId] = useState(kullanicilar[0]?.id ?? "");
  const [tutar, setTutar] = useState("");
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [mesaj, setMesaj] = useState("");

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from("odemeler").insert({
      kullanici_id: kullaniciId,
      tutar: Number(tutar),
      donem_baslangic: baslangic || null,
      donem_bitis: bitis || null,
      aciklama: aciklama || null,
      odendi_mi: false,
    });
    if (error) {
      setMesaj("Kayıt başarısız: " + error.message);
      return;
    }
    setMesaj("Ödeme eklendi");
    setTutar("");
    setAciklama("");
    router.refresh();
  }

  return (
    <form onSubmit={kaydet} className="kart space-y-4 p-5">
      <h2 className="font-display font-semibold">Ödeme Ekle</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label">Kullanıcı</label>
          <select
            className="input"
            value={kullaniciId}
            onChange={(e) => setKullaniciId(e.target.value)}
            required
          >
            {kullanicilar.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ad_soyad}
              </option>
            ))}
          </select>
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
          <label className="label">Dönem Başlangıç</label>
          <input
            className="input"
            type="date"
            value={baslangic}
            onChange={(e) => setBaslangic(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Dönem Bitiş</label>
          <input
            className="input"
            type="date"
            value={bitis}
            onChange={(e) => setBitis(e.target.value)}
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
      {mesaj && <p className="text-sm text-perre-700">{mesaj}</p>}
      <button type="submit" className="btn-primary">
        Kaydet
      </button>
    </form>
  );
}
