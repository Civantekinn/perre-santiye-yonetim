import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { OfisOdeme, OfisPersonel } from "@/lib/types";
import { OfisOdemeForm } from "@/components/ofis/OfisOdemeForm";

export default async function OfisOdemelerPage() {
  const { profil, user } = await requireRol(["ofis_admin", "ofis_personeli"]);
  const supabase = createClient();
  const [{ data: odemeler }, { data: personeller }] = await Promise.all([
    supabase
      .from("ofis_odemeler")
      .select("*, ofis_personeller(*)")
      .eq("silindi", false)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("ofis_personeller").select("*").eq("aktif", true).order("ad_soyad"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Ofis Ödemeleri</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Ofis personel ödemeleri</p>
      </div>
      <OfisOdemeForm
        odemeler={(odemeler ?? []) as OfisOdeme[]}
        personeller={(personeller ?? []) as OfisPersonel[]}
        rol={profil.rol}
        kullaniciId={user.id}
      />
    </div>
  );
}
