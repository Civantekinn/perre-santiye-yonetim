"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EksikKarsilaButon({
  id,
  kullaniciId,
}: {
  id: string;
  kullaniciId: string;
}) {
  const router = useRouter();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");

  async function karsila() {
    setYukleniyor(true);
    setHata("");
    const res = await fetch("/api/malzeme/eksik-karsila", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, kullaniciId }),
    });
    setYukleniyor(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setHata(data?.error ?? "İşlem başarısız");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="btn-primary"
        disabled={yukleniyor}
        onClick={karsila}
      >
        {yukleniyor ? "İşleniyor…" : "Karşılandı"}
      </button>
      {hata && <p className="text-xs text-red-700">{hata}</p>}
    </div>
  );
}
