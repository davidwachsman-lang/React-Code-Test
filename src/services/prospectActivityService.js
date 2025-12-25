// Prospect Activity Service - Supabase queries for Prospect Activities
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'prospect_activities';

const prospectActivityService = {
  // Get all activities
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('activity_date', { ascending: false })
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

  // Get activities by prospect ID
  async getByProspectId(prospectId) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('prospect_id', prospectId)
      .order('activity_date', { ascending: false })
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get recent activities across all prospects
  async getRecentActivities(limit = 50) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('activity_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    return handleSupabaseResult(response);
  },

  // Get activities by date range
  async getByDateRange(startDate, endDate) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .gte('activity_date', startDate)
      .lte('activity_date', endDate)
      .order('activity_date', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get activities needing followup (next_action_date <= today)
  async getNeedingFollowup() {
    const today = new Date().toISOString().split('T')[0];
    const response = await supabase
      .from(TABLE)
      .select('*')
      .lte('next_action_date', today)
      .not('next_action_date', 'is', null)
      .order('next_action_date', { ascending: true });
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
};

export default prospectActivityService;

