"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Malzeme, MalzemeHareket, MalzemeHareketTip, Rol } from "@/lib/types";
import { bugunISO, paraFormat, tarihFormat } from "@/lib/client-utils";
import { imzaliUrlHaritasi } from "@/lib/signed-url";
import { OnayAksiyonlari } from "@/components/OnayAksiyonlari";
import { ExternalLink, ImageIcon, FileText } from "lucide-react";

const TIP_ETIKET: Record<MalzemeHareketTip, string> = {
  giris: "Giriş",
  cikis: "Çıkış",
  fazla: "Fazla",
  eksik: "Eksik",
};

const MALZEME_TURLERI = [
  "İnşaat",
  "Elektrik",
  "Tesisat",
  "Demir",
  "Ahşap",
  "Boya",
  "Sarf",
  "Diğer",
];

async function dosyaYukle(
  supabase: ReturnType<typeof createClient>,
  santiyeId: string,
  dosya: File | null,
  prefix: string
): Promise<string | null> {
  if (!dosya) return null;
  const yol = `${santiyeId}/${prefix}-${Date.now()}-${dosya.name}`;
  const { error } = await supabase.storage
    .from("malzeme-belgeleri")
    .upload(yol, dosya);
  if (error) throw new Error(error.message);
  return yol;
}

