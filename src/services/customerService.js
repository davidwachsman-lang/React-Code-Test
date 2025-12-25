// Customer Service - Supabase queries for CRM
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'customers';

const customerService = {
  // Get all customers
  async getAll() {
    // Try to include sales_person if column exists
    const response = await supabase
      .from(TABLE)
      .select('id, name, billing_contact, email, phone, billing_address1, billing_address2, billing_city, billing_state, billing_postal, billing_country, notes, date_closed_committed, company_name, contact_name, onsite_address, referral_date, last_activity_date, last_face_to_face_date, sales_person, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    // If query fails (e.g., sales_person column doesn't exist), try without it
    if (response.error && response.error.message && response.error.message.includes('sales_person')) {
      const fallbackResponse = await supabase
        .from(TABLE)
        .select('id, name, billing_contact, email, phone, billing_address1, billing_address2, billing_city, billing_state, billing_postal, billing_country, notes, date_closed_committed, company_name, contact_name, onsite_address, referral_date, last_activity_date, last_face_to_face_date, created_at, updated_at')
        .order('created_at', { ascending: false });
      return handleSupabaseResult(fallbackResponse);
    }
    
    return handleSupabaseResult(response);
  },

  // Get customer by ID
  async getById(id) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return handleSupabaseResult(response);
  },

  // Create new customer
  async create(customerData) {
    const response = await supabase
      .from(TABLE)
      .insert([customerData])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Update customer
  async update(id, customerData) {
    const response = await supabase
      .from(TABLE)
      .update(customerData)
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Delete customer
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  },

  // Search customers
  async search(query) {
    const searchValue = `%${query || ''}%`;
    const response = await supabase
      .from(TABLE)
      .select('*')
      .or(`name.ilike.${searchValue},email.ilike.${searchValue},phone.ilike.${searchValue}`)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get customer with jobs
  async getWithJobs(id) {
    const customerResponse = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    const jobsResponse = await supabase
      .from('jobs')
      .select('*')
      .eq('customer_id', id);

    const customer = handleSupabaseResult(customerResponse);
    const jobs = handleSupabaseResult(jobsResponse) || [];

    if (!customer) {
      return null;
    }

    return { ...customer, jobs };
  },
};

export default customerService;
