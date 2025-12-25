import { supabase } from './supabaseClient';

const laborPricingService = {
  // Get all active labor pricing items
  async getAllLaborPricing() {
    try {
      const { data, error } = await supabase
        .from('labor_pricing')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true, nullsLast: true })
        .order('labor_type', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching labor pricing:', error);
      throw error;
    }
  },

  // Get labor pricing by category
  async getLaborPricingByCategory(category) {
    try {
      const { data, error } = await supabase
        .from('labor_pricing')
        .select('*')
        .eq('is_active', true)
        .eq('category', category)
        .order('labor_type', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching labor pricing by category:', error);
      throw error;
    }
  },

  // Get all unique categories
  async getCategories() {
    try {
      const { data, error } = await supabase
        .from('labor_pricing')
        .select('category')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;

      // Extract unique categories
      const categories = [...new Set(data.map(item => item.category).filter(Boolean))];
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Add new labor pricing item
  async addLaborPricing(laborData) {
    try {
      const { data, error } = await supabase
        .from('labor_pricing')
        .insert([laborData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding labor pricing:', error);
      throw error;
    }
  },

  // Update labor pricing item
  async updateLaborPricing(id, updates) {
    try {
      const { data, error } = await supabase
        .from('labor_pricing')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating labor pricing:', error);
      throw error;
    }
  },

  // Soft delete (deactivate) labor pricing item
  async deactivateLaborPricing(id) {
    try {
      const { data, error } = await supabase
        .from('labor_pricing')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deactivating labor pricing:', error);
      throw error;
    }
  },

  // Bulk import labor pricing from array
  async bulkImportLaborPricing(laborArray) {
    try {
      const { data, error } = await supabase
        .from('labor_pricing')
        .insert(laborArray)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error bulk importing labor pricing:', error);
      throw error;
    }
  }
};

export default laborPricingService;


