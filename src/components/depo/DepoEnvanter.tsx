"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DepoHareket, DepoMalzeme, Rol } from "@/lib/types";
import { bugunISO, paraFormat, tarihFormat } from "@/lib/client-utils";
import { ONAY_ETIKET, varsayilanOnay } from "@/lib/onay";

export function DepoEnvanter({
  malzemeler,
  hareketler,
  santiyeler,
  rol,
  kullaniciId,
}: {
  malzemeler: DepoMalzeme[];
  hareketler: DepoHareket[];
  santiyeler: { id: string; ad: string }[];
  rol: Rol;
  kullaniciId: string;
}) {
  const router = useRouter();
  const yazabilir = rol === "admin" || rol === "depo_sorumlusu";
  const [ad, setAd] = useState("");
  const [birim, setBirim] = useState("adet");
  const [malzemeId, setMalzemeId] = useState(malzemeler[0]?.id ?? "");
  const [tip, setTip] = useState<"giris" | "cikis" | "sayim" | "fire">("giris");
  const [miktar, setMiktar] = useState("");
  const [fiyat, setFiyat] = useState("");
  const [tarih, setTarih] = useState(bugunISO());
  const [santiyeId, setSantiyeId] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [mesaj, setMesaj] = useState("");

  const stok = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of hareketler) {
      if (h.onay_durumu != null && h.onay_durumu !== "onaylandi") continue;
      const cur = map.get(h.depo_malzeme_id) ?? 0;
      if (h.tip === "giris" || h.tip === "sayim") map.set(h.depo_malzeme_id, cur + Number(h.miktar));
      else map.set(h.depo_malzeme_id, cur - Number(h.miktar));
    }
    return map;
  }, [hareketler]);

  async function malzemeEkle(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("depo_malzemeler")
      .insert({ ad, birim })
      .select()
      .single();
    if (error) {
      setMesaj(error.message);
      return;
    }
    setAd("");
    if (data) setMalzemeId(data.id);
    setMesaj("Depo malzemesi eklendi");
    router.refresh();
  }

  async function hareketKaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!malzemeId) {
      setMesaj("Malzeme seçin");
      return;
    }
    const onay = varsayilanOnay(rol);
    const supabase = createClient();
    const { error } = await supabase.from("depo_hareket").insert({
      depo_malzeme_id: malzemeId,
      tip,
      miktar: Number(miktar),
      birim_fiyat: fiyat ? Number(fiyat) : null,
      tarih,
      aciklama: aciklama || null,
      santiye_id: santiyeId || null,
      kaydeden_kullanici_id: kullaniciId,
      onay_durumu: onay,
    });
    if (error) {
      setMesaj(error.message);
      return;
    }
    setMiktar("");
    setFiyat("");
    setAciklama("");
    if (tip === "cikis" && santiyeId && rol !== "admin") {
      setMesaj("Hareket kaydedildi — şantiye çıkışı onay bekliyor");
    } else {
      setMesaj("Hareket kaydedildi");
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
        Bu panel merkezi depo envanteridir. Şantiye malzemeleri buraya karışmaz.
      </p>
      {mesaj && <p className="text-sm text-perre-800">{mesaj}</p>}

      {yazabilir && (
        <>
          <form onSubmit={malzemeEkle} className="kart flex flex-wrap gap-3 p-4">
            <input className="input max-w-xs" placeholder="Yeni depo malzemesi" value={ad} onChange={(e) => setAd(e.target.value)} required />
            <input className="input max-w-[120px]" placeholder="Birim" value={birim} onChange={(e) => setBirim(e.target.value)} />
            <button type="submit" className="btn-secondary">Malzeme Ekle</button>
          </form>

          <form onSubmit={hareketKaydet} className="kart grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <select className="input" value={malzemeId} onChange={(e) => setMalzemeId(e.target.value)} required>
              <option value="">Malzeme</option>
              {malzemeler.map((m) => (
                <option key={m.id} value={m.id}>{m.ad}</option>
              ))}
            </select>
            <select className="input" value={tip} onChange={(e) => setTip(e.target.value as typeof tip)}>
              <option value="giris">Giriş</option>
              <option value="cikis">Çıkış</option>
              <option value="sayim">Sayım</option>
              <option value="fire">Fire</option>
            </select>
            <input className="input" type="number" placeholder="Miktar" value={miktar} onChange={(e) => setMiktar(e.target.value)} required />
            <input className="input" type="number" placeholder="Birim fiyat" value={fiyat} onChange={(e) => setFiyat(e.target.value)} />
            <input className="input" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} required />
            <select className="input" value={santiyeId} onChange={(e) => setSantiyeId(e.target.value)}>
              <option value="">Şantiye (opsiyonel)</option>
              {santiyeler.map((s) => (
                <option key={s.id} value={s.id}>{s.ad}</option>
              ))}
            </select>
            <input className="input sm:col-span-2" placeholder="Açıklama" value={aciklama} onChange={(e) => setAciklama(e.target.value)} />
            <button type="submit" className="btn-primary">Hareket Kaydet</button>
          </form>
        </>
      )}

      <div className="kart overflow-hidden">
        <div className="border-b border-[var(--line)] px-4 py-3 font-display font-semibold">Stok Özeti</div>
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-perre-50 text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Malzeme</th>
              <th className="px-4 py-3">Birim</th>
              <th className="px-4 py-3">Stok</th>
            </tr>
          </thead>
          <tbody>
            {malzemeler.map((m) => (
              <tr key={m.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3 font-medium">{m.ad}</td>
                <td className="px-4 py-3">{m.birim ?? "—"}</td>
                <td className="px-4 py-3 font-semibold">{stok.get(m.id) ?? 0}</td>
              </tr>
            ))}
            {malzemeler.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[var(--muted)]">Depo malzemesi yok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="kart overflow-hidden">
        <div className="border-b border-[var(--line)] px-4 py-3 font-display font-semibold">Son Hareketler</div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-perre-50 text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Malzeme</th>
              <th className="px-4 py-3">Tip</th>
              <th className="px-4 py-3">Miktar</th>
              <th className="px-4 py-3">Tutar</th>
              <th className="px-4 py-3">Onay</th>
            </tr>
          </thead>
          <tbody>
            {hareketler.slice(0, 50).map((h) => (
              <tr key={h.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">{tarihFormat(h.tarih)}</td>
                <td className="px-4 py-3">{h.depo_malzemeler?.ad ?? "—"}</td>
                <td className="px-4 py-3">{h.tip}</td>
                <td className="px-4 py-3">{h.miktar}</td>
                <td className="px-4 py-3">{paraFormat(Number(h.tutar))}</td>
                <td className="px-4 py-3">
                  {h.onay_durumu ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        h.onay_durumu === "onaylandi"
                          ? "bg-emerald-100 text-emerald-800"
                          : h.onay_durumu === "bekliyor"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {ONAY_ETIKET[h.onay_durumu]}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
