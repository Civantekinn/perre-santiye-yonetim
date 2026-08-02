import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/middleware";
import { bugunISO } from "@/lib/auth";
import type { Rol } from "@/lib/types";

type Kaynak =
  | "isci_maas"
  | "ofis_odeme"
  | "ofis_masraf"
  | "gelir_gider"
  | "depo_hareket"
  | "eksik";

const TABLO: Record<Exclude<Kaynak, "eksik">, string> = {
  isci_maas: "isci_maas_odemeleri",
  ofis_odeme: "ofis_odemeler",
  ofis_masraf: "ofis_masraflar",
  gelir_gider: "gelir_gider",
  depo_hareket: "depo_hareket",
};

function onaylayabilir(rol: Rol, kaynak: Kaynak): boolean {
  if (rol === "admin") return true;
  if (kaynak === "ofis_odeme" || kaynak === "ofis_masraf") {
    return rol === "ofis_admin";
  }
  if (kaynak === "isci_maas" || kaynak === "gelir_gider" || kaynak === "eksik") {
    return rol === "santiye_sefi" || rol === "depo_sorumlusu";
  }
  if (kaynak === "depo_hareket") {
    return rol === "depo_sorumlusu";
  }
  return false;
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { data: profil } = await supabase
    .from("profiller")
    .select("rol")
    .eq("id", user.id)
    .single();

  const body = await req.json();
  const kaynak = body?.kaynak as Kaynak;
  const id = body?.id as string;
  const karar = body?.karar as "onaylandi" | "reddedildi";
  const notu = (body?.notu as string | undefined) || null;

  if (!kaynak || !id || !["onaylandi", "reddedildi"].includes(karar)) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  if (!profil || !onaylayabilir(profil.rol as Rol, kaynak)) {
    return NextResponse.json({ error: "Yetkisiz işlem" }, { status: 403 });
  }

  const service = createServiceClient();
  const bugun = bugunISO();

  if (kaynak === "eksik") {
    const { data: eksik } = await service
      .from("malzeme_hareket")
      .select("id, tip, durum")
      .eq("id", id)
      .eq("tip", "eksik")
      .maybeSingle();
    if (!eksik || eksik.durum !== "bekliyor") {
      return NextResponse.json(
        { error: "Yalnız bekleyen eksikler onaylanabilir" },
        { status: 400 }
      );
    }
    const { error } = await service
      .from("malzeme_hareket")
      .update({
        durum: karar === "onaylandi" ? "onaylandi" : "reddedildi",
      })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const tablo = TABLO[kaynak];
  const { data: kayit } = await service
    .from(tablo)
    .select("id, onay_durumu")
    .eq("id", id)
    .maybeSingle();

  if (!kayit || kayit.onay_durumu !== "bekliyor") {
    return NextResponse.json(
      { error: "Kayıt onay bekleyen durumda değil" },
      { status: 400 }
    );
  }

  const { error } = await service
    .from(tablo)
    .update({
      onay_durumu: karar,
      onaylayan_kullanici_id: user.id,
      onay_tarihi: bugun,
      onay_notu: notu,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Onaylı depo→şantiye çıkışında şantiye girişini otomatik oluştur
  if (kaynak === "depo_hareket" && karar === "onaylandi") {
    const { data: hareket } = await service
      .from("depo_hareket")
      .select("id, depo_malzeme_id, miktar, santiye_id, aciklama, tarih, depo_malzemeler(ad, birim)")
      .eq("id", id)
      .maybeSingle();

    const tipKontrol = await service
      .from("depo_hareket")
      .select("tip")
      .eq("id", id)
      .maybeSingle();

    if (
      hareket?.santiye_id &&
      tipKontrol.data?.tip === "cikis"
    ) {
      const depoMalzeme = Array.isArray(hareket.depo_malzemeler)
        ? hareket.depo_malzemeler[0]
        : hareket.depo_malzemeler;
      if (depoMalzeme?.ad) {
        let { data: santiyeMalzeme } = await service
          .from("malzemeler")
          .select("id")
          .eq("santiye_id", hareket.santiye_id)
          .ilike("ad", depoMalzeme.ad)
          .maybeSingle();

        if (!santiyeMalzeme) {
          const { data: yeni } = await service
            .from("malzemeler")
            .insert({
              ad: depoMalzeme.ad,
              birim: depoMalzeme.birim ?? "adet",
              santiye_id: hareket.santiye_id,
              depo_malzeme_id: hareket.depo_malzeme_id,
            })
            .select("id")
            .single();
          santiyeMalzeme = yeni;
        } else {
          await service
            .from("malzemeler")
            .update({ depo_malzeme_id: hareket.depo_malzeme_id })
            .eq("id", santiyeMalzeme.id);
        }

        if (santiyeMalzeme) {
          await service.from("malzeme_hareket").insert({
            malzeme_id: santiyeMalzeme.id,
            tip: "giris",
            miktar: Number(hareket.miktar),
            tarih: hareket.tarih,
            aciklama: hareket.aciklama ?? `Depo transferi onaylandı`,
            durum: "karsilandi",
            kaynak_depo_hareket_id: hareket.id,
            kaydeden_kullanici_id: user.id,
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
