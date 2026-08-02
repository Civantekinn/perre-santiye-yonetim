-- Örnek test verisi (şantiyeler, personel, puantaj, malzeme)
-- Not: Auth kullanıcıları olmadan personel/puantaj çalışır;
-- kullanici_santiye ve kaydeden alanlar için gerçek kullanıcı UUID gerekir.

-- Örnek şantiyeler
insert into public.santiyeler (id, ad, adres, aktif) values
  ('a1111111-1111-1111-1111-111111111111', 'Perre Merkez Şantiye', 'Adıyaman, Merkez', true),
  ('a2222222-2222-2222-2222-222222222222', 'Kahta Konut Projesi', 'Adıyaman, Kahta', true),
  ('a3333333-3333-3333-3333-333333333333', 'Besni Altyapı', 'Adıyaman, Besni', true)
on conflict (id) do nothing;

-- Örnek personel
insert into public.personeller (id, ad_soyad, pozisyon, gunluk_ucret, santiye_id, aktif) values
  ('b1111111-1111-1111-1111-111111111111', 'Ahmet Yılmaz', 'Kalıpçı', 1800, 'a1111111-1111-1111-1111-111111111111', true),
  ('b2222222-2222-2222-2222-222222222222', 'Mehmet Demir', 'Demirci', 1900, 'a1111111-1111-1111-1111-111111111111', true),
  ('b3333333-3333-3333-3333-333333333333', 'Ali Kaya', 'Usta', 2200, 'a1111111-1111-1111-1111-111111111111', true),
  ('b4444444-4444-4444-4444-444444444444', 'Hasan Çelik', 'Sıvacı', 1700, 'a2222222-2222-2222-2222-222222222222', true),
  ('b5555555-5555-5555-5555-555555555555', 'Mustafa Arslan', 'Elektrikçi', 2000, 'a2222222-2222-2222-2222-222222222222', true),
  ('b6666666-6666-6666-6666-666666666666', 'İbrahim Şahin', 'İşçi', 1500, 'a3333333-3333-3333-3333-333333333333', true)
on conflict (id) do nothing;

-- Bugün ve dün puantaj
insert into public.puantaj (personel_id, tarih, geldi_mi, yemek_yedi_mi, notlar) values
  ('b1111111-1111-1111-1111-111111111111', current_date, true, true, null),
  ('b2222222-2222-2222-2222-222222222222', current_date, true, true, null),
  ('b3333333-3333-3333-3333-333333333333', current_date, false, false, 'İzinli'),
  ('b4444444-4444-4444-4444-444444444444', current_date, true, false, null),
  ('b5555555-5555-5555-5555-555555555555', current_date, true, true, null),
  ('b6666666-6666-6666-6666-666666666666', current_date, true, true, null),
  ('b1111111-1111-1111-1111-111111111111', current_date - 1, true, true, null),
  ('b2222222-2222-2222-2222-222222222222', current_date - 1, true, false, null),
  ('b3333333-3333-3333-3333-333333333333', current_date - 1, true, true, null)
on conflict (personel_id, tarih) do nothing;

-- Malzemeler
insert into public.malzemeler (id, ad, birim, santiye_id) values
  ('c1111111-1111-1111-1111-111111111111', 'Çimento', 'torba', 'a1111111-1111-1111-1111-111111111111'),
  ('c2222222-2222-2222-2222-222222222222', 'Demir Ø12', 'kg', 'a1111111-1111-1111-1111-111111111111'),
  ('c3333333-3333-3333-3333-333333333333', 'Kum', 'm3', 'a1111111-1111-1111-1111-111111111111'),
  ('c4444444-4444-4444-4444-444444444444', 'Tuğla', 'adet', 'a2222222-2222-2222-2222-222222222222'),
  ('c5555555-5555-5555-5555-555555555555', 'Boru PVC', 'metre', 'a3333333-3333-3333-3333-333333333333')
on conflict (id) do nothing;

-- Malzeme hareketleri (giriş + bekleyen eksik)
insert into public.malzeme_hareket (malzeme_id, tip, miktar, birim_fiyat, tarih, aciklama, durum) values
  ('c1111111-1111-1111-1111-111111111111', 'giris', 100, 250, current_date - 3, 'İlk sevkiyat', 'karsilandi'),
  ('c2222222-2222-2222-2222-222222222222', 'giris', 500, 35, current_date - 2, 'Demir sevkiyatı', 'karsilandi'),
  ('c1111111-1111-1111-1111-111111111111', 'cikis', 20, 250, current_date - 1, 'Kalıp dökümü', 'karsilandi'),
  ('c3333333-3333-3333-3333-333333333333', 'eksik', 15, 400, current_date, 'Kum yetersiz — acil', 'bekliyor'),
  ('c4444444-4444-4444-4444-444444444444', 'eksik', 2000, 8, current_date, 'Tuğla stok bitti', 'bekliyor'),
  ('c2222222-2222-2222-2222-222222222222', 'fazla', 50, 35, current_date - 1, 'Fazla teslimat', 'karsilandi');

-- Gelir-gider
insert into public.gelir_gider (santiye_id, tip, kategori, tutar, tarih, aciklama) values
  ('a1111111-1111-1111-1111-111111111111', 'gelir', 'Hakediş', 450000, current_date - 10, '1. hakediş'),
  ('a1111111-1111-1111-1111-111111111111', 'gider', 'Kira', 25000, current_date - 5, 'Ekipman kira'),
  ('a2222222-2222-2222-2222-222222222222', 'gelir', 'Hakediş', 280000, current_date - 8, 'Avans'),
  ('a2222222-2222-2222-2222-222222222222', 'gider', 'Nakliye', 12000, current_date - 3, 'Malzeme nakliye'),
  ('a3333333-3333-3333-3333-333333333333', 'gider', 'Yemek', 8500, current_date - 1, 'Haftalık yemek');

-- Yedekleme durumu başlangıç kayıtları
insert into public.yedekleme_durumu (katman, tablo_adi, kayit_sayisi, son_senkron, durum, mesaj) values
  ('firebase', null, 0, null, 'bekliyor', 'Firebase henüz yapılandırılmadı'),
  ('yerel', null, 0, null, 'bekliyor', 'Yerel yedek servisi henüz başlatılmadı');
