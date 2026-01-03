import React, { useState } from 'react';
import PerformanceScorecard from '../components/crm/PerformanceScorecard';
import './Page.css';
import './CRM.css';
import './Sandbox.css';

function Sandbox() {
  const [activeTab, setActiveTab] = useState('scorecard'); // 'scorecard', and future tabs

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Sandbox</h1>
        <p className="page-subtitle">Experimental features and items in development</p>
      </div>

      <div className="sandbox-actions">
        <button 
          className={`action-btn ${activeTab === 'scorecard' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('scorecard')}
        >
          <span className="btn-icon">⭐</span>
          Performance Scorecard
        </button>
        {/* Future tabs can be added here */}
      </div>

      <div className="sandbox-content">
        {/* Performance Scorecard View */}
        {activeTab === 'scorecard' && (
          <div className="customers-container">
            <div className="customers-header">
              <h2>Performance Scorecard</h2>
            </div>
            <PerformanceScorecard />
          </div>
        )}

        {/* Placeholder for future tabs */}
        {activeTab !== 'scorecard' && (
          <div className="sandbox-placeholder">
            <p>Coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sandbox;

