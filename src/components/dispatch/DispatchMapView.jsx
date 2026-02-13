import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  FALLBACK_DEPOT_COORDS, HOME_OFFICE,
  escapeHtml, formatDriveTime, getDriveTotal,
} from '../../hooks/useDispatchSchedule';

export default function DispatchMapView({
  schedule, scheduleColumns, driveTimeByCrew, totalHours, isLoaded,
}) {
  const mapDivRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const infoWindowRef = useRef(null);
  const [visibleCrews, setVisibleCrews] = useState({});
  const [selectedMarker, setSelectedMarker] = useState(null);

  const isCrewVisible = (crewId) => visibleCrews[crewId] !== false;
  const toggleCrewVisibility = (crewId) => setVisibleCrews((prev) => ({ ...prev, [crewId]: !prev[crewId] }));

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
        list.push({ ...job, crewName: 'Unassigned', crewColor: '#64748b' });
      }
    });
    return list;
  }, [schedule, scheduleColumns]);

  const routePaths = useMemo(() => {
    const depot = FALLBACK_DEPOT_COORDS;
    return scheduleColumns.map((col) => {
      const jobs = (schedule[col.id] || []).filter((j) => j.latitude != null && j.longitude != null);
      if (jobs.length === 0) return null;
      const path = [depot, ...jobs.map((j) => ({ lat: j.latitude, lng: j.longitude })), depot];
      return { crewId: col.id, crewName: col.name, color: col.color, path };
    }).filter(Boolean);
  }, [schedule, scheduleColumns]);

  const fitMapBounds = () => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(new window.google.maps.LatLng(FALLBACK_DEPOT_COORDS.lat, FALLBACK_DEPOT_COORDS.lng));
    jobsWithCoords.forEach((j) => {
      bounds.extend(new window.google.maps.LatLng(j.latitude, j.longitude));
    });
    mapInstanceRef.current.fitBounds(bounds, 60);
  };

  // Init map
  useEffect(() => {
    if (!isLoaded || !mapDivRef.current) return;
    if (mapInstanceRef.current) return;
    const center = jobsWithCoords.length
      ? { lat: jobsWithCoords[0].latitude, lng: jobsWithCoords[0].longitude }
      : FALLBACK_DEPOT_COORDS;
    mapInstanceRef.current = new window.google.maps.Map(mapDivRef.current, {
      center, zoom: 10, mapTypeId: window.google.maps.MapTypeId.ROADMAP,
    });
    infoWindowRef.current = new window.google.maps.InfoWindow();
    mapInstanceRef.current.addListener('click', () => {
      if (infoWindowRef.current) infoWindowRef.current.close();
      setSelectedMarker(null);
    });
    setTimeout(fitMapBounds, 300);
  }, [isLoaded]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      polylinesRef.current.forEach((p) => p.setMap(null));
      mapInstanceRef.current = null;
      infoWindowRef.current = null;
    };
  }, []);

  // Update markers & polylines
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    // Depot
    const depotMarker = new window.google.maps.Marker({
      position: FALLBACK_DEPOT_COORDS,
      map: mapInstanceRef.current,
      title: 'Home Office',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 9, fillColor: '#f59e0b', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2,
      },
    });
    depotMarker.addListener('click', () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.setContent(`<div style="padding:4px;min-width:180px"><strong>Home Office</strong><div>${escapeHtml(HOME_OFFICE)}</div></div>`);
        infoWindowRef.current.open(mapInstanceRef.current, depotMarker);
      }
    });
    markersRef.current.push(depotMarker);

    // Job markers
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

    // Polylines
    routePaths.forEach((route) => {
      if (!isCrewVisible(route.crewId)) return;
      const polyline = new window.google.maps.Polyline({
        path: route.path, map: mapInstanceRef.current,
        strokeColor: route.color, strokeOpacity: 0.8, strokeWeight: 3,
      });
      polylinesRef.current.push(polyline);
    });

    fitMapBounds();
  }, [isLoaded, jobsWithCoords, routePaths, visibleCrews]);

  return (
    <div className="dispatch-map-layout">
      {/* Sidebar */}
      <div className="dispatch-map-sidebar">
        <div className="dispatch-map-sidebar-header">
          <h3>Crews</h3>
          <span className="dispatch-map-sidebar-count">{jobsWithCoords.length} pin{jobsWithCoords.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="dispatch-map-crew-card dispatch-map-depot-card">
          <div className="dispatch-map-crew-top">
            <span className="dispatch-map-crew-swatch" style={{ background: '#f59e0b' }} />
            <span className="dispatch-map-crew-label">Home Office</span>
          </div>
          <div className="dispatch-map-crew-detail">{HOME_OFFICE}</div>
        </div>
        {scheduleColumns.map((col) => {
          const crewJobs = schedule[col.id] || [];
          const geocoded = crewJobs.filter((j) => j.latitude != null && j.longitude != null);
          const visible = isCrewVisible(col.id);
          return (
            <div key={col.id} className={`dispatch-map-crew-card${visible ? '' : ' dispatch-map-crew-hidden'}`}>
              <div className="dispatch-map-crew-top">
                <button type="button" className="dispatch-map-crew-toggle" onClick={() => toggleCrewVisibility(col.id)} title={visible ? 'Hide route' : 'Show route'}>
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
      {/* Map area */}
      <div className="dispatch-map-section">
        {!isLoaded ? (
          <div className="dispatch-map-loading">Loading map...</div>
        ) : (
          <div ref={mapDivRef} style={{ width: '100%', height: '100%', minHeight: '500px', borderRadius: '8px' }} />
        )}
        {jobsWithCoords.length === 0 && isLoaded && (
          <div className="dispatch-map-empty-overlay">
            <p>No geocoded job locations to display.</p>
            <p>Upload an Excel file with addresses, then apply to schedule.</p>
          </div>
        )}
      </div>
    </div>
  );
}
