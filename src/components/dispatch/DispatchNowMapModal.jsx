import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DAY_START, DAY_END, FALLBACK_DEPOT_COORDS, escapeHtml } from '../../hooks/useDispatchSchedule';

function computeCurrentPositions(lanes, scheduleByLane, nowHour) {
  return lanes.map((lane) => {
    const jobs = scheduleByLane[lane.id] || [];
    const geocoded = jobs.filter((job) => job.latitude != null && job.longitude != null);

    if (geocoded.length === 0) {
      return {
        lane,
        lat: FALLBACK_DEPOT_COORDS.lat,
        lng: FALLBACK_DEPOT_COORDS.lng,
        status: 'No mapped jobs',
      };
    }

    let cursor = DAY_START;
    const segments = geocoded.map((job) => {
      const hours = Math.max(0.5, Number(job.hours) || 1);
      const start = job.fixedStartHour != null ? Number(job.fixedStartHour) : cursor;
      const end = Math.min(DAY_END, start + hours);
      cursor = Math.max(cursor, end);
      return { job, start, end };
    });

    if (nowHour < segments[0].start) {
      return {
        lane,
        lat: FALLBACK_DEPOT_COORDS.lat,
        lng: FALLBACK_DEPOT_COORDS.lng,
        status: 'Pre-shift (home base)',
      };
    }

    for (let i = 0; i < segments.length; i += 1) {
      const seg = segments[i];
      if (nowHour >= seg.start && nowHour <= seg.end) {
        return {
          lane,
          lat: seg.job.latitude,
          lng: seg.job.longitude,
          status: `On job ${seg.job.jobNumber || ''}`.trim(),
          job: seg.job,
        };
      }
      const next = segments[i + 1];
      if (next && nowHour > seg.end && nowHour < next.start) {
        return {
          lane,
          lat: next.job.latitude,
          lng: next.job.longitude,
          status: `Traveling to ${next.job.jobNumber || 'next job'}`,
          job: next.job,
        };
      }
    }

    const last = segments[segments.length - 1];
    return {
      lane,
      lat: last.job.latitude,
      lng: last.job.longitude,
      status: `At last job ${last.job.jobNumber || ''}`.trim(),
      job: last.job,
    };
  });
}

export default function DispatchNowMapModal({
  open,
  onClose,
  lanes,
  scheduleByLane,
}) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoRef = useRef(null);
  const [mapsReady, setMapsReady] = useState(() => !!(window.googleMapsLoaded && window.google?.maps));

  useEffect(() => {
    if (mapsReady) return undefined;
    const check = setInterval(() => {
      if (window.googleMapsLoaded && window.google?.maps) {
        setMapsReady(true);
        clearInterval(check);
      }
    }, 200);
    return () => clearInterval(check);
  }, [mapsReady]);

  const now = new Date();
  const nowHour = now.getHours() + (now.getMinutes() / 60);
  const nowLabel = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const currentPositions = useMemo(
    () => computeCurrentPositions(lanes, scheduleByLane, nowHour),
    [lanes, scheduleByLane, nowHour]
  );

  useEffect(() => {
    if (!open || !mapsReady || !mapDivRef.current) return;
    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapDivRef.current, {
        center: FALLBACK_DEPOT_COORDS,
        zoom: 10,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      });
      infoRef.current = new window.google.maps.InfoWindow();
    }

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(new window.google.maps.LatLng(FALLBACK_DEPOT_COORDS.lat, FALLBACK_DEPOT_COORDS.lng));

    currentPositions.forEach((pos) => {
      const marker = new window.google.maps.Marker({
        position: { lat: pos.lat, lng: pos.lng },
        map: mapRef.current,
        title: `${pos.lane.name} — ${pos.status}`,
        label: {
          text: (pos.lane.name || '?').charAt(0).toUpperCase(),
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: '700',
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: pos.lane.color || '#0b4f8a',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        if (!infoRef.current) return;
        infoRef.current.setContent(
          `<div style="min-width:180px;padding:4px 6px">` +
          `<strong>${escapeHtml(pos.lane.name)}</strong>` +
          `<div>${escapeHtml(pos.status)}</div>` +
          (pos.job?.customer ? `<div>${escapeHtml(pos.job.customer)}</div>` : '') +
          (pos.job?.address ? `<div style="color:#64748b">${escapeHtml(pos.job.address)}</div>` : '') +
          `</div>`
        );
        infoRef.current.open(mapRef.current, marker);
      });

      markersRef.current.push(marker);
      bounds.extend(new window.google.maps.LatLng(pos.lat, pos.lng));
    });

    mapRef.current.fitBounds(bounds, 70);
  }, [open, mapsReady, currentPositions]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dispatch-nowmap-backdrop" onClick={onClose}>
      <div className="dispatch-nowmap-modal" onClick={(e) => e.stopPropagation()}>
        <header className="dispatch-nowmap-header">
          <div>
            <h3>Where Everyone Is Now</h3>
            <p>Snapshot at {nowLabel}</p>
          </div>
          <button type="button" onClick={onClose}>Close</button>
        </header>
        <div className="dispatch-nowmap-body">
          <div className="dispatch-nowmap-list">
            {currentPositions.map((pos) => (
              <div key={pos.lane.id} className="dispatch-nowmap-item">
                <span className="dispatch-nowmap-dot" style={{ backgroundColor: pos.lane.color || '#0b4f8a' }} />
                <div>
                  <strong>{pos.lane.name}</strong>
                  <span>{pos.status}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="dispatch-nowmap-canvas-wrap">
            {!mapsReady ? (
              <div className="dispatch-nowmap-loading">Loading Google Maps...</div>
            ) : (
              <div ref={mapDivRef} className="dispatch-nowmap-canvas" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
