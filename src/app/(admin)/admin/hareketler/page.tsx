import { paraFormat, requireRol, tarihFormat } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BelgeLinkleri } from "@/components/BelgeLinkleri";
import {
  Activity,
  Package,
  Users,
  Wallet,
  ClipboardList,
  ArrowLeftRight,
  Building2,
  Warehouse,
} from "lucide-react";

const BOLUMLER = [
  { id: "hepsi", etiket: "Hepsi", ikon: Activity },
  { id: "puantaj", etiket: "Puantaj", ikon: ClipboardList },
  { id: "malzeme", etiket: "Malzeme", ikon: Package },
  { id: "odeme", etiket: "İşçi Ödemeleri", ikon: Wallet },
  { id: "gelir_gider", etiket: "Gelir-Gider", ikon: ArrowLeftRight },
  { id: "personel", etiket: "Personel", ikon: Users },
  { id: "ofis", etiket: "Ofis", ikon: Building2 },
  { id: "depo", etiket: "Depo", ikon: Warehouse },
] as const;

type Bolum = (typeof BOLUMLER)[number]["id"];

type HareketSatir = {
  id: string;
  bolum: Bolum;
  baslik: string;
  detay: string;
  tutar?: number | null;
  tarih: string;
  santiye?: string | null;
  yapan?: string | null;
  fatura_url?: string | null;
  resim_url?: string | null;
  belge_url?: string | null;
};

