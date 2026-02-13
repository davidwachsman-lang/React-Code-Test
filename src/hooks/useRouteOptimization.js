import { useState, useEffect, useRef, useCallback } from 'react';
import { geocodeAddress } from '../services/geocodingService';
import {
  getTravelTimeMatrix,
  nearestNeighborOrder,
  twoOptImprove,
  MAX_POINTS_PER_REQUEST,
} from '../services/distanceMatrixService';
import {
  DAY_START,
  FALLBACK_DEPOT_COORDS,
  HOME_OFFICE,
  getDriveLegs,
} from './useDispatchSchedule';

const depotAddress = import.meta.env.VITE_DISPATCH_DEPOT_ADDRESS || HOME_OFFICE;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sqDist(a, b) {
  if (!a || !b) return Infinity;
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
}

/** Cheapest-insertion: find the route index where inserting a new job adds the least distance */
export function findBestInsertionIndex(existingJobs, newJob, depotCoords) {
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

async function getDepotCoords(depot) {
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
}

/**
 * Cluster jobs geographically for better crew assignment.
 * Uses simple angular-sector partitioning from the depot.
 */
function clusterJobsByAngle(jobs, numClusters, depotCoords) {
  if (numClusters <= 0 || jobs.length === 0) return [jobs];
  const withAngle = jobs.map((j) => {
    const angle = Math.atan2(j.latitude - depotCoords.lat, j.longitude - depotCoords.lng);
    return { job: j, angle };
  });
  withAngle.sort((a, b) => a.angle - b.angle);
  const clusters = Array.from({ length: numClusters }, () => []);
  const perCluster = Math.ceil(jobs.length / numClusters);
  withAngle.forEach(({ job }, i) => {
    const clusterIdx = Math.min(Math.floor(i / perCluster), numClusters - 1);
    clusters[clusterIdx].push(job);
  });
  return clusters;
}

// ─── Main Hook ───────────────────────────────────────────────────────────────

export default function useRouteOptimization({
  schedule, setSchedule,
  lanes, setLanes,
  driveTimeByCrew, setDriveTimeByCrew,
  scheduleRef, lanesRef,
  pushUndo,
}) {
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState('');
  const [optimizeProgress, setOptimizeProgress] = useState(null);

  // Google Maps loaded detection
  const [isLoaded, setIsLoaded] = useState(() => !!(window.google && window.google.maps));
  useEffect(() => {
    if (isLoaded) return;
    if (window.google && window.google.maps) { setIsLoaded(true); return; }
    const check = setInterval(() => {
      if (window.google && window.google.maps) { setIsLoaded(true); clearInterval(check); }
    }, 200);
    return () => clearInterval(check);
  }, [isLoaded]);

  // ─── Estimate drive times for current schedule ────────────────────────────

  const estimateDriveTimes = useCallback(async (silent = false, scheduleOverride = null, lanesOverride = null) => {
    const depot = (depotAddress || '').trim();
    if (!depot || !window.google?.maps?.DistanceMatrixService) return;
    const sched = scheduleOverride ?? scheduleRef.current;
    const lns = lanesOverride ?? lanesRef.current;
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
        let matrix;
        try {
          matrix = await getTravelTimeMatrix(capped);
        } catch (err) {
          console.warn(`Distance matrix failed for ${lane.name}:`, err.message);
          continue;
        }
        const legs = [];
        let totalSec = 0;
        const depotToFirst = (matrix[0][1] ?? 0) || 0;
        legs.push(depotToFirst);
        totalSec += depotToFirst;
        for (let i = 1; i < capped.length - 1; i++) {
          const leg = (matrix[i][i + 1] ?? 0) || 0;
          legs.push(leg);
          totalSec += leg;
        }
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
  }, [scheduleRef, lanesRef, setDriveTimeByCrew]);

  // ─── Auto-estimate on schedule change (debounced, silent) ─────────────────

  const scheduleStructureKey = (() => {
    const s = scheduleRef.current;
    const parts = Object.entries(s).map(([lane, jobs]) =>
      `${lane}:${(jobs || []).map((j) => j.id).join(',')}`
    );
    return parts.sort().join('|');
  })();

  useEffect(() => {
    if (optimizing) return;
    const t = setTimeout(() => estimateDriveTimes(true), 800);
    return () => clearTimeout(t);
  }, [scheduleStructureKey, lanes]);

  useEffect(() => {
    if (!isLoaded) return;
    const t = setTimeout(() => estimateDriveTimes(true), 500);
    return () => clearTimeout(t);
  }, [isLoaded]);

  // ─── Move job to lane (with optimization) ─────────────────────────────────

  const moveJobToLane = useCallback(async (laneId, job) => {
    pushUndo();
    const report = (step, current, total) => setOptimizeProgress({ step, current, total });
    setOptimizing(true);
    setOptimizeError('');
    setOptimizeProgress(null);
    try {
      report('geocoding_depot', 0, 0);
      let depotCoords = await getDepotCoords(depotAddress);
      if (!depotCoords) depotCoords = FALLBACK_DEPOT_COORDS;

      let lat = job.latitude;
      let lng = job.longitude;
      if ((lat == null || lng == null) && job.address?.trim() && window.google?.maps?.Geocoder) {
        try {
          const coords = await geocodeAddress(job.address);
          if (coords) { lat = coords.lat; lng = coords.lng; }
        } catch (_) {}
      }
      const jobWithCoords = { ...job, latitude: lat ?? null, longitude: lng ?? null };

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
              jLat = coords.lat; jLng = coords.lng;
            }
          } catch (_) {}
        }
        if (jLat != null && jLng != null) {
          withCoords.push({ ...j, latitude: jLat, longitude: jLng });
        } else {
          withoutCoords.push({ ...j, latitude: jLat ?? null, longitude: jLng ?? null });
        }
      }

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

        // Nearest-neighbor + 2-opt improvement
        let order = nearestNeighborOrder(crewMatrix);
        order = twoOptImprove(order, crewMatrix);

        const orderedWithCoords = order.map((idx) => capped[idx - 1]).filter(Boolean);
        orderedLaneJobs = [...orderedWithCoords, ...overflowWithCoords, ...withoutCoords];

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
  }, [pushUndo, scheduleRef, setSchedule, setDriveTimeByCrew]);

  // ─── Full optimization (re-distribute + route all crews) ──────────────────

  const runFullOptimize = useCallback(async (scheduleInput, lanesInput, onProgress) => {
    const report = (step, current, total) => { if (onProgress) onProgress({ step, current, total }); };
    if (!window.google?.maps?.DistanceMatrixService) throw new Error('Google Maps must be loaded. Wait a moment and try again.');
    report('geocoding_depot', 0, 0);
    const depotCoords = await getDepotCoords(depotAddress);
    if (depotCoords?.lat == null || depotCoords?.lng == null) throw new Error('Could not geocode depot address.');

    // Collect all jobs with coords
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
        try {
          const coords = await geocodeAddress(job.address || '');
          if (coords?.lat != null && coords?.lng != null) { lat = coords.lat; lng = coords.lng; }
        } catch (_) {}
      }
      if (lat != null && lng != null) pointsWithCoords.push({ job, lat, lng });
    }
    if (pointsWithCoords.length === 0) {
      return { newSchedule: { ...scheduleInput }, newDriveTimes: {} };
    }

    report('matrix', 0, 0);
    const depotPoint = { lat: depotCoords.lat, lng: depotCoords.lng };

    // Geographic clustering instead of round-robin
    report('ordering', 0, 0);
    const jobsForClustering = pointsWithCoords.map((p) => ({
      ...p.job,
      latitude: p.lat,
      longitude: p.lng,
    }));
    const clusters = clusterJobsByAngle(jobsForClustering, lanesInput.length, depotCoords);

    const newSchedule = {};
    lanesInput.forEach((l) => { newSchedule[l.id] = []; });
    newSchedule.unassigned = scheduleInput.unassigned || [];

    clusters.forEach((clusterJobs, i) => {
      if (i < lanesInput.length) {
        newSchedule[lanesInput[i].id] = clusterJobs;
      }
    });

    // Optimize each crew's route
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
      let crewMatrix;
      try {
        crewMatrix = await getTravelTimeMatrix(capped);
      } catch (err) {
        console.warn(`Matrix failed for ${lane.name}:`, err.message);
        continue;
      }

      // Nearest-neighbor + 2-opt
      let order = nearestNeighborOrder(crewMatrix);
      order = twoOptImprove(order, crewMatrix);

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
  }, []);

  // ─── Progress helpers ─────────────────────────────────────────────────────

  const progressLabel = (p) => {
    if (!p) return 'Preparing…';
    switch (p.step) {
      case 'geocoding_depot': return 'Locating home office…';
      case 'geocoding': return `Geocoding addresses… (${p.current} of ${p.total})`;
      case 'matrix': return 'Calculating drive times…';
      case 'ordering': return 'Clustering & assigning crews…';
      case 'routes': return `Optimizing routes… (${p.current} of ${p.total})`;
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

  return {
    isLoaded,
    optimizing, setOptimizing,
    optimizeError, setOptimizeError,
    optimizeProgress, setOptimizeProgress,
    estimateDriveTimes,
    moveJobToLane,
    runFullOptimize,
    progressLabel,
    progressPercent,
  };
}
