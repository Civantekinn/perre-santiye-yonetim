"use client";

import { useState } from "react";

export default function KurulumPage() {
  const [url, setUrl] = useState("");
  const [anon, setAnon] = useState("");
  const [service, setService] = useState("");
  const [kopyalandi, setKopyalandi] = useState(false);

  const envIcerik = [
    `NEXT_PUBLIC_SUPABASE_URL=${url || "https://XXXX.supabase.co"}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon || "eyJ..."}`,
    `SUPABASE_SERVICE_ROLE_KEY=${service || "eyJ..."}`,
    "",
    "# Firebase (isteğe bağlı — sonra eklenebilir)",
    "FIREBASE_PROJECT_ID=",
    "FIREBASE_CLIENT_EMAIL=",
    'FIREBASE_PRIVATE_KEY=""',
  ].join("\n");
  const migrationlar = [
    "001_schema.sql",
    "002_audit_triggers.sql",
    "003_rls.sql",
    "004_perf_santiye.sql",
    "004_webhook_notlari.sql",
    "005_katmanlar.sql",
    "006_fix_handle_new_user.sql",
    "007_santiye_yazma.sql",
    "008_santiye_olustur.sql",
    "009_temiz_baslangic.sql",
    "010_santiye_audit.sql",
    "011_malzeme_tur_belge.sql",
    "012_sirket_finans_ozeti.sql",
    "013_gezinme_performans.sql",
    "014_ofis_puantaj.sql",
    "015_ofis_yazma_izinleri.sql",
    "016_santiye_is_gorselleri.sql",
    "017_santiye_personel_iletisim.sql",
    "018_sirket_risk_duzeltmeleri.sql",
  ];

  async function kopyala() {
    await navigator.clipboard.writeText(envIcerik);
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold text-perre-900">
          Perre — Kurulum
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Uygulama henüz Supabase’e bağlanmamış. Aşağıdaki adımları tamamlayın.
        </p>
      </div>

      <ol className="space-y-6">
        <li className="kart space-y-3 p-5">
          <p className="font-display text-lg font-semibold">
            1. Ücretsiz Supabase projesi açın
          </p>
          <p className="text-sm text-[var(--muted)]">
            Google veya GitHub ile giriş yapıp yeni proje oluşturun (2–3 dakika).
          </p>
          <a
            href="https://supabase.com/dashboard/new"
            target="_blank"
            rel="noreferrer"
            className="btn-primary inline-flex"
          >
            Supabase’de Proje Aç →
          </a>
        </li>

        <li className="kart space-y-3 p-5">
          <p className="font-display text-lg font-semibold">
            2. API anahtarlarını alın
          </p>
          <p className="text-sm text-[var(--muted)]">
            Proje → <strong>Project Settings</strong> → <strong>API</strong>{" "}
            sayfasından:
          </p>
          <ul className="list-inside list-disc text-sm text-[var(--muted)]">
            <li>
              <strong>Project URL</strong>
            </li>
            <li>
              <strong>anon public</strong> key
            </li>
            <li>
              <strong>service_role</strong> key (gizli tutun)
            </li>
          </ul>
          <div className="grid gap-3">
            <div>
              <label className="label">Project URL</label>
              <input
                className="input"
                placeholder="https://xxxx.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="label">anon public key</label>
              <input
                className="input font-mono text-xs"
                placeholder="eyJhbGciOi..."
                value={anon}
                onChange={(e) => setAnon(e.target.value)}
              />
            </div>
            <div>
              <label className="label">service_role key</label>
              <input
                className="input font-mono text-xs"
                placeholder="eyJhbGciOi..."
                value={service}
                onChange={(e) => setService(e.target.value)}
              />
            </div>
          </div>
        </li>

        <li className="kart space-y-3 p-5">
          <p className="font-display text-lg font-semibold">
            3. `.env.local` dosyasını oluşturun
          </p>
          <p className="text-sm text-[var(--muted)]">
            Proje klasöründe{" "}
            <code className="rounded bg-perre-50 px-1">.env.local</code> adlı
            dosya oluşturup aşağıyı yapıştırın, kaydedin.
          </p>
          <pre className="overflow-x-auto rounded-xl bg-[#1a241a] p-4 text-xs text-green-100">
            {envIcerik}
          </pre>
          <button type="button" className="btn-secondary" onClick={kopyala}>
            {kopyalandi ? "Kopyalandı ✓" : "Panoya Kopyala"}
          </button>
          <p className="text-xs text-[var(--muted)]">
            Dosya yolu:{" "}
            <code>
              C:\Users\Civan Tekin\Projects\perre-santiye-yonetim\.env.local
            </code>
          </p>
        </li>

        <li className="kart space-y-3 p-5">
          <p className="font-display text-lg font-semibold">
            4. Veritabanı şemasını yükleyin
          </p>
          <p className="text-sm text-[var(--muted)]">
            Supabase → <strong>SQL Editor</strong> → New query. Önerilen yol:
            <code className="mx-1 rounded bg-perre-50 px-1">
              supabase/KURULUM_HEPSI.sql
            </code>
            dosyasını tek seferde çalıştırın.
          </p>
          <p className="text-sm text-[var(--muted)]">
            Ayrı ayrı çalıştıracaksanız sıra şu olmalı:
          </p>
          <ol className="list-inside list-decimal space-y-1 text-sm text-[var(--muted)]">
            {migrationlar.map((dosya) => (
              <li key={dosya}>
                <code>supabase/migrations/{dosya}</code>
              </li>
            ))}
            <li>
              <code>supabase/seed.sql</code>
            </li>
            <li>
              <code>supabase/seed-data.sql</code> (örnek veriler)
            </li>
          </ol>
        </li>

        <li className="kart space-y-3 p-5">
          <p className="font-display text-lg font-semibold">
            5. İlk admin kullanıcısını oluşturun
          </p>
          <p className="text-sm text-[var(--muted)]">
            Authentication → Users → Add user (e-posta + şifre). Sonra SQL
            Editor’de:
          </p>
          <pre className="overflow-x-auto rounded-xl bg-[#1a241a] p-4 text-xs text-green-100">{`insert into public.profiller (id, ad_soyad, rol)
select id, coalesce(raw_user_meta_data->>'ad_soyad', email), 'admin'
from auth.users
order by created_at
limit 1
on conflict (id) do update set rol = 'admin';`}</pre>
        </li>

        <li className="kart space-y-3 p-5">
          <p className="font-display text-lg font-semibold">
            6. Uygulamayı yeniden başlatın
          </p>
          <pre className="overflow-x-auto rounded-xl bg-[#1a241a] p-4 text-xs text-green-100">
            {`cd "C:\\Users\\Civan Tekin\\Projects\\perre-santiye-yonetim"
npm run dev`}
          </pre>
          <p className="text-sm text-[var(--muted)]">
            Ardından{" "}
            <a href="/giris" className="text-perre-700 underline">
              /giris
            </a>{" "}
            sayfasından giriş yapın.
          </p>
        </li>
      </ol>

      <p className="mt-8 text-center text-sm text-[var(--muted)]">
        Anahtarları buraya yapıştırıp bana da iletebilirsiniz —{" "}
        <strong>.env.local</strong> dosyasını sizin için oluştururum. (service_role
        anahtarını sohbette paylaşmayın; sadece anon + URL yeter.)
      </p>
    </div>
  );
}
