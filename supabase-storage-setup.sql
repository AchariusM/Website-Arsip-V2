-- Jalankan file ini di Supabase SQL Editor.
-- Ini menyiapkan upload file langsung dari browser ke Supabase Storage.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read documents bucket" on storage.objects;
create policy "Public read documents bucket"
on storage.objects for select
to anon
using (bucket_id = 'documents');

drop policy if exists "Anon upload documents bucket" on storage.objects;
create policy "Anon upload documents bucket"
on storage.objects for insert
to anon
with check (bucket_id = 'documents');

drop policy if exists "Anon update documents bucket" on storage.objects;
create policy "Anon update documents bucket"
on storage.objects for update
to anon
using (bucket_id = 'documents')
with check (bucket_id = 'documents');

drop policy if exists "Anon delete documents bucket" on storage.objects;
create policy "Anon delete documents bucket"
on storage.objects for delete
to anon
using (bucket_id = 'documents');
