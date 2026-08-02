"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROL_ETIKET, ROL_KATMAN, KATMAN_ETIKET, type Profil, type Rol } from "@/lib/types";

const ROLLER: Rol[] = [
  "admin",
  "ofis_admin",
  "ofis_personeli",
  "santiye_sefi",
  "saha_gorevlisi",
  "depo_sorumlusu",
];

export function HesapYonetimi({
  kullanicilar,
  santiyeler,
  atamalar,
}: {
  kullanicilar: (Profil & { email?: string | null })[];
  santiyeler: { id: string; ad: string }[];
  atamalar: { kullanici_id: string; santiye_id: string }[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ad, setAd] = useState("");
  const [rol, setRol] = useState<Rol>("santiye_sefi");
  const [seciliSantiyeler, setSeciliSantiyeler] = useState<string[]>([]);
  const [mesaj, setMesaj] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  const santiyeGoster = ROL_KATMAN[rol] === "santiye";

  async function olustur(e: React.FormEvent) {
    e.preventDefault();
    setYukleniyor(true);
    setMesaj("");
    const res = await fetch("/api/admin/hesaplar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        ad_soyad: ad,
        rol,
        santiye_ids: santiyeGoster ? seciliSantiyeler : [],
      }),
    });
    const json = await res.json();
    setYukleniyor(false);
    if (!res.ok) {
      setMesaj(json.error ?? "Hata");
      return;
    }
    setEmail("");
    setPassword("");
    setAd("");
    setSeciliSantiyeler([]);
    setMesaj("Hesap oluşturuldu");
    router.refresh();
  }

  async function aktifToggle(id: string, aktif: boolean) {
    setMesaj("");
    const res = await fetch("/api/admin/hesaplar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, aktif: !aktif }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMesaj(json.error ?? "Durum güncellenemedi");
      return;
    }
    router.refresh();
  }

  async function rolDegistir(id: string, yeniRol: Rol) {
    setMesaj("");
    const res = await fetch("/api/admin/hesaplar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, rol: yeniRol }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMesaj(json.error ?? "Rol güncellenemedi");
      return;
    }
    setMesaj("Rol güncellendi");
    router.refresh();
  }

  function toggleSantiye(id: string) {
    setSeciliSantiyeler((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={olustur} className="kart space-y-4 p-5">
        <h2 className="font-display font-semibold">Yeni hesap</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder="Ad Soyad" value={ad} onChange={(e) => setAd(e.target.value)} required />
          <input className="input" type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Şifre (min 8)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <select className="input" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
            {ROLLER.map((r) => (
              <option key={r} value={r}>
                {ROL_ETIKET[r]} ({KATMAN_ETIKET[ROL_KATMAN[r]]})
              </option>
            ))}
          </select>
        </div>
        {santiyeGoster && (
          <div>
            <p className="label mb-2">Şantiye ataması</p>
            <div className="flex flex-wrap gap-2">
              {santiyeler.map((s) => (
                <label key={s.id} className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={seciliSantiyeler.includes(s.id)}
                    onChange={() => toggleSantiye(s.id)}
                  />
                  {s.ad}
                </label>
              ))}
            </div>
          </div>
        )}
        <button type="submit" disabled={yukleniyor} className="btn-primary">
          {yukleniyor ? "Oluşturuluyor…" : "Hesap Oluştur"}
        </button>
        {mesaj && <p className="text-sm text-perre-800">{mesaj}</p>}
      </form>

      <div className="kart overflow-hidden">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-perre-50 text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Ad</th>
              <th className="px-4 py-3">E-posta</th>
              <th className="px-4 py-3">Katman / Rol</th>
              <th className="px-4 py-3">Şantiyeler</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {kullanicilar.map((k) => {
              const atanmis = atamalar
                .filter((a) => a.kullanici_id === k.id)
                .map((a) => santiyeler.find((s) => s.id === a.santiye_id)?.ad)
                .filter(Boolean);
              return (
                <tr key={k.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-medium">{k.ad_soyad}</td>
                  <td className="px-4 py-3 text-xs">{k.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      className="input py-1 text-xs"
                      value={k.rol}
                      onChange={(e) => rolDegistir(k.id, e.target.value as Rol)}
                    >
                      {ROLLER.map((r) => (
                        <option key={r} value={r}>
                          {ROL_ETIKET[r]}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[10px] text-[var(--muted)]">
                      {KATMAN_ETIKET[k.katman]}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs">{atanmis.join(", ") || "—"}</td>
                  <td className="px-4 py-3">{k.aktif !== false ? "Aktif" : "Pasif"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-xs font-semibold text-perre-700"
                      onClick={() => aktifToggle(k.id, k.aktif !== false)}
                    >
                      {k.aktif !== false ? "Pasifleştir" : "Aktifleştir"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
