import { requireOturum, rolIzin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  IsciMaasOdeme,
  Malzeme,
  MalzemeHareket,
  Personel,
} from "@/lib/types";
import { redirect } from "next/navigation";
import { SahaPaneli } from "@/components/SahaPaneli";

export default async function SahaPage() {
  const { profil, user, santiyeIds } = await requireOturum();
  if (!rolIzin(profil.rol, ["saha_gorevlisi", "santiye_sefi"])) redirect("/santiye");

  const supabase = createClient();
  const ids = santiyeIds;

  if (ids.length === 0) {
    return (
      <div className="kart p-8 text-center text-[var(--muted)]">
        Atanmış şantiyeniz yok.
      </div>
    );
  }

  const { data: santiyeler } = await supabase
    .from("santiyeler")
    .select("id, ad")
    .in("id", ids)
    .order("ad");

  const { data: personeller } = await supabase
    .from("personeller")
    .select("*")
    .in("santiye_id", ids)
    .eq("aktif", true)
    .order("ad_soyad");

  const { data: malzemeler } = await supabase
    .from("malzemeler")
    .select("*")
    .in("santiye_id", ids)
    .order("ad");

  const { data: maaslar } = await supabase
    .from("isci_maas_odemeleri")
    .select("*, personeller(*)")
    .eq("kaydeden_kullanici_id", user.id)
    .eq("silindi", false)
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: hareketler } = await supabase
    .from("malzeme_hareket")
    .select("*, malzemeler(*)")
    .eq("kaydeden_kullanici_id", user.id)
    .eq("tip", "giris")
    .eq("silindi", false)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <SahaPaneli
      kullaniciId={user.id}
      rol={profil.rol}
      santiyeler={(santiyeler ?? []) as { id: string; ad: string }[]}
      personeller={(personeller ?? []) as Personel[]}
      malzemeler={(malzemeler ?? []) as Malzeme[]}
      maaslar={(maaslar ?? []) as IsciMaasOdeme[]}
      hareketler={(hareketler ?? []) as MalzemeHareket[]}
    />
  );
}
