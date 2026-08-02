"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

export function RaporFiltre({
  santiyeler,
  secili,
  baslangic,
  bitis,
  santiyeGizle = false,
  hedefYol,
}: {
  santiyeler: { id: string; ad: string }[];
  secili?: string;
  baslangic?: string;
  bitis?: string;
  santiyeGizle?: boolean;
  hedefYol?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [santiye, setSantiye] = useState(secili ?? "");
  const [bas, setBas] = useState(baslangic ?? "");
  const [bit, setBit] = useState(bitis ?? "");

  function uygula(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (!santiyeGizle && santiye) p.set("santiye", santiye);
    if (bas) p.set("baslangic", bas);
    if (bit) p.set("bitis", bit);
    const yol = hedefYol ?? pathname ?? "/santiye/raporlar";
    router.push(`${yol}?${p.toString()}`);
  }

  return (
    <form onSubmit={uygula} className="kart flex flex-wrap items-end gap-3 p-4">
      {!santiyeGizle && (
        <div>
          <label className="label">Şantiye</label>
          <select
            className="input min-w-[200px]"
            value={santiye}
            onChange={(e) => setSantiye(e.target.value)}
          >
            <option value="">Şantiye seçin (hepsi)</option>
            {santiyeler.map((s) => (
              <option key={s.id} value={s.id}>
                {s.ad}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="label">Başlangıç</label>
        <input
          type="date"
          className="input"
          value={bas}
          onChange={(e) => setBas(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Bitiş</label>
        <input
          type="date"
          className="input"
          value={bit}
          onChange={(e) => setBit(e.target.value)}
        />
      </div>
      <button type="submit" className="btn-primary">
        Filtrele
      </button>
    </form>
  );
}
