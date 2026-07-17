-- Jalankan satu kali di Supabase SQL Editor untuk mengaktifkan Audit Log.

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

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

alter table public.audit_logs enable row level security;
grant select, insert on public.audit_logs to anon;
grant usage, select on sequence public.audit_logs_id_seq to anon;

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

-- Audit log sengaja tidak mempunyai policy UPDATE atau DELETE agar riwayat
-- tidak dapat diubah atau dihapus melalui website.
