-- Fix type mismatch between public.job_vendors.vendor_id and public.vendors.id.
-- WARNING:
-- This migration only succeeds if existing job_vendors.vendor_id values can be cast to UUID.
-- If the table still stores legacy numeric vendor IDs, stop and perform a data-mapping migration instead.

do $$
declare
  non_uuid_count integer;
begin
  select count(*)
  into non_uuid_count
  from public.job_vendors
  where vendor_id is not null
    and vendor_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  if non_uuid_count > 0 then
    raise exception
      'Migration aborted: % job_vendors.vendor_id value(s) are not UUID-shaped. Run a data-mapping migration before changing the column type.',
      non_uuid_count;
  end if;
end $$;

begin;

alter table public.job_vendors
drop constraint if exists job_vendors_vendor_id_fkey;

alter table public.job_vendors
alter column vendor_id type uuid
using vendor_id::text::uuid;

alter table public.job_vendors
add constraint job_vendors_vendor_id_fkey
foreign key (vendor_id) references public.vendors(id);

commit;
