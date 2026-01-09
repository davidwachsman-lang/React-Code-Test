// Crew Assignment Service - CRUD operations for crew assignments
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'crew_assignments';

const crewAssignmentService = {
  // Get all crew assignments
  async getAll() {
    const response = await supabase
      .from(TABLE)
      .select(`
        *,
        jobs!inner(id, storm_event_id, customer_id, property_id),
        jobs!inner(customers!inner(name)),
        jobs!inner(properties!inner(address1, city, state, postal_code))
      `)
      .order('assigned_date', { ascending: false })
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get crew assignment by ID
  async getById(id) {
    const response = await supabase
      .from(TABLE)
      .select(`
        *,
        jobs(*),
        jobs(customers(name)),
        jobs(properties(address1, city, state, postal_code))
      `)
      .eq('id', id)
      .maybeSingle();
    return handleSupabaseResult(response);
  },

  // Get assignments by job ID
  async getByJobId(jobId) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('job_id', jobId)
      .order('assigned_date', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get assignments by crew ID
  async getByCrewId(crewId) {
    const response = await supabase
      .from(TABLE)
      .select(`
        *,
        jobs(*),
        jobs(customers(name)),
        jobs(properties(address1, city, state, postal_code))
      `)
      .eq('crew_id', crewId)
      .order('assigned_date', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Get active assignments (status = 'assigned' or 'in_progress')
  async getActive(crewId = null) {
    let query = supabase
      .from(TABLE)
      .select('*')
      .in('status', ['assigned', 'in_progress']);

    if (crewId) {
      query = query.eq('crew_id', crewId);
    }

    const response = await query;
    return handleSupabaseResult(response);
  },

  // Create new crew assignment
  async create(assignmentData) {
    const data = {
      job_id: assignmentData.job_id,
      crew_id: assignmentData.crew_id,
      assigned_date: assignmentData.assigned_date || new Date().toISOString().split('T')[0],
      status: assignmentData.status || 'assigned'
    };

    const response = await supabase
      .from(TABLE)
      .insert([data])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Create multiple assignments (bulk)
  async createBulk(assignments) {
    const data = assignments.map(assignment => ({
      job_id: assignment.job_id,
      crew_id: assignment.crew_id,
      assigned_date: assignment.assigned_date || new Date().toISOString().split('T')[0],
      status: assignment.status || 'assigned'
    }));

    const response = await supabase
      .from(TABLE)
      .insert(data)
      .select();
    return handleSupabaseResult(response);
  },

  // Update crew assignment
  async update(id, assignmentData) {
    const data = {};
    if (assignmentData.status !== undefined) data.status = assignmentData.status;
    if (assignmentData.assigned_date !== undefined) data.assigned_date = assignmentData.assigned_date;

    const response = await supabase
      .from(TABLE)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  // Delete crew assignment
  async delete(id) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    return handleSupabaseResult(response);
  },

  // Remove crew assignment by job_id and crew_id
  async remove(jobId, crewId) {
    const response = await supabase
      .from(TABLE)
      .delete()
      .eq('job_id', jobId)
      .eq('crew_id', crewId);
    return handleSupabaseResult(response);
  }
};

export default crewAssignmentService;
