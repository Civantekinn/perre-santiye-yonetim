import { requireRol } from "@/lib/auth";
import { KatmanShell } from "@/components/KatmanShell";
import { LayoutDashboard, Users, Wallet, Receipt } from "lucide-react";

export default async function OfisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profil } = await requireRol(["ofis_admin", "ofis_personeli"]);

  return (
    <KatmanShell
      profil={profil}
      baslik="Ofis"
      renk="#9f1239"
      nav={[
        {
          href: "/ofis",
          etiket: "Panel",
          ikon: <LayoutDashboard className="h-4 w-4" />,
        },
        {
          href: "/ofis/personel",
          etiket: "Personel",
          ikon: <Users className="h-4 w-4" />,
        },
        {
          href: "/ofis/masraflar",
          etiket: "Gelir-Gider",
          ikon: <Receipt className="h-4 w-4" />,
        },
        {
          href: "/ofis/odemeler",
          etiket: "Ödemeler",
          ikon: <Wallet className="h-4 w-4" />,
        },
      ]}
    >
      {children}
    </KatmanShell>
  );
}
