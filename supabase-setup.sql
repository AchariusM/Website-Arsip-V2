-- Jalankan seluruh isi file ini di Supabase SQL Editor.
-- File ini menyiapkan database, akun awal, dan bucket upload file.

create table if not exists public.users (
  id bigserial primary key,
  nama text not null,
  email text not null unique,
  password text not null,
  role text not null default 'Pengurus',
  status text not null default 'Aktif',
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id bigserial primary key,
  judul text not null,
  deskripsi text,
  kategori text not null,
  tanggal date not null,
  uploaded_by bigint references public.users(id) on delete set null,
  file_name text,
  file_url text,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.documents enable row level security;

grant usage on schema public to anon;
grant select, insert, update, delete on public.users to anon;
grant select, insert, update, delete on public.documents to anon;
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

insert into public.users (nama, email, password, role, status)
values
  ('Admin Plosodoyong', 'admin@plosodoyong.id', 'admin123', 'Admin', 'Aktif'),
  ('Pengurus Plosodoyong', 'pengurus@plosodoyong.id', 'pengurus123', 'Pengurus', 'Aktif')
on conflict (email) do update set
  nama = excluded.nama,
  password = excluded.password,
  role = excluded.role,
  status = excluded.status;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  true,
  4194304,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
