import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/middleware";
import { ROL_KATMAN, type Rol } from "@/lib/types";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { data: profil } = await supabase
    .from("profiller")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (profil?.rol !== "admin") {
    return NextResponse.json({ error: "Sadece ana admin" }, { status: 403 });
  }

  const body = await req.json();
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const ad_soyad = String(body.ad_soyad ?? "").trim();
  const rol = body.rol as Rol;
  const santiyeIds: string[] = Array.isArray(body.santiye_ids) ? body.santiye_ids : [];

  if (!email || !password || !ad_soyad || !rol) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }
  if (!ROL_KATMAN[rol]) {
    return NextResponse.json({ error: "Geçersiz rol" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Şifre en az 8 karakter" }, { status: 400 });
  }

  const service = createServiceClient();
  const katman = ROL_KATMAN[rol];
  const { data: created, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { ad_soyad, rol },
  });
  if (error || !created.user) {
    const msg =
      (error as { message?: string })?.message ||
      (error ? JSON.stringify(error) : null) ||
      "Kullanıcı oluşturulamadı";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: pErr } = await service.from("profiller").upsert({
    id: created.user.id,
    ad_soyad,
    rol,
    katman,
    aktif: true,
    email,
  });
  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 400 });
  }

  if (katman === "santiye" && santiyeIds.length > 0) {
    const { error: aErr } = await service.from("kullanici_santiye").upsert(
      santiyeIds.map((santiye_id) => ({
        kullanici_id: created.user!.id,
        santiye_id,
      })),
      { onConflict: "kullanici_id,santiye_id" }
    );
    if (aErr) {
      return NextResponse.json({ error: aErr.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true, id: created.user.id });
}

export async function PATCH(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { data: profil } = await supabase
    .from("profiller")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (profil?.rol !== "admin") {
    return NextResponse.json({ error: "Sadece ana admin" }, { status: 403 });
  }

  const body = await req.json();
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const service = createServiceClient();
  const patch: Record<string, unknown> = {};
  if (typeof body.aktif === "boolean") patch.aktif = body.aktif;
  if (body.rol && ROL_KATMAN[body.rol as Rol]) {
    patch.rol = body.rol;
    patch.katman = ROL_KATMAN[body.rol as Rol];
  }
  if (body.ad_soyad) patch.ad_soyad = body.ad_soyad;

  const { error } = await service.from("profiller").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (Array.isArray(body.santiye_ids)) {
    await service.from("kullanici_santiye").delete().eq("kullanici_id", id);
    if (body.santiye_ids.length > 0) {
      await service.from("kullanici_santiye").insert(
        body.santiye_ids.map((santiye_id: string) => ({
          kullanici_id: id,
          santiye_id,
        }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}
