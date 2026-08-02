import { requireOturum, rolIzin, tarihFormat } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MalzemeHareket } from "@/lib/types";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EksikKarsilaButon } from "@/components/EksikKarsilaButon";
import { OnayAksiyonlari } from "@/components/OnayAksiyonlari";
import { EksikMalzemeBildirForm } from "@/components/santiye/EksikMalzemeBildirForm";

type EksikSatir = MalzemeHareket & {
  malzemeler?: {
    ad: string;
    tur: string | null;
    birim: string | null;
    santiye_id?: string;
    santiyeler?: { ad: string } | null;
  };
};

export default async function EksikMalzemelerPage() {
  const { profil, user } = await requireOturum();
  if (!rolIzin(profil.rol, ["santiye_sefi", "saha_gorevlisi", "admin"])) {
    redirect("/santiye");
  }

  const supabase = createClient();
  const [{ data }, { data: atanmis }] = await Promise.all([
    supabase
      .from("malzeme_hareket")
      .select("*, malzemeler(*, santiyeler:santiye_id(ad))")
      .eq("tip", "eksik")
      .in("durum", ["bekliyor", "onaylandi"])
      .eq("silindi", false)
      .order("tarih", { ascending: true }),
    supabase
      .from("kullanici_santiye")
      .select("santiye_id, santiyeler(id, ad)")
      .eq("kullanici_id", user.id),
  ]);

  const liste = (data ?? []) as EksikSatir[];

  const gruplar = new Map<
    string,
    { ad: string; id?: string; kayitlar: EksikSatir[] }
  >();
  for (const h of liste) {
    const ad = h.malzemeler?.santiyeler?.ad ?? "Şantiye";
    const id = h.malzemeler?.santiye_id;
    const key = id ?? ad;
    if (!gruplar.has(key)) gruplar.set(key, { ad, id, kayitlar: [] });
    gruplar.get(key)!.kayitlar.push(h);
  }

  const santiyeSecenekleri = (atanmis ?? [])
    .map((a) => {
      const s = a.santiyeler as unknown as
        | { id: string; ad: string }
        | { id: string; ad: string }[]
        | null;
      if (!s) return null;
      return Array.isArray(s) ? s[0] ?? null : s;
    })
    .filter((s): s is { id: string; ad: string } => Boolean(s?.id && s?.ad));

  const onaylayabilir =
    profil.rol === "admin" ||
    profil.rol === "depo_sorumlusu" ||
    profil.rol === "santiye_sefi";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-perre-900">
            Eksik Malzemeler
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Bildirim → yönetici onayı → depo karşılama (bağlı stok hareketi)
          </p>
        </div>
      </div>

      {santiyeSecenekleri.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Eksik Malzeme</h2>
          {santiyeSecenekleri.map((s) => (
            <div key={s.id} className="space-y-2">
              <p className="text-sm font-medium text-perre-800">{s.ad}</p>
              <EksikMalzemeBildirForm
                santiyeId={s.id}
                kullaniciId={user.id}
              />
            </div>
          ))}
        </section>
      )}

      {Array.from(gruplar.values()).map((g) => (
        <section key={g.ad + (g.id ?? "")} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-perre-900">
              {g.ad}
              <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                ({g.kayitlar.length})
              </span>
            </h2>
            {g.id && (
              <Link
                href={`/santiye/santiyeler/${g.id}`}
                className="text-sm font-medium text-perre-700 hover:underline"
              >
                Şantiye paneli →
              </Link>
            )}
          </div>
          {g.kayitlar.map((h: EksikSatir) => (
            <div
              key={h.id}
              className="kart flex flex-wrap items-center justify-between gap-4 border-red-200 bg-red-50/80 p-5"
            >
              <div>
                <p className="text-xs font-medium uppercase text-red-600">
                  {h.durum === "onaylandi"
                    ? "Onaylandı — karşılanabilir"
                    : "Onay bekliyor"}
                </p>
                <p className="font-display text-lg font-semibold text-red-950">
                  {h.malzemeler?.ad}
                  {h.malzemeler?.tur ? ` · ${h.malzemeler.tur}` : ""} — {h.miktar}{" "}
                  {h.malzemeler?.birim ?? "adet"}
                </p>
                <p className="mt-1 text-sm text-red-800">
                  {tarihFormat(h.tarih)} · {h.aciklama ?? "Açıklama yok"}
                </p>
              </div>
              {onaylayabilir &&
                (h.durum === "bekliyor" ? (
                  <OnayAksiyonlari kaynak="eksik" id={h.id} />
                ) : (
                  <EksikKarsilaButon id={h.id} kullaniciId={user.id} />
                ))}
            </div>
          ))}
        </section>
      ))}

      {liste.length === 0 && (
        <div className="kart p-10 text-center text-[var(--muted)]">
          Bekleyen eksik malzeme bulunmuyor.
        </div>
      )}
    </div>
  );
}
