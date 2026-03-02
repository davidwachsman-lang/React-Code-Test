import React from 'react';
import { Link } from 'react-router-dom';
import './Page.css';
import './DispatchHub.css';

function DispatchHub() {
  return (
    <div className="page-container dispatch-hub-page">
      <header className="dispatch-hub-header">
        <h1>Dispatch & Scheduling</h1>
        <p>Select where you want to start.</p>
      </header>

      <section className="dispatch-hub-grid">
        <Link to="/dispatch/scheduling" className="dispatch-hub-card">
          <span className="dispatch-hub-chip">Planning</span>
          <h2>Scheduling Command Center</h2>
          <p>Weekly and multi-day scheduling views for workload planning and crew balancing.</p>
          <span className="dispatch-hub-cta">Open Scheduling</span>
        </Link>

        <Link to="/dispatch/board" className="dispatch-hub-card">
          <span className="dispatch-hub-chip">Execution</span>
          <h2>Dispatch Board</h2>
          <p>Day-level dispatch board for assignments, live routing, and same-day moves.</p>
          <span className="dispatch-hub-cta">Open Dispatch Board</span>
        </Link>
      </section>
    </div>
  );
}

export default DispatchHub;
