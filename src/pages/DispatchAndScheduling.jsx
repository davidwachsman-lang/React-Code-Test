import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { geocodeAddress } from '../services/geocodingService';
import { getTravelTimeMatrix, nearestNeighborOrder, MAX_POINTS_PER_REQUEST } from '../services/distanceMatrixService';
import DispatchExcelUpload from '../components/dispatch/DispatchExcelUpload';
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
  { pm: 'Leo', title: 'Production Manager', color: PM_COLORS[1], crews: ['Ramon'] },
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
  { value: 'dry', label: 'Dry', hours: 0.5 },
  { value: 'monitoring', label: 'Monitoring', hours: 0.5 },
  { value: 'stabilization', label: 'Stabilization', hours: 0.5 },
  { value: 'new-start', label: 'New Start', hours: 0.5 },
  { value: 'continue-service', label: 'Continue Service', hours: 0.5 },
  { value: 'demo', label: 'Demo', hours: 0.5 },
  { value: 'equipment-pickup', label: 'Equipment Pickup', hours: 0.5 },
  { value: 'emergency', label: 'Emergency', hours: 0.5 },
];

function createEmptyJob() {
  return {
    id: Date.now() + Math.random(),
    jobType: '',
    hours: 0,
    jobNumber: '',
    customer: '',
    address: '',
  };
}

const mapContainerStyle = { width: '100%', height: '400px', borderRadius: '8px' };
const defaultCenter = { lat: 40.7128, lng: -74.006 };

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
  const mapRef = useRef(null);
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
  }, [schedule, driveTimeByCrew]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('jobs')
          .select('id, job_number, customer_name, property_address')
          .limit(100);
        if (data) setJobsDatabase(data);
      } catch (_) {}
    };
    load();
  }, []);

  // localStorage persistence keyed by date
  const dateKey = useMemo(() => {
    const d = date;
    return `dispatch-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [date]);

  // Load from localStorage when date changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(dateKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lanes && Array.isArray(parsed.lanes) && parsed.schedule) {
          setLanes(parsed.lanes);
          setSchedule(parsed.schedule);
          setDriveTimeByCrew(parsed.driveTimeByCrew || {});
          if (Array.isArray(parsed.pmGroups) && parsed.pmGroups.length > 0) {
            setPmGroups(parsed.pmGroups);
          }
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

  useEffect(() => {
    if (optimizing) return;
    const t = setTimeout(() => {
      runEstimateWithRefs();
    }, 800);
    return () => clearTimeout(t);
  }, [schedule, lanes]);

  useEffect(() => {
    if (!isLoaded) return;
    const t = setTimeout(() => runEstimateWithRefs(), 500);
    return () => clearTimeout(t);
  }, [isLoaded]);

  const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const goPrev = () => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const goNext = () => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
  const goToday = () => setDate(new Date());

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
    // Geocode the job if it doesn't have coordinates yet
    let lat = job.latitude;
    let lng = job.longitude;
    if ((lat == null || lng == null) && job.address?.trim() && window.google?.maps?.Geocoder) {
      try {
        const coords = await geocodeAddress(job.address);
        if (coords) { lat = coords.lat; lng = coords.lng; }
      } catch (_) { /* geocode failed — insert at end */ }
    }
    const jobWithCoords = { ...job, latitude: lat ?? null, longitude: lng ?? null };

    // Find the optimal position via cheapest-insertion on the current route
    const currentJobs = scheduleRef.current[laneId] || [];
    const bestIdx = findBestInsertionIndex(currentJobs, jobWithCoords, FALLBACK_DEPOT_COORDS);

    setSchedule((prev) => {
      const next = { ...prev };
      next.unassigned = (prev.unassigned || []).filter((j) => j.id !== job.id);
      const laneJobs = [...(prev[laneId] || [])];
      laneJobs.splice(bestIdx, 0, jobWithCoords);
      next[laneId] = laneJobs;
      return next;
    });
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
    if (!depotCoords?.lat || depotCoords?.lng == null) throw new Error('Could not geocode depot address.');
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
      if (!depotCoords?.lat || depotCoords?.lng == null) {
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
        infoWindowRef.current.setContent(`<div style="padding:4px;min-width:180px"><strong>Home Office</strong><div>${HOME_OFFICE}</div></div>`);
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
            `<strong>${job.crewName}</strong>` +
            (job.jobNumber ? `<div>${job.jobNumber}</div>` : '') +
            (job.customer ? `<div>${job.customer}</div>` : '') +
            (job.address ? `<div style="color:#666">${job.address}</div>` : '') +
            (job.jobType ? `<div>${job.jobType} &middot; ${job.hours}h</div>` : '') +
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
        id: j.id || Date.now() + Math.random(),
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
            <span className="dispatch-date-label">{formatDate(date)}</span>
          </div>
          <button
            type="button"
            className="dispatch-upload-excel-btn"
            onClick={() => setShowExcelUpload((v) => !v)}
          >
            {showExcelUpload ? 'Hide upload' : 'Upload Excel'}
          </button>
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

      {viewMode === 'map' && (
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

      {viewMode === 'table' && (
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
