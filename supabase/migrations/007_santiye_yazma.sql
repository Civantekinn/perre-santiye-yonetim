-- Şantiye kullanıcıları: personel, gelir-gider, malzeme yazabilsin
-- Eski gg_* politikalarını temizle (005 yenilerini eklemişti ama eski adlar kalmış olabilir)

-- PERSONEL
drop policy if exists "personel_select" on public.personeller;
drop policy if exists "personel_insert" on public.personeller;
drop policy if exists "personel_update" on public.personeller;
drop policy if exists "personel_delete" on public.personeller;

create policy "personel_select" on public.personeller for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "personel_insert" on public.personeller for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "personel_update" on public.personeller for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "personel_delete" on public.personeller for delete
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

-- MALZEME TANIM
drop policy if exists "malzeme_select" on public.malzemeler;
drop policy if exists "malzeme_write" on public.malzemeler;
drop policy if exists "malzeme_update" on public.malzemeler;
drop policy if exists "malzeme_delete" on public.malzemeler;

create policy "malzeme_select" on public.malzemeler for select
  using (
    public.kullanici_rolu() = 'admin'
    or public.kullanici_rolu() = 'depo_sorumlusu'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "malzeme_write" on public.malzemeler for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "malzeme_update" on public.malzemeler for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "malzeme_delete" on public.malzemeler for delete
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

-- MALZEME HAREKET
drop policy if exists "mh_select" on public.malzeme_hareket;
drop policy if exists "mh_insert" on public.malzeme_hareket;
drop policy if exists "mh_update" on public.malzeme_hareket;
drop policy if exists "mh_delete" on public.malzeme_hareket;

create policy "mh_select" on public.malzeme_hareket for select
  using (
    public.kullanici_rolu() = 'admin'
    or public.kullanici_rolu() = 'depo_sorumlusu'
    or malzeme_id in (
      select id from public.malzemeler
      where santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "mh_insert" on public.malzeme_hareket for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and malzeme_id in (
        select id from public.malzemeler
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

create policy "mh_update" on public.malzeme_hareket for update
  using (
    public.kullanici_rolu() = 'admin'
    or public.kullanici_rolu() = 'depo_sorumlusu'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and malzeme_id in (
        select id from public.malzemeler
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

create policy "mh_delete" on public.malzeme_hareket for delete
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and malzeme_id in (
        select id from public.malzemeler
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

-- GELİR GİDER (eski gg_* + yeni adlar)
drop policy if exists "gg_select" on public.gelir_gider;
drop policy if exists "gg_insert" on public.gelir_gider;
drop policy if exists "gg_update" on public.gelir_gider;
drop policy if exists "gg_delete" on public.gelir_gider;
drop policy if exists "gelir_gider_select" on public.gelir_gider;
drop policy if exists "gelir_gider_insert" on public.gelir_gider;
drop policy if exists "gelir_gider_update" on public.gelir_gider;
drop policy if exists "gelir_gider_delete" on public.gelir_gider;
drop policy if exists "gelir_gider_write" on public.gelir_gider;

create policy "gelir_gider_select" on public.gelir_gider for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "gelir_gider_insert" on public.gelir_gider for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "gelir_gider_update" on public.gelir_gider for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "gelir_gider_delete" on public.gelir_gider for delete
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

-- İŞÇİ MAAŞ
drop policy if exists "isci_select" on public.isci_maas_odemeleri;
drop policy if exists "isci_insert" on public.isci_maas_odemeleri;
drop policy if exists "isci_update" on public.isci_maas_odemeleri;
drop policy if exists "isci_delete" on public.isci_maas_odemeleri;

create policy "isci_select" on public.isci_maas_odemeleri for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "isci_insert" on public.isci_maas_odemeleri for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "isci_update" on public.isci_maas_odemeleri for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

create policy "isci_delete" on public.isci_maas_odemeleri for delete
  using (public.kullanici_rolu() = 'admin');
