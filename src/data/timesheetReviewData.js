// Mock data for Timesheet Review — week of Feb 24 – Mar 1, 2026

// PM → Employee mapping
export const pmCrewMapping = {
  Kevin: ['Gabriel', 'Pedro'],
  Leo: ['Juan', 'Marco'],
  Aaron: ['Carlos'],
};

// Employee roles
export const employeeRoles = {
  Gabriel: 'Crew Chief',
  Pedro: 'Tech',
  Juan: 'Crew Chief',
  Marco: 'Tech',
  Carlos: 'Crew Chief',
};

// Time types
export const TIME_TYPES = {
  whip: { label: 'WIP', color: '#a855f7' },
  job: { label: 'Job', color: '#3b82f6' },
  training: { label: 'Training', color: '#06b6d4' },
};

// All time types including non-column ones (for detail rows & stats)
export const ALL_TIME_TYPES = {
  ...TIME_TYPES,
  driving: { label: 'Driving', color: '#f59e0b' },
};

export const mockTimesheetEntries = [
  // ── Gabriel (Kevin's crew) ── Mon–Fri + Sat ──
  // Monday
  { id: 1,  technician_name: 'Gabriel', job_number: 'SHOP',    customer: '',                   clock_in_time: '06:30', clock_out_time: '07:00', total_hours: 0.5,  time_type: 'whip',    notes: 'Load truck, prep equipment',      date: '2026-02-24', status: 'pending' },
  { id: 2,  technician_name: 'Gabriel', job_number: 'WF-1042', customer: 'Anderson Residence', clock_in_time: '07:00', clock_out_time: '07:30', total_hours: 0.5,  time_type: 'driving', notes: 'Drive to job site',               date: '2026-02-24', status: 'pending' },
  { id: 3,  technician_name: 'Gabriel', job_number: 'WF-1042', customer: 'Anderson Residence', clock_in_time: '07:30', clock_out_time: '15:00', total_hours: 7.5,  time_type: 'job',     notes: 'Demo and dry-out Day 1',          date: '2026-02-24', status: 'pending' },
  // Tuesday
  { id: 4,  technician_name: 'Gabriel', job_number: 'WF-1042', customer: 'Anderson Residence', clock_in_time: '06:45', clock_out_time: '07:15', total_hours: 0.5,  time_type: 'driving', notes: 'Drive to site',                   date: '2026-02-25', status: 'pending' },
  { id: 5,  technician_name: 'Gabriel', job_number: 'WF-1042', customer: 'Anderson Residence', clock_in_time: '07:15', clock_out_time: '15:15', total_hours: 8.0,  time_type: 'job',     notes: 'Equipment monitoring, moisture readings', date: '2026-02-25', status: 'pending' },
  { id: 6,  technician_name: 'Gabriel', job_number: 'WF-1042', customer: 'Anderson Residence', clock_in_time: '15:15', clock_out_time: '16:00', total_hours: 0.75, time_type: 'job', notes: 'Stayed late for emergency reading', date: '2026-02-25', status: 'pending' },
  // Wednesday
  { id: 7,  technician_name: 'Gabriel', job_number: 'WF-1042', customer: 'Anderson Residence', clock_in_time: '07:00', clock_out_time: '07:30', total_hours: 0.5,  time_type: 'driving', notes: 'Drive to site',                   date: '2026-02-26', status: 'pending' },
  { id: 8,  technician_name: 'Gabriel', job_number: 'WF-1042', customer: 'Anderson Residence', clock_in_time: '07:30', clock_out_time: '15:00', total_hours: 7.5,  time_type: 'job',     notes: 'Final dry-out, pack equipment',   date: '2026-02-26', status: 'pending' },
  // Thursday
  { id: 9,  technician_name: 'Gabriel', job_number: 'SHOP',    customer: '',                   clock_in_time: '07:00', clock_out_time: '07:30', total_hours: 0.5,  time_type: 'whip',    notes: 'Switch truck, load for new job',  date: '2026-02-27', status: 'pending' },
  { id: 10, technician_name: 'Gabriel', job_number: 'WF-1055', customer: 'Baker Commercial',   clock_in_time: '07:30', clock_out_time: '08:15', total_hours: 0.75, time_type: 'driving', notes: 'Drive to Baker Commercial',       date: '2026-02-27', status: 'pending' },
  { id: 11, technician_name: 'Gabriel', job_number: 'WF-1055', customer: 'Baker Commercial',   clock_in_time: '08:15', clock_out_time: '16:15', total_hours: 8.0,  time_type: 'job',     notes: 'Water extraction, commercial unit', date: '2026-02-27', status: 'pending' },
  { id: 12, technician_name: 'Gabriel', job_number: 'WF-1055', customer: 'Baker Commercial',   clock_in_time: '16:15', clock_out_time: '17:00', total_hours: 0.75, time_type: 'job', notes: 'Overtime — finish extraction',    date: '2026-02-27', status: 'pending' },
  // Friday
  { id: 13, technician_name: 'Gabriel', job_number: 'WF-1055', customer: 'Baker Commercial',   clock_in_time: '07:00', clock_out_time: '07:30', total_hours: 0.5,  time_type: 'driving', notes: 'Drive to site',                   date: '2026-02-28', status: 'pending' },
  { id: 14, technician_name: 'Gabriel', job_number: 'WF-1055', customer: 'Baker Commercial',   clock_in_time: '07:30', clock_out_time: '15:30', total_hours: 8.0,  time_type: 'job',     notes: 'Set dehumidifiers, blowers',      date: '2026-02-28', status: 'pending' },
  // Saturday
  { id: 15, technician_name: 'Gabriel', job_number: 'WF-1055', customer: 'Baker Commercial',   clock_in_time: '09:00', clock_out_time: '13:00', total_hours: 4.0,  time_type: 'job',     notes: 'Weekend check on equipment',      date: '2026-03-01', status: 'pending' },

  // ── Pedro (Kevin's crew) ── Mon–Fri ──
  // Monday
  { id: 16, technician_name: 'Pedro', job_number: 'SHOP',    customer: '',              clock_in_time: '06:45', clock_out_time: '07:00', total_hours: 0.25, time_type: 'whip',    notes: 'Grab supplies',                date: '2026-02-24', status: 'pending' },
  { id: 17, technician_name: 'Pedro', job_number: 'WF-1048', customer: 'Chen Property', clock_in_time: '07:00', clock_out_time: '07:25', total_hours: 0.4,  time_type: 'driving', notes: 'Drive to Chen',                date: '2026-02-24', status: 'pending' },
  { id: 18, technician_name: 'Pedro', job_number: 'WF-1048', customer: 'Chen Property', clock_in_time: '07:25', clock_out_time: '15:00', total_hours: 7.5,  time_type: 'job',     notes: 'Mold remediation setup',       date: '2026-02-24', status: 'pending' },
  // Tuesday
  { id: 19, technician_name: 'Pedro', job_number: 'WF-1048', customer: 'Chen Property', clock_in_time: '07:00', clock_out_time: '07:30', total_hours: 0.5,  time_type: 'driving', notes: 'Drive to site',                date: '2026-02-25', status: 'pending' },
  { id: 20, technician_name: 'Pedro', job_number: 'WF-1048', customer: 'Chen Property', clock_in_time: '07:30', clock_out_time: '15:30', total_hours: 8.0,  time_type: 'job',     notes: 'Containment and HEPA',         date: '2026-02-25', status: 'pending' },
  // Wednesday — includes training
  { id: 21, technician_name: 'Pedro', job_number: 'TRAIN',   customer: '',              clock_in_time: '06:30', clock_out_time: '08:00', total_hours: 1.5,  time_type: 'training', notes: 'IICRC safety refresher',       date: '2026-02-26', status: 'pending' },
  { id: 22, technician_name: 'Pedro', job_number: 'WF-1048', customer: 'Chen Property', clock_in_time: '08:00', clock_out_time: '08:20', total_hours: 0.3,  time_type: 'driving', notes: 'Drive to Chen',                date: '2026-02-26', status: 'pending' },
  { id: 23, technician_name: 'Pedro', job_number: 'WF-1048', customer: 'Chen Property', clock_in_time: '08:20', clock_out_time: '15:00', total_hours: 6.7,  time_type: 'job',     notes: 'Mold removal, drywall demo',   date: '2026-02-26', status: 'pending' },
  // Thursday
  { id: 24, technician_name: 'Pedro', job_number: 'WF-1048', customer: 'Chen Property', clock_in_time: '07:00', clock_out_time: '07:25', total_hours: 0.4,  time_type: 'driving', notes: 'Drive to site',                date: '2026-02-27', status: 'pending' },
  { id: 25, technician_name: 'Pedro', job_number: 'WF-1048', customer: 'Chen Property', clock_in_time: '07:25', clock_out_time: '14:30', total_hours: 7.0,  time_type: 'job',     notes: 'Clearance testing prep',       date: '2026-02-27', status: 'pending' },
  // Friday
  { id: 26, technician_name: 'Pedro', job_number: 'WF-1060', customer: 'Davis Home',    clock_in_time: '07:00', clock_out_time: '07:45', total_hours: 0.75, time_type: 'driving', notes: 'Drive to Davis Home',          date: '2026-02-28', status: 'pending' },
  { id: 27, technician_name: 'Pedro', job_number: 'WF-1060', customer: 'Davis Home',    clock_in_time: '07:45', clock_out_time: '15:00', total_hours: 7.25, time_type: 'job',     notes: 'Fire damage assessment',       date: '2026-02-28', status: 'pending' },

  // ── Juan (Leo's crew) ── Mon–Fri + Sat ──
  // Monday
  { id: 28, technician_name: 'Juan', job_number: 'SHOP',    customer: '',                clock_in_time: '06:30', clock_out_time: '07:00', total_hours: 0.5,  time_type: 'whip',    notes: 'Load extraction equipment',     date: '2026-02-24', status: 'pending' },
  { id: 29, technician_name: 'Juan', job_number: 'WF-1039', customer: 'Elm Street Apts', clock_in_time: '07:00', clock_out_time: '07:30', total_hours: 0.5,  time_type: 'driving', notes: 'Drive to Elm St',               date: '2026-02-24', status: 'pending' },
  { id: 30, technician_name: 'Juan', job_number: 'WF-1039', customer: 'Elm Street Apts', clock_in_time: '07:30', clock_out_time: '15:30', total_hours: 8.0,  time_type: 'job',     notes: 'Multi-unit water extraction',   date: '2026-02-24', status: 'pending' },
  // Tuesday — long day with OT
  { id: 31, technician_name: 'Juan', job_number: 'WF-1039', customer: 'Elm Street Apts', clock_in_time: '06:30', clock_out_time: '07:00', total_hours: 0.5,  time_type: 'driving', notes: 'Drive to site',                 date: '2026-02-25', status: 'pending' },
  { id: 32, technician_name: 'Juan', job_number: 'WF-1039', customer: 'Elm Street Apts', clock_in_time: '07:00', clock_out_time: '15:00', total_hours: 8.0,  time_type: 'job',     notes: 'Continued extraction, 2nd floor', date: '2026-02-25', status: 'pending' },
  { id: 33, technician_name: 'Juan', job_number: 'WF-1039', customer: 'Elm Street Apts', clock_in_time: '15:00', clock_out_time: '16:30', total_hours: 1.5,  time_type: 'job', notes: 'OT — finish 2nd floor unit',    date: '2026-02-25', status: 'pending' },
  // Wednesday
  { id: 34, technician_name: 'Juan', job_number: 'WF-1039', customer: 'Elm Street Apts', clock_in_time: '07:00', clock_out_time: '07:30', total_hours: 0.5,  time_type: 'driving', notes: 'Drive to site',                 date: '2026-02-26', status: 'pending' },
  { id: 35, technician_name: 'Juan', job_number: 'WF-1039', customer: 'Elm Street Apts', clock_in_time: '07:30', clock_out_time: '15:00', total_hours: 7.5,  time_type: 'job',     notes: 'Drying equipment setup',        date: '2026-02-26', status: 'pending' },
  // Thursday
  { id: 36, technician_name: 'Juan', job_number: 'WF-1039', customer: 'Elm Street Apts', clock_in_time: '07:00', clock_out_time: '07:30', total_hours: 0.5,  time_type: 'driving', notes: 'Drive to site',                 date: '2026-02-27', status: 'pending' },
  { id: 37, technician_name: 'Juan', job_number: 'WF-1039', customer: 'Elm Street Apts', clock_in_time: '07:30', clock_out_time: '15:30', total_hours: 8.0,  time_type: 'job',     notes: 'Moisture readings, move equip',  date: '2026-02-27', status: 'pending' },
  // Friday
  { id: 38, technician_name: 'Juan', job_number: 'SHOP',    customer: '',                clock_in_time: '06:30', clock_out_time: '07:00', total_hours: 0.5,  time_type: 'whip',    notes: 'Swap out dehu filters',         date: '2026-02-28', status: 'pending' },
  { id: 39, technician_name: 'Juan', job_number: 'WF-1051', customer: 'Franklin Office', clock_in_time: '07:00', clock_out_time: '07:40', total_hours: 0.7,  time_type: 'driving', notes: 'Drive to Franklin',             date: '2026-02-28', status: 'pending' },
  { id: 40, technician_name: 'Juan', job_number: 'WF-1051', customer: 'Franklin Office', clock_in_time: '07:40', clock_out_time: '15:00', total_hours: 7.3,  time_type: 'job',     notes: 'Sewage cleanup, CAT 3',         date: '2026-02-28', status: 'pending' },
  // Saturday
  { id: 41, technician_name: 'Juan', job_number: 'WF-1051', customer: 'Franklin Office', clock_in_time: '08:00', clock_out_time: '14:00', total_hours: 6.0,  time_type: 'job',     notes: 'Weekend follow-up disinfection', date: '2026-03-01', status: 'pending' },

  // ── Marco (Leo's crew) ── Mon–Fri ──
  // Monday
  { id: 42, technician_name: 'Marco', job_number: 'WF-1044', customer: 'Garcia Residence', clock_in_time: '07:00', clock_out_time: '07:30', total_hours: 0.5, time_type: 'driving', notes: 'Drive to Garcia',               date: '2026-02-24', status: 'pending' },
  { id: 43, technician_name: 'Marco', job_number: 'WF-1044', customer: 'Garcia Residence', clock_in_time: '07:30', clock_out_time: '16:00', total_hours: 8.5, time_type: 'job',     notes: 'Roof tarp and water damage',    date: '2026-02-24', status: 'pending' },
  // Tuesday
  { id: 44, technician_name: 'Marco', job_number: 'WF-1044', customer: 'Garcia Residence', clock_in_time: '07:00', clock_out_time: '07:25', total_hours: 0.4, time_type: 'driving', notes: 'Drive to site',                 date: '2026-02-25', status: 'pending' },
  { id: 45, technician_name: 'Marco', job_number: 'WF-1044', customer: 'Garcia Residence', clock_in_time: '07:25', clock_out_time: '15:00', total_hours: 7.6, time_type: 'job',     notes: 'Ceiling demo, insulation removal', date: '2026-02-25', status: 'pending' },
  // Wednesday — half day + training
  { id: 46, technician_name: 'Marco', job_number: 'TRAIN',   customer: '',                  clock_in_time: '07:00', clock_out_time: '09:00', total_hours: 2.0, time_type: 'training', notes: 'Lead paint awareness cert',     date: '2026-02-26', status: 'pending' },
  { id: 47, technician_name: 'Marco', job_number: 'WF-1044', customer: 'Garcia Residence', clock_in_time: '09:00', clock_out_time: '12:00', total_hours: 3.0, time_type: 'job',     notes: 'Half day — truck maintenance PM', date: '2026-02-26', status: 'pending' },
  // Thursday
  { id: 48, technician_name: 'Marco', job_number: 'SHOP',    customer: '',                  clock_in_time: '06:45', clock_out_time: '07:00', total_hours: 0.25, time_type: 'whip',   notes: 'Load for new job',              date: '2026-02-27', status: 'pending' },
  { id: 49, technician_name: 'Marco', job_number: 'WF-1057', customer: 'Harris Building',  clock_in_time: '07:00', clock_out_time: '07:40', total_hours: 0.7,  time_type: 'driving', notes: 'Drive to Harris Bldg',          date: '2026-02-27', status: 'pending' },
  { id: 50, technician_name: 'Marco', job_number: 'WF-1057', customer: 'Harris Building',  clock_in_time: '07:40', clock_out_time: '15:30', total_hours: 7.8,  time_type: 'job',     notes: 'Commercial flood response',     date: '2026-02-27', status: 'pending' },
  // Friday
  { id: 51, technician_name: 'Marco', job_number: 'WF-1057', customer: 'Harris Building',  clock_in_time: '07:00', clock_out_time: '07:35', total_hours: 0.6,  time_type: 'driving', notes: 'Drive to site',                 date: '2026-02-28', status: 'pending' },
  { id: 52, technician_name: 'Marco', job_number: 'WF-1057', customer: 'Harris Building',  clock_in_time: '07:35', clock_out_time: '15:35', total_hours: 8.0,  time_type: 'job',     notes: 'Equipment setup, dehu placement', date: '2026-02-28', status: 'pending' },
  { id: 53, technician_name: 'Marco', job_number: 'WF-1057', customer: 'Harris Building',  clock_in_time: '15:35', clock_out_time: '16:30', total_hours: 0.9,  time_type: 'job', notes: 'OT — emergency dehu swap',      date: '2026-02-28', status: 'pending' },

  // ── Carlos (Aaron's crew) ── Mon–Sat, missing clock-out Wed ──
  // Monday — emergency call-out
  { id: 54, technician_name: 'Carlos', job_number: 'WF-1046', customer: 'Irving Condo', clock_in_time: '06:00', clock_out_time: '06:45', total_hours: 0.75, time_type: 'driving', notes: 'Emergency drive to Irving',      date: '2026-02-24', status: 'pending' },
  { id: 55, technician_name: 'Carlos', job_number: 'WF-1046', customer: 'Irving Condo', clock_in_time: '06:45', clock_out_time: '14:45', total_hours: 8.0,  time_type: 'job',     notes: 'Emergency pipe burst extraction', date: '2026-02-24', status: 'pending' },
  { id: 56, technician_name: 'Carlos', job_number: 'WF-1046', customer: 'Irving Condo', clock_in_time: '14:45', clock_out_time: '16:00', total_hours: 1.25, time_type: 'job', notes: 'OT — couldn\'t leave mid-extraction', date: '2026-02-24', status: 'pending' },
  // Tuesday
  { id: 57, technician_name: 'Carlos', job_number: 'WF-1046', customer: 'Irving Condo', clock_in_time: '07:00', clock_out_time: '07:40', total_hours: 0.7,  time_type: 'driving', notes: 'Drive to Irving',               date: '2026-02-25', status: 'pending' },
  { id: 58, technician_name: 'Carlos', job_number: 'WF-1046', customer: 'Irving Condo', clock_in_time: '07:40', clock_out_time: '15:40', total_hours: 8.0,  time_type: 'job',     notes: 'Continued extraction',          date: '2026-02-25', status: 'pending' },
  { id: 59, technician_name: 'Carlos', job_number: 'WF-1046', customer: 'Irving Condo', clock_in_time: '15:40', clock_out_time: '16:30', total_hours: 0.8,  time_type: 'job', notes: 'OT — finish section',           date: '2026-02-25', status: 'pending' },
  // Wednesday — missing clock-out
  { id: 60, technician_name: 'Carlos', job_number: 'WF-1046', customer: 'Irving Condo', clock_in_time: '07:00', clock_out_time: '',      total_hours: 0,    time_type: 'job',     notes: 'Forgot to clock out',           date: '2026-02-26', status: 'pending' },
  // Thursday
  { id: 61, technician_name: 'Carlos', job_number: 'WF-1046', customer: 'Irving Condo', clock_in_time: '07:00', clock_out_time: '07:35', total_hours: 0.6,  time_type: 'driving', notes: 'Drive to site',                 date: '2026-02-27', status: 'pending' },
  { id: 62, technician_name: 'Carlos', job_number: 'WF-1046', customer: 'Irving Condo', clock_in_time: '07:35', clock_out_time: '15:00', total_hours: 7.4,  time_type: 'job',     notes: 'Drying day 3, monitoring',      date: '2026-02-27', status: 'pending' },
  // Friday
  { id: 63, technician_name: 'Carlos', job_number: 'SHOP',    customer: '',             clock_in_time: '07:00', clock_out_time: '07:30', total_hours: 0.5,  time_type: 'whip',    notes: 'Return equipment to warehouse', date: '2026-02-28', status: 'pending' },
  { id: 64, technician_name: 'Carlos', job_number: 'WF-1046', customer: 'Irving Condo', clock_in_time: '07:30', clock_out_time: '08:00', total_hours: 0.5,  time_type: 'driving', notes: 'Drive to site',                 date: '2026-02-28', status: 'pending' },
  { id: 65, technician_name: 'Carlos', job_number: 'WF-1046', customer: 'Irving Condo', clock_in_time: '08:00', clock_out_time: '16:00', total_hours: 8.0,  time_type: 'job',     notes: 'Equipment pickup, final readings', date: '2026-02-28', status: 'pending' },
  { id: 66, technician_name: 'Carlos', job_number: 'WF-1046', customer: 'Irving Condo', clock_in_time: '16:00', clock_out_time: '17:00', total_hours: 1.0,  time_type: 'job', notes: 'OT — client walkthrough ran late', date: '2026-02-28', status: 'pending' },
  // Saturday
  { id: 67, technician_name: 'Carlos', job_number: 'WF-1062', customer: 'Jensen Property', clock_in_time: '08:00', clock_out_time: '08:30', total_hours: 0.5, time_type: 'driving', notes: 'Drive to Jensen',              date: '2026-03-01', status: 'pending' },
  { id: 68, technician_name: 'Carlos', job_number: 'WF-1062', customer: 'Jensen Property', clock_in_time: '08:30', clock_out_time: '15:00', total_hours: 6.5, time_type: 'job',     notes: 'Saturday board-up',            date: '2026-03-01', status: 'pending' },
];

