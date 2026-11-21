-- Xat entre un entrenador i un client.
-- Enganxa tot aquest fitxer a l'editor SQL de Supabase i prem Run.
-- Només els dos participants d'una conversa poden llegir-la i escriure-hi.

create table if not exists public.messages (
  id text primary key,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists messages_pair_idx on public.messages (trainer_id, client_id, created_at);
create index if not exists messages_client_idx on public.messages (client_id);

alter table public.messages enable row level security;
alter table public.messages replica identity full;

create or replace function public.protect_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.trainer_id is distinct from old.trainer_id
      or new.client_id is distinct from old.client_id
      or new.sender_id is distinct from old.sender_id
      or new.body is distinct from old.body
      or new.created_at is distinct from old.created_at then
      raise exception 'Només es pot marcar el missatge com a llegit';
    end if;
    if new.read_at is distinct from old.read_at and auth.uid() = old.sender_id then
      raise exception 'Només el destinatari pot marcar el missatge com a llegit';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists messages_protect on public.messages;
create trigger messages_protect
  before insert or update on public.messages
  for each row execute procedure public.protect_message();

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated
  using (trainer_id = auth.uid() or client_id = auth.uid());

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and read_at is null
    and (
      (
        public.is_trainer()
        and trainer_id = auth.uid()
        and exists (
          select 1 from public.profiles
          where id = client_id and trainer_id = auth.uid() and role = 'client'
        )
      )
      or (
        not public.is_trainer()
        and client_id = auth.uid()
        and trainer_id = public.current_trainer_id()
      )
    )
  );

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update to authenticated
  using (trainer_id = auth.uid() or client_id = auth.uid())
  with check (
    (trainer_id = auth.uid() or client_id = auth.uid())
    and sender_id <> auth.uid()
  );

revoke all on public.messages from anon;
grant select, insert, update on public.messages to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
