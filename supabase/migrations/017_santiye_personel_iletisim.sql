-- Şantiye personel iletişim alanları (ofis personeliyle aynı yapı)

alter table public.personeller
  add column if not exists telefon text,
  add column if not exists email text,
  add column if not exists notlar text;
