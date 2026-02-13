import React, { useState, useEffect, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { supabase } from '../services/supabaseClient';
import { geocodeAddress } from '../services/geocodingService';
import { getTravelTimeMatrix, nearestNeighborOrder, MAX_POINTS_PER_REQUEST } from '../services/distanceMatrixService';
import DispatchExcelUpload from '../components/dispatch/DispatchExcelUpload';
import { hoursForJobType } from '../config/dispatchJobDurations';
import './Page.css';
import './DispatchAndScheduling.css';

const LANE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16',
  '#f43f5e', '#fb923c', '#a3e635', '#2dd4bf',
];
const UNASSIGNED = { id: 'unassigned', name: 'Unassigned', color: '#64748b' };

// Colors assigned to PM groups
const PM_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

// Default PM → Crew Chief mapping (mirrors Storm org chart).
// This is the initial value before any Excel is uploaded. Once Excel with a PM column
// is uploaded, the pmGroups state is rebuilt dynamically from the spreadsheet data.
const DEFAULT_PM_GROUPS = [
  { pm: 'Kevin', title: 'Sr. Production Manager', color: PM_COLORS[0], crews: ['Gabriel', 'David', 'Michael'] },
  { pm: 'Leo', title: 'Production Manager', color: PM_COLORS[1], crews: ['Ramon', 'Roger'] },
  { pm: 'Aaron', title: 'Production Manager', color: PM_COLORS[2], crews: ['Pedro', 'Monica'] },
];

// Build default lanes from the default PM groups
const DEFAULT_LANES = [];
let _laneIdx = 0;
DEFAULT_PM_GROUPS.forEach((pmGroup) => {
  pmGroup.crews.forEach((crewName) => {
    DEFAULT_LANES.push({ id: `crew-${_laneIdx}`, name: crewName, color: LANE_COLORS[_laneIdx % LANE_COLORS.length] });
    _laneIdx++;
  });
});

/** Find the PM entry for a crew chief name (case-insensitive, against a given pmGroups array) */
function findPmForCrew(crewName, pmGroups) {
  const lower = (crewName || '').toLowerCase().trim();
  for (const pm of pmGroups) {
    if (pm.crews.some((c) => c.toLowerCase() === lower)) return pm;
  }
  return null;
}

const JOB_TYPES = [
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
];

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function createEmptyJob() {
  return {
    id: crypto.randomUUID(),
    jobType: '',
    hours: 0,
    jobNumber: '',
    customer: '',
    address: '',
  };
}

// 8:30 AM to 5:00 PM in 30-minute increments (decimal hours)
const DAY_START = 8.5;
const DAY_END = 17;
const SLOT_INTERVAL = 0.5;
const TIME_SLOTS = [];
for (let h = DAY_START; h <= DAY_END; h += SLOT_INTERVAL) {
  TIME_SLOTS.push(h);
}

