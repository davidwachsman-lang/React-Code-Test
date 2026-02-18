import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import dispatchScheduleService from '../services/dispatchScheduleService';
import dispatchTeamService from '../services/dispatchTeamService';
import { hoursForJobType } from '../config/dispatchJobDurations';

// ─── Constants ───────────────────────────────────────────────────────────────

export const LANE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16',
  '#f43f5e', '#fb923c', '#a3e635', '#2dd4bf',
];
export const PM_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
export const UNASSIGNED = { id: 'unassigned', name: 'Unassigned', color: '#64748b' };

export const JOB_TYPES = [
  { value: '', label: 'Select type...', hours: 0 },
  { value: 'dry', label: 'Dry', hours: hoursForJobType('dry') },
  { value: 'monitoring', label: 'Monitoring', hours: hoursForJobType('monitoring') },
  { value: 'stabilization', label: 'Stabilization', hours: hoursForJobType('stabilization') },
  { value: 'walkthrough', label: 'Walkthrough', hours: hoursForJobType('walkthrough') },
  { value: 'new-start', label: 'New Start', hours: hoursForJobType('new-start') },
  { value: 'continue-service', label: 'Continue Service', hours: hoursForJobType('continue-service') },
  { value: 'demo', label: 'Demo', hours: hoursForJobType('demo') },
  { value: 'packout', label: 'Packout', hours: hoursForJobType('packout') },
  { value: 'equipment-pickup', label: 'Equipment Pickup', hours: hoursForJobType('equipment-pickup') },
  { value: 'emergency', label: 'Emergency', hours: hoursForJobType('emergency') },
  { value: 'estimate', label: 'Estimate', hours: hoursForJobType('estimate') },
  { value: 'inspection', label: 'Inspection', hours: hoursForJobType('inspection') },
];

export const DAY_START = 8.5;
export const DAY_END = 18;
export const SLOT_INTERVAL = 0.5;
export const TIME_SLOTS = [];
for (let h = DAY_START; h <= DAY_END; h += SLOT_INTERVAL) {
  TIME_SLOTS.push(h);
}

export const HOME_OFFICE = '2550 TN-109, Lebanon, TN 37090';
export const FALLBACK_DEPOT_COORDS = { lat: 36.2081, lng: -86.2911 };

// ─── Color Family Generator ──────────────────────────────────────────────────

/**
 * Generate a color family from a base hex color.
 * Returns [baseColor, shade1, shade2, ...] where shades get progressively lighter.
 * PM gets the base color; each crew chief gets a lighter variant of the same hue.
 */
