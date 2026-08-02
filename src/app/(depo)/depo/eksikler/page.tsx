import { requireOturum, rolIzin, tarihFormat } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MalzemeHareket } from "@/lib/types";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EksikKarsilaButon } from "@/components/EksikKarsilaButon";
import { OnayAksiyonlari } from "@/components/OnayAksiyonlari";

type EksikSatir = MalzemeHareket & {
  malzemeler?: {
    ad: string;
    birim: string | null;
    santiye_id?: string;
    santiyeler?: { ad: string } | null;
  };
};

export default async function DepoEksiklerPage() {
  const { profil, user } = await requireOturum();
  if (!rolIzin(profil.rol, ["depo_sorumlusu"])) redirect("/");

  const supabase = createClient();
  const { data } = await supabase
    .from("malzeme_hareket")
    .select("*, malzemeler(*, santiyeler:santiye_id(ad))")
    .eq("tip", "eksik")
    .in("durum", ["bekliyor", "onaylandi"])
    .eq("silindi", false)
    .order("tarih", { ascending: true });

  const liste = (data ?? []) as EksikSatir[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Şantiye Eksik Bildirimleri</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Önce yönetici onayı, sonra depo karşılama (otomatik stok bağlama)
        </p>
      </div>
      <div className="space-y-3">
        {liste.map((h) => (
          <div
            key={h.id}
            className="kart flex flex-wrap items-center justify-between gap-4 border-red-200 bg-red-50/80 p-5"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-red-600">
                {h.malzemeler?.santiyeler?.ad ?? "Şantiye"} ·{" "}
                {h.durum === "onaylandi" ? "Onaylandı — karşılanabilir" : "Onay bekliyor"}
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-red-950">
                {h.malzemeler?.ad} — {h.miktar} {h.malzemeler?.birim}
              </p>
              <p className="mt-1 text-sm text-red-800">
                {tarihFormat(h.tarih)} · {h.aciklama ?? "Açıklama yok"}
              </p>
              {h.malzemeler?.santiye_id && (
                <Link
                  href={`/admin/santiyeler/${h.malzemeler.santiye_id}`}
                  className="mt-2 inline-block text-xs text-perre-700 underline"
                >
                  Şantiye detayı (admin)
                </Link>
              )}
            </div>
            {h.durum === "bekliyor" ? (
              <OnayAksiyonlari kaynak="eksik" id={h.id} />
            ) : (
              <EksikKarsilaButon id={h.id} kullaniciId={user.id} />
            )}
          </div>
        ))}
        {liste.length === 0 && (
          <div className="kart p-10 text-center text-[var(--muted)]">
            Bekleyen eksik yok.
          </div>
        )}
      </div>
    </div>
  );
}
