-- Comptes reals de Ritme.
-- Enganxa tot aquest fitxer a l'editor SQL de Supabase i executa'l una vegada.
-- Cada entrenador només veu els seus clients. Cada client només veu el seu pla,
-- les seves sessions i els seus resultats. Ho imposa Postgres (Row Level Security).

create extension if not exists pgcrypto;

drop table if exists public.ritme_state;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('trainer', 'client')),
  name text not null,
  email text not null,
  trainer_id uuid references public.profiles (id),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_has_trainer check (
    (role = 'trainer' and trainer_id is null)
    or (role = 'client' and trainer_id is not null)
  )
);

create table if not exists public.invites (
  id text primary key,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  email text not null default '',
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  client_id uuid references public.profiles (id),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id text primary key,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create table if not exists public.templates (
  id text primary key,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create table if not exists public.plans (
  id text primary key,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create table if not exists public.sessions (
  id text primary key,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create table if not exists public.session_logs (
  id text primary key,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists exercises_trainer_idx on public.exercises (trainer_id);
create index if not exists templates_trainer_idx on public.templates (trainer_id);
create index if not exists plans_trainer_idx on public.plans (trainer_id);
create index if not exists plans_client_idx on public.plans (client_id);
create index if not exists sessions_trainer_idx on public.sessions (trainer_id);
create index if not exists sessions_client_idx on public.sessions (client_id);
create index if not exists session_logs_trainer_idx on public.session_logs (trainer_id);
create index if not exists session_logs_client_idx on public.session_logs (client_id);
create index if not exists invites_trainer_idx on public.invites (trainer_id);

alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.exercises enable row level security;
alter table public.templates enable row level security;
alter table public.plans enable row level security;
alter table public.sessions enable row level security;
alter table public.session_logs enable row level security;

-- Llegeix el perfil propi sense tornar a entrar a les polítiques (evita el bucle).
create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid()
$$;

create or replace function public.current_trainer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case when role = 'trainer' then id else trainer_id end
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'trainer'
  )
$$;

revoke all on function public.current_profile() from public, anon;
revoke all on function public.current_trainer_id() from public, anon;
revoke all on function public.is_trainer() from public, anon;
grant execute on function public.current_profile() to authenticated;
grant execute on function public.current_trainer_id() to authenticated;
grant execute on function public.is_trainer() to authenticated;

-- Crea el perfil quan algú es registra. El client ha de portar un codi d'invitació.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  invite_row public.invites;
  wanted text := coalesce(meta->>'role', 'trainer');
  entered_code text := upper(trim(coalesce(meta->>'invite_code', '')));
  display_name text := nullif(trim(coalesce(meta->>'name', '')), '');
begin
  if display_name is null then
    display_name := split_part(new.email, '@', 1);
  end if;

  if wanted = 'client' or entered_code <> '' then
    select * into invite_row
    from public.invites
    where invites.code = entered_code and used_at is null
    for update;
    if not found then
      raise exception 'Codi d''invitació no vàlid';
    end if;
    insert into public.profiles (id, role, name, email, trainer_id, status)
    values (new.id, 'client', display_name, new.email, invite_row.trainer_id, 'active');
    update public.invites
      set used_at = now(), client_id = new.id, updated_at = now()
      where id = invite_row.id;
  else
    insert into public.profiles (id, role, name, email, trainer_id, status)
    values (new.id, 'trainer', display_name, new.email, null, 'active');
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.protect_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role or new.trainer_id is distinct from old.trainer_id then
    raise exception 'No pots canviar el rol ni l''entrenador';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect
  before update on public.profiles
  for each row execute procedure public.protect_profile();

create or replace function public.session_log_matches_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.sessions
    where id = new.payload->>'plannedSessionId'
      and client_id = new.client_id
      and trainer_id = new.trainer_id
  ) then
    raise exception 'La sessió no és d''aquest client';
  end if;
  return new;
end;
$$;

drop trigger if exists session_logs_match on public.session_logs;
create trigger session_logs_match
  before insert or update on public.session_logs
  for each row execute procedure public.session_log_matches_client();

-- Perfils: el propi, els clients de l'entrenador, i l'entrenador del client.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or trainer_id = auth.uid()
    or id = public.current_trainer_id()
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Invitacions: només l'entrenador que les ha creat.
drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites
  for select to authenticated
  using (public.is_trainer() and trainer_id = auth.uid());

drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites
  for insert to authenticated
  with check (public.is_trainer() and trainer_id = auth.uid() and client_id is null and used_at is null);

drop policy if exists invites_update on public.invites;
create policy invites_update on public.invites
  for update to authenticated
  using (public.is_trainer() and trainer_id = auth.uid())
  with check (public.is_trainer() and trainer_id = auth.uid());

drop policy if exists invites_delete on public.invites;
create policy invites_delete on public.invites
  for delete to authenticated
  using (public.is_trainer() and trainer_id = auth.uid());

-- Biblioteca: la llegeix l'entrenador i els seus clients. Només l'entrenador l'escriu.
drop policy if exists exercises_select on public.exercises;
create policy exercises_select on public.exercises
  for select to authenticated
  using (trainer_id = public.current_trainer_id());

drop policy if exists exercises_write on public.exercises;
create policy exercises_write on public.exercises
  for all to authenticated
  using (public.is_trainer() and trainer_id = auth.uid())
  with check (public.is_trainer() and trainer_id = auth.uid());

drop policy if exists templates_select on public.templates;
create policy templates_select on public.templates
  for select to authenticated
  using (trainer_id = public.current_trainer_id());

drop policy if exists templates_write on public.templates;
create policy templates_write on public.templates
  for all to authenticated
  using (public.is_trainer() and trainer_id = auth.uid())
  with check (public.is_trainer() and trainer_id = auth.uid());

-- Plans: els veu l'entrenador propietari i el client assignat. Només l'entrenador els canvia.
drop policy if exists plans_select on public.plans;
create policy plans_select on public.plans
  for select to authenticated
  using (trainer_id = auth.uid() or client_id = auth.uid());

drop policy if exists plans_write on public.plans;
create policy plans_write on public.plans
  for all to authenticated
  using (public.is_trainer() and trainer_id = auth.uid())
  with check (
    public.is_trainer()
    and trainer_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = client_id and trainer_id = auth.uid() and role = 'client'
    )
  );

-- Sessions: el client pot actualitzar la seva (feta o saltada). No en crea de noves.
drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
  for select to authenticated
  using (trainer_id = auth.uid() or client_id = auth.uid());

drop policy if exists sessions_insert on public.sessions;
create policy sessions_insert on public.sessions
  for insert to authenticated
  with check (public.is_trainer() and trainer_id = auth.uid() and client_id is not null);

drop policy if exists sessions_update on public.sessions;
create policy sessions_update on public.sessions
  for update to authenticated
  using (trainer_id = auth.uid() or client_id = auth.uid())
  with check (
    (public.is_trainer() and trainer_id = auth.uid())
    or (client_id = auth.uid() and trainer_id = public.current_trainer_id())
  );

drop policy if exists sessions_delete on public.sessions;
create policy sessions_delete on public.sessions
  for delete to authenticated
  using (public.is_trainer() and trainer_id = auth.uid());

-- Registres: només el client els escriu, i només els seus. L'entrenador els llegeix.
drop policy if exists session_logs_select on public.session_logs;
create policy session_logs_select on public.session_logs
  for select to authenticated
  using (trainer_id = auth.uid() or client_id = auth.uid());

drop policy if exists session_logs_insert on public.session_logs;
create policy session_logs_insert on public.session_logs
  for insert to authenticated
  with check (
    client_id = auth.uid()
    and trainer_id = public.current_trainer_id()
    and not public.is_trainer()
  );

drop policy if exists session_logs_update on public.session_logs;
create policy session_logs_update on public.session_logs
  for update to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid() and trainer_id = public.current_trainer_id());

drop policy if exists session_logs_delete on public.session_logs;
create policy session_logs_delete on public.session_logs
  for delete to authenticated
  using (client_id = auth.uid());

revoke all on public.profiles from anon;
revoke all on public.invites from anon;
revoke all on public.exercises from anon;
revoke all on public.templates from anon;
revoke all on public.plans from anon;
revoke all on public.sessions from anon;
revoke all on public.session_logs from anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.invites to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.templates to authenticated;
grant select, insert, update, delete on public.plans to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
grant select, insert, update, delete on public.session_logs to authenticated;
