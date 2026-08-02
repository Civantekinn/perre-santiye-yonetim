export function GenelBakis({
  ozet,
}: {
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
}) {
  const kartlar = [
    { etiket: "Bu Şantiye Maliyeti", deger: ozet.toplamMaliyet },
    { etiket: "Aktif Personel", deger: String(ozet.personelSayisi) },
    { etiket: "Bugün Gelen", deger: `${ozet.geldi} kişi` },
    { etiket: "Bugün Yemek", deger: `${ozet.yemek} kişi` },
    {
      etiket: "Bekleyen Eksik",
      deger: `${ozet.bekleyenEksik} adet`,
      tehlike: ozet.bekleyenEksik > 0,
    },
    { etiket: "İşçilik (şantiye)", deger: ozet.iscilik },
    { etiket: "Malzeme (şantiye)", deger: ozet.malzeme },
    { etiket: "Gelir (şantiye)", deger: ozet.gelir },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kartlar.map((k) => (
        <div
          key={k.etiket}
          className={`kart p-5 ${k.tehlike ? "border-red-300 bg-red-50" : ""}`}
        >
          <p className="text-sm text-[var(--muted)]">{k.etiket}</p>
          <p
            className={`mt-2 font-display text-xl font-semibold ${
              k.tehlike ? "text-red-700" : "text-perre-900"
            }`}
          >
            {k.deger}
          </p>
        </div>
      ))}
    </div>
  );
}
