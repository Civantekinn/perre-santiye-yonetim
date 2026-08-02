"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  normalizeRol,
  panelYolu,
  PORTAL_ROLLER,
  type Portal,
} from "@/lib/types";

const PORTAL_BASLIK: Record<Portal, { baslik: string; alt: string }> = {
  admin: {
    baslik: "Ana Admin Girişi",
    alt: "Sistem yönetimi, hesap ve denetim",
  },
  ofis: {
    baslik: "Ofis Girişi",
    alt: "Ofis personel, masraf ve ödemeler",
  },
  santiye: {
    baslik: "Şantiye / Depo Girişi",
    alt: "Şantiye paneli veya depo envanteri",
  },
};

export function PortalGirisForm({ portal }: { portal: Portal }) {
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const meta = PORTAL_BASLIK[portal];

  async function girisYap(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    setYukleniyor(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: sifre,
    });
    if (error || !data.user) {
      setYukleniyor(false);
      setHata("E-posta veya şifre hatalı.");
      return;
    }

    const { data: profil } = await supabase
      .from("profiller")
      .select("id, rol, aktif")
      .eq("id", data.user.id)
      .single();

    if (!profil) {
      await supabase.auth.signOut();
      setYukleniyor(false);
      setHata("Profil bulunamadı. Ana yöneticiye bildirin.");
      return;
    }

    const rol = normalizeRol(profil.rol);
    if (profil.aktif === false) {
      await supabase.auth.signOut();
      setYukleniyor(false);
      setHata("Hesabınız pasif. Ana yöneticiye başvurun.");
      return;
    }

    if (!PORTAL_ROLLER[portal].includes(rol)) {
      await supabase.auth.signOut();
      setYukleniyor(false);
      setHata(
        "Bu hesap bu giriş kapısı için yetkili değil. Doğru kapıyı seçin."
      );
      return;
    }

    await supabase.from("oturum_log").insert({
      kullanici_id: data.user.id,
      portal,
      islem: "giris",
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    });

    window.location.assign(panelYolu(rol));
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            portal === "admin"
              ? "linear-gradient(145deg, #1a1a24 0%, #2d364e 45%, #3d567a 100%)"
              : portal === "ofis"
                ? "linear-gradient(145deg, #241a1a 0%, #4e3636 45%, #7a5656 100%)"
                : "linear-gradient(145deg, #1a241a 0%, #364e36 45%, #567a56 100%)",
        }}
      />

      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <Link href="/" className="text-sm text-white/60 hover:text-white">
            ← Kapı seçimine dön
          </Link>
          <h1 className="mt-4 font-display text-3xl font-semibold">Perre</h1>
          <p className="mt-2 text-white/70">{meta.baslik}</p>
        </div>

        <form
          onSubmit={girisYap}
          className="rounded-3xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur"
        >
          <h2 className="font-display text-xl font-semibold text-perre-900">
            {meta.baslik}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{meta.alt}</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label" htmlFor="sifre">
                Şifre
              </label>
              <input
                id="sifre"
                type="password"
                className="input"
                value={sifre}
                onChange={(e) => setSifre(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {hata && (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {hata}
            </p>
          )}

          <button
            type="submit"
            disabled={yukleniyor}
            className="btn-primary mt-6 w-full"
          >
            {yukleniyor ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
