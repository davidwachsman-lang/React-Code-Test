-- Goals Tables: Schema + Seed Data for FY26 Plan
-- Run this migration to create all goals-related tables and populate with FY26 targets

-- ============================================================
-- 1. PILLARS
-- ============================================================
CREATE TABLE goals_pillars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO goals_pillars (id, name, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Operational Execution', 1),
  ('a0000000-0000-0000-0000-000000000002', 'Cash + Margin Discipline', 2),
  ('a0000000-0000-0000-0000-000000000003', 'Sales & Marketing Reliability', 3);

-- ============================================================
-- 2. KEY RESULTS
-- ============================================================
CREATE TABLE goals_key_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pillar_id UUID REFERENCES goals_pillars(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  target_value TEXT NOT NULL,
  actual_value TEXT,
  measurement_cadence TEXT DEFAULT 'monthly',
  status TEXT DEFAULT 'not_started' CHECK (status IN ('on_track', 'at_risk', 'off_track', 'not_started')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pillar 1: Operational Execution
INSERT INTO goals_key_results (pillar_id, label, target_value, measurement_cadence, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', '80% of estimates delivered within SLA', '80%', 'weekly', 1),
  ('a0000000-0000-0000-0000-000000000001', 'Office Cycle Time < 2 days for 80% of jobs', '< 2 days (80%)', 'weekly', 2),
  ('a0000000-0000-0000-0000-000000000001', 'Contact 90% of new leads within 30 minutes', '90% within 30 min', 'weekly', 3),
  ('a0000000-0000-0000-0000-000000000001', 'Median residential Water estimate > $5,000 (80% of jobs)', '> $5,000 (80%)', 'monthly', 4),
  ('a0000000-0000-0000-0000-000000000001', 'eNPS Scores ≥ 50', '≥ 50', 'quarterly', 5),
  ('a0000000-0000-0000-0000-000000000001', 'COS ≥ 9 for 85% of Mit and Recon jobs', '≥ 9 (85%)', 'monthly', 6);

-- Pillar 2: Cash + Margin Discipline
INSERT INTO goals_key_results (pillar_id, label, target_value, measurement_cadence, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'Organic revenue $20M / Profit ~$1M', '$20M rev / ~$1M profit', 'monthly', 1),
  ('a0000000-0000-0000-0000-000000000002', 'Gross Margin: Mit ≥ 60% (HB) / 65% blend; Recon ≥ 42.5%', 'Mit ≥ 60%/65%; Recon ≥ 42.5%', 'monthly', 2),
  ('a0000000-0000-0000-0000-000000000002', 'A/R Days: HB ≤ 45 days; IDRT ≤ 90 days', 'HB ≤ 45; IDRT ≤ 90', 'weekly', 3),
  ('a0000000-0000-0000-0000-000000000002', '13-week cash forecast accuracy ≥ 90%', '≥ 90%', 'weekly', 4),
  ('a0000000-0000-0000-0000-000000000002', 'Weekly ending cash ≥ Minimum Cash Floor', '≥ Min Cash Floor', 'weekly', 5),
  ('a0000000-0000-0000-0000-000000000002', 'Unallocated Spend reduced 30% YoY', '-30% YoY', 'monthly', 6),
  ('a0000000-0000-0000-0000-000000000002', 'Final Job Margin within 5% of Estimate', 'Within 5%', 'monthly', 7),
  ('a0000000-0000-0000-0000-000000000002', '100% of scope expansions >$500 captured via CO within 72h', '100% within 72h', 'weekly', 8),
  ('a0000000-0000-0000-0000-000000000002', 'Revolver Headroom > 20%', '> 20%', 'weekly', 9);

-- Pillar 3: Sales & Marketing Reliability
INSERT INTO goals_key_results (pillar_id, label, target_value, measurement_cadence, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000003', '100% of Top 10 targets have accurate stage, next steps, ownership', '100%', 'weekly', 1),
  ('a0000000-0000-0000-0000-000000000003', '95% lead dispositioning in CRM within 24 hours', '95% within 24h', 'weekly', 2),
  ('a0000000-0000-0000-0000-000000000003', 'Mitigation conversion > 50%', '> 50%', 'monthly', 3),
  ('a0000000-0000-0000-0000-000000000003', 'Mit → Recon conversion > 30%', '> 30%', 'monthly', 4),
  ('a0000000-0000-0000-0000-000000000003', 'Marketing CPL and ROI tracked by source and service line', 'Tracked by source & line', 'monthly', 5),
  ('a0000000-0000-0000-0000-000000000003', '≥95% of leads have valid source and service line attribution', '≥ 95%', 'weekly', 6);

-- ============================================================
-- 3. FINANCIAL TARGETS
-- ============================================================
CREATE TABLE goals_financial_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  division TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  target_value NUMERIC,
  target_display TEXT NOT NULL,
  actual_value NUMERIC,
  actual_display TEXT,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('on_track', 'at_risk', 'off_track', 'not_started')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(division, metric_name)
);

-- HB targets
INSERT INTO goals_financial_targets (division, metric_name, target_value, target_display, sort_order) VALUES
  ('HB', 'Net Revenue', 8000000, '$8.0M', 1),
  ('HB', 'Gross Margin %', 56, '56%', 2),
  ('HB', 'Contribution Margin', 29, '29%', 3),
  ('HB', 'EBITDA Margin', 13, '13%', 4);

-- IDRT targets
INSERT INTO goals_financial_targets (division, metric_name, target_value, target_display, sort_order) VALUES
  ('IDRT', 'Net Revenue', 15100000, '$15.1M', 1),
  ('IDRT', 'Gross Margin %', 47, '47%', 2),
  ('IDRT', 'Contribution Margin', 34, '34%', 3),
  ('IDRT', 'EBITDA Margin', 24, '24%', 4);

-- Total targets
INSERT INTO goals_financial_targets (division, metric_name, target_value, target_display, sort_order) VALUES
  ('Total', 'Net Revenue', 23100000, '$23.1M', 1),
  ('Total', 'Gross Margin %', 50, '50%', 2),
  ('Total', 'Contribution Margin', 30, '30%', 3),
  ('Total', 'EBITDA Margin', 10, '10%', 4);

-- Company-wide targets (non-divisional)
INSERT INTO goals_financial_targets (division, metric_name, target_value, target_display, sort_order) VALUES
  ('Company', 'Revolver Headroom', 20, '> 20%', 5),
  ('Company', 'Unallocated Spend Reduction', 30, '-30% YoY', 6);

-- ============================================================
-- 4. INITIATIVES
-- ============================================================
CREATE TABLE goals_initiatives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pillar_id UUID REFERENCES goals_pillars(id) ON DELETE CASCADE,
  sub_objective TEXT,
  initiative_name TEXT NOT NULL,
  description TEXT,
  owner TEXT NOT NULL,
  due_date TEXT NOT NULL,
  primary_metric TEXT,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete', 'at_risk', 'overdue')),
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_initiatives_pillar ON goals_initiatives(pillar_id);
CREATE INDEX idx_goals_initiatives_status ON goals_initiatives(status);

-- Cash + Margin Initiatives (page 6)
INSERT INTO goals_initiatives (pillar_id, sub_objective, initiative_name, owner, due_date, primary_metric, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'Cash + Margin', 'Asset & Fleet Liquidation', 'Leonard', 'Feb 15', 'Revolver Headroom', 1),
  ('a0000000-0000-0000-0000-000000000002', 'Cash + Margin', 'Bottoms-Up Zero Budgeting', 'Manny Sasson', 'Feb 15', 'n/a', 2),
  ('a0000000-0000-0000-0000-000000000002', 'Cash + Margin', 'Margin Template', 'Travis + Manny', 'Feb 15', 'Gross Margin', 3),
  ('a0000000-0000-0000-0000-000000000002', 'Cash + Margin', 'Evaluate LL Sub Payment Terms', 'Rijad', 'Mar 15', 'Revolver Headroom', 4),
  ('a0000000-0000-0000-0000-000000000002', 'Cash + Margin', 'Vendor Zero-Base Audit', 'Rijad', 'Mar 15', 'Unallocated spend', 5),
  ('a0000000-0000-0000-0000-000000000002', 'Cash + Margin', 'MFR Incorporating Variance To Budget', 'Rijad', 'Mar 15', 'Unallocated spend', 6),
  ('a0000000-0000-0000-0000-000000000002', 'Cash + Margin', '"April Baseline" Autopsy', 'Josh, Travis, Eduardo', 'Apr 15', 'GM Variance %', 7),
  ('a0000000-0000-0000-0000-000000000002', 'Cash + Margin', 'Re-evaluate Expense Policy', 'Kelly + Rijad', 'Apr 15', 'Unallocated spend $', 8),
  ('a0000000-0000-0000-0000-000000000002', 'Cash + Margin', 'Ramp Control Lockdown', 'Kelly', 'May 15', 'Unallocated spend', 9);

-- LL & HB Operations Initiatives (page 7)
INSERT INTO goals_initiatives (pillar_id, sub_objective, initiative_name, owner, due_date, primary_metric, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'LL & HB Operations', 'Technical Deal Coverage', 'Josh, Travis, Eduardo', 'Quarterly', '25% next step conversion', 10),
  ('a0000000-0000-0000-0000-000000000001', 'LL & HB Operations', 'Proactive MIT-to-Recon Pipeline', 'Austin', 'Q4', '+10 pts recon opportunities', 11),
  ('a0000000-0000-0000-0000-000000000001', 'LL & HB Operations', 'Establish Contents Division', 'Kenny / Leonard', 'Q2', '20% of new jobs on Contents', 12),
  ('a0000000-0000-0000-0000-000000000001', 'LL & HB Operations', 'Grow Roofing Division', 'Austin / Bri', 'Q2', '$100K roofing revenue', 13),
  ('a0000000-0000-0000-0000-000000000001', 'LL & HB Operations', 'Increase non-storm work (bids)', 'Travis', 'Mar 31', '$5M pipeline', 14),
  ('a0000000-0000-0000-0000-000000000001', 'LL & HB Operations', 'Inspect work opportunities', 'Eduardo', 'Mar 31', '$5M pipeline', 15),
  ('a0000000-0000-0000-0000-000000000001', 'LL & HB Operations', 'T&M forecasting system', 'Travis, Eduardo, Manny, Amy', 'LL Fin.', 'Est vs Actual within 10%', 16),
  ('a0000000-0000-0000-0000-000000000001', 'LL & HB Operations', 'PM-Led Revenue Expansion', 'Kenny', 'Q4', '+10% MIT revenue YoY', 17),
  ('a0000000-0000-0000-0000-000000000001', 'LL & HB Operations', 'Accelerate Cash Collection', 'Operations, Tony, Manny', 'Q4', 'Reduce collection time X%', 18);

-- Revenue Growth & Conversion Initiatives (page 8)
INSERT INTO goals_initiatives (pillar_id, sub_objective, initiative_name, owner, due_date, primary_metric, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000003', 'Revenue Growth & Conversion', 'Call Quality & Intake System', 'Amy', 'Q1-Q2', 'Booked Call Rate, After-Hours %', 19),
  ('a0000000-0000-0000-0000-000000000003', 'Revenue Growth & Conversion', 'Build the Conversion Operating System', 'Amy/DW', 'Q1-Q2', 'Estimate→Won %, Cycle Time', 20),
  ('a0000000-0000-0000-0000-000000000003', 'Revenue Growth & Conversion', 'Core Business / Pipeline Health Framework', 'Amy', 'Q1', 'Coverage Ratio, $ at Risk', 21);

-- Home Base Sales & Marketing Initiatives (page 9)
INSERT INTO goals_initiatives (pillar_id, sub_objective, initiative_name, owner, due_date, primary_metric, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000003', 'HB Sales & Marketing', 'Top 10 Account Strategy', 'Bri', 'Q1', 'Opps per Top 10, Active %', 22),
  ('a0000000-0000-0000-0000-000000000003', 'HB Sales & Marketing', 'Sales Dashboard & Scorecard', 'Bri', 'Q1', 'Rep-Level Conversion', 23),
  ('a0000000-0000-0000-0000-000000000003', 'HB Sales & Marketing', 'Sales Activity → Outcome Engine', 'Bri', 'Q1', 'Activities per Top 10, Opps Created', 24),
  ('a0000000-0000-0000-0000-000000000003', 'HB Sales & Marketing', 'GBP Operating System', 'Amy', 'Q1', 'GBP Calls, Review Velocity', 25),
  ('a0000000-0000-0000-0000-000000000003', 'HB Sales & Marketing', 'Marketing ROI & Spend Governance', 'Amy', 'Q2', 'CPL, Lead→Job, Rev/Channel', 26),
  ('a0000000-0000-0000-0000-000000000003', 'HB Sales & Marketing', 'SEM Vendor Strategy Reset (Thryv)', 'Amy', 'Q1', 'CPL, ROAS', 27);
