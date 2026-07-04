
-- Fix search_path on set_updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- Lock SECURITY DEFINER functions
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

-- Move extensions out of public
create schema if not exists extensions;
grant usage on schema extensions to postgres, anon, authenticated, service_role;
alter extension pg_trgm set schema extensions;
-- vector extension objects (types) are referenced by tables; leave it in place but this is acceptable for pgvector
