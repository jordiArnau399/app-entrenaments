-- Motor de Ritme: administrador, invitacions d'entrenador, versions i fus horari.
-- Enganxa tot aquest fitxer a l'editor SQL de Supabase i prem Run.
-- El correu jordiarnau@gmail.com passa a ser administrador.
-- Si aquest compte encara no existeix, el primer registre amb aquest correu el crea com a administrador.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('trainer', 'client', 'admin'));

alter table public.profiles drop constraint if exists client_has_trainer;
alter table public.profiles
  add constraint client_has_trainer check (
    (role in ('trainer', 'admin') and trainer_id is null)
    or (role = 'client' and trainer_id is not null)
  );

alter table public.profiles add column if not exists timezone text not null default 'Europe/Madrid';
alter table public.profiles add column if not exists language text;

alter table public.invites add column if not exists kind text not null default 'client';
alter table public.invites drop constraint if exists invites_kind_check;
alter table public.invites
  add constraint invites_kind_check check (kind in ('client', 'trainer'));

alter table public.exercises add column if not exists version integer not null default 1;
alter table public.templates add column if not exists version integer not null default 1;
alter table public.plans add column if not exists version integer not null default 1;
alter table public.sessions add column if not exists version integer not null default 1;
alter table public.session_logs add column if not exists version integer not null default 1;
alter table public.invites add column if not exists version integer not null default 1;
alter table public.profiles add column if not exists version integer not null default 1;

create table if not exists public.trainer_assignments (
  id text primary key,
  client_id uuid not null references public.profiles (id) on delete cascade,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists trainer_assignments_client_idx on public.trainer_assignments (client_id);
create index if not exists trainer_assignments_trainer_idx on public.trainer_assignments (trainer_id);

alter table public.trainer_assignments enable row level security;

insert into public.trainer_assignments (id, client_id, trainer_id, started_at)
select 'asg_' || id::text || '_0', id, trainer_id, created_at
from public.profiles
where role = 'client' and trainer_id is not null
on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  )
$$;

create or replace function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('trainer', 'admin') and status = 'active'
  )
$$;

create or replace function public.current_trainer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case when role in ('trainer', 'admin') then id else trainer_id end
  from public.profiles
  where id = auth.uid()
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.touch_row()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at := now();
    new.version := 1;
    return new;
  end if;
  if new.version is not null and new.version is distinct from old.version then
    raise exception 'Conflicte de versió';
  end if;
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end;
$$;

create or replace function public.protect_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    new.updated_at := now();
    if new.version is null or new.version = old.version then
      new.version := old.version + 1;
    end if;
    return new;
  end if;
  if not public.is_admin() then
    if new.role is distinct from old.role
      or new.trainer_id is distinct from old.trainer_id
      or new.status is distinct from old.status then
      raise exception 'No pots canviar el rol, l''entrenador ni l''estat';
    end if;
  else
    if new.role is distinct from old.role then
      raise exception 'El rol només es canvia amb SQL';
    end if;
  end if;
  if new.version is not null and new.version is distinct from old.version then
    raise exception 'Conflicte de versió';
  end if;
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end;
$$;

create or replace function public.record_trainer_move()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.role = 'client' and new.trainer_id is not null then
    insert into public.trainer_assignments (id, client_id, trainer_id, started_at)
    values ('asg_' || new.id::text || '_' || floor(extract(epoch from now()))::text, new.id, new.trainer_id, now())
    on conflict (id) do nothing;
  elsif tg_op = 'UPDATE' and new.role = 'client' and new.trainer_id is distinct from old.trainer_id and new.trainer_id is not null then
    update public.trainer_assignments
      set ended_at = now()
      where client_id = new.id and ended_at is null;
    insert into public.trainer_assignments (id, client_id, trainer_id, started_at)
    values ('asg_' || new.id::text || '_' || floor(extract(epoch from now()))::text, new.id, new.trainer_id, now());
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_assignment on public.profiles;
create trigger profiles_assignment
  after insert or update of trainer_id on public.profiles
  for each row execute procedure public.record_trainer_move();

create or replace function public.sessions_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  previous text;
  incoming text;
