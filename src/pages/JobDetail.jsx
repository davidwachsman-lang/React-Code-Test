import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jobService from '../services/jobService';
import useJobLocalState from '../hooks/useJobLocalState';
import OverviewTab from '../components/job-files/tabs/OverviewTab';
import FNOLTab from '../components/job-files/tabs/FNOLTab';
import PersonnelTab from '../components/job-files/tabs/PersonnelTab';
import DatesTab from '../components/job-files/tabs/DatesTab';
import FinancialsTab from '../components/job-files/tabs/FinancialsTab';
import DocumentationTab from '../components/job-files/tabs/DocumentationTab';
import CommunicationsTab from '../components/job-files/tabs/CommunicationsTab';
import FilesTab from '../components/job-files/tabs/FilesTab';
import './Page.css';
import './JobFiles.css';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'fnol', label: 'FNOL' },
  { key: 'personnel', label: 'Personnel' },
  { key: 'dates', label: 'Dates' },
  { key: 'financials', label: 'Financials' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'communications', label: 'Communications' },
  { key: 'files', label: 'Files' },
];

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

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
      // Flatten customer/property like getAll does
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
      const updatedNotes = job.internal_notes
        ? `${job.internal_notes}\n\n[${new Date().toLocaleString()}]\n${noteText}`
        : `[${new Date().toLocaleString()}]\n${noteText}`;

      await jobService.update(job.id, { internal_notes: updatedNotes });
      setJob(prev => ({ ...prev, internal_notes: updatedNotes }));
    } catch (err) {
      alert('Failed to add note: ' + err.message);
    }
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
          <button onClick={() => navigate('/job-files')} className="btn-primary">
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
        <button className="btn-back" onClick={() => navigate('/job-files')}>
          &#8592; Back to Jobs
        </button>
        <div className="job-detail-title">
          <h1>Job: {job.job_number || 'N/A'}</h1>
          <span className={`status-badge status-${job.status}`}>
            {job.status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
          </span>
        </div>
      </div>

      <div className="job-detail-tabs">
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
            localState={localState}
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
        {activeTab === 'files' && <FilesTab />}
      </div>
    </div>
  );
}
