// Metrics Service - Supabase queries for Daily War Room metrics
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'Metrics';

const metricsService = {
  // Get all metrics
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('createdAt', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get metrics by division
  async getByDivision(division) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('division', division);
    return handleSupabaseResult(response);
  },

  // Update metric status
  async updateStatus(id, isChecked) {
    const response = await supabase
      .from(TABLE)
      .update({ isChecked })
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Get urgent metrics
  async getUrgent() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('priority', 'urgent')
      .eq('isChecked', false);
    return handleSupabaseResult(response);
  },

  // Create new metric
  async create(metricData) {
    const response = await supabase
      .from(TABLE)
      .insert([metricData])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Delete metric
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  },
};

export default metricsService;
