import { requireRol, tarihFormat } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AuditLog, OturumLog } from "@/lib/types";
import Link from "next/link";
import { Folder, ArrowLeft, Clock, UserRound } from "lucide-react";
import { AuditKayitDetay } from "@/components/admin/AuditKayitDetay";

const ISLEM_META = {
  insert: { etiket: "Eklendi", renk: "bg-emerald-100 text-emerald-800" },
  update: { etiket: "Güncellendi", renk: "bg-amber-100 text-amber-800" },
  delete: { etiket: "Silindi", renk: "bg-red-100 text-red-800" },
};

const TABLO_ETIKETLERI: Record<string, string> = {
  santiyeler: "Şantiye",
  personeller: "Personel",
  puantaj: "Puantaj",
  malzemeler: "Malzeme",
  malzeme_hareket: "Malzeme hareketi",
  isci_maas_odemeleri: "İşçi maaş ödemesi",
  gelir_gider: "Gelir / gider",
  depo_hareket: "Depo hareketi",
  odemeler: "Ödeme",
  profiller: "Kullanıcı profili",
  kullanici_santiye: "Şantiye yetkisi",
  ofis_personeller: "Ofis personeli",
  ofis_masraflar: "Ofis masrafı",
  ofis_odemeler: "Ofis ödemesi",
  depo_malzemeler: "Depo malzemesi",
};

function kayitBasligi(log: AuditLog): string {
  const veri = log.yeni_veri ?? log.eski_veri ?? {};
  const ad =
    veri.ad_soyad ??
    veri.ad ??
    veri.aciklama ??
    veri.kategori ??
    veri.tarih;
  return ad ? String(ad) : log.kayit_id.slice(0, 8);
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: { santiye?: string };
}) {
  await requireRol(["admin"]);
  const supabase = createClient();
  const seciliSantiye = searchParams.santiye;

  const [
    { data: santiyeler },
    { data: sayimKayitlari },
    { data: oturumlar },
  ] = await Promise.all([
    supabase
      .from("santiyeler")
      .select("id, ad, aktif")
      .order("ad"),
    supabase
      .from("audit_log")
      .select("santiye_id, created_at")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("oturum_log")
      .select("*, profiller(ad_soyad)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const sayilar = new Map<string, number>();
  for (const kayit of sayimKayitlari ?? []) {
    const key = kayit.santiye_id ?? "genel";
    sayilar.set(key, (sayilar.get(key) ?? 0) + 1);
  }
  const oturumListe = (oturumlar ?? []) as OturumLog[];

  let liste: AuditLog[] = [];
  let seciliAd = "";
  if (seciliSantiye) {
    let sorgu = supabase
      .from("audit_log")
      .select("*, profiller(ad_soyad), santiyeler(ad)")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (seciliSantiye === "genel") {
      sorgu = sorgu.is("santiye_id", null);
      seciliAd = "Genel / Ofis / Sistem";
    } else {
      sorgu = sorgu.eq("santiye_id", seciliSantiye);
      seciliAd =
        santiyeler?.find((s) => s.id === seciliSantiye)?.ad ?? "Şantiye";
    }

    const { data } = await sorgu;
    liste = (data ?? []) as AuditLog[];
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Şantiye İşlem Kayıtları
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Kim, hangi veriyi, ne zaman ve nasıl değiştirdi — anlık ve şantiye bazlı
        </p>
      </div>

      {!seciliSantiye ? (
        <>
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">
              Şantiye klasörleri
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(santiyeler ?? []).map((santiye) => (
                <Link
                  key={santiye.id}
                  href={`/admin/audit?santiye=${santiye.id}`}
                  className="kart group flex items-center gap-4 p-5 hover:border-perre-400 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Folder className="h-6 w-6 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{santiye.ad}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {sayilar.get(santiye.id) ?? 0} işlem kaydı
                    </p>
                  </div>
                </Link>
              ))}
              <Link
                href="/admin/audit?santiye=genel"
                className="kart group flex items-center gap-4 p-5 hover:border-perre-400 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Folder className="h-6 w-6 fill-current" />
                </div>
                <div>
                  <p className="font-semibold">Genel / Ofis / Sistem</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {sayilar.get("genel") ?? 0} işlem kaydı
                  </p>
                </div>
              </Link>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">
              Son oturumlar
            </h2>
            <div className="kart overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-perre-50 text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3">Tarih ve saat</th>
                    <th className="px-4 py-3">Kullanıcı</th>
                    <th className="px-4 py-3">Portal</th>
                    <th className="px-4 py-3">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {oturumListe.map((o) => (
                    <tr key={o.id} className="border-t border-[var(--line)]">
                      <td className="whitespace-nowrap px-4 py-3">
                        {tarihFormat(o.created_at)}{" "}
                        {new Date(o.created_at).toLocaleTimeString("tr-TR")}
                      </td>
                      <td className="px-4 py-3">
                        {o.profiller?.ad_soyad ?? "—"}
                      </td>
                      <td className="px-4 py-3 capitalize">{o.portal}</td>
                      <td className="px-4 py-3">
                        {o.islem === "giris" ? "Giriş" : "Çıkış"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/admin/audit"
              className="inline-flex items-center gap-2 text-sm font-medium text-perre-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Şantiye klasörlerine dön
            </Link>
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 fill-amber-200 text-amber-700" />
              <h2 className="font-display text-xl font-semibold">{seciliAd}</h2>
              <span className="rounded-full bg-perre-50 px-2 py-1 text-xs">
                {liste.length} kayıt
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {liste.map((log) => {
              const meta = ISLEM_META[log.islem];
              return (
                <details key={log.id} className="kart group p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.renk}`}
                      >
                        {meta.etiket}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {TABLO_ETIKETLERI[log.tablo_adi] ?? log.tablo_adi}
                          <span className="ml-2 font-normal text-[var(--muted)]">
                            — {kayitBasligi(log)}
                          </span>
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {tarihFormat(log.created_at)}{" "}
                            {new Date(log.created_at).toLocaleTimeString(
                              "tr-TR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              }
                            )}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="h-3.5 w-3.5" />
                            {log.profiller?.ad_soyad ?? "Sistem"}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-[var(--muted)] group-open:hidden">
                        Ayrıntıyı aç
                      </span>
                    </div>
                  </summary>
                  <AuditKayitDetay log={log} />
                </details>
              );
            })}
            {liste.length === 0 && (
              <div className="kart px-4 py-12 text-center text-[var(--muted)]">
                Bu klasörde henüz işlem kaydı yok.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
