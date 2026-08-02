"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  IsciMaasOdeme,
  Malzeme,
  MalzemeHareket,
  Personel,
  Rol,
} from "@/lib/types";
import { bugunISO, paraFormat, tarihFormat } from "@/lib/client-utils";
import { varsayilanOnay } from "@/lib/onay";

export function SahaPaneli({
  kullaniciId,
  rol,
  santiyeler,
  personeller,
  malzemeler,
  maaslar,
  hareketler,
}: {
  kullaniciId: string;
  rol: Rol;
  santiyeler: { id: string; ad: string }[];
  personeller: Personel[];
  malzemeler: Malzeme[];
  maaslar: IsciMaasOdeme[];
  hareketler: MalzemeHareket[];
}) {
  const router = useRouter();
  const [sekme, setSekme] = useState<"maas" | "malzeme" | "kayitlar">("maas");
  const [mesaj, setMesaj] = useState("");

  // Maaş formu
  const [santiyeId, setSantiyeId] = useState(santiyeler[0]?.id ?? "");
  const filtrelenmisPersonel = useMemo(
    () => personeller.filter((p) => p.santiye_id === santiyeId),
    [personeller, santiyeId]
  );
  const [personelId, setPersonelId] = useState("");
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");
  const [gunSayisi, setGunSayisi] = useState<number | null>(null);
  const [tutar, setTutar] = useState("");
  const [aciklama, setAciklama] = useState("");

  // Malzeme formu
  const filtrelenmisMalzeme = useMemo(
    () => malzemeler.filter((m) => m.santiye_id === santiyeId),
    [malzemeler, santiyeId]
  );
  const [malzemeId, setMalzemeId] = useState("");
  const [miktar, setMiktar] = useState("");
  const [tarih, setTarih] = useState(bugunISO());
  const [dosya, setDosya] = useState<File | null>(null);
  const [malzemeAciklama, setMalzemeAciklama] = useState("");

  async function gunHesapla() {
    const pid = personelId || filtrelenmisPersonel[0]?.id;
    if (!pid || !baslangic || !bitis) return;
    const supabase = createClient();
    const { count } = await supabase
      .from("puantaj")
      .select("id", { count: "exact", head: true })
      .eq("personel_id", pid)
      .eq("geldi_mi", true)
      .eq("silindi", false)
      .gte("tarih", baslangic)
      .lte("tarih", bitis);
    setGunSayisi(count ?? 0);
    const p = personeller.find((x) => x.id === pid);
    if (p?.gunluk_ucret && count) {
      setTutar(String(Number(p.gunluk_ucret) * count));
    }
  }

  async function maasKaydet(e: React.FormEvent) {
    e.preventDefault();
    const pid = personelId || filtrelenmisPersonel[0]?.id;
    if (!pid) {
      setMesaj("Personel seçin");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("isci_maas_odemeleri").insert({
      personel_id: pid,
      santiye_id: santiyeId,
      donem_baslangic: baslangic,
      donem_bitis: bitis,
      gun_sayisi: gunSayisi,
      tutar: Number(tutar),
      aciklama: aciklama || null,
      kaydeden_kullanici_id: kullaniciId,
      onay_durumu: varsayilanOnay(rol),
    });
    if (error) {
      setMesaj("Kayıt başarısız: " + error.message);
      return;
    }
    setMesaj("Maaş ödemesi kaydedildi");
    router.refresh();
  }

  async function malzemeKaydet(e: React.FormEvent) {
    e.preventDefault();
    const mid = malzemeId || filtrelenmisMalzeme[0]?.id;
    if (!mid) {
      setMesaj("Malzeme seçin");
      return;
    }
    const supabase = createClient();
    let belge_url: string | null = null;
    if (dosya) {
      const yol = `${santiyeId}/${Date.now()}-${dosya.name}`;
      const { error: upErr } = await supabase.storage
        .from("malzeme-belgeleri")
        .upload(yol, dosya);
      if (upErr) {
        setMesaj("Belge yüklenemedi: " + upErr.message);
        return;
      }
      belge_url = yol;
    }
    const { error } = await supabase.from("malzeme_hareket").insert({
      malzeme_id: mid,
      tip: "giris",
      miktar: Number(miktar),
      tarih,
      aciklama: malzemeAciklama || null,
      belge_url,
      durum: "karsilandi",
      kaydeden_kullanici_id: kullaniciId,
    });
    if (error) {
      setMesaj("Kayıt başarısız: " + error.message);
      return;
    }
    setMesaj("Gelen malzeme kaydedildi");
    setMiktar("");
    setDosya(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-perre-900">
          Saha Görevlisi Paneli
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          İşçi maaş ödemesi ve gelen malzeme kaydı
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {(
          [
            ["maas", "İşçi Maaş Ödemesi"],
            ["malzeme", "Gelen Malzeme"],
            ["kayitlar", "Kayıtlarım"],
          ] as const
        ).map(([id, etiket]) => (
          <button
            key={id}
            type="button"
            className={sekme === id ? "btn-primary" : "btn-secondary"}
            onClick={() => setSekme(id)}
          >
            {etiket}
          </button>
        ))}
      </div>

      {mesaj && (
        <p className="rounded-xl bg-perre-50 px-3 py-2 text-sm text-perre-800">
          {mesaj}
        </p>
      )}

      <div>
        <label className="label">Şantiye</label>
        <select
          className="input max-w-md"
          value={santiyeId}
          onChange={(e) => {
            setSantiyeId(e.target.value);
            setPersonelId("");
            setMalzemeId("");
          }}
        >
          {santiyeler.map((s) => (
            <option key={s.id} value={s.id}>
              {s.ad}
            </option>
          ))}
        </select>
      </div>

      {sekme === "maas" && (
        <form onSubmit={maasKaydet} className="kart space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Personel</label>
              <select
                className="input"
                value={personelId || filtrelenmisPersonel[0]?.id || ""}
                onChange={(e) => setPersonelId(e.target.value)}
                required
              >
                {filtrelenmisPersonel.map((p) => (
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
                <input className="input" value={gunSayisi ?? ""} readOnly />
                <button
                  type="button"
                  className="btn-secondary"
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

      {sekme === "malzeme" && (
        <form onSubmit={malzemeKaydet} className="kart space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Malzeme</label>
              <select
                className="input"
                value={malzemeId || filtrelenmisMalzeme[0]?.id || ""}
                onChange={(e) => setMalzemeId(e.target.value)}
                required
              >
                {filtrelenmisMalzeme.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.ad}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Miktar</label>
              <input
                className="input"
                type="number"
                value={miktar}
                onChange={(e) => setMiktar(e.target.value)}
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
            <div>
              <label className="label">Fotoğraf / Fatura</label>
              <input
                className="input"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setDosya(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Açıklama</label>
              <input
                className="input"
                value={malzemeAciklama}
                onChange={(e) => setMalzemeAciklama(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">
            Gelen Malzemeyi Kaydet
          </button>
        </form>
      )}

      {sekme === "kayitlar" && (
        <div className="space-y-4">
          <div className="kart overflow-hidden">
            <div className="border-b border-[var(--line)] px-4 py-3 font-display font-semibold">
              Maaş Kayıtlarım
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-perre-50 text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-2 font-medium">Personel</th>
                    <th className="px-4 py-2 font-medium">Dönem</th>
                    <th className="px-4 py-2 font-medium">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {maaslar.map((m) => (
                    <tr key={m.id} className="border-t border-[var(--line)]">
                      <td className="px-4 py-2">
                        {m.personeller?.ad_soyad}
                      </td>
                      <td className="px-4 py-2">
                        {tarihFormat(m.donem_baslangic)} –{" "}
                        {tarihFormat(m.donem_bitis)}
                      </td>
                      <td className="px-4 py-2">
                        {paraFormat(Number(m.tutar))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="kart overflow-hidden">
            <div className="border-b border-[var(--line)] px-4 py-3 font-display font-semibold">
              Malzeme Giriş Kayıtlarım
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-perre-50 text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-2 font-medium">Malzeme</th>
                    <th className="px-4 py-2 font-medium">Tarih</th>
                    <th className="px-4 py-2 font-medium">Miktar</th>
                  </tr>
                </thead>
                <tbody>
                  {hareketler.map((h) => (
                    <tr key={h.id} className="border-t border-[var(--line)]">
                      <td className="px-4 py-2">{h.malzemeler?.ad}</td>
                      <td className="px-4 py-2">{tarihFormat(h.tarih)}</td>
                      <td className="px-4 py-2">{h.miktar}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Not: Kayıtlarınızı silemezsiniz; düzeltme için yöneticinizle
            iletişime geçin veya yeni düzeltme kaydı ekleyin.
          </p>
        </div>
      )}
    </div>
  );
}
