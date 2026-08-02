import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/middleware";
import type { Rol } from "@/lib/types";

const IZINLI_ROLLER: Rol[] = ["admin", "depo_sorumlusu", "santiye_sefi"];

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { data: profil } = await supabase
    .from("profiller")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!profil || !IZINLI_ROLLER.includes(profil.rol as Rol)) {
    return NextResponse.json({ error: "Yetkisiz işlem" }, { status: 403 });
  }

  const body = await req.json();
  const id = body?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: "Eksik hareket id gerekli" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service.rpc("eksik_malzeme_karsila", {
    p_eksik_id: id,
    p_kullanici_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const sonuc = data as { ok?: boolean; error?: string; alreadyDone?: boolean } | null;
  if (!sonuc?.ok) {
    return NextResponse.json(
      { error: sonuc?.error ?? "Karşılama başarısız" },
      { status: 400 }
    );
  }

  return NextResponse.json(sonuc);
}
