-- Row Level Security politikaları

alter table public.santiyeler enable row level security;
alter table public.profiller enable row level security;
alter table public.kullanici_santiye enable row level security;
alter table public.personeller enable row level security;
alter table public.puantaj enable row level security;
alter table public.malzemeler enable row level security;
alter table public.malzeme_hareket enable row level security;
alter table public.isci_maas_odemeleri enable row level security;
alter table public.odemeler enable row level security;
alter table public.gelir_gider enable row level security;
alter table public.audit_log enable row level security;
alter table public.yedekleme_durumu enable row level security;

-- ========== PROFİLLER ==========
drop policy if exists "profiller_select" on public.profiller;
create policy "profiller_select" on public.profiller for select
  using (id = auth.uid() or public.kullanici_rolu() = 'admin');

drop policy if exists "profiller_update_self" on public.profiller;
create policy "profiller_update_self" on public.profiller for update
  using (id = auth.uid() or public.kullanici_rolu() = 'admin');

drop policy if exists "profiller_admin_insert" on public.profiller;
create policy "profiller_admin_insert" on public.profiller for insert
  with check (public.kullanici_rolu() = 'admin' or id = auth.uid());

drop policy if exists "profiller_admin_delete" on public.profiller;
create policy "profiller_admin_delete" on public.profiller for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== ŞANTİYELER ==========
drop policy if exists "santiyeler_select" on public.santiyeler;
create policy "santiyeler_select" on public.santiyeler for select
  using (
    public.kullanici_rolu() in ('admin', 'muhasebe')
    or id in (select public.kullanici_santiye_idler())
  );

drop policy if exists "santiyeler_admin_all" on public.santiyeler;
create policy "santiyeler_admin_insert" on public.santiyeler for insert
  with check (public.kullanici_rolu() = 'admin');

drop policy if exists "santiyeler_admin_update" on public.santiyeler;
create policy "santiyeler_admin_update" on public.santiyeler for update
  using (public.kullanici_rolu() = 'admin');

drop policy if exists "santiyeler_admin_delete" on public.santiyeler;
create policy "santiyeler_admin_delete" on public.santiyeler for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== KULLANICI_SANTIYE ==========
drop policy if exists "ks_select" on public.kullanici_santiye;
create policy "ks_select" on public.kullanici_santiye for select
  using (
    kullanici_id = auth.uid()
    or public.kullanici_rolu() = 'admin'
  );

drop policy if exists "ks_admin" on public.kullanici_santiye;
create policy "ks_admin" on public.kullanici_santiye for all
  using (public.kullanici_rolu() = 'admin')
  with check (public.kullanici_rolu() = 'admin');

-- ========== PERSONELLER ==========
-- muhasebe erişemez; santiye_sefi/saha atandığı şantiyede; admin her yerde
drop policy if exists "personel_select" on public.personeller;
create policy "personel_select" on public.personeller for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "personel_insert" on public.personeller;
create policy "personel_insert" on public.personeller for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "personel_update" on public.personeller;
create policy "personel_update" on public.personeller for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "personel_delete" on public.personeller;
create policy "personel_delete" on public.personeller for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== PUANTAJ ==========
drop policy if exists "puantaj_select" on public.puantaj;
create policy "puantaj_select" on public.puantaj for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and personel_id in (
        select id from public.personeller
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

drop policy if exists "puantaj_insert" on public.puantaj;
create policy "puantaj_insert" on public.puantaj for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and personel_id in (
        select id from public.personeller
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

drop policy if exists "puantaj_update" on public.puantaj;
create policy "puantaj_update" on public.puantaj for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and personel_id in (
        select id from public.personeller
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

drop policy if exists "puantaj_delete" on public.puantaj;
create policy "puantaj_delete" on public.puantaj for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== MALZEMELER ==========
drop policy if exists "malzeme_select" on public.malzemeler;
create policy "malzeme_select" on public.malzemeler for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'depo_sorumlusu', 'saha_gorevlisi')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "malzeme_write" on public.malzemeler;
create policy "malzeme_write" on public.malzemeler for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'depo_sorumlusu')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "malzeme_update" on public.malzemeler;
create policy "malzeme_update" on public.malzemeler for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'depo_sorumlusu')
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "malzeme_delete" on public.malzemeler;
create policy "malzeme_delete" on public.malzemeler for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== MALZEME_HAREKET ==========
drop policy if exists "mh_select" on public.malzeme_hareket;
create policy "mh_select" on public.malzeme_hareket for select
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'depo_sorumlusu', 'saha_gorevlisi')
      and malzeme_id in (
        select id from public.malzemeler
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

-- santiye_sefi / depo: tüm tipler; saha_gorevlisi: sadece giris
drop policy if exists "mh_insert" on public.malzeme_hareket;
create policy "mh_insert" on public.malzeme_hareket for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'depo_sorumlusu')
      and malzeme_id in (
        select id from public.malzemeler
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
    or (
      public.kullanici_rolu() = 'saha_gorevlisi'
      and tip = 'giris'
      and malzeme_id in (
        select id from public.malzemeler
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
  );

drop policy if exists "mh_update" on public.malzeme_hareket;
create policy "mh_update" on public.malzeme_hareket for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'depo_sorumlusu')
      and malzeme_id in (
        select id from public.malzemeler
        where santiye_id in (select public.kullanici_santiye_idler())
      )
    )
    or (
      public.kullanici_rolu() = 'saha_gorevlisi'
      and kaydeden_kullanici_id = auth.uid()
    )
  );

