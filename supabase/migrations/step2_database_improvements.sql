CREATE OR REPLACE FUNCTION calculate_kpi_metrics(p_sales_rep TEXT)
RETURNS JSONB AS $$
DECLARE
  v_kpi1 INT;
  v_kpi2 INT;
  v_kpi3_total INT;
  v_kpi3_visited INT;
BEGIN
  SELECT COUNT(*) INTO v_kpi2
  FROM crm_records
  WHERE primary_sales_rep = p_sales_rep
    AND relationship_stage = 'active_customer'
    AND (is_deleted IS NULL OR is_deleted = false);

  v_kpi3_total := v_kpi2;

  SELECT COUNT(*) INTO v_kpi1
  FROM jobs j
  WHERE j.referred_by IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM crm_records c
      WHERE c.primary_sales_rep = p_sales_rep
        AND c.relationship_stage = 'active_customer'
        AND (c.is_deleted IS NULL OR c.is_deleted = false)
        AND c.company_name IS NOT NULL
        AND c.company_name != ''
        AND j.referred_by ILIKE '%' || c.company_name || '%'
    );

  SELECT COUNT(DISTINCT a.crm_id) INTO v_kpi3_visited
  FROM crm_activities a
  JOIN crm_records c ON c.id = a.crm_id
  WHERE c.primary_sales_rep = p_sales_rep
    AND c.relationship_stage = 'active_customer'
    AND (c.is_deleted IS NULL OR c.is_deleted = false)
    AND a.activity_type IN ('meeting', 'site_visit', 'lunch');

  RETURN jsonb_build_object(
    'kpi1_actual_referrals', v_kpi1,
    'kpi2_actual_clients', v_kpi2,
    'kpi3_total_clients', v_kpi3_total,
    'kpi3_visited_clients', v_kpi3_visited
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE VIEW crm_roi_data AS
WITH ltm_jobs AS (
  SELECT id, crm_id, referred_by, COALESCE(estimate_value, 0) AS estimate_value
  FROM jobs
  WHERE date_received >= (CURRENT_DATE - INTERVAL '12 months')
),
job_metrics AS (
  SELECT
    c.id AS crm_id,
    COUNT(j.id) FILTER (
      WHERE j.referred_by IS NOT NULL
        AND c.company_name IS NOT NULL
        AND c.company_name != ''
        AND j.referred_by ILIKE '%' || c.company_name || '%'
    ) AS referral_jobs_ltm,
    COALESCE(SUM(j.estimate_value), 0) AS revenue_ltm
  FROM crm_records c
  LEFT JOIN ltm_jobs j ON j.crm_id = c.id
  WHERE c.is_deleted IS NOT TRUE
  GROUP BY c.id
),
last_activities AS (
  SELECT DISTINCT ON (crm_id) crm_id, created_at AS last_activity_at
  FROM crm_activities ORDER BY crm_id, created_at DESC
),
last_f2f AS (
  SELECT DISTINCT ON (crm_id) crm_id, created_at AS last_f2f_at
  FROM crm_activities WHERE activity_type IN ('meeting', 'site_visit', 'lunch')
  ORDER BY crm_id, created_at DESC
)
SELECT
  c.*,
  COALESCE(jm.referral_jobs_ltm, 0) AS referral_jobs_ltm,
  COALESCE(jm.revenue_ltm, 0) AS revenue_ltm,
  COALESCE(c.courting_cost, 0) AS cost_ltm,
  CASE WHEN COALESCE(c.courting_cost, 0) > 0
    THEN ((COALESCE(jm.revenue_ltm, 0) - c.courting_cost) / c.courting_cost * 100)
    ELSE NULL END AS roi,
  EXTRACT(DAY FROM NOW() - la.last_activity_at)::INT AS days_since_last_activity,
  EXTRACT(DAY FROM NOW() - lf.last_f2f_at)::INT AS days_since_last_f2f
FROM crm_records c
LEFT JOIN job_metrics jm ON jm.crm_id = c.id
LEFT JOIN last_activities la ON la.crm_id = c.id
LEFT JOIN last_f2f lf ON lf.crm_id = c.id
WHERE c.is_deleted IS NOT TRUE;

GRANT SELECT ON crm_roi_data TO anon, authenticated;

ALTER TABLE storm_events ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE storm_events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_storm_events_not_deleted ON storm_events(id) WHERE is_deleted = false;

ALTER TABLE goals_initiatives ADD COLUMN IF NOT EXISTS due_date_actual DATE;
ALTER TABLE goals_initiatives ADD COLUMN IF NOT EXISTS due_period TEXT;
UPDATE goals_initiatives SET due_date_actual = '2026-02-15' WHERE due_date = 'Feb 15' AND due_date_actual IS NULL;
UPDATE goals_initiatives SET due_date_actual = '2026-03-15' WHERE due_date = 'Mar 15' AND due_date_actual IS NULL;
UPDATE goals_initiatives SET due_date_actual = '2026-03-31' WHERE due_date = 'Mar 31' AND due_date_actual IS NULL;
UPDATE goals_initiatives SET due_date_actual = '2026-04-15' WHERE due_date = 'Apr 15' AND due_date_actual IS NULL;
UPDATE goals_initiatives SET due_date_actual = '2026-05-15' WHERE due_date = 'May 15' AND due_date_actual IS NULL;
UPDATE goals_initiatives SET due_period = due_date WHERE due_date IN ('Q1', 'Q2', 'Q3', 'Q4', 'Q1-Q2', 'Q2-Q3', 'Quarterly', 'LL Fin.') AND due_period IS NULL;

DO $$ BEGIN
  ALTER TABLE properties ADD CONSTRAINT fk_properties_crm
    FOREIGN KEY (crm_id) REFERENCES crm_records(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'crm_records', 'jobs', 'goals_key_results',
    'goals_financial_targets', 'goals_initiatives',
    'sales_rep_scorecards', 'storm_events'
  ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_by TEXT', t);
    END IF;
  END LOOP;
END;
$$;

DO $$ BEGIN CREATE TYPE relationship_stage_enum AS ENUM ('prospect', 'active_customer', 'inactive', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE job_status_enum AS ENUM ('pending', 'in_progress', 'wip', 'complete', 'lead');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE goal_status_enum AS ENUM ('on_track', 'at_risk', 'off_track', 'not_started');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE initiative_status_enum AS ENUM ('not_started', 'in_progress', 'complete', 'at_risk', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE crew_status_enum AS ENUM ('assigned', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE schedule_status_enum AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
