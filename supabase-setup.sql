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

create table if not exists public.penduduk (
  id bigserial primary key,
  nomor integer,
  nik text,
  nomor_kk text,
  nomor_rts text,
  nama text,
  padukuhan text,
  rw text,
  rt text,
  pendidikan_dlm_kk text,
  pendidikan_sdg_ditemph text,
  pekerjaan text,
  tanggal_lahir date,
  tempat_lahir text,
  umur integer,
  kawin text,
  shdk text,
  gol_darah text,
  nama_ayah text,
  nama_ibu text,
  status text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_id bigint references public.users(id) on delete set null,
  actor_name text not null,
  actor_role text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

alter table public.users enable row level security;
alter table public.documents enable row level security;
alter table public.penduduk enable row level security;
alter table public.audit_logs enable row level security;

grant usage on schema public to anon;
grant select, insert, update, delete on public.users to anon;
grant select, insert, update, delete on public.documents to anon;
grant select, insert, update, delete on public.penduduk to anon;
grant select, insert on public.audit_logs to anon;
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

drop policy if exists "Anon read audit logs" on public.audit_logs;
create policy "Anon read audit logs"
on public.audit_logs for select
to anon
using (true);

drop policy if exists "Anon insert audit logs" on public.audit_logs;
create policy "Anon insert audit logs"
on public.audit_logs for insert
to anon
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
