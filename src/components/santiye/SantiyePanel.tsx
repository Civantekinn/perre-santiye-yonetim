"use client";

import { useState } from "react";
import type {
  GelirGider,
  IsciMaasOdeme,
  Malzeme,
  MalzemeHareket,
  Personel,
  Profil,
  Puantaj,
  Santiye,
  SantiyeIsGorseli,
  ToplamMaliyet,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { GenelBakis } from "./GenelBakis";
import { PuantajSekmesi } from "./PuantajSekmesi";
import { MalzemeSekmesi } from "./MalzemeSekmesi";
import { OdemelerSekmesi } from "./OdemelerSekmesi";
import { GelirGiderSekmesi } from "./GelirGiderSekmesi";
import { IsGorselleriSekmesi } from "./IsGorselleriSekmesi";

const SEKMELER = [
  { id: "genel", etiket: "Genel Bakış", roller: ["admin", "santiye_sefi", "saha_gorevlisi"] },
  { id: "puantaj", etiket: "Personel / Puantaj", roller: ["admin", "santiye_sefi", "saha_gorevlisi"] },
  { id: "malzeme", etiket: "Malzeme", roller: ["admin", "santiye_sefi", "saha_gorevlisi"] },
  { id: "odemeler", etiket: "İşçi Ödemeleri", roller: ["admin", "saha_gorevlisi", "santiye_sefi"] },
  { id: "gelir", etiket: "Gelir-Gider", roller: ["admin", "santiye_sefi", "saha_gorevlisi"] },
  { id: "isler", etiket: "Yapılan İşler / Resimler", roller: ["admin", "santiye_sefi", "saha_gorevlisi"] },
] as const;

type SekmeId = (typeof SEKMELER)[number]["id"];

export function SantiyePanel({
  santiye,
  profil,
  kullaniciId,
  ozet,
  personeller,
  puantajBugun,
  malzemeler,
  hareketler,
  maaslar,
  gelirGider,
  isGorselleri,
  maliyet,
}: {
  santiye: Santiye;
  profil: Profil;
  kullaniciId: string;
  ozet: {
    toplamMaliyet: string;
    iscilik: string;
    malzeme: string;
    gider: string;
    gelir: string;
    personelSayisi: number;
    geldi: number;
    yemek: number;
    bekleyenEksik: number;
  };
  personeller: Personel[];
  puantajBugun: Puantaj[];
  malzemeler: Malzeme[];
  hareketler: MalzemeHareket[];
  maaslar: IsciMaasOdeme[];
  gelirGider: GelirGider[];
  isGorselleri: SantiyeIsGorseli[];
  maliyet: ToplamMaliyet | null;
}) {
  const izinli = SEKMELER.filter((s) =>
    (s.roller as readonly string[]).includes(profil.rol)
  );
  const [sekme, setSekme] = useState<SekmeId>(izinli[0]?.id ?? "genel");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-[var(--muted)]">Şantiye Paneli</p>
        <h1 className="font-display text-2xl font-semibold text-perre-900">
          {santiye.ad}
        </h1>
        {santiye.adres && (
          <p className="mt-1 text-sm text-[var(--muted)]">{santiye.adres}</p>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-[var(--line)] bg-white/80 p-1">
        {izinli.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSekme(s.id)}
            className={cn(
              "whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition",
              sekme === s.id
                ? "bg-perre-700 text-white shadow"
                : "text-[var(--muted)] hover:bg-perre-50 hover:text-perre-900"
            )}
          >
            {s.etiket}
          </button>
        ))}
      </div>

      {sekme === "genel" && <GenelBakis ozet={ozet} />}
      {sekme === "puantaj" && (
        <PuantajSekmesi
          santiyeId={santiye.id}
          personeller={personeller}
          puantajlar={puantajBugun}
          maaslar={maaslar}
          kullaniciId={kullaniciId}
          rol={profil.rol}
        />
      )}
      {sekme === "malzeme" && (
        <MalzemeSekmesi
          santiyeId={santiye.id}
          santiyeAd={santiye.ad}
          malzemeler={malzemeler}
          hareketler={hareketler}
          kullaniciId={kullaniciId}
          rol={profil.rol}
        />
      )}
      {sekme === "odemeler" && (
        <OdemelerSekmesi
          santiyeId={santiye.id}
          personeller={personeller}
          maaslar={maaslar}
          kullaniciId={kullaniciId}
          rol={profil.rol}
        />
      )}
      {sekme === "gelir" && (
        <GelirGiderSekmesi
          santiyeId={santiye.id}
          kayitlar={gelirGider}
          maliyet={maliyet}
          rol={profil.rol}
          kullaniciId={kullaniciId}
        />
      )}
      {sekme === "isler" && (
        <IsGorselleriSekmesi
          santiyeId={santiye.id}
          santiyeAd={santiye.ad}
          gorseller={isGorselleri}
          kullaniciId={kullaniciId}
          rol={profil.rol}
        />
      )}
    </div>
  );
}
