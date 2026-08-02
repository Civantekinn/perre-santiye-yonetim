import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DepoHareket, DepoMalzeme } from "@/lib/types";
import { DepoEnvanter } from "@/components/depo/DepoEnvanter";
import Link from "next/link";

export default async function AdminDepoPage() {
  const { profil, user } = await requireRol(["admin"]);
  const supabase = createClient();

  const [{ data: malzemeler }, { data: hareketler }, { data: santiyeler }] =
    await Promise.all([
      supabase.from("depo_malzemeler").select("*").eq("aktif", true).order("ad"),
      supabase
        .from("depo_hareket")
        .select("*, depo_malzemeler(*)")
        .eq("silindi", false)
        .order("tarih", { ascending: false })
        .limit(100),
      supabase.from("santiyeler").select("id, ad").eq("aktif", true).order("ad"),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Depo (Admin)</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Salt yönetim erişimi</p>
        </div>
        <Link href="/depo" className="text-sm text-perre-700 underline">
          Depo paneline git →
        </Link>
      </div>
      <DepoEnvanter
        malzemeler={(malzemeler ?? []) as DepoMalzeme[]}
        hareketler={(hareketler ?? []) as DepoHareket[]}
        santiyeler={(santiyeler ?? []) as { id: string; ad: string }[]}
        rol={profil.rol}
        kullaniciId={user.id}
      />
    </div>
  );
}
