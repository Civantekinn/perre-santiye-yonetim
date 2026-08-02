"use client";

import dynamic from "next/dynamic";
import type { GelirGider, ToplamMaliyet } from "@/lib/types";

type EkFinansKaydi = {
  tip: "gelir" | "gider";
  kategori: string | null;
  tutar: number;
  tarih: string;
};

const LazyGrafikler = dynamic(
  () => import("./GelirGiderGrafikler").then((m) => m.GelirGiderGrafikler),
  {
    ssr: false,
    loading: () => (
      <div className="kart p-6 text-sm text-[var(--muted)]">
        Grafikler yükleniyor...
      </div>
    ),
  }
);

export function GelirGiderGrafiklerLazy({
  maliyetler,
  kayitlar,
  ekKayitlar,
}: {
  maliyetler: ToplamMaliyet[];
  kayitlar: GelirGider[];
  ekKayitlar: EkFinansKaydi[];
}) {
  return (
    <LazyGrafikler
      maliyetler={maliyetler}
      kayitlar={kayitlar}
      ekKayitlar={ekKayitlar}
    />
  );
}
