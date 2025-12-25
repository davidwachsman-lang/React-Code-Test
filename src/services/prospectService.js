// Prospect Service - Supabase queries for CRM Prospects
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'prospects';

const prospectService = {
  // Get all prospects with property count
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get all prospects with property count (using view)
  async getAllWithPropertyCount() {
    const response = await supabase
      .from('prospects_with_property_count')
      .select('*')
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get prospect by ID
  async getById(id) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return handleSupabaseResult(response);
  },

  // Get prospect with properties and activities
  async getByIdWithRelations(id) {
    const prospectResponse = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    const propertiesResponse = await supabase
      .from('properties')
      .select('*')
      .eq('prospect_id', id)
      .order('is_primary_location', { ascending: false })
      .order('created_at', { ascending: false });
    
    const activitiesResponse = await supabase
      .from('prospect_activities')
      .select('*')
      .eq('prospect_id', id)
      .order('activity_date', { ascending: false })
      .order('created_at', { ascending: false });

    const prospect = handleSupabaseResult(prospectResponse);
    const properties = handleSupabaseResult(propertiesResponse) || [];
    const activities = handleSupabaseResult(activitiesResponse) || [];

    if (!prospect) {
      return null;
    }

    return { ...prospect, properties, activities };
  },

  // Create new prospect
  async create(prospectData) {
    const response = await supabase
      .from(TABLE)
      .insert([prospectData])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Update prospect
  async update(id, prospectData) {
    const response = await supabase
      .from(TABLE)
      .update(prospectData)
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Delete prospect
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  },

  // Search prospects
  async search(query) {
    const searchValue = `%${query || ''}%`;
    const response = await supabase
      .from(TABLE)
      .select('*')
      .or(`company_name.ilike.${searchValue},first_name.ilike.${searchValue},last_name.ilike.${searchValue},email.ilike.${searchValue},phone_primary.ilike.${searchValue}`)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get prospects by status
  async getByStatus(status) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get prospects by sales rep (primary, secondary, or account manager)
  async getBySalesRep(userId) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .or(`primary_sales_rep.eq.${userId},secondary_sales_rep.eq.${userId},account_manager.eq.${userId}`)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get top 10 targets
  async getTopTargets() {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('is_top_10_target', true)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get prospects needing followup (next_followup_date <= today)
  async getNeedingFollowup() {
    const today = new Date().toISOString().split('T')[0];
    const response = await supabase
      .from(TABLE)
      .select('*')
      .lte('next_followup_date', today)
      .not('next_followup_date', 'is', null)
      .order('next_followup_date', { ascending: true });
    return handleSupabaseResult(response);
  },

  // Get child prospects (by parent_prospect_id)
  async getChildren(parentId) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('parent_prospect_id', parentId)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get parent prospect
  async getParent(childId) {
    const child = await this.getById(childId);
    if (!child || !child.parent_prospect_id) {
      return null;
    }
    return this.getById(child.parent_prospect_id);
  },
};

export default prospectService;

