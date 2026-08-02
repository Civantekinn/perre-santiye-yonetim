"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "firebase/auth";
import { Cloud, HardDrive, LogOut, RefreshCw } from "lucide-react";
import { firebaseCikis, firebaseOturumDinle } from "@/lib/firebase-client";

export function FirebasePanel() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [hazir, setHazir] = useState(false);
  const [mesaj, setMesaj] = useState("");

  useEffect(() => {
    const unsub = firebaseOturumDinle((u) => {
      setUser(u);
      setHazir(true);
      if (!u) router.replace("/giris/firebase");
    });
    return unsub;
  }, [router]);

  async function cikis() {
    await firebaseCikis();
    router.replace("/giris/firebase");
  }

  if (!hazir) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--muted)]">
        Yükleniyor…
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-amber-700" />
            <span className="font-display text-lg font-semibold">Firebase Yedek</span>
          </div>
          <button type="button" className="btn-secondary text-sm" onClick={cikis}>
            <LogOut className="h-4 w-4" />
            Çıkış
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Yedek paneli</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Giriş: {user.email}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="kart space-y-2 p-5">
            <div className="flex items-center gap-2 text-amber-800">
              <Cloud className="h-5 w-5" />
              <h2 className="font-semibold">Firebase (bulut)</h2>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Supabase&apos;teki veriler Firestore&apos;a yedeklenir. Ana admin
              panelinden tam senkron başlatılabilir.
            </p>
            <a
              className="btn-secondary inline-flex text-sm"
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noreferrer"
            >
              Firebase Console
            </a>
          </div>

          <div className="kart space-y-2 p-5">
            <div className="flex items-center gap-2 text-perre-800">
              <HardDrive className="h-5 w-5" />
              <h2 className="font-semibold">Bilgisayar (Excel)</h2>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Bu bilgisayarda yedek için terminalde:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-stone-100 p-3 text-xs">
              {`cd yedek-servisi
npm install
npm start`}
            </pre>
            <p className="text-xs text-[var(--muted)]">
              İlk açılışta klasör seçin — kayıtlar .xlsx olarak yazılır.
            </p>
          </div>
        </div>

        <div className="kart space-y-3 p-5">
          <h2 className="font-semibold">Ne yapılır?</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>Ana Admin ile sisteme girin</li>
            <li>
              <Link href="/admin/yedekleme" className="text-perre-800 underline">
                Yedekleme
              </Link>{" "}
              sayfasından Firebase senkronunu çalıştırın
            </li>
            <li>Bu bilgisayarda <code>npm run yedek</code> ile Excel yedeğini açık tutun</li>
          </ol>
          {mesaj && <p className="text-sm text-perre-700">{mesaj}</p>}
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              setMesaj(
                "Senkron için Ana Admin → Yedekleme sayfasındaki butonu kullanın."
              )
            }
          >
            <RefreshCw className="h-4 w-4" />
            Nasıl senkronlanır?
          </button>
        </div>
      </main>
    </div>
  );
}
