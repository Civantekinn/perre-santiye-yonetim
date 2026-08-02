import { createClient } from "@/lib/supabase/server";
import type { Portal, Profil, Rol } from "@/lib/types";
import { normalizeRol, panelYolu, PORTAL_ROLLER } from "@/lib/types";
import { redirect } from "next/navigation";
import { cache } from "react";

export const getOturum = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profil }, { data: atamalar }] = await Promise.all([
    supabase
      .from("profiller")
      .select("id, ad_soyad, rol, katman, aktif, email, created_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("kullanici_santiye")
      .select("santiye_id")
      .eq("kullanici_id", user.id),
  ]);

  if (!profil) {
    return { user, profil: null as Profil | null, santiyeIds: [] as string[] };
  }

  const normalized: Profil = {
    ...(profil as Profil),
    rol: normalizeRol((profil as Profil).rol),
    katman:
      (profil as Profil).katman ??
      (normalizeRol((profil as Profil).rol) === "admin"
        ? "admin"
        : normalizeRol((profil as Profil).rol).startsWith("ofis")
          ? "ofis"
          : normalizeRol((profil as Profil).rol) === "depo_sorumlusu"
            ? "depo"
            : "santiye"),
    aktif: (profil as Profil).aktif !== false,
    email: (profil as Profil).email ?? user.email ?? null,
  };

  return {
    user,
    profil: normalized,
    santiyeIds: (atamalar ?? []).map((a) => a.santiye_id as string),
  };
});

export async function requireOturum() {
  const oturum = await getOturum();
  if (!oturum?.profil) redirect("/");
  if (oturum.profil.aktif === false) redirect("/?pasif=1");
  return oturum as {
    user: NonNullable<Awaited<ReturnType<typeof getOturum>>>["user"];
    profil: Profil;
    santiyeIds: string[];
  };
}

export async function requireRol(izinli: Rol[]) {
  const oturum = await requireOturum();
  if (!izinli.includes(oturum.profil.rol)) {
    redirect(panelYolu(oturum.profil.rol));
  }
  return oturum;
}

export function rolIzin(rol: Rol, izinli: Rol[]) {
  return izinli.includes(rol);
}

export function portalIzin(rol: Rol, portal: Portal) {
  return PORTAL_ROLLER[portal].includes(rol);
}

export function paraFormat(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

export function tarihFormat(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function bugunISO() {
  return new Date().toISOString().slice(0, 10);
}
