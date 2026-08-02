"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cloud } from "lucide-react";
import {
  firebaseConfigKaydet,
  firebaseConfigOku,
  firebaseGiris,
  type FirebaseWebConfig,
} from "@/lib/firebase-client";

export function FirebaseGirisForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [cfgHazir, setCfgHazir] = useState(false);
  const [gosterKurulum, setGosterKurulum] = useState(false);
  const [cfg, setCfg] = useState<FirebaseWebConfig>({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  });

  useEffect(() => {
    const mevcut = firebaseConfigOku();
    if (mevcut?.apiKey) {
      setCfg(mevcut);
      setCfgHazir(true);
    } else {
      setGosterKurulum(true);
    }
  }, []);

  function kaydetConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId) {
      setHata("apiKey, authDomain, projectId ve appId zorunlu.");
      return;
    }
    firebaseConfigKaydet(cfg);
    setCfgHazir(true);
    setGosterKurulum(false);
    setHata("");
    // sayfayı yenile ki firebase app yeniden initsin
    window.location.reload();
  }

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    setYukleniyor(true);
    try {
      await firebaseGiris(email, sifre);
      router.push("/firebase");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Giriş başarısız";
      if (msg.includes("auth/invalid-credential") || msg.includes("user-not-found")) {
        setHata("E-posta veya şifre hatalı.");
      } else if (msg.includes("email-already-in-use")) {
        setHata("Bu e-posta zaten kayıtlı. Giriş yapın.");
      } else if (msg.includes("weak-password")) {
        setHata("Şifre en az 6 karakter olmalı.");
      } else if (msg.includes("yapılandırılmamış")) {
        setHata("Önce Firebase web yapılandırmasını kaydedin.");
        setGosterKurulum(true);
      } else {
        setHata(msg);
      }
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="text-center text-white">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-200">
          <Cloud className="h-7 w-7" />
        </div>
        <h1 className="font-display text-3xl font-semibold">Firebase Yedek</h1>
        <p className="mt-2 text-sm text-white/70">
          Bulut yedekleme hesabı — veri Firebase Firestore&apos;a yazılır
        </p>
      </div>

      {gosterKurulum && (
        <form onSubmit={kaydetConfig} className="kart space-y-3 p-5">
          <p className="text-sm text-[var(--muted)]">
            Firebase Console → Project settings → Your apps → Web app → config
            değerlerini yapıştırın.
          </p>
          {(
            [
              ["apiKey", "apiKey"],
              ["authDomain", "authDomain"],
              ["projectId", "projectId"],
              ["appId", "appId"],
              ["storageBucket", "storageBucket (opsiyonel)"],
              ["messagingSenderId", "messagingSenderId (opsiyonel)"],
            ] as const
          ).map(([key, label]) => (
            <input
              key={key}
              className="input"
              placeholder={label}
              value={cfg[key] ?? ""}
              onChange={(e) => setCfg({ ...cfg, [key]: e.target.value })}
              required={["apiKey", "authDomain", "projectId", "appId"].includes(key)}
            />
          ))}
          <button type="submit" className="btn-primary w-full">
            Yapılandırmayı Kaydet
          </button>
        </form>
      )}

      {cfgHazir && !gosterKurulum && (
        <form onSubmit={gonder} className="kart space-y-3 p-5">
          <input
            className="input"
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Şifre"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            required
            minLength={6}
          />
          {hata && <p className="text-sm text-red-600">{hata}</p>}
          <button type="submit" className="btn-primary w-full" disabled={yukleniyor}>
            {yukleniyor ? "Bekleyin…" : "Giriş Yap"}
          </button>
          <button
            type="button"
            className="w-full text-center text-xs text-[var(--muted)] underline"
            onClick={() => setGosterKurulum(true)}
          >
            Firebase yapılandırmasını değiştir
          </button>
        </form>
      )}

      <p className="text-center text-sm text-white/60">
        <Link href="/" className="underline">
          Ana sayfaya dön
        </Link>
      </p>
    </div>
  );
}
