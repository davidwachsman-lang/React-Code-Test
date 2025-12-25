import { supabase } from './supabaseClient';

const equipmentCatalogService = {
  // Get all active equipment items
  async getAllEquipment() {
    try {
      const { data, error } = await supabase
        .from('equipment_catalog')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('equipment_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching equipment:', error);
      throw error;
    }
  },

  // Get equipment by category
  async getEquipmentByCategory(category) {
    try {
      const { data, error } = await supabase
        .from('equipment_catalog')
        .select('*')
        .eq('is_active', true)
        .eq('category', category)
        .order('equipment_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching equipment by category:', error);
      throw error;
    }
  },

  // Get all unique categories
  async getCategories() {
    try {
      const { data, error } = await supabase
        .from('equipment_catalog')
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

  // Add new equipment item
  async addEquipment(equipmentData) {
    try {
      const { data, error } = await supabase
        .from('equipment_catalog')
        .insert([equipmentData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding equipment:', error);
      throw error;
    }
  },

  // Update equipment item
  async updateEquipment(id, updates) {
    try {
      const { data, error } = await supabase
        .from('equipment_catalog')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating equipment:', error);
      throw error;
    }
  },

  // Soft delete (deactivate) equipment item
  async deactivateEquipment(id) {
    try {
      const { data, error } = await supabase
        .from('equipment_catalog')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deactivating equipment:', error);
      throw error;
    }
  },

  // Bulk import equipment from array
  async bulkImportEquipment(equipmentArray) {
    try {
      const { data, error } = await supabase
        .from('equipment_catalog')
        .insert(equipmentArray)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error bulk importing equipment:', error);
      throw error;
    }
  }
};

export default equipmentCatalogService;
