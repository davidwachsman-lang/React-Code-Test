-- Insurance SLA tables for Supabase (Postgres)
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

-- ============================================================
-- 1. Insurance carriers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.insurance_carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurance_carriers_name ON public.insurance_carriers(name);

-- ============================================================
-- 2. Carrier SLA documents (PDFs stored in Supabase Storage)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.carrier_sla_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES public.insurance_carriers(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_url text,
  publish_date date,
  uploaded_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carrier_sla_documents_carrier ON public.carrier_sla_documents(carrier_id);

-- ============================================================
-- 3. Carrier SLA checklist items (reference checklist per carrier)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.carrier_sla_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES public.insurance_carriers(id) ON DELETE CASCADE,
  section text,
  item_text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carrier_sla_checklist_carrier ON public.carrier_sla_checklist_items(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_sla_checklist_sort ON public.carrier_sla_checklist_items(carrier_id, sort_order);

-- ============================================================
-- Auto-update updated_at on carriers and documents
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_insurance_carriers_updated_at'
  ) THEN
    CREATE TRIGGER trg_insurance_carriers_updated_at
      BEFORE UPDATE ON public.insurance_carriers
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_carrier_sla_documents_updated_at'
  ) THEN
    CREATE TRIGGER trg_carrier_sla_documents_updated_at
      BEFORE UPDATE ON public.carrier_sla_documents
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.insurance_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_sla_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_sla_checklist_items ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all rows
CREATE POLICY IF NOT EXISTS "Authenticated users can read carriers"
  ON public.insurance_carriers FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can insert carriers"
  ON public.insurance_carriers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can update carriers"
  ON public.insurance_carriers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can delete carriers"
  ON public.insurance_carriers FOR DELETE TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can read documents"
  ON public.carrier_sla_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can insert documents"
  ON public.carrier_sla_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can update documents"
  ON public.carrier_sla_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can delete documents"
  ON public.carrier_sla_documents FOR DELETE TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can read checklist items"
  ON public.carrier_sla_checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can insert checklist items"
  ON public.carrier_sla_checklist_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can update checklist items"
  ON public.carrier_sla_checklist_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can delete checklist items"
  ON public.carrier_sla_checklist_items FOR DELETE TO authenticated USING (true);

-- ============================================================
-- Storage bucket: create 'insurance-slas' as a PRIVATE bucket
-- (Dashboard -> Storage -> New bucket -> name: insurance-slas, public: false)
--
-- Or via SQL:
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('insurance-slas', 'insurance-slas', false)
--   ON CONFLICT (id) DO NOTHING;
--
-- Then add a storage policy so authenticated users can upload/download:
-- CREATE POLICY "Authenticated users can upload SLA files"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'insurance-slas');
-- CREATE POLICY "Authenticated users can read SLA files"
--   ON storage.objects FOR SELECT TO authenticated
--   USING (bucket_id = 'insurance-slas');
-- CREATE POLICY "Authenticated users can delete SLA files"
--   ON storage.objects FOR DELETE TO authenticated
--   USING (bucket_id = 'insurance-slas');
-- ============================================================