export const mockTimesheetFlags = [
  { id: 1, technician: 'Gabriel', date: '2026-02-25', jobNumber: 'WF-1042', type: 'overtime', description: 'Worked 9.25 hours — exceeds 8-hour daily limit' },
  { id: 2, technician: 'Gabriel', date: '2026-03-01', jobNumber: 'WF-1055', type: 'weekend', description: 'Weekend work logged on Sunday' },
  { id: 3, technician: 'Juan', date: '2026-02-25', jobNumber: 'WF-1039', type: 'overtime', description: 'Worked 10 hours — exceeds 8-hour daily limit' },
  { id: 4, technician: 'Juan', date: '2026-02-25', jobNumber: 'WF-1039', type: 'no_lunch', description: '10-hour shift with no lunch break recorded' },
  { id: 5, technician: 'Carlos', date: '2026-02-26', jobNumber: 'WF-1046', type: 'missing_clockout', description: 'No clock-out recorded for this day' },
  { id: 6, technician: 'Carlos', date: '2026-02-24', jobNumber: 'WF-1046', type: 'overtime', description: 'Worked 10 hours — exceeds 8-hour daily limit' },
  { id: 7, technician: 'Juan', date: '2026-03-01', jobNumber: 'WF-1051', type: 'weekend', description: 'Weekend work logged on Sunday' },
  { id: 8, technician: 'Carlos', date: '2026-03-01', jobNumber: 'WF-1062', type: 'weekend', description: 'Weekend work logged on Sunday' },
];
