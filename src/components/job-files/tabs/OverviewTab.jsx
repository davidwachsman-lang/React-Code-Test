import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../services/supabaseClient';
import ScheduleModal from '../ScheduleModal';
import CloseJobModal from '../CloseJobModal';
import scheduleService from '../../../services/scheduleService';
import {
  STATUS_OPTIONS,
  PENDING_STAGE_OPTIONS,
  WIP_STAGE_OPTIONS,
  DIVISION_OPTIONS,
  GROUP_OPTIONS,
  DEPARTMENT_OPTIONS,
  STATUS_DB_MAP,
  STATUS_DISPLAY_MAP,
} from '../../../constants/jobFileConstants';

function formatCurrency(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '-';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function computeAging(job, localState) {
  const dateStr = localState.fnol_date || job.date_of_loss || job.date_received || job.created_at;
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? 'PM' : 'AM';
  return `${hr % 12 || 12}:${m} ${ampm}`;
}

export default function OverviewTab({ job, localState, onSupabaseChange, onLocalChange, onJobReload }) {
  /* ---- Customer & Property edit state ---- */
  const [editingCustProp, setEditingCustProp] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [propAddress, setPropAddress] = useState('');
  const [propCity, setPropCity] = useState('');
  const [propState, setPropState] = useState('');
  const [propZip, setPropZip] = useState('');
  const [propLat, setPropLat] = useState(null);
  const [propLng, setPropLng] = useState(null);
  const [jobNumber, setJobNumber] = useState('');
  const [savingCustProp, setSavingCustProp] = useState(false);
  const addressInputRef = useRef(null);
  const autocompleteInstanceRef = useRef(null);

  /* ---- Modals ---- */
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  /* ---- Schedules ---- */
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  useEffect(() => { if (job?.id) loadSchedules(); }, [job?.id]);

  const loadSchedules = async () => {
    try {
      setSchedulesLoading(true);
      const data = await scheduleService.getByJobId(job.id);
      setSchedules(data.filter(s => s.status !== 'cancelled'));
    } catch (err) {
      console.warn('Could not load schedules:', err);
    } finally {
      setSchedulesLoading(false);
    }
  };

  /* ---- Google Places Autocomplete ---- */
  useEffect(() => {
    if (!editingCustProp) return;
    let retryCount = 0;
    const initAutocomplete = () => {
      if (!addressInputRef.current || !document.contains(addressInputRef.current)) {
        if (++retryCount < 30) setTimeout(initAutocomplete, 100);
        return;
      }
      if (!window.google?.maps?.places?.Autocomplete) {
        if (++retryCount < 30) setTimeout(initAutocomplete, 100);
        return;
      }
      const ac = new window.google.maps.places.Autocomplete(
        addressInputRef.current,
        { types: ['address'], componentRestrictions: { country: 'us' }, fields: ['formatted_address', 'address_components', 'geometry'] }
      );
      autocompleteInstanceRef.current = ac;
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place?.geometry) return;
        setPropAddress(place.formatted_address || '');
        let city = '', state = '', zip = '';
        (place.address_components || []).forEach(c => {
          if (c.types.includes('locality')) city = c.long_name;
          if (c.types.includes('administrative_area_level_1')) state = c.short_name;
          if (c.types.includes('postal_code')) zip = c.long_name;
        });
        setPropCity(city); setPropState(state); setPropZip(zip);
        if (place.geometry.location) {
          setPropLat(place.geometry.location.lat());
          setPropLng(place.geometry.location.lng());
        }
      });
    };
    initAutocomplete();
    return () => { autocompleteInstanceRef.current = null; };
  }, [editingCustProp]);

  const startEditCustProp = useCallback(() => {
    setCustName(job.customers?.name || job.customer_name || '');
    setCustPhone(job.customers?.phone || '');
    setCustEmail(job.customers?.email || '');
    setPropAddress(job.property_address || '');
    setPropCity(job.properties?.city || '');
    setPropState(job.properties?.state || '');
    setPropZip(job.properties?.postal_code || '');
    setPropLat(job.properties?.latitude || null);
    setPropLng(job.properties?.longitude || null);
    setJobNumber(job.job_number || '');
    setEditingCustProp(true);
  }, [job]);

  const saveCustProp = async () => {
    setSavingCustProp(true);
    try {
      if (job.customer_id) {
        await supabase.from('customers').update({ name: custName, phone: custPhone || null, email: custEmail || null }).eq('id', job.customer_id);
      }
      if (job.property_id) {
        const propUpdate = { address1: propAddress, city: propCity, state: propState, postal_code: propZip };
        if (propLat != null) propUpdate.latitude = propLat;
        if (propLng != null) propUpdate.longitude = propLng;
        await supabase.from('properties').update(propUpdate).eq('id', job.property_id);
      }
      if (jobNumber !== (job.job_number || '')) {
        await onSupabaseChange('job_number', jobNumber || null);
      }
      setEditingCustProp(false);
      if (onJobReload) onJobReload();
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingCustProp(false);
    }
  };

  /* ---- Handlers ---- */
  const handleSchedule = async ({ type, date, time, duration, assignee, notes }) => {
    await scheduleService.createSchedule({
      jobId: job.id, technicianName: assignee, scheduledDate: date,
      scheduledTime: time || null, durationMinutes: duration,
      scheduleType: type || 'Inspection',
      notes: notes || null,
    });
    await onSupabaseChange('stage', type === 'Site Visit' ? 'Site Visit Scheduled' : 'Inspection Scheduled');
    await onSupabaseChange('inspection_date', date);
    await loadSchedules();
  };

  const handleCloseJob = async ({ closedBy, notes }) => {
    await onSupabaseChange('closed_by', closedBy);
    if (notes) await onSupabaseChange('closure_notes', notes);
    await onSupabaseChange('status', 'closed');
  };

  const handleCancelSchedule = async (id) => {
    await scheduleService.cancelSchedule(id);
    await loadSchedules();
  };

  const aging = computeAging(job, localState);
  const agingClass = typeof aging === 'number' ? (aging > 60 ? 'aging-red' : aging > 30 ? 'aging-yellow' : 'aging-green') : '';
  const isClosed = job.status === 'closed';

  return (
    <div className="overview-tab">
      {/* ---- Snapshot Bar ---- */}
      <div className="ov-snapshot">
        <div className="ov-snapshot-left">
          <div className="ov-snap-field">
            <span className="ov-snap-label">Job ID</span>
            <span className="ov-snap-value ov-job-id">{job.job_number || job.external_job_number || 'N/A'}</span>
          </div>
          <div className="ov-snap-field">
            <span className="ov-snap-label">Estimate</span>
            <span className="ov-snap-value">{formatCurrency(job.estimate_value)}</span>
          </div>
          <div className="ov-snap-field">
            <span className="ov-snap-label">Aging</span>
            <span className={`ov-snap-value ${agingClass}`}>{aging}{typeof aging === 'number' ? 'd' : ''}</span>
          </div>
        </div>
        {!isClosed ? (
          <div className="ov-snapshot-right">
            <div className="ov-snap-field">
              <span className="ov-snap-label">Status</span>
              <select className="ov-snap-select" value={job.status || ''} onChange={(e) => onSupabaseChange('status', e.target.value)}>
                <option value="">Select...</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={STATUS_DB_MAP[s]}>{s}</option>)}
              </select>
            </div>
            {(job.status === 'pending' || job.status === 'wip') && (
              <div className="ov-snap-field">
                <span className="ov-snap-label">Stage</span>
                <select className="ov-snap-select" value={job.stage || ''} onChange={(e) => onSupabaseChange('stage', e.target.value)}>
                  <option value="">Select...</option>
                  {(job.status === 'pending' ? PENDING_STAGE_OPTIONS : WIP_STAGE_OPTIONS).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="ov-snap-field">
              <span className="ov-snap-label">Division</span>
              <select className="ov-snap-select" value={job.division || ''} onChange={(e) => onSupabaseChange('division', e.target.value)}>
                <option value="">Select...</option>
                {DIVISION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="ov-snap-field">
              <span className="ov-snap-label">Group</span>
              <select className="ov-snap-select" value={job.job_group || ''} onChange={(e) => onSupabaseChange('job_group', e.target.value)}>
                <option value="">Select...</option>
                {GROUP_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="ov-snap-field">
              <span className="ov-snap-label">Job Type</span>
              <select className="ov-snap-select" value={job.department || ''} onChange={(e) => onSupabaseChange('department', e.target.value)}>
                <option value="">Select...</option>
                {DEPARTMENT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <button className="ov-close-btn" onClick={() => setShowCloseModal(true)}>Close Job</button>
          </div>
        ) : (
          <div className="ov-snapshot-right">
            <span className="status-badge status-closed">CLOSED</span>
            <button className="ov-reopen-btn" onClick={() => onSupabaseChange('status', 'pending')}>Reopen</button>
          </div>
        )}
      </div>

      {/* ---- Customer & Property (2 columns) ---- */}
      <div className="ov-section">
        <div className="ov-section-header">
          <h3>Customer & Property</h3>
          {!editingCustProp && <button className="btn-edit-section" onClick={startEditCustProp}>Edit</button>}
        </div>
        {editingCustProp ? (
          <div className="ov-cust-edit">
            <div className="ov-cust-columns ov-cust-3col">
              <div className="ov-cust-col">
                <div className="form-group"><label>Job Number</label><input className="form-input" value={jobNumber} onChange={(e) => setJobNumber(e.target.value)} placeholder="e.g. 24-1234" /></div>
                <div className="form-group"><label>Customer Name</label><input className="form-input" value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Customer name" autoFocus /></div>
                <div className="form-group"><label>Phone</label><input className="form-input" type="tel" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} placeholder="Phone number" /></div>
                <div className="form-group"><label>Email</label><input className="form-input" type="email" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} placeholder="Email address" /></div>
              </div>
              <div className="ov-cust-col">
                <div className="form-group"><label>Property Address</label><input ref={addressInputRef} className="form-input" value={propAddress} onChange={(e) => setPropAddress(e.target.value)} placeholder="Start typing an address..." /></div>
              </div>
              <div className="ov-cust-col">
                <div className="form-group"><label>Insurance Company</label><input className="form-input" value={job.insurance_company || ''} onChange={(e) => onSupabaseChange('insurance_company', e.target.value)} placeholder="Carrier name" /></div>
                <div className="form-group"><label>Adjuster Name</label><input className="form-input" value={job.insurance_adjuster_name || ''} onChange={(e) => onSupabaseChange('insurance_adjuster_name', e.target.value)} placeholder="Adjuster name" /></div>
                <div className="form-group"><label>Adjuster Email</label><input className="form-input" type="email" value={job.insurance_adjuster_email || ''} onChange={(e) => onSupabaseChange('insurance_adjuster_email', e.target.value)} placeholder="Adjuster email" /></div>
              </div>
            </div>
            <div className="ov-cust-actions">
              <button className="btn-secondary" onClick={() => setEditingCustProp(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveCustProp} disabled={savingCustProp}>{savingCustProp ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        ) : (
          <div className="ov-cust-columns ov-cust-3col">
            <div className="ov-cust-col">
              <div className="ov-detail-row"><span className="ov-detail-label">Customer</span><span>{job.customer_name || 'N/A'}</span></div>
              <div className="ov-detail-row"><span className="ov-detail-label">Phone</span><span>{job.customers?.phone || '—'}</span></div>
              <div className="ov-detail-row"><span className="ov-detail-label">Email</span><span>{job.customers?.email || '—'}</span></div>
            </div>
            <div className="ov-cust-col">
              <div className="ov-detail-row"><span className="ov-detail-label">Address</span><span>{job.property_address || 'N/A'}</span></div>
            </div>
            <div className="ov-cust-col">
              <div className="ov-detail-row"><span className="ov-detail-label">Insurance</span><span>{job.insurance_company || '—'}</span></div>
              <div className="ov-detail-row"><span className="ov-detail-label">Adjuster</span><span>{job.insurance_adjuster_name || '—'}</span></div>
              <div className="ov-detail-row"><span className="ov-detail-label">Adjuster Email</span><span>{job.insurance_adjuster_email || '—'}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* ---- Closure Info (only when closed) ---- */}
      {isClosed && (
        <div className="ov-section">
          <h3>Closure Information</h3>
          <div className="ov-cust-columns">
            <div className="ov-cust-col">
              <div className="ov-detail-row"><span className="ov-detail-label">Closed By</span><span>{job.closed_by || 'N/A'}</span></div>
            </div>
            {job.closure_notes && (
              <div className="ov-cust-col">
                <div className="ov-detail-row"><span className="ov-detail-label">Notes</span><span>{job.closure_notes}</span></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Schedules ---- */}
      {!isClosed && (
        <div className="ov-section">
          <div className="ov-section-header">
            <h3>Scheduled</h3>
            <button className="btn-primary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }} onClick={() => setShowScheduleModal(true)}>+ Schedule</button>
          </div>
          {schedulesLoading ? (
            <p className="ov-muted">Loading...</p>
          ) : schedules.length === 0 ? (
            <p className="ov-muted">No upcoming scheduled items</p>
          ) : (
            <div className="schedule-list">
              {schedules.map((s) => {
                const isPast = new Date(s.scheduled_date + 'T23:59:59') < new Date();
                return (
                  <div key={s.id} className={`schedule-item${isPast ? ' past' : ''}${s.status === 'completed' ? ' completed' : ''}`}>
                    <div className="schedule-item-main">
                      {s.schedule_type && <span className="schedule-type-badge">{s.schedule_type}</span>}
                      <span className="schedule-date">{formatDate(s.scheduled_date)}</span>
                      {s.scheduled_time && <span className="schedule-time">{formatTime(s.scheduled_time)}</span>}
                      <span className="schedule-duration">{s.duration_minutes}min</span>
                      <span className="schedule-assignee">{s.technician_name}</span>
                      {s.notes && <span className="schedule-notes">{s.notes}</span>}
                    </div>
                    <div className="schedule-item-actions">
                      <span className={`schedule-status schedule-status-${s.status}`}>{s.status}</span>
                      {s.status === 'scheduled' && (
                        <button className="btn-cancel-schedule" onClick={() => handleCancelSchedule(s.id)} title="Cancel">&times;</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---- Modals ---- */}
      {showScheduleModal && (
        <ScheduleModal job={job} onSchedule={handleSchedule} onClose={() => setShowScheduleModal(false)} />
      )}
      {showCloseModal && (
        <CloseJobModal job={job} onConfirm={handleCloseJob} onClose={() => setShowCloseModal(false)} />
      )}
    </div>
  );
}
