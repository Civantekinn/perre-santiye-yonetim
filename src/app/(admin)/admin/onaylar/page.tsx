import { paraFormat, requireRol, tarihFormat } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OnayAksiyonlari } from "@/components/OnayAksiyonlari";
import Link from "next/link";

function tekilAd(v: unknown): string {
  if (!v) return "—";
  if (Array.isArray(v)) return (v[0] as { ad?: string } | undefined)?.ad ?? "—";
  return (v as { ad?: string }).ad ?? "—";
}

function tekilAdSoyad(v: unknown): string {
  if (!v) return "—";
  if (Array.isArray(v)) return (v[0] as { ad_soyad?: string } | undefined)?.ad_soyad ?? "—";
  return (v as { ad_soyad?: string }).ad_soyad ?? "—";
}

export default async function AdminOnaylarPage() {
  await requireRol(["admin"]);
  const supabase = createClient();

  const [
    { data: isci },
    { data: ofisOdeme },
    { data: ofisMasraf },
    { data: gelirGider },
    { data: depo },
    { data: eksik },
  ] = await Promise.all([
    supabase.from("isci_maas_odemeleri").select("id, tutar, created_at, personeller(ad_soyad), santiyeler(ad)").eq("silindi", false).eq("onay_durumu", "bekliyor").order("created_at", { ascending: false }).limit(50),
    supabase.from("ofis_odemeler").select("id, tutar, created_at, ofis_personeller(ad_soyad)").eq("silindi", false).eq("onay_durumu", "bekliyor").order("created_at", { ascending: false }).limit(50),
    supabase.from("ofis_masraflar").select("id, tip, kategori, tutar, tarih, aciklama").eq("silindi", false).eq("onay_durumu", "bekliyor").order("tarih", { ascending: false }).limit(50),
    supabase.from("gelir_gider").select("id, tip, kategori, tutar, tarih, santiyeler(ad)").eq("silindi", false).eq("onay_durumu", "bekliyor").order("tarih", { ascending: false }).limit(50),
    supabase.from("depo_hareket").select("id, tip, miktar, tutar, tarih, santiye_id, depo_malzemeler(ad), santiyeler(ad)").eq("silindi", false).eq("onay_durumu", "bekliyor").order("tarih", { ascending: false }).limit(50),
    supabase.from("malzeme_hareket").select("id, miktar, tarih, aciklama, malzemeler(ad, santiyeler:santiye_id(ad))").eq("tip", "eksik").eq("durum", "bekliyor").eq("silindi", false).order("tarih", { ascending: false }).limit(50),
  ]);

  const gruplar = [
    { baslik: "İşçi ödemeleri", satirlar: (isci ?? []).map((r) => ({ id: r.id, kaynak: "isci_maas" as const, metin: `${tekilAdSoyad(r.personeller)} · ${tekilAd(r.santiyeler)} · ${paraFormat(Number(r.tutar))}`, tarih: r.created_at })) },
    { baslik: "Ofis ödemeleri", satirlar: (ofisOdeme ?? []).map((r) => ({ id: r.id, kaynak: "ofis_odeme" as const, metin: `${tekilAdSoyad(r.ofis_personeller)} · ${paraFormat(Number(r.tutar))}`, tarih: r.created_at })) },
    { baslik: "Ofis masrafları", satirlar: (ofisMasraf ?? []).map((r) => ({ id: r.id, kaynak: "ofis_masraf" as const, metin: `${r.tip} · ${r.kategori ?? "—"} · ${paraFormat(Number(r.tutar))}`, tarih: r.tarih })) },
    { baslik: "Şantiye gelir / gider", satirlar: (gelirGider ?? []).map((r) => ({ id: r.id, kaynak: "gelir_gider" as const, metin: `${tekilAd(r.santiyeler)} · ${r.tip} · ${paraFormat(Number(r.tutar))}`, tarih: r.tarih })) },
    { baslik: "Depo hareketleri / transfer", satirlar: (depo ?? []).map((r) => { const s = tekilAd(r.santiyeler); return { id: r.id, kaynak: "depo_hareket" as const, metin: `${tekilAd(r.depo_malzemeler)} · ${r.tip} · ${r.miktar}${s !== "—" ? ` → ${s}` : ""}`, tarih: r.tarih }; }) },
    { baslik: "Eksik malzeme talepleri", satirlar: (eksik ?? []).map((r) => { const m = Array.isArray(r.malzemeler) ? r.malzemeler[0] : r.malzemeler; const row = m as { ad?: string; santiyeler?: unknown } | null; return { id: r.id, kaynak: "eksik" as const, metin: `${tekilAd(row?.santiyeler)} · ${row?.ad ?? "—"} · ${r.miktar}${r.aciklama ? ` · ${r.aciklama}` : ""}`, tarih: r.tarih }; }) },
  ];

  const toplamBekleyen = gruplar.reduce((s, g) => s + g.satirlar.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-perre-900">Onay Bekleyenler</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Ödeme, masraf, eksik ve depo transfer onayları · {toplamBekleyen} kayıt</p>
      </div>
      {toplamBekleyen === 0 && (
        <div className="kart p-8 text-center text-[var(--muted)]">Bekleyen onay yok. <Link href="/admin" className="text-perre-700 underline">Özet</Link></div>
      )}
      {gruplar.map((g) =>
        g.satirlar.length === 0 ? null : (
          <section key={g.baslik} className="kart overflow-hidden">
            <div className="border-b border-[var(--line)] bg-perre-50 px-5 py-3">
              <h2 className="font-display font-semibold">{g.baslik} <span className="text-sm font-normal text-[var(--muted)]">({g.satirlar.length})</span></h2>
            </div>
            <ul className="divide-y divide-[var(--line)]">
              {g.satirlar.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{s.metin}</p>
                    <p className="text-xs text-[var(--muted)]">{tarihFormat(s.tarih)}</p>
                  </div>
                  <OnayAksiyonlari kaynak={s.kaynak} id={s.id} />
                </li>
              ))}
            </ul>
          </section>
        )
      )}
    </div>
  );
}
