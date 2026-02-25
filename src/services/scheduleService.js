import { supabase } from './supabaseClient';

const scheduleService = {
  /**
   * Get all scheduled jobs for a technician
   * @param {string} technicianName - Name of the technician
   * @returns {Array} Array of scheduled jobs
   */
  async getScheduleForTechnician(technicianName) {
    try {
      const { data, error } = await supabase
        .from('job_schedules')
        .select(`
          *,
          jobs!inner(
            job_number,
            status,
            customers!inner(name),
            properties!inner(address1, address2, city, state, postal_code)
          )
        `)
        .eq('technician_name', technicianName)
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      // Transform the data to flatten nested structures
      return (data || []).map(schedule => ({
        ...schedule,
        job_number: schedule.jobs?.job_number,
        job_status: schedule.jobs?.status,
        customer_name: schedule.jobs?.customers?.name,
        property_address: schedule.jobs?.properties
          ? [
              schedule.jobs.properties.address1,
              schedule.jobs.properties.address2,
              schedule.jobs.properties.city,
              schedule.jobs.properties.state,
              schedule.jobs.properties.postal_code
            ].filter(Boolean).join(', ')
          : 'Address not available'
      }));
    } catch (error) {
      console.error('Error fetching schedule:', error);
      throw error;
    }
  },

  /**
   * Get today's schedule for a technician
   * @param {string} technicianName - Name of the technician
   * @returns {Array} Array of today's scheduled jobs
   */
  async getTodaySchedule(technicianName) {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('job_schedules')
        .select(`
          *,
          jobs!inner(
            job_number,
            status,
            customers!inner(name),
            properties!inner(address1, address2, city, state, postal_code)
          )
        `)
        .eq('technician_name', technicianName)
        .eq('scheduled_date', today)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      return (data || []).map(schedule => ({
        ...schedule,
        job_number: schedule.jobs?.job_number,
        job_status: schedule.jobs?.status,
        customer_name: schedule.jobs?.customers?.name,
        property_address: schedule.jobs?.properties
          ? [
              schedule.jobs.properties.address1,
              schedule.jobs.properties.address2,
              schedule.jobs.properties.city,
              schedule.jobs.properties.state,
              schedule.jobs.properties.postal_code
            ].filter(Boolean).join(', ')
          : 'Address not available'
      }));
    } catch (error) {
      console.error('Error fetching today schedule:', error);
      throw error;
    }
  },

  /**
   * Create a scheduled job (e.g., inspection)
   */
  async createSchedule({ jobId, technicianName, scheduledDate, scheduledTime, durationMinutes, notes, status }) {
    const { data, error } = await supabase
      .from('job_schedules')
      .insert([{
        job_id: jobId,
        technician_name: technicianName,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime || null,
        duration_minutes: durationMinutes || 60,
        notes: notes || null,
        status: status || 'scheduled',
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get all scheduled items for a job
   */
  async getByJobId(jobId) {
    const { data, error } = await supabase
      .from('job_schedules')
      .select('*')
      .eq('job_id', jobId)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Update the status of a scheduled job
   */
  async updateStatus(scheduleId, status) {
    const { data, error } = await supabase
      .from('job_schedules')
      .update({ status })
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get all scheduled jobs for a given date (for dispatcher status panel)
   */
  async getByDate(dateStr) {
    const { data, error } = await supabase
      .from('job_schedules')
      .select(`
        *,
        jobs(id, job_number, customers(name), properties(address1, city, state))
      `)
      .eq('scheduled_date', dateStr)
      .in('status', ['scheduled', 'confirmed', 'in_progress', 'completed'])
      .order('technician_name', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Cancel a scheduled item
   */
  async cancelSchedule(scheduleId) {
    const { data, error } = await supabase
      .from('job_schedules')
      .update({ status: 'cancelled' })
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export default scheduleService;
