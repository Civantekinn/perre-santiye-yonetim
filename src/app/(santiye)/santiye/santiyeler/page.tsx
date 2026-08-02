import { paraFormat, requireOturum } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Santiye, ToplamMaliyet } from "@/lib/types";
import Link from "next/link";
import { MapPin, Users, AlertTriangle } from "lucide-react";
import { SantiyeEkleForm } from "@/components/SantiyeEkleForm";

export default async function SantiyelerPage() {
  const { santiyeIds } = await requireOturum();
  const supabase = createClient();

  let santiyeQuery = supabase
    .from("santiyeler")
    .select("*")
    .eq("aktif", true)
    .order("ad");
  if (santiyeIds.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-perre-900">
              Şantiyeler
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Yeni şantiye ekleyin — yönetici onayı gerekmez
            </p>
          </div>
          <SantiyeEkleForm kendineAta />
        </div>
        <div className="kart p-8 text-center text-[var(--muted)]">
          Henüz şantiyeniz yok. Sağ üstten ekleyebilirsiniz.
        </div>
      </div>
    );
  }
  santiyeQuery = santiyeQuery.in("id", santiyeIds);

  const { data: santiyeler } = await santiyeQuery;
  const liste = (santiyeler ?? []) as Santiye[];
  const ids = liste.map((s) => s.id);

  const [{ data: maliyetler }, { data: personelRows }, { data: eksikRows }] =
    await Promise.all([
      ids.length
        ? supabase.from("toplam_maliyet_raporu").select("*").in("santiye_id", ids)
        : Promise.resolve({ data: [] as ToplamMaliyet[] }),
      ids.length
        ? supabase
            .from("personeller")
            .select("santiye_id")
            .in("santiye_id", ids)
            .eq("aktif", true)
        : Promise.resolve({ data: [] as { santiye_id: string }[] }),
      ids.length
        ? supabase
            .from("malzeme_hareket")
            .select("id, malzemeler!inner(santiye_id)")
            .eq("tip", "eksik")
            .eq("durum", "bekliyor")
            .eq("silindi", false)
            .in("malzemeler.santiye_id", ids)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

  const maliyetMap = new Map(
    ((maliyetler ?? []) as ToplamMaliyet[]).map((m) => [m.santiye_id, m])
  );

  const personelSay = new Map<string, number>();
  for (const p of personelRows ?? []) {
    const sid = p.santiye_id as string;
    personelSay.set(sid, (personelSay.get(sid) ?? 0) + 1);
  }

  const eksikSay = new Map<string, number>();
  for (const row of eksikRows ?? []) {
    const sid = (
      row as { malzemeler?: { santiye_id?: string } | { santiye_id?: string }[] }
    ).malzemeler;
    const id = Array.isArray(sid) ? sid[0]?.santiye_id : sid?.santiye_id;
    if (!id) continue;
    eksikSay.set(id, (eksikSay.get(id) ?? 0) + 1);
  }

  const kartlar = liste.map((s) => {
    const maliyet = maliyetMap.get(s.id);
    const toplam =
      Number(maliyet?.iscilik_maliyeti ?? 0) +
      Number(maliyet?.malzeme_maliyeti ?? 0) +
      Number(maliyet?.genel_gider ?? 0);
    return {
      s,
      personelSayisi: personelSay.get(s.id) ?? 0,
      bekleyenEksik: eksikSay.get(s.id) ?? 0,
      toplam,
      malzeme: Number(maliyet?.malzeme_maliyeti ?? 0),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-perre-900">
            Şantiyeler
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Her şantiyenin kendi malzeme ve maliyeti vardır
          </p>
        </div>
        <SantiyeEkleForm kendineAta />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kartlar.map(({ s, personelSayisi, bekleyenEksik, toplam, malzeme }) => (
          <Link
            key={s.id}
            href={`/santiye/santiyeler/${s.id}`}
            prefetch={false}
            className="kart group relative block p-5 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {bekleyenEksik > 0 && (
              <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white">
                <AlertTriangle className="h-3 w-3" />
                {bekleyenEksik} eksik
              </span>
            )}
            <h2 className="font-display text-lg font-semibold text-perre-900 group-hover:text-perre-700">
              {s.ad}
            </h2>
            {s.adres && (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-[var(--muted)]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {s.adres}
              </p>
            )}
            <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[var(--muted)]">
                  <Users className="h-4 w-4" />
                  {personelSayisi} aktif personel
                </span>
                <span className="font-semibold text-perre-800">
                  {paraFormat(toplam)}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Malzeme maliyeti · {paraFormat(malzeme)}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {liste.length === 0 && (
        <div className="kart p-10 text-center text-[var(--muted)]">
          Henüz şantiye kaydı yok.
        </div>
      )}
    </div>
  );
}
