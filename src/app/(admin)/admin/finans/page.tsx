import { paraFormat, requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SirketFinans, ToplamMaliyet } from "@/lib/types";
import Link from "next/link";
import { RaporFiltre } from "@/components/RaporFiltre";

export default async function AdminFinansPage({
  searchParams,
}: {
  searchParams: { baslangic?: string; bitis?: string };
}) {
  await requireRol(["admin"]);
  const supabase = createClient();
  const baslangic = searchParams.baslangic || null;
  const bitis = searchParams.bitis || null;

  const [{ data: finansRows }, { data: santiyeMaliyet }, { data: ozet }] =
    await Promise.all([
      supabase.rpc("sirket_finans_tarihli", {
        p_baslangic: baslangic,
        p_bitis: bitis,
      }),
      supabase.rpc("santiye_maliyet_tarihli", {
        p_santiye_ids: null,
        p_baslangic: baslangic,
        p_bitis: bitis,
      }),
      supabase.from("sirket_finans_ozeti").select("*").maybeSingle(),
    ]);

  const finans = (finansRows?.[0] ?? ozet ?? {
    toplam_gelir: 0,
    toplam_gider: 0,
    net: 0,
  }) as SirketFinans;

  const santiyeler = (santiyeMaliyet ?? []) as ToplamMaliyet[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-perre-900">
          Şirket Karlılığı
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Ofis + depo + şantiye finansının konsolide özeti (yalnız onaylı kayıtlar)
        </p>
      </div>

      <RaporFiltre
        santiyeler={[]}
        baslangic={baslangic ?? undefined}
        bitis={bitis ?? undefined}
        santiyeGizle
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="kart border-emerald-200 bg-emerald-50/50 p-5">
          <p className="text-sm text-emerald-800">Toplam gelir</p>
          <p className="mt-2 font-display text-2xl font-semibold text-emerald-900">
            {paraFormat(Number(finans.toplam_gelir))}
          </p>
        </div>
        <div className="kart border-amber-200 bg-amber-50/50 p-5">
          <p className="text-sm text-amber-800">Toplam gider</p>
          <p className="mt-2 font-display text-2xl font-semibold text-amber-900">
            {paraFormat(Number(finans.toplam_gider))}
          </p>
        </div>
        <div className="kart p-5">
          <p className="text-sm text-[var(--muted)]">Net</p>
          <p
            className={`mt-2 font-display text-2xl font-semibold ${
              Number(finans.net) >= 0 ? "text-emerald-800" : "text-red-800"
            }`}
          >
            {paraFormat(Number(finans.net))}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Şantiye gelir", finans.santiye_gelir],
          ["Ofis gelir", finans.ofis_gelir],
          ["İşçilik", finans.santiye_iscilik],
          ["Malzeme", finans.santiye_malzeme],
          ["Şantiye gider", finans.santiye_gider],
          ["Ofis masraf", finans.ofis_masraf_gider],
          ["Ofis maaş ödemeleri", finans.ofis_odeme_gider],
          ["Depo (giriş/fire)", finans.depo_gider],
        ].map(([etiket, deger]) => (
          <div key={String(etiket)} className="kart p-4">
            <p className="text-sm text-[var(--muted)]">{etiket}</p>
            <p className="mt-1 font-display text-lg font-semibold">
              {paraFormat(Number(deger ?? 0))}
            </p>
          </div>
        ))}
      </div>

      <section className="kart overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="font-display font-semibold">Şantiye bazlı net</h2>
        </div>
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
              {santiyeler.map((r) => {
                const net =
                  Number(r.genel_gelir) -
                  (Number(r.iscilik_maliyeti) +
                    Number(r.malzeme_maliyeti) +
                    Number(r.genel_gider));
                return (
                  <tr key={r.santiye_id} className="border-t border-[var(--line)]">
                    <td className="px-5 py-3 font-medium">
                      <Link
                        href={`/admin/santiyeler/${r.santiye_id}`}
                        className="text-perre-800 hover:underline"
                      >
                        {r.santiye_adi}
                      </Link>
                    </td>
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
      </section>
    </div>
  );
}
