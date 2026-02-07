-- Insurance SLA tables for Supabase (Postgres)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

-- Drop existing tables so we get the correct schema (uuid, not bigint)
DROP TABLE IF EXISTS public.carrier_sla_checklist_items CASCADE;
DROP TABLE IF EXISTS public.carrier_sla_documents CASCADE;
DROP TABLE IF EXISTS public.insurance_carriers CASCADE;

-- 1. Insurance carriers
CREATE TABLE public.insurance_carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurance_carriers_name ON public.insurance_carriers(name);

-- 2. Carrier SLA documents (PDFs stored in Supabase Storage)
CREATE TABLE public.carrier_sla_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES public.insurance_carriers(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_url text,
  publish_date date,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carrier_sla_documents_carrier ON public.carrier_sla_documents(carrier_id);

-- 3. Carrier SLA checklist items (reference checklist per carrier)
CREATE TABLE public.carrier_sla_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES public.insurance_carriers(id) ON DELETE CASCADE,
  section text,
  text text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carrier_sla_checklist_carrier ON public.carrier_sla_checklist_items(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_sla_checklist_sort ON public.carrier_sla_checklist_items(carrier_id, sort_order);

-- Storage bucket: create 'insurance-slas' bucket via the Supabase Dashboard
-- (Dashboard → Storage → New bucket → name: insurance-slas, public: true)
--
-- Or via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('insurance-slas', 'insurance-slas', true)
-- ON CONFLICT (id) DO NOTHING;
