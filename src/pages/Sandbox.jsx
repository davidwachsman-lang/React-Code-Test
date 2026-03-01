import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PerformanceScorecard from '../components/crm/PerformanceScorecard';
import CompanyDirectory from '../components/CompanyDirectory';
import './Page.css';
import './CRM.css';
import './Sandbox.css';

function Sandbox() {
  const [activeTab, setActiveTab] = useState('scorecard'); // 'scorecard', 'b2b-referrals', 'customer-nps', 'enps', 'financials', 'company-directory', and future tabs
  const [npsScore, setNpsScore] = useState(null);
  const [npsSubmitted, setNpsSubmitted] = useState(false);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Sandbox</h1>
        <p className="page-subtitle">Experimental features and items in development</p>
      </div>

      <div className="sandbox-actions">
        <Link 
          to="/war-room"
          className="action-btn action-btn-blue"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span className="btn-icon">⚡</span>
          Daily War Room
        </Link>
        <Link 
          to="/tm-estimate"
          className="action-btn action-btn-blue"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span className="btn-icon">📋</span>
          T&M Estimate
        </Link>
        <Link 
          to="/forms"
          className="action-btn action-btn-blue"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span className="btn-icon">📄</span>
          Forms
        </Link>
        <Link 
          to="/insurance-job-sops"
          className="action-btn action-btn-blue"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span className="btn-icon">📑</span>
          Insurance Job SOPs
        </Link>
        <Link 
          to="/conversion"
          className="action-btn action-btn-blue"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span className="btn-icon">🔄</span>
          Conversion
        </Link>
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
        <button 
          className={`action-btn ${activeTab === 'financials' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('financials')}
        >
          <span className="btn-icon">💰</span>
          Financials & Billing
        </button>
        <button 
          className={`action-btn ${activeTab === 'company-directory' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('company-directory')}
        >
          <span className="btn-icon">📒</span>
          Company Directory
        </button>
        <button
          className={`action-btn ${activeTab === 'equipment' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('equipment')}
        >
          <span className="btn-icon">📦</span>
          Equipment & Inventory
        </button>
        <button
          className={`action-btn ${activeTab === 'pm-checklist' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('pm-checklist')}
        >
          <span className="btn-icon">📋</span>
          PM Job Checklist
        </button>
        <button
          className={`action-btn ${activeTab === 'pm-compliance' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('pm-compliance')}
        >
          <span className="btn-icon">✅</span>
          PM File Compliance
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

        {/* Company Directory View */}
        {activeTab === 'company-directory' && (
          <div className="customers-container">
            <div className="customers-header">
              <h2>Company Directory</h2>
            </div>
            <CompanyDirectory />
          </div>
        )}

        {/* Financials & Billing View */}
        {activeTab === 'financials' && (
          <div className="sandbox-placeholder" style={{ maxWidth: 'none' }}>
            <h2>Financials and Billing</h2>
            <p>Manage invoices, payments, and financial tracking.</p>
            <div className="content-section">
              <h3>Financial Management</h3>
              <ul>
                <li>Invoice generation</li>
                <li>Payment tracking</li>
                <li>Expense management</li>
                <li>Financial reporting</li>
              </ul>
            </div>
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

        {/* Equipment & Inventory View */}
        {activeTab === 'equipment' && (
          <div className="sandbox-placeholder">
            <p>Equipment & Inventory feature coming soon...</p>
          </div>
        )}

        {/* PM Job Checklist View */}
        {activeTab === 'pm-checklist' && (
          <div className="sandbox-placeholder">
            <p>PM Job Checklist feature coming soon...</p>
          </div>
        )}

        {/* PM File Compliance View */}
        {activeTab === 'pm-compliance' && (
          <div className="sandbox-placeholder">
            <p>PM File Compliance feature coming soon...</p>
          </div>
        )}

        {/* Placeholder for future tabs */}
        {activeTab !== 'scorecard' && activeTab !== 'b2b-referrals' && activeTab !== 'customer-nps' && activeTab !== 'enps' && activeTab !== 'financials' && activeTab !== 'company-directory' && activeTab !== 'equipment' && activeTab !== 'pm-checklist' && activeTab !== 'pm-compliance' && (
          <div className="sandbox-placeholder">
            <p>Coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sandbox;

