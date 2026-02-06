-- Add Sales Person column to customers table in Supabase
-- Run this in your Supabase SQL Editor

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS sales_person TEXT;

COMMENT ON COLUMN customers.sales_person IS 'Sales person assigned to chase this prospect';


