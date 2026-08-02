import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profil } from "@/lib/types";
import { HesapYonetimi } from "@/components/admin/HesapYonetimi";

export default async function AdminHesaplarPage() {
  await requireRol(["admin"]);
  const supabase = createClient();

  const [{ data: kullanicilar }, { data: santiyeler }, { data: atamalar }] =
    await Promise.all([
      supabase.from("profiller").select("*").order("ad_soyad"),
      supabase.from("santiyeler").select("id, ad").eq("aktif", true).order("ad"),
      supabase.from("kullanici_santiye").select("kullanici_id, santiye_id"),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Hesaplar & Roller</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Ofis, şantiye ve depo kullanıcılarına giriş hesabı verin
        </p>
      </div>
      <HesapYonetimi
        kullanicilar={(kullanicilar ?? []) as Profil[]}
        santiyeler={(santiyeler ?? []) as { id: string; ad: string }[]}
        atamalar={(atamalar ?? []) as { kullanici_id: string; santiye_id: string }[]}
      />
    </div>
  );
}
