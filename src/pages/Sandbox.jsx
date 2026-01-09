import React, { useState } from 'react';
import PerformanceScorecard from '../components/crm/PerformanceScorecard';
import './Page.css';
import './CRM.css';
import './Sandbox.css';

function Sandbox() {
  const [activeTab, setActiveTab] = useState('scorecard'); // 'scorecard', 'b2b-referrals', 'customer-nps', 'enps', and future tabs
  const [npsScore, setNpsScore] = useState(null);
  const [npsSubmitted, setNpsSubmitted] = useState(false);

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
        <button 
          className={`action-btn ${activeTab === 'b2b-referrals' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('b2b-referrals')}
        >
          <span className="btn-icon">🤝</span>
          B2B Referrals
        </button>
        <button 
          className={`action-btn ${activeTab === 'customer-nps' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('customer-nps')}
        >
          <span className="btn-icon">📊</span>
          Customer NPS
        </button>
        <button 
          className={`action-btn ${activeTab === 'enps' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('enps')}
        >
          <span className="btn-icon">👥</span>
          eNPS
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

        {/* B2B Referrals View */}
        {activeTab === 'b2b-referrals' && (
          <div className="sandbox-placeholder">
            <p>B2B Referrals feature coming soon...</p>
          </div>
        )}

        {/* Customer NPS View */}
        {activeTab === 'customer-nps' && (
          <div className="sandbox-placeholder">
            <p>Customer NPS feature coming soon...</p>
          </div>
        )}

        {/* eNPS View */}
        {activeTab === 'enps' && (
          <div className="customers-container">
            <div className="customers-header">
              <h2>Employee Net Promoter Score (eNPS)</h2>
            </div>
            {!npsSubmitted ? (
              <div className="nps-survey">
                <div className="nps-question">
                  <h3>How likely are you to recommend working at this company to a friend or colleague?</h3>
                  <p className="nps-subtitle">Please rate on a scale of 0-10</p>
                </div>
                <div className="nps-scale">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      className={`nps-button ${npsScore === score ? 'nps-selected' : ''}`}
                      onClick={() => setNpsScore(score)}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <div className="nps-labels">
                  <span className="nps-label-left">Not at all likely</span>
                  <span className="nps-label-right">Extremely likely</span>
                </div>
                {npsScore !== null && (
                  <div className="nps-actions">
                    <button
                      className="action-btn action-btn-green"
                      onClick={() => setNpsSubmitted(true)}
                    >
                      Submit
                    </button>
                    <button
                      className="action-btn action-btn-gray"
                      onClick={() => {
                        setNpsScore(null);
                        setNpsSubmitted(false);
                      }}
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="nps-results">
                <div className="nps-result-card">
                  <h3>Thank you for your feedback!</h3>
                  <div className="nps-score-display">
                    <span className="nps-score-value">{npsScore}</span>
                    <span className="nps-score-label">/ 10</span>
                  </div>
                  <div className="nps-category">
                    {npsScore >= 9 && <p className="nps-promoter">Promoter</p>}
                    {npsScore >= 7 && npsScore <= 8 && <p className="nps-passive">Passive</p>}
                    {npsScore <= 6 && <p className="nps-detractor">Detractor</p>}
                  </div>
                  <button
                    className="action-btn action-btn-gray"
                    onClick={() => {
                      setNpsScore(null);
                      setNpsSubmitted(false);
                    }}
                  >
                    Submit Another Response
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Placeholder for future tabs */}
        {activeTab !== 'scorecard' && activeTab !== 'b2b-referrals' && activeTab !== 'customer-nps' && activeTab !== 'enps' && (
          <div className="sandbox-placeholder">
            <p>Coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sandbox;

