-- Malzeme: tür + fatura/resim alanları

alter table public.malzemeler
  add column if not exists tur text;

alter table public.malzeme_hareket
  add column if not exists fatura_url text,
  add column if not exists resim_url text;

-- Eski belge_url varsa faturaya taşı
update public.malzeme_hareket
set fatura_url = belge_url
where fatura_url is null
  and belge_url is not null;
