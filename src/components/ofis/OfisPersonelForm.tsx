"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { OfisOdeme, OfisPersonel, OfisPuantaj, Rol } from "@/lib/types";
import { bugunISO, paraFormat, tarihFormat } from "@/lib/client-utils";
import { varsayilanOnay } from "@/lib/onay";

type PersonelFormDeger = {
  ad_soyad: string;
  pozisyon: string;
  telefon: string;
  email: string;
  maas: string;
  notlar: string;
};

function ayBaslangic() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function ayBitis() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function OfisPersonelForm({
  personeller,
  puantajlar,
  odemeler,
  rol,
  kullaniciId,
}: {
  personeller: OfisPersonel[];
  puantajlar: OfisPuantaj[];
  odemeler: OfisOdeme[];
  rol: Rol;
  kullaniciId: string;
}) {
  const router = useRouter();
  const yazabilir = rol === "admin" || rol === "ofis_admin" || rol === "ofis_personeli";
  const [tarih, setTarih] = useState(bugunISO());
  const [mesaj, setMesaj] = useState("");
  const [yeni, setYeni] = useState<PersonelFormDeger>({
    ad_soyad: "",
    pozisyon: "",
    telefon: "",
    email: "",
    maas: "",
    notlar: "",
  });
  const [duzenlenenler, setDuzenlenenler] = useState<Record<string, PersonelFormDeger>>(() =>
    Object.fromEntries(
      personeller.map((p) => [
        p.id,
        {
          ad_soyad: p.ad_soyad,
          pozisyon: p.pozisyon ?? "",
          telefon: p.telefon ?? "",
          email: p.email ?? "",
          maas: p.maas != null ? String(p.maas) : "",
          notlar: p.notlar ?? "",
        },
      ])
    )
  );

  const puantajMap = useMemo(() => {
    const map = new Map<string, OfisPuantaj>();
    for (const p of puantajlar) {
      if (p.tarih === tarih) map.set(p.ofis_personel_id, p);
    }
    return map;
  }, [puantajlar, tarih]);

  const sonOdemeMap = useMemo(() => {
    const map = new Map<string, OfisOdeme>();
    for (const o of odemeler) {
      if (!o.ofis_personel_id || map.has(o.ofis_personel_id)) continue;
      map.set(o.ofis_personel_id, o);
    }
    return map;
  }, [odemeler]);

  const aktifPersoneller = personeller.filter((p) => p.aktif);
  const gelenSayisi = aktifPersoneller.filter((p) => puantajMap.get(p.id)?.geldi_mi).length;
  const yemekSayisi = aktifPersoneller.filter((p) => puantajMap.get(p.id)?.yemek_yedi_mi).length;
  const bekleyenOdeme = odemeler.filter((o) => !o.odendi_mi).length;

  function yeniAlan(field: keyof PersonelFormDeger, value: string) {
    setYeni((cur) => ({ ...cur, [field]: value }));
  }

  function alanDegistir(id: string, field: keyof PersonelFormDeger, value: string) {
    setDuzenlenenler((cur) => ({
      ...cur,
      [id]: { ...cur[id], [field]: value },
    }));
  }

  async function ekle(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from("ofis_personeller").insert({
      ad_soyad: yeni.ad_soyad,
      pozisyon: yeni.pozisyon || null,
      telefon: yeni.telefon || null,
      email: yeni.email || null,
      maas: yeni.maas ? Number(yeni.maas) : null,
      notlar: yeni.notlar || null,
    });
    if (error) {
      setMesaj(error.message);
      return;
    }
    setYeni({ ad_soyad: "", pozisyon: "", telefon: "", email: "", maas: "", notlar: "" });
    setMesaj("Ofis personeli eklendi");
    router.refresh();
  }

  async function personelGuncelle(id: string) {
    const form = duzenlenenler[id];
    if (!form) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("ofis_personeller")
      .update({
        ad_soyad: form.ad_soyad,
        pozisyon: form.pozisyon || null,
        telefon: form.telefon || null,
        email: form.email || null,
        maas: form.maas ? Number(form.maas) : null,
        notlar: form.notlar || null,
      })
      .eq("id", id);
    if (error) {
      setMesaj(error.message);
      return;
    }
    setMesaj("Personel bilgileri güncellendi");
    router.refresh();
  }

  async function pasifYap(id: string) {
    const supabase = createClient();
    await supabase.from("ofis_personeller").update({ aktif: false }).eq("id", id);
    router.refresh();
  }

  async function puantajKaydet(personelId: string, field: "geldi_mi" | "yemek_yedi_mi", value: boolean) {
    const mevcut = puantajMap.get(personelId);
    const supabase = createClient();
    const { error } = await supabase.from("ofis_puantaj").upsert(
      {
        ofis_personel_id: personelId,
        tarih,
        geldi_mi: field === "geldi_mi" ? value : (mevcut?.geldi_mi ?? false),
        yemek_yedi_mi: field === "yemek_yedi_mi" ? value : (mevcut?.yemek_yedi_mi ?? false),
        kaydeden_kullanici_id: kullaniciId,
        silindi: false,
      },
      { onConflict: "ofis_personel_id,tarih" }
    );
    if (error) {
      setMesaj(error.message);
      return;
    }
    router.refresh();
  }

  async function maasOdemeKaydiAc(p: OfisPersonel) {
    if (!p.maas) {
      setMesaj("Ödeme kaydı için personel maaşı girilmeli");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("ofis_odemeler").insert({
      ofis_personel_id: p.id,
      tutar: Number(p.maas),
      donem_baslangic: ayBaslangic(),
      donem_bitis: ayBitis(),
      aciklama: "Aylık ofis maaşı",
      kaydeden_kullanici_id: kullaniciId,
      onay_durumu: varsayilanOnay(rol),
    });
    if (error) {
      setMesaj(error.message);
      return;
    }
    setMesaj("Maaş ödeme kaydı açıldı");
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
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="kart p-4">
          <p className="text-sm text-[var(--muted)]">Aktif personel</p>
          <p className="mt-2 font-display text-2xl font-semibold">{aktifPersoneller.length}</p>
        </div>
        <div className="kart p-4">
          <p className="text-sm text-[var(--muted)]">Bugün geldi</p>
          <p className="mt-2 font-display text-2xl font-semibold">{gelenSayisi}</p>
        </div>
        <div className="kart p-4">
          <p className="text-sm text-[var(--muted)]">Yemek yiyen</p>
          <p className="mt-2 font-display text-2xl font-semibold">{yemekSayisi}</p>
        </div>
        <div className="kart border-amber-200 bg-amber-50/60 p-4">
          <p className="text-sm text-amber-800">Bekleyen ödeme</p>
          <p className="mt-2 font-display text-2xl font-semibold text-amber-900">{bekleyenOdeme}</p>
        </div>
      </div>

      <div className="kart flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Puantaj tarihi</label>
          <input className="input" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </div>
        <p className="pb-2 text-sm text-[var(--muted)]">
          Seçili gün için geldi/gelmedi ve yemek durumu kaydedilir.
        </p>
      </div>

      {yazabilir && (
        <form onSubmit={ekle} className="kart grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <input className="input" placeholder="Ad Soyad" value={yeni.ad_soyad} onChange={(e) => yeniAlan("ad_soyad", e.target.value)} required />
          <input className="input" placeholder="Pozisyon" value={yeni.pozisyon} onChange={(e) => yeniAlan("pozisyon", e.target.value)} />
          <input className="input" placeholder="Telefon" value={yeni.telefon} onChange={(e) => yeniAlan("telefon", e.target.value)} />
          <input className="input" type="email" placeholder="E-posta" value={yeni.email} onChange={(e) => yeniAlan("email", e.target.value)} />
          <input className="input" placeholder="Aylık maaş" type="number" value={yeni.maas} onChange={(e) => yeniAlan("maas", e.target.value)} />
          <input className="input" placeholder="Notlar" value={yeni.notlar} onChange={(e) => yeniAlan("notlar", e.target.value)} />
          <button type="submit" className="btn-primary">Ofis Personeli Ekle</button>
        </form>
      )}

      {mesaj && <p className="rounded-xl bg-perre-50 px-3 py-2 text-sm text-perre-800">{mesaj}</p>}

      <div className="space-y-4">
        {personeller.map((p) => {
          const form = duzenlenenler[p.id] ?? {
            ad_soyad: p.ad_soyad,
            pozisyon: p.pozisyon ?? "",
            telefon: p.telefon ?? "",
            email: p.email ?? "",
            maas: p.maas != null ? String(p.maas) : "",
            notlar: p.notlar ?? "",
          };
          const puantaj = puantajMap.get(p.id);
          const sonOdeme = sonOdemeMap.get(p.id);
          const odemeAldi = sonOdeme?.odendi_mi === true;

          return (
            <div key={p.id} className={`kart p-5 ${p.aktif ? "" : "opacity-60"}`}>
              <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className="input font-semibold" value={form.ad_soyad} onChange={(e) => alanDegistir(p.id, "ad_soyad", e.target.value)} disabled={!yazabilir} />
                    <input className="input" placeholder="Pozisyon" value={form.pozisyon} onChange={(e) => alanDegistir(p.id, "pozisyon", e.target.value)} disabled={!yazabilir} />
                    <input className="input" placeholder="Telefon" value={form.telefon} onChange={(e) => alanDegistir(p.id, "telefon", e.target.value)} disabled={!yazabilir} />
                    <input className="input" type="email" placeholder="E-posta" value={form.email} onChange={(e) => alanDegistir(p.id, "email", e.target.value)} disabled={!yazabilir} />
                    <input className="input" type="number" placeholder="Aylık maaş" value={form.maas} onChange={(e) => alanDegistir(p.id, "maas", e.target.value)} disabled={!yazabilir} />
                    <input className="input" placeholder="Notlar" value={form.notlar} onChange={(e) => alanDegistir(p.id, "notlar", e.target.value)} disabled={!yazabilir} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-perre-50 px-3 py-1 text-xs text-perre-800">
                      Maaş: {paraFormat(Number(form.maas || 0))}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs ${p.aktif ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                      {p.aktif ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--line)] p-4">
                  <p className="mb-3 font-display font-semibold">Puantaj</p>
                  <div className="grid gap-2">
                    <button
                      type="button"
                      disabled={!yazabilir}
                      onClick={() => puantajKaydet(p.id, "geldi_mi", !(puantaj?.geldi_mi ?? false))}
                      className={puantaj?.geldi_mi ? "btn-primary" : "btn-secondary"}
                    >
                      {puantaj?.geldi_mi ? "Geldi" : "Gelmedi"}
                    </button>
                    <button
                      type="button"
                      disabled={!yazabilir}
                      onClick={() => puantajKaydet(p.id, "yemek_yedi_mi", !(puantaj?.yemek_yedi_mi ?? false))}
                      className={puantaj?.yemek_yedi_mi ? "btn-primary" : "btn-secondary"}
                    >
                      {puantaj?.yemek_yedi_mi ? "Yemek yedi" : "Yemek yemedi"}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--line)] p-4">
                  <p className="mb-3 font-display font-semibold">Ödeme</p>
                  <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${odemeAldi ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                    {odemeAldi ? "Ödeme aldı" : "Ödeme almadı / bekliyor"}
                  </p>
                  {sonOdeme && (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Son kayıt: {paraFormat(Number(sonOdeme.tutar))} · {tarihFormat(sonOdeme.created_at)}
                    </p>
                  )}
                  {yazabilir && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!sonOdeme?.odendi_mi && sonOdeme ? (
                        <button type="button" className="btn-primary text-xs" onClick={() => odendi(sonOdeme.id)}>
                          Ödeme aldı işaretle
                        </button>
                      ) : (
                        <button type="button" className="btn-secondary text-xs" onClick={() => maasOdemeKaydiAc(p)}>
                          Maaş ödeme kaydı aç
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {yazabilir && (
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--line)] pt-4">
                  <button type="button" className="btn-secondary" onClick={() => personelGuncelle(p.id)}>
                    Bilgileri Kaydet
                  </button>
                  {p.aktif && (
                    <button type="button" className="text-sm font-semibold text-red-700" onClick={() => pasifYap(p.id)}>
                      Pasifleştir
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {personeller.length === 0 && (
          <div className="kart p-10 text-center text-[var(--muted)]">
            Ofis personeli yok.
          </div>
        )}
      </div>
    </div>
  );
}
