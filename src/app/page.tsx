import { createClient } from "@/lib/supabase/server";
import { panelYolu, normalizeRol } from "@/lib/types";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Cloud, HardHat, Shield } from "lucide-react";

export default async function SplashPage({
  searchParams,
}: {
  searchParams: { pasif?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profil } = await supabase
      .from("profiller")
      .select("rol, aktif")
      .eq("id", user.id)
      .single();
    if (profil?.aktif !== false && profil?.rol) {
      redirect(panelYolu(normalizeRol(profil.rol)));
    }
  }

  const kartlar = [
    {
      href: "/giris/admin",
      baslik: "Ana Admin",
      aciklama: "Hesaplar, roller, denetim ve yedekleme",
      ikon: <Shield className="h-8 w-8" />,
      renk: "from-slate-800 to-slate-600",
    },
    {
      href: "/giris/ofis",
      baslik: "Ofis",
      aciklama: "Ofis personeli, masraflar ve ödemeler",
      ikon: <Building2 className="h-8 w-8" />,
      renk: "from-stone-800 to-rose-800",
    },
    {
      href: "/giris/santiye",
      baslik: "Şantiye",
      aciklama: "Şantiye paneli · Depo kullanıcıları da buradan",
      ikon: <HardHat className="h-8 w-8" />,
      renk: "from-perre-900 to-perre-600",
    },
    {
      href: "/giris/firebase",
      baslik: "Firebase Yedek",
      aciklama: "Bulut yedek girişi · bilgisayar Excel yedeği",
      ikon: <Cloud className="h-8 w-8" />,
      renk: "from-amber-900 to-amber-600",
    },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(145deg, #121812 0%, #243024 40%, #3d5a3d 100%)",
        }}
      />
      <div className="w-full max-w-4xl">
        <div className="mb-10 text-center text-white">
          <h1 className="font-display text-5xl font-semibold tracking-tight">
            Perre
          </h1>
          <p className="mt-3 text-lg text-white/70">
            Katmanlı yönetim — herkes kendi alanından sorumlu
          </p>
          {searchParams.pasif && (
            <p className="mt-4 rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-100">
              Hesabınız pasif durumda.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kartlar.map((k) => (
            <Link
              key={k.href}
              href={k.href}
              className={`group rounded-3xl bg-gradient-to-br ${k.renk} p-6 text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl`}
            >
              <div className="opacity-90">{k.ikon}</div>
              <h2 className="mt-4 font-display text-2xl font-semibold">
                {k.baslik}
              </h2>
              <p className="mt-2 text-sm text-white/75">{k.aciklama}</p>
              <p className="mt-6 text-sm font-medium text-white/90 group-hover:underline">
                Giriş yap →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
