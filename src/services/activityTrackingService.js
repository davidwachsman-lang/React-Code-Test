// Activity Tracking Service - Supabase queries for sales rep activity tracking
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'activity_tracking';

const activityTrackingService = {
  // Get activity data for a specific week
  async getByWeek(weekStartDate) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('week_start_date', weekStartDate)
      .order('sales_rep');
    return handleSupabaseResult(response);
  },

  // Get activity data for a sales rep
  async getBySalesRep(salesRep) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('sales_rep', salesRep.toLowerCase())
      .order('week_start_date', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get activity data for a date range
  async getByDateRange(startDate, endDate) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .gte('week_start_date', startDate)
      .lte('week_start_date', endDate)
      .order('week_start_date', { ascending: true })
      .order('sales_rep');
    return handleSupabaseResult(response);
  },

  // Get all activity data
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('week_start_date', { ascending: false })
      .order('sales_rep');
    return handleSupabaseResult(response);
  },

  // Upsert activity data (insert or update if exists)
  async upsert(activityData) {
    const data = {
      week_start_date: activityData.week_start_date,
      sales_rep: activityData.sales_rep.toLowerCase(),
      cold_calls: activityData.cold_calls || 0,
      insight_meetings: activityData.insight_meetings || 0,
      initial_commitments: activityData.initial_commitments || 0,
      referral_jobs: activityData.referral_jobs || 0
    };

    const response = await supabase
      .from(TABLE)
      .upsert(data, {
        onConflict: 'week_start_date,sales_rep',
        ignoreDuplicates: false
      })
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Update activity data
  async update(id, activityData) {
    const data = {
      cold_calls: activityData.cold_calls || 0,
      insight_meetings: activityData.insight_meetings || 0,
      initial_commitments: activityData.initial_commitments || 0,
      referral_jobs: activityData.referral_jobs || 0
    };

    const response = await supabase
      .from(TABLE)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Delete activity data
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  }
};

export default activityTrackingService;



