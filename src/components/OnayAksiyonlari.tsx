"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OnayAksiyonlari({
  kaynak,
  id,
}: {
  kaynak:
    | "isci_maas"
    | "ofis_odeme"
    | "ofis_masraf"
    | "gelir_gider"
    | "depo_hareket"
    | "eksik";
  id: string;
}) {
  const router = useRouter();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [mesaj, setMesaj] = useState("");

  async function gonder(karar: "onaylandi" | "reddedildi") {
    setYukleniyor(true);
    setMesaj("");
    const res = await fetch("/api/onay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kaynak, id, karar }),
    });
    const data = await res.json();
    setYukleniyor(false);
    if (!res.ok) {
      setMesaj(data.error ?? "İşlem başarısız");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={yukleniyor}
        onClick={() => gonder("onaylandi")}
        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        Onayla
      </button>
      <button
        type="button"
        disabled={yukleniyor}
        onClick={() => gonder("reddedildi")}
        className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        Reddet
      </button>
      {mesaj && <span className="text-xs text-red-700">{mesaj}</span>}
    </div>
  );
}