function hourToLabel(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

function formatDriveTime(seconds) {
  if (seconds == null || seconds < 0) return '—';
  const totalM = Math.round(seconds / 60);
  if (totalM < 60) return `${totalM} min`;
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;
  return m ? `${h}h ${m} min` : `${h}h`;
}

/** Extract total drive seconds — handles both old (number) and new ({ total, legs }) format */
function getDriveTotal(val) {
  if (typeof val === 'number') return val;
  return val?.total ?? 0;
}
/** Extract per-leg drive seconds array */
function getDriveLegs(val) {
  return Array.isArray(val?.legs) ? val.legs : [];
}

/** Squared Euclidean distance for lat/lng — fast proxy for real distance */
function sqDist(a, b) {
  if (!a || !b) return Infinity;
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
}

/**
 * Cheapest-insertion heuristic: find the route index where inserting a new
 * job adds the least additional distance. Returns the best index (0..N).
 *   Route: depot → j0 → j1 → ... → jN → depot
 *   For each candidate slot i (0..N) compute the "detour cost":
 *     cost(i) = dist(prev, new) + dist(new, next) − dist(prev, next)
 *   and pick the smallest.
 */
function findBestInsertionIndex(existingJobs, newJob, depotCoords) {
  if (newJob.latitude == null || newJob.longitude == null) return existingJobs.length;
  const newPt = { lat: newJob.latitude, lng: newJob.longitude };
  const depot = depotCoords;
  const N = existingJobs.length;
  if (N === 0) return 0;
  const jobPts = existingJobs.map((j) =>
    j.latitude != null && j.longitude != null ? { lat: j.latitude, lng: j.longitude } : null
  );
  let bestIdx = N;
  let bestCost = Infinity;
  for (let i = 0; i <= N; i++) {
    const prev = i === 0 ? depot : jobPts[i - 1];
    const next = i === N ? depot : jobPts[i];
    if (!prev || !next) continue;
    const cost = sqDist(prev, newPt) + sqDist(newPt, next) - sqDist(prev, next);
    if (cost < bestCost) {
      bestCost = cost;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function DispatchAndScheduling() {
  const [date, setDate] = useState(() => new Date());
  const [rangeMode, setRangeMode] = useState('day'); // 'day' | 'week'
  const [lanes, setLanes] = useState(() => [...DEFAULT_LANES]);
  const [pmGroups, setPmGroups] = useState(() => [...DEFAULT_PM_GROUPS]);

  // Sort lanes so crews under the same PM are adjacent (PM group order preserved)
  const scheduleColumns = useMemo(() => {
    return [...lanes].sort((a, b) => {
      const pmA = findPmForCrew(a.name, pmGroups);
      const pmB = findPmForCrew(b.name, pmGroups);
      const pmIdxA = pmA ? pmGroups.indexOf(pmA) : pmGroups.length;
      const pmIdxB = pmB ? pmGroups.indexOf(pmB) : pmGroups.length;
      if (pmIdxA !== pmIdxB) return pmIdxA - pmIdxB;
      if (pmA && pmA === pmB) {
        const crewIdxA = pmA.crews.findIndex((c) => c.toLowerCase() === (a.name || '').toLowerCase().trim());
        const crewIdxB = pmA.crews.findIndex((c) => c.toLowerCase() === (b.name || '').toLowerCase().trim());
        return crewIdxA - crewIdxB;
      }
      return 0;
    });
  }, [lanes, pmGroups]);

  // Compute PM header groups for the spanning row above crew chiefs
  const pmHeaderGroups = useMemo(() => {
    const groups = [];
    scheduleColumns.forEach((col) => {
      const pm = findPmForCrew(col.name, pmGroups);
      const pmKey = pm?.pm || null;
      if (groups.length > 0 && groups[groups.length - 1].pmKey === pmKey) {
        groups[groups.length - 1].colSpan += 1;
      } else {
        groups.push({
          pmKey,
          pm: pm?.pm || null,
          title: pm?.title || '',
          color: pm?.color || '#64748b',
          colSpan: 1,
        });
      }
    });
    return groups;
  }, [scheduleColumns, pmGroups]);
  const [schedule, setSchedule] = useState(() => {
    const s = {};
    DEFAULT_LANES.forEach((c) => { s[c.id] = []; });
    s.unassigned = [];
    return s;
  });
  const [jobsDatabase, setJobsDatabase] = useState([]);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [visibleCrews, setVisibleCrews] = useState({});
  const HOME_OFFICE = '2550 TN-109, Lebanon, TN 37090';
  const FALLBACK_DEPOT_COORDS = { lat: 36.2081, lng: -86.2911 };
  const depotAddress = import.meta.env.VITE_DISPATCH_DEPOT_ADDRESS || HOME_OFFICE;

  const getDepotCoords = async (depot) => {
    if (!depot?.trim()) return null;
    if (!window.google?.maps?.Geocoder) return null;
    let coords = await geocodeAddress(depot.trim());
    if (!coords && !depot.trim().endsWith(', USA')) {
      coords = await geocodeAddress(depot.trim() + ', USA');
    }
    if (!coords && depot.trim() === HOME_OFFICE) {
      coords = FALLBACK_DEPOT_COORDS;
    }
    return coords;
  };
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState('');
  const [optimizeProgress, setOptimizeProgress] = useState(null);
  const [driveTimeByCrew, setDriveTimeByCrew] = useState(() => ({}));
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const scheduleRef = useRef(schedule);
  const lanesRef = useRef(lanes);
  scheduleRef.current = schedule;
  lanesRef.current = lanes;

  // Detect the globally-loaded Google Maps API from index.html
  const [isLoaded, setIsLoaded] = useState(() => !!(window.google && window.google.maps));
  useEffect(() => {
    if (isLoaded) return;
    if (window.google && window.google.maps) { setIsLoaded(true); return; }
    const check = setInterval(() => {
      if (window.google && window.google.maps) { setIsLoaded(true); clearInterval(check); }
    }, 200);
    return () => clearInterval(check);
  }, [isLoaded]);

  // Raw Google Maps refs for the map view
  const mapDivRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const infoWindowRef = useRef(null);

  const jobsWithCoords = useMemo(() => {
    const list = [];
    scheduleColumns.forEach((col) => {
      (schedule[col.id] || []).forEach((job) => {
        if (job.latitude != null && job.longitude != null) {
          list.push({ ...job, crewName: col.name, crewColor: col.color });
        }
      });
    });
    (schedule.unassigned || []).forEach((job) => {
      if (job.latitude != null && job.longitude != null) {
        list.push({ ...job, crewName: 'Unassigned', crewColor: UNASSIGNED.color });
      }
    });
    return list;
  }, [schedule, scheduleColumns]);

  // Route paths per crew for map polylines (depot -> job1 -> job2 -> ... -> depot)
  const routePaths = useMemo(() => {
    const depot = FALLBACK_DEPOT_COORDS;
    return scheduleColumns.map((col) => {
      const jobs = (schedule[col.id] || []).filter((j) => j.latitude != null && j.longitude != null);
      if (jobs.length === 0) return null;
      const path = [depot, ...jobs.map((j) => ({ lat: j.latitude, lng: j.longitude })), depot];
      return { crewId: col.id, crewName: col.name, color: col.color, path };
    }).filter(Boolean);
  }, [schedule, scheduleColumns]);

  // For time-grid: each crew gets job placements (startRowIndex, rowSpan, job, startHour, endHour)
  // Drive time between jobs is inserted as cursor gaps and tracked for display
  // Jobs that would start at or after 5 PM are tracked as overflow (not drawn in grid)
  const { crewJobPlacements, overflowJobs } = useMemo(() => {
    const placements = {};
    const overflow = [];
    scheduleColumns.forEach((col) => {
      const jobs = schedule[col.id] || [];
      const legs = getDriveLegs(driveTimeByCrew[col.id]);
      let cursor = DAY_START;
      let jobIdx = 0; // tracks which leg to use
      placements[col.id] = [];
      jobs.forEach((job) => {
        const hours = Number(job.hours) || 0;
        if (hours <= 0) { jobIdx++; return; }

        // Add preceding drive time (depot→first or prev→this)
        const legSec = legs[jobIdx] || 0;
        const driveHours = legSec / 3600;
        const preDriveMin = Math.round(legSec / 60);
        cursor += driveHours;

        const startHour = cursor;
        const endHour = cursor + hours;
        cursor = endHour;
        jobIdx++;

        if (startHour >= DAY_END) {
          overflow.push({ crew: col, job });
          return;
        }
        const endHourCapped = Math.min(endHour, DAY_END);
        const startRowIndex = TIME_SLOTS.findIndex((t) => t >= startHour - 0.01);
        const rowsNeeded = Math.ceil((endHourCapped - startHour) / SLOT_INTERVAL);
        const lastRowIndex = TIME_SLOTS.length - 1;
        const rowSpan = startRowIndex >= 0 ? Math.min(Math.max(1, rowsNeeded), lastRowIndex - startRowIndex + 1) : 1;
        if (startRowIndex >= 0 && rowSpan >= 1) {
          placements[col.id].push({
            job,
            startHour,
            endHour: endHourCapped,
            startRowIndex,
            rowSpan,
            preDriveMin, // minutes of drive time before this job
          });
        }
      });
    });
    return { crewJobPlacements: placements, overflowJobs: overflow };
  }, [schedule, driveTimeByCrew, scheduleColumns]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('id, job_number, customer_name, property_address')
          .limit(100);
        if (error) {
          console.error('Failed to load jobs database:', error);
        } else if (data) {
          setJobsDatabase(data);
        }
      } catch (err) {
        console.error('Jobs database fetch error:', err);
      }
    };
    load();
  }, []);

  // localStorage persistence keyed by date
  const dateToKey = (d) => (
    `dispatch-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  );
  const dateKey = useMemo(() => {
    const d = date;
    return dateToKey(d);
  }, [date]);

  // Load from localStorage when date changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(dateKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lanes && Array.isArray(parsed.lanes) && parsed.schedule) {
          // Merge in any newly-added default crew lanes (ex: adding "Roger" under Leo)
          const nextPmGroups = Array.isArray(parsed.pmGroups) && parsed.pmGroups.length > 0
            ? parsed.pmGroups.map((g) => ({ ...g, crews: Array.isArray(g.crews) ? [...g.crews] : [] }))
            : [...DEFAULT_PM_GROUPS].map((g) => ({ ...g, crews: [...g.crews] }));
          const leoGroup = nextPmGroups.find((g) => String(g?.pm || '').toLowerCase() === 'leo');
          if (leoGroup && Array.isArray(leoGroup.crews)) {
            const hasRoger = leoGroup.crews.some((c) => String(c || '').toLowerCase().trim() === 'roger');
            if (!hasRoger) leoGroup.crews.push('Roger');
          }

          const lanesIn = parsed.lanes;
          const scheduleIn = parsed.schedule;
          const driveIn = parsed.driveTimeByCrew || {};

          const hasRogerLane = lanesIn.some((l) => String(l?.name || '').toLowerCase().trim() === 'roger');
          if (hasRogerLane) {
            setLanes(lanesIn);
            setSchedule(scheduleIn);
            setDriveTimeByCrew(driveIn);
            setPmGroups(nextPmGroups);
            return;
          }

          // Add lane with a new, non-colliding crew-N id
          const maxIdx = lanesIn.reduce((max, l) => {
            const m = String(l?.id || '').match(/^crew-(\d+)$/);
            if (!m) return max;
            const n = Number(m[1]);
            return Number.isFinite(n) ? Math.max(max, n) : max;
          }, -1);
          const nextIdx = maxIdx + 1;
          const newLane = { id: `crew-${nextIdx}`, name: 'Roger', color: LANE_COLORS[nextIdx % LANE_COLORS.length] };
          const nextLanes = [...lanesIn, newLane];
          const nextSchedule = { ...scheduleIn, [newLane.id]: scheduleIn?.[newLane.id] || [] };

          setLanes(nextLanes);
          setSchedule(nextSchedule);
          setDriveTimeByCrew(driveIn);
          setPmGroups(nextPmGroups);
          return;
        }
      }
    } catch (_) {}
    // Reset to defaults if nothing saved
    const s = {};
    DEFAULT_LANES.forEach((c) => { s[c.id] = []; });
    s.unassigned = [];
    setLanes([...DEFAULT_LANES]);
    setPmGroups([...DEFAULT_PM_GROUPS]);
    setSchedule(s);
    setDriveTimeByCrew({});
  }, [dateKey]);

  // Save to localStorage when schedule/lanes/drive times/pmGroups change
  useEffect(() => {
    if (optimizing) return;
    try {
      const payload = { schedule, lanes, driveTimeByCrew, pmGroups };
      localStorage.setItem(dateKey, JSON.stringify(payload));
    } catch (_) {}
  }, [schedule, lanes, driveTimeByCrew, pmGroups, dateKey, optimizing]);

  // Structural hash of schedule: only triggers re-estimation when job IDs or
  // lane assignments change, not when job fields (customer, address, etc.) change.
  const scheduleStructureKey = useMemo(() => {
    const parts = Object.entries(schedule).map(([lane, jobs]) =>
      `${lane}:${(jobs || []).map(j => j.id).join(',')}`
    );
    return parts.sort().join('|');
  }, [schedule]);

  useEffect(() => {
    if (optimizing) return;
    const t = setTimeout(() => {
      runEstimateWithRefs();
    }, 800);
    return () => clearTimeout(t);
  }, [scheduleStructureKey, lanes]);

  useEffect(() => {
    if (!isLoaded) return;
    const t = setTimeout(() => runEstimateWithRefs(), 500);
    return () => clearTimeout(t);
  }, [isLoaded]);

  const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const formatDayShort = (d) => d.toLocaleDateString('en-US', { weekday: 'short' });
  const formatMd = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const startOfWeekMonday = (d) => {
    const n = new Date(d);
    const day = n.getDay(); // 0=Sun..6=Sat
    const diff = (day === 0 ? -6 : 1 - day); // Monday start
    n.setDate(n.getDate() + diff);
    n.setHours(0, 0, 0, 0);
    return n;
  };
  const weekDates = useMemo(() => {
    const start = startOfWeekMonday(date);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [date]);
  const weekLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `Week of ${formatMd(start)} – ${formatMd(end)}`;
  }, [weekDates]);

  const goPrev = () => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() - (rangeMode === 'week' ? 7 : 1)); return n; });
  const goNext = () => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() + (rangeMode === 'week' ? 7 : 1)); return n; });
  const goToday = () => setDate(new Date());

  useEffect(() => {
    if (rangeMode === 'week' && viewMode === 'map') setViewMode('table');
  }, [rangeMode, viewMode]);

  const weekSnapshots = useMemo(() => {
    return weekDates.map((d) => {
      const key = dateToKey(d);
      let payload = null;
      try {
        const saved = localStorage.getItem(key);
        if (saved) payload = JSON.parse(saved);
      } catch (_) {}

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

      return { date: d, key, jobsByCrewName, unassignedJobs };
    });
  }, [weekDates]);

  const weekCrewRows = useMemo(() => {
    const allNamesSet = new Set();
    weekSnapshots.forEach((s) => {
      Object.keys(s.jobsByCrewName || {}).forEach((name) => {
        const n = String(name || '').replace(/\s+/g, ' ').trim();
        if (n) allNamesSet.add(n);
      });
    });
    const allNames = Array.from(allNamesSet);

    // Alias rule: if a single-token name exists (e.g. "Gabriel") and a longer name
    // starting with "Gabriel " exists in the same week (e.g. "Gabriel Smith"),
    // collapse the short name into the longest matching full name.
    const alias = new Map(); // original -> canonical
    allNames.forEach((n) => alias.set(n, n));
    allNames.forEach((n) => {
      const trimmed = n.trim();
      if (!trimmed || /\s/.test(trimmed)) return; // only single-token names
      const lower = trimmed.toLowerCase();
      const candidates = allNames.filter((m) => m.toLowerCase().startsWith(lower + ' ') && /\s/.test(m));
      if (candidates.length === 0) return;
      const best = [...candidates].sort((a, b) => b.length - a.length)[0];
      alias.set(n, best);
    });

    const canonicalToSources = new Map();
    allNames.forEach((n) => {
      const canonical = alias.get(n) || n;
      if (!canonicalToSources.has(canonical)) canonicalToSources.set(canonical, []);
      canonicalToSources.get(canonical).push(n);
    });

    return Array.from(canonicalToSources.entries())
      .map(([canonical, sources]) => ({
        canonical,
        sources: sources.sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.canonical.localeCompare(b.canonical));
  }, [weekSnapshots]);

  const buildOnePageSchedulePdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 32;
    const colGap = 20;
    const cols = 2;
    const colWidth = (pageWidth - margin * 2 - colGap * (cols - 1)) / cols;

    const title = `Dispatch Schedule — ${formatDate(date)}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, margin, 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, margin, 44);
    doc.setTextColor(0);

    const crews = [
      ...scheduleColumns.map((c) => ({ id: c.id, name: c.name, color: c.color })),
      { id: 'unassigned', name: 'Unassigned', color: UNASSIGNED.color },
    ];

    const lineH = 11;
    const blockGap = 10;
    let col = 0;
    let x = margin;
    let y = 58;

    const moveToNextColumn = () => {
      col += 1;
      if (col >= cols) return false;
      x = margin + col * (colWidth + colGap);
      y = 58;
      return true;
    };

    const fitBlock = (neededHeight) => {
      if (y + neededHeight <= pageHeight - margin) return true;
      return moveToNextColumn();
    };

    const ellipsize = (s, maxLen = 70) => {
      const str = String(s || '').trim();
      if (!str) return '';
      if (str.length <= maxLen) return str;
      return str.slice(0, Math.max(0, maxLen - 1)).trimEnd() + '…';
    };

    const buildCrewLines = (crewId) => {
      const jobs = schedule[crewId] || [];
      const legs = getDriveLegs(driveTimeByCrew[crewId]);
      let cursor = DAY_START;
      let jobIdx = 0;
      const lines = [];
      jobs.forEach((job) => {
        const hours = Number(job.hours) || 0;
        const legSec = legs[jobIdx] || 0;
        cursor += (legSec / 3600);
        const startHour = cursor;
        const endHour = cursor + hours;
        cursor = endHour;
        jobIdx++;

        const time = hours > 0 ? `${hourToLabel(startHour)}–${hourToLabel(endHour)}` : '—';
        const jobNum = job.jobNumber ? String(job.jobNumber).trim() : '—';
        const cust = job.customer ? String(job.customer).trim() : '';
        const type = job.jobType ? String(job.jobType).trim() : '';
        const meta = [type, hours > 0 ? `${hours}h` : ''].filter(Boolean).join(' · ');
        const text = `${time}  ${jobNum}  ${ellipsize(cust, 34)}${meta ? `  (${meta})` : ''}`;
        lines.push(text);
      });
      return lines;
    };

    for (const crew of crews) {
      const isUnassigned = crew.id === 'unassigned';
      const jobs = schedule[crew.id] || [];
      if (!jobs.length) continue;

      const header = `${crew.name} — Working: ${totalHours(crew.id).toFixed(1)}h${isUnassigned ? '' : ` · Drive: ${formatDriveTime(getDriveTotal(driveTimeByCrew[crew.id]))}`}`;
      const lines = buildCrewLines(crew.id);

      // Build wrapped lines (ensure we stay one-page by truncating if needed)
      const wrapped = [];
      const maxTextWidth = colWidth - 14;
      lines.forEach((ln) => {
        const parts = doc.splitTextToSize(ln, maxTextWidth);
        wrapped.push(...parts);
      });

      const maxLinesForThisBlock = 18; // keeps blocks compact to fit one page
      const visible = wrapped.slice(0, maxLinesForThisBlock);
      const truncatedCount = Math.max(0, wrapped.length - visible.length);

      const blockHeight = (2 * lineH) + (visible.length * lineH) + (truncatedCount ? lineH : 0) + blockGap;
      if (!fitBlock(blockHeight)) break; // no more room on the one-page PDF

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(header, x, y);
      y += lineH + 2;

      // Lines
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      visible.forEach((t) => {
        doc.text(String(t), x + 10, y);
        y += lineH;
      });
      if (truncatedCount) {
        doc.setTextColor(120);
        doc.text(`… +${truncatedCount} more`, x + 10, y);
        doc.setTextColor(0);
        y += lineH;
      }
      y += blockGap;
    }

    const safeDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const filename = `dispatch-schedule-${safeDate}.pdf`;
    return { doc, filename, title };
  };

  const exportOnePagePdf = () => {
    const { doc, filename } = buildOnePageSchedulePdf();
    doc.save(filename);
  };

  const buildScheduleEmailBodies = () => {
    const title = `Dispatch Schedule — ${formatDate(date)}`;
    const generated = `Generated: ${new Date().toLocaleString('en-US')}`;
    const crews = [
      ...scheduleColumns.map((c) => ({ id: c.id, name: c.name })),
      { id: 'unassigned', name: 'Unassigned' },
    ];

    const lines = [];
    const htmlParts = [];

    lines.push(title);
    lines.push(generated);
    lines.push('');

    htmlParts.push(`<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif;">`);
    htmlParts.push(`<h2 style="margin:0 0 6px 0;">${escapeHtml(title)}</h2>`);
    htmlParts.push(`<div style="color:#555; font-size:12px; margin:0 0 14px 0;">${escapeHtml(generated)}</div>`);

    const renderCrewLines = (crewId) => {
      const jobs = schedule[crewId] || [];
      const legs = getDriveLegs(driveTimeByCrew[crewId]);
      let cursor = DAY_START;
      let jobIdx = 0;
      const out = [];
      jobs.forEach((job) => {
        const hours = Number(job.hours) || 0;
        const legSec = legs[jobIdx] || 0;
        cursor += (legSec / 3600);
        const startHour = cursor;
        const endHour = cursor + hours;
        cursor = endHour;
        jobIdx++;

        const time = hours > 0 ? `${hourToLabel(startHour)}–${hourToLabel(endHour)}` : '—';
        const jobNum = job.jobNumber ? String(job.jobNumber).trim() : '—';
        const cust = job.customer ? String(job.customer).trim() : '';
        const type = job.jobType ? String(job.jobType).trim() : '';
        const meta = [type, hours > 0 ? `${hours}h` : ''].filter(Boolean).join(' · ');
        out.push(`${time}  ${jobNum}  ${cust}${meta ? `  (${meta})` : ''}`.trim());
      });
      return out;
    };

    crews.forEach((crew) => {
      const jobs = schedule[crew.id] || [];
      if (!jobs.length) return;
      const isUnassigned = crew.id === 'unassigned';
      const header = `${crew.name} — Working: ${totalHours(crew.id).toFixed(1)}h${isUnassigned ? '' : ` · Drive: ${formatDriveTime(getDriveTotal(driveTimeByCrew[crew.id]))}`}`;
      const crewLines = renderCrewLines(crew.id);
      lines.push(header);
      crewLines.forEach((ln) => lines.push(`- ${ln}`));
      lines.push('');

      htmlParts.push(`<h3 style="margin:14px 0 6px 0; font-size:14px;">${escapeHtml(header)}</h3>`);
      htmlParts.push('<ul style="margin:0 0 10px 18px; padding:0;">');
      crewLines.forEach((ln) => {
        htmlParts.push(`<li style="margin:0 0 4px 0; font-size:12px;">${escapeHtml(ln)}</li>`);
      });
      htmlParts.push('</ul>');
    });

    htmlParts.push('</div>');

    return {
      bodyText: lines.join('\n'),
      bodyHtml: htmlParts.join(''),
    };
  };

  const openEmailDraft = () => {
    setEmailError('');
    setEmailSuccess('');
    try {
      // Open email draft in the user's default mail app (Outlook, Mail, etc.)
      const subject = `Dispatch Schedule — ${formatDate(date)}`;
      const { bodyText } = buildScheduleEmailBodies();

      // Keep body reasonably short to avoid mailto URL length limits
      const MAX_BODY_CHARS = 3500;
      let clipped = bodyText;
      let note = '';
      if (bodyText.length > MAX_BODY_CHARS) {
        clipped = bodyText.slice(0, MAX_BODY_CHARS);
        note = '\n\n[Schedule truncated for email draft. Full schedule copied to clipboard.]';
        try {
          if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(bodyText);
          }
        } catch (_) {}
      }

      const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(clipped + note)}`;
      window.location.href = mailto;
      setEmailSuccess('Email draft opened.');
    } catch (err) {
      setEmailError(err?.message || 'Failed to open email draft.');
    }
  };

  const updateJob = (crewId, jobIndex, field, value) => {
    setSchedule((prev) => {
      const next = { ...prev };
      next[crewId] = [...(next[crewId] || [])];
      next[crewId][jobIndex] = { ...next[crewId][jobIndex], [field]: value };
      if (field === 'jobType') {
        const type = JOB_TYPES.find((t) => t.value === value);
        if (type) next[crewId][jobIndex].hours = type.hours;
      }
      if (field === 'jobNumber' && value) {
        const match = jobsDatabase.find((j) =>
          (j.job_number || '').toLowerCase().includes(String(value).toLowerCase())
        );
        if (match) {
          next[crewId][jobIndex].customer = match.customer_name || '';
          next[crewId][jobIndex].address = match.property_address || '';
        }
      }
      return next;
    });
  };

  const addJob = (crewId) => {
    setSchedule((prev) => ({
      ...prev,
      [crewId]: [...(prev[crewId] || []), createEmptyJob()],
    }));
  };

  const removeJob = (crewId, jobIndex) => {
    setSchedule((prev) => ({
      ...prev,
      [crewId]: (prev[crewId] || []).filter((_, i) => i !== jobIndex),
    }));
  };

  const moveJobToLane = async (laneId, job) => {
    const report = (step, current, total) => setOptimizeProgress({ step, current, total });
    setOptimizing(true);
    setOptimizeError('');
    setOptimizeProgress(null);
    try {
      // Depot coords (fallback if needed)
      report('geocoding_depot', 0, 0);
      const depot = (depotAddress || '').trim();
      let depotCoords = await getDepotCoords(depot);
      if (!depotCoords) depotCoords = FALLBACK_DEPOT_COORDS;

      // Ensure the newly assigned job is geocoded if possible
      let lat = job.latitude;
      let lng = job.longitude;
      if ((lat == null || lng == null) && job.address?.trim() && window.google?.maps?.Geocoder) {
        try {
          const coords = await geocodeAddress(job.address);
          if (coords) { lat = coords.lat; lng = coords.lng; }
        } catch (_) {}
      }
      const jobWithCoords = { ...job, latitude: lat ?? null, longitude: lng ?? null };

      // Build the full lane list and optimize the *entire* crew route order
      const currentJobs = scheduleRef.current[laneId] || [];
      const laneJobs = [...currentJobs, jobWithCoords];

      const jobsToGeocode = laneJobs.filter((j) =>
        (j.latitude == null || j.longitude == null) && j.address?.trim()
      );
      report('geocoding', 0, jobsToGeocode.length);

      const withCoords = [];
      const withoutCoords = [];
      for (let i = 0; i < laneJobs.length; i++) {
        const j = laneJobs[i];
        let jLat = j.latitude;
        let jLng = j.longitude;
        if ((jLat == null || jLng == null) && j.address?.trim()) {
          report('geocoding', Math.min(i + 1, jobsToGeocode.length), jobsToGeocode.length);
          try {
            const coords = await geocodeAddress(j.address);
            if (coords?.lat != null && coords?.lng != null) {
              jLat = coords.lat;
              jLng = coords.lng;
            }
          } catch (_) {}
        }
        if (jLat != null && jLng != null) {
          withCoords.push({ ...j, latitude: jLat, longitude: jLng });
        } else {
          withoutCoords.push({ ...j, latitude: jLat ?? null, longitude: jLng ?? null });
        }
      }

      // Optimize order using distance matrix (capped to API limit)
      let orderedLaneJobs = [...withCoords, ...withoutCoords];
      let drive = { total: 0, legs: [] };
      if (withCoords.length > 0 && window.google?.maps?.DistanceMatrixService) {
        report('matrix', 0, 0);
        const maxJobsForMatrix = MAX_POINTS_PER_REQUEST - 1;
        const capped = withCoords.slice(0, maxJobsForMatrix);
        const overflowWithCoords = withCoords.slice(maxJobsForMatrix);
        const depotPoint = { lat: depotCoords.lat, lng: depotCoords.lng };
        const points = [depotPoint, ...capped.map((j) => ({ lat: j.latitude, lng: j.longitude }))];
        const crewMatrix = await getTravelTimeMatrix(points);
        report('routes', 1, 1);
        const order = nearestNeighborOrder(crewMatrix);
        const orderedWithCoords = order.map((idx) => capped[idx - 1]).filter(Boolean);
        orderedLaneJobs = [...orderedWithCoords, ...overflowWithCoords, ...withoutCoords];

        // Drive totals/legs in the optimized order (includes return leg)
        let totalDriveSec = 0;
        const legs = [];
        if (order.length > 0) {
          const depotToFirst = (crewMatrix[0][order[0]] ?? 0) || 0;
          legs.push(depotToFirst);
          totalDriveSec += depotToFirst;
          for (let k = 0; k < order.length - 1; k++) {
            const leg = (crewMatrix[order[k]][order[k + 1]] ?? 0) || 0;
            legs.push(leg);
            totalDriveSec += leg;
          }
          const returnLeg = (crewMatrix[order[order.length - 1]][0] ?? 0) || 0;
          legs.push(returnLeg);
          totalDriveSec += returnLeg;
        }
        drive = { total: totalDriveSec, legs };
      }

      setSchedule((prev) => {
        const next = { ...prev };
        next.unassigned = (prev.unassigned || []).filter((j) => j.id !== job.id);
        next[laneId] = orderedLaneJobs;
        return next;
      });
      setDriveTimeByCrew((prev) => ({ ...prev, [laneId]: drive }));
    } catch (err) {
      setOptimizeError(err?.message || 'Optimization failed.');
      // Fall back to simple append if optimization fails
      setSchedule((prev) => {
        const next = { ...prev };
        next.unassigned = (prev.unassigned || []).filter((j) => j.id !== job.id);
        next[laneId] = [...(prev[laneId] || []), job];
        return next;
      });
    } finally {
      setOptimizing(false);
      setOptimizeProgress(null);
    }
  };

  const moveJobToUnassigned = (laneId, jobIndex) => {
    setSchedule((prev) => {
      const jobs = prev[laneId] || [];
      const job = jobs[jobIndex];
      if (!job) return prev;
      const next = { ...prev };
      next[laneId] = jobs.filter((_, i) => i !== jobIndex);
      next.unassigned = [...(next.unassigned || []), job];
      return next;
    });
  };

  const runOptimize = async (scheduleInput, lanesInput, onProgress) => {
    const report = (step, current, total) => { if (onProgress) onProgress({ step, current, total }); };
    const depot = (depotAddress || '').trim();
    if (!window.google?.maps?.DistanceMatrixService) throw new Error('Google Maps must be loaded. Wait a moment and try again.');
    report('geocoding_depot', 0, 0);
    const depotCoords = await getDepotCoords(depot);
    if (depotCoords?.lat == null || depotCoords?.lng == null) throw new Error('Could not geocode depot address.');
    const allJobs = [];
    lanesInput.forEach((lane) => {
      (scheduleInput[lane.id] || []).forEach((job) => {
        if (job.address?.trim() || (job.latitude != null && job.longitude != null)) {
          allJobs.push({ ...job, _crewId: lane.id });
        }
      });
    });
    if (allJobs.length === 0) throw new Error('No jobs with addresses to optimize.');
    const maxJobsForMatrix = MAX_POINTS_PER_REQUEST - 1;
    const jobsToUse = allJobs.slice(0, maxJobsForMatrix);
    const pointsWithCoords = [];
    for (let ji = 0; ji < jobsToUse.length; ji++) {
      const job = jobsToUse[ji];
      report('geocoding', ji + 1, jobsToUse.length);
      let lat = job.latitude;
      let lng = job.longitude;
      if (lat == null || lng == null) {
        const coords = await geocodeAddress(job.address || '');
        if (coords?.lat != null && coords?.lng != null) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }
      if (lat != null && lng != null) pointsWithCoords.push({ job, lat, lng });
    }
    if (pointsWithCoords.length === 0) {
      return {
        newSchedule: { ...scheduleInput, unassigned: scheduleInput.unassigned || [] },
        newDriveTimes: {},
      };
    }
    report('matrix', 0, 0);
    const depotPoint = { lat: depotCoords.lat, lng: depotCoords.lng };
    const points = [depotPoint, ...pointsWithCoords.map((p) => ({ lat: p.lat, lng: p.lng }))];
    const matrix = await getTravelTimeMatrix(points);
    const jobIndicesByDepotDistance = pointsWithCoords
      .map((_, i) => i + 1)
      .sort((a, b) => (matrix[0][a] ?? Infinity) - (matrix[0][b] ?? Infinity));
    const orderedJobs = jobIndicesByDepotDistance.map((idx) => pointsWithCoords[idx - 1].job);
    report('ordering', 0, 0);
    const newSchedule = {};
    lanesInput.forEach((l) => { newSchedule[l.id] = []; });
    newSchedule.unassigned = scheduleInput.unassigned || [];
    orderedJobs.forEach((job, i) => {
      const laneId = lanesInput[i % lanesInput.length].id;
      const withCoords = pointsWithCoords.find((p) => p.job.id === job.id);
      newSchedule[laneId].push({
        ...job,
        latitude: withCoords?.lat ?? job.latitude,
        longitude: withCoords?.lng ?? job.longitude,
      });
    });
    const newDriveTimes = {};
    for (let li = 0; li < lanesInput.length; li++) {
      const lane = lanesInput[li];
      report('routes', li + 1, lanesInput.length);
      const crewJobs = newSchedule[lane.id];
      if (crewJobs.length === 0) continue;
      const withCoords = crewJobs.filter((j) => j.latitude != null && j.longitude != null);
      const withoutCoords = crewJobs.filter((j) => j.latitude == null || j.longitude == null);
      if (withCoords.length === 0) continue;
      const crewPoints = [depotPoint, ...withCoords.map((j) => ({ lat: j.latitude, lng: j.longitude }))];
      const capped = crewPoints.slice(0, MAX_POINTS_PER_REQUEST);
      const crewMatrix = await getTravelTimeMatrix(capped);
      const order = nearestNeighborOrder(crewMatrix);
      const orderedWithCoords = order.map((idx) => withCoords[idx - 1]).filter(Boolean);
      newSchedule[lane.id] = [...orderedWithCoords, ...withoutCoords];
      let totalDriveSec = 0;
      const legs = [];
      if (order.length > 0) {
        const depotToFirst = (crewMatrix[0][order[0]] ?? 0) || 0;
        legs.push(depotToFirst);
        totalDriveSec += depotToFirst;
        for (let i = 0; i < order.length - 1; i++) {
          const leg = (crewMatrix[order[i]][order[i + 1]] ?? 0) || 0;
          legs.push(leg);
          totalDriveSec += leg;
        }
        const returnLeg = (crewMatrix[order[order.length - 1]][0] ?? 0) || 0;
        legs.push(returnLeg);
        totalDriveSec += returnLeg;
      }
      newDriveTimes[lane.id] = { total: totalDriveSec, legs };
    }
    return { newSchedule, newDriveTimes };
  };

  const totalHours = (crewId) => {
    return (schedule[crewId] || []).reduce((sum, j) => sum + (Number(j.hours) || 0), 0);
  };

  const estimateDriveTimes = async (silent = false, scheduleOverride = null, lanesOverride = null) => {
    const depot = (depotAddress || '').trim();
    if (!depot || !window.google?.maps?.DistanceMatrixService) return;
    const sched = scheduleOverride ?? schedule;
    const lns = lanesOverride ?? lanes;
    if (!silent) {
      setOptimizing(true);
      setOptimizeError('');
    }
    try {
      const depotCoords = await getDepotCoords(depot);
      if (depotCoords?.lat == null || depotCoords?.lng == null) {
        if (!silent) setOptimizeError('Could not geocode depot address.');
        return;
      }
      const depotPoint = { lat: depotCoords.lat, lng: depotCoords.lng };
      const nextDrive = {};
      for (const lane of lns) {
        const jobs = (sched[lane.id] || []).filter((j) => j.latitude != null && j.longitude != null);
        if (jobs.length === 0) continue;
        const points = [depotPoint, ...jobs.map((j) => ({ lat: j.latitude, lng: j.longitude }))];
        const capped = points.slice(0, MAX_POINTS_PER_REQUEST);
        const matrix = await getTravelTimeMatrix(capped);
        const legs = [];
        let totalSec = 0;
        // depot → first job
        const depotToFirst = (matrix[0][1] ?? 0) || 0;
        legs.push(depotToFirst);
        totalSec += depotToFirst;
        // between consecutive jobs
        for (let i = 1; i < capped.length - 1; i++) {
          const leg = (matrix[i][i + 1] ?? 0) || 0;
          legs.push(leg);
          totalSec += leg;
        }
        // last job → depot
        if (capped.length > 1) {
          const returnLeg = (matrix[capped.length - 1][0] ?? 0) || 0;
          legs.push(returnLeg);
          totalSec += returnLeg;
        }
        nextDrive[lane.id] = { total: totalSec, legs };
      }
      setDriveTimeByCrew((prev) => ({ ...prev, ...nextDrive }));
    } catch (err) {
      if (!silent) setOptimizeError(err?.message || 'Estimate failed.');
    } finally {
      if (!silent) setOptimizing(false);
    }
  };

  const runEstimateWithRefs = () => {
    estimateDriveTimes(true, scheduleRef.current, lanesRef.current);
  };

  const toggleCrewVisibility = (crewId) => {
    setVisibleCrews((prev) => ({ ...prev, [crewId]: !prev[crewId] }));
  };

  const isCrewVisible = (crewId) => visibleCrews[crewId] !== false;

  const fitMapBounds = () => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(new window.google.maps.LatLng(FALLBACK_DEPOT_COORDS.lat, FALLBACK_DEPOT_COORDS.lng));
    jobsWithCoords.forEach((j) => {
      bounds.extend(new window.google.maps.LatLng(j.latitude, j.longitude));
    });
    mapInstanceRef.current.fitBounds(bounds, 60);
  };

  // Initialize map when switching to map view
  useEffect(() => {
    if (viewMode !== 'map' || !isLoaded || !mapDivRef.current) return;
    if (mapInstanceRef.current) return; // already initialized
    const center = jobsWithCoords.length
      ? { lat: jobsWithCoords[0].latitude, lng: jobsWithCoords[0].longitude }
      : FALLBACK_DEPOT_COORDS;
    mapInstanceRef.current = new window.google.maps.Map(mapDivRef.current, {
      center,
      zoom: 10,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
    });
    infoWindowRef.current = new window.google.maps.InfoWindow();
    mapInstanceRef.current.addListener('click', () => {
      if (infoWindowRef.current) infoWindowRef.current.close();
      setSelectedMarker(null);
    });
    setTimeout(fitMapBounds, 300);
  }, [viewMode, isLoaded]);

  // Destroy map when leaving map view so it re-creates fresh next time
  useEffect(() => {
    if (viewMode === 'map') return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    mapInstanceRef.current = null;
    infoWindowRef.current = null;
  }, [viewMode]);

  // Update markers & polylines when data or visibility changes
  useEffect(() => {
    if (viewMode !== 'map' || !mapInstanceRef.current || !isLoaded) return;
    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    // Depot marker
    const depotMarker = new window.google.maps.Marker({
      position: FALLBACK_DEPOT_COORDS,
      map: mapInstanceRef.current,
      title: 'Home Office',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: '#f59e0b',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    });
    depotMarker.addListener('click', () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.setContent(`<div style="padding:4px;min-width:180px"><strong>Home Office</strong><div>${escapeHtml(HOME_OFFICE)}</div></div>`);
        infoWindowRef.current.open(mapInstanceRef.current, depotMarker);
      }
    });
    markersRef.current.push(depotMarker);

    // Job markers (only visible crews)
    jobsWithCoords.forEach((job) => {
      const col = scheduleColumns.find((c) => c.name === job.crewName);
      if (col && !isCrewVisible(col.id)) return;
      const marker = new window.google.maps.Marker({
        position: { lat: job.latitude, lng: job.longitude },
        map: mapInstanceRef.current,
        title: `${job.crewName}: ${job.jobNumber || ''} - ${job.customer || ''}`,
        label: { text: job.crewName?.charAt(0) || '#', color: '#fff', fontWeight: '700', fontSize: '11px' },
      });
      marker.addListener('click', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(
            `<div style="padding:4px;min-width:180px;font-size:0.9rem">` +
            `<strong>${escapeHtml(job.crewName)}</strong>` +
            (job.jobNumber ? `<div>${escapeHtml(job.jobNumber)}</div>` : '') +
            (job.customer ? `<div>${escapeHtml(job.customer)}</div>` : '') +
            (job.address ? `<div style="color:#666">${escapeHtml(job.address)}</div>` : '') +
            (job.jobType ? `<div>${escapeHtml(job.jobType)} &middot; ${job.hours}h</div>` : '') +
            `</div>`
          );
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }
        setSelectedMarker(job);
      });
      markersRef.current.push(marker);
    });

    // Route polylines (only visible crews)
    routePaths.forEach((route) => {
      if (!isCrewVisible(route.crewId)) return;
      const polyline = new window.google.maps.Polyline({
        path: route.path,
        map: mapInstanceRef.current,
        strokeColor: route.color,
        strokeOpacity: 0.8,
        strokeWeight: 3,
      });
      polylinesRef.current.push(polyline);
    });

    fitMapBounds();
  }, [viewMode, isLoaded, jobsWithCoords, routePaths, visibleCrews]);

  const handleExcelApply = async (byCrew, newLanes, excelPmGroups) => {
    const lanesToUse = newLanes && Array.isArray(newLanes) && newLanes.length > 0 ? newLanes : lanes;
    const initialSchedule = {};
    Object.keys(byCrew || {}).forEach((id) => {
      initialSchedule[id] = (byCrew[id] || []).map((j) => ({
        id: j.id || crypto.randomUUID(),
        jobType: j.jobType || '',
        hours: j.hours ?? 0,
        jobNumber: j.jobNumber || '',
        customer: j.customer || '',
        address: j.address || '',
        latitude: j.latitude ?? null,
        longitude: j.longitude ?? null,
      }));
    });

    setLanes(lanesToUse);
    // Update PM groups if Excel provided them, otherwise keep existing
    if (Array.isArray(excelPmGroups) && excelPmGroups.length > 0) {
      setPmGroups(excelPmGroups);
    }
    setShowExcelUpload(false);
    setViewMode('table');
    setOptimizeError('');
    setOptimizing(true);
    setOptimizeProgress(null);
    try {
      const { newSchedule, newDriveTimes } = await runOptimize(initialSchedule, lanesToUse, setOptimizeProgress);
      setSchedule(newSchedule);
      setDriveTimeByCrew((prev) => ({ ...prev, ...newDriveTimes }));
    } catch (err) {
      setOptimizeError(err?.message || 'Optimization failed.');
      setSchedule(initialSchedule);
    } finally {
      setOptimizing(false);
      setOptimizeProgress(null);
    }
  };

  // Progress overlay helpers
  const progressLabel = (p) => {
    if (!p) return 'Preparing…';
    switch (p.step) {
      case 'geocoding_depot': return 'Locating home office…';
      case 'geocoding': return `Geocoding addresses… (${p.current} of ${p.total})`;
      case 'matrix': return 'Calculating drive times…';
      case 'ordering': return 'Assigning crews…';
      case 'routes': return `Ordering routes… (${p.current} of ${p.total})`;
      default: return 'Optimizing…';
    }
  };
  const progressPercent = (p) => {
    if (!p) return 5;
    switch (p.step) {
      case 'geocoding_depot': return 5;
      case 'geocoding': return p.total ? 5 + 55 * (p.current / p.total) : 30;
      case 'matrix': return 65;
      case 'ordering': return 75;
      case 'routes': return p.total ? 75 + 25 * (p.current / p.total) : 85;
      default: return 50;
    }
  };

  return (
    <div className="dispatch-page">
      {/* Progress overlay */}
      {optimizing && (
        <div className="dispatch-progress-overlay">
          <div className="dispatch-progress-card">
            <h3>Optimizing Schedule</h3>
            <div className="dispatch-progress-step">{progressLabel(optimizeProgress)}</div>
            <div className="dispatch-progress-bar-wrap">
              <div className="dispatch-progress-bar" style={{ width: `${progressPercent(optimizeProgress)}%` }} />
            </div>
            <div className="dispatch-progress-count">
              {optimizeProgress?.step === 'geocoding' && optimizeProgress.total
                ? `${optimizeProgress.current} / ${optimizeProgress.total} addresses`
                : ''}
            </div>
          </div>
        </div>
      )}

      <div className="dispatch-header">
        <h1>Dispatch & Scheduling</h1>
        <div className="dispatch-header-actions">
          <div className="dispatch-date-nav">
            <button type="button" onClick={goPrev} aria-label="Previous day">←</button>
            <button type="button" onClick={goToday} className="today-btn">Today</button>
            <button type="button" onClick={goNext} aria-label="Next day">→</button>
            <span className="dispatch-date-label">{rangeMode === 'week' ? weekLabel : formatDate(date)}</span>
          </div>
          <div className="dispatch-range-toggle" role="tablist" aria-label="Range">
            <button
              type="button"
              className={rangeMode === 'day' ? 'active' : ''}
              onClick={() => setRangeMode('day')}
            >
              Day
            </button>
            <button
              type="button"
              className={rangeMode === 'week' ? 'active' : ''}
              onClick={() => setRangeMode('week')}
            >
              Week
            </button>
          </div>
          <button
            type="button"
            className="dispatch-upload-excel-btn"
            onClick={() => setShowExcelUpload((v) => !v)}
          >
            {showExcelUpload ? 'Hide upload' : 'Upload Excel'}
          </button>
          <button
            type="button"
            className="dispatch-export-pdf-btn"
            onClick={exportOnePagePdf}
            disabled={rangeMode === 'week'}
            title={rangeMode === 'week' ? 'Switch to Day view to export' : 'Export a one-page PDF for email review'}
          >
            Export PDF
          </button>
          <button
            type="button"
            className="dispatch-email-schedule-btn"
            onClick={openEmailDraft}
            disabled={rangeMode === 'week'}
            title={rangeMode === 'week' ? 'Switch to Day view to email' : 'Open an email draft with the schedule as text'}
          >
            Email Schedule
          </button>
          {(emailError || emailSuccess) && (
            <span className={`dispatch-email-status ${emailError ? 'error' : 'ok'}`}>
              {emailError || emailSuccess}
            </span>
          )}
          {optimizeError && <span className="dispatch-optimize-error">{optimizeError}</span>}
          <div className="dispatch-view-toggle">
            <button
              type="button"
              className={viewMode === 'table' ? 'active' : ''}
              onClick={() => setViewMode('table')}
            >
              Table{overflowJobs.length > 0 && <span className="dispatch-overflow-badge">{overflowJobs.length}</span>}
            </button>
            <button
              type="button"
              className={viewMode === 'map' ? 'active' : ''}
              onClick={() => setViewMode('map')}
              disabled={rangeMode === 'week'}
            >
              Map
            </button>
          </div>
        </div>
      </div>

      {showExcelUpload && (
        <DispatchExcelUpload
          onApply={handleExcelApply}
          onCancel={() => setShowExcelUpload(false)}
        />
      )}

      {rangeMode === 'week' && (
        <div className="dispatch-week-view">
          <div className="dispatch-week-hint">Click a day header to open that day’s schedule.</div>
          <div className="dispatch-week-table-wrap">
            <table className="dispatch-week-table">
              <thead>
                <tr>
                  <th className="dispatch-week-crew-col">Crew</th>
                  {weekSnapshots.map((snap) => {
                    const d = snap.date;
                    const key = snap.key;
                    return (
                      <th key={key} className="dispatch-week-day-col">
                        <button
                          type="button"
                          className="dispatch-week-daybtn"
                          onClick={() => {
                            setDate(new Date(d));
                            setRangeMode('day');
                            setViewMode('table');
                          }}
                          title="Open day view"
                        >
                          <div className="dispatch-week-dayname">{formatDayShort(d)}</div>
                          <div className="dispatch-week-daydate">{formatMd(d)}</div>
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {weekCrewRows.length === 0 && (
                  <tr>
                    <td className="dispatch-week-empty" colSpan={1 + weekSnapshots.length}>
                      No saved schedules found for this week yet.
                    </td>
                  </tr>
                )}
                {weekCrewRows.map((row) => (
                  <tr key={row.canonical}>
                    <td className="dispatch-week-crew">{row.canonical}</td>
                    {weekSnapshots.map((snap) => {
                      let jobs = [];
                      let drive = null;
                      row.sources.forEach((name) => {
                        const entry = snap.jobsByCrewName?.[name];
                        if (Array.isArray(entry?.jobs) && entry.jobs.length) jobs = jobs.concat(entry.jobs);
                        if (!drive && entry?.drive) drive = entry.drive;
                      });
                      const hours = jobs.reduce((sum, j) => sum + (Number(j?.hours) || 0), 0);
                      const driveLabel = drive ? formatDriveTime(getDriveTotal(drive)) : '';
                      return (
                        <td key={snap.key + row.canonical} className="dispatch-week-cell">
                          {jobs.length > 0 ? (
                            <>
                              <div className="dispatch-week-main">{jobs.length} job{jobs.length !== 1 ? 's' : ''} · {hours.toFixed(1)}h</div>
                              {driveLabel && <div className="dispatch-week-sub">Drive: {driveLabel}</div>}
                            </>
                          ) : (
                            <div className="dispatch-week-dash">—</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="dispatch-week-unassigned-row">
                  <td className="dispatch-week-crew">Unassigned</td>
                  {weekSnapshots.map((snap) => {
                    const jobs = Array.isArray(snap.unassignedJobs) ? snap.unassignedJobs : [];
                    const hours = jobs.reduce((sum, j) => sum + (Number(j?.hours) || 0), 0);
                    return (
                      <td key={snap.key + '-unassigned'} className="dispatch-week-cell">
                        {jobs.length > 0 ? (
                          <div className="dispatch-week-main">{jobs.length} job{jobs.length !== 1 ? 's' : ''} · {hours.toFixed(1)}h</div>
                        ) : (
                          <div className="dispatch-week-dash">—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rangeMode === 'day' && viewMode === 'map' && (
        <div className="dispatch-map-layout">
          {/* Crew sidebar */}
          <div className="dispatch-map-sidebar">
            <div className="dispatch-map-sidebar-header">
              <h3>Crews</h3>
              <span className="dispatch-map-sidebar-count">{jobsWithCoords.length} pin{jobsWithCoords.length !== 1 ? 's' : ''}</span>
            </div>
            {/* Depot card */}
            <div className="dispatch-map-crew-card dispatch-map-depot-card">
              <div className="dispatch-map-crew-top">
                <span className="dispatch-map-crew-swatch" style={{ background: '#f59e0b' }} />
                <span className="dispatch-map-crew-label">Home Office</span>
              </div>
              <div className="dispatch-map-crew-detail">{HOME_OFFICE}</div>
            </div>
            {/* Crew cards */}
            {scheduleColumns.map((col) => {
              const crewJobs = schedule[col.id] || [];
              const geocoded = crewJobs.filter((j) => j.latitude != null && j.longitude != null);
              const visible = isCrewVisible(col.id);
              return (
                <div key={col.id} className={`dispatch-map-crew-card${visible ? '' : ' dispatch-map-crew-hidden'}`}>
                  <div className="dispatch-map-crew-top">
                    <button
                      type="button"
                      className="dispatch-map-crew-toggle"
                      onClick={() => toggleCrewVisibility(col.id)}
                      title={visible ? 'Hide route' : 'Show route'}
                    >
                      <span className="dispatch-map-crew-swatch" style={{ background: visible ? col.color : '#475569' }} />
                    </button>
                    <span className="dispatch-map-crew-label">{col.name}</span>
                    <span className="dispatch-map-crew-stats">
                      {crewJobs.length} job{crewJobs.length !== 1 ? 's' : ''}
                      {geocoded.length < crewJobs.length && ` (${geocoded.length} mapped)`}
                    </span>
                  </div>
                  <div className="dispatch-map-crew-times">
                    <span className="dispatch-map-crew-working">Working: {totalHours(col.id).toFixed(1)}h</span>
                    <span className="dispatch-map-crew-drive">Drive: {formatDriveTime(getDriveTotal(driveTimeByCrew[col.id]))}</span>
                  </div>
                  {visible && crewJobs.length > 0 && (
                    <div className="dispatch-map-crew-jobs">
                      {crewJobs.map((job, idx) => (
                        <div key={job.id} className="dispatch-map-job-row">
                          <span className="dispatch-map-job-num">{idx + 1}.</span>
                          <span className="dispatch-map-job-id">{job.jobNumber || '---'}</span>
                          <span className="dispatch-map-job-cust">{job.customer || ''}</span>
                          {job.latitude == null && <span className="dispatch-map-job-no-pin" title="Not geocoded">?</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Map area — rendered with raw Google Maps API */}
          <div className="dispatch-map-section">
            {!isLoaded ? (
              <div className="dispatch-map-loading">Loading map…</div>
            ) : (
              <div ref={mapDivRef} style={{ width: '100%', height: '100%', minHeight: '500px', borderRadius: '8px' }} />
            )}
            {jobsWithCoords.length === 0 && isLoaded && (
              <div className="dispatch-map-empty-overlay">
                <p>No geocoded job locations to display.</p>
                <p>Upload an Excel file with addresses, then apply to schedule. Addresses are geocoded automatically during optimization.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {rangeMode === 'day' && viewMode === 'table' && (
      <div className="dispatch-table-view">
        <div
          className="dispatch-unassigned-pool"
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dispatch-drag-over'); }}
          onDragLeave={(e) => { e.currentTarget.classList.remove('dispatch-drag-over'); }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('dispatch-drag-over');
            try {
              const data = JSON.parse(e.dataTransfer.getData('application/json'));
              if (data.source === 'lane' && data.job) moveJobToUnassigned(data.laneId, data.jobIndex);
            } catch (_) {}
          }}
        >
          <div className="dispatch-unassigned-header">
            <h3 className="dispatch-unassigned-title">Unassigned Jobs</h3>
            <span className="dispatch-unassigned-count">{(schedule.unassigned || []).length} job{(schedule.unassigned || []).length !== 1 ? 's' : ''}</span>
          </div>
          <div className="dispatch-unassigned-list">
            {(schedule.unassigned || []).length === 0 && (
              <div className="dispatch-unassigned-empty">Drag jobs here to unassign, or drag cards onto a crew column header to assign.</div>
            )}
            {(schedule.unassigned || []).map((job) => (
              <div
                key={job.id}
                className="dispatch-unassigned-card"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({ type: 'job', source: 'unassigned', job }));
                  e.dataTransfer.effectAllowed = 'move';
                }}
              >
                <span className="dispatch-unassigned-drag" title="Drag to assign">☰</span>
                <span className="dispatch-unassigned-job">{job.jobNumber || '—'}</span>
                <span className="dispatch-unassigned-customer">{job.customer || '—'}</span>
                <span className="dispatch-unassigned-meta">{job.jobType || '—'} · {job.hours}h</span>
                <button
                  type="button"
                  className="dispatch-unassigned-remove"
                  onClick={() => {
                    const idx = (schedule.unassigned || []).findIndex((j) => j.id === job.id);
                    if (idx >= 0) removeJob('unassigned', idx);
                  }}
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="add-job-btn" onClick={() => addJob('unassigned')}>
            + Add job to pool
          </button>
        </div>
        <div className="dispatch-time-grid-wrap">
          <table className="dispatch-time-grid">
            <thead>
              {/* PM spanning row */}
              <tr className="dispatch-pm-header-row">
                <th className="dispatch-time-col" rowSpan={2}>Time</th>
                {pmHeaderGroups.map((g, i) => (
                  <th
                    key={i}
                    colSpan={g.colSpan}
                    className={`dispatch-pm-col${g.pm ? '' : ' dispatch-pm-col-empty'}`}
                    style={{ borderBottomColor: g.color }}
                  >
                    {g.pm && (
                      <>
                        <span className="pm-header-name">{g.pm}</span>
                        <span className="pm-header-title">{g.title}</span>
                      </>
                    )}
                  </th>
                ))}
              </tr>
              {/* Crew chief row */}
              <tr>
                {scheduleColumns.map((col) => (
                  <th
                    key={col.id}
                    className="dispatch-crew-col dispatch-drop-target"
                    style={{ borderTopColor: col.color }}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dispatch-drag-over'); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove('dispatch-drag-over'); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('dispatch-drag-over');
                      try {
                        const data = JSON.parse(e.dataTransfer.getData('application/json'));
                        if (data.source === 'unassigned' && data.job) moveJobToLane(col.id, data.job);
                      } catch (_) {}
                    }}
                  >
                    <span className="grid-crew-name">{col.name}</span>
                    <span className="grid-crew-working">Working: {totalHours(col.id).toFixed(1)}h</span>
                    <span className="grid-crew-drive">Drive: {formatDriveTime(getDriveTotal(driveTimeByCrew[col.id]))}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slotHour, rowIndex) => {
                const placeAtRow = (crewId) => {
                  const placements = crewJobPlacements[crewId] || [];
                  return placements.find((p) => p.startRowIndex === rowIndex);
                };
                const inSpan = (crewId) => {
                  const placements = crewJobPlacements[crewId] || [];
                  return placements.some((p) => rowIndex > p.startRowIndex && rowIndex < p.startRowIndex + p.rowSpan);
                };
                return (
                  <tr key={rowIndex}>
                    <td className="dispatch-time-col time-slot-label">{hourToLabel(slotHour)}</td>
                    {scheduleColumns.map((col) => {
                      const place = placeAtRow(col.id);
                      const inSpanForCrew = inSpan(col.id);
                      if (place) {
                        const { job, startHour, endHour, rowSpan, preDriveMin } = place;
                        const jobIndex = (schedule[col.id] || []).findIndex((j) => j.id === job.id);
                        return (
                          <td
                            key={col.id}
                            rowSpan={rowSpan}
                            className="dispatch-job-cell"
                            style={{ borderLeftColor: col.color }}
                          >
                            {preDriveMin > 0 && (
                              <div className="grid-drive-indicator">
                                <span className="grid-drive-icon">🚗</span> {preDriveMin} min drive
                              </div>
                            )}
                            <div className="grid-job-block" draggable onDragStart={(e) => {
                              e.dataTransfer.setData('application/json', JSON.stringify({ type: 'job', source: 'lane', laneId: col.id, jobIndex, job }));
                              e.dataTransfer.effectAllowed = 'move';
                            }}>
                              <div className="grid-job-time">{hourToLabel(startHour)} – {hourToLabel(endHour)}</div>
                              <div className="grid-job-number">{job.jobNumber || '—'}</div>
                              <div className="grid-job-customer">{job.customer || '—'}</div>
                              <div className="grid-job-meta">{job.jobType || '—'} · {job.hours}h</div>
                              {jobIndex >= 0 && (
                                <>
                                  <button type="button" className="grid-remove-job" onClick={() => removeJob(col.id, jobIndex)} aria-label="Remove job">×</button>
                                  <button type="button" className="grid-to-unassigned" onClick={() => moveJobToUnassigned(col.id, jobIndex)} aria-label="Move to unassigned">Unassign</button>
                                </>
                              )}
                            </div>
                          </td>
                        );
                      }
                      if (inSpanForCrew) return null;
                      return <td key={col.id} className="dispatch-job-cell empty-cell" />;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {overflowJobs.length > 0 && (
            <div className="dispatch-overflow-section">
              <h3 className="dispatch-overflow-title">After 5 PM — {overflowJobs.length} job{overflowJobs.length !== 1 ? 's' : ''} overflow</h3>
              <p className="dispatch-overflow-desc">These jobs would start at or after 5:00 PM. Move to another day or remove.</p>
              <div className="dispatch-overflow-list">
                {overflowJobs.map(({ crew, job }) => {
                  const jobIndex = (schedule[crew.id] || []).findIndex((j) => j.id === job.id);
                  return (
                    <div key={`${crew.id}-${job.id}`} className="dispatch-overflow-card" style={{ borderLeftColor: crew.color }}>
                      <span className="dispatch-overflow-crew">{crew.name}</span>
                      <span className="dispatch-overflow-job">{job.jobNumber || '—'}</span>
                      <span className="dispatch-overflow-customer">{job.customer || '—'}</span>
                      {jobIndex >= 0 && (
                        <button type="button" className="dispatch-overflow-remove" onClick={() => removeJob(crew.id, jobIndex)} aria-label="Remove job">×</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="dispatch-grid-actions">
            {scheduleColumns.map((col) => (
              <button key={col.id} type="button" className="add-job-btn" onClick={() => addJob(col.id)}>
                + Add job to {col.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default DispatchAndScheduling;
