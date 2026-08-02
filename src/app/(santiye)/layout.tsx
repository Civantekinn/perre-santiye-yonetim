import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KatmanShell } from "@/components/KatmanShell";
import {
  LayoutDashboard,
  Building2,
  AlertTriangle,
  HardHat,
  FileBarChart,
} from "lucide-react";
import Link from "next/link";

export default async function SantiyeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profil } = await requireRol(["santiye_sefi", "saha_gorevlisi"]);
  const supabase = createClient();

  let bekleyenEksik = 0;
  if (profil.rol === "santiye_sefi") {
    const { count } = await supabase
      .from("malzeme_hareket")
      .select("id", { count: "estimated", head: true })
      .eq("tip", "eksik")
      .eq("durum", "bekliyor")
      .eq("silindi", false);
    bekleyenEksik = count ?? 0;
  }

  const nav =
    profil.rol === "saha_gorevlisi"
      ? [
          {
            href: "/santiye",
            etiket: "Panel",
            ikon: <LayoutDashboard className="h-4 w-4" />,
          },
          {
            href: "/santiye/santiyeler",
            etiket: "Şantiyeler",
            ikon: <Building2 className="h-4 w-4" />,
          },
          {
            href: "/santiye/saha",
            etiket: "Saha",
            ikon: <HardHat className="h-4 w-4" />,
          },
        ]
      : [
          {
            href: "/santiye",
            etiket: "Panel",
            ikon: <LayoutDashboard className="h-4 w-4" />,
          },
          {
            href: "/santiye/santiyeler",
            etiket: "Şantiyeler",
            ikon: <Building2 className="h-4 w-4" />,
          },
          {
            href: "/santiye/saha",
            etiket: "Saha",
            ikon: <HardHat className="h-4 w-4" />,
          },
          {
            href: "/santiye/raporlar",
            etiket: "Maliyet",
            ikon: <FileBarChart className="h-4 w-4" />,
          },
          {
            href: "/santiye/eksik-malzemeler",
            etiket: "Eksikler",
            ikon: <AlertTriangle className="h-4 w-4" />,
          },
        ];

  return (
    <KatmanShell
      profil={profil}
      baslik="Şantiye"
      renk="#426142"
      badge={
        bekleyenEksik > 0 ? (
          <Link
            href="/santiye/eksik-malzemeler"
            className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white"
          >
            {bekleyenEksik} eksik
          </Link>
        ) : null
      }
      nav={nav}
    >
      {children}
    </KatmanShell>
  );
}
