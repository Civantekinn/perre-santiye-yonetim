"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";

export function SantiyeEkleForm({
  kendineAta = false,
}: {
  /** true: oluşturan kullanıcıya otomatik atanır (şantiye portalı) */
  kendineAta?: boolean;
}) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [ad, setAd] = useState("");
  const [adres, setAdres] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    setYukleniyor(true);
    const supabase = createClient();

    if (kendineAta) {
      const { error } = await supabase.rpc("santiye_olustur", {
        p_ad: ad,
        p_adres: adres || null,
        p_kendine_ata: true,
      });
      setYukleniyor(false);
      if (error) {
        setHata("Şantiye eklenemedi: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("santiyeler")
        .insert({ ad, adres: adres || null });
      setYukleniyor(false);
      if (error) {
        setHata("Şantiye eklenemedi: " + error.message);
        return;
      }
    }

    setAd("");
    setAdres("");
    setAcik(false);
    router.refresh();
  }

  if (!acik) {
    return (
      <button type="button" className="btn-primary" onClick={() => setAcik(true)}>
        <Plus className="h-4 w-4" />
        Yeni Şantiye
      </button>
    );
  }

  return (
    <form onSubmit={kaydet} className="kart w-full max-w-md space-y-3 p-4 sm:w-auto">
      <input
        className="input"
        placeholder="Şantiye adı"
        value={ad}
        onChange={(e) => setAd(e.target.value)}
        required
      />
      <input
        className="input"
        placeholder="Adres (isteğe bağlı)"
        value={adres}
        onChange={(e) => setAdres(e.target.value)}
      />
      {hata && <p className="text-sm text-red-600">{hata}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={yukleniyor}>
          {yukleniyor ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setAcik(false)}>
          İptal
        </button>
      </div>
    </form>
  );
}
