import { supabase } from './supabaseClient';

const timeTrackingService = {
  /**
   * Clock in a technician for a job
   * @param {string} technicianName - Name of the technician
   * @param {string} jobNumber - Job number
   * @param {string} notes - Optional notes
   * @returns {Object} The created time entry
   */
  async clockIn(technicianName, jobNumber, notes = '') {
    try {
      const { data, error } = await supabase
        .from('time_tracking')
        .insert([
          {
            technician_name: technicianName,
            job_number: jobNumber,
            clock_in_time: new Date().toISOString(),
            notes: notes
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error clocking in:', error);
      throw error;
    }
  },

  /**
   * Clock out a technician
   * @param {number} timeEntryId - ID of the time entry to clock out
   * @returns {Object} The updated time entry
   */
  async clockOut(timeEntryId) {
    try {
      const clockOutTime = new Date();

      // First get the clock in time to calculate hours
      const { data: existingEntry, error: fetchError } = await supabase
        .from('time_tracking')
        .select('clock_in_time')
        .eq('id', timeEntryId)
        .single();

      if (fetchError) throw fetchError;

      const clockInTime = new Date(existingEntry.clock_in_time);
      const totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60); // Convert ms to hours

      // Update the entry with clock out time and total hours
      const { data, error } = await supabase
        .from('time_tracking')
        .update({
          clock_out_time: clockOutTime.toISOString(),
          total_hours: totalHours.toFixed(2)
        })
        .eq('id', timeEntryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error clocking out:', error);
      throw error;
    }
  },

  /**
   * Get active time entry for a technician (not clocked out yet)
   * @param {string} technicianName - Name of the technician
   * @returns {Object|null} Active time entry or null
   */
  async getActiveEntry(technicianName) {
    try {
      const { data, error } = await supabase
        .from('time_tracking')
        .select('*')
        .eq('technician_name', technicianName)
        .is('clock_out_time', null)
        .order('clock_in_time', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data || null;
    } catch (error) {
      console.error('Error getting active entry:', error);
      throw error;
    }
  },

  /**
   * Get all time entries for a technician
   * @param {string} technicianName - Name of the technician
   * @param {number} limit - Number of entries to return
   * @returns {Array} Array of time entries
   */
  async getEntriesByTechnician(technicianName, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('time_tracking')
        .select('*')
        .eq('technician_name', technicianName)
        .order('clock_in_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching technician entries:', error);
      throw error;
    }
  },

  /**
   * Get all time entries for a job
   * @param {string} jobNumber - Job number
   * @returns {Array} Array of time entries
   */
  async getEntriesByJob(jobNumber) {
    try {
      const { data, error } = await supabase
        .from('time_tracking')
        .select('*')
        .eq('job_number', jobNumber)
        .order('clock_in_time', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching job entries:', error);
      throw error;
    }
  },

  /**
   * Get total hours for a job
   * @param {string} jobNumber - Job number
   * @returns {number} Total hours worked on the job
   */
  async getTotalHoursForJob(jobNumber) {
    try {
      const { data, error } = await supabase
        .from('time_tracking')
        .select('total_hours')
        .eq('job_number', jobNumber)
        .not('total_hours', 'is', null);

      if (error) throw error;

      const total = data.reduce((sum, entry) => sum + parseFloat(entry.total_hours || 0), 0);
      return total;
    } catch (error) {
      console.error('Error calculating total hours:', error);
      throw error;
    }
  }
};

export default timeTrackingService;
