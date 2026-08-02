import { paraFormat, requireOturum, tarihFormat } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ToplamMaliyet } from "@/lib/types";
import { redirect } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { SantiyeEkleForm } from "@/components/SantiyeEkleForm";

const MaliyetGrafik = dynamic(
  () =>
    import("@/components/MaliyetGrafik").then((m) => m.MaliyetGrafik),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
        Grafik yükleniyor…
      </div>
    ),
  }
);

export default async function SantiyePanelHome() {
  const { profil, santiyeIds } = await requireOturum();
  const supabase = createClient();

  if (profil.rol === "saha_gorevlisi" && santiyeIds.length === 1) {
    redirect(`/santiye/santiyeler/${santiyeIds[0]}`);
  }
  if (profil.rol === "santiye_sefi" && santiyeIds.length === 1) {
    redirect(`/santiye/santiyeler/${santiyeIds[0]}`);
  }

  if (santiyeIds.length === 0) {
    return (
      <div className="kart space-y-4 p-8 text-center">
        <p className="text-[var(--muted)]">
          Henüz şantiyeniz yok. Aşağıdan yeni şantiye ekleyebilirsiniz —
          yönetici onayı gerekmez.
        </p>
        <div className="flex justify-center">
          <SantiyeEkleForm kendineAta />
        </div>
      </div>
    );
  }

  const { data: maliyetler } = await supabase
    .from("toplam_maliyet_raporu")
    .select("*")
    .in("santiye_id", santiyeIds);
  const liste = (maliyetler ?? []) as ToplamMaliyet[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-perre-900">
            Şantiye Paneli
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {tarihFormat(new Date())} · Şantiyelerinizi yönetin
          </p>
        </div>
        <SantiyeEkleForm kendineAta />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {liste.map((r) => {
          const maliyet =
            Number(r.iscilik_maliyeti) +
            Number(r.malzeme_maliyeti) +
            Number(r.genel_gider);
          return (
            <Link
              key={r.santiye_id}
              href={`/santiye/santiyeler/${r.santiye_id}`}
              prefetch={false}
              className="kart block p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="font-display text-lg font-semibold">{r.santiye_adi}</p>
              <p className="mt-3 text-sm text-[var(--muted)]">Şantiye maliyeti</p>
              <p className="font-display text-2xl font-semibold">
                {paraFormat(maliyet)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-1 text-xs text-[var(--muted)]">
                <span>İşçilik {paraFormat(Number(r.iscilik_maliyeti))}</span>
                <span>Malzeme {paraFormat(Number(r.malzeme_maliyeti))}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {liste.length > 1 && (
        <div className="kart p-5">
          <h2 className="font-display font-semibold">Karşılaştırma</h2>
          <div className="mt-4 h-64">
            <MaliyetGrafik data={liste} />
          </div>
        </div>
      )}
    </div>
  );
}
