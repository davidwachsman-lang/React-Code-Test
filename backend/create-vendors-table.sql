-- Resource Center: vendors table for Supabase (Postgres)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

-- Drop existing table so we get the correct schema (removes any existing data).
-- CASCADE drops the foreign key from job_vendors (job_vendors.vendor_id); job_vendors table and its rows are kept.
DROP TABLE IF EXISTS public.vendors CASCADE;

-- Create vendors table
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  phone text,
  email text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Optional: index for filtering by category
CREATE INDEX IF NOT EXISTS idx_vendors_category ON public.vendors(category);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON public.vendors(name);

-- Optional: enable RLS (Row Level Security) if you want per-user or org scoping later
-- ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
-- For now, use Supabase Dashboard → Authentication → Policies to allow anon/authenticated read/write as needed.

-- Seed with sample vendors (run once; skip if you prefer to add via the app)
-- If the table already has rows, run: DELETE FROM public.vendors; then run the INSERT below.
INSERT INTO public.vendors (name, category, phone, email, notes) VALUES
  ('Example Plumbing Co.', 'Plumbers', '555-123-4567', 'service@exampleplumbing.com', '24/7 emergency service available'),
  ('Bright Spark Electric', 'Electricians', '555-234-5678', 'info@brightspark.com', 'Licensed & insured, commercial/residential'),
  ('Cool Air HVAC', 'HVAC', '555-345-6789', 'service@coolairhvac.com', 'Same-day service available'),
  ('Timber Tree Service', 'Tree Removal', '555-456-7890', 'quote@timbertree.com', 'Storm damage specialists'),
  ('Top Notch Roofing', 'Roofing', '555-567-8901', 'info@topnotchroofing.com', 'Emergency tarping available'),
  ('Custom Cabinet Works', 'Cabinets', '555-678-9012', 'sales@customcabinets.com', 'Custom and stock cabinets'),
  ('Floor Masters', 'Flooring', '555-789-0123', 'install@floormasters.com', 'Hardwood, LVP, tile, carpet'),
  ('Precision Drywall', 'Drywall', '555-890-1234', 'jobs@precisiondrywall.com', 'Repair and full install'),
  ('Pro Paint Crew', 'Painting', '555-901-2345', 'quotes@propaintcrew.com', 'Interior/exterior, spray or brush'),
  ('Clear View Glass', 'Glass/Windows', '555-012-3456', 'service@clearviewglass.com', 'Board-up and replacement');

-- Optional: re-add foreign key from job_vendors to vendors (run only if job_vendors.vendor_id should reference vendors)
-- ALTER TABLE public.job_vendors
--   ADD CONSTRAINT job_vendors_vendor_id_fkey
--   FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);
