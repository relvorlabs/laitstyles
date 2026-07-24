begin;

create table if not exists public.profile_details (
  profile_id uuid not null,
  first_name text not null,
  last_name text not null,
  preferred_name text,
  created_at timestamptz(6) not null default current_timestamp,
  updated_at timestamptz(6) not null default current_timestamp,
  constraint profile_details_pkey primary key (profile_id),
  constraint profile_details_profile_fk
    foreign key (profile_id)
    references public.profiles(id)
    on delete cascade
);

-- Supabase owns auth.users. Keep the public-schema migration portable to the
-- clean PostgreSQL database used by Prisma validation while installing the
-- Auth foreign key whenever this migration runs against a Supabase database.
do $$
begin
  if to_regclass('auth.users') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'profiles_auth_user_fk'
         and conrelid = 'public.profiles'::regclass
     ) then
    alter table public.profiles
      add constraint profiles_auth_user_fk
      foreign key (id)
      references auth.users(id)
      on delete cascade;
  end if;
end
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first_name text := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'given_name'
  )), '');
  v_last_name text := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'family_name'
  )), '');
  v_preferred_name text := nullif(trim(new.raw_user_meta_data ->> 'preferred_name'), '');
  v_full_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(concat_ws(' ', v_first_name, v_last_name)), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Customer'
  );
begin
  insert into public.profiles (
    id,
    email,
    role,
    status,
    display_name,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    'consumer'::public.account_role,
    'active'::public.account_status,
    coalesce(v_preferred_name, v_full_name),
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        updated_at = now();

  if v_first_name is not null or v_last_name is not null or v_preferred_name is not null then
    insert into public.profile_details (
      profile_id,
      first_name,
      last_name,
      preferred_name,
      created_at,
      updated_at
    )
    values (
      new.id,
      coalesce(v_first_name, ''),
      coalesce(v_last_name, ''),
      v_preferred_name,
      now(),
      now()
    )
    on conflict (profile_id) do update
      set first_name = excluded.first_name,
          last_name = excluded.last_name,
          preferred_name = excluded.preferred_name,
          updated_at = now();
  end if;

  insert into public.customers (
    profile_id,
    name,
    email,
    type,
    created_at,
    updated_at
  )
  values (
    new.id,
    v_full_name,
    new.email,
    'individual',
    now(),
    now()
  )
  on conflict (profile_id) do update
    set name = excluded.name,
        email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first_name text := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'given_name'
  )), '');
  v_last_name text := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'family_name'
  )), '');
  v_preferred_name text := nullif(trim(new.raw_user_meta_data ->> 'preferred_name'), '');
  v_full_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(concat_ws(' ', v_first_name, v_last_name)), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Customer'
  );
begin
  update public.profiles
  set email = new.email,
      display_name = coalesce(v_preferred_name, v_full_name, display_name),
      updated_at = now()
  where id = new.id;

  if v_first_name is not null or v_last_name is not null or v_preferred_name is not null then
    insert into public.profile_details (
      profile_id,
      first_name,
      last_name,
      preferred_name,
      created_at,
      updated_at
    )
    values (
      new.id,
      coalesce(v_first_name, ''),
      coalesce(v_last_name, ''),
      v_preferred_name,
      now(),
      now()
    )
    on conflict (profile_id) do update
      set first_name = excluded.first_name,
          last_name = excluded.last_name,
          preferred_name = excluded.preferred_name,
          updated_at = now();
  end if;

  update public.customers
  set name = v_full_name,
      email = new.email,
      updated_at = now()
  where profile_id = new.id;

  return new;
end;
$$;

do $$
begin
  if to_regclass('auth.users') is not null then
    execute 'drop trigger if exists on_auth_user_created on auth.users';
    execute 'create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user()';
    execute 'drop trigger if exists on_auth_user_updated on auth.users';
    execute 'create trigger on_auth_user_updated after update of email, raw_user_meta_data on auth.users for each row execute function public.sync_auth_user_profile()';
  end if;
end
$$;

alter table public.profiles enable row level security;
alter table public.profile_details enable row level security;
alter table public.customers enable row level security;

drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profile_details_select_self on public.profile_details;
drop policy if exists profile_details_update_self on public.profile_details;
drop policy if exists customers_select_self on public.customers;
drop policy if exists customers_update_self on public.customers;

do $$
begin
  if to_regprocedure('auth.uid()') is not null
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute $policy$
      create policy profiles_select_self
      on public.profiles
      for select
      to authenticated
      using (id = (select auth.uid()))
    $policy$;

    execute $policy$
      create policy profiles_update_self
      on public.profiles
      for update
      to authenticated
      using (id = (select auth.uid()))
      with check (id = (select auth.uid()))
    $policy$;

    execute $policy$
      create policy profile_details_select_self
      on public.profile_details
      for select
      to authenticated
      using (profile_id = (select auth.uid()))
    $policy$;

    execute $policy$
      create policy profile_details_update_self
      on public.profile_details
      for update
      to authenticated
      using (profile_id = (select auth.uid()))
      with check (profile_id = (select auth.uid()))
    $policy$;

    execute $policy$
      create policy customers_select_self
      on public.customers
      for select
      to authenticated
      using (profile_id = (select auth.uid()))
    $policy$;

    execute $policy$
      create policy customers_update_self
      on public.customers
      for update
      to authenticated
      using (profile_id = (select auth.uid()))
      with check (profile_id = (select auth.uid()))
    $policy$;
  end if;
end
$$;

commit;
