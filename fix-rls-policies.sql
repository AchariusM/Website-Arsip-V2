-- Jalankan di Supabase SQL Editor jika muncul error:
-- "new row violates row-level security policy for table documents/penduduk"

alter table public.users enable row level security;
alter table public.documents enable row level security;
alter table public.penduduk enable row level security;

grant usage on schema public to anon;
grant select, insert, update, delete on public.users to anon;
grant select, insert, update, delete on public.documents to anon;
grant select, insert, update, delete on public.penduduk to anon;
grant usage, select on all sequences in schema public to anon;

drop policy if exists "Anon full access users" on public.users;
create policy "Anon full access users"
on public.users for all
to anon
using (true)
with check (true);

drop policy if exists "Anon full access documents" on public.documents;
create policy "Anon full access documents"
on public.documents for all
to anon
using (true)
with check (true);

drop policy if exists "Anon full access penduduk" on public.penduduk;
create policy "Anon full access penduduk"
on public.penduduk for all
to anon
using (true)
with check (true);

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
