-- Add key_influencer column to crm_records
-- Stores which contact is the key influencer (e.g. "leadExec", "pm-0", "pm-1", "apPerson")
ALTER TABLE crm_records ADD COLUMN IF NOT EXISTS key_influencer TEXT DEFAULT NULL;
