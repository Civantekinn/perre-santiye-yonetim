import { paraFormat, requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Santiye, ToplamMaliyet } from "@/lib/types";
import Link from "next/link";
import { SantiyeEkleForm } from "@/components/SantiyeEkleForm";

export default async function AdminSantiyelerPage() {
  await requireRol(["admin"]);
  const supabase = createClient();

  const [{ data: santiyeler }, { data: maliyetler }] = await Promise.all([
    supabase.from("santiyeler").select("*").order("ad"),
    supabase.from("toplam_maliyet_raporu").select("*"),
  ]);

  const liste = (santiyeler ?? []) as Santiye[];
  const map = new Map(
    ((maliyetler ?? []) as ToplamMaliyet[]).map((m) => [m.santiye_id, m])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Şantiyeler</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Ana admin görünümü</p>
        </div>
        <SantiyeEkleForm />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {liste.map((s) => {
          const m = map.get(s.id);
          const toplam =
            Number(m?.iscilik_maliyeti ?? 0) +
            Number(m?.malzeme_maliyeti ?? 0) +
            Number(m?.genel_gider ?? 0);
          return (
            <Link
              key={s.id}
              href={`/admin/santiyeler/${s.id}`}
              prefetch={false}
              className="kart block p-5 hover:shadow-md"
            >
              <h2 className="font-display text-lg font-semibold">{s.ad}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{s.adres ?? "—"}</p>
              <p className="mt-4 font-semibold text-perre-800">{paraFormat(toplam)}</p>
              <p className="text-xs text-[var(--muted)]">
                {s.aktif ? "Aktif" : "Pasif"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
