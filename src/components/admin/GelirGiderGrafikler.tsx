"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GelirGider, ToplamMaliyet } from "@/lib/types";

type EkFinansKaydi = {
  tip: "gelir" | "gider";
  kategori: string | null;
  tutar: number;
  tarih: string;
};

const PARA = (v: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(v);

const PIE_COLORS = ["#0f766e", "#b45309", "#426142", "#779877", "#1e3a5f", "#a16207"];

export function GelirGiderGrafikler({
  maliyetler,
  kayitlar,
  ekKayitlar = [],
}: {
  maliyetler: ToplamMaliyet[];
  kayitlar: GelirGider[];
  ekKayitlar?: EkFinansKaydi[];
}) {
  const tumKayitlar = [...kayitlar, ...ekKayitlar];
  const ekGelir = ekKayitlar
    .filter((k) => k.tip === "gelir")
    .reduce((s, k) => s + Number(k.tutar), 0);
  const ekGider = ekKayitlar
    .filter((k) => k.tip === "gider")
    .reduce((s, k) => s + Number(k.tutar), 0);

  const toplamGelir =
    maliyetler.reduce((s, m) => s + Number(m.genel_gelir), 0) + ekGelir;
  const toplamGider =
    maliyetler.reduce((s, m) => s + Number(m.genel_gider), 0) +
    maliyetler.reduce((s, m) => s + Number(m.iscilik_maliyeti), 0) +
    maliyetler.reduce((s, m) => s + Number(m.malzeme_maliyeti), 0) +
    ekGider;
  const net = toplamGelir - toplamGider;

  const pasta = [
    { name: "Gelir", value: toplamGelir },
    { name: "İşçilik", value: maliyetler.reduce((s, m) => s + Number(m.iscilik_maliyeti), 0) },
    { name: "Malzeme", value: maliyetler.reduce((s, m) => s + Number(m.malzeme_maliyeti), 0) },
    { name: "Genel Gider", value: maliyetler.reduce((s, m) => s + Number(m.genel_gider), 0) },
    { name: "Ofis/Depo", value: ekGider },
  ].filter((x) => x.value > 0);

  const santiyeBar = maliyetler.map((m) => ({
    ad: m.santiye_adi.length > 12 ? m.santiye_adi.slice(0, 12) + "…" : m.santiye_adi,
    Gelir: Number(m.genel_gelir),
    Gider:
      Number(m.genel_gider) +
      Number(m.iscilik_maliyeti) +
      Number(m.malzeme_maliyeti),
  }));

  const ayMap = new Map<string, { ay: string; Gelir: number; Gider: number }>();
  for (const k of tumKayitlar) {
    const ay = String(k.tarih).slice(0, 7);
    const mevcut = ayMap.get(ay) ?? { ay, Gelir: 0, Gider: 0 };
    if (k.tip === "gelir") mevcut.Gelir += Number(k.tutar);
    else mevcut.Gider += Number(k.tutar);
    ayMap.set(ay, mevcut);
  }
  const aylik = Array.from(ayMap.values()).sort((a, b) => a.ay.localeCompare(b.ay));

  const kategoriMap = new Map<string, number>();
  for (const k of tumKayitlar.filter((x) => x.tip === "gider")) {
    const key = k.kategori?.trim() || "Diğer";
    kategoriMap.set(key, (kategoriMap.get(key) ?? 0) + Number(k.tutar));
  }
  const kategoriler = Array.from(kategoriMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="kart border-emerald-200 bg-emerald-50/60 p-5">
          <p className="text-sm text-emerald-800">Toplam Gelir</p>
          <p className="mt-2 font-display text-2xl font-semibold text-emerald-900">
            {PARA(toplamGelir)}
          </p>
        </div>
        <div className="kart border-amber-200 bg-amber-50/60 p-5">
          <p className="text-sm text-amber-800">Toplam Gider</p>
          <p className="mt-2 font-display text-2xl font-semibold text-amber-900">
            {PARA(toplamGider)}
          </p>
        </div>
        <div
          className={`kart p-5 ${
            net >= 0
              ? "border-teal-200 bg-teal-50/60"
              : "border-red-200 bg-red-50/60"
          }`}
        >
          <p className="text-sm text-[var(--muted)]">Net (Gelir − Gider)</p>
          <p
            className={`mt-2 font-display text-2xl font-semibold ${
              net >= 0 ? "text-teal-900" : "text-red-800"
            }`}
          >
            {PARA(net)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="kart p-4">
          <h3 className="mb-3 font-display font-semibold">Dağılım Şeması</h3>
          <div className="h-72">
            {pasta.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                Veri yok
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pasta}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {pasta.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => PARA(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="kart p-4">
          <h3 className="mb-3 font-display font-semibold">
            Şantiye Bazlı Gelir / Gider
          </h3>
          <div className="h-72">
            {santiyeBar.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                Veri yok
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={santiyeBar}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d4ddd4" />
                  <XAxis dataKey="ad" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => PARA(v)} />
                  <Legend />
                  <Bar dataKey="Gelir" fill="#0f766e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Gider" fill="#b45309" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="kart p-4">
          <h3 className="mb-3 font-display font-semibold">Aylık Trend</h3>
          <div className="h-72">
            {aylik.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                Gelir-gider kaydı yok
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={aylik}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d4ddd4" />
                  <XAxis dataKey="ay" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => PARA(v)} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="Gelir"
                    stroke="#0f766e"
                    fill="#99f6e4"
                  />
                  <Area
                    type="monotone"
                    dataKey="Gider"
                    stroke="#b45309"
                    fill="#fde68a"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="kart p-4">
          <h3 className="mb-3 font-display font-semibold">Gider Kategorileri</h3>
          <div className="h-72">
            {kategoriler.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                Kategori verisi yok
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kategoriler} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d4ddd4" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(v: number) => PARA(v)} />
                  <Bar dataKey="value" name="Tutar" fill="#426142" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