export function generateColorFamily(baseHex, crewCount) {
  // Parse hex to RGB
  const hex = baseHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // RGB → HSL
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  // HSL → hex helper
  const hslToHex = (hh, ss, ll) => {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    let rr, gg, bb;
    if (ss === 0) {
      rr = gg = bb = ll;
    } else {
      const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
      const p = 2 * ll - q;
      rr = hue2rgb(p, q, hh + 1 / 3);
      gg = hue2rgb(p, q, hh);
      bb = hue2rgb(p, q, hh - 1 / 3);
    }
    const toHex = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
    return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
  };

  const colors = [baseHex]; // PM gets the base color
  for (let i = 0; i < crewCount; i++) {
    // Progressively lighter: increase lightness, slightly decrease saturation
    const step = (i + 1) / (crewCount + 1);
    const newL = Math.min(0.88, l + (0.88 - l) * step * 0.7);
    const newS = Math.max(0.2, s - s * step * 0.3);
    colors.push(hslToHex(h, newS, newL));
  }
  return colors;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function createEmptyJob() {
  return {
    id: crypto.randomUUID(),
    jobType: '',
    hours: 0,
    jobNumber: '',
    customer: '',
    address: '',
  };
}

export function hourToLabel(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

export function formatDriveTime(seconds) {
  if (seconds == null || seconds < 0) return '—';
  const totalM = Math.round(seconds / 60);
  if (totalM < 60) return `${totalM} min`;
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;
  return m ? `${h}h ${m} min` : `${h}h`;
}

export function getDriveTotal(val) {
  if (typeof val === 'number') return val;
  return val?.total ?? 0;
}

export function getDriveLegs(val) {
  return Array.isArray(val?.legs) ? val.legs : [];
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function dateToKey(d) {
  return `dispatch-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateToString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function findPmForCrew(crewName, pmGroups) {
  const lower = (crewName || '').toLowerCase().trim();
  for (const pm of pmGroups) {
    // Match PM's own name (for PM lanes) or any crew chief name
    if ((pm.pm || '').toLowerCase().trim() === lower) return pm;
    if (pm.crews.some((c) => c.toLowerCase() === lower)) return pm;
  }
  return null;
}

// ─── Conflict Detection ──────────────────────────────────────────────────────

/**
 * Detect scheduling conflicts:
 * - Crew working + driving exceeds the day window
 * - Same job number on multiple crews
 */
export function detectConflicts(schedule, lanes, driveTimeByCrew) {
  const warnings = [];

  // Check each crew's total time
  lanes.forEach((lane) => {
    const jobs = schedule[lane.id] || [];
    const workHours = jobs.reduce((sum, j) => sum + (Number(j.hours) || 0), 0);
    const driveSeconds = getDriveTotal(driveTimeByCrew[lane.id]);
    const driveHours = driveSeconds / 3600;
    const totalHours = workHours + driveHours;
    const dayLength = DAY_END - DAY_START;

    if (totalHours > dayLength) {
      warnings.push({
        type: 'overtime',
        crewId: lane.id,
        crewName: lane.name,
        totalHours: totalHours.toFixed(1),
        dayLength,
        message: `${lane.name} is scheduled for ${totalHours.toFixed(1)}h (${workHours.toFixed(1)}h work + ${driveHours.toFixed(1)}h drive) — exceeds ${dayLength}h day`,
      });
    }
  });

  // Check for duplicate job numbers across crews
  const jobCrewMap = new Map(); // jobNumber -> [crewName, ...]
  lanes.forEach((lane) => {
    (schedule[lane.id] || []).forEach((job) => {
      if (!job.jobNumber) return;
      const key = job.jobNumber.trim().toLowerCase();
      if (!key) return;
      if (!jobCrewMap.has(key)) jobCrewMap.set(key, []);
      jobCrewMap.get(key).push(lane.name);
    });
  });
  jobCrewMap.forEach((crews, jobNum) => {
    if (crews.length > 1) {
      warnings.push({
        type: 'duplicate_job',
        jobNumber: jobNum,
        crews,
        message: `Job ${jobNum} is assigned to multiple crews: ${crews.join(', ')}`,
      });
    }
  });

  return warnings;
}

// ─── Main Hook ───────────────────────────────────────────────────────────────

export default function useDispatchSchedule(userId = null) {
  const [date, setDate] = useState(() => new Date());
  const [rangeMode, setRangeMode] = useState('day');
  const [lanes, setLanes] = useState([]);
  const [pmGroups, setPmGroups] = useState([]);
  const [schedule, setSchedule] = useState({ unassigned: [] });
  const [driveTimeByCrew, setDriveTimeByCrew] = useState({});
  const [jobsDatabase, setJobsDatabase] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [finalized, setFinalized] = useState(false);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [conflicts, setConflicts] = useState([]);

  // Undo/redo stacks
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const scheduleRef = useRef(schedule);
  const lanesRef = useRef(lanes);
  scheduleRef.current = schedule;
  lanesRef.current = lanes;

  // Track which job_schedule IDs have already been merged for the current date
  const mergedScheduleIdsRef = useRef(new Set());

  const dateKey = useMemo(() => dateToKey(date), [date]);

  // ─── Load teams from DB on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    dispatchTeamService.loadTeams().then(({ pmGroups: pg, lanes: ln }) => {
      if (cancelled) return;
      setPmGroups(pg);
      setLanes(ln);
      // Initialize empty schedule for each lane
      const s = { unassigned: [] };
      ln.forEach((l) => { s[l.id] = []; });
      setSchedule(s);
      setTeamsLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  // ─── Load jobs database for autocomplete ──────────────────────────────────
  useEffect(() => {
    supabase
      .from('jobs')
      .select('id, job_number, customer_name, property_address')
      .limit(500)
      .then(({ data }) => { if (data) setJobsDatabase(data); });
  }, []);

  // ─── Load schedule when date changes ──────────────────────────────────────
  useEffect(() => {
    if (!teamsLoaded) return;
    let cancelled = false;

    const load = async () => {
      try {
        // Try Supabase first
        const dbSchedule = await dispatchScheduleService.load(date);
        if (!cancelled && dbSchedule?.schedule_data) {
          const parsed = dbSchedule.schedule_data;
          if (parsed.lanes && parsed.schedule) {
            // Backward-compat: lanes without a type field get type: 'crew'
            const migratedLanes = parsed.lanes.map((ln) => ln.type ? ln : { ...ln, type: 'crew' });
            setLanes(migratedLanes);
            setSchedule(parsed.schedule);
            setDriveTimeByCrew(parsed.driveTimeByCrew || {});
            if (Array.isArray(parsed.pmGroups) && parsed.pmGroups.length > 0) {
              setPmGroups(parsed.pmGroups);
            }
            setFinalized(dbSchedule.finalized || false);
            setUndoStack([]);
            setRedoStack([]);
            return;
          }
        }

        // Fallback to localStorage for migration
        const saved = localStorage.getItem(dateKey);
        if (!cancelled && saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.lanes && Array.isArray(parsed.lanes) && parsed.schedule) {
              // Backward-compat: lanes without a type field get type: 'crew'
              const migratedLanes = parsed.lanes.map((ln) => ln.type ? ln : { ...ln, type: 'crew' });
              setLanes(migratedLanes);
              setSchedule(parsed.schedule);
              setDriveTimeByCrew(parsed.driveTimeByCrew || {});
              if (Array.isArray(parsed.pmGroups) && parsed.pmGroups.length > 0) {
                setPmGroups(parsed.pmGroups);
              }
              setFinalized(false);
              setUndoStack([]);
              setRedoStack([]);
              return;
            }
          } catch (_) {}
        }

        // No saved data — reset to defaults
        if (!cancelled) {
          const { pmGroups: pg, lanes: ln } = dispatchTeamService.getDefaults();
          setPmGroups(pg);
          setLanes(ln);
          const s = { unassigned: [] };
          ln.forEach((l) => { s[l.id] = []; });
          setSchedule(s);
          setDriveTimeByCrew({});
          setFinalized(false);
          setUndoStack([]);
          setRedoStack([]);
        }
      } catch (err) {
        console.error('Failed to load schedule:', err);
      }
    };
    load();

    return () => { cancelled = true; };
  }, [dateKey, teamsLoaded]);

  // ─── Merge pre-scheduled items (e.g., inspections from Job Files) ─────────
  // Reset merged IDs when date changes so items load fresh for each day
  useEffect(() => {
    mergedScheduleIdsRef.current = new Set();
  }, [dateKey]);

  useEffect(() => {
    if (!teamsLoaded || lanes.length === 0) return;
    let cancelled = false;

    const mergePreScheduled = async () => {
      try {
        const dateStr = dateToString(date);
        const { data: preScheduled, error } = await supabase
          .from('job_schedules')
          .select(`
            *,
            jobs(id, job_number, status,
              customers(name),
              properties(address1, city, state)
            )
          `)
          .eq('scheduled_date', dateStr)
          .in('status', ['scheduled', 'confirmed']);

        if (cancelled || error || !preScheduled?.length) return;

        // Filter out any items we've already merged this session
        const brandNew = preScheduled.filter(ps => !mergedScheduleIdsRef.current.has(ps.id));
        if (brandNew.length === 0) return;

        // Mark all as merged BEFORE updating state (no ref mutation inside updater)
        brandNew.forEach(ps => mergedScheduleIdsRef.current.add(ps.id));

        // Also check current board state for items loaded from a saved schedule
        const currentSchedule = scheduleRef.current;
        const existingJobIds = new Set();
        const existingJobNumbers = new Set();
        Object.values(currentSchedule).forEach(jobs => {
          if (!Array.isArray(jobs)) return;
          jobs.forEach(j => {
            if (j.dbJobId) existingJobIds.add(j.dbJobId);
            if (j.jobNumber) existingJobNumbers.add(j.jobNumber.trim().toLowerCase());
          });
        });

        const newItems = brandNew.filter(ps => {
          if (ps.job_id && existingJobIds.has(ps.job_id)) return false;
          const jn = ps.jobs?.job_number?.trim().toLowerCase();
          if (jn && existingJobNumbers.has(jn)) return false;
          return true;
        });

        if (newItems.length === 0) return;

        // Build the dispatch job objects outside the updater
        const itemsToAdd = newItems.map(ps => {
          const jobData = ps.jobs;
          const customerName = jobData?.customers?.name || '';
          const addr = jobData?.properties
            ? [jobData.properties.address1, jobData.properties.city, jobData.properties.state].filter(Boolean).join(', ')
            : '';

          const techName = (ps.technician_name || '').trim().toUpperCase();
          const matchedLane = lanes.find(l =>
            l.name.trim().toUpperCase() === techName
          );

          return {
            laneId: matchedLane?.id || 'unassigned',
            job: {
              id: crypto.randomUUID(),
              jobType: 'walkthrough',
              hours: (ps.duration_minutes || 60) / 60,
              jobNumber: jobData?.job_number || '',
              customer: customerName,
              address: addr,
              dbJobId: ps.job_id || null,
              preScheduled: true,
              preScheduledId: ps.id,
              preScheduledTime: ps.scheduled_time,
              preScheduledNotes: ps.notes,
            },
          };
        });

        setSchedule(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => { next[k] = [...(next[k] || [])]; });

          itemsToAdd.forEach(({ laneId, job }) => {
            if (!next[laneId]) next[laneId] = [];
            next[laneId].push(job);
          });

          return next;
        });
      } catch (err) {
        console.warn('Failed to merge pre-scheduled items:', err);
      }
    };

    // Small delay to let the main schedule load first
    const t = setTimeout(mergePreScheduled, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [dateKey, teamsLoaded, lanes]);

  // ─── Auto-save to Supabase (debounced) ────────────────────────────────────
  useEffect(() => {
    if (!teamsLoaded || lanes.length === 0) return;
    const t = setTimeout(() => {
      const payload = { schedule, lanes, driveTimeByCrew, pmGroups };
      // Save to localStorage as cache
      try { localStorage.setItem(dateKey, JSON.stringify(payload)); } catch (_) {}
      // Save to Supabase
      dispatchScheduleService.save(date, payload, userId).catch((err) => {
        console.warn('Auto-save to Supabase failed:', err.message);
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [schedule, lanes, driveTimeByCrew, pmGroups, dateKey, teamsLoaded, userId]);

  // ─── Conflict detection ───────────────────────────────────────────────────
  useEffect(() => {
    setConflicts(detectConflicts(schedule, lanes, driveTimeByCrew));
  }, [schedule, lanes, driveTimeByCrew]);

  // ─── Sorted columns: all PMs first (in order), then all Crew Chiefs (in order) ─
  const scheduleColumns = useMemo(() => {
    const pmLanes = [];
    const crewLanes = [];
    // Walk pmGroups in order to preserve PM ordering
    pmGroups.forEach((group, pmIdx) => {
      const pmLane = lanes.find((l) => l.type === 'pm' && l.name.toLowerCase() === group.pm.toLowerCase());
      if (pmLane) pmLanes.push(pmLane);
      group.crews.forEach((crewName) => {
        const crewLane = lanes.find((l) => l.type === 'crew' && l.name.toLowerCase() === crewName.toLowerCase());
        if (crewLane) crewLanes.push(crewLane);
      });
    });
    // Any remaining lanes not matched above
    const used = new Set([...pmLanes, ...crewLanes].map((l) => l.id));
    const rest = lanes.filter((l) => !used.has(l.id));
    return [...pmLanes, ...crewLanes, ...rest];
  }, [lanes, pmGroups]);

  const pmHeaderGroups = useMemo(() => {
    // No team grouping — return a single flat span across all columns
    return [];
  }, [scheduleColumns, pmGroups]);

  // ─── Undo/Redo ────────────────────────────────────────────────────────────

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => {
      const snapshot = { schedule: scheduleRef.current, driveTimeByCrew };
      const next = [...prev, snapshot];
      if (next.length > 30) next.shift();
      return next;
    });
    setRedoStack([]);
  }, [driveTimeByCrew]);

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const snapshot = next.pop();
      setRedoStack((r) => [...r, { schedule: scheduleRef.current, driveTimeByCrew }]);
      setSchedule(snapshot.schedule);
      setDriveTimeByCrew(snapshot.driveTimeByCrew);
      return next;
    });
  }, [driveTimeByCrew]);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const snapshot = next.pop();
      setUndoStack((u) => [...u, { schedule: scheduleRef.current, driveTimeByCrew }]);
      setSchedule(snapshot.schedule);
      setDriveTimeByCrew(snapshot.driveTimeByCrew);
      return next;
    });
  }, [driveTimeByCrew]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // ─── Job CRUD ─────────────────────────────────────────────────────────────

  const updateJob = useCallback((crewId, jobIndex, field, value) => {
    pushUndo();
    setSchedule((prev) => {
      const next = { ...prev };
      next[crewId] = [...(next[crewId] || [])];
      next[crewId][jobIndex] = { ...next[crewId][jobIndex], [field]: value };
      if (field === 'jobType') {
        const type = JOB_TYPES.find((t) => t.value === value);
        if (type) next[crewId][jobIndex].hours = type.hours;
      }
      // Allow per-job hour overrides — don't overwrite if field is 'hours'
      if (field === 'jobNumber' && value) {
        const match = jobsDatabase.find((j) =>
          (j.job_number || '').toLowerCase().includes(String(value).toLowerCase())
        );
        if (match) {
          next[crewId][jobIndex].customer = match.customer_name || '';
          next[crewId][jobIndex].address = match.property_address || '';
          next[crewId][jobIndex].dbJobId = match.id;
        }
      }
      return next;
    });
  }, [jobsDatabase, pushUndo]);

  const addJob = useCallback((crewId) => {
    pushUndo();
    setSchedule((prev) => ({
      ...prev,
      [crewId]: [...(prev[crewId] || []), createEmptyJob()],
    }));
  }, [pushUndo]);

  const removeJob = useCallback((crewId, jobIndex) => {
    pushUndo();
    setSchedule((prev) => ({
      ...prev,
      [crewId]: (prev[crewId] || []).filter((_, i) => i !== jobIndex),
    }));
  }, [pushUndo]);

  const moveJobToUnassigned = useCallback((laneId, jobIndex) => {
    pushUndo();
    setSchedule((prev) => {
      const jobs = prev[laneId] || [];
      const job = jobs[jobIndex];
      if (!job) return prev;
      return {
        ...prev,
        [laneId]: jobs.filter((_, i) => i !== jobIndex),
        unassigned: [...(prev.unassigned || []), job],
      };
    });
  }, [pushUndo]);

  /** Copy a job to a PM lane (keeps original in source lane, adds copy with new ID to target).
   *  If startHour is provided, pin the copy to that time so PM and crew are at the same slot. */
  const copyJobToLane = useCallback((targetLaneId, job, startHour) => {
    pushUndo();
    const copy = { ...job, id: crypto.randomUUID() };
    if (startHour != null) copy.fixedStartHour = startHour;
    setSchedule((prev) => {
      const existing = prev[targetLaneId] || [];
      // Insert in sorted order by fixedStartHour so the grid lays them out chronologically
      const updated = [...existing, copy].sort((a, b) => {
        const aTime = a.fixedStartHour ?? -1;
        const bTime = b.fixedStartHour ?? -1;
        return aTime - bTime;
      });
      return { ...prev, [targetLaneId]: updated };
    });
  }, [pushUndo]);

  const totalHours = useCallback((crewId) => {
    return (schedule[crewId] || []).reduce((sum, j) => sum + (Number(j.hours) || 0), 0);
  }, [schedule]);

  // ─── Finalize ─────────────────────────────────────────────────────────────

  const finalizeSchedule = useCallback(async () => {
    setSaving(true);
    setSaveError('');
    try {
      const payload = { schedule, lanes, driveTimeByCrew, pmGroups };
      await dispatchScheduleService.finalize(date, payload, userId);
      setFinalized(true);
    } catch (err) {
      setSaveError(err?.message || 'Failed to finalize schedule');
    } finally {
      setSaving(false);
    }
  }, [schedule, lanes, driveTimeByCrew, pmGroups, date, userId]);

  // ─── Date navigation ─────────────────────────────────────────────────────

  const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const formatDayShort = (d) => d.toLocaleDateString('en-US', { weekday: 'short' });
  const formatMd = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const startOfWeekMonday = (d) => {
    const n = new Date(d);
    const day = n.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    n.setDate(n.getDate() + diff);
    n.setHours(0, 0, 0, 0);
    return n;
  };

  const weekDates = useMemo(() => {
    const start = startOfWeekMonday(date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [date]);

  const weekLabel = useMemo(() => {
    return `Week of ${formatMd(weekDates[0])} – ${formatMd(weekDates[6])}`;
  }, [weekDates]);

  const goPrev = () => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() - (rangeMode === 'week' ? 7 : 1)); return n; });
  const goNext = () => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() + (rangeMode === 'week' ? 7 : 1)); return n; });
  const goToday = () => setDate(new Date());

  // ─── Week snapshots (from Supabase or localStorage) ───────────────────────
  const [weekSnapshots, setWeekSnapshots] = useState([]);

  useEffect(() => {
    if (rangeMode !== 'week') return;
    let cancelled = false;

    const loadWeek = async () => {
      const snapshots = [];
      try {
        const dbRows = await dispatchScheduleService.loadRange(weekDates[0], weekDates[6]);
        const dbByDate = new Map(dbRows.map((r) => [r.schedule_date, r.schedule_data]));

        for (const d of weekDates) {
          const dStr = dateToString(d);
          const key = dateToKey(d);
          let payload = dbByDate.get(dStr) || null;

          // Fallback to localStorage
          if (!payload) {
            try {
              const saved = localStorage.getItem(key);
              if (saved) payload = JSON.parse(saved);
            } catch (_) {}
          }

          const lanesForDay = Array.isArray(payload?.lanes) ? payload.lanes : [];
          const scheduleForDay = payload?.schedule && typeof payload.schedule === 'object' ? payload.schedule : {};
          const driveForDay = payload?.driveTimeByCrew && typeof payload.driveTimeByCrew === 'object' ? payload.driveTimeByCrew : {};
          const jobsByCrewName = {};

          lanesForDay.forEach((lane) => {
            const crewName = String(lane?.name || '').replace(/\s+/g, ' ').trim();
            if (!crewName) return;
            const jobs = Array.isArray(scheduleForDay[lane.id]) ? scheduleForDay[lane.id] : [];
            const drive = driveForDay[lane.id] ?? null;
            jobsByCrewName[crewName] = { jobs, drive };
          });

          const unassignedJobs = Array.isArray(scheduleForDay.unassigned) ? scheduleForDay.unassigned : [];
          snapshots.push({ date: d, key, jobsByCrewName, unassignedJobs });
        }
      } catch (err) {
        console.error('Failed to load week snapshots:', err);
      }
      if (!cancelled) setWeekSnapshots(snapshots);
    };
    loadWeek();

    return () => { cancelled = true; };
  }, [rangeMode, weekDates]);

  return {
    // State
    date, setDate, rangeMode, setRangeMode,
    lanes, setLanes, pmGroups, setPmGroups,
    schedule, setSchedule, driveTimeByCrew, setDriveTimeByCrew,
    jobsDatabase, saving, saveError, finalized,
    conflicts,
    // Computed
    scheduleColumns, pmHeaderGroups, dateKey, weekDates, weekLabel, weekSnapshots,
    scheduleRef, lanesRef,
    // Actions
    goPrev, goNext, goToday,
    updateJob, addJob, removeJob, moveJobToUnassigned, copyJobToLane,
    totalHours, finalizeSchedule, pushUndo,
    // Undo/Redo
    undo, redo, canUndo, canRedo,
    // Formatters
    formatDate, formatDayShort, formatMd,
  };
}
