import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DepoHareket, DepoMalzeme } from "@/lib/types";
import { DepoEnvanter } from "@/components/depo/DepoEnvanter";

export default async function DepoHome() {
  const { profil, user } = await requireRol(["depo_sorumlusu"]);
  const supabase = createClient();

  const [{ data: malzemeler }, { data: hareketler }, { data: santiyeler }] =
    await Promise.all([
      supabase.from("depo_malzemeler").select("*").eq("aktif", true).order("ad"),
      supabase
        .from("depo_hareket")
        .select("*, depo_malzemeler(*)")
        .eq("silindi", false)
        .order("tarih", { ascending: false })
        .limit(200),
      supabase.from("santiyeler").select("id, ad").eq("aktif", true).order("ad"),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Depo Envanteri</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Merkezi depo — şantiye stoklarından ayrı</p>
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
