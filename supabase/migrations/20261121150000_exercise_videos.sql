-- Vídeos de demostració dels exercicis.
-- Enganxa tot aquest fitxer a l'editor SQL de Supabase i prem Run.
-- L'entrenador puja el fitxer a la seva carpeta. Els seus clients el poden veure.

insert into storage.buckets (id, name, public)
values ('exercise-videos', 'exercise-videos', false)
on conflict (id) do nothing;

drop policy if exists exercise_videos_insert on storage.objects;
create policy exercise_videos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'exercise-videos'
    and public.is_trainer()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists exercise_videos_select on storage.objects;
create policy exercise_videos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'exercise-videos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = public.current_trainer_id()::text
    )
  );

drop policy if exists exercise_videos_update on storage.objects;
create policy exercise_videos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'exercise-videos'
    and public.is_trainer()
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'exercise-videos'
    and public.is_trainer()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists exercise_videos_delete on storage.objects;
create policy exercise_videos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'exercise-videos'
    and public.is_trainer()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
