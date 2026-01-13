// CRM Activity Service - Supabase queries for CRM Activities
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'crm_activities';

const crmActivityService = {
  // Get all activities
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get activity by ID
  async getById(id) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return handleSupabaseResult(response);
  },

  // Create new activity
  async create(activityData) {
    const response = await supabase
      .from(TABLE)
      .insert([activityData])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Update activity
  async update(id, activityData) {
    const response = await supabase
      .from(TABLE)
      .update(activityData)
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Delete activity
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  },

  // Get activities by CRM record ID
  async getByCRMId(crmId) {
    console.log('Fetching activities for crm_id:', crmId);
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('crm_id', crmId)
      .order('created_at', { ascending: false });
    console.log('Activities response:', response);
    return handleSupabaseResult(response);
  },

  // Get recent activities across all CRM records
  async getRecentActivities(limit = 10) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return handleSupabaseResult(response);
  },
};

export default crmActivityService;

