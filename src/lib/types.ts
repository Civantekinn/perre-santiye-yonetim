export type Katman = "admin" | "ofis" | "santiye" | "depo";

export type Rol =
  | "admin"
  | "ofis_admin"
  | "ofis_personeli"
  | "santiye_sefi"
  | "depo_sorumlusu"
  | "saha_gorevlisi";

/** Eski muhasebe rolü için geriye dönük alias */
export type LegacyRol = Rol | "muhasebe";

export const ROL_ETIKET: Record<Rol, string> = {
  admin: "Ana Yönetici",
  ofis_admin: "Ofis Yöneticisi",
  ofis_personeli: "Ofis Personeli",
  santiye_sefi: "Şantiye Şefi",
  depo_sorumlusu: "Depo Sorumlusu",
  saha_gorevlisi: "Saha Görevlisi",
};

export const KATMAN_ETIKET: Record<Katman, string> = {
  admin: "Ana Admin",
  ofis: "Ofis",
  santiye: "Şantiye",
  depo: "Depo",
};

export const ROL_KATMAN: Record<Rol, Katman> = {
  admin: "admin",
  ofis_admin: "ofis",
  ofis_personeli: "ofis",
  santiye_sefi: "santiye",
  depo_sorumlusu: "depo",
  saha_gorevlisi: "santiye",
};

export type Portal = "admin" | "ofis" | "santiye";

export const PORTAL_ROLLER: Record<Portal, Rol[]> = {
  admin: ["admin"],
  ofis: ["ofis_admin", "ofis_personeli"],
  santiye: ["santiye_sefi", "saha_gorevlisi", "depo_sorumlusu"],
};

export function panelYolu(rol: Rol): string {
  switch (ROL_KATMAN[rol]) {
    case "admin":
      return "/admin";
    case "ofis":
      return "/ofis";
    case "depo":
      return "/depo";
    default:
      return "/santiye";
  }
}

export function normalizeRol(rol: string): Rol {
  if (rol === "muhasebe") return "ofis_admin";
  return rol as Rol;
}

export type Profil = {
  id: string;
  ad_soyad: string;
  rol: Rol;
  katman: Katman;
  aktif: boolean;
  email: string | null;
  created_at: string;
};

export type Santiye = {
  id: string;
  ad: string;
  adres: string | null;
  aktif: boolean;
  created_at: string;
};

export type SantiyeIsGorseli = {
  id: string;
  santiye_id: string;
  baslik: string;
  aciklama: string | null;
  resim_path: string;
  tarih: string;
  kaydeden_kullanici_id: string | null;
  silindi: boolean;
  created_at: string;
};

export type Personel = {
  id: string;
  ad_soyad: string;
  pozisyon: string | null;
  gunluk_ucret: number | null;
  telefon: string | null;
  email: string | null;
  notlar: string | null;
  santiye_id: string | null;
  aktif: boolean;
  created_at: string;
};

export type Puantaj = {
  id: string;
  personel_id: string;
  tarih: string;
  geldi_mi: boolean;
  yemek_yedi_mi: boolean | null;
  notlar: string | null;
  giren_kullanici_id: string | null;
  silindi: boolean;
  created_at: string;
};

export type Malzeme = {
  id: string;
  ad: string;
  birim: string | null;
  tur: string | null;
  santiye_id: string | null;
  depo_malzeme_id?: string | null;
};

export type MalzemeHareketTip = "giris" | "cikis" | "fazla" | "eksik";
export type MalzemeDurum =
  | "bekliyor"
  | "onaylandi"
  | "karsilandi"
  | "iptal"
  | "reddedildi";
export type OnayDurumu = "bekliyor" | "onaylandi" | "reddedildi";

export type MalzemeHareket = {
  id: string;
  malzeme_id: string;
  tip: MalzemeHareketTip;
  miktar: number;
  birim_fiyat: number | null;
  tutar: number;
  tarih: string;
  aciklama: string | null;
  belge_url: string | null;
  fatura_url: string | null;
  resim_url: string | null;
  durum: MalzemeDurum;
  karsilanma_tarihi: string | null;
  karsilayan_kullanici_id: string | null;
  kaydeden_kullanici_id: string | null;
  kaynak_depo_hareket_id?: string | null;
  silindi: boolean;
  created_at: string;
  malzemeler?: Malzeme;
};

export type IsciMaasOdeme = {
  id: string;
  personel_id: string;
  santiye_id: string;
  donem_baslangic: string;
  donem_bitis: string;
  gun_sayisi: number | null;
  tutar: number;
  odeme_tarihi: string | null;
  odendi_mi: boolean;
  aciklama: string | null;
  kaydeden_kullanici_id: string | null;
  onay_durumu?: OnayDurumu;
  onaylayan_kullanici_id?: string | null;
  onay_tarihi?: string | null;
  onay_notu?: string | null;
  silindi: boolean;
  created_at: string;
  personeller?: Personel;
};

export type Odeme = {
  id: string;
  kullanici_id: string | null;
  tutar: number;
  donem_baslangic: string | null;
  donem_bitis: string | null;
  odendi_mi: boolean;
  odeme_tarihi: string | null;
  aciklama: string | null;
  created_at: string;
  profiller?: Profil;
};

