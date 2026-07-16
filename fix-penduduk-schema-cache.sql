-- Jalankan di Supabase SQL Editor jika muncul error:
-- "Could not find the table 'public.penduduk' in the schema cache"

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

alter table public.penduduk enable row level security;

grant usage on schema public to anon;
grant select, insert, update, delete on public.penduduk to anon;
grant usage, select on all sequences in schema public to anon;

drop policy if exists "Anon full access penduduk" on public.penduduk;
create policy "Anon full access penduduk"
on public.penduduk for all
to anon
using (true)
with check (true);

notify pgrst, 'reload schema';

select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'penduduk';
