alter table public.vendors
  add column if not exists coi_received boolean not null default false,
  add column if not exists coi_expiration_date date,
  add column if not exists tax_form_received boolean not null default false,
  add column if not exists tax_form_expiration_date date,
  add column if not exists payment_terms text,
  add column if not exists contract_file_name text,
  add column if not exists contract_file_path text,
  add column if not exists contract_file_url text,
  add column if not exists contract_uploaded_at timestamptz;

alter table public.vendors
  drop constraint if exists vendors_payment_terms_check;

alter table public.vendors
  add constraint vendors_payment_terms_check
  check (
    payment_terms is null
    or payment_terms in ('Net 15', 'Net 30', 'Net 60', 'Net 90')
  );

insert into storage.buckets (id, name, public)
values ('vendor-contracts', 'vendor-contracts', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can upload vendor contracts'
  ) then
    create policy "Authenticated users can upload vendor contracts"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'vendor-contracts');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can update vendor contracts'
  ) then
    create policy "Authenticated users can update vendor contracts"
      on storage.objects for update to authenticated
      using (bucket_id = 'vendor-contracts')
      with check (bucket_id = 'vendor-contracts');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can delete vendor contracts'
  ) then
    create policy "Authenticated users can delete vendor contracts"
      on storage.objects for delete to authenticated
      using (bucket_id = 'vendor-contracts');
  end if;
end $$;
