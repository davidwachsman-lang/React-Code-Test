// Feature Upgrades Service - Supabase queries for Feature Upgrades
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'feature_upgrades';

const featureUpgradesService = {
  // Get all feature upgrades
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    
    return handleSupabaseResult(response);
  },

  // Get feature upgrades by sales rep
  async getBySalesRep(salesRep) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('sales_rep', salesRep)
      .order('created_at', { ascending: false });
    
    return handleSupabaseResult(response);
  },

  // Create a new feature upgrade
  async create(upgradeData) {
    const { sales_rep, suggested_upgrade, status } = upgradeData;
    
    const response = await supabase
      .from(TABLE)
      .insert({
        sales_rep,
        suggested_upgrade,
        status: status || 'pending'
      })
      .select()
      .single();
    
    return handleSupabaseResult(response);
  },

  // Update a feature upgrade
  async update(id, updateData) {
    const response = await supabase
      .from(TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    return handleSupabaseResult(response);
  },

  // Delete a feature upgrade
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    
    return handleSupabaseResult(response);
  }
};

export default featureUpgradesService;
