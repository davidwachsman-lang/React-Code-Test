import { useState, useEffect, useMemo } from 'react';
import jobService from '../services/jobService';
import jobCloseReasonsService from '../services/jobCloseReasonsService';
import './Page.css';
import './JobFiles.css';

function JobFiles() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lossTypeFilter, setLossTypeFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [editingDates, setEditingDates] = useState(false);
  const [keyDates, setKeyDates] = useState({
    date_received: '',
    date_started: '',
    date_inspected: '',
    estimate_sent_date: '',
    date_majority_completion: '',
    date_invoiced: '',
    date_paid: '',
    date_closed: ''
  });
  const [savingDates, setSavingDates] = useState(false);
  const [editingTeam, setEditingTeam] = useState(false);
  const [teamMembers, setTeamMembers] = useState({
    pm: '',
    jfc: '',
    estimator: '',
    sales_person: '',
    referred_by: '',
    reported_by: '',
    division: ''
  });
  const [savingTeam, setSavingTeam] = useState(false);
  const [editingJobInfo, setEditingJobInfo] = useState(false);
  const [jobInfo, setJobInfo] = useState({
    job_number: '',
    loss_type: '',
    property_type: '',
    division: '',
    referred_by: '',
    reported_by: '',
    cos_score: '',
    nps_score: '',
    estimate_value: ''
  });
  const [savingJobInfo, setSavingJobInfo] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closureData, setClosureData] = useState({
    macroReasonId: null,
    subReasonId: null,
    closedBy: '',
    notes: ''
  });
  const [closingJob, setClosingJob] = useState(false);
  const [macroReasons, setMacroReasons] = useState([]);
  const [subReasons, setSubReasons] = useState([]);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  useEffect(() => {
    loadJobs();
    loadCloseReasons();
  }, []);

  const loadCloseReasons = async () => {
    try {
      setLoadingReasons(true);
      const [macros, subs] = await Promise.all([
        jobCloseReasonsService.getMacroReasons(),
        jobCloseReasonsService.getAllSubReasons()
      ]);
      console.log('Loaded macro reasons:', macros);
      console.log('Loaded sub reasons:', subs);
      setMacroReasons(macros);
      setSubReasons(subs);
    } catch (error) {
      console.error('Error loading close reasons:', error);
      alert(`Failed to load close reasons: ${error.message}. Please check that the job_close_macro_reasons and job_close_sub_reasons tables exist in Supabase.`);
    } finally {
      setLoadingReasons(false);
    }
  };

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await jobService.getAll();
      // Default any null/undefined statuses to 'pending'
      const jobsWithStatus = data.map(job => ({
        ...job,
        status: job.status || 'pending'
      }));
      setJobs(jobsWithStatus);
    } catch (err) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        job.job_number?.toLowerCase().includes(searchLower) ||
        job.customer_name?.toLowerCase().includes(searchLower) ||
        job.property_address?.toLowerCase().includes(searchLower) ||
        job.scope_summary?.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;

      // Loss type filter
      const matchesLossType = lossTypeFilter === 'all' || job.loss_type === lossTypeFilter;

      // Division filter
      const matchesDivision = divisionFilter === 'all' || job.division === divisionFilter;

      // Date range filter
      const jobDate = new Date(job.created_at);
      const matchesDateStart = !dateRange.start || jobDate >= new Date(dateRange.start);
      const matchesDateEnd = !dateRange.end || jobDate <= new Date(dateRange.end);

      // Active jobs filter (excludes complete and closed)
      const matchesActiveFilter = !showActiveOnly || (job.status !== 'complete' && job.status !== 'closed');

      return matchesSearch && matchesStatus && matchesLossType && matchesDivision && matchesDateStart && matchesDateEnd && matchesActiveFilter;
    });
  }, [jobs, searchTerm, statusFilter, lossTypeFilter, divisionFilter, dateRange, showActiveOnly]);

  const statusOptions = ['all', 'pending', 'wip', 'ready_to_bill', 'ar', 'complete', 'closed'];
  const lossTypeOptions = ['all', 'water', 'fire', 'mold', 'bio', 'trauma', 'board-up', 'reconstruction', 'contents', 'storm', 'vandalism', 'other'];
  const divisionOptions = ['all', 'MIT', 'RECON', 'Large Loss', 'Referral', 'HB - Nashville'];

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatStatus = (status) => {
    if (!status) return 'UNKNOWN';
    return status.replace(/_/g, ' ').toUpperCase();
  };

  const getClosureReasonLabels = (job) => {
    if (!job.closure_macro_reason_id || !job.closure_sub_reason_id) {
      return { macro: 'N/A', sub: 'N/A' };
    }

    const macro = macroReasons.find(m => m.id === job.closure_macro_reason_id);
    const sub = subReasons.find(s => s.id === job.closure_sub_reason_id);

    return {
      macro: macro?.label || 'N/A',
      sub: sub?.label || 'N/A'
    };
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setLossTypeFilter('all');
    setDivisionFilter('all');
    setDateRange({ start: '', end: '' });
    setShowActiveOnly(false);
  };

  const handleStatusChange = async () => {
    if (!newStatus || !selectedJob) return;

    try {
      setSavingStatus(true);
      const updatedJob = await jobService.updateStatus(selectedJob.id, newStatus);

      // Update local state with the response from the database
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === selectedJob.id ? { ...job, status: newStatus, updated_at: new Date().toISOString() } : job
        )
      );
      setSelectedJob(prev => ({ ...prev, status: newStatus, updated_at: new Date().toISOString() }));
      setEditingStatus(false);
      setNewStatus('');

      // Show success message
      console.log('Status updated successfully to:', newStatus);
    } catch (err) {
      console.error('Status update error:', err);
      alert('Failed to update status: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedJob) return;

    try {
      setSavingNote(true);
      const updatedNotes = selectedJob.internal_notes
        ? `${selectedJob.internal_notes}\n\n[${new Date().toLocaleString()}]\n${newNote}`
        : `[${new Date().toLocaleString()}]\n${newNote}`;

      await jobService.update(selectedJob.id, { internal_notes: updatedNotes });

      // Update local state
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === selectedJob.id ? { ...job, internal_notes: updatedNotes } : job
        )
      );
      setSelectedJob(prev => ({ ...prev, internal_notes: updatedNotes }));
      setNewNote('');
    } catch (err) {
      alert('Failed to add note: ' + err.message);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setKeyDates(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveDates = async () => {
    if (!selectedJob) return;

    try {
      setSavingDates(true);
      await jobService.update(selectedJob.id, keyDates);

      // Update local state
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === selectedJob.id ? { ...job, ...keyDates } : job
        )
      );
      setSelectedJob(prev => ({ ...prev, ...keyDates }));
      setEditingDates(false);
    } catch (err) {
      alert('Failed to save dates: ' + err.message);
    } finally {
      setSavingDates(false);
    }
  };

  const handleEditDates = () => {
    // Load current dates from selected job
    setKeyDates({
      date_received: selectedJob.date_received || '',
      date_started: selectedJob.date_started || '',
      date_inspected: selectedJob.date_inspected || '',
      estimate_sent_date: selectedJob.estimate_sent_date || '',
      date_majority_completion: selectedJob.date_majority_completion || '',
      date_invoiced: selectedJob.date_invoiced || '',
      date_paid: selectedJob.date_paid || '',
      date_closed: selectedJob.date_closed || ''
    });
    setEditingDates(true);
  };

  const handleTeamChange = (e) => {
    const { name, value } = e.target;
    setTeamMembers(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveTeam = async () => {
    if (!selectedJob) return;

    try {
      setSavingTeam(true);
      await jobService.update(selectedJob.id, teamMembers);

      // Update local state
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === selectedJob.id ? { ...job, ...teamMembers } : job
        )
      );
      setSelectedJob(prev => ({ ...prev, ...teamMembers }));
      setEditingTeam(false);
    } catch (err) {
      alert('Failed to save team members: ' + err.message);
    } finally {
      setSavingTeam(false);
    }
  };

  const handleEditTeam = () => {
    // Load current team members from selected job
    setTeamMembers({
      pm: selectedJob.pm || '',
      jfc: selectedJob.jfc || '',
      estimator: selectedJob.estimator || '',
      sales_person: selectedJob.sales_person || '',
      referred_by: selectedJob.referred_by || '',
      reported_by: selectedJob.reported_by || '',
      division: selectedJob.division || ''
    });
    setEditingTeam(true);
  };

  const handleJobInfoChange = (e) => {
    const { name, value } = e.target;
    setJobInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveJobInfo = async () => {
    if (!selectedJob) return;

    try {
      setSavingJobInfo(true);

      // Convert empty strings to null for numeric fields
      const cleanedJobInfo = {
        ...jobInfo,
        cos_score: jobInfo.cos_score === '' ? null : jobInfo.cos_score,
        nps_score: jobInfo.nps_score === '' ? null : jobInfo.nps_score,
        estimate_value: jobInfo.estimate_value === '' ? null : jobInfo.estimate_value
      };

      console.log('Saving job info:', cleanedJobInfo);
      const result = await jobService.update(selectedJob.id, cleanedJobInfo);
      console.log('Save result:', result);

      // Update local state
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === selectedJob.id ? { ...job, ...cleanedJobInfo } : job
        )
      );
      setSelectedJob(prev => ({ ...prev, ...cleanedJobInfo }));
      setEditingJobInfo(false);
    } catch (error) {
      console.error('Error saving job info:', error);
      console.error('Error details:', error.message, error.details);
      alert(`Failed to save job information: ${error.message || 'Unknown error'}`);
    } finally {
      setSavingJobInfo(false);
    }
  };

  const handleEditJobInfo = () => {
    // Load current job info from selected job
    setJobInfo({
      job_number: selectedJob.job_number || '',
      loss_type: selectedJob.loss_type || '',
      property_type: selectedJob.property_type || '',
      division: selectedJob.division || '',
      referred_by: selectedJob.referred_by || '',
      reported_by: selectedJob.reported_by || '',
      cos_score: selectedJob.cos_score || '',
      nps_score: selectedJob.nps_score || '',
      estimate_value: selectedJob.estimate_value || ''
    });
    setEditingJobInfo(true);
  };

  const handleOpenCloseModal = () => {
    setClosureData({
      macroReasonId: null,
      subReasonId: null,
      closedBy: '',
      notes: ''
    });
    setShowCloseModal(true);
  };

  const handleClosureReasonChange = (value) => {
    setClosureData(prev => ({ ...prev, ...value }));
  };

  const handleClosureInputChange = (e) => {
    const { name, value } = e.target;
    setClosureData(prev => ({ ...prev, [name]: value }));
  };

  const handleCloseJob = async () => {
    if (!selectedJob) return;

    if (!closureData.macroReasonId) {
      alert('Please select a macro closure reason');
      return;
    }

    if (!closureData.subReasonId) {
      alert('Please select a detailed closure reason');
      return;
    }

    if (!closureData.closedBy) {
      alert('Please enter who is closing this job');
      return;
    }

    try {
      setClosingJob(true);

      // Update job with closed status and closure information
      const updateData = {
        status: 'closed',
        closure_macro_reason_id: closureData.macroReasonId,
        closure_sub_reason_id: closureData.subReasonId,
        closed_by: closureData.closedBy,
        closure_notes: closureData.notes,
        date_closed: new Date().toISOString().split('T')[0]
      };

      await jobService.update(selectedJob.id, updateData);

      // Update local state
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === selectedJob.id ? { ...job, ...updateData } : job
        )
      );

      setSelectedJob({ ...selectedJob, ...updateData });
      setShowCloseModal(false);

      alert('Job closed successfully');
    } catch (error) {
      console.error('Error closing job:', error);
      alert(`Failed to close job: ${error.message || 'Unknown error'}`);
    } finally {
      setClosingJob(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-state">
          <h2>Error Loading Jobs</h2>
          <p>{error}</p>
          <button onClick={loadJobs} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="job-files-header">
        <div>
          <h1>Job Files</h1>
          <p>Access and manage all project files and information</p>
        </div>
        <button onClick={loadJobs} className="btn-secondary">
          <span className="refresh-icon">↻</span> Refresh
        </button>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by job number, customer, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Statuses' : status.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Loss Type</label>
            <select
              value={lossTypeFilter}
              onChange={(e) => setLossTypeFilter(e.target.value)}
              className="filter-select"
            >
              {lossTypeOptions.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Division</label>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="filter-select"
            >
              {divisionOptions.map(division => (
                <option key={division} value={division}>
                  {division === 'all' ? 'All Divisions' : division}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="filter-date"
            />
          </div>

          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="filter-date"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            className={showActiveOnly ? 'btn-primary' : 'btn-secondary'}
            style={{ minWidth: '150px' }}
          >
            {showActiveOnly ? '✓ Active Jobs Only' : 'Active Jobs Only'}
          </button>
          <button onClick={clearFilters} className="btn-clear">Clear Filters</button>
        </div>
      </div>

      <div className="results-summary">
        Showing {filteredJobs.length} of {jobs.length} jobs
        {showActiveOnly && <span style={{ marginLeft: '0.5rem', color: '#3b82f6', fontWeight: '600' }}>(Active Only)</span>}
      </div>

      <div className="jobs-table-container">
        {filteredJobs.length === 0 ? (
          <div className="empty-state">
            <p>No jobs found matching your filters</p>
          </div>
        ) : (
          <table className="jobs-table">
            <thead>
              <tr>
                <th>Job Number</th>
                <th>Division</th>
                <th>Loss Type</th>
                <th>Status</th>
                <th>Customer</th>
                <th>PM</th>
                <th>JFC</th>
                <th>Estimate Value</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map(job => (
                <tr
                  key={job.id}
                  className="job-row"
                  onClick={() => setSelectedJob(job)}
                >
                  <td className="job-number">{job.job_number || 'N/A'}</td>
                  <td>{job.division || '-'}</td>
                  <td>{job.loss_type?.charAt(0).toUpperCase() + job.loss_type?.slice(1) || 'N/A'}</td>
                  <td>
                    <span className={`status-badge status-${job.status}`}>
                      {formatStatus(job.status)}
                    </span>
                  </td>
                  <td>{job.customer_name || 'N/A'}</td>
                  <td>{job.pm || '-'}</td>
                  <td>{job.jfc || '-'}</td>
                  <td>{job.estimate_value ? `$${parseFloat(job.estimate_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                  <td>{formatDate(job.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedJob && (
        <div className="modal-overlay">
          <div className="modal-content job-modal">
            <div className="modal-header">
              <h2>Job: {selectedJob.job_number}</h2>
              <button onClick={() => { setSelectedJob(null); setActiveTab('details'); }} className="modal-close">&times;</button>
            </div>

            {/* Tabs */}
            <div className="modal-tabs">
              <button
                className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                Details
              </button>
              <button
                className={`tab-button ${activeTab === 'dates' ? 'active' : ''}`}
                onClick={() => setActiveTab('dates')}
              >
                Key Dates
              </button>
              <button
                className={`tab-button ${activeTab === 'files' ? 'active' : ''}`}
                onClick={() => setActiveTab('files')}
              >
                Files & Estimates
              </button>
              <button
                className={`tab-button ${activeTab === 'status' ? 'active' : ''}`}
                onClick={() => setActiveTab('status')}
              >
                Status
              </button>
              <button
                className={`tab-button ${activeTab === 'notes' ? 'active' : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                Notes
              </button>
            </div>

            <div className="modal-body">
              {/* Details Tab */}
              {activeTab === 'details' && (
                <>
                  <div className="detail-section">
                    <div className="section-header-with-action">
                      <h3>Job Information</h3>
                      {!editingJobInfo && (
                        <button className="btn-secondary" onClick={handleEditJobInfo}>
                          Edit Job Info
                        </button>
                      )}
                    </div>

                    {editingJobInfo ? (
                      <div className="team-form">
                        <div className="detail-grid">
                          <div className="form-group">
                            <label>Job Number</label>
                            <input
                              type="text"
                              name="job_number"
                              value={jobInfo.job_number}
                              onChange={handleJobInfoChange}
                              placeholder="Enter job number"
                            />
                          </div>
                          <div className="form-group">
                            <label>Loss Type</label>
                            <input
                              type="text"
                              name="loss_type"
                              value={jobInfo.loss_type}
                              onChange={handleJobInfoChange}
                              placeholder="e.g., Water, Fire, Mold, Contents"
                            />
                          </div>
                          <div className="form-group">
                            <label>Property Type</label>
                            <select
                              name="property_type"
                              value={jobInfo.property_type}
                              onChange={handleJobInfoChange}
                              style={{
                                padding: '0.75rem',
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '8px',
                                color: '#f1f5f9',
                                fontSize: '1rem',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              <option value="">Select Property Type</option>
                              <option value="Residential">Residential</option>
                              <option value="Commercial">Commercial</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Division</label>
                            <select
                              name="division"
                              value={jobInfo.division}
                              onChange={handleJobInfoChange}
                              style={{
                                padding: '0.75rem',
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '8px',
                                color: '#f1f5f9',
                                fontSize: '1rem',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              <option value="">Select Division</option>
                              <option value="MIT">MIT</option>
                              <option value="RECON">RECON</option>
                              <option value="LARGE LOSS">LARGE LOSS</option>
                              <option value="REFERRAL">REFERRAL</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Referred By</label>
                            <input
                              type="text"
                              name="referred_by"
                              value={jobInfo.referred_by}
                              onChange={handleJobInfoChange}
                              placeholder="Enter referrer name"
                            />
                          </div>
                          <div className="form-group">
                            <label>Reported By</label>
                            <input
                              type="text"
                              name="reported_by"
                              value={jobInfo.reported_by}
                              onChange={handleJobInfoChange}
                              placeholder="Enter reporter name"
                            />
                          </div>
                          <div className="form-group">
                            <label>COS Score (0-10)</label>
                            <input
                              type="number"
                              name="cos_score"
                              value={jobInfo.cos_score}
                              onChange={handleJobInfoChange}
                              placeholder="0-10"
                              min="0"
                              max="10"
                              step="0.1"
                            />
                          </div>
                          <div className="form-group">
                            <label>NPS Score (0-10)</label>
                            <input
                              type="number"
                              name="nps_score"
                              value={jobInfo.nps_score}
                              onChange={handleJobInfoChange}
                              placeholder="0-10"
                              min="0"
                              max="10"
                              step="0.1"
                            />
                          </div>
                          <div className="form-group">
                            <label>Estimate Value ($)</label>
                            <input
                              type="number"
                              name="estimate_value"
                              value={jobInfo.estimate_value}
                              onChange={handleJobInfoChange}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>

                        <div className="button-group" style={{ marginTop: '1.5rem' }}>
                          <button
                            className="btn-primary"
                            onClick={handleSaveJobInfo}
                            disabled={savingJobInfo}
                          >
                            {savingJobInfo ? 'Saving...' : 'Save Job Info'}
                          </button>
                          <button
                            className="btn-cancel"
                            onClick={() => setEditingJobInfo(false)}
                            disabled={savingJobInfo}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="detail-grid">
                        <div className="detail-item">
                          <strong>Job Number:</strong>
                          <span>{selectedJob.job_number || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Status:</strong>
                          <span className={`status-badge status-${selectedJob.status}`}>
                            {formatStatus(selectedJob.status)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <strong>Division:</strong>
                          <span>{selectedJob.division || 'Not set'}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Loss Type:</strong>
                          <span>{selectedJob.loss_type?.charAt(0).toUpperCase() + selectedJob.loss_type?.slice(1) || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Property Type:</strong>
                          <span>{selectedJob.property_type || 'Not set'}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Created:</strong>
                          <span>{formatDate(selectedJob.created_at)}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Last Updated:</strong>
                          <span>{formatDate(selectedJob.updated_at)}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Referred By:</strong>
                          <span>{selectedJob.referred_by || 'Not set'}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Reported By:</strong>
                          <span>{selectedJob.reported_by || 'Not set'}</span>
                        </div>
                        <div className="detail-item">
                          <strong>COS Score:</strong>
                          <span>{selectedJob.cos_score !== null && selectedJob.cos_score !== undefined ? selectedJob.cos_score : 'Not set'}</span>
                        </div>
                        <div className="detail-item">
                          <strong>NPS Score:</strong>
                          <span>{selectedJob.nps_score !== null && selectedJob.nps_score !== undefined ? selectedJob.nps_score : 'Not set'}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Estimate Value:</strong>
                          <span>{selectedJob.estimate_value ? `$${parseFloat(selectedJob.estimate_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Not set'}</span>
                        </div>
                        {selectedJob.status === 'closed' && (
                          <>
                            <div className="detail-item">
                              <strong>Closure Reason (Macro):</strong>
                              <span>{getClosureReasonLabels(selectedJob).macro}</span>
                            </div>
                            <div className="detail-item">
                              <strong>Closure Reason (Detail):</strong>
                              <span>{getClosureReasonLabels(selectedJob).sub}</span>
                            </div>
                            <div className="detail-item">
                              <strong>Closed By:</strong>
                              <span>{selectedJob.closed_by || 'N/A'}</span>
                            </div>
                            {selectedJob.closure_notes && (
                              <div className="detail-item">
                                <strong>Closure Notes:</strong>
                                <span>{selectedJob.closure_notes}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="detail-section">
                    <h3>Customer & Property</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <strong>Customer:</strong>
                        <span>{selectedJob.customer_name || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Property Address:</strong>
                        <span>{selectedJob.property_address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <div className="section-header-with-action">
                      <h3>Team Members</h3>
                      {!editingTeam && (
                        <button className="btn-secondary" onClick={handleEditTeam}>
                          Edit Team
                        </button>
                      )}
                    </div>

                    {editingTeam ? (
                      <div className="team-form">
                        <div className="detail-grid">
                          <div className="form-group">
                            <label>Project Manager (PM)</label>
                            <input
                              type="text"
                              name="pm"
                              value={teamMembers.pm}
                              onChange={handleTeamChange}
                              placeholder="Enter PM name"
                            />
                          </div>
                          <div className="form-group">
                            <label>Job File Coordinator (JFC)</label>
                            <input
                              type="text"
                              name="jfc"
                              value={teamMembers.jfc}
                              onChange={handleTeamChange}
                              placeholder="Enter JFC name"
                            />
                          </div>
                          <div className="form-group">
                            <label>Estimator</label>
                            <input
                              type="text"
                              name="estimator"
                              value={teamMembers.estimator}
                              onChange={handleTeamChange}
                              placeholder="Enter Estimator name"
                            />
                          </div>
                          <div className="form-group">
                            <label>Sales Person</label>
                            <input
                              type="text"
                              name="sales_person"
                              value={teamMembers.sales_person}
                              onChange={handleTeamChange}
                              placeholder="Enter Sales Person name"
                            />
                          </div>
                          <div className="form-group">
                            <label>Referred By</label>
                            <input
                              type="text"
                              name="referred_by"
                              value={teamMembers.referred_by}
                              onChange={handleTeamChange}
                              placeholder="Enter referrer name"
                            />
                          </div>
                          <div className="form-group">
                            <label>Reported By</label>
                            <input
                              type="text"
                              name="reported_by"
                              value={teamMembers.reported_by}
                              onChange={handleTeamChange}
                              placeholder="Enter reporter name"
                            />
                          </div>
                        </div>

                        <div className="button-group" style={{ marginTop: '1.5rem' }}>
                          <button
                            className="btn-primary"
                            onClick={handleSaveTeam}
                            disabled={savingTeam}
                          >
                            {savingTeam ? 'Saving...' : 'Save Team'}
                          </button>
                          <button
                            className="btn-cancel"
                            onClick={() => setEditingTeam(false)}
                            disabled={savingTeam}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="detail-grid">
                        <div className="detail-item">
                          <strong>Project Manager (PM):</strong>
                          <span>{selectedJob.pm || 'Not assigned'}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Job File Coordinator (JFC):</strong>
                          <span>{selectedJob.jfc || 'Not assigned'}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Estimator:</strong>
                          <span>{selectedJob.estimator || 'Not assigned'}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Sales Person:</strong>
                          <span>{selectedJob.sales_person || 'Not assigned'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedJob.scope_summary && (
                    <div className="detail-section">
                      <h3>Scope Summary</h3>
                      <p>{selectedJob.scope_summary}</p>
                    </div>
                  )}
                </>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="notes-tab">
                  <div className="detail-section">
                    <h3>Add New Note</h3>
                    <textarea
                      className="note-textarea"
                      placeholder="Enter note here..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={4}
                    />
                    <button
                      className="btn-primary"
                      onClick={handleAddNote}
                      disabled={savingNote || !newNote.trim()}
                    >
                      {savingNote ? 'Adding...' : 'Add Note'}
                    </button>
                  </div>

                  <div className="detail-section">
                    <h3>Previous Notes</h3>
                    {selectedJob.internal_notes ? (
                      <div className="notes-history">
                        {selectedJob.internal_notes}
                      </div>
                    ) : (
                      <p className="no-notes">No notes yet. Add the first note above.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Status Tab */}
              {activeTab === 'status' && (
                <div className="status-tab">
                  <div className="detail-section">
                    <h3>Current Status</h3>
                    <div className="current-status">
                      <span className={`status-badge status-${selectedJob.status}`}>
                        {formatStatus(selectedJob.status)}
                      </span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Change Status</h3>
                    {!editingStatus ? (
                      <button className="btn-secondary" onClick={() => setEditingStatus(true)}>
                        Update Status
                      </button>
                    ) : (
                      <div className="status-update-form">
                        <select
                          className="status-select"
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                        >
                          <option value="">Select new status...</option>
                          {statusOptions.filter(s => s !== 'all' && s !== 'closed' && s !== selectedJob.status).map(status => (
                            <option key={status} value={status}>
                              {formatStatus(status)}
                            </option>
                          ))}
                        </select>
                        <div className="button-group">
                          <button
                            className="btn-primary"
                            onClick={handleStatusChange}
                            disabled={savingStatus || !newStatus}
                          >
                            {savingStatus ? 'Updating...' : 'Save Status'}
                          </button>
                          <button
                            className="btn-cancel"
                            onClick={() => { setEditingStatus(false); setNewStatus(''); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Close Job Section */}
                  {selectedJob.status !== 'closed' && (
                    <div className="detail-section">
                      <h3>Close Job</h3>
                      <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                        Close this job if it will not be completed (different from Complete status).
                      </p>
                      <button className="btn-danger" onClick={handleOpenCloseModal}>
                        Close Job
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Files Tab */}
              {activeTab === 'files' && (
                <div className="files-tab">
                  <div className="detail-section">
                    <h3>Upload Files</h3>
                    <div className="upload-area">
                      <input type="file" multiple className="file-input" id="file-upload" />
                      <label htmlFor="file-upload" className="file-label">
                        <span className="upload-icon">📎</span>
                        <span>Click to upload files (estimates, photos, documents)</span>
                      </label>
                      <button className="btn-primary" style={{ marginTop: '1rem' }}>
                        Upload Files
                      </button>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Attached Files</h3>
                    <p className="no-files">File upload functionality will be connected to cloud storage.</p>
                  </div>
                </div>
              )}

              {/* Key Dates Tab */}
              {activeTab === 'dates' && (
                <div className="dates-tab">
                  <div className="detail-section">
                    <div className="section-header-with-action">
                      <h3>Key Dates</h3>
                      {!editingDates && (
                        <button className="btn-secondary" onClick={handleEditDates}>
                          Edit Dates
                        </button>
                      )}
                    </div>

                    {editingDates ? (
                      <div className="dates-form">
                        <div className="dates-grid">
                          <div className="form-group">
                            <label>Date Received</label>
                            <input
                              type="date"
                              name="date_received"
                              value={keyDates.date_received}
                              onChange={handleDateChange}
                            />
                          </div>
                          <div className="form-group">
                            <label>Date Started</label>
                            <input
                              type="date"
                              name="date_started"
                              value={keyDates.date_started}
                              onChange={handleDateChange}
                            />
                          </div>
                          <div className="form-group">
                            <label>Date Inspected</label>
                            <input
                              type="date"
                              name="date_inspected"
                              value={keyDates.date_inspected}
                              onChange={handleDateChange}
                            />
                          </div>
                          <div className="form-group">
                            <label>Estimate Sent Date</label>
                            <input
                              type="date"
                              name="estimate_sent_date"
                              value={keyDates.estimate_sent_date}
                              onChange={handleDateChange}
                            />
                          </div>
                          <div className="form-group">
                            <label>Date Majority Completion</label>
                            <input
                              type="date"
                              name="date_majority_completion"
                              value={keyDates.date_majority_completion}
                              onChange={handleDateChange}
                            />
                          </div>
                          <div className="form-group">
                            <label>Date Invoiced</label>
                            <input
                              type="date"
                              name="date_invoiced"
                              value={keyDates.date_invoiced}
                              onChange={handleDateChange}
                            />
                          </div>
                          <div className="form-group">
                            <label>Date Paid</label>
                            <input
                              type="date"
                              name="date_paid"
                              value={keyDates.date_paid}
                              onChange={handleDateChange}
                            />
                          </div>
                          <div className="form-group">
                            <label>Date Closed</label>
                            <input
                              type="date"
                              name="date_closed"
                              value={keyDates.date_closed}
                              onChange={handleDateChange}
                            />
                          </div>
                        </div>

                        <div className="button-group" style={{ marginTop: '1.5rem' }}>
                          <button
                            className="btn-primary"
                            onClick={handleSaveDates}
                            disabled={savingDates}
                          >
                            {savingDates ? 'Saving...' : 'Save Dates'}
                          </button>
                          <button
                            className="btn-cancel"
                            onClick={() => setEditingDates(false)}
                            disabled={savingDates}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="dates-display">
                        <div className="dates-grid">
                          <div className="date-item">
                            <strong>Date Received:</strong>
                            <span>{selectedJob.date_received ? formatDate(selectedJob.date_received) : 'Not set'}</span>
                          </div>
                          <div className="date-item">
                            <strong>Date Started:</strong>
                            <span>{selectedJob.date_started ? formatDate(selectedJob.date_started) : 'Not set'}</span>
                          </div>
                          <div className="date-item">
                            <strong>Date Inspected:</strong>
                            <span>{selectedJob.date_inspected ? formatDate(selectedJob.date_inspected) : 'Not set'}</span>
                          </div>
                          <div className="date-item">
                            <strong>Estimate Sent Date:</strong>
                            <span>{selectedJob.estimate_sent_date ? formatDate(selectedJob.estimate_sent_date) : 'Not set'}</span>
                          </div>
                          <div className="date-item">
                            <strong>Date Majority Completion:</strong>
                            <span>{selectedJob.date_majority_completion ? formatDate(selectedJob.date_majority_completion) : 'Not set'}</span>
                          </div>
                          <div className="date-item">
                            <strong>Date Invoiced:</strong>
                            <span>{selectedJob.date_invoiced ? formatDate(selectedJob.date_invoiced) : 'Not set'}</span>
                          </div>
                          <div className="date-item">
                            <strong>Date Paid:</strong>
                            <span>{selectedJob.date_paid ? formatDate(selectedJob.date_paid) : 'Not set'}</span>
                          </div>
                          <div className="date-item">
                            <strong>Date Closed:</strong>
                            <span>{selectedJob.date_closed ? formatDate(selectedJob.date_closed) : 'Not set'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Close Job Modal */}
      {showCloseModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Close Job</h2>
              <button className="modal-close" onClick={() => setShowCloseModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1.5rem', color: '#666' }}>
                Closing a job marks it as no longer active. This is different from the "Complete" status.
                Please provide a reason for closing this job.
              </p>

              {/* Macro Reason Dropdown */}
              <div className="form-group">
                <label htmlFor="macro-reason">Close Reason (Macro) <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  id="macro-reason"
                  value={closureData.macroReasonId || ''}
                  onChange={(e) => handleClosureReasonChange({
                    macroReasonId: e.target.value ? Number(e.target.value) : null,
                    subReasonId: null
                  })}
                  className="form-input"
                  disabled={loadingReasons || macroReasons.length === 0}
                  required
                >
                  <option value="">
                    {loadingReasons ? 'Loading reasons...' : macroReasons.length === 0 ? 'No reasons available - check Supabase setup' : 'Select reason...'}
                  </option>
                  {macroReasons
                    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                    .map(macro => (
                      <option key={macro.id} value={macro.id}>
                        {macro.label}
                      </option>
                    ))}
                </select>
                {macroReasons.length === 0 && !loadingReasons && (
                  <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    No macro reasons found. Please ensure the job_close_macro_reasons table exists in Supabase.
                  </p>
                )}
              </div>

              {/* Sub Reason Dropdown */}
              <div className="form-group">
                <label htmlFor="sub-reason">Close Reason (Detail) <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  id="sub-reason"
                  value={closureData.subReasonId || ''}
                  onChange={(e) => handleClosureReasonChange({
                    ...closureData,
                    subReasonId: e.target.value ? Number(e.target.value) : null
                  })}
                  className="form-input"
                  disabled={loadingReasons || !closureData.macroReasonId}
                  required
                >
                  <option value="">
                    {closureData.macroReasonId ? 'Select detailed reason...' : 'Select macro reason first...'}
                  </option>
                  {subReasons
                    .filter(sub => sub.macro_reason_id === closureData.macroReasonId)
                    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                    .map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.label}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="closed-by">Closed By <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  id="closed-by"
                  name="closedBy"
                  value={closureData.closedBy}
                  onChange={handleClosureInputChange}
                  placeholder="Enter your name"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="closure-notes">Additional Notes (Optional)</label>
                <textarea
                  id="closure-notes"
                  name="notes"
                  value={closureData.notes}
                  onChange={handleClosureInputChange}
                  placeholder="Enter any additional details about why this job is being closed..."
                  className="form-input"
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowCloseModal(false)}
                disabled={closingJob}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={handleCloseJob}
                disabled={closingJob || !closureData.macroReasonId || !closureData.subReasonId || !closureData.closedBy}
              >
                {closingJob ? 'Closing Job...' : 'Close Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobFiles;
