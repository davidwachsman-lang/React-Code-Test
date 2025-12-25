// Estimate Service - Supabase queries for estimates
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'Estimates';

const estimateService = {
  // Get all estimates
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('CreatedAt', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get estimate by ID
  async getById(id) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('EstimateID', id)
      .maybeSingle();
    return handleSupabaseResult(response);
  },

  // Create new estimate
  async create(estimateData) {
    const response = await supabase
      .from(TABLE)
      .insert([estimateData])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Update estimate
  async update(id, estimateData) {
    const response = await supabase
      .from(TABLE)
      .update(estimateData)
      .eq('EstimateID', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Delete estimate
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('EstimateID', id);
    return handleSupabaseResult(response);
  },

  // Search estimates
  async search(query) {
    const searchValue = `%${query || ''}%`;
    const response = await supabase
      .from(TABLE)
      .select('*')
      .or(
        `EstimateName.ilike.${searchValue},EstimateDescription.ilike.${searchValue},PropertyAddress.ilike.${searchValue}`
      )
      .order('CreatedAt', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get estimates by customer
  async getByCustomer(customerId) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('CustomerID', customerId)
      .order('CreatedAt', { ascending: false });
    return handleSupabaseResult(response);
  },
};

export default estimateService;
