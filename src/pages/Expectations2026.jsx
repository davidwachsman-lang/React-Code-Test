import React from 'react';
import './Page.css';
import './Expectations2026.css';

function Expectations2026() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>FY26 Expectations</h1>
        </div>
      </div>

      <div className="expectations-content">
        {/* Team Expectations Overview */}
        <section className="expectations-section team-expectations">
          <h2 className="section-title">Team Expectations</h2>
          <div className="expectations-grid">
            <div className="expectation-card">
              <div className="expectation-number">01.</div>
              <div className="expectation-content">
                <h3>Own the Outcome</h3>
                <p>If it's assigned to you, you own it from start to finish – quality, timelines, documentation, and follow-through.</p>
              </div>
            </div>
            <div className="expectation-card">
              <div className="expectation-number">02.</div>
              <div className="expectation-content">
                <h3>Protect the Customer</h3>
                <p>Treat every job as if it were happening in your own home. Communicate clearly, respond quickly, and never let a customer feel ignored, confused, or surprised.</p>
              </div>
            </div>
            <div className="expectation-card">
              <div className="expectation-number">03.</div>
              <div className="expectation-content">
                <h3>Do the Basics Exceptionally Well</h3>
                <p>Be on time. Be prepared. Follow SOPs. Document the job properly. The fundamentals win more jobs than heroics.</p>
              </div>
            </div>
            <div className="expectation-card">
              <div className="expectation-number">04.</div>
              <div className="expectation-content">
                <h3>Communicate Early and Often</h3>
                <p>Problems don't get smaller with time. Raise issues early, document decisions, and keep teammates and leaders informed.</p>
              </div>
            </div>
            <div className="expectation-card">
              <div className="expectation-number">05.</div>
              <div className="expectation-content">
                <h3>Act Like a Professional</h3>
                <p>Respect customers, coworkers, partners, and property. Safety, integrity, and respect are non-negotiable.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Role-Specific Expectations */}
        <section className="expectations-section role-expectations">
          <h2 className="section-title">Role-Specific Expectations</h2>
          <div className="role-tiles-grid">
          {/* Project Managers */}
          <div className="role-section">
            <h3 className="role-title">Project Managers</h3>
            <div className="role-expectations-list">
              <div className="role-expectation-item">
                <span className="role-number">01.</span>
                <span className="role-text">Proactively manage customer expectations and scope.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">02.</span>
                <span className="role-text">Own the job financially, operationally, and communicatively.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">03.</span>
                <span className="role-text">Keep job files clean, current, and audit-ready.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">04.</span>
                <span className="role-text">Anticipate issues before they become escalations.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">05.</span>
                <span className="role-text">Close jobs cleanly – paperwork, billing, and follow-up matter.</span>
              </div>
            </div>
          </div>

          {/* Estimators */}
          <div className="role-section">
            <h3 className="role-title">Estimators</h3>
            <div className="role-expectations-list">
              <div className="role-expectation-item">
                <span className="role-number">01.</span>
                <span className="role-text">Capture all affected areas, trades, and line items so work is never missed or under-scoped.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">02.</span>
                <span className="role-text">Produce accurate, complete, and defensible estimates that reflect the full scope of loss and withstand carrier and customer review.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">03.</span>
                <span className="role-text">Coordinate with project managers and field teams to ensure scopes are practical, buildable, and executable.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">04.</span>
                <span className="role-text">Meet estimate turnaround timelines and communicate early if delays or complexities arise.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">05.</span>
                <span className="role-text">Maintain clean, audit-ready documentation including photos, notes, sketches, and estimate narratives.</span>
              </div>
            </div>
          </div>

          {/* Crew Chiefs */}
          <div className="role-section">
            <h3 className="role-title">Crew Chiefs</h3>
            <div className="role-expectations-list">
              <div className="role-expectation-item">
                <span className="role-number">01.</span>
                <span className="role-text">Lead by example – attitude sets the tone.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">02.</span>
                <span className="role-text">Run safe, organized, professional job sites.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">03.</span>
                <span className="role-text">Follow drying, demolition, and safety protocols exactly.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">04.</span>
                <span className="role-text">Protect customer property and maintain cleanliness.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">05.</span>
                <span className="role-text">Communicate daily job status clearly and accurately.</span>
              </div>
            </div>
          </div>

          {/* Technicians */}
          <div className="role-section">
            <h3 className="role-title">Technicians</h3>
            <div className="role-expectations-list">
              <div className="role-expectation-item">
                <span className="role-number">01.</span>
                <span className="role-text">Follow instructions, SOPs, and safety requirements.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">02.</span>
                <span className="role-text">Show up prepared and on time, every day.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">03.</span>
                <span className="role-text">Treat every home and business with care and respect.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">04.</span>
                <span className="role-text">Ask questions early if something doesn't look right.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">05.</span>
                <span className="role-text">Support your team – no egos, no shortcuts.</span>
              </div>
            </div>
          </div>

          {/* Sales / Business Development */}
          <div className="role-section">
            <h3 className="role-title">Sales / Business Development</h3>
            <div className="role-expectations-list">
              <div className="role-expectation-item">
                <span className="role-number">01.</span>
                <span className="role-text">Set honest expectations with customers and partners.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">02.</span>
                <span className="role-text">Represent the brand professionally at all times.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">03.</span>
                <span className="role-text">Document opportunities and handoffs clearly.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">04.</span>
                <span className="role-text">Stay within process and approval guidelines.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">05.</span>
                <span className="role-text">Build long-term relationships, not short-term wins.</span>
              </div>
            </div>
          </div>

          {/* Office + Finance + HR */}
          <div className="role-section">
            <h3 className="role-title">Office + Finance + HR</h3>
            <div className="role-expectations-list">
              <div className="role-expectation-item">
                <span className="role-number">01.</span>
                <span className="role-text">Keep systems, files, and documentation current.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">02.</span>
                <span className="role-text">Accuracy matters – details drive cash flow.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">03.</span>
                <span className="role-text">Support operations with urgency and clarity.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">04.</span>
                <span className="role-text">Raise issues before they impact customers or revenue.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">05.</span>
                <span className="role-text">Treat internal teams like customers – responsiveness counts.</span>
              </div>
            </div>
          </div>

          {/* Leadership + Management */}
          <div className="role-section">
            <h3 className="role-title">Leadership + Management</h3>
            <div className="role-expectations-list">
              <div className="role-expectation-item">
                <span className="role-number">01.</span>
                <span className="role-text">Hold people accountable – fairly and promptly.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">02.</span>
                <span className="role-text">Be visible, clear, and consistent.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">03.</span>
                <span className="role-text">Remove obstacles for the team.</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">04.</span>
                <span className="role-text">Communicate the "why," not just the "what."</span>
              </div>
              <div className="role-expectation-item">
                <span className="role-number">05.</span>
                <span className="role-text">Model the behavior expected of everyone else.</span>
              </div>
            </div>
          </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Expectations2026;
