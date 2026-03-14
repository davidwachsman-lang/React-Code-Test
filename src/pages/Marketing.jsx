import React from 'react';
import PageWrapper from '../components/PageWrapper';
import './Marketing.css';

function Marketing() {
  return (
    <PageWrapper>
      <div className="marketing-page">
        <div className="marketing-header">
          <div>
            <h1>Marketing</h1>
            <p>Campaigns, content, and lead generation</p>
          </div>
        </div>

        <div className="marketing-content">
          <div className="marketing-empty">
            <span className="marketing-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </span>
            <h3>Marketing Hub</h3>
            <p>Manage campaigns, track referral sources, and coordinate outreach from here.</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default Marketing;
