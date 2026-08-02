"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { IsciMaasOdeme, Personel, Puantaj, Rol } from "@/lib/types";
import { bugunISO, paraFormat, tarihFormat } from "@/lib/client-utils";
import { varsayilanOnay } from "@/lib/onay";

type PersonelFormDeger = {
  ad_soyad: string;
  pozisyon: string;
  telefon: string;
  email: string;
  gunluk_ucret: string;
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

export function PuantajSekmesi({
  santiyeId,
  personeller,
  puantajlar,
  maaslar,
  kullaniciId,
  rol,
}: {
  santiyeId: string;
  personeller: Personel[];
  puantajlar: Puantaj[];
  maaslar: IsciMaasOdeme[];
  kullaniciId: string;
  rol: Rol;
}) {
  const router = useRouter();
  const yazabilir =
    rol === "admin" || rol === "santiye_sefi" || rol === "saha_gorevlisi";
  const [tarih, setTarih] = useState(bugunISO());
  const [mesaj, setMesaj] = useState("");
  const [yeni, setYeni] = useState<PersonelFormDeger>({
    ad_soyad: "",
    pozisyon: "",
    telefon: "",
    email: "",
    gunluk_ucret: "",
    notlar: "",
  });
  const [duzenlenenler, setDuzenlenenler] = useState<
    Record<string, PersonelFormDeger>
  >(() =>
    Object.fromEntries(
      personeller.map((p) => [
        p.id,
        {
          ad_soyad: p.ad_soyad,
          pozisyon: p.pozisyon ?? "",
          telefon: p.telefon ?? "",
          email: p.email ?? "",
          gunluk_ucret: p.gunluk_ucret != null ? String(p.gunluk_ucret) : "",
          notlar: p.notlar ?? "",
        },
      ])
    )
  );

  const puantajMap = useMemo(() => {
    const map = new Map<string, Puantaj>();
    for (const p of puantajlar) {
      if (p.tarih === tarih && !p.silindi) map.set(p.personel_id, p);
    }
    return map;
  }, [puantajlar, tarih]);

  const sonOdemeMap = useMemo(() => {
    const map = new Map<string, IsciMaasOdeme>();
    for (const o of maaslar) {
      if (!o.personel_id || map.has(o.personel_id)) continue;
      map.set(o.personel_id, o);
    }
    return map;
  }, [maaslar]);

  const aktifPersoneller = personeller.filter((p) => p.aktif);
  const gelenSayisi = aktifPersoneller.filter(
    (p) => puantajMap.get(p.id)?.geldi_mi
  ).length;
  const yemekSayisi = aktifPersoneller.filter(
    (p) => puantajMap.get(p.id)?.yemek_yedi_mi
  ).length;
  const bekleyenOdeme = maaslar.filter((o) => !o.odendi_mi).length;

  function yeniAlan(field: keyof PersonelFormDeger, value: string) {
    setYeni((cur) => ({ ...cur, [field]: value }));
  }

  function alanDegistir(
    id: string,
    field: keyof PersonelFormDeger,
    value: string
  ) {
    setDuzenlenenler((cur) => ({
      ...cur,
      [id]: { ...cur[id], [field]: value },
    }));
  }

  async function ekle(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from("personeller").insert({
      ad_soyad: yeni.ad_soyad,
      pozisyon: yeni.pozisyon || null,
      telefon: yeni.telefon || null,
      email: yeni.email || null,
      gunluk_ucret: yeni.gunluk_ucret ? Number(yeni.gunluk_ucret) : null,
      notlar: yeni.notlar || null,
      santiye_id: santiyeId,
    });
    if (error) {
      setMesaj(error.message);
      return;
    }
    setYeni({
      ad_soyad: "",
      pozisyon: "",
      telefon: "",
      email: "",
      gunluk_ucret: "",
      notlar: "",
    });
    setMesaj("Şantiye personeli eklendi");
    router.refresh();
  }

  async function personelGuncelle(id: string) {
    const form = duzenlenenler[id];
    if (!form) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("personeller")
      .update({
        ad_soyad: form.ad_soyad,
        pozisyon: form.pozisyon || null,
        telefon: form.telefon || null,
        email: form.email || null,
        gunluk_ucret: form.gunluk_ucret ? Number(form.gunluk_ucret) : null,
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
    await supabase.from("personeller").update({ aktif: false }).eq("id", id);
    router.refresh();
  }

  async function puantajKaydet(
    personelId: string,
    field: "geldi_mi" | "yemek_yedi_mi",
    value: boolean
  ) {
    const mevcut = puantajMap.get(personelId);
    const supabase = createClient();
    const geldi =
      field === "geldi_mi" ? value : (mevcut?.geldi_mi ?? false);
    const yemek =
      field === "yemek_yedi_mi"
        ? value
        : field === "geldi_mi" && !value
          ? false
          : (mevcut?.yemek_yedi_mi ?? false);

    const { error } = await supabase.from("puantaj").upsert(
      {
        personel_id: personelId,
        tarih,
        geldi_mi: geldi,
        yemek_yedi_mi: yemek,
        giren_kullanici_id: kullaniciId,
        silindi: false,
      },
      { onConflict: "personel_id,tarih" }
    );
    if (error) {
      setMesaj(error.message);
      return;
    }
    router.refresh();
  }

  async function maasOdemeKaydiAc(p: Personel) {
    if (!p.gunluk_ucret) {
      setMesaj("Ödeme kaydı için günlük ücret girilmeli");
      return;
    }
    const supabase = createClient();
    const bas = ayBaslangic();
    const bit = ayBitis();
    const { count } = await supabase
      .from("puantaj")
      .select("id", { count: "exact", head: true })
      .eq("personel_id", p.id)
      .eq("geldi_mi", true)
      .eq("silindi", false)
      .gte("tarih", bas)
      .lte("tarih", bit);

    const gunSayisi = count ?? 0;
    const tutar =
      gunSayisi > 0
        ? Number(p.gunluk_ucret) * gunSayisi
        : Number(p.gunluk_ucret);

    const { error } = await supabase.from("isci_maas_odemeleri").insert({
      personel_id: p.id,
      santiye_id: santiyeId,
      tutar,
      donem_baslangic: bas,
      donem_bitis: bit,
      gun_sayisi: gunSayisi || null,
      aciklama: "Şantiye işçi ödemesi",
      kaydeden_kullanici_id: kullaniciId,
      odendi_mi: false,
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
      .from("isci_maas_odemeleri")
      .update({ odendi_mi: true, odeme_tarihi: bugunISO() })
      .eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="kart p-4">
          <p className="text-sm text-[var(--muted)]">Aktif personel</p>
          <p className="mt-2 font-display text-2xl font-semibold">
            {aktifPersoneller.length}
          </p>
        </div>
        <div className="kart p-4">
          <p className="text-sm text-[var(--muted)]">Bugün geldi</p>
          <p className="mt-2 font-display text-2xl font-semibold">
            {gelenSayisi}
          </p>
        </div>
        <div className="kart p-4">
          <p className="text-sm text-[var(--muted)]">Yemek yiyen</p>
          <p className="mt-2 font-display text-2xl font-semibold">
            {yemekSayisi}
          </p>
        </div>
        <div className="kart border-amber-200 bg-amber-50/60 p-4">
          <p className="text-sm text-amber-800">Bekleyen ödeme</p>
          <p className="mt-2 font-display text-2xl font-semibold text-amber-900">
            {bekleyenOdeme}
          </p>
        </div>
      </div>

      <div className="kart flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Puantaj tarihi</label>
          <input
            className="input"
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
          />
        </div>
        <p className="pb-2 text-sm text-[var(--muted)]">
          Seçili gün için geldi/gelmedi ve yemek durumu kaydedilir.
        </p>
      </div>

      {yazabilir && (
        <form
          onSubmit={ekle}
          className="kart grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <input
            className="input"
            placeholder="Ad Soyad"
            value={yeni.ad_soyad}
            onChange={(e) => yeniAlan("ad_soyad", e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Pozisyon"
            value={yeni.pozisyon}
            onChange={(e) => yeniAlan("pozisyon", e.target.value)}
          />
          <input
            className="input"
            placeholder="Telefon"
            value={yeni.telefon}
            onChange={(e) => yeniAlan("telefon", e.target.value)}
          />
          <input
            className="input"
            type="email"
            placeholder="E-posta"
            value={yeni.email}
            onChange={(e) => yeniAlan("email", e.target.value)}
          />
          <input
            className="input"
            placeholder="Günlük ücret"
            type="number"
            value={yeni.gunluk_ucret}
            onChange={(e) => yeniAlan("gunluk_ucret", e.target.value)}
          />
          <input
            className="input"
            placeholder="Notlar"
            value={yeni.notlar}
            onChange={(e) => yeniAlan("notlar", e.target.value)}
          />
          <button type="submit" className="btn-primary">
            Şantiye Personeli Ekle
          </button>
        </form>
      )}

      {mesaj && (
        <p className="rounded-xl bg-perre-50 px-3 py-2 text-sm text-perre-800">
          {mesaj}
        </p>
      )}

      <div className="space-y-4">
        {personeller.map((p) => {
          const form = duzenlenenler[p.id] ?? {
            ad_soyad: p.ad_soyad,
            pozisyon: p.pozisyon ?? "",
            telefon: p.telefon ?? "",
            email: p.email ?? "",
            gunluk_ucret:
              p.gunluk_ucret != null ? String(p.gunluk_ucret) : "",
            notlar: p.notlar ?? "",
          };
          const puantaj = puantajMap.get(p.id);
          const sonOdeme = sonOdemeMap.get(p.id);
          const odemeAldi = sonOdeme?.odendi_mi === true;

          return (
            <div
              key={p.id}
              className={`kart p-5 ${p.aktif ? "" : "opacity-60"}`}
            >
              <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      className="input font-semibold"
                      value={form.ad_soyad}
                      onChange={(e) =>
                        alanDegistir(p.id, "ad_soyad", e.target.value)
                      }
                      disabled={!yazabilir}
                    />
                    <input
                      className="input"
                      placeholder="Pozisyon"
                      value={form.pozisyon}
                      onChange={(e) =>
                        alanDegistir(p.id, "pozisyon", e.target.value)
                      }
                      disabled={!yazabilir}
                    />
                    <input
                      className="input"
                      placeholder="Telefon"
                      value={form.telefon}
                      onChange={(e) =>
                        alanDegistir(p.id, "telefon", e.target.value)
                      }
                      disabled={!yazabilir}
                    />
                    <input
                      className="input"
                      type="email"
                      placeholder="E-posta"
                      value={form.email}
                      onChange={(e) =>
                        alanDegistir(p.id, "email", e.target.value)
                      }
                      disabled={!yazabilir}
                    />
                    <input
                      className="input"
                      type="number"
                      placeholder="Günlük ücret"
                      value={form.gunluk_ucret}
                      onChange={(e) =>
                        alanDegistir(p.id, "gunluk_ucret", e.target.value)
                      }
                      disabled={!yazabilir}
                    />
                    <input
                      className="input"
                      placeholder="Notlar"
                      value={form.notlar}
                      onChange={(e) =>
                        alanDegistir(p.id, "notlar", e.target.value)
                      }
                      disabled={!yazabilir}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-perre-50 px-3 py-1 text-xs text-perre-800">
                      Günlük: {paraFormat(Number(form.gunluk_ucret || 0))}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        p.aktif
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-red-50 text-red-800"
                      }`}
                    >
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
                      onClick={() =>
                        puantajKaydet(
                          p.id,
                          "geldi_mi",
                          !(puantaj?.geldi_mi ?? false)
                        )
                      }
                      className={
                        puantaj?.geldi_mi ? "btn-primary" : "btn-secondary"
                      }
                    >
                      {puantaj?.geldi_mi ? "Geldi" : "Gelmedi"}
                    </button>
                    <button
                      type="button"
                      disabled={!yazabilir || !(puantaj?.geldi_mi ?? false)}
                      onClick={() =>
                        puantajKaydet(
                          p.id,
                          "yemek_yedi_mi",
                          !(puantaj?.yemek_yedi_mi ?? false)
                        )
                      }
                      className={
                        puantaj?.yemek_yedi_mi
                          ? "btn-primary"
                          : "btn-secondary"
                      }
                    >
                      {puantaj?.yemek_yedi_mi
                        ? "Yemek yedi"
                        : "Yemek yemedi"}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--line)] p-4">
                  <p className="mb-3 font-display font-semibold">Ödeme</p>
                  <p
                    className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                      odemeAldi
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {odemeAldi
                      ? "Ödeme aldı"
                      : "Ödeme almadı / bekliyor"}
                  </p>
                  {sonOdeme && (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Son kayıt: {paraFormat(Number(sonOdeme.tutar))} ·{" "}
                      {tarihFormat(sonOdeme.created_at)}
                    </p>
                  )}
                  {yazabilir && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!sonOdeme?.odendi_mi && sonOdeme ? (
                        <button
                          type="button"
                          className="btn-primary text-xs"
                          onClick={() => odendi(sonOdeme.id)}
                        >
                          Ödeme aldı işaretle
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          onClick={() => maasOdemeKaydiAc(p)}
                        >
                          Maaş ödeme kaydı aç
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {yazabilir && (
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--line)] pt-4">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => personelGuncelle(p.id)}
                  >
                    Bilgileri Kaydet
                  </button>
                  {p.aktif && (
                    <button
                      type="button"
                      className="text-sm font-semibold text-red-700"
                      onClick={() => pasifYap(p.id)}
                    >
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
            Bu şantiyede personel yok.
          </div>
        )}
      </div>
    </div>
  );
}
