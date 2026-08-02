"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Rol, SantiyeIsGorseli } from "@/lib/types";
import { bugunISO, tarihFormat } from "@/lib/client-utils";
import { imzaliUrlHaritasi } from "@/lib/signed-url";

const BUCKET = "santiye-is-gorselleri";

export function IsGorselleriSekmesi({
  santiyeId,
  santiyeAd,
  gorseller,
  kullaniciId,
  rol,
}: {
  santiyeId: string;
  santiyeAd: string;
  gorseller: SantiyeIsGorseli[];
  kullaniciId: string;
  rol: Rol;
}) {
  const router = useRouter();
  const yazabilir = rol === "admin" || rol === "santiye_sefi" || rol === "saha_gorevlisi";
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [tarih, setTarih] = useState(bugunISO());
  const [resim, setResim] = useState<File | null>(null);
  const [linkler, setLinkler] = useState<Record<string, string>>({});
  const [mesaj, setMesaj] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    const paths = gorseller.map((g) => g.resim_path);
    if (!paths.some(Boolean)) return;
    const supabase = createClient();
    let iptal = false;

    async function linkHazirla() {
      const harita = await imzaliUrlHaritasi(supabase, BUCKET, paths);
      if (!iptal) setLinkler(harita);
    }

    linkHazirla();
    return () => {
      iptal = true;
    };
  }, [gorseller]);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!resim) {
      setMesaj("Resim seçin");
      return;
    }
    setYukleniyor(true);
    setMesaj("");
    const supabase = createClient();
    const guvenliAd = resim.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const santiyeKlasoru =
      santiyeAd.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") ||
      "santiye";
    const klasor = `${santiyeId}/${santiyeKlasoru}`;
    const yol = `${klasor}/is-gorselleri/${Date.now()}-${guvenliAd}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(yol, resim);
    if (upErr) {
      setYukleniyor(false);
      setMesaj("Resim yüklenemedi: " + upErr.message);
      return;
    }

    const { error } = await supabase.from("santiye_is_gorselleri").insert({
      santiye_id: santiyeId,
      baslik,
      aciklama: aciklama || null,
      tarih,
      resim_path: yol,
      kaydeden_kullanici_id: kullaniciId,
    });
    setYukleniyor(false);
    if (error) {
      setMesaj("Kayıt oluşturulamadı: " + error.message);
      return;
    }

    setBaslik("");
    setAciklama("");
    setResim(null);
    setMesaj("Yapılan iş görseli kaydedildi");
    router.refresh();
  }

  async function sil(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("santiye_is_gorselleri")
      .update({ silindi: true })
      .eq("id", id);
    if (error) {
      setMesaj(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-perre-900">
          Şantiye İş Görselleri
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Bu alana eklenen resimler sadece bu şantiyenin klasöründe tutulur.
        </p>
      </div>
      {yazabilir && (
        <form onSubmit={kaydet} className="kart grid gap-3 p-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="label">Yapılan iş</label>
            <input
              className="input"
              placeholder="Örn. Kalıp montajı, sıva, elektrik hattı"
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Tarih</label>
            <input className="input" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} required />
          </div>
          <div>
            <label className="label">Resim</label>
            <input className="input" type="file" accept="image/*" onChange={(e) => setResim(e.target.files?.[0] ?? null)} required />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <label className="label">Açıklama</label>
            <input
              className="input"
              placeholder="İşin durumu / kısa not"
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary md:col-span-2 lg:col-span-1" disabled={yukleniyor}>
            {yukleniyor ? "Yükleniyor..." : "İş Resmi Ekle"}
          </button>
        </form>
      )}

      {mesaj && <p className="rounded-xl bg-perre-50 px-3 py-2 text-sm text-perre-800">{mesaj}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {gorseller.map((g) => (
          <div key={g.id} className="kart overflow-hidden">
            {linkler[g.resim_path] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={linkler[g.resim_path]} alt={g.baslik} className="h-56 w-full object-cover" />
            ) : (
              <div className="h-56 animate-pulse bg-perre-50" />
            )}
            <div className="space-y-2 p-4">
              <p className="text-xs text-[var(--muted)]">{tarihFormat(g.tarih)}</p>
              <h3 className="font-display text-lg font-semibold">{g.baslik}</h3>
              {g.aciklama && <p className="text-sm text-[var(--muted)]">{g.aciklama}</p>}
              {(rol === "admin" || rol === "santiye_sefi") && (
                <button type="button" className="text-xs font-semibold text-red-700" onClick={() => sil(g.id)}>
                  Kaydı kaldır
                </button>
              )}
            </div>
          </div>
        ))}
        {gorseller.length === 0 && (
          <div className="kart p-10 text-center text-[var(--muted)] md:col-span-2 xl:col-span-3">
            Bu şantiye için iş görseli eklenmemiş.
          </div>
        )}
      </div>
    </div>
  );
}
