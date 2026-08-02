import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KatmanShell } from "@/components/KatmanShell";
import { LayoutDashboard, Package, AlertTriangle, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

export default async function DepoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Depo paneli — admin /depo üzerinden de bakabilir
  const { profil } = await requireRol(["depo_sorumlusu"]);
  const supabase = createClient();
  const { count } = await supabase
    .from("malzeme_hareket")
    .select("id", { count: "estimated", head: true })
    .eq("tip", "eksik")
    .eq("durum", "bekliyor")
    .eq("silindi", false);

  return (
    <KatmanShell
      profil={profil}
      baslik="Depo"
      renk="#0f766e"
      badge={
        (count ?? 0) > 0 ? (
          <Link
            href="/depo/eksikler"
            className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white"
          >
            {count} şantiye eksik
          </Link>
        ) : null
      }
      nav={[
        {
          href: "/depo",
          etiket: "Envanter",
          ikon: <LayoutDashboard className="h-4 w-4" />,
        },
        {
          href: "/depo/malzemeler",
          etiket: "Malzemeler",
          ikon: <Package className="h-4 w-4" />,
        },
        {
          href: "/depo/hareketler",
          etiket: "Hareketler",
          ikon: <ArrowLeftRight className="h-4 w-4" />,
        },
        {
          href: "/depo/eksikler",
          etiket: "Şantiye Eksikleri",
          ikon: <AlertTriangle className="h-4 w-4" />,
        },
      ]}
    >
      {children}
    </KatmanShell>
  );
}
