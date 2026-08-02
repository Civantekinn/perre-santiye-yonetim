import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { OfisOdeme, OfisPersonel, OfisPuantaj } from "@/lib/types";
import { OfisPersonelForm } from "@/components/ofis/OfisPersonelForm";

export default async function OfisPersonelPage() {
  const { profil, user } = await requireRol(["ofis_admin", "ofis_personeli"]);
  const supabase = createClient();
  const [{ data: personeller }, { data: puantajlar }, { data: odemeler }] =
    await Promise.all([
      supabase.from("ofis_personeller").select("*").order("ad_soyad"),
      supabase
        .from("ofis_puantaj")
        .select("*")
        .eq("silindi", false)
        .order("tarih", { ascending: false })
        .limit(200),
      supabase
        .from("ofis_odemeler")
        .select("*, ofis_personeller(*)")
        .eq("silindi", false)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Ofis Personeli</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Sadece ofis kadrosu</p>
      </div>
      <OfisPersonelForm
        personeller={(personeller ?? []) as OfisPersonel[]}
        puantajlar={(puantajlar ?? []) as OfisPuantaj[]}
        odemeler={(odemeler ?? []) as OfisOdeme[]}
        rol={profil.rol}
        kullaniciId={user.id}
      />
    </div>
  );
}
