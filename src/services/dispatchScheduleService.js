// Dispatch Schedule Service — save/load daily schedules to Supabase
// Also handles "finalize" which writes normalized records to job_schedules + crew_assignments
import { supabase, handleSupabaseResult } from './supabaseClient';

const TABLE = 'dispatch_schedules';

function dateToString(d) {
  if (typeof d === 'string') return d;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const dispatchScheduleService = {
  /**
   * Load a schedule for a given date.
   * Returns null if no schedule exists for that date.
   */
  async load(date) {
    const dateStr = dateToString(date);
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('schedule_date', dateStr)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Save (upsert) a schedule for a given date.
   * scheduleData should contain: { lanes, schedule, driveTimeByCrew, pmGroups }
   */
  async save(date, scheduleData, userId = null) {
    const dateStr = dateToString(date);
    const payload = {
      schedule_date: dateStr,
      schedule_data: scheduleData,
      updated_by: userId,
    };

    // Try update first, then insert
    const { data: existing } = await supabase
      .from(TABLE)
      .select('id')
      .eq('schedule_date', dateStr)
      .maybeSingle();

    if (existing) {
      const response = await supabase
        .from(TABLE)
        .update({ schedule_data: scheduleData, updated_by: userId })
        .eq('id', existing.id)
        .select()
        .single();
      return handleSupabaseResult(response);
    }

    payload.created_by = userId;
    const response = await supabase
      .from(TABLE)
      .insert([payload])
      .select()
      .single();
    return handleSupabaseResult(response);
  },

  /**
   * Finalize a schedule: marks it as finalized and writes normalized records
   * to job_schedules and crew_assignments so technician ScheduleView can see them.
   */
  async finalize(date, scheduleData, userId = null) {
    const dateStr = dateToString(date);
    const { lanes, schedule, driveTimeByCrew } = scheduleData;

    // 1. Save the full schedule data
    await this.save(date, scheduleData, userId);

    // 2. Mark as finalized
    await supabase
      .from(TABLE)
      .update({ finalized: true, updated_by: userId })
      .eq('schedule_date', dateStr);

    // 3. Delete existing job_schedules for this date (replace them)
    await supabase
      .from('job_schedules')
      .delete()
      .eq('scheduled_date', dateStr);

    // 4. Write normalized job_schedule records
    const DAY_START = 8.5;
    const jobScheduleRows = [];

    for (const lane of (lanes || [])) {
      const jobs = schedule[lane.id] || [];
      const legs = Array.isArray(driveTimeByCrew?.[lane.id]?.legs)
        ? driveTimeByCrew[lane.id].legs
        : [];
      let cursor = DAY_START;

      jobs.forEach((job, idx) => {
        const hours = Number(job.hours) || 0;
        const legSec = legs[idx] || 0;
        cursor += legSec / 3600;
        const startHour = cursor;
        cursor += hours;

        const h = Math.floor(startHour);
        const m = Math.round((startHour - h) * 60);
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

        jobScheduleRows.push({
          technician_name: lane.name,
          scheduled_date: dateStr,
          scheduled_time: timeStr,
          duration_minutes: Math.round(hours * 60),
          status: 'scheduled',
          notes: [job.jobType, job.jobNumber, job.customer].filter(Boolean).join(' — '),
          ...(job.dbJobId ? { job_id: job.dbJobId } : {}),
        });
      });
    }

    if (jobScheduleRows.length > 0) {
      const { error } = await supabase
        .from('job_schedules')
        .insert(jobScheduleRows);
      if (error) console.error('Failed to write job_schedules:', error);
    }

    return { finalized: true, jobScheduleCount: jobScheduleRows.length };
  },

  /**
   * Check if a date's schedule is finalized
   */
  async isFinalized(date) {
    const dateStr = dateToString(date);
    const { data } = await supabase
      .from(TABLE)
      .select('finalized')
      .eq('schedule_date', dateStr)
      .maybeSingle();
    return data?.finalized === true;
  },

  /**
   * Get all schedules in a date range (for week view)
   */
  async loadRange(startDate, endDate) {
    const start = dateToString(startDate);
    const end = dateToString(endDate);
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .gte('schedule_date', start)
      .lte('schedule_date', end)
      .order('schedule_date', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  },
};

export default dispatchScheduleService;
