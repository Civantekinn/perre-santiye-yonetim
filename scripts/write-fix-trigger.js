const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
function get(k) {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  if (!m) return null;
  return m[1].trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
}
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");
const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const fix = `
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
    email = coalesce(excluded.email, public.profiller.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- orphaned null katman rows if any
update public.profiller set katman = case
  when rol = 'admin' then 'admin'
  when rol in ('ofis_admin','ofis_personeli','muhasebe') then 'ofis'
  when rol = 'depo_sorumlusu' then 'depo'
  else 'santiye'
end
where katman is null;
`;

(async () => {
  // Use rpc won't work for DDL. Use REST sql via pg? service role can't run arbitrary SQL.
  // Try postgrest - no.
  console.log("Need management API for DDL");
  fs.writeFileSync("supabase/migrations/006_fix_handle_new_user.sql", fix);
  console.log("wrote 006");
})();
