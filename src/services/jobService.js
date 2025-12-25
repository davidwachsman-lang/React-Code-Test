// Job Service - Supabase queries for jobs/WIP Board
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'jobs';

const jobService = {
  // Get all jobs with customer and property info
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select(`
        *,
        customers!inner(name),
        properties!inner(address1, address2, city, state, postal_code)
      `)
      .order('updated_at', { ascending: false });

    // Transform the nested data to flatten customer_name and property_address
    if (response.data) {
      response.data = response.data.map(job => ({
        ...job,
        customer_name: job.customers?.name || 'Unknown',
        property_address: job.properties
          ? [
              job.properties.address1,
              job.properties.address2,
              job.properties.city,
              job.properties.state,
              job.properties.postal_code
            ].filter(Boolean).join(', ')
          : 'Unknown',
      }));
    }

    return handleSupabaseResult(response);
  },

  // Get job by ID
  async getById(id) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return handleSupabaseResult(response);
  },

  // Create new job
  async create(jobData) {
    const response = await supabase
      .from(TABLE)
      .insert([jobData])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Update job
  async update(id, jobData) {
    const response = await supabase
      .from(TABLE)
      .update(jobData)
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Update job status
  async updateStatus(id, status) {
    const response = await supabase
      .from(TABLE)
      .update({ status: status })
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Delete job
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  },

  // Get jobs by customer
  async getByCustomerId(customerId) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get jobs by status
  async getByStatus(status) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },
};

export default jobService;
