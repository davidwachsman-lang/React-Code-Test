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
  }
};

export default scheduleService;