export default async function AdminHareketlerPage({
  searchParams,
}: {
  searchParams: { bolum?: string };
}) {
  await requireRol(["admin"]);
  const supabase = createClient();
  const bolum = (searchParams.bolum as Bolum) || "hepsi";

  const [
    { data: puantaj },
    { data: malzemeler },
    { data: isGorselleri },
    { data: odemeler },
    { data: gelirGider },
    { data: personeller },
    { data: ofisMasraflar },
    { data: ofisPuantaj },
    { data: ofisOdemeler },
    { data: depoHareketler },
  ] = await Promise.all([
    supabase
      .from("puantaj")
      .select(
        "id, tarih, geldi_mi, yemek_yedi_mi, created_at, personeller(ad_soyad, santiyeler:santiye_id(ad)), profiller:giren_kullanici_id(ad_soyad)"
      )
      .eq("silindi", false)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("malzeme_hareket")
      .select(
        "id, tip, miktar, birim_fiyat, tutar, tarih, created_at, durum, fatura_url, resim_url, belge_url, malzemeler(ad, tur, birim, santiyeler:santiye_id(ad)), profiller:kaydeden_kullanici_id(ad_soyad)"
      )
      .eq("silindi", false)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("santiye_is_gorselleri")
      .select("id, baslik, aciklama, tarih, created_at, santiyeler(ad)")
      .eq("silindi", false)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("isci_maas_odemeleri")
      .select(
        "id, tutar, odeme_tarihi, odendi_mi, created_at, personeller(ad_soyad), santiyeler(ad), profiller:kaydeden_kullanici_id(ad_soyad)"
      )
      .eq("silindi", false)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("gelir_gider")
      .select(
        "id, tip, kategori, tutar, tarih, aciklama, created_at, santiyeler(ad)"
      )
      .eq("silindi", false)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("personeller")
      .select("id, ad_soyad, pozisyon, gunluk_ucret, created_at, santiyeler(ad)")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("ofis_masraflar")
      .select("id, tip, kategori, tutar, tarih, aciklama, created_at")
      .eq("silindi", false)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("ofis_puantaj")
      .select("id, tarih, geldi_mi, yemek_yedi_mi, created_at, ofis_personeller(ad_soyad)")
      .eq("silindi", false)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("ofis_odemeler")
      .select("id, tutar, odendi_mi, odeme_tarihi, created_at, ofis_personeller(ad_soyad)")
      .eq("silindi", false)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("depo_hareket")
      .select("id, tip, miktar, tutar, tarih, aciklama, created_at, depo_malzemeler(ad, birim), santiyeler(ad)")
      .eq("silindi", false)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const satirlar: HareketSatir[] = [];

  for (const p of puantaj ?? []) {
    const pers = p.personeller as
      | { ad_soyad?: string; santiyeler?: { ad?: string } | null }
      | null;
    satirlar.push({
      id: `puantaj-${p.id}`,
      bolum: "puantaj",
      baslik: pers?.ad_soyad ?? "Personel",
      detay: `${p.geldi_mi ? "Geldi" : "Gelmedi"}${
        p.yemek_yedi_mi ? " · Yemek" : ""
      }`,
      tarih: p.created_at ?? p.tarih,
      santiye: pers?.santiyeler?.ad ?? null,
      yapan: (p.profiller as { ad_soyad?: string } | null)?.ad_soyad ?? null,
    });
  }

  for (const m of malzemeler ?? []) {
    const mal = m.malzemeler as
      | {
          ad?: string;
          tur?: string | null;
          birim?: string | null;
          santiyeler?: { ad?: string } | null;
        }
      | null;
    satirlar.push({
      id: `malzeme-${m.id}`,
      bolum: "malzeme",
      baslik: `${mal?.ad ?? "Malzeme"}${mal?.tur ? ` · ${mal.tur}` : ""}`,
      detay: `${m.tip} · ${m.miktar} ${mal?.birim ?? "adet"}${
        m.durum === "bekliyor" ? " · Bekliyor" : ""
      }`,
      tutar: Number(m.tutar),
      tarih: m.created_at ?? m.tarih,
      santiye: mal?.santiyeler?.ad ?? null,
      yapan: (m.profiller as { ad_soyad?: string } | null)?.ad_soyad ?? null,
      fatura_url: m.fatura_url,
      resim_url: m.resim_url,
      belge_url: m.belge_url,
    });
  }

  for (const g of isGorselleri ?? []) {
    satirlar.push({
      id: `is-gorseli-${g.id}`,
      bolum: "malzeme",
      baslik: `İş görseli · ${g.baslik}`,
      detay: g.aciklama ?? "Yapılan iş resmi eklendi",
      tarih: g.created_at ?? g.tarih,
      santiye: (g.santiyeler as { ad?: string } | null)?.ad ?? null,
    });
  }

  for (const o of odemeler ?? []) {
    satirlar.push({
      id: `odeme-${o.id}`,
      bolum: "odeme",
      baslik: (o.personeller as { ad_soyad?: string } | null)?.ad_soyad ?? "Ödeme",
      detay: o.odendi_mi ? "Ödendi" : "Bekliyor",
      tutar: Number(o.tutar),
      tarih: o.created_at ?? o.odeme_tarihi ?? "",
      santiye: (o.santiyeler as { ad?: string } | null)?.ad ?? null,
      yapan: (o.profiller as { ad_soyad?: string } | null)?.ad_soyad ?? null,
    });
  }

  for (const g of gelirGider ?? []) {
    satirlar.push({
      id: `gg-${g.id}`,
      bolum: "gelir_gider",
      baslik: `${g.tip === "gelir" ? "Gelir" : "Gider"}${
        g.kategori ? ` · ${g.kategori}` : ""
      }`,
      detay: g.aciklama ?? "—",
      tutar: Number(g.tutar),
      tarih: g.created_at ?? g.tarih,
      santiye: (g.santiyeler as { ad?: string } | null)?.ad ?? null,
    });
  }

  for (const p of personeller ?? []) {
    satirlar.push({
      id: `personel-${p.id}`,
      bolum: "personel",
      baslik: p.ad_soyad,
      detay: `${p.pozisyon ?? "Pozisyon yok"}${
        p.gunluk_ucret != null ? ` · ${paraFormat(Number(p.gunluk_ucret))}/gün` : ""
      }`,
      tarih: p.created_at,
      santiye: (p.santiyeler as { ad?: string } | null)?.ad ?? null,
    });
  }

  for (const m of ofisMasraflar ?? []) {
    satirlar.push({
      id: `ofis-masraf-${m.id}`,
      bolum: "ofis",
      baslik: `${m.tip === "gelir" ? "Ofis Gelir" : "Ofis Gider"}${
        m.kategori ? ` · ${m.kategori}` : ""
      }`,
      detay: m.aciklama ?? "—",
      tutar: Number(m.tutar),
      tarih: m.created_at ?? m.tarih,
      santiye: "Ofis",
    });
  }

  for (const p of ofisPuantaj ?? []) {
    satirlar.push({
      id: `ofis-puantaj-${p.id}`,
      bolum: "ofis",
      baslik: (p.ofis_personeller as { ad_soyad?: string } | null)?.ad_soyad ?? "Ofis personeli",
      detay: `${p.geldi_mi ? "Geldi" : "Gelmedi"}${
        p.yemek_yedi_mi ? " · Yemek yedi" : " · Yemek yemedi"
      }`,
      tarih: p.created_at ?? p.tarih,
      santiye: "Ofis puantaj",
    });
  }

  for (const o of ofisOdemeler ?? []) {
    satirlar.push({
      id: `ofis-odeme-${o.id}`,
      bolum: "ofis",
      baslik: (o.ofis_personeller as { ad_soyad?: string } | null)?.ad_soyad ?? "Ofis ödemesi",
      detay: o.odendi_mi ? "Ödendi" : "Bekliyor",
      tutar: Number(o.tutar),
      tarih: o.created_at ?? o.odeme_tarihi ?? "",
      santiye: "Ofis",
    });
  }

  for (const d of depoHareketler ?? []) {
    const malzeme = d.depo_malzemeler as { ad?: string; birim?: string | null } | null;
    satirlar.push({
      id: `depo-${d.id}`,
      bolum: "depo",
      baslik: malzeme?.ad ?? "Depo malzemesi",
      detay: `${d.tip} · ${d.miktar} ${malzeme?.birim ?? "adet"}${
        d.aciklama ? ` · ${d.aciklama}` : ""
      }`,
      tutar: Number(d.tutar),
      tarih: d.created_at ?? d.tarih,
      santiye: (d.santiyeler as { ad?: string } | null)?.ad ?? "Depo",
    });
  }

  satirlar.sort(
    (a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime()
  );

  const liste =
    bolum === "hepsi" ? satirlar : satirlar.filter((s) => s.bolum === bolum);

  const sayim = Object.fromEntries(
    BOLUMLER.map((b) => [
      b.id,
      b.id === "hepsi"
        ? satirlar.length
        : satirlar.filter((s) => s.bolum === b.id).length,
    ])
  ) as Record<Bolum, number>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Bölüm Hareketleri
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Puantaj, malzeme, ödeme, gelir-gider, personel, ofis ve depo hareketlerini
          ayrı ayrı inceleyin
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {BOLUMLER.map((b) => {
          const Icon = b.ikon;
          const aktif = bolum === b.id;
          return (
            <Link
              key={b.id}
              href={
                b.id === "hepsi"
                  ? "/admin/hareketler"
                  : `/admin/hareketler?bolum=${b.id}`
              }
              prefetch={false}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                aktif
                  ? "bg-perre-800 text-white"
                  : "border border-[var(--line)] bg-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {b.etiket}
              <span
                className={`rounded-full px-1.5 text-xs ${
                  aktif ? "bg-white/20" : "bg-perre-50"
                }`}
              >
                {sayim[b.id]}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="space-y-3">
        {liste.map((s) => (
          <div key={s.id} className="kart p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  {BOLUMLER.find((b) => b.id === s.bolum)?.etiket}
                  {s.santiye ? ` · ${s.santiye}` : ""}
                </p>
                <p className="mt-1 font-semibold">{s.baslik}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{s.detay}</p>
                {(s.fatura_url || s.resim_url || s.belge_url) && (
                  <BelgeLinkleri
                    faturaUrl={s.fatura_url}
                    resimUrl={s.resim_url}
                    belgeUrl={s.belge_url}
                  />
                )}
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {tarihFormat(s.tarih)}{" "}
                  {new Date(s.tarih).toLocaleTimeString("tr-TR")}
                  {s.yapan ? ` · ${s.yapan}` : ""}
                </p>
              </div>
              {s.tutar != null && (
                <p className="font-display text-lg font-semibold">
                  {paraFormat(Number(s.tutar))}
                </p>
              )}
            </div>
          </div>
        ))}
        {liste.length === 0 && (
          <div className="kart p-10 text-center text-[var(--muted)]">
            Bu bölümde hareket yok.
          </div>
        )}
      </div>
    </div>
  );
}
