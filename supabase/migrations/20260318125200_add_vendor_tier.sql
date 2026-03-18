alter table public.vendors
  add column if not exists vendor_tier text;

alter table public.vendors
  drop constraint if exists vendors_vendor_tier_check;

alter table public.vendors
  add constraint vendors_vendor_tier_check
  check (
    vendor_tier is null
    or vendor_tier in ('Tier 1', 'Tier 2', 'Tier 3', 'Tier 4')
  );
