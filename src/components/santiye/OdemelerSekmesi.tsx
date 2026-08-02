"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { IsciMaasOdeme, Personel, Rol } from "@/lib/types";
import { bugunISO, paraFormat, tarihFormat } from "@/lib/client-utils";
import { varsayilanOnay } from "@/lib/onay";

export function OdemelerSekmesi({
  santiyeId,
  personeller,
  maaslar,
  kullaniciId,
  rol,
}: {
  santiyeId: string;
  personeller: Personel[];
  maaslar: IsciMaasOdeme[];
  kullaniciId: string;
  rol: Rol;
}) {
  const router = useRouter();
  const [personelId, setPersonelId] = useState(personeller[0]?.id ?? "");
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");
  const [gunSayisi, setGunSayisi] = useState<number | null>(null);
  const [tutar, setTutar] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [mesaj, setMesaj] = useState("");

  const ekleyebilir =
    rol === "admin" || rol === "saha_gorevlisi" || rol === "santiye_sefi";
  const odendiIsaret =
    rol === "admin" || rol === "santiye_sefi" || rol === "saha_gorevlisi";

  async function gunHesapla() {
    if (!personelId || !baslangic || !bitis) return;
    const supabase = createClient();
    const { count } = await supabase
      .from("puantaj")
      .select("id", { count: "exact", head: true })
      .eq("personel_id", personelId)
      .eq("geldi_mi", true)
      .eq("silindi", false)
      .gte("tarih", baslangic)
      .lte("tarih", bitis);
    setGunSayisi(count ?? 0);
    const p = personeller.find((x) => x.id === personelId);
    if (p?.gunluk_ucret && count) {
      setTutar(String(Number(p.gunluk_ucret) * count));
    }
  }

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from("isci_maas_odemeleri").insert({
      personel_id: personelId,
      santiye_id: santiyeId,
      donem_baslangic: baslangic,
      donem_bitis: bitis,
      gun_sayisi: gunSayisi,
      tutar: Number(tutar),
      aciklama: aciklama || null,
      kaydeden_kullanici_id: kullaniciId,
      odendi_mi: false,
      onay_durumu: varsayilanOnay(rol),
    });
    if (error) {
      setMesaj("Kayıt başarısız: " + error.message);
      return;
    }
    setMesaj("İşçi maaş ödemesi kaydedildi");
    setAciklama("");
    setTutar("");
    router.refresh();
  }

  async function odendiYap(id: string, deger: boolean) {
    const supabase = createClient();
    await supabase
      .from("isci_maas_odemeleri")
      .update({
        odendi_mi: deger,
        odeme_tarihi: deger ? bugunISO() : null,
      })
      .eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {ekleyebilir && (
        <form onSubmit={kaydet} className="kart space-y-4 p-5">
          <h3 className="font-display font-semibold">İşçi Maaş Ödemesi Giriş</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Personel</label>
              <select
                className="input"
                value={personelId}
                onChange={(e) => setPersonelId(e.target.value)}
                required
              >
                {personeller.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.ad_soyad}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Dönem Başlangıç</label>
              <input
                type="date"
                className="input"
                value={baslangic}
                onChange={(e) => setBaslangic(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Dönem Bitiş</label>
              <input
                type="date"
                className="input"
                value={bitis}
                onChange={(e) => setBitis(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Puantaj Gün Sayısı</label>
              <div className="flex gap-2">
                <input
                  className="input"
                  value={gunSayisi ?? ""}
                  readOnly
                  placeholder="Hesapla"
                />
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  onClick={gunHesapla}
                >
                  Hesapla
                </button>
              </div>
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

      {mesaj && (
        <p className="text-sm text-perre-700">{mesaj}</p>
      )}

      <div className="kart overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-perre-50 text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Personel</th>
                <th className="px-4 py-3 font-medium">Dönem</th>
                <th className="px-4 py-3 font-medium">Gün</th>
                <th className="px-4 py-3 font-medium">Tutar</th>
                <th className="px-4 py-3 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {maaslar.map((m) => (
                <tr key={m.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">
                    {m.personeller?.ad_soyad ?? m.personel_id}
                  </td>
                  <td className="px-4 py-3">
                    {tarihFormat(m.donem_baslangic)} –{" "}
                    {tarihFormat(m.donem_bitis)}
                  </td>
                  <td className="px-4 py-3">{m.gun_sayisi ?? "—"}</td>
                  <td className="px-4 py-3">{paraFormat(Number(m.tutar))}</td>
                  <td className="px-4 py-3">
                    {odendiIsaret ? (
                      <button
                        type="button"
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          m.odendi_mi
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                        onClick={() => odendiYap(m.id, !m.odendi_mi)}
                      >
                        {m.odendi_mi ? "Ödendi" : "Ödenmedi"}
                      </button>
                    ) : m.odendi_mi ? (
                      "Ödendi"
                    ) : (
                      "Ödenmedi"
                    )}
                  </td>
                </tr>
              ))}
              {maaslar.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-[var(--muted)]"
                  >
                    Ödeme kaydı yok.
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
