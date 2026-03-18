import React from 'react';
import { Link } from 'react-router-dom';
import TimeTracking from '../components/TimeTracking';
import './Page.css';
import './FieldTimeTracking.css';

function FieldTimeTracking() {
  return (
    <div className="page-container field-time-tracking-page">
      <div className="field-time-tracking-hero">
        <div className="field-time-tracking-copy">
          <Link to="/field-services" className="field-time-tracking-back" aria-label="Back to Field Services">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <span className="field-time-tracking-kicker">Technician Mobile View</span>
          <h1>Time Tracking</h1>
          <p>
            Clock in, clock out, and track today&apos;s jobs from a dedicated screen that is ready to
            stand on its own for field technicians.
          </p>
        </div>
      </div>

      <div className="field-time-tracking-shell">
        <TimeTracking />
      </div>
    </div>
  );
}

export default FieldTimeTracking;
