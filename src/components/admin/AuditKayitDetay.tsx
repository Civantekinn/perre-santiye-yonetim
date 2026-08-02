import type { AuditLog } from "@/lib/types";

const ALAN_ETIKETLERI: Record<string, string> = {
  ad: "Ad",
  ad_soyad: "Ad soyad",
  pozisyon: "Pozisyon",
  gunluk_ucret: "Günlük ücret",
  aktif: "Aktif",
  tarih: "Tarih",
  geldi_mi: "İşe geldi",
  yemek_yedi_mi: "Yemek yedi",
  notlar: "Notlar",
  tip: "Tür",
  miktar: "Miktar",
  birim: "Birim",
  birim_fiyat: "Birim fiyat",
  tutar: "Tutar",
  aciklama: "Açıklama",
  durum: "Durum",
  odendi_mi: "Ödendi",
  odeme_tarihi: "Ödeme tarihi",
  donem_baslangic: "Dönem başlangıcı",
  donem_bitis: "Dönem bitişi",
  kategori: "Kategori",
  adres: "Adres",
  silindi: "Silindi",
};

const GIZLI_ALANLAR = new Set([
  "id",
  "created_at",
  "updated_at",
  "santiye_id",
  "personel_id",
  "malzeme_id",
  "kullanici_id",
  "kaydeden_kullanici_id",
  "giren_kullanici_id",
  "karsilayan_kullanici_id",
]);

function degerFormatla(deger: unknown): string {
  if (deger === null || deger === undefined || deger === "") return "Boş";
  if (deger === true) return "Evet";
  if (deger === false) return "Hayır";
  if (typeof deger === "object") return JSON.stringify(deger);
  return String(deger);
}

function alanAdi(key: string): string {
  return (
    ALAN_ETIKETLERI[key] ??
    key
      .split("_")
      .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
      .join(" ")
  );
}

function degisiklikler(log: AuditLog) {
  const eski = log.eski_veri ?? {};
  const yeni = log.yeni_veri ?? {};
  const anahtarlar = Array.from(
    new Set([...Object.keys(eski), ...Object.keys(yeni)])
  ).filter((key) => !GIZLI_ALANLAR.has(key));

  return anahtarlar
    .filter((key) => {
      if (log.islem !== "update") return true;
      return JSON.stringify(eski[key]) !== JSON.stringify(yeni[key]);
    })
    .map((key) => ({
      key,
      etiket: alanAdi(key),
      eski: eski[key],
      yeni: yeni[key],
    }));
}

export function AuditKayitDetay({ log }: { log: AuditLog }) {
  const alanlar = degisiklikler(log);

  if (alanlar.length === 0) {
    return <p className="text-xs text-[var(--muted)]">Alan değişikliği yok.</p>;
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[var(--line)]">
      {alanlar.map((alan) => (
        <div
          key={alan.key}
          className="grid gap-1 border-b border-[var(--line)] px-3 py-2 text-xs last:border-0 md:grid-cols-[160px_1fr_1fr]"
        >
          <span className="font-medium">{alan.etiket}</span>
          {log.islem === "insert" ? (
            <span className="text-emerald-700 md:col-span-2">
              Girilen değer: {degerFormatla(alan.yeni)}
            </span>
          ) : log.islem === "delete" ? (
            <span className="text-red-700 md:col-span-2">
              Silinen değer: {degerFormatla(alan.eski)}
            </span>
          ) : (
            <>
              <span className="rounded bg-red-50 px-2 py-1 text-red-700">
                Önce: {degerFormatla(alan.eski)}
              </span>
              <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">
                Sonra: {degerFormatla(alan.yeni)}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
