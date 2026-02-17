import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import jobService from '../services/jobService';
import useJobLocalState from '../hooks/useJobLocalState';
import { STATUS_DISPLAY_MAP } from '../constants/jobFileConstants';
import OverviewTab from '../components/job-files/tabs/OverviewTab';
import FNOLTab from '../components/job-files/tabs/FNOLTab';
import PersonnelTab from '../components/job-files/tabs/PersonnelTab';
import DatesTab from '../components/job-files/tabs/DatesTab';
import FinancialsTab from '../components/job-files/tabs/FinancialsTab';
import DocumentationTab from '../components/job-files/tabs/DocumentationTab';
import CommunicationsTab from '../components/job-files/tabs/CommunicationsTab';
import './Page.css';
import './JobFiles.css';

// #13: Files tab removed from TABS array
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'fnol', label: 'FNOL' },
  { key: 'personnel', label: 'Personnel' },
  { key: 'dates', label: 'Dates' },
  { key: 'financials', label: 'Financials' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'communications', label: 'Communications' },
];

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // #6: Tab scroll indicators
  const tabsRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkTabScroll = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkTabScroll();
    const el = tabsRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkTabScroll);
    window.addEventListener('resize', checkTabScroll);
    return () => {
      el.removeEventListener('scroll', checkTabScroll);
      window.removeEventListener('resize', checkTabScroll);
    };
  }, [checkTabScroll, loading]);

  const { getLocalState, updateLocalField } = useJobLocalState();

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await jobService.getById(id);
      if (!data) {
        setError('Job not found');
        return;
      }
      setJob({
        ...data,
        status: data.status || 'pending',
        customer_name: data.customers?.name || 'Unknown',
        property_address: data.properties
          ? [
              data.properties.address1,
              data.properties.address2,
              data.properties.city,
              data.properties.state,
              data.properties.postal_code,
            ].filter(Boolean).join(', ')
          : 'Unknown',
      });
    } catch (err) {
      setError(err.message || 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  const handleSupabaseChange = async (field, value) => {
    if (!job) return;
    try {
      const updateData = { [field]: value === '' ? null : value };
      await jobService.update(job.id, updateData);
      setJob(prev => ({ ...prev, ...updateData }));
    } catch (err) {
      console.error('Failed to save field:', err);
      alert('Failed to save: ' + (err.message || 'Unknown error'));
    }
  };

  const handleLocalChange = (field, value) => {
    if (!job) return;
    updateLocalField(job.id, field, value);
  };

  const handleAddNote = async (noteText) => {
    if (!noteText.trim() || !job) return;
    try {
      const timestamp = new Date().toLocaleString();
      const newEntry = `[${timestamp}]\n${noteText}`;
      const updatedNotes = job.internal_notes
        ? `${newEntry}\n\n${job.internal_notes}`
        : newEntry;

      await jobService.update(job.id, { internal_notes: updatedNotes });
      setJob(prev => ({ ...prev, internal_notes: updatedNotes }));
    } catch (err) {
      alert('Failed to add note: ' + err.message);
    }
  };

  // #8: Build back link preserving filters from the URL we arrived with
  const backLink = '/job-files' + (location.search || '');

  const formatStatus = (status) => {
    return STATUS_DISPLAY_MAP[status] || status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN';
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading job...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate(backLink)} className="btn-primary">
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const localState = getLocalState(job.id);

  return (
    <div className="page-container">
      <div className="job-detail-header">
        <button className="btn-back" onClick={() => navigate(backLink)}>
          &#8592; Back to Jobs
        </button>
        <div className="job-detail-title">
          <h1>Job: {job.job_number || 'N/A'}</h1>
          <span className={`status-badge status-${job.status}`}>
            {formatStatus(job.status)}
          </span>
        </div>
      </div>

      {/* #7: Single preview banner above tabs */}
      <div className="preview-banner-global">
        Some fields in this job are in preview mode and won't persist between sessions.
        These are marked with a <span className="preview-tag">Preview</span> tag.
      </div>

      {/* #6: Tab scroll indicators */}
      <div className={`tabs-scroll-wrapper${canScrollLeft ? ' can-scroll-left' : ''}${canScrollRight ? ' can-scroll-right' : ''}`}>
        <div className="job-detail-tabs" ref={tabsRef}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="job-detail-body">
        {activeTab === 'overview' && (
          <OverviewTab
            job={job}
            localState={localState}
            onSupabaseChange={handleSupabaseChange}
            onLocalChange={handleLocalChange}
          />
        )}
        {activeTab === 'fnol' && (
          <FNOLTab
            job={job}
            localState={localState}
            onSupabaseChange={handleSupabaseChange}
            onLocalChange={handleLocalChange}
          />
        )}
        {activeTab === 'personnel' && (
          <PersonnelTab
            job={job}
            localState={localState}
            onSupabaseChange={handleSupabaseChange}
            onLocalChange={handleLocalChange}
          />
        )}
        {activeTab === 'dates' && (
          <DatesTab
            job={job}
            localState={localState}
            onSupabaseChange={handleSupabaseChange}
            onLocalChange={handleLocalChange}
          />
        )}
        {activeTab === 'financials' && (
          <FinancialsTab
            job={job}
            localState={localState}
            onSupabaseChange={handleSupabaseChange}
            onLocalChange={handleLocalChange}
          />
        )}
        {activeTab === 'documentation' && (
          <DocumentationTab
            localState={localState}
            onLocalChange={handleLocalChange}
          />
        )}
        {activeTab === 'communications' && (
          <CommunicationsTab
            job={job}
            localState={localState}
            onSupabaseChange={handleSupabaseChange}
            onLocalChange={handleLocalChange}
            onAddNote={handleAddNote}
          />
        )}
      </div>
    </div>
  );
}
