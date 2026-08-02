"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ToplamMaliyet } from "@/lib/types";

export function MaliyetGrafik({ data }: { data: ToplamMaliyet[] }) {
  const chartData = data.map((d) => ({
    ad: d.santiye_adi.length > 14 ? d.santiye_adi.slice(0, 14) + "…" : d.santiye_adi,
    İşçilik: Number(d.iscilik_maliyeti),
    Malzeme: Number(d.malzeme_maliyeti),
    Gider: Number(d.genel_gider),
    Gelir: Number(d.genel_gelir),
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
        Grafik için veri yok
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d4ddd4" />
        <XAxis dataKey="ad" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number) =>
            new Intl.NumberFormat("tr-TR", {
              style: "currency",
              currency: "TRY",
              maximumFractionDigits: 0,
            }).format(value)
          }
        />
        <Legend />
        <Bar dataKey="İşçilik" fill="#426142" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Malzeme" fill="#779877" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Gider" fill="#b45309" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Gelir" fill="#0f766e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
