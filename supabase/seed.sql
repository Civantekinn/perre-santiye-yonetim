-- İlk admin kurulumu
-- ÖNEMLİ: Önce Supabase Auth Dashboard'dan bir kullanıcı oluşturun
-- (Authentication > Users > Add user), ardından aşağıdaki UUID'yi
-- o kullanıcının UUID'si ile değiştirip çalıştırın.

-- ÖRNEK (UUID'yi değiştirin!):
-- insert into public.profiller (id, ad_soyad, rol)
-- values ('00000000-0000-0000-0000-000000000000', 'Yönetici Ad Soyad', 'admin')
-- on conflict (id) do update set rol = 'admin', ad_soyad = excluded.ad_soyad;

-- Alternatif: Auth'ta kullanıcı oluşturduktan sonra SQL Editor'de:
--
-- insert into public.profiller (id, ad_soyad, rol)
-- select id, coalesce(raw_user_meta_data->>'ad_soyad', email), 'admin'
-- from auth.users
-- order by created_at
-- limit 1
-- on conflict (id) do update set rol = 'admin';

-- Yeni kullanıcı kaydında profil otomatik oluşturma
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text := coalesce(new.raw_user_meta_data->>'rol', 'saha_gorevlisi');
  v_ad text := coalesce(new.raw_user_meta_data->>'ad_soyad', split_part(new.email, '@', 1));
  v_katman text;
begin
  if v_rol = 'muhasebe' then
    v_rol := 'ofis_admin';
  end if;
  if v_rol not in ('admin','ofis_admin','ofis_personeli','santiye_sefi','depo_sorumlusu','saha_gorevlisi') then
    v_rol := 'saha_gorevlisi';
  end if;
  v_katman := case
    when v_rol = 'admin' then 'admin'
    when v_rol in ('ofis_admin','ofis_personeli') then 'ofis'
    when v_rol = 'depo_sorumlusu' then 'depo'
    else 'santiye'
  end;
  insert into public.profiller (id, ad_soyad, rol, katman, aktif, email)
  values (new.id, v_ad, v_rol, v_katman, true, new.email)
  on conflict (id) do update set
    ad_soyad = excluded.ad_soyad,
    email = coalesce(excluded.email, public.profiller.email),
    rol = excluded.rol,
    katman = excluded.katman;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
