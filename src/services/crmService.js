// CRM Service - Supabase queries for CRM Records
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'crm_records';

const crmService = {
  // Get all CRM records
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select(`
        *,
        parent:crm_records!parent_id(id, company_name)
      `)
      .order('created_at', { ascending: false });
    
    const result = handleSupabaseResult(response);
    
    // Flatten parent company name
    if (result && Array.isArray(result)) {
      return result.map(record => ({
        ...record,
        parent_company_name: record.parent?.company_name || null
      }));
    }
    
    return result;
  },

  // Get all CRM records with customer metrics (from view)
  async getAllWithMetrics() {
    // Views don't support joins, so we'll fetch parent separately if needed
    const response = await supabase
      .from('crm_with_customer_metrics')
      .select('*')
      .order('created_at', { ascending: false });
    
    const result = handleSupabaseResult(response);
    
    // For views, we'll need to fetch parent company names separately
    // This is a simplified approach - in production you might want to use a view that includes parent
    if (result && Array.isArray(result)) {
      const recordsWithParent = await Promise.all(
        result.map(async (record) => {
          if (record.parent_id) {
            try {
              const parentResponse = await supabase
                .from(TABLE)
                .select('company_name')
                .eq('id', record.parent_id)
                .maybeSingle();
              const parent = handleSupabaseResult(parentResponse);
              return {
                ...record,
                parent_company_name: parent?.company_name || null
              };
            } catch (error) {
              return { ...record, parent_company_name: null };
            }
          }
          return { ...record, parent_company_name: null };
        })
      );
      return recordsWithParent;
    }
    
    return result;
  },

  // Get all CRM records with property count (from view)
  async getAllWithPropertyCount() {
    const response = await supabase
      .from('crm_with_property_count')
      .select('*')
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get CRM record by ID
  async getById(id) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return handleSupabaseResult(response);
  },

  // Get CRM record with properties and activities
  async getByIdWithRelations(id) {
    const crmResponse = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    const propertiesResponse = await supabase
      .from('properties')
      .select('*')
      .eq('crm_id', id)
      .order('is_primary_location', { ascending: false })
      .order('created_at', { ascending: false });
    
    const activitiesResponse = await supabase
      .from('crm_activities')
      .select('*')
      .eq('crm_id', id)
      .order('activity_date', { ascending: false })
      .order('created_at', { ascending: false });

    const crmRecord = handleSupabaseResult(crmResponse);
    const properties = handleSupabaseResult(propertiesResponse) || [];
    const activities = handleSupabaseResult(activitiesResponse) || [];

    if (!crmRecord) {
      return null;
    }

    return { ...crmRecord, properties, activities };
  },

  // Create new CRM record
  async create(crmData) {
    const response = await supabase
      .from(TABLE)
      .insert([crmData])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Update CRM record
  async update(id, crmData) {
    const response = await supabase
      .from(TABLE)
      .update(crmData)
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Delete CRM record
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  },

  // Search CRM records
  async search(query) {
    const searchValue = `%${query || ''}%`;
    const response = await supabase
      .from(TABLE)
      .select('*')
      .or(`company_name.ilike.${searchValue},first_name.ilike.${searchValue},last_name.ilike.${searchValue},email.ilike.${searchValue},phone_primary.ilike.${searchValue}`)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get CRM records by relationship_stage
  async getByStage(stage) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('relationship_stage', stage)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get CRM records by sales rep (primary, secondary, or account manager)
  async getBySalesRep(userId) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .or(`primary_sales_rep.eq.${userId},secondary_sales_rep.eq.${userId},account_manager.eq.${userId}`)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get top targets (from view)
  async getTopTargets() {
    const response = await supabase
      .from('crm_top_targets')
      .select('*')
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get active prospects (from view)
  async getActiveProspects() {
    const response = await supabase
      .from('crm_active_prospects')
      .select('*')
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get hot prospects (from view)
  async getHotProspects() {
    const response = await supabase
      .from('crm_hot_prospects')
      .select('*');
    return handleSupabaseResult(response);
  },

  // Get CRM records needing followup (next_followup_date <= today)
  async getNeedingFollowup() {
    const today = new Date().toISOString().split('T')[0];
    const response = await supabase
      .from(TABLE)
      .select('*')
      .lte('next_followup_date', today)
      .not('next_followup_date', 'is', null)
      .order('next_followup_date', { ascending: true });
    return handleSupabaseResult(response);
  },

  // Get at-risk customers (from view)
  async getAtRiskCustomers() {
    const response = await supabase
      .from('crm_at_risk_customers')
      .select('*');
    return handleSupabaseResult(response);
  },

  // Get VIP customers (top by lifetime_revenue)
  async getVIPCustomers(limit = 10) {
    const response = await supabase
      .from('crm_with_customer_metrics')
      .select('*')
      .eq('relationship_stage', 'active_customer')
      .order('lifetime_revenue', { ascending: false })
      .limit(limit);
    return handleSupabaseResult(response);
  },

  // Get child CRM records (by parent_id)
  async getChildren(parentId) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get parent CRM record
  async getParent(childId) {
    const child = await this.getById(childId);
    if (!child || !child.parent_id) {
      return null;
    }
    return this.getById(child.parent_id);
  },

  // Toggle is_top_target flag
  async toggleTopTarget(id) {
    const record = await this.getById(id);
    if (!record) {
      throw new Error('CRM record not found');
    }
    return this.update(id, { is_top_target: !record.is_top_target });
  },

  // Convert prospect to active customer
  async convertToCustomer(id) {
    const today = new Date().toISOString().split('T')[0];
    return this.update(id, {
      relationship_stage: 'active_customer',
      // Note: first_job_date will be calculated from jobs table via view
    });
  },

  // Mark as lost
  async markAsLost(id, reason) {
    const today = new Date().toISOString().split('T')[0];
    return this.update(id, {
      relationship_stage: 'lost',
      lost_reason: reason,
      date_closed: today,
    });
  },

  // Mark as inactive
  async markAsInactive(id) {
    return this.update(id, {
      relationship_stage: 'inactive',
    });
  },

  // Reactivate (inactive → active_customer)
  async reactivate(id) {
    return this.update(id, {
      relationship_stage: 'active_customer',
    });
  },

  // Get ROI data with LTM metrics
  async getROIData() {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const ltmStartDate = twelveMonthsAgo.toISOString().split('T')[0];

    // Get all CRM records
    const crmRecords = await this.getAll();
    
    // Get all jobs from last 12 months
    const jobsResponse = await supabase
      .from('jobs')
      .select('id, crm_id, date_received, estimate_value, referred_by')
      .gte('date_received', ltmStartDate);
    
    const jobs = handleSupabaseResult(jobsResponse) || [];
    
    // Get last activity dates from activities
    // Use created_at since activity_date column doesn't exist
    const activitiesResponse = await supabase
      .from('crm_activities')
      .select('crm_id, created_at, activity_type')
      .order('created_at', { ascending: false });
    
    const activities = handleSupabaseResult(activitiesResponse) || [];
    
    // Calculate metrics for each CRM record
    const roiData = crmRecords.map(record => {
      // Filter jobs for this CRM record in LTM
      const recordJobs = jobs.filter(j => j.crm_id === record.id);
      
      // Calculate referral jobs (jobs where this CRM record is the referrer)
      const referralJobs = recordJobs.filter(j => j.referred_by && j.referred_by.toLowerCase().includes((record.company_name || '').toLowerCase()));
      const referralJobsCount = referralJobs.length;
      
      // Calculate revenue (sum of estimate_value for all jobs in LTM)
      const revenueLTM = recordJobs.reduce((sum, job) => sum + (parseFloat(job.estimate_value) || 0), 0);
      
      // Calculate cost from courting_cost field in CRM record (expenses spent while courting customer)
      const costLTM = parseFloat(record.courting_cost) || 0;
      
      // Calculate ROI: (Revenue - Cost) / Cost * 100
      const roi = costLTM > 0 ? ((revenueLTM - costLTM) / costLTM) * 100 : null;
      
      // Get last activity date (use created_at)
      const recordActivities = activities.filter(a => a.crm_id === record.id);
      const lastActivity = recordActivities.length > 0 ? recordActivities[0] : null;
      const lastActivityDate = lastActivity ? lastActivity.created_at : null;
      
      // Calculate days since last activity
      const daysSinceLastActivity = lastActivityDate 
        ? Math.floor((new Date() - new Date(lastActivityDate)) / (1000 * 60 * 60 * 24))
        : null;
      
      // Get last face-to-face activity (meeting or site_visit)
      const f2fActivities = recordActivities.filter(a => 
        a.activity_type === 'meeting' || a.activity_type === 'site_visit' || a.activity_type === 'lunch'
      );
      const lastF2F = f2fActivities.length > 0 ? f2fActivities[0] : null;
      const lastF2FDate = lastF2F ? lastF2F.created_at : null;
      
      // Calculate days since last F2F
      const daysSinceLastF2F = lastF2FDate 
        ? Math.floor((new Date() - new Date(lastF2FDate)) / (1000 * 60 * 60 * 24))
        : null;
      
      return {
        ...record,
        referral_jobs_ltm: referralJobsCount,
        revenue_ltm: revenueLTM,
        cost_ltm: costLTM,
        roi: roi,
        days_since_last_activity: daysSinceLastActivity,
        days_since_last_f2f: daysSinceLastF2F
      };
    });
    
    return roiData;
  },
};

export default crmService;

