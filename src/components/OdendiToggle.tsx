"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { bugunISO } from "@/lib/client-utils";

export function OdendiToggle({
  tablo,
  id,
  odendi,
}: {
  tablo: "odemeler" | "isci_maas_odemeleri";
  id: string;
  odendi: boolean;
}) {
  const router = useRouter();

  async function degistir() {
    const supabase = createClient();
    await supabase
      .from(tablo)
      .update({
        odendi_mi: !odendi,
        odeme_tarihi: !odendi ? bugunISO() : null,
      })
      .eq("id", id);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={degistir}
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        odendi
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {odendi ? "Ödendi" : "Ödenmedi"}
    </button>
  );
}
