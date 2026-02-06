-- Create insight_meeting_playbooks table for storing Insight Meeting Playbook data
-- Run this in Supabase SQL Editor

-- Create the table
CREATE TABLE IF NOT EXISTS insight_meeting_playbooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Contact Section
    contact_name TEXT,
    contact_title TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_company TEXT,
    insurance_provider TEXT,
    agent_name TEXT,
    agent_email TEXT,
    agent_phone TEXT,
    
    -- Property Section
    property_address TEXT,
    property_type TEXT,
    property_size TEXT,
    property_age TEXT,
    number_of_buildings TEXT,
    number_of_units TEXT,
    current_challenges TEXT,
    
    -- Process Section
    current_process TEXT,
    process_challenges TEXT,
    
    -- Current Providers Section
    current_providers TEXT,
    provider_satisfaction TEXT,
    provider_improvements TEXT,
    
    -- Maintenance / Management Section
    number_of_maintenance_engineers TEXT,
    last_training TEXT,
    equipment TEXT,
    
    -- Loss History Section
    recent_losses TEXT,
    last_event TEXT,
    event_type_24_months TEXT[], -- Array of event types
    outsourcing_scale TEXT,
    protocol_for_callout TEXT,
    events_annually TEXT,
    
    -- Organization Structure Section
    portfolio_managers TEXT,
    regional_managers TEXT,
    property_managers TEXT,
    maintenance_supervisors TEXT,
    director_engineering_maintenance TEXT,
    
    -- Commitment Section
    projected_job_date DATE,
    interaction_plan_strategy TEXT,
    
    -- Metadata
    sales_rep TEXT,
    crm_id UUID REFERENCES crm_records(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_insight_meeting_playbooks_crm_id ON insight_meeting_playbooks(crm_id);
CREATE INDEX IF NOT EXISTS idx_insight_meeting_playbooks_sales_rep ON insight_meeting_playbooks(sales_rep);
CREATE INDEX IF NOT EXISTS idx_insight_meeting_playbooks_contact_company ON insight_meeting_playbooks(contact_company);
CREATE INDEX IF NOT EXISTS idx_insight_meeting_playbooks_created_at ON insight_meeting_playbooks(created_at);

-- Enable Row Level Security
ALTER TABLE insight_meeting_playbooks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations for authenticated users" ON insight_meeting_playbooks
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_insight_meeting_playbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_insight_meeting_playbooks_updated_at
    BEFORE UPDATE ON insight_meeting_playbooks
    FOR EACH ROW
    EXECUTE FUNCTION update_insight_meeting_playbooks_updated_at();

-- Grant permissions (for Supabase)
GRANT ALL ON insight_meeting_playbooks TO authenticated;
GRANT ALL ON insight_meeting_playbooks TO service_role;
