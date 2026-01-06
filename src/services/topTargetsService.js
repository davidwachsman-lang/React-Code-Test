// Top Targets Service - Supabase queries for sales rep top 10 targets
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'top_targets';

const topTargetsService = {
  // Get all targets for a specific sales rep
  async getBySalesRep(salesRep) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('sales_rep', salesRep)
      .order('target_position', { ascending: true });
    return handleSupabaseResult(response);
  },

  // Get all targets for all sales reps
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('sales_rep')
      .order('target_position', { ascending: true });
    return handleSupabaseResult(response);
  },

  // Upsert target data (insert or update if exists)
  async upsert(targetData) {
    const data = {
      sales_rep: targetData.sales_rep,
      target_position: targetData.target_position,
      company_name: targetData.company_name || null,
      status: targetData.status || null
    };

    const response = await supabase
      .from(TABLE)
      .upsert(data, {
        onConflict: 'sales_rep,target_position',
        ignoreDuplicates: false
      })
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Update target data
  async update(id, targetData) {
    const data = {
      company_name: targetData.company_name || null,
      status: targetData.status || null
    };

    const response = await supabase
      .from(TABLE)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Delete target
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  }
};

export default topTargetsService;

