alter table public.vendors
  add column if not exists workers_comp_received boolean not null default false;
