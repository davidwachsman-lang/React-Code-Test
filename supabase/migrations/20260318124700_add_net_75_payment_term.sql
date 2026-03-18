alter table public.vendors
  drop constraint if exists vendors_payment_terms_check;

alter table public.vendors
  add constraint vendors_payment_terms_check
  check (
    payment_terms is null
    or payment_terms in ('Net 15', 'Net 30', 'Net 60', 'Net 75', 'Net 90')
  );