export type GelirGider = {
  id: string;
  santiye_id: string | null;
  tip: "gelir" | "gider";
  kategori: string | null;
  tutar: number;
  tarih: string;
  aciklama: string | null;
  onay_durumu?: OnayDurumu;
  onaylayan_kullanici_id?: string | null;
  onay_tarihi?: string | null;
  onay_notu?: string | null;
  kaydeden_kullanici_id?: string | null;
  created_at: string;
};

export type OfisPersonel = {
  id: string;
  ad_soyad: string;
  pozisyon: string | null;
  telefon: string | null;
  email: string | null;
  maas: number | null;
  aktif: boolean;
  notlar: string | null;
  created_at: string;
};

export type OfisMasraf = {
  id: string;
  tip: "gelir" | "gider";
  kategori: string | null;
  tutar: number;
  tarih: string;
  aciklama: string | null;
  onay_durumu?: OnayDurumu;
  onaylayan_kullanici_id?: string | null;
  onay_tarihi?: string | null;
  onay_notu?: string | null;
  silindi: boolean;
  created_at: string;
};

export type OfisOdeme = {
  id: string;
  ofis_personel_id: string | null;
  tutar: number;
  donem_baslangic: string | null;
  donem_bitis: string | null;
  odendi_mi: boolean;
  odeme_tarihi: string | null;
  aciklama: string | null;
  onay_durumu?: OnayDurumu;
  onaylayan_kullanici_id?: string | null;
  onay_tarihi?: string | null;
  onay_notu?: string | null;
  silindi: boolean;
  created_at: string;
  ofis_personeller?: OfisPersonel;
};

export type OfisPuantaj = {
  id: string;
  ofis_personel_id: string;
  tarih: string;
  geldi_mi: boolean;
  yemek_yedi_mi: boolean;
  aciklama: string | null;
  kaydeden_kullanici_id: string | null;
  silindi: boolean;
  created_at: string;
  updated_at: string;
  ofis_personeller?: OfisPersonel;
};

export type DepoMalzeme = {
  id: string;
  ad: string;
  birim: string | null;
  min_stok: number | null;
  aciklama: string | null;
  aktif: boolean;
  created_at: string;
};

export type DepoHareket = {
  id: string;
  depo_malzeme_id: string;
  tip: "giris" | "cikis" | "sayim" | "fire";
  miktar: number;
  birim_fiyat: number | null;
  tutar: number;
  tarih: string;
  aciklama: string | null;
  santiye_id: string | null;
  kaynak_eksik_id?: string | null;
  onay_durumu?: OnayDurumu;
  onaylayan_kullanici_id?: string | null;
  onay_tarihi?: string | null;
  onay_notu?: string | null;
  silindi: boolean;
  created_at: string;
  depo_malzemeler?: DepoMalzeme;
  santiyeler?: { ad: string } | null;
};

export type ToplamMaliyet = {
  santiye_id: string;
  santiye_adi: string;
  iscilik_maliyeti: number;
  malzeme_maliyeti: number;
  genel_gider: number;
  genel_gelir: number;
};

export type SirketFinans = {
  toplam_gelir: number;
  toplam_gider: number;
  net: number;
  santiye_gelir?: number;
  ofis_gelir?: number;
  santiye_iscilik?: number;
  santiye_malzeme?: number;
  santiye_gider?: number;
  ofis_masraf_gider?: number;
  ofis_odeme_gider?: number;
  depo_gider?: number;
};

export type AuditLog = {
  id: string;
  tablo_adi: string;
  kayit_id: string;
  santiye_id: string | null;
  islem: "insert" | "update" | "delete";
  eski_veri: Record<string, unknown> | null;
  yeni_veri: Record<string, unknown> | null;
  yapan_kullanici_id: string | null;
  created_at: string;
  profiller?: Profil;
  santiyeler?: { ad: string } | null;
};

export type OturumLog = {
  id: string;
  kullanici_id: string | null;
  portal: Portal;
  islem: "giris" | "cikis";
  user_agent: string | null;
  created_at: string;
  profiller?: Profil;
};

export type YedeklemeDurumu = {
  id: string;
  katman: "firebase" | "yerel";
  veri_grubu: "sistem" | "ofis" | "santiye" | "depo" | null;
  tablo_adi: string | null;
  kayit_sayisi: number;
  son_senkron: string | null;
  durum: string;
  mesaj: string | null;
  updated_at: string;
};

export const AUDIT_TABLO_KATMAN: Record<string, Katman | "sistem"> = {
  profiller: "sistem",
  kullanici_santiye: "sistem",
  oturum_log: "sistem",
  yedekleme_durumu: "sistem",
  ofis_personeller: "ofis",
  ofis_masraflar: "ofis",
  ofis_odemeler: "ofis",
  odemeler: "ofis",
  santiyeler: "santiye",
  personeller: "santiye",
  puantaj: "santiye",
  malzemeler: "santiye",
  malzeme_hareket: "santiye",
  isci_maas_odemeleri: "santiye",
  gelir_gider: "santiye",
  depo_malzemeler: "depo",
  depo_hareket: "depo",
};
