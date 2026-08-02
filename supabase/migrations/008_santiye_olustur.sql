-- Şantiye şefi / saha görevlisi: yönetici olmadan şantiye ekleyip kendine atayabilsin

create or replace function public.santiye_olustur(
  p_ad text,
  p_adres text default null,
  p_kendine_ata boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
  v_id uuid;
begin
  v_rol := public.kullanici_rolu();
  if v_rol is null then
    raise exception 'Oturum gerekli';
  end if;
  if v_rol not in ('admin', 'santiye_sefi', 'saha_gorevlisi') then
    raise exception 'Bu işlem için yetkiniz yok';
  end if;
  if p_ad is null or length(trim(p_ad)) = 0 then
    raise exception 'Şantiye adı gerekli';
  end if;

  insert into public.santiyeler (ad, adres, aktif)
  values (trim(p_ad), nullif(trim(p_adres), ''), true)
  returning id into v_id;

  if p_kendine_ata and auth.uid() is not null then
    insert into public.kullanici_santiye (kullanici_id, santiye_id)
    values (auth.uid(), v_id)
    on conflict (kullanici_id, santiye_id) do nothing;
  end if;

  return v_id;
end;
$$;

grant execute on function public.santiye_olustur(text, text, boolean) to authenticated;

-- Şantiye kullanıcıları kendi atamalarını görebilir (zaten vardı);
-- kendine şantiye atama için doğrudan insert (RPC dışı kullanım)
drop policy if exists "ks_self_insert" on public.kullanici_santiye;
create policy "ks_self_insert" on public.kullanici_santiye for insert
  with check (
    kullanici_id = auth.uid()
    and public.kullanici_rolu() in ('admin', 'santiye_sefi', 'saha_gorevlisi')
  );

-- Şantiye oluşturma (RPC tercih; doğrudan insert de açılsın)
drop policy if exists "santiyeler_admin_insert" on public.santiyeler;
drop policy if exists "santiyeler_insert" on public.santiyeler;
create policy "santiyeler_insert" on public.santiyeler for insert
  with check (
    public.kullanici_rolu() in ('admin', 'santiye_sefi', 'saha_gorevlisi')
  );

drop policy if exists "santiyeler_admin_update" on public.santiyeler;
drop policy if exists "santiyeler_update" on public.santiyeler;
create policy "santiyeler_update" on public.santiyeler for update
  using (
    public.kullanici_rolu() = 'admin'
    or (
      public.kullanici_rolu() in ('santiye_sefi', 'saha_gorevlisi')
      and id in (select public.kullanici_santiye_idler())
    )
  );
