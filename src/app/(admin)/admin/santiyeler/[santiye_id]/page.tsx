import { bugunISO, paraFormat, requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  GelirGider,
  IsciMaasOdeme,
  Malzeme,
  MalzemeHareket,
  Personel,
  Puantaj,
  Santiye,
  SantiyeIsGorseli,
  ToplamMaliyet,
} from "@/lib/types";
import { notFound } from "next/navigation";
import { SantiyePanel } from "@/components/santiye/SantiyePanel";

export default async function AdminSantiyeDetayPage({
  params,
}: {
  params: { santiye_id: string };
}) {
  const { santiye_id } = params;
  const { profil, user } = await requireRol(["admin"]);
  const supabase = createClient();

  const [
    { data: santiye },
    { data: maliyet },
    { data: personeller },
    { data: malzemeler },
    { data: maaslar },
    { data: gelirGider },
    { data: isGorselleri },
  ] = await Promise.all([
    supabase.from("santiyeler").select("*").eq("id", santiye_id).single(),
    supabase
      .from("toplam_maliyet_raporu")
      .select("*")
      .eq("santiye_id", santiye_id)
      .maybeSingle(),
    supabase
      .from("personeller")
      .select("*")
      .eq("santiye_id", santiye_id)
      .eq("aktif", true)
      .order("ad_soyad"),
    supabase
      .from("malzemeler")
      .select("*")
      .eq("santiye_id", santiye_id)
      .order("ad"),
    supabase
      .from("isci_maas_odemeleri")
      .select("*, personeller(*)")
      .eq("santiye_id", santiye_id)
      .eq("silindi", false)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("gelir_gider")
      .select("*")
      .eq("santiye_id", santiye_id)
      .eq("silindi", false)
      .order("tarih", { ascending: false })
      .limit(50),
    supabase
      .from("santiye_is_gorselleri")
      .select("*")
      .eq("santiye_id", santiye_id)
      .eq("silindi", false)
      .order("tarih", { ascending: false })
      .limit(50),
  ]);

  if (!santiye) notFound();

  const personelListe = (personeller ?? []) as Personel[];
  const personelIds = personelListe.map((p) => p.id);
  const malzemeListe = (malzemeler ?? []) as Malzeme[];
  const malzemeIds = malzemeListe.map((m) => m.id);
  const bugun = bugunISO();

  const [puantajSonuc, hareketSonuc, eksikSonuc] = await Promise.all([
    personelIds.length > 0
      ? supabase
          .from("puantaj")
          .select("*")
          .in("personel_id", personelIds)
          .eq("silindi", false)
          .order("tarih", { ascending: false })
          .limit(400)
      : Promise.resolve({ data: [] as Puantaj[] }),
    malzemeIds.length > 0
      ? supabase
          .from("malzeme_hareket")
          .select("*, malzemeler(*)")
          .in("malzeme_id", malzemeIds)
          .eq("silindi", false)
          .order("tarih", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as MalzemeHareket[] }),
    malzemeIds.length > 0
      ? supabase
          .from("malzeme_hareket")
          .select("id", { count: "exact", head: true })
          .in("malzeme_id", malzemeIds)
          .eq("tip", "eksik")
          .eq("durum", "bekliyor")
          .eq("silindi", false)
      : Promise.resolve({ count: 0 }),
  ]);

  const puantajListe = (puantajSonuc.data ?? []) as Puantaj[];
  const puantajBugun = puantajListe.filter((p) => p.tarih === bugun);
  const hareketler = (hareketSonuc.data ?? []) as MalzemeHareket[];
  const bekleyenEksik = eksikSonuc.count ?? 0;

  const geldi = puantajBugun.filter((p) => p.geldi_mi).length;
  const yemek = puantajBugun.filter((p) => p.yemek_yedi_mi).length;
  const m = maliyet as ToplamMaliyet | null;
  const toplamMaliyet =
    Number(m?.iscilik_maliyeti ?? 0) +
    Number(m?.malzeme_maliyeti ?? 0) +
    Number(m?.genel_gider ?? 0);

  return (
    <SantiyePanel
      santiye={santiye as Santiye}
      profil={profil}
      kullaniciId={user.id}
      ozet={{
        toplamMaliyet: paraFormat(toplamMaliyet),
        iscilik: paraFormat(Number(m?.iscilik_maliyeti ?? 0)),
        malzeme: paraFormat(Number(m?.malzeme_maliyeti ?? 0)),
        gider: paraFormat(Number(m?.genel_gider ?? 0)),
        gelir: paraFormat(Number(m?.genel_gelir ?? 0)),
        personelSayisi: personelListe.length,
        geldi,
        yemek,
        bekleyenEksik,
      }}
      personeller={personelListe}
      puantajBugun={puantajListe}
      malzemeler={malzemeListe}
      hareketler={hareketler}
      maaslar={(maaslar ?? []) as IsciMaasOdeme[]}
      gelirGider={(gelirGider ?? []) as GelirGider[]}
      isGorselleri={(isGorselleri ?? []) as SantiyeIsGorseli[]}
      maliyet={m}
    />
  );
}
