import React, { useState, useRef, useEffect } from 'react';
import { hoursForJobType } from '../../config/dispatchJobDurations';
import scheduleService from '../../services/scheduleService';

const SCHEDULE_ASSIGNEE_OPTIONS = ['KEVIN', 'LEO', 'AARON', 'JOSH', 'KENNY'];

const TYPES = [
  { value: 'estimate', label: 'Estimate' },
  { value: 'inspection', label: 'Inspection' },
];

const DURATION_OPTIONS = [
  { value: 0.5, label: '30 min' },
  { value: 1, label: '1 hr' },
  { value: 1.5, label: '1.5 hr' },
  { value: 2, label: '2 hr' },
  { value: 3, label: '3 hr' },
  { value: 4, label: '4 hr' },
];

function toDateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DispatchScheduleModal({ lanes, dispatchDate, onSchedule, onClose }) {
  const [type, setType] = useState('estimate');
  const [assignee, setAssignee] = useState('');
  const [schedDate, setSchedDate] = useState(toDateString(dispatchDate));
  const [hours, setHours] = useState(hoursForJobType('estimate'));
  const [time, setTime] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [customer, setCustomer] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const personnelOptions = SCHEDULE_ASSIGNEE_OPTIONS;

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

  const isToday = schedDate === toDateString(dispatchDate);

  const handleSubmit = async () => {
    if (!assignee || !schedDate) return;
    setSaving(true);
    setError('');

    try {
      // 1. Save to Supabase job_schedules
      await scheduleService.createSchedule({
        jobId: null,
        technicianName: assignee,
        scheduledDate: schedDate,
        scheduledTime: time || null,
        durationMinutes: Math.round(hours * 60),
        notes: [type === 'estimate' ? 'Estimate' : 'Inspection', jobNumber, customer, notes].filter(Boolean).join(' — '),
        status: 'scheduled',
      });

      // 2. If the date matches current dispatch date, also add to the live grid
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
            jobNumber,
            customer,
            address,
            latitude,
            longitude,
            preScheduled: true,
            preScheduledTime: time || null,
            preScheduledNotes: notes || null,
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

  return (
    <div className="close-modal-overlay" onClick={onClose}>
      <div className="close-modal dispatch-sched-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.15rem' }}>Schedule {type === 'estimate' ? 'Estimate' : 'Inspection'}</h3>
        <p className="close-modal-subtitle" style={{ marginBottom: '0.75rem' }}>Saves to Supabase{isToday ? ' and adds to today\u2019s dispatch grid' : ''}</p>

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

        {/* Job Number */}
        <div className="close-modal-field">
          <label>Job Number (optional)</label>
          <input type="text" className="form-input" placeholder="e.g. 24-1234" value={jobNumber} onChange={(e) => setJobNumber(e.target.value)} />
        </div>

        {/* Customer */}
        <div className="close-modal-field">
          <label>Customer</label>
          <input type="text" className="form-input" placeholder="Customer name" value={customer} onChange={(e) => setCustomer(e.target.value)} />
        </div>

        {/* Address — Google Places Autocomplete */}
        <div className="close-modal-field">
          <label>Address</label>
          <input
            ref={addressInputRef}
            type="text"
            className="form-input"
            placeholder="Start typing an address..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
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
            disabled={!assignee || !schedDate || saving}
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
