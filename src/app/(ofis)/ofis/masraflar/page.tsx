import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { OfisMasraf } from "@/lib/types";
import { OfisMasrafForm } from "@/components/ofis/OfisMasrafForm";

export default async function OfisMasraflarPage() {
  const { profil, user } = await requireRol(["ofis_admin", "ofis_personeli"]);
  const supabase = createClient();
  const { data } = await supabase
    .from("ofis_masraflar")
    .select("*")
    .eq("silindi", false)
    .order("tarih", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Ofis Gelir-Gider</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Şantiye maliyetleri burada yok</p>
      </div>
      <OfisMasrafForm
        kayitlar={(data ?? []) as OfisMasraf[]}
        rol={profil.rol}
        kullaniciId={user.id}
      />
    </div>
  );
}
