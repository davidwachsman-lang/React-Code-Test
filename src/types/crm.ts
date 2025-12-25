// TypeScript type definitions for CRM system

export type ProspectType = 'commercial' | 'agent' | 'adjuster';
export type RelationshipStage = 'prospect' | 'active_customer' | 'inactive' | 'lost';
export type Industry = 'multi_family' | 'retail' | 'office' | 'hotel' | 'restaurant' | 'healthcare' | 'school' | 'warehouse' | 'other';
export type LeadSource = 'google' | 'facebook' | 'referral' | 'insurance' | 'direct' | 'cold_call';
export type DamageType = 'water' | 'fire' | 'mold' | 'storm' | 'reconstruction';
export type PropertyType = 'apartment' | 'office' | 'retail' | 'warehouse' | 'hotel' | 'other';
export type ActivityType = 'call' | 'email' | 'meeting' | 'site_visit' | 'proposal_sent' | 'lunch';
export type Priority = 'hot' | 'warm' | 'cold';

export interface CRMRecord {
  id: string;
  prospect_type: ProspectType;
  parent_id: string | null;
  
  // Basic Info
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  email: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  
  // Address
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  
  // Commercial Specific
  industry: Industry | null;
  association_membership: string | null;
  
  // Sales Team
  primary_sales_rep: string | null;
  secondary_sales_rep: string | null;
  account_manager: string | null;
  
  // Relationship Lifecycle
  relationship_stage: RelationshipStage;
  is_top_target: boolean;
  priority: Priority | null;
  lead_source: LeadSource | null;
  
  // Opportunity Details
  damage_type: DamageType | null;
  estimated_job_value: number | null;
  probability_to_close: number | null;
  courting_cost: number | null;
  
  // Customer Tracking (calculated from jobs table via views)
  first_job_date: string | null;
  last_job_date: string | null;
  total_jobs: number | null;
  lifetime_revenue: number | null;
  
  // Dates
  initial_contact_date: string | null;
  insight_meeting_date: string | null;
  next_followup_date: string | null;
  date_closed: string | null;
  first_referral_date: string | null;
  lost_reason: string | null;
  
  // Conversion (legacy)
  converted_to_customer_id: string | null;
  
  // Notes
  notes: string | null;
  
  // Tracking
  created_at: string;
  updated_at: string;
  created_by: string | null;
  
  // Legacy status field (kept for backward compatibility, will be removed)
  status?: string;
}

export interface CRMProperty {
  id: string;
  crm_id: string;
  property_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  property_type: PropertyType | null;
  units_count: number | null;
  square_footage: number | null;
  year_built: number | null;
  is_primary_location: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMActivity {
  id: string;
  crm_id: string;
  activity_type: ActivityType;
  activity_date: string;
  outcome: string | null;
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  created_by: string | null;
  created_at: string;
}

// Extended CRMRecord with calculated metrics (from crm_with_customer_metrics view)
export interface CRMRecordWithMetrics extends CRMRecord {
  lifetime_revenue: number;
  total_jobs: number;
  first_job_date: string | null;
  last_job_date: string | null;
}

// CRMRecord with property count (from crm_with_property_count view)
export interface CRMRecordWithPropertyCount extends CRMRecord {
  properties_count: number;
}

