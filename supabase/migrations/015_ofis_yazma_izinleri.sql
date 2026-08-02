-- Ofis personeli için personel/puantaj/ödeme yazma izinleri

drop policy if exists "ofis_personel_write" on public.ofis_personeller;
create policy "ofis_personel_write" on public.ofis_personeller for all
  using (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'))
  with check (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'));

drop policy if exists "ofis_odeme_write" on public.ofis_odemeler;
create policy "ofis_odeme_write" on public.ofis_odemeler for all
  using (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'))
  with check (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'));

drop policy if exists "ofis_puantaj_write" on public.ofis_puantaj;
create policy "ofis_puantaj_write" on public.ofis_puantaj for all
  using (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'))
  with check (public.kullanici_rolu() in ('admin', 'ofis_admin', 'ofis_personeli'));
