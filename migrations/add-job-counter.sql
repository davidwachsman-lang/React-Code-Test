-- Add job counter table to track sequential numbers per division per year
-- Run this in your Supabase SQL Editor

-- Create job_counters table
CREATE TABLE IF NOT EXISTS job_counters (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  division TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year, division)
);

-- Create function to get next job number
CREATE OR REPLACE FUNCTION get_next_job_number(div TEXT)
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER;
  year_short TEXT;
  next_counter INTEGER;
  job_number TEXT;
  division_code TEXT;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM NOW());
  year_short := RIGHT(current_year::TEXT, 2);

  -- Map division to code
  division_code := CASE div
    WHEN 'HB - Nashville' THEN 'HBN'
    WHEN 'MIT' THEN 'MIT'
    WHEN 'RECON' THEN 'REC'
    WHEN 'Large Loss' THEN 'LL'
    WHEN 'Referral' THEN 'REF'
    ELSE 'GEN'
  END;

  -- Insert or update counter for this year/division
  INSERT INTO job_counters (year, division, counter)
  VALUES (current_year, div, 1)
  ON CONFLICT (year, division)
  DO UPDATE SET
    counter = job_counters.counter + 1,
    updated_at = NOW()
  RETURNING counter INTO next_counter;

  -- Format job number: YY-DIVISION-####
  job_number := year_short || '-' || division_code || '-' || LPAD(next_counter::TEXT, 4, '0');

  RETURN job_number;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION get_next_job_number(TEXT) IS 'Generates sequential job numbers in format YY-DIVISION-#### (e.g., 25-MIT-0001)';
COMMENT ON TABLE job_counters IS 'Tracks sequential job counters per division per year';
