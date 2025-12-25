// Property Service - Supabase queries for Properties
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'properties';

const propertyService = {
  // Get all properties
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get property by ID
  async getById(id) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return handleSupabaseResult(response);
  },

  // Get properties by customer ID (backward compatibility)
  async getByCustomerId(customerId) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get properties by prospect ID (backward compatibility)
  async getByProspectId(prospectId) {
    return this.getByCRMId(prospectId);
  },

  // Get properties by CRM ID
  async getByCRMId(crmId) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('crm_id', crmId)
      .order('is_primary_location', { ascending: false })
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Create new property
  async create(propertyData) {
    const response = await supabase
      .from(TABLE)
      .insert([propertyData])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Update property
  async update(id, propertyData) {
    const response = await supabase
      .from(TABLE)
      .update(propertyData)
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Delete property
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  },
};

export default propertyService;
