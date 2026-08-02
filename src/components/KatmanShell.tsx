"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROL_ETIKET, type Profil } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LogOut, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";

export type ShellNavItem = {
  href: string;
  etiket: string;
  ikon: ReactNode;
};

export function KatmanShell({
  profil,
  baslik,
  renk,
  nav,
  children,
  badge,
}: {
  profil: Profil;
  baslik: string;
  renk: string;
  nav: ShellNavItem[];
  children: ReactNode;
  badge?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [gecisVar, setGecisVar] = useState(false);

  async function cikis() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header
        className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/90 backdrop-blur"
        style={{ borderTopColor: renk, borderTopWidth: 3 }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-[var(--muted)] hover:bg-perre-50 lg:hidden"
              onClick={() => setAcik((v) => !v)}
            >
              {acik ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div>
              <p className="font-display text-lg font-semibold text-perre-900">
                Perre · {baslik}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {profil.ad_soyad} · {ROL_ETIKET[profil.rol]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {badge}
            <button
              type="button"
              onClick={cikis}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-[var(--muted)] hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              Çıkış
            </button>
          </div>
        </div>
        <nav
          className={cn(
            "mx-auto max-w-7xl gap-1 overflow-x-auto px-4 pb-3 lg:flex",
            acik ? "flex flex-col" : "hidden lg:flex lg:flex-row"
          )}
        >
          {nav.map((n) => {
            const aktif =
              pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                prefetch={false}
                onClick={() => {
                  setAcik(false);
                  if (pathname !== n.href) setGecisVar(true);
                }}
                className={cn(
                  "inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition",
                  aktif
                    ? "bg-perre-700 text-white"
                    : "text-[var(--muted)] hover:bg-perre-50 hover:text-perre-900"
                )}
              >
                {n.ikon}
                {n.etiket}
              </Link>
            );
          })}
        </nav>
      </header>
      {gecisVar && (
        <div className="fixed left-0 right-0 top-0 z-50 h-1 overflow-hidden bg-perre-100">
          <div className="h-full w-1/2 animate-pulse bg-perre-700" />
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