drop policy if exists "mh_delete" on public.malzeme_hareket;
create policy "mh_delete" on public.malzeme_hareket for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== İŞÇİ MAAŞ ==========
-- muhasebe: tüm şantiyeler görüntüleme + ödendi işaretleme
-- saha_gorevlisi: atandığı şantiye ekleme/güncelleme
drop policy if exists "isci_select" on public.isci_maas_odemeleri;
create policy "isci_select" on public.isci_maas_odemeleri for select
  using (
    public.kullanici_rolu() in ('admin', 'muhasebe')
    or (
      public.kullanici_rolu() = 'saha_gorevlisi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "isci_insert" on public.isci_maas_odemeleri;
create policy "isci_insert" on public.isci_maas_odemeleri for insert
  with check (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() = 'saha_gorevlisi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "isci_update" on public.isci_maas_odemeleri;
create policy "isci_update" on public.isci_maas_odemeleri for update
  using (
    public.kullanici_rolu() in ('admin', 'muhasebe')
    or (
      public.kullanici_rolu() = 'saha_gorevlisi'
      and kaydeden_kullanici_id = auth.uid()
    )
  );

drop policy if exists "isci_delete" on public.isci_maas_odemeleri;
create policy "isci_delete" on public.isci_maas_odemeleri for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== ÖDEMELER (şef ödemeleri) ==========
drop policy if exists "odemeler_select" on public.odemeler;
create policy "odemeler_select" on public.odemeler for select
  using (public.kullanici_rolu() in ('admin', 'muhasebe'));

drop policy if exists "odemeler_insert" on public.odemeler;
create policy "odemeler_insert" on public.odemeler for insert
  with check (public.kullanici_rolu() in ('admin', 'muhasebe'));

drop policy if exists "odemeler_update" on public.odemeler;
create policy "odemeler_update" on public.odemeler for update
  using (public.kullanici_rolu() in ('admin', 'muhasebe'));

drop policy if exists "odemeler_delete" on public.odemeler;
create policy "odemeler_delete" on public.odemeler for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== GELİR-GİDER ==========
drop policy if exists "gg_select" on public.gelir_gider;
create policy "gg_select" on public.gelir_gider for select
  using (
    public.kullanici_rolu() in ('admin', 'muhasebe')
    or (
      public.kullanici_rolu() = 'santiye_sefi'
      and santiye_id in (select public.kullanici_santiye_idler())
    )
  );

drop policy if exists "gg_insert" on public.gelir_gider;
create policy "gg_insert" on public.gelir_gider for insert
  with check (public.kullanici_rolu() in ('admin', 'muhasebe'));

drop policy if exists "gg_update" on public.gelir_gider;
create policy "gg_update" on public.gelir_gider for update
  using (public.kullanici_rolu() in ('admin', 'muhasebe'));

drop policy if exists "gg_delete" on public.gelir_gider;
create policy "gg_delete" on public.gelir_gider for delete
  using (public.kullanici_rolu() = 'admin');

-- ========== AUDIT LOG ==========
drop policy if exists "audit_admin" on public.audit_log;
create policy "audit_admin" on public.audit_log for select
  using (public.kullanici_rolu() = 'admin');

drop policy if exists "audit_insert" on public.audit_log;
create policy "audit_insert" on public.audit_log for insert
  with check (true);

-- ========== YEDEKLEME DURUMU ==========
drop policy if exists "yedek_select" on public.yedekleme_durumu;
create policy "yedek_select" on public.yedekleme_durumu for select
  using (public.kullanici_rolu() = 'admin');

drop policy if exists "yedek_write" on public.yedekleme_durumu;
create policy "yedek_write" on public.yedekleme_durumu for all
  using (public.kullanici_rolu() = 'admin')
  with check (true);

-- Storage politikaları
drop policy if exists "belge_upload" on storage.objects;
create policy "belge_upload" on storage.objects for insert
  with check (
    bucket_id = 'malzeme-belgeleri'
    and auth.role() = 'authenticated'
  );

drop policy if exists "belge_select" on storage.objects;
create policy "belge_select" on storage.objects for select
  using (
    bucket_id = 'malzeme-belgeleri'
    and auth.role() = 'authenticated'
  );

drop policy if exists "belge_delete" on storage.objects;
create policy "belge_delete" on storage.objects for delete
  using (
    bucket_id = 'malzeme-belgeleri'
    and public.kullanici_rolu() = 'admin'
  );
