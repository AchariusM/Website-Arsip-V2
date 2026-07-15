-- Jalankan di Supabase SQL Editor jika login demo tidak bisa digunakan.
-- File ini hanya memastikan akun demo ada dan password-nya kembali default.

alter table public.users disable row level security;

grant usage on schema public to anon;
grant select, insert, update, delete on public.users to anon;
grant usage, select on all sequences in schema public to anon;

insert into public.users (nama, email, password, role, status)
values
  ('Admin Plosodoyong', 'admin@plosodoyong.id', 'admin123', 'Admin', 'Aktif'),
  ('Pengurus Plosodoyong', 'pengurus@plosodoyong.id', 'pengurus123', 'Pengurus', 'Aktif')
on conflict (email) do update set
  nama = excluded.nama,
  password = excluded.password,
  role = excluded.role,
  status = excluded.status;

select id, nama, email, password, role, status
from public.users
where email in ('admin@plosodoyong.id', 'pengurus@plosodoyong.id')
order by role, email;
