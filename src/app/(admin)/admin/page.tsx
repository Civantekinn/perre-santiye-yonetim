import { paraFormat, requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { GelirGiderGrafiklerLazy } from "@/components/admin/GelirGiderGrafiklerLazy";
import type { GelirGider, SirketFinans, ToplamMaliyet } from "@/lib/types";

const GRAFIK_KAYIT_LIMITI = 365;

export default async function AdminHome() {
  await requireRol(["admin"]);
  const supabase = createClient();

  const [
    { count: kullanici },
    { count: santiye },
    { count: ofisPersonel },
    { count: depoMalzeme },
    { count: bekleyenEksik },
    { data: maliyetler },
    { data: gelirGider },
    { data: ofisMasraflar },
    { data: ofisOdemeler },
    { data: depoHareketler },
    { data: sirketOzet },
  ] = await Promise.all([
    supabase.from("profiller").select("id", { count: "exact", head: true }),
    supabase
      .from("santiyeler")
      .select("id", { count: "exact", head: true })
      .eq("aktif", true),
    supabase
      .from("ofis_personeller")
      .select("id", { count: "exact", head: true })
      .eq("aktif", true),
    supabase
      .from("depo_malzemeler")
      .select("id", { count: "exact", head: true })
      .eq("aktif", true),
    supabase
      .from("malzeme_hareket")
      .select("id", { count: "exact", head: true })
      .eq("tip", "eksik")
      .eq("durum", "bekliyor")
      .eq("silindi", false),
    supabase.from("toplam_maliyet_raporu").select("*"),
    supabase
      .from("gelir_gider")
      .select("*")
      .eq("silindi", false)
      .order("tarih", { ascending: false })
      .limit(GRAFIK_KAYIT_LIMITI),
    supabase
      .from("ofis_masraflar")
      .select("tip, kategori, tutar, tarih")
      .eq("silindi", false)
      .order("tarih", { ascending: false })
      .limit(GRAFIK_KAYIT_LIMITI),
    supabase
      .from("ofis_odemeler")
      .select("tutar, odeme_tarihi")
      .eq("silindi", false)
      .order("odeme_tarihi", { ascending: false })
      .limit(GRAFIK_KAYIT_LIMITI),
    supabase
      .from("depo_hareket")
      .select("tip, tutar, tarih")
      .eq("silindi", false)
      .in("tip", ["giris", "fire"])
      .order("tarih", { ascending: false })
      .limit(GRAFIK_KAYIT_LIMITI),
    supabase.from("sirket_finans_ozeti").select("*").maybeSingle(),
  ]);

  const maliyetListe = (maliyetler ?? []) as ToplamMaliyet[];
  const gelirListe = (gelirGider ?? []) as GelirGider[];
  const ekFinansKayitlari = [
    ...((ofisMasraflar ?? []) as {
      tip: "gelir" | "gider";
      kategori: string | null;
      tutar: number;
      tarih: string;
    }[]).map((k) => ({ ...k, kategori: k.kategori ?? "Ofis" })),
    ...((ofisOdemeler ?? []) as {
      tutar: number;
      odeme_tarihi: string | null;
    }[]).map((k) => ({
      tip: "gider" as const,
      kategori: "Ofis maaş",
      tutar: Number(k.tutar),
      tarih: k.odeme_tarihi ?? "",
    })),
    ...((depoHareketler ?? []) as { tip: string; tutar: number; tarih: string }[]).map(
      (k) => ({
        tip: "gider" as const,
        kategori: k.tip === "fire" ? "Depo fire" : "Depo stok girişi",
        tutar: Number(k.tutar),
        tarih: k.tarih,
      })
    ),
  ];

  const hesaplananGelir =
    maliyetListe.reduce((s, r) => s + Number(r.genel_gelir), 0) +
    ekFinansKayitlari
      .filter((k) => k.tip === "gelir")
      .reduce((s, k) => s + Number(k.tutar), 0);
  const hesaplananGider =
    maliyetListe.reduce(
      (s, r) =>
        s +
        Number(r.iscilik_maliyeti) +
        Number(r.malzeme_maliyeti) +
        Number(r.genel_gider),
      0
    ) +
    ekFinansKayitlari
      .filter((k) => k.tip === "gider")
      .reduce((s, k) => s + Number(k.tutar), 0);

  const ozet = sirketOzet as SirketFinans | null;
  const toplamGelir =
    ozet?.toplam_gelir != null ? Number(ozet.toplam_gelir) : hesaplananGelir;
  const toplamGider =
    ozet?.toplam_gider != null ? Number(ozet.toplam_gider) : hesaplananGider;
  const net =
    ozet?.net != null ? Number(ozet.net) : toplamGelir - toplamGider;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-perre-900">
          Ana Admin
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Bölüm hareketleri, gelir-gider şeması ve şantiye özeti
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="kart p-5">
          <p className="text-sm text-[var(--muted)]">Kullanıcı</p>
          <p className="mt-2 font-display text-2xl font-semibold">
            {kullanici ?? 0}
          </p>
        </div>
        <div className="kart p-5">
          <p className="text-sm text-[var(--muted)]">Aktif şantiye</p>
          <p className="mt-2 font-display text-2xl font-semibold">
            {santiye ?? 0}
          </p>
        </div>
        <div className="kart border-emerald-200 bg-emerald-50/50 p-5">
          <p className="text-sm text-emerald-800">Toplam gelir</p>
          <p className="mt-2 font-display text-2xl font-semibold text-emerald-900">
            {paraFormat(toplamGelir)}
          </p>
        </div>
        <div className="kart border-amber-200 bg-amber-50/50 p-5">
          <p className="text-sm text-amber-800">Toplam gider</p>
          <p className="mt-2 font-display text-2xl font-semibold text-amber-900">
            {paraFormat(toplamGider)}
          </p>
        </div>
        <div className="kart p-5">
          <p className="text-sm text-[var(--muted)]">Ofis personeli</p>
          <p className="mt-2 font-display text-2xl font-semibold">
            {ofisPersonel ?? 0}
          </p>
        </div>
        <div className="kart p-5">
          <p className="text-sm text-[var(--muted)]">Depo malzemesi</p>
          <p className="mt-2 font-display text-2xl font-semibold">
            {depoMalzeme ?? 0}
          </p>
        </div>
        <div className="kart border-red-200 bg-red-50/50 p-5">
          <p className="text-sm text-red-800">Bekleyen eksik</p>
          <p className="mt-2 font-display text-2xl font-semibold text-red-900">
            {bekleyenEksik ?? 0}
          </p>
          <Link
            href="/admin/onaylar"
            prefetch={false}
            className="mt-2 inline-block text-xs font-medium text-red-700 underline"
          >
            Onaylar →
          </Link>
        </div>
        <div className="kart p-5">
          <p className="text-sm text-[var(--muted)]">Net</p>
          <p className="mt-2 font-display text-2xl font-semibold">
            {paraFormat(net)}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">
            Gelir / Gider — Şema & Grafikler
          </h2>
          <Link
            href="/admin/hareketler?bolum=gelir_gider"
            prefetch={false}
            className="text-sm font-medium text-perre-700 underline"
          >
            Gelir-gider hareketleri →
          </Link>
        </div>
        <GelirGiderGrafiklerLazy
          maliyetler={maliyetListe}
          kayitlar={gelirListe}
          ekKayitlar={ekFinansKayitlari}
        />
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/finans"
          prefetch={false}
          className="kart p-5 font-medium hover:shadow-md"
        >
          Şirket finansı →
        </Link>
        <Link
          href="/admin/onaylar"
          prefetch={false}
          className="kart p-5 font-medium hover:shadow-md"
        >
          Onaylar
          {(bekleyenEksik ?? 0) > 0 ? ` (${bekleyenEksik})` : ""} →
        </Link>
        <Link
          href="/admin/hareketler"
          prefetch={false}
          className="kart p-5 font-medium hover:shadow-md"
        >
          Bölüm hareketleri (detay) →
        </Link>
        <Link
          href="/admin/hesaplar"
          prefetch={false}
          className="kart p-5 font-medium hover:shadow-md"
        >
          Hesaplar & Roller →
        </Link>
        <Link
          href="/admin/santiyeler"
          prefetch={false}
          className="kart p-5 font-medium hover:shadow-md"
        >
          Şantiyeler →
        </Link>
        <Link
          href="/admin/depo"
          prefetch={false}
          className="kart p-5 font-medium hover:shadow-md"
        >
          Depo görüntüle →
        </Link>
        <Link
          href="/admin/audit"
          prefetch={false}
          className="kart p-5 font-medium hover:shadow-md"
        >
          Denetim (şantiye log) →
        </Link>
        <Link
          href="/admin/yedekleme"
          prefetch={false}
          className="kart p-5 font-medium hover:shadow-md"
        >
          Yedekleme →
        </Link>
      </div>
    </div>
  );
}
