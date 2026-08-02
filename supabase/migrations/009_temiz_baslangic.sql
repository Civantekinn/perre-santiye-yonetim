-- CANLI KULLANIM ÖNCESİ TEMİZ BAŞLANGIÇ
-- Tüm operasyonel veri silinir; admin hesapları korunur.

begin;

-- Çocuk tablolar önce
truncate table public.puantaj restart identity cascade;
truncate table public.malzeme_hareket restart identity cascade;
truncate table public.isci_maas_odemeleri restart identity cascade;
truncate table public.gelir_gider restart identity cascade;
truncate table public.odemeler restart identity cascade;
truncate table public.malzemeler restart identity cascade;
truncate table public.personeller restart identity cascade;
truncate table public.kullanici_santiye restart identity cascade;
truncate table public.santiyeler restart identity cascade;

truncate table public.ofis_odemeler restart identity cascade;
truncate table public.ofis_masraflar restart identity cascade;
truncate table public.ofis_personeller restart identity cascade;

truncate table public.depo_hareket restart identity cascade;
truncate table public.depo_malzemeler restart identity cascade;

truncate table public.oturum_log restart identity cascade;
truncate table public.audit_log restart identity cascade;

-- Admin dışındaki profilleri ve auth kullanıcılarını sil
delete from public.profiller
where coalesce(rol, '') <> 'admin';

delete from auth.users
where id not in (select id from public.profiller where rol = 'admin');

-- Yedekleme / veri grubu sayaçlarını sıfırla ve açık tut
truncate table public.yedekleme_durumu restart identity cascade;

insert into public.yedekleme_durumu (katman, tablo_adi, kayit_sayisi, durum, mesaj, veri_grubu)
values
  ('firebase', 'santiyeler', 0, 'aktif', 'Hazır', 'santiye'),
  ('firebase', 'personeller', 0, 'aktif', 'Hazır', 'santiye'),
  ('firebase', 'puantaj', 0, 'aktif', 'Hazır', 'santiye'),
  ('firebase', 'malzemeler', 0, 'aktif', 'Hazır', 'santiye'),
  ('firebase', 'malzeme_hareket', 0, 'aktif', 'Hazır', 'santiye'),
  ('firebase', 'gelir_gider', 0, 'aktif', 'Hazır', 'santiye'),
  ('firebase', 'isci_maas_odemeleri', 0, 'aktif', 'Hazır', 'santiye'),
  ('firebase', 'ofis_personeller', 0, 'aktif', 'Hazır', 'ofis'),
  ('firebase', 'ofis_masraflar', 0, 'aktif', 'Hazır', 'ofis'),
  ('firebase', 'ofis_odemeler', 0, 'aktif', 'Hazır', 'ofis'),
  ('firebase', 'depo_malzemeler', 0, 'aktif', 'Hazır', 'depo'),
  ('firebase', 'depo_hareket', 0, 'aktif', 'Hazır', 'depo'),
  ('firebase', 'profiller', 0, 'aktif', 'Hazır', 'sistem'),
  ('firebase', 'audit_log', 0, 'aktif', 'Hazır', 'sistem'),
  ('firebase', 'oturum_log', 0, 'aktif', 'Hazır', 'sistem'),
  ('yerel', 'santiyeler', 0, 'aktif', 'Hazır', 'santiye'),
  ('yerel', 'personeller', 0, 'aktif', 'Hazır', 'santiye'),
  ('yerel', 'puantaj', 0, 'aktif', 'Hazır', 'santiye'),
  ('yerel', 'malzemeler', 0, 'aktif', 'Hazır', 'santiye'),
  ('yerel', 'malzeme_hareket', 0, 'aktif', 'Hazır', 'santiye'),
  ('yerel', 'gelir_gider', 0, 'aktif', 'Hazır', 'santiye'),
  ('yerel', 'isci_maas_odemeleri', 0, 'aktif', 'Hazır', 'santiye'),
  ('yerel', 'ofis_personeller', 0, 'aktif', 'Hazır', 'ofis'),
  ('yerel', 'ofis_masraflar', 0, 'aktif', 'Hazır', 'ofis'),
  ('yerel', 'ofis_odemeler', 0, 'aktif', 'Hazır', 'ofis'),
  ('yerel', 'depo_malzemeler', 0, 'aktif', 'Hazır', 'depo'),
  ('yerel', 'depo_hareket', 0, 'aktif', 'Hazır', 'depo'),
  ('yerel', 'profiller', 0, 'aktif', 'Hazır', 'sistem'),
  ('yerel', 'audit_log', 0, 'aktif', 'Hazır', 'sistem'),
  ('yerel', 'oturum_log', 0, 'aktif', 'Hazır', 'sistem');

-- Admin profil kayit_sayisi güncelle
update public.yedekleme_durumu
set kayit_sayisi = (select count(*) from public.profiller),
    son_senkron = now(),
    mesaj = 'Temiz başlangıç'
where tablo_adi = 'profiller';

commit;

-- Doğrulama
select 'santiyeler' as tablo, count(*)::int as n from public.santiyeler
union all select 'personeller', count(*)::int from public.personeller
union all select 'malzemeler', count(*)::int from public.malzemeler
union all select 'gelir_gider', count(*)::int from public.gelir_gider
union all select 'ofis_personeller', count(*)::int from public.ofis_personeller
union all select 'depo_malzemeler', count(*)::int from public.depo_malzemeler
union all select 'profiller', count(*)::int from public.profiller
union all select 'auth_users', count(*)::int from auth.users
union all select 'yedekleme_aktif', count(*)::int from public.yedekleme_durumu where durum = 'aktif';
