-- Bucket privado para os MP4 dos episódios renderizados
insert into storage.buckets (id, name, public)
values ('episodes', 'episodes', false)
on conflict (id) do nothing;

-- Cada usuário gerencia apenas a própria pasta {user_id}/...
drop policy if exists "episodes own read" on storage.objects;
create policy "episodes own read" on storage.objects for select to authenticated
  using (bucket_id = 'episodes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "episodes own insert" on storage.objects;
create policy "episodes own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'episodes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "episodes own update" on storage.objects;
create policy "episodes own update" on storage.objects for update to authenticated
  using (bucket_id = 'episodes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "episodes own delete" on storage.objects;
create policy "episodes own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'episodes' and (storage.foldername(name))[1] = auth.uid()::text);
