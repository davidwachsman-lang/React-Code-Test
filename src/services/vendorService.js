// Vendor Service - Supabase queries for Resource Center vendors
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'vendors';

const vendorService = {
  // Get all vendors
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select('id, name, category, phone, email, notes, created_at, updated_at')
      .order('category')
      .order('name');
    return handleSupabaseResult(response);
  },

  // Get vendor by ID
  async getById(id) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return handleSupabaseResult(response);
  },

  // Create new vendor
  async create(vendorData) {
    const payload = {
      ...vendorData,
      updated_at: new Date().toISOString()
    };
    const response = await supabase
      .from(TABLE)
      .insert([payload])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Update vendor
  async update(id, vendorData) {
    const payload = {
      ...vendorData,
      updated_at: new Date().toISOString()
    };
    const response = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Delete vendor
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  }
};

export default vendorService;