export function MalzemeSekmesi({
  santiyeId,
  santiyeAd,
  malzemeler,
  hareketler,
  kullaniciId,
  rol,
}: {
  santiyeId: string;
  santiyeAd: string;
  malzemeler: Malzeme[];
  hareketler: MalzemeHareket[];
  kullaniciId: string;
  rol: Rol;
}) {
  const router = useRouter();
  const [altSekme, setAltSekme] = useState<"hareket" | "eksik">("hareket");
  const [malzemeId, setMalzemeId] = useState(malzemeler[0]?.id ?? "");
  const [yeniMalzemeAd, setYeniMalzemeAd] = useState("");
  const [yeniTur, setYeniTur] = useState("İnşaat");
  const [yeniBirim, setYeniBirim] = useState("adet");
  const [tip, setTip] = useState<MalzemeHareketTip>("giris");
  const [miktar, setMiktar] = useState("");
  const [birimFiyat, setBirimFiyat] = useState("");
  const [tarih, setTarih] = useState(bugunISO());
  const [aciklama, setAciklama] = useState("");
  const [fatura, setFatura] = useState<File | null>(null);
  const [resim, setResim] = useState<File | null>(null);
  const [belgeLinkleri, setBelgeLinkleri] = useState<Record<string, string>>({});
  const [mesaj, setMesaj] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  // Eksik bildirim formu (ayrı)
  const [eksikAd, setEksikAd] = useState("");
  const [eksikTur, setEksikTur] = useState("İnşaat");
  const [eksikMiktar, setEksikMiktar] = useState("");
  const [eksikAciklama, setEksikAciklama] = useState("");

  const bekleyen = useMemo(
    () =>
      hareketler.filter(
        (h) =>
          h.tip === "eksik" &&
          (h.durum === "bekliyor" || h.durum === "onaylandi")
      ),
    [hareketler]
  );

  useEffect(() => {
    const tekil = hareketler.flatMap((h) => [
      h.fatura_url,
      h.resim_url,
      h.belge_url,
    ]);
    if (!tekil.some(Boolean)) return;

    const supabase = createClient();
    let iptal = false;
    async function imzaliLinkleriHazirla() {
      const harita = await imzaliUrlHaritasi(
        supabase,
        "malzeme-belgeleri",
        tekil
      );
      if (!iptal) setBelgeLinkleri(harita);
    }
    imzaliLinkleriHazirla();
    return () => {
      iptal = true;
    };
  }, [hareketler]);

  const malzemeMaliyet = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of hareketler) {
      if (h.tip !== "giris" && h.tip !== "fazla") continue;
      map.set(h.malzeme_id, (map.get(h.malzeme_id) ?? 0) + Number(h.tutar ?? 0));
    }
    return map;
  }, [hareketler]);

  const malzemeAdet = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of hareketler) {
      const onceki = map.get(h.malzeme_id) ?? 0;
      if (h.tip === "giris" || h.tip === "fazla") {
        map.set(h.malzeme_id, onceki + Number(h.miktar));
      } else if (h.tip === "cikis") {
        map.set(h.malzeme_id, onceki - Number(h.miktar));
      }
    }
    return map;
  }, [hareketler]);

  const santiyeMalzemeToplam = useMemo(
    () => Array.from(malzemeMaliyet.values()).reduce((s, n) => s + n, 0),
    [malzemeMaliyet]
  );

  const ekleyebilir =
    rol === "admin" || rol === "santiye_sefi" || rol === "saha_gorevlisi";
  const malzemeSilebilir = rol === "admin" || rol === "santiye_sefi";
  const hareketSilebilir =
    rol === "admin" || rol === "santiye_sefi" || rol === "saha_gorevlisi";

  async function malzemeTanimSil(id: string, ad: string) {
    if (!confirm(`“${ad}” malzemesini silmek istediğinize emin misiniz?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("malzemeler").delete().eq("id", id);
    if (error) {
      setMesaj("Malzeme silinemedi: " + error.message);
      return;
    }
    if (malzemeId === id) setMalzemeId("");
    setMesaj("Malzeme tanımı silindi");
    router.refresh();
  }

  async function hareketSil(id: string) {
    if (!confirm("Bu malzeme hareketini silmek istediğinize emin misiniz?"))
      return;
    const supabase = createClient();
    if (rol === "admin") {
      const { error } = await supabase.from("malzeme_hareket").delete().eq("id", id);
      if (error) {
        setMesaj("Hareket silinemedi: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("malzeme_hareket")
        .update({ silindi: true })
        .eq("id", id);
      if (error) {
        setMesaj("Hareket kaldırılamadı: " + error.message);
        return;
      }
    }
    setMesaj("Malzeme hareketi silindi");
    router.refresh();
  }

  async function malzemeTanimEkle(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("malzemeler")
      .insert({
        ad: yeniMalzemeAd,
        tur: yeniTur,
        birim: yeniBirim,
        santiye_id: santiyeId,
      })
      .select()
      .single();
    if (error) {
      setMesaj("Malzeme eklenemedi: " + error.message);
      return;
    }
    setYeniMalzemeAd("");
    if (data) setMalzemeId(data.id);
    setMesaj("Malzeme tanımı eklendi (ad + tür)");
    router.refresh();
  }

  function belgeHref(deger: string | null | undefined) {
    if (!deger) return null;
    return belgeLinkleri[deger] || null;
  }

  async function hareketKaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!malzemeId) {
      setMesaj("Önce malzeme seçin veya ekleyin");
      return;
    }
    setYukleniyor(true);
    setMesaj("");
    const supabase = createClient();
    try {
      const [fatura_url, resim_url] = await Promise.all([
        dosyaYukle(supabase, santiyeId, fatura, "fatura"),
        dosyaYukle(supabase, santiyeId, resim, "resim"),
      ]);
      const belge_url = fatura_url ?? resim_url;
      const { error } = await supabase.from("malzeme_hareket").insert({
        malzeme_id: malzemeId,
        tip,
        miktar: Number(miktar),
        birim_fiyat: birimFiyat ? Number(birimFiyat) : null,
        tarih,
        aciklama: aciklama || null,
        belge_url,
        fatura_url,
        resim_url,
        durum: tip === "eksik" ? "bekliyor" : "karsilandi",
        kaydeden_kullanici_id: kullaniciId,
      });
      if (error) throw new Error(error.message);
      setMiktar("");
      setBirimFiyat("");
      setAciklama("");
      setFatura(null);
      setResim(null);
      setMesaj(
        tip === "eksik"
          ? "Eksik malzeme bildirildi"
          : "Malzeme hareketi kaydedildi"
      );
      router.refresh();
    } catch (err) {
      setMesaj(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setYukleniyor(false);
    }
  }

  async function eksikMalzemeBildir(e: React.FormEvent) {
    e.preventDefault();
    setYukleniyor(true);
    setMesaj("");
    const supabase = createClient();
    try {
      let hedefId =
        malzemeler.find(
          (m) =>
            m.ad.trim().toLowerCase() === eksikAd.trim().toLowerCase() &&
            (m.tur ?? "") === eksikTur
        )?.id ?? "";

      if (!hedefId) {
        const { data, error } = await supabase
          .from("malzemeler")
          .insert({
            ad: eksikAd.trim(),
            tur: eksikTur,
            birim: "adet",
            santiye_id: santiyeId,
          })
          .select()
          .single();
        if (error || !data) throw new Error(error?.message ?? "Malzeme oluşturulamadı");
        hedefId = data.id;
      }

      const { error } = await supabase.from("malzeme_hareket").insert({
        malzeme_id: hedefId,
        tip: "eksik",
        miktar: Number(eksikMiktar || 1),
        birim_fiyat: null,
        tarih: bugunISO(),
        aciklama: eksikAciklama || null,
        durum: "bekliyor",
        kaydeden_kullanici_id: kullaniciId,
      });
      if (error) throw new Error(error.message);

      setEksikAd("");
      setEksikMiktar("");
      setEksikAciklama("");
      setMesaj("Eksik malzeme bildirimi kaydedildi");
      setAltSekme("eksik");
      router.refresh();
    } catch (err) {
      setMesaj(err instanceof Error ? err.message : "Bildirim başarısız");
    } finally {
      setYukleniyor(false);
    }
  }

  async function karsila(id: string) {
    const res = await fetch("/api/malzeme/eksik-karsila", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, kullaniciId }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setMesaj("İşaretlenemedi: " + (data?.error ?? "Bilinmeyen hata"));
      return;
    }
    setMesaj("Eksik karşılandı; depo çıkışı ve şantiye girişi işlendi");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-perre-200 bg-perre-50/80 px-4 py-3 text-sm text-perre-900">
        <p className="font-semibold">{santiyeAd} — malzeme kayıtları</p>
        <p className="mt-1 text-[var(--muted)]">
          Malzeme: ad + tür · Hareket: adet + fiyat · Fatura ve resim yüklenebilir.
          Toplam maliyet:{" "}
          <span className="font-semibold text-perre-800">
            {paraFormat(santiyeMalzemeToplam)}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={altSekme === "hareket" ? "btn-primary" : "btn-secondary"}
          onClick={() => setAltSekme("hareket")}
        >
          Malzemeler
        </button>
        <button
          type="button"
          className={altSekme === "eksik" ? "btn-danger" : "btn-secondary"}
          onClick={() => setAltSekme("eksik")}
        >
          Eksik Malzeme ({bekleyen.length})
        </button>
        {ekleyebilir && (
          <button
            type="button"
            className="btn-danger"
            onClick={() => setAltSekme("eksik")}
          >
            + Eksik Malzeme Bildir
          </button>
        )}
      </div>

      {mesaj && (
        <p className="rounded-xl bg-perre-50 px-3 py-2 text-sm text-perre-800">
          {mesaj}
        </p>
      )}

      {altSekme === "hareket" && (
        <>
          {ekleyebilir && (
            <>
              <form
                onSubmit={malzemeTanimEkle}
                className="kart grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div>
                  <label className="label">Malzeme Adı</label>
                  <input
                    className="input"
                    placeholder="Örn. Çimento"
                    value={yeniMalzemeAd}
                    onChange={(e) => setYeniMalzemeAd(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Tür</label>
                  <select
                    className="input"
                    value={yeniTur}
                    onChange={(e) => setYeniTur(e.target.value)}
                  >
                    {MALZEME_TURLERI.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Birim</label>
                  <input
                    className="input"
                    value={yeniBirim}
                    onChange={(e) => setYeniBirim(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="btn-secondary w-full">
                    Malzeme Ekle
                  </button>
                </div>
              </form>

              <div className="kart overflow-hidden">
                <div className="border-b border-[var(--line)] px-4 py-3 font-display font-semibold">
                  {santiyeAd} Malzeme Listesi
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-perre-50 text-[var(--muted)]">
                      <tr>
                        <th className="px-4 py-3">Ad</th>
                        <th className="px-4 py-3">Tür</th>
                        <th className="px-4 py-3">Adet</th>
                        <th className="px-4 py-3">Maliyet</th>
                        <th className="px-4 py-3">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {malzemeler.map((m) => (
                        <tr key={m.id} className="border-t border-[var(--line)]">
                          <td className="px-4 py-3 font-medium">{m.ad}</td>
                          <td className="px-4 py-3">{m.tur ?? "—"}</td>
                          <td className="px-4 py-3">
                            {malzemeAdet.get(m.id) ?? 0} {m.birim ?? "adet"}
                          </td>
                          <td className="px-4 py-3">
                            {paraFormat(malzemeMaliyet.get(m.id) ?? 0)}
                          </td>
                          <td className="px-4 py-3">
                            {malzemeSilebilir ? (
                              <button
                                type="button"
                                className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                                onClick={() => malzemeTanimSil(m.id, m.ad)}
                              >
                                Sil
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                      {malzemeler.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-6 text-center text-[var(--muted)]"
                          >
                            Henüz malzeme yok. Ad ve tür ile ekleyin.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {ekleyebilir && (
            <form onSubmit={hareketKaydet} className="kart space-y-4 p-5">
              <h3 className="font-display font-semibold">
                Malzeme Hareketi (Adet + Fiyat)
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="label">Malzeme</label>
                  <select
                    className="input"
                    value={malzemeId}
                    onChange={(e) => setMalzemeId(e.target.value)}
                    required
                  >
                    <option value="">Seçin</option>
                    {malzemeler.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.ad}
                        {m.tur ? ` · ${m.tur}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Tip</label>
                  <select
                    className="input"
                    value={tip}
                    onChange={(e) => setTip(e.target.value as MalzemeHareketTip)}
                  >
                    {(["giris", "cikis", "fazla"] as MalzemeHareketTip[]).map(
                      (t) => (
                        <option key={t} value={t}>
                          {TIP_ETIKET[t]}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="label">Adet / Miktar</label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    value={miktar}
                    onChange={(e) => setMiktar(e.target.value)}
                    required
                  />
                </div>
                {rol !== "saha_gorevlisi" && (
                  <div>
                    <label className="label">Birim Fiyat (₺)</label>
                    <input
                      className="input"
                      type="number"
                      step="any"
                      value={birimFiyat}
                      onChange={(e) => setBirimFiyat(e.target.value)}
                    />
                  </div>
                )}
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
                  <label className="label">Açıklama</label>
                  <input
                    className="input"
                    value={aciklama}
                    onChange={(e) => setAciklama(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">
                    <FileText className="mr-1 inline h-3.5 w-3.5" />
                    Fatura / Belge
                  </label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setFatura(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div>
                  <label className="label">
                    <ImageIcon className="mr-1 inline h-3.5 w-3.5" />
                    Malzeme Resmi
                  </label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setResim(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
              <button type="submit" disabled={yukleniyor} className="btn-primary">
                {yukleniyor ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </form>
          )}

          <div className="kart overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-perre-50 text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3">Tarih</th>
                    <th className="px-4 py-3">Malzeme</th>
                    <th className="px-4 py-3">Tür</th>
                    <th className="px-4 py-3">Tip</th>
                    <th className="px-4 py-3">Adet</th>
                    <th className="px-4 py-3">Fiyat</th>
                    <th className="px-4 py-3">Tutar</th>
                    <th className="px-4 py-3">Belgeler</th>
                    <th className="px-4 py-3">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {hareketler
                    .filter((h) => h.tip !== "eksik")
                    .map((h) => {
                      const faturaHref = belgeHref(h.fatura_url || h.belge_url);
                      const resimHref = belgeHref(h.resim_url);
                      return (
                      <tr key={h.id} className="border-t border-[var(--line)]">
                        <td className="px-4 py-3">{tarihFormat(h.tarih)}</td>
                        <td className="px-4 py-3">{h.malzemeler?.ad ?? "—"}</td>
                        <td className="px-4 py-3">{h.malzemeler?.tur ?? "—"}</td>
                        <td className="px-4 py-3">{TIP_ETIKET[h.tip]}</td>
                        <td className="px-4 py-3">{h.miktar}</td>
                        <td className="px-4 py-3">
                          {h.birim_fiyat != null
                            ? paraFormat(Number(h.birim_fiyat))
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {paraFormat(Number(h.tutar))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {faturaHref && (
                              <a
                                href={faturaHref}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-perre-700 underline"
                              >
                                <FileText className="h-3.5 w-3.5" /> Fatura
                              </a>
                            )}
                            {resimHref && (
                              <a
                                href={resimHref}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-perre-700 underline"
                              >
                                <ExternalLink className="h-3.5 w-3.5" /> Resim
                              </a>
                            )}
                            {!faturaHref && !resimHref && "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {hareketSilebilir ? (
                            <button
                              type="button"
                              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                              onClick={() => hareketSil(h.id)}
                            >
                              Sil
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {altSekme === "eksik" && (
        <div className="space-y-4">
          {ekleyebilir && (
            <form
              onSubmit={eksikMalzemeBildir}
              className="kart space-y-4 border-2 border-red-300 bg-red-50/40 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg font-semibold text-red-900">
                  Eksik Malzeme Bildir
                </h3>
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
                  Ad + Tür
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="label">Malzeme Adı</label>
                  <input
                    className="input"
                    value={eksikAd}
                    onChange={(e) => setEksikAd(e.target.value)}
                    required
                    placeholder="Örn. Demir 12mm"
                  />
                </div>
                <div>
                  <label className="label">Tür</label>
                  <select
                    className="input"
                    value={eksikTur}
                    onChange={(e) => setEksikTur(e.target.value)}
                  >
                    {MALZEME_TURLERI.map((t) => (
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
                    value={eksikMiktar}
                    onChange={(e) => setEksikMiktar(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Açıklama</label>
                  <input
                    className="input"
                    value={eksikAciklama}
                    onChange={(e) => setEksikAciklama(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" disabled={yukleniyor} className="btn-danger">
                {yukleniyor ? "Kaydediliyor…" : "Eksik Malzeme Bildir"}
              </button>
            </form>
          )}

          {bekleyen.map((h) => (
            <div
              key={h.id}
              className="kart flex flex-wrap items-center justify-between gap-3 border-red-200 bg-red-50 p-4"
            >
              <div>
                <p className="font-medium text-red-900">
                  {h.malzemeler?.ad}
                  {h.malzemeler?.tur ? ` · ${h.malzemeler.tur}` : ""} — {h.miktar}{" "}
                  {h.malzemeler?.birim ?? "adet"}
                </p>
                <p className="text-sm text-red-700">
                  {h.durum === "onaylandi" ? "Onaylandı · " : "Onay bekliyor · "}
                  {tarihFormat(h.tarih)} · {h.aciklama ?? "Açıklama yok"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(rol === "admin" ||
                  rol === "depo_sorumlusu" ||
                  rol === "santiye_sefi") &&
                  (h.durum === "bekliyor" ? (
                    <OnayAksiyonlari kaynak="eksik" id={h.id} />
                  ) : (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => karsila(h.id)}
                    >
                      Karşılandı
                    </button>
                  ))}
                {hareketSilebilir && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => hareketSil(h.id)}
                  >
                    Sil
                  </button>
                )}
              </div>
            </div>
          ))}
          {bekleyen.length === 0 && (
            <div className="kart p-8 text-center text-[var(--muted)]">
              Bekleyen eksik malzeme yok.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
