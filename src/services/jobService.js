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

  // Get jobs by property_id
  async getByPropertyId(propertyId) {
    const response = await supabase
      .from(TABLE)
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });
    return handleSupabaseResult(response);
  },

  // Set property_id to null for jobs (used when deleting properties)
  async clearPropertyId(propertyId) {
    const response = await supabase
      .from(TABLE)
      .update({ property_id: null })
      .eq('property_id', propertyId);
    return handleSupabaseResult(response);
  },

  // Storm-specific methods

  // Get jobs by storm event ID
  async getByStormEventId(stormEventId) {
    // First, get the storm event details
    let stormEvent = null;
    try {
      const stormEventResponse = await supabase
        .from('storm_events')
        .select('id, event_name, event_date, location')
        .eq('id', stormEventId)
        .maybeSingle();
      
      if (stormEventResponse.data) {
        stormEvent = stormEventResponse.data;
      }
    } catch (error) {
      console.warn('Could not fetch storm event details:', error);
    }

    // Get jobs with customer and property info (without storm_events join to avoid relationship issues)
    const response = await supabase
      .from(TABLE)
      .select(`
        *,
        customers!inner(name, phone, email),
        properties!inner(address1, address2, city, state, postal_code, latitude, longitude)
      `)
      .eq('storm_event_id', stormEventId)
      .order('created_at', { ascending: false });

    // Get crew assignments for all jobs
    const jobIds = response.data?.map(job => job.id) || [];
    let crewAssignmentsMap = {};
    if (jobIds.length > 0) {
      try {
        const crewAssignmentService = (await import('./crewAssignmentService')).default;
        const assignments = await crewAssignmentService.getAll();
        // Create a map of job_id to crew_id (assuming first active assignment is the crew chief)
        assignments.forEach(assignment => {
          if (!crewAssignmentsMap[assignment.job_id] && assignment.status === 'assigned' || assignment.status === 'in_progress') {
            crewAssignmentsMap[assignment.job_id] = assignment.crew_id;
          }
        });
      } catch (error) {
        console.warn('Could not fetch crew assignments:', error);
      }
    }

    // Transform the nested data
    if (response.data) {
      response.data = response.data.map(job => ({
        ...job,
        customer_name: job.customers?.name || 'Unknown',
        customer_phone: job.customers?.phone || '',
        customer_email: job.customers?.email || '',
        property_address: job.properties
          ? [
              job.properties.address1,
              job.properties.address2,
              job.properties.city,
              job.properties.state,
              job.properties.postal_code
            ].filter(Boolean).join(', ')
          : 'Unknown',
        latitude: job.properties?.latitude || null,
        longitude: job.properties?.longitude || null,
        address: job.properties
          ? [
              job.properties.address1,
              job.properties.address2,
              job.properties.city,
              job.properties.state,
              job.properties.postal_code
            ].filter(Boolean).join(', ')
          : 'Unknown',
        storm_event_name: stormEvent?.event_name || 'Unknown',
        storm_event_date: stormEvent?.event_date || null,
        storm_event_location: stormEvent?.location || null,
        crew_chief_id: crewAssignmentsMap[job.id] || null
      }));
    }

    return handleSupabaseResult(response);
  },

  // Get jobs by storm-specific status
  async getByStormStatus(status, stormEventId = null) {
    let query = supabase
      .from(TABLE)
      .select(`
        *,
        customers!inner(name),
        properties!inner(address1, address2, city, state, postal_code)
      `)
      .in('status', Array.isArray(status) ? status : [status])
      .not('storm_event_id', 'is', null);

    if (stormEventId) {
      query = query.eq('storm_event_id', stormEventId);
    }

    const response = await query.order('created_at', { ascending: false });

    // Transform the nested data
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
          : 'Unknown'
      }));
    }

    return handleSupabaseResult(response);
  },

  // Bulk update jobs
  async bulkUpdate(jobIds, updates) {
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      throw new Error('jobIds must be a non-empty array');
    }

    const response = await supabase
      .from(TABLE)
      .update(updates)
      .in('id', jobIds)
      .select();
    return handleSupabaseResult(response);
  },

  // Bulk assign inspector
  async assignInspector(jobIds, inspectorId, inspectionDate = null) {
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      throw new Error('jobIds must be a non-empty array');
    }

    const updates = {
      inspector_id: inspectorId,
      inspection_completed: false
    };

    if (inspectionDate) {
      updates.inspection_date = inspectionDate;
    }

    const response = await supabase
      .from(TABLE)
      .update(updates)
      .in('id', jobIds)
      .select();
    return handleSupabaseResult(response);
  },

  // Bulk assign crew (creates crew assignments)
  async assignCrew(jobIds, crewId) {
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      throw new Error('jobIds must be a non-empty array');
    }

    // Import crewAssignmentService dynamically to avoid circular dependencies
    const crewAssignmentService = (await import('./crewAssignmentService')).default;

    // Create bulk assignments
    const assignments = jobIds.map(jobId => ({
      job_id: jobId,
      crew_id: crewId,
      assigned_date: new Date().toISOString().split('T')[0],
      status: 'assigned'
    }));

    const result = await crewAssignmentService.createBulk(assignments);

    // Update job status to 'in_progress' if it was 'pending_crew'
    const response = await supabase
      .from(TABLE)
      .update({ status: 'in_progress' })
      .in('id', jobIds)
      .eq('status', 'pending_crew')
      .select();

    return {
      assignments: result,
      jobsUpdated: response.data || []
    };
  },

  // Generate property reference for a storm event job
  async generatePropertyReference(stormEventId) {
    // Get the count of existing jobs for this storm event
    const { count } = await supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('storm_event_id', stormEventId)
      .not('property_reference', 'is', null);

    // Format: SE-{event_id_short}-{sequential_number}
    // Or simpler: SE-{sequential_number} with event prefix
    const sequentialNumber = ((count || 0) + 1).toString().padStart(3, '0');
    const eventIdShort = stormEventId?.substring(0, 8) || 'UNKNOWN';
    return `SE-${eventIdShort}-${sequentialNumber}`;
  }
};

export default jobService;
