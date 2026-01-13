// Top Targets Service - Supabase queries for Top Targets
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'top_targets';

const topTargetsService = {
  // Get all top targets
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('sales_rep', { ascending: true })
      .order('target_position', { ascending: true });
    
    return handleSupabaseResult(response);
  },

  // Get targets for a specific sales rep
  async getBySalesRep(salesRep) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('sales_rep', salesRep)
      .order('target_position', { ascending: true });
    
    return handleSupabaseResult(response);
  },

  // Upsert (insert or update) a target
  async upsert(targetData) {
    const { sales_rep, target_position, company_name, status, notes } = targetData;
    
    // First, try to find existing record
    const existingResponse = await supabase
      .from(TABLE)
      .select('id')
      .eq('sales_rep', sales_rep)
      .eq('target_position', target_position)
      .maybeSingle();

    const dataToInsert = {
      sales_rep,
      target_position,
      company_name: company_name || null,
      status: status || null,
      notes: notes || null
    };

    if (existingResponse.data) {
      // Update existing record
      const response = await supabase
        .from(TABLE)
        .update(dataToInsert)
        .eq('id', existingResponse.data.id)
        .select()
        .single();
      
      return handleSupabaseResult(response);
    } else {
      // Insert new record
      const response = await supabase
        .from(TABLE)
        .insert(dataToInsert)
        .select()
        .single();
      
      return handleSupabaseResult(response);
    }
  },

  // Delete a target
  async delete(salesRep, targetPosition) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('sales_rep', salesRep)
      .eq('target_position', targetPosition);
    
    return handleSupabaseResult(response);
  },

  // Delete all targets for a sales rep
  async deleteBySalesRep(salesRep) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('sales_rep', salesRep);
    
    return handleSupabaseResult(response);
  }
};

export default topTargetsService;
