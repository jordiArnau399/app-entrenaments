-- Esquema mínim per sincronitzar Ritme amb Supabase.
-- El mode demostració no el necessita: l'app funciona sola i, en local,
-- també pot fer servir el concentrador que obre `npm start`.
-- Abans d'obrir-ho a clients reals, substitueix aquestes polítiques
-- per regles on cada entrenador només llegeix les seves dades.

create table if not exists public.ritme_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.ritme_state enable row level security;

drop policy if exists "ritme demo read" on public.ritme_state;
drop policy if exists "ritme demo insert" on public.ritme_state;
drop policy if exists "ritme demo update" on public.ritme_state;

create policy "ritme demo read" on public.ritme_state
  for select using (true);

create policy "ritme demo insert" on public.ritme_state
  for insert with check (true);

create policy "ritme demo update" on public.ritme_state
  for update using (true);
