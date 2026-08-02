import type { Rol } from "@/lib/types";

export type OnayDurumu = "bekliyor" | "onaylandi" | "reddedildi";

/** Admin doğrudan kaydederse onaylı; diğer roller onay bekler */
export function varsayilanOnay(rol: Rol): OnayDurumu {
  return rol === "admin" ? "onaylandi" : "bekliyor";
}

export const ONAY_ETIKET: Record<OnayDurumu, string> = {
  bekliyor: "Onay bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
};
