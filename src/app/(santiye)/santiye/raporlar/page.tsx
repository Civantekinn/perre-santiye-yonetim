import { paraFormat, requireOturum, rolIzin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ToplamMaliyet } from "@/lib/types";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { RaporFiltre } from "@/components/RaporFiltre";

const MaliyetGrafik = dynamic(
  () =>
    import("@/components/MaliyetGrafik").then((m) => m.MaliyetGrafik),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-80 items-center justify-center text-sm text-[var(--muted)]">
        Grafik yükleniyor…
      </div>
    ),
  }
);

export default async function RaporlarPage({
  searchParams,
}: {
  searchParams: {
    santiye?: string;
    baslangic?: string;
    bitis?: string;
  };
}) {
  const { profil, santiyeIds } = await requireOturum();
  if (!rolIzin(profil.rol, ["santiye_sefi"])) redirect("/santiye");

  const sp = searchParams;
  const supabase = createClient();

  if (santiyeIds.length === 0) {
    return (
      <div className="kart p-8 text-center text-[var(--muted)]">
        Atanmış şantiye yok.
      </div>
    );
  }

  const filtreIds =
    sp.santiye && santiyeIds.includes(sp.santiye)
      ? [sp.santiye]
      : santiyeIds;

  const [{ data: santiyeler }, { data: maliyetData }] = await Promise.all([
    supabase
      .from("santiyeler")
      .select("id, ad")
      .in("id", santiyeIds)
      .eq("aktif", true)
      .order("ad"),
    supabase.rpc("santiye_maliyet_tarihli", {
      p_santiye_ids: filtreIds,
      p_baslangic: sp.baslangic || null,
      p_bitis: sp.bitis || null,
    }),
  ]);

  const liste = (maliyetData ?? []) as ToplamMaliyet[];
  const seciliAd =
    (santiyeler ?? []).find((s) => s.id === sp.santiye)?.ad ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-perre-900">
          Şantiye Bazlı Maliyet Raporu
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Tarih aralığı tüm işçilik, malzeme ve gelir-gider sorgularına uygulanır
        </p>
      </div>

      <RaporFiltre
        santiyeler={(santiyeler ?? []) as { id: string; ad: string }[]}
        secili={sp.santiye}
        baslangic={sp.baslangic}
        bitis={sp.bitis}
        hedefYol="/santiye/raporlar"
      />

      {(sp.baslangic || sp.bitis) && (
        <p className="text-sm text-[var(--muted)]">
          Dönem: {sp.baslangic || "…"} — {sp.bitis || "…"}
        </p>
      )}

      {seciliAd && (
        <p className="text-sm font-medium text-perre-800">
          Seçili şantiye: {seciliAd}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {liste.map((r) => {
          const maliyet =
            Number(r.iscilik_maliyeti) +
            Number(r.malzeme_maliyeti) +
            Number(r.genel_gider);
          const net = Number(r.genel_gelir) - maliyet;
          return (
            <div key={r.santiye_id} className="kart space-y-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-perre-900">
                  {r.santiye_adi}
                </h2>
                <Link
                  href={`/santiye/santiyeler/${r.santiye_id}`}
                  className="text-xs font-medium text-perre-700 hover:underline"
                >
                  Panele git
                </Link>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Şantiye maliyeti</p>
                <p className="font-display text-2xl font-semibold">
                  {paraFormat(maliyet)}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-[var(--muted)]">İşçilik</dt>
                  <dd className="font-medium">
                    {paraFormat(Number(r.iscilik_maliyeti))}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Malzeme</dt>
                  <dd className="font-medium">
                    {paraFormat(Number(r.malzeme_maliyeti))}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Gider</dt>
                  <dd className="font-medium">
                    {paraFormat(Number(r.genel_gider))}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Gelir</dt>
                  <dd className="font-medium text-emerald-700">
                    {paraFormat(Number(r.genel_gelir))}
                  </dd>
                </div>
              </dl>
              <p
                className={`text-sm font-semibold ${
                  net >= 0 ? "text-emerald-700" : "text-red-700"
                }`}
              >
                Net {paraFormat(net)}
              </p>
            </div>
          );
        })}
        {liste.length === 0 && (
          <div className="kart col-span-full p-10 text-center text-[var(--muted)]">
            Bu filtre için maliyet verisi yok.
          </div>
        )}
      </div>

      {liste.length > 1 && (
        <div className="kart p-5">
          <h2 className="font-display font-semibold">Karşılaştırma</h2>
          <div className="mt-4 h-80">
            <MaliyetGrafik data={liste} />
          </div>
        </div>
      )}

      <div className="kart overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-perre-50 text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-medium">Şantiye</th>
                <th className="px-5 py-3 font-medium">İşçilik</th>
                <th className="px-5 py-3 font-medium">Malzeme</th>
                <th className="px-5 py-3 font-medium">Gider</th>
                <th className="px-5 py-3 font-medium">Gelir</th>
                <th className="px-5 py-3 font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((r) => {
                const net =
                  Number(r.genel_gelir) -
                  (Number(r.iscilik_maliyeti) +
                    Number(r.malzeme_maliyeti) +
                    Number(r.genel_gider));
                return (
                  <tr key={r.santiye_id} className="border-t border-[var(--line)]">
                    <td className="px-5 py-3 font-medium">{r.santiye_adi}</td>
                    <td className="px-5 py-3">
                      {paraFormat(Number(r.iscilik_maliyeti))}
                    </td>
                    <td className="px-5 py-3">
                      {paraFormat(Number(r.malzeme_maliyeti))}
                    </td>
                    <td className="px-5 py-3">
                      {paraFormat(Number(r.genel_gider))}
                    </td>
                    <td className="px-5 py-3">
                      {paraFormat(Number(r.genel_gelir))}
                    </td>
                    <td
                      className={`px-5 py-3 font-semibold ${
                        net >= 0 ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {paraFormat(net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
