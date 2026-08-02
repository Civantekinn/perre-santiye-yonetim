/** Ortak yedeklenen tablolar — Firebase + yerel Excel */
export const YEDEK_TABLOLAR = [
  "santiyeler",
  "personeller",
  "puantaj",
  "malzemeler",
  "malzeme_hareket",
  "santiye_is_gorselleri",
  "gelir_gider",
  "isci_maas_odemeleri",
  "odemeler",
  "ofis_personeller",
  "ofis_puantaj",
  "ofis_masraflar",
  "ofis_odemeler",
  "depo_malzemeler",
  "depo_hareket",
  "profiller",
  "kullanici_santiye",
  "audit_log",
] as const;

export type YedekTablo = (typeof YEDEK_TABLOLAR)[number];

export function yedekTabloMu(t: string): t is YedekTablo {
  return (YEDEK_TABLOLAR as readonly string[]).includes(t);
}
