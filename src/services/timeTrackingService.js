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
  },

  /**
   * Get today's dispatched jobs for a crew chief from dispatch_schedules.
   * Reads schedule_data JSON blob and computes scheduled start times.
   * @param {string} crewChiefName - Name to match against lane names
   * @returns {Array} Jobs in route order with scheduledTime, estimatedHours, driveTimeMinutes, routeOrder
   */
  async getTodayDispatchJobs(crewChiefName) {
    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('dispatch_schedules')
        .select('schedule_data')
        .eq('schedule_date', dateStr)
        .maybeSingle();

      if (error) throw error;
      if (!data || !data.schedule_data) return [];

      const { lanes, schedule, driveTimeByCrew } = data.schedule_data;
      if (!lanes || !schedule) return [];

      // Find matching lane (case-insensitive)
      const lane = lanes.find(
        (l) => l.name.toLowerCase() === crewChiefName.toLowerCase()
      );
      if (!lane) return [];

      const jobs = schedule[lane.id] || [];
      const legs = Array.isArray(driveTimeByCrew?.[lane.id]?.legs)
        ? driveTimeByCrew[lane.id].legs
        : [];

      // Compute scheduled start times using same cursor logic as finalize()
      const DAY_START = 8.5; // 8:30 AM
      let cursor = DAY_START;
      const result = [];

      jobs.forEach((job, idx) => {
        const hours = Number(job.hours) || 0;
        const legSec = legs[idx] || 0;
        const driveTimeMinutes = Math.round(legSec / 60);

        // Add drive time to cursor
        cursor += legSec / 3600;
        const startHour = cursor;

        // Build a Date object for the scheduled time
        const h = Math.floor(startHour);
        const m = Math.round((startHour - h) * 60);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(h, m, 0, 0);

        result.push({
          ...job,
          scheduledTime: scheduledTime.toISOString(),
          estimatedHours: hours,
          driveTimeMinutes,
          routeOrder: idx + 1,
        });

        // Advance cursor past this job
        cursor += hours;
      });

      return result;
    } catch (error) {
      console.error('Error fetching today dispatch jobs:', error);
      throw error;
    }
  },

  /**
   * Get all time entries for a technician from today (since midnight).
   * @param {string} technicianName - Name of the technician
   * @returns {Array} Today's time entries
   */
  async getTodayEntries(technicianName) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('time_tracking')
        .select('*')
        .eq('technician_name', technicianName)
        .gte('clock_in_time', today.toISOString())
        .order('clock_in_time', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching today entries:', error);
      throw error;
    }
  }
};

export default timeTrackingService;
