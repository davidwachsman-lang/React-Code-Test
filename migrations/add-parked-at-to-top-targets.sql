-- Add parked_at column to top_targets for Parking Lot feature
ALTER TABLE top_targets ADD COLUMN IF NOT EXISTS parked_at TIMESTAMPTZ DEFAULT NULL;

-- Allow target_position to be NULL for parked targets
ALTER TABLE top_targets ALTER COLUMN target_position DROP NOT NULL;

-- Replace the check constraint to allow NULL
ALTER TABLE top_targets DROP CONSTRAINT IF EXISTS top_targets_target_position_check;
ALTER TABLE top_targets ADD CONSTRAINT top_targets_target_position_check
  CHECK (target_position IS NULL OR (target_position >= 1 AND target_position <= 10));

-- Drop the unique constraint since parked targets have NULL position
ALTER TABLE top_targets DROP CONSTRAINT IF EXISTS top_targets_sales_rep_target_position_key;
-- Re-add as a partial unique index (only for non-parked targets)
CREATE UNIQUE INDEX IF NOT EXISTS top_targets_rep_position_unique
  ON top_targets (sales_rep, target_position)
  WHERE target_position IS NOT NULL;
