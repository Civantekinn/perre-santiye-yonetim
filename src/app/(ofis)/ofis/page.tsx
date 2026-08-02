import { paraFormat, requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { OfisMasraf } from "@/lib/types";
import Link from "next/link";

export default async function OfisHome() {
  const { profil } = await requireRol(["ofis_admin", "ofis_personeli"]);
  const supabase = createClient();

  const [{ count: personelSay }, { data: masraflar }, { count: bekleyenOdeme }] =
    await Promise.all([
      supabase
        .from("ofis_personeller")
        .select("id", { count: "exact", head: true })
        .eq("aktif", true),
      supabase
        .from("ofis_masraflar")
        .select("*")
        .eq("silindi", false)
        .order("tarih", { ascending: false })
        .limit(200),
      supabase
        .from("ofis_odemeler")
        .select("id", { count: "exact", head: true })
        .eq("silindi", false)
        .eq("odendi_mi", false),
    ]);

  const liste = (masraflar ?? []) as OfisMasraf[];
  const gelir = liste.filter((m) => m.tip === "gelir").reduce((s, m) => s + Number(m.tutar), 0);
  const gider = liste.filter((m) => m.tip === "gider").reduce((s, m) => s + Number(m.tutar), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-perre-900">Ofis Paneli</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Merhaba {profil.ad_soyad.split(" ")[0]} — şantiye verileri bu panelde görünmez
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="kart p-5">
          <p className="text-sm text-[var(--muted)]">Aktif Ofis Personeli</p>
          <p className="mt-2 font-display text-2xl font-semibold">{personelSay ?? 0}</p>
        </div>
        <div className="kart p-5">
          <p className="text-sm text-[var(--muted)]">Ofis Gelir</p>
          <p className="mt-2 font-display text-2xl font-semibold text-emerald-700">{paraFormat(gelir)}</p>
        </div>
        <div className="kart p-5">
          <p className="text-sm text-[var(--muted)]">Ofis Gider</p>
          <p className="mt-2 font-display text-2xl font-semibold">{paraFormat(gider)}</p>
        </div>
        <div className="kart p-5">
          <p className="text-sm text-[var(--muted)]">Bekleyen Ödeme</p>
          <p className="mt-2 font-display text-2xl font-semibold">{bekleyenOdeme ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/ofis/personel" prefetch={false} className="kart p-5 hover:shadow-md">Personel →</Link>
        <Link href="/ofis/masraflar" prefetch={false} className="kart p-5 hover:shadow-md">Gelir-Gider →</Link>
        <Link href="/ofis/odemeler" prefetch={false} className="kart p-5 hover:shadow-md">Ödemeler →</Link>
      </div>
    </div>
  );
}
