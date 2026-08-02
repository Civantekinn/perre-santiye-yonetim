import { requireRol } from "@/lib/auth";
import { KatmanShell } from "@/components/KatmanShell";
import {
  LayoutDashboard,
  Building2,
  Users,
  ScrollText,
  DatabaseBackup,
  Warehouse,
  Activity,
  BadgeCheck,
  PieChart,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profil } = await requireRol(["admin"]);

  return (
    <KatmanShell
      profil={profil}
      baslik="Ana Admin"
      renk="#1e293b"
      nav={[
        {
          href: "/admin",
          etiket: "Özet",
          ikon: <LayoutDashboard className="h-4 w-4" />,
        },
        {
          href: "/admin/finans",
          etiket: "Şirket Karlılığı",
          ikon: <PieChart className="h-4 w-4" />,
        },
        {
          href: "/admin/onaylar",
          etiket: "Onaylar",
          ikon: <BadgeCheck className="h-4 w-4" />,
        },
        {
          href: "/admin/hareketler",
          etiket: "Hareketler",
          ikon: <Activity className="h-4 w-4" />,
        },
        {
          href: "/admin/hesaplar",
          etiket: "Hesaplar & Roller",
          ikon: <Users className="h-4 w-4" />,
        },
        {
          href: "/admin/santiyeler",
          etiket: "Şantiyeler",
          ikon: <Building2 className="h-4 w-4" />,
        },
        {
          href: "/admin/depo",
          etiket: "Depo (görüntüle)",
          ikon: <Warehouse className="h-4 w-4" />,
        },
        {
          href: "/admin/audit",
          etiket: "Denetim",
          ikon: <ScrollText className="h-4 w-4" />,
        },
        {
          href: "/admin/yedekleme",
          etiket: "Yedekleme",
          ikon: <DatabaseBackup className="h-4 w-4" />,
        },
      ]}
    >
      {children}
    </KatmanShell>
  );
}
