import React, { useState, useRef, useEffect } from 'react';
import { hoursForJobType } from '../../config/dispatchJobDurations';
import scheduleService from '../../services/scheduleService';
import jobService from '../../services/jobService';
import { supabase } from '../../services/supabaseClient';
import { DIVISION_OPTIONS, DEPARTMENT_OPTIONS } from '../../constants/jobFileConstants';


const TYPES = [
  { value: 'estimate', label: 'Estimate' },
  { value: 'site-visit', label: 'Site Visit' },
];

const DURATION_OPTIONS = [
  { value: 0.5, label: '30 min' },
  { value: 1, label: '1 hr' },
  { value: 1.5, label: '1.5 hr' },
  { value: 2, label: '2 hr' },
  { value: 3, label: '3 hr' },
  { value: 4, label: '4 hr' },
];

const DIV_ABBREV = { HB: 'HB', LL: 'LL', REFERRAL: 'REF' };
const DEPT_ABBREV = { WATER: 'WTR', FIRE: 'FIR', MOLD: 'MLD', BIO: 'BIO', CONTENTS: 'CON' };

function toDateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DispatchScheduleModal({ lanes, dispatchDate, onSchedule, onClose }) {
  const [type, setType] = useState('estimate');
  const [assignee, setAssignee] = useState('');
  const [schedDate, setSchedDate] = useState(toDateString(dispatchDate));
  const [hours, setHours] = useState(hoursForJobType('estimate'));
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Job source: 'existing' or 'new'
  const [jobSource, setJobSource] = useState('existing');

  // Existing job search
  const [jobSearch, setJobSearch] = useState('');
  const [jobResults, setJobResults] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // New job fields
  const [newJobDiv, setNewJobDiv] = useState('');
  const [newJobDept, setNewJobDept] = useState('');
  const [customer, setCustomer] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  // Google Places Autocomplete
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 30;

    const initAutocomplete = () => {
      if (!addressInputRef.current || !document.contains(addressInputRef.current)) {
        retryCount++;
        if (retryCount < maxRetries) setTimeout(initAutocomplete, 100);
        return;
      }

      if (!window.google?.maps?.places?.Autocomplete) {
        retryCount++;
        if (retryCount < maxRetries) setTimeout(initAutocomplete, 100);
        return;
      }

      try {
        const instance = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            types: ['address'],
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address', 'address_components', 'geometry', 'name'],
          }
        );

        autocompleteRef.current = instance;

        instance.addListener('place_changed', () => {
          const place = instance.getPlace();
          if (!place) return;

          const formatted = place.formatted_address || place.name || '';
          setAddress(formatted);

          if (place.geometry?.location) {
            setLatitude(place.geometry.location.lat());
            setLongitude(place.geometry.location.lng());
          }
        });
      } catch (err) {
        console.warn('Failed to init Places Autocomplete:', err);
      }
    };

    const timeout = setTimeout(initAutocomplete, 200);
    return () => {
      clearTimeout(timeout);
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  // Search existing jobs with debounce
  useEffect(() => {
    if (jobSource !== 'existing' || jobSearch.length < 2) {
      setJobResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const term = jobSearch.trim().toLowerCase();
        const { data } = await supabase
          .from('jobs')
          .select(`
            id, job_number, external_job_number, status,
            customers(name),
            properties(address1, city, state, latitude, longitude)
          `)
          .or(`job_number.ilike.%${term}%,external_job_number.ilike.%${term}%`)
          .limit(10);

        // Also search by customer name if no job# matches
        let results = data || [];
        if (results.length < 5) {
          const { data: custResults } = await supabase
            .from('jobs')
            .select(`
              id, job_number, external_job_number, status,
              customers!inner(name),
              properties(address1, city, state, latitude, longitude)
            `)
            .ilike('customers.name', `%${term}%`)
            .limit(10);
          // Merge, dedup by id
          const seen = new Set(results.map(r => r.id));
          (custResults || []).forEach(r => {
            if (!seen.has(r.id)) results.push(r);
          });
        }

        setJobResults(results);
      } catch (_) {
        setJobResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [jobSearch, jobSource]);

  const personnelOptions = lanes.map((l) => l.name).filter(Boolean);

  const findLane = (name) => {
    if (!name) return null;
    const upper = name.trim().toUpperCase();
    return lanes.find((l) => l.name.trim().toUpperCase() === upper) || null;
  };

  const handleTypeChange = (val) => {
    setType(val);
    setHours(hoursForJobType(val));
    setAssignee('');
  };

  const handleSelectJob = (job) => {
    setSelectedJob(job);
    setJobSearch(job.job_number || job.external_job_number || '');
    setJobResults([]);
  };

  const isToday = schedDate === toDateString(dispatchDate);

  // Derive display values based on job source
  const displayJobNumber = jobSource === 'existing'
    ? (selectedJob?.job_number || selectedJob?.external_job_number || '')
    : ''; // Will be auto-generated
  const displayCustomer = jobSource === 'existing'
    ? (selectedJob?.customers?.name || '')
    : customer;
  const displayAddress = jobSource === 'existing'
    ? (selectedJob?.properties ? [selectedJob.properties.address1, selectedJob.properties.city, selectedJob.properties.state].filter(Boolean).join(', ') : '')
    : address;
  const displayLat = jobSource === 'existing' ? (selectedJob?.properties?.latitude || null) : latitude;
  const displayLng = jobSource === 'existing' ? (selectedJob?.properties?.longitude || null) : longitude;

  const generateJobNumber = async (div, dept) => {
    const yy = new Date().getFullYear().toString().slice(-2);
    const divCode = DIV_ABBREV[div] || div.slice(0, 3).toUpperCase();
    const deptCode = DEPT_ABBREV[dept] || dept.slice(0, 3).toUpperCase();
    const prefix = `${yy}-${divCode}-${deptCode}-`;

    const { data } = await supabase
      .from('jobs')
      .select('job_number')
      .like('job_number', `${prefix}%`)
      .order('job_number', { ascending: false })
      .limit(1);

    let seq = 1;
    if (data && data.length > 0) {
      const last = data[0].job_number;
      const lastSeq = parseInt(last.split('-').pop(), 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  };

  const handleSubmit = async () => {
    if (!assignee || !schedDate) return;
    if (jobSource === 'new' && (!newJobDiv || !newJobDept)) return;
    setSaving(true);
    setError('');

    try {
      let jobId = null;
      let finalJobNumber = displayJobNumber;
      let finalCustomer = displayCustomer;
      let finalAddress = displayAddress;
      let finalLat = displayLat;
      let finalLng = displayLng;

      if (jobSource === 'existing' && selectedJob) {
        // Link to existing job
        jobId = selectedJob.id;
      } else if (jobSource === 'new') {
        // Create new job: customer → property → job
        const { data: custRecord, error: custErr } = await supabase
          .from('customers')
          .insert([{ name: customer || '' }])
          .select()
          .single();
        if (custErr) throw custErr;

        const { data: propRecord, error: propErr } = await supabase
          .from('properties')
          .insert([{
            customer_id: custRecord.id,
            name: address || '',
            address1: address || '',
            city: '',
            state: '',
            postal_code: '',
            country: 'USA',
            latitude: latitude || null,
            longitude: longitude || null,
          }])
          .select()
          .single();
        if (propErr) throw propErr;

        finalJobNumber = await generateJobNumber(newJobDiv, newJobDept);

        const job = await jobService.create({
          job_number: finalJobNumber,
          customer_id: custRecord.id,
          property_id: propRecord.id,
          status: 'pending',
          division: newJobDiv,
          department: newJobDept,
          date_opened: new Date().toISOString().split('T')[0],
        });

        jobId = job.id;
      }

      // Save to job_schedules
      await scheduleService.createSchedule({
        jobId,
        technicianName: assignee,
        scheduledDate: schedDate,
        scheduledTime: time || null,
        durationMinutes: Math.round(hours * 60),
        notes: [type === 'estimate' ? 'Estimate' : 'Site Visit', finalJobNumber, finalCustomer, notes].filter(Boolean).join(' — '),
        status: 'scheduled',
      });

      // If the date matches current dispatch date, also add to the live grid
      if (isToday) {
        const lane = findLane(assignee);
        const laneId = lane?.id || 'unassigned';

        let fixedStartHour = null;
        if (time) {
          const [h, m] = time.split(':').map(Number);
          fixedStartHour = h + m / 60;
        }

        onSchedule({
          laneId,
          job: {
            id: crypto.randomUUID(),
            jobType: type,
            hours,
            jobNumber: finalJobNumber,
            customer: finalCustomer,
            address: finalAddress,
            latitude: finalLat,
            longitude: finalLng,
            preScheduled: true,
            preScheduledTime: time || null,
            preScheduledNotes: notes || null,
            dbJobId: jobId,
            ...(fixedStartHour != null ? { fixedStartHour } : {}),
          },
        });
      }

      onClose();
    } catch (err) {
      console.error('Failed to save schedule:', err);
      setError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = assignee && schedDate && !saving &&
    (jobSource === 'existing' ? !!selectedJob : (!!newJobDiv && !!newJobDept));

  return (
    <div className="close-modal-overlay" onClick={onClose}>
      <div className="close-modal dispatch-sched-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.15rem' }}>Schedule {type === 'estimate' ? 'Estimate' : 'Site Visit'}</h3>
        <p className="close-modal-subtitle" style={{ marginBottom: '0.75rem' }}>
          {isToday ? 'Saves to database and adds to today\u2019s dispatch grid' : 'Saves to database'}
        </p>

        {/* Type toggle */}
        <div className="close-modal-field">
          <label>Type</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                style={{
                  flex: 1,
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: type === t.value ? '1px solid #3b82f6' : '1px solid #334155',
                  background: type === t.value ? 'rgba(59,130,246,0.2)' : 'rgba(30,41,59,0.8)',
                  color: type === t.value ? '#93c5fd' : '#94a3b8',
                  cursor: 'pointer',
                }}
                onClick={() => handleTypeChange(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Job source toggle */}
        <div className="close-modal-field">
          <label>Job</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button
              type="button"
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: jobSource === 'existing' ? '1px solid #3b82f6' : '1px solid #334155',
                background: jobSource === 'existing' ? 'rgba(59,130,246,0.2)' : 'rgba(30,41,59,0.8)',
                color: jobSource === 'existing' ? '#93c5fd' : '#94a3b8',
                cursor: 'pointer',
              }}
              onClick={() => { setJobSource('existing'); setSelectedJob(null); setJobSearch(''); }}
            >
              Link Existing Job
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: jobSource === 'new' ? '1px solid #22c55e' : '1px solid #334155',
                background: jobSource === 'new' ? 'rgba(34,197,94,0.15)' : 'rgba(30,41,59,0.8)',
                color: jobSource === 'new' ? '#86efac' : '#94a3b8',
                cursor: 'pointer',
              }}
              onClick={() => { setJobSource('new'); setSelectedJob(null); }}
            >
              Create New Job
            </button>
          </div>

          {jobSource === 'existing' ? (
            <div>
              <input
                type="text"
                className="form-input"
                placeholder="Search by job #, customer name..."
                value={jobSearch}
                onChange={(e) => { setJobSearch(e.target.value); setSelectedJob(null); }}
              />
              {searchLoading && (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Searching...</div>
              )}
              {jobResults.length > 0 && !selectedJob && (
                <div className="sched-job-results">
                  {jobResults.map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      className="sched-job-result-item"
                      onClick={() => handleSelectJob(j)}
                    >
                      <span className="sched-job-result-number">{j.job_number || j.external_job_number || '—'}</span>
                      <span className="sched-job-result-cust">{j.customers?.name || ''}</span>
                      <span className="sched-job-result-status">{j.status || ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedJob && (
                <div className="sched-job-selected">
                  <span className="sched-job-selected-num">{displayJobNumber}</span>
                  <span className="sched-job-selected-cust">{displayCustomer}</span>
                  {displayAddress && <span className="sched-job-selected-addr">{displayAddress}</span>}
                  <button
                    type="button"
                    className="sched-job-clear"
                    onClick={() => { setSelectedJob(null); setJobSearch(''); }}
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <select className="form-input" value={newJobDiv} onChange={(e) => setNewJobDiv(e.target.value)} style={{ flex: 1 }}>
                  <option value="">Division...</option>
                  {DIVISION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="form-input" value={newJobDept} onChange={(e) => setNewJobDept(e.target.value)} style={{ flex: 1 }}>
                  <option value="">Job Type...</option>
                  {DEPARTMENT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {newJobDiv && newJobDept && (
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.3rem' }}>
                  Job # will be auto-generated: {new Date().getFullYear().toString().slice(-2)}-{DIV_ABBREV[newJobDiv] || newJobDiv.slice(0,3)}-{DEPT_ABBREV[newJobDept] || newJobDept.slice(0,3)}-XXXX
                </div>
              )}

              {/* Customer */}
              <input
                type="text"
                className="form-input"
                placeholder="Customer name"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                style={{ marginBottom: '0.4rem' }}
              />

              {/* Address — Google Places Autocomplete */}
              <input
                ref={addressInputRef}
                type="text"
                className="form-input"
                placeholder="Start typing an address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Date */}
        <div className="close-modal-field">
          <label>Date *</label>
          <input
            type="date"
            className="form-input"
            value={schedDate}
            min={toDateString(new Date())}
            onChange={(e) => setSchedDate(e.target.value)}
          />
          {!isToday && schedDate && (
            <span style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '4px', display: 'block' }}>
              Scheduling for a future date — will appear on the dispatch grid when you navigate to that day.
            </span>
          )}
        </div>

        {/* Assignee */}
        <div className="close-modal-field">
          <label>Assigned To *</label>
          <select className="form-input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Select...</option>
            {personnelOptions.map((name) => {
              const lane = findLane(name);
              return (
                <option key={name} value={name}>
                  {name}{lane ? '' : ' (unassigned lane)'}
                </option>
              );
            })}
          </select>
        </div>

        {/* Time */}
        <div className="close-modal-field">
          <label>Appointment Time (optional)</label>
          <input type="time" className="form-input" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>

        {/* Duration */}
        <div className="close-modal-field">
          <label>Duration</label>
          <select className="form-input" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {DURATION_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="close-modal-field">
          <label>Notes (optional)</label>
          <textarea className="form-input" rows={2} placeholder="Any special instructions..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="close-modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canSubmit}
            onClick={handleSubmit}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
          >
            {saving ? 'Saving...' : isToday ? 'Add to Schedule' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
