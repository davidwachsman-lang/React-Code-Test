import React, { useState, useEffect } from 'react';
import timeTrackingService from '../services/timeTrackingService';
import jobService from '../services/jobService';
import './TimeTracking.css';

const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
    <path d="M9 22v-4h6v4"/>
    <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/>
  </svg>
);

const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <path d="M8 7h8M8 11h8"/>
  </svg>
);

function TimeTracking() {
  const [technicianName, setTechnicianName] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeEntry, setActiveEntry] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load active jobs on mount
  useEffect(() => {
    loadActiveJobs();
  }, []);

  // Check for active entry when technician name changes
  useEffect(() => {
    if (technicianName) {
      checkActiveEntry();
      loadRecentEntries();
    }
  }, [technicianName]);

  const loadActiveJobs = async () => {
    try {
      const allJobs = await jobService.getAll();
      // Filter for active jobs (status: wip, pending, etc. - not complete or closed)
      const active = allJobs.filter(job =>
        job.status !== 'complete' &&
        job.status !== 'closed' &&
        job.status !== 'ar'
      );
      setActiveJobs(active);
    } catch (err) {
      console.error('Error loading active jobs:', err);
    }
  };

  const checkActiveEntry = async () => {
    try {
      const entry = await timeTrackingService.getActiveEntry(technicianName);
      setActiveEntry(entry);
    } catch (err) {
      console.error('Error checking active entry:', err);
    }
  };

  const loadRecentEntries = async () => {
    try {
      const entries = await timeTrackingService.getEntriesByTechnician(technicianName, 10);
      setRecentEntries(entries);
    } catch (err) {
      console.error('Error loading recent entries:', err);
    }
  };

  const handleClockIn = async (jobNumber = null) => {
    setError(null);
    setLoading(true);

    try {
      if (!technicianName) {
        throw new Error('Please enter your name');
      }

      if (!jobNumber && !selectedJob) {
        throw new Error('Please select a job or home office');
      }

      if (activeEntry) {
        throw new Error('You are already clocked in. Please clock out first.');
      }

      const jobNum = jobNumber || selectedJob.job_number;
      const entry = await timeTrackingService.clockIn(technicianName, jobNum, '');
      setActiveEntry(entry);
      setSelectedJob(null);
      await loadRecentEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setError(null);
    setLoading(true);

    try {
      if (!activeEntry) {
        throw new Error('No active time entry found');
      }

      await timeTrackingService.clockOut(activeEntry.id);
      setActiveEntry(null);
      await loadRecentEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (clockInTime) => {
    const start = new Date(clockInTime);
    const now = new Date();
    const diffMs = now - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="time-tracking-container">
      <div className="time-tracking-card">
        <h2>Time Tracking</h2>

        {error && (
          <div className="time-tracking-error">
            {error}
          </div>
        )}

        <div className="time-tracking-form">
          <div className="form-group">
            <label htmlFor="technicianName">Technician Name</label>
            <input
              id="technicianName"
              type="text"
              className="p-input"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              placeholder="Enter your name"
              disabled={loading || activeEntry}
            />
          </div>

          {activeEntry ? (
            <div className="active-time-entry">
              <div className="active-entry-header">
                <div className="status-indicator">
                  <span className="status-dot"></span>
                  Currently Clocked In
                </div>
              </div>
              <div className="active-entry-details">
                <div className="detail-row">
                  <span className="label">Job Number:</span>
                  <span className="value">{activeEntry.job_number}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Clock In Time:</span>
                  <span className="value">{formatDateTime(activeEntry.clock_in_time)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Duration:</span>
                  <span className="value">{formatDuration(activeEntry.clock_in_time)}</span>
                </div>
              </div>
              <button
                className="clock-out-button"
                onClick={handleClockOut}
                disabled={loading}
              >
                {loading ? 'Clocking Out...' : 'Clock Out'}
              </button>
            </div>
          ) : technicianName ? (
            <div>
              <div className="jobs-section">
                <h3>Select a Job to Clock In</h3>

                {/* Home Office and Training Options */}
                <div className="special-options-section">
                  <button
                    className="special-option-button home-office"
                    onClick={() => handleClockIn('HOME-OFFICE')}
                    disabled={loading}
                  >
                    <div className="special-option-icon"><BuildingIcon /></div>
                    <div className="special-option-content">
                      <div className="special-option-title">Home Office</div>
                      <div className="special-option-subtitle">WIP Meeting, Admin Work, etc.</div>
                    </div>
                  </button>

                  <button
                    className="special-option-button training"
                    onClick={() => handleClockIn('TRAINING')}
                    disabled={loading}
                  >
                    <div className="special-option-icon"><BookIcon /></div>
                    <div className="special-option-content">
                      <div className="special-option-title">Training</div>
                      <div className="special-option-subtitle">Courses, Certifications, Workshops</div>
                    </div>
                  </button>
                </div>

                <div className="section-divider">
                  <span>OR SELECT A JOB</span>
                </div>

                {activeJobs.length === 0 ? (
                  <div className="no-jobs-message">
                    No active jobs available
                  </div>
                ) : (
                  <div className="job-cards-grid">
                    {activeJobs.map((job) => (
                      <div
                        key={job.id}
                        className={`job-card ${selectedJob?.id === job.id ? 'selected' : ''}`}
                        onClick={() => setSelectedJob(job)}
                      >
                        <div className="job-card-header">
                          <span className="job-number">#{job.job_number}</span>
                          <span className={`job-status status-${job.status}`}>
                            {job.status?.toUpperCase()}
                          </span>
                        </div>
                        <div className="job-card-body">
                          <div className="job-customer">{job.customer_name}</div>
                          <div className="job-address">{job.property_address}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedJob && (
                <button
                  className="clock-in-button"
                  onClick={() => handleClockIn()}
                  disabled={loading}
                >
                  {loading ? 'Clocking In...' : 'Clock In'}
                </button>
              )}
            </div>
          ) : (
            <div className="no-tech-message">
              Please enter your name to continue
            </div>
          )}
        </div>

        {recentEntries.length > 0 && (
          <div className="recent-entries">
            <h3>Recent Time Entries</h3>
            <div className="entries-list">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="entry-item">
                  <div className="entry-header">
                    <span className="entry-job">Job #{entry.job_number}</span>
                    <span className={`entry-status ${entry.clock_out_time ? 'completed' : 'active'}`}>
                      {entry.clock_out_time ? `${entry.total_hours} hrs` : 'In Progress'}
                    </span>
                  </div>
                  <div className="entry-times">
                    <span>{formatDateTime(entry.clock_in_time)}</span>
                    {entry.clock_out_time && (
                      <>
                        <span className="time-separator">→</span>
                        <span>{formatDateTime(entry.clock_out_time)}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TimeTracking;
