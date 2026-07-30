-- Supabase owns the auth schema. Prisma owns only the public application schema.
--
-- The former public.profiles -> auth.users foreign key forced Prisma introspection
-- to treat auth as a managed datasource schema. Replace that cross-schema foreign
-- key with an auth-owned delete trigger so profile cleanup remains deterministic
-- without exposing auth tables to Prisma Migrate or Prisma Client generation.

begin;

alter table if exists public.profiles
  drop constraint if exists profiles_auth_user_fk;

create or replace function public.handle_deleted_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.profiles
  where id = old.id;

  return old;
end;
$$;

revoke all on function public.handle_deleted_auth_user() from public;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
after delete on auth.users
for each row execute function public.handle_deleted_auth_user();

commit;
