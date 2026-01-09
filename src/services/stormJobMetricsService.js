// Storm Job Metrics Service - KPI calculations for Storm Jobs management
import { supabase, handleSupabaseResult } from './supabaseClient';

const stormJobMetricsService = {
  // Get count of active storm events
  async getActiveEventsCount(stormEventId = null) {
    let query = supabase
      .from('storm_events')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    if (stormEventId) {
      query = query.eq('id', stormEventId);
    }

    const response = await query;
    return handleSupabaseResult(response);
  },

  // Get total properties affected (count of jobs linked to storm events)
  async getTotalPropertiesAffected(stormEventId = null) {
    let query = supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .not('storm_event_id', 'is', null);

    if (stormEventId) {
      query = query.eq('storm_event_id', stormEventId);
    }

    const response = await query;
    return handleSupabaseResult(response);
  },

  // Get pending inspections count (jobs with inspection_completed = false or null)
  async getPendingInspections(stormEventId = null) {
    let query = supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .not('storm_event_id', 'is', null)
      .or('inspection_completed.is.null,inspection_completed.eq.false');

    if (stormEventId) {
      query = query.eq('storm_event_id', stormEventId);
    }

    const response = await query;
    return handleSupabaseResult(response);
  },

  // Get crews deployed count (unique crew_ids from crew_assignments)
  async getCrewsDeployed(stormEventId = null) {
    let query = supabase
      .from('crew_assignments')
      .select('crew_id');

    if (stormEventId) {
      // Join with jobs to filter by storm_event_id
      query = supabase
        .from('crew_assignments')
        .select(`
          crew_id,
          jobs!inner(storm_event_id)
        `)
        .eq('jobs.storm_event_id', stormEventId);
    }

    const response = await query;
    if (response.error) {
      throw new Error(response.error.message || 'Failed to get crews deployed');
    }

    // Get unique crew_ids
    const crewIds = new Set();
    if (response.data) {
      response.data.forEach(assignment => {
        if (assignment.crew_id) {
          crewIds.add(assignment.crew_id);
        }
      });
    }

    return crewIds.size;
  },

  // Get storm revenue pipeline (sum of estimate_value for storm jobs)
  async getRevenuePipeline(stormEventId = null) {
    let query = supabase
      .from('jobs')
      .select('estimate_value')
      .not('storm_event_id', 'is', null)
      .not('estimate_value', 'is', null);

    if (stormEventId) {
      query = query.eq('storm_event_id', stormEventId);
    }

    const response = await query;
    if (response.error) {
      throw new Error(response.error.message || 'Failed to get revenue pipeline');
    }

    // Sum up estimate_value
    const total = (response.data || []).reduce((sum, job) => {
      return sum + (parseFloat(job.estimate_value) || 0);
    }, 0);

    return total;
  },

  // Get average response time (time from lead creation to crew assignment)
  async getAverageResponseTime(stormEventId = null) {
    // This requires calculating the time difference between:
    // - Job creation date (created_at or date_opened)
    // - Crew assignment date (from crew_assignments.assigned_date)
    
    let query = supabase
      .from('jobs')
      .select(`
        id,
        created_at,
        date_opened,
        crew_assignments!inner(assigned_date)
      `)
      .not('storm_event_id', 'is', null);

    if (stormEventId) {
      query = query.eq('storm_event_id', stormEventId);
    }

    const response = await query;
    if (response.error) {
      throw new Error(response.error.message || 'Failed to get average response time');
    }

    if (!response.data || response.data.length === 0) {
      return 0;
    }

    // Calculate average response time in hours
    const times = response.data
      .filter(job => {
        const assignment = job.crew_assignments?.[0];
        if (!assignment || !assignment.assigned_date) return false;
        const jobDate = job.date_opened || job.created_at;
        if (!jobDate) return false;
        return true;
      })
      .map(job => {
        const assignment = job.crew_assignments[0];
        const jobDate = new Date(job.date_opened || job.created_at);
        const assignedDate = new Date(assignment.assigned_date);
        return (assignedDate - jobDate) / (1000 * 60 * 60); // Convert to hours
      });

    if (times.length === 0) {
      return 0;
    }

    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    return Math.round(average * 10) / 10; // Round to 1 decimal place
  },

  // Get leads count (jobs with status 'lead')
  async getLeadsCount(stormEventId = null) {
    let query = supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .not('storm_event_id', 'is', null)
      .eq('status', 'lead');

    if (stormEventId) {
      query = query.eq('storm_event_id', stormEventId);
    }

    const response = await query;
    return handleSupabaseResult(response);
  },

  // Get active jobs count (jobs with status 'in_progress' or 'wip')
  async getActiveJobsCount(stormEventId = null) {
    let query = supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .not('storm_event_id', 'is', null)
      .in('status', ['in_progress', 'wip']);

    if (stormEventId) {
      query = query.eq('storm_event_id', stormEventId);
    }

    const response = await query;
    return handleSupabaseResult(response);
  },

  // Get unassigned jobs count (jobs without crew assignments)
  async getUnassignedJobsCount(stormEventId = null) {
    // First, get all jobs for the storm event
    let jobsQuery = supabase
      .from('jobs')
      .select('id')
      .not('storm_event_id', 'is', null);

    if (stormEventId) {
      jobsQuery = jobsQuery.eq('storm_event_id', stormEventId);
    }

    const jobsResponse = await jobsQuery;
    if (jobsResponse.error) {
      throw new Error(jobsResponse.error.message || 'Failed to get unassigned jobs');
    }

    const jobIds = (jobsResponse.data || []).map(job => job.id);
    if (jobIds.length === 0) {
      return { count: 0 };
    }

    // Get all crew assignments for these jobs
    const assignmentsResponse = await supabase
      .from('crew_assignments')
      .select('job_id')
      .in('job_id', jobIds)
      .in('status', ['assigned', 'in_progress']);

    if (assignmentsResponse.error) {
      throw new Error(assignmentsResponse.error.message || 'Failed to get crew assignments');
    }

    const assignedJobIds = new Set((assignmentsResponse.data || []).map(a => a.job_id));
    const unassignedCount = jobIds.filter(jobId => !assignedJobIds.has(jobId)).length;

    return { count: unassignedCount };
  },

  // Get equipment on field count (placeholder - can be extended with equipment tracking)
  async getEquipmentOnField(stormEventId = null) {
    // For now, return number of active crew assignments as proxy for equipment
    // This can be enhanced with actual equipment tracking table later
    let query = supabase
      .from('crew_assignments')
      .select('id', { count: 'exact', head: true })
      .in('status', ['assigned', 'in_progress']);

    if (stormEventId) {
      // Join with jobs to filter by storm_event_id
      const jobsResponse = await supabase
        .from('jobs')
        .select('id')
        .eq('storm_event_id', stormEventId);
      
      if (jobsResponse.error || !jobsResponse.data || jobsResponse.data.length === 0) {
        return { count: 0 };
      }

      const jobIds = jobsResponse.data.map(job => job.id);
      query = supabase
        .from('crew_assignments')
        .select('id', { count: 'exact', head: true })
        .in('job_id', jobIds)
        .in('status', ['assigned', 'in_progress']);
    }

    const response = await query;
    return handleSupabaseResult(response);
  },

  // Get all KPIs at once (optimized for dashboard)
  async getAllKPIs(stormEventId = null) {
    try {
      const [leads, activeJobs, unassignedJobs, teamsDeployed, equipmentOnField, estRevenue] = await Promise.all([
        this.getLeadsCount(stormEventId),
        this.getActiveJobsCount(stormEventId),
        this.getUnassignedJobsCount(stormEventId),
        this.getCrewsDeployed(stormEventId),
        this.getEquipmentOnField(stormEventId),
        this.getRevenuePipeline(stormEventId)
      ]);

      return {
        leads: leads?.count || 0,
        activeJobs: activeJobs?.count || 0,
        unassignedJobs: unassignedJobs?.count || 0,
        teamsDeployed: typeof teamsDeployed === 'number' ? teamsDeployed : 0,
        equipmentOnField: equipmentOnField?.count || 0,
        estRevenue: estRevenue || 0
      };
    } catch (error) {
      console.error('Error getting all KPIs:', error);
      throw error;
    }
  }
};

export default stormJobMetricsService;
