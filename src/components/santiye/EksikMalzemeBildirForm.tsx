"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { bugunISO } from "@/lib/client-utils";

const TURLER = [
  "İnşaat",
  "Elektrik",
  "Tesisat",
  "Demir",
  "Ahşap",
  "Boya",
  "Sarf",
  "Diğer",
];

export function EksikMalzemeBildirForm({
  santiyeId,
  kullaniciId,
}: {
  santiyeId: string;
  kullaniciId: string;
}) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [ad, setAd] = useState("");
  const [tur, setTur] = useState("İnşaat");
  const [miktar, setMiktar] = useState("1");
  const [aciklama, setAciklama] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setYukleniyor(true);
    setMesaj("");
    const supabase = createClient();
    try {
      const { data: mevcut } = await supabase
        .from("malzemeler")
        .select("id")
        .eq("santiye_id", santiyeId)
        .ilike("ad", ad.trim())
        .eq("tur", tur)
        .maybeSingle();

      let malzemeId = mevcut?.id as string | undefined;
      if (!malzemeId) {
        const { data, error } = await supabase
          .from("malzemeler")
          .insert({
            ad: ad.trim(),
            tur,
            birim: "adet",
            santiye_id: santiyeId,
          })
          .select("id")
          .single();
        if (error || !data) throw new Error(error?.message ?? "Malzeme eklenemedi");
        malzemeId = data.id;
      }

      const { error } = await supabase.from("malzeme_hareket").insert({
        malzeme_id: malzemeId,
        tip: "eksik",
        miktar: Number(miktar || 1),
        tarih: bugunISO(),
        aciklama: aciklama || null,
        durum: "bekliyor",
        kaydeden_kullanici_id: kullaniciId,
      });
      if (error) throw new Error(error.message);

      setAd("");
      setMiktar("1");
      setAciklama("");
      setAcik(false);
      setMesaj("Eksik malzeme bildirildi");
      router.refresh();
    } catch (err) {
      setMesaj(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="btn-danger"
        onClick={() => setAcik((v) => !v)}
      >
        {acik ? "Formu Kapat" : "+ Eksik Malzeme"}
      </button>
      {mesaj && (
        <p className="rounded-xl bg-perre-50 px-3 py-2 text-sm text-perre-800">
          {mesaj}
        </p>
      )}
      {acik && (
        <form
          onSubmit={gonder}
          className="kart grid gap-3 border-2 border-red-300 bg-red-50/50 p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label className="label">Malzeme Adı</label>
            <input
              className="input"
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Tür</label>
            <select
              className="input"
              value={tur}
              onChange={(e) => setTur(e.target.value)}
            >
              {TURLER.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Adet</label>
            <input
              className="input"
              type="number"
              step="any"
              value={miktar}
              onChange={(e) => setMiktar(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Açıklama</label>
            <input
              className="input"
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={yukleniyor} className="btn-danger">
              {yukleniyor ? "Kaydediliyor…" : "Eksik Malzeme Bildir"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