begin
  if tg_op = 'UPDATE' then
    previous := old.payload->>'status';
    incoming := coalesce(new.payload->>'status', previous);
    if public.is_trainer() then
      new.payload := jsonb_set(new.payload, '{status}', to_jsonb(previous), true);
    else
      if incoming not in ('done', 'skipped') then
        raise exception 'El client només pot marcar la sessió feta o saltada';
      end if;
      if previous = 'done' then
        incoming := 'done';
      end if;
      new.payload := old.payload || jsonb_build_object('status', incoming);
    end if;
  elsif not public.is_trainer() then
    raise exception 'El client no pot crear sessions';
  end if;
  if tg_op = 'INSERT' then
    new.updated_at := now();
    new.version := 1;
  else
    if new.version is not null and new.version is distinct from old.version then
      raise exception 'Conflicte de versió';
    end if;
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists sessions_before_write on public.sessions;
create trigger sessions_before_write
  before insert or update on public.sessions
  for each row execute procedure public.sessions_before_write();

drop trigger if exists exercises_touch on public.exercises;
create trigger exercises_touch before insert or update on public.exercises
  for each row execute procedure public.touch_row();
drop trigger if exists templates_touch on public.templates;
create trigger templates_touch before insert or update on public.templates
  for each row execute procedure public.touch_row();
drop trigger if exists plans_touch on public.plans;
create trigger plans_touch before insert or update on public.plans
  for each row execute procedure public.touch_row();
drop trigger if exists session_logs_touch on public.session_logs;
create trigger session_logs_touch before insert or update on public.session_logs
  for each row execute procedure public.touch_row();
drop trigger if exists invites_touch on public.invites;
create trigger invites_touch before insert or update on public.invites
  for each row execute procedure public.touch_row();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  invite_row public.invites;
  entered_code text := upper(trim(coalesce(meta->>'invite_code', '')));
  display_name text := nullif(trim(coalesce(meta->>'name', '')), '');
  tz text := coalesce(nullif(trim(coalesce(meta->>'timezone', '')), ''), 'Europe/Madrid');
  lang text := nullif(trim(coalesce(meta->>'language', '')), '');
begin
  if display_name is null then
    display_name := split_part(new.email, '@', 1);
  end if;

  if lower(new.email) = 'jordiarnau@gmail.com' then
    insert into public.profiles (id, role, name, email, trainer_id, status, timezone, language)
    values (new.id, 'admin', display_name, new.email, null, 'active', tz, lang);
    return new;
  end if;

  if entered_code = '' then
    raise exception 'Cal un codi d''invitació';
  end if;

  select * into invite_row
  from public.invites
  where invites.code = entered_code and used_at is null
  for update;
  if not found then
    raise exception 'Codi d''invitació no vàlid';
  end if;

  if invite_row.kind = 'trainer' then
    insert into public.profiles (id, role, name, email, trainer_id, status, timezone, language)
    values (new.id, 'trainer', display_name, new.email, null, 'active', tz, lang);
    update public.invites
      set used_at = now(), updated_at = now()
      where id = invite_row.id;
  else
    insert into public.profiles (id, role, name, email, trainer_id, status, timezone, language)
    values (new.id, 'client', display_name, new.email, invite_row.trainer_id, 'active', tz, lang);
    update public.invites
      set used_at = now(), client_id = new.id, updated_at = now()
      where id = invite_row.id;
  end if;
  return new;
end;
$$;

update public.profiles
set role = 'admin', trainer_id = null, status = 'active'
where lower(email) = 'jordiarnau@gmail.com';

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    public.is_admin()
    or id = auth.uid()
    or trainer_id = auth.uid()
    or id = public.current_trainer_id()
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (public.is_admin() or id = auth.uid())
  with check (public.is_admin() or id = auth.uid());

drop policy if exists trainer_assignments_select on public.trainer_assignments;
create policy trainer_assignments_select on public.trainer_assignments
  for select to authenticated
  using (
    public.is_admin()
    or trainer_id = auth.uid()
    or client_id = auth.uid()
  );

revoke all on public.trainer_assignments from anon;
grant select on public.trainer_assignments to authenticated;
