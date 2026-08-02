"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cloud, HardDrive, RefreshCw } from "lucide-react";

export function YedekAksiyonlar({
  firebaseHazir,
}: {
  firebaseHazir: boolean;
}) {
  const router = useRouter();
  const [mesaj, setMesaj] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    fetch("/api/admin/firebase-senkron")
      .then((r) => r.json())
      .then((d) => {
        if (!d.firebase) {
          setMesaj(
            "Firebase sunucu anahtarları henüz yok. .env.local / Vercel’e FIREBASE_* ekleyin."
          );
        }
      })
      .catch(() => {});
  }, []);

  async function senkronla() {
    setYukleniyor(true);
    setMesaj("");
    try {
      const res = await fetch("/api/admin/firebase-senkron", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMesaj(data.hata || "Senkron başarısız");
      } else {
        const toplam = (data.ozet as { adet: number }[]).reduce(
          (a, x) => a + Math.max(0, x.adet),
          0
        );
        setMesaj(`Firebase’e yazıldı · ${toplam} kayıt`);
        router.refresh();
      }
    } catch (e) {
      setMesaj(e instanceof Error ? e.message : "Hata");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="kart space-y-4 p-5">
      <h2 className="font-display font-semibold">Yedek işlemleri</h2>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-primary"
          onClick={senkronla}
          disabled={yukleniyor || !firebaseHazir}
        >
          <RefreshCw className={`h-4 w-4 ${yukleniyor ? "animate-spin" : ""}`} />
          {yukleniyor ? "Senkronlanıyor…" : "Firebase’e şimdi yaz"}
        </button>
        <Link href="/giris/firebase" className="btn-secondary">
          <Cloud className="h-4 w-4" />
          Firebase giriş sayfası
        </Link>
        <a
          className="btn-secondary"
          href="https://console.firebase.google.com/"
          target="_blank"
          rel="noreferrer"
        >
          Firebase Console
        </a>
      </div>
      <div className="rounded-xl bg-stone-50 p-4 text-sm text-[var(--muted)]">
        <p className="mb-2 flex items-center gap-2 font-medium text-perre-900">
          <HardDrive className="h-4 w-4" />
          Bilgisayara kaydet (Excel)
        </p>
        <pre className="overflow-x-auto rounded-lg bg-white p-3 text-xs text-stone-800">
          {`cd yedek-servisi
npm install
npm start`}
        </pre>
        <p className="mt-2 text-xs">
          Klasör seçilir; her değişiklik ilgili .xlsx dosyasına yazılır. Servisi
          açık bırakın.
        </p>
      </div>
      {mesaj && <p className="text-sm text-perre-800">{mesaj}</p>}
    </div>
  );
}
