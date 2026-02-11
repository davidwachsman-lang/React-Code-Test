import React, { useState, useEffect } from 'react';
import roleExpectationsNotesService from '../services/roleExpectationsNotesService';
import './Expectations2026.css';

function Expectations2026() {
  const [selectedRole, setSelectedRole] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [selfNotes, setSelfNotes] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [noteHistory, setNoteHistory] = useState({ manager: [], self: [] });

  // Role-specific expectations data
  const roleExpectations = {
    'Project Managers': [
      'Proactively manage customer expectations and scope.',
      'Own the job financially, operationally, and communicatively.',
      'Keep job files clean, current, and audit-ready.',
      'Anticipate issues before they become escalations.',
      'Close jobs cleanly – paperwork, billing, and follow-up matter.'
    ],
    'Estimators': [
      'Capture all affected areas, trades, and line items to prevent missed scope and downstream rework.',
      'Produce accurate, complete, and defensible estimates that reflect the full scope of loss and withstand carrier and customer review.',
      'Coordinate with project managers and field teams to ensure scopes are practical, buildable, and executable.',
      'Meet estimate turnaround timelines and communicate early if delays or complexities arise.',
      'Maintain clean, audit-ready documentation including photos, notes, sketches, and estimate narratives.'
    ],
    'Crew Chiefs': [
      'Lead by example – attitude and professionalism set the tone.',
      'Run safe, organized, professional job sites.',
      'Follow drying, demolition, and safety protocols exactly.',
      'Protect customer property and maintain cleanliness.',
      'Communicate daily job status clearly and accurately.'
    ],
    'Job File Coordinators': [
      'Support clear, consistent communication with internal and external customers.',
      'Own job file integrity and accuracy from start to finish.',
      'Ensure scope, approvals, and documentation align to customer expectations.',
      'Support billing speed and accuracy.',
      'Surface gaps and issues early before they impact the customer.'
    ],
    'Technicians': [
      'Follow instructions, SOPs, and safety requirements.',
      'Show up prepared and on time, every day.',
      'Treat every home and business with care and respect.',
      'Ask questions early if something doesn\'t look right.',
      'Support your team – no egos, no shortcuts.'
    ],
    'Sales / Business Development': [
      'Set honest, realistic expectations with customers and partners.',
      'Represent the brand professionally at all times.',
      'Document opportunities and handoffs clearly.',
      'Stay within process and approval guidelines.',
      'Build long-term relationships, not short-term wins.'
    ],
    'Office + Finance + HR': [
      'Keep systems, files, and documentation current.',
      'Accuracy matters – details drive cash flow.',
      'Support operations with urgency and clarity.',
      'Raise issues before they impact customers or revenue.',
      'Treat internal teams like customers – responsiveness counts.'
    ],
    'Leadership + Management': [
      'Hold people accountable – fairly and promptly.',
      'Be visible, clear, direct, and consistent.',
      'Remove obstacles for the team.',
      'Communicate the "why," not just the "what."',
      'Model the behavior expected of everyone else.'
    ]
  };

  // Dummy Key Performance Metrics (same for all roles for now)
  const dummyMetrics = [
    { name: 'Customer Satisfaction Score', value: '4.8/5.0', target: '4.5+' },
    { name: 'On-Time Completion Rate', value: '92%', target: '90%+' },
    { name: 'Quality Score', value: '88%', target: '85%+' }
  ];

  const roles = Object.keys(roleExpectations);

  // Load notes when role changes
  useEffect(() => {
    if (selectedRole) {
      loadNotesForRole(selectedRole);
    } else {
      setManagerNotes('');
      setSelfNotes('');
      setNoteHistory({ manager: [], self: [] });
    }
  }, [selectedRole]);

  // Load notes for a role
  const loadNotesForRole = async (role) => {
    setLoadingNotes(true);
    try {
      const [managerNote, selfNote, managerHistory, selfHistory] = await Promise.all([
        roleExpectationsNotesService.getLatestNote(role, 'manager'),
        roleExpectationsNotesService.getLatestNote(role, 'self'),
        roleExpectationsNotesService.getNoteHistory(role, 'manager'),
        roleExpectationsNotesService.getNoteHistory(role, 'self')
      ]);

      setManagerNotes(managerNote?.note_content || '');
      setSelfNotes(selfNote?.note_content || '');
      setNoteHistory({
        manager: managerHistory || [],
        self: selfHistory || []
      });
    } catch (error) {
      console.error('Error loading notes:', error);
      // Don't show alert, just log - notes might not exist yet
      // Set empty notes if there's an error
      setManagerNotes('');
      setSelfNotes('');
      setNoteHistory({ manager: [], self: [] });
    } finally {
      setLoadingNotes(false);
    }
  };

  // Save manager notes
  const handleSaveManagerNotes = async () => {
    if (!selectedRole) return;
    
    setSavingNotes(true);
    try {
      await roleExpectationsNotesService.upsertLatestNote(
        selectedRole,
        'manager',
        managerNotes
      );
      // Reload to get updated timestamp
      await loadNotesForRole(selectedRole);
    } catch (error) {
      console.error('Error saving manager notes:', error);
      alert('Failed to save manager notes: ' + error.message);
    } finally {
      setSavingNotes(false);
    }
  };

  // Save self notes
  const handleSaveSelfNotes = async () => {
    if (!selectedRole) return;
    
    setSavingNotes(true);
    try {
      await roleExpectationsNotesService.upsertLatestNote(
        selectedRole,
        'self',
        selfNotes
      );
      // Reload to get updated timestamp
      await loadNotesForRole(selectedRole);
    } catch (error) {
      console.error('Error saving self notes:', error);
      alert('Failed to save self notes: ' + error.message);
    } finally {
      setSavingNotes(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="precision-layout expectations-2026-page">
      <div className="precision-main">
        <header className="expectations-2026-header">
          <h1>FY26 Expectations</h1>
          <p className="expectations-2026-subtitle">Team and role-specific expectations & performance management</p>
        </header>

        <div className="precision-content expectations-2026-content">
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
          <h2 className="section-title">Role-Specific Expectations & Performance Management</h2>
          
          <div className="role-selector">
            <label htmlFor="role-select">Select Role:</label>
            <select
              id="role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="role-dropdown p-input"
            >
              <option value="">-- Select a Role --</option>
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {selectedRole && (
            <div className="role-scorecard">
              <div className="scorecard-left">
                <h3 className="scorecard-section-title">Expectations</h3>
                <div className="role-expectations-list">
                  {roleExpectations[selectedRole].map((expectation, index) => (
                    <div key={index} className="role-expectation-item">
                      <span className="role-number">{String(index + 1).padStart(2, '0')}.</span>
                      <span className="role-text">{expectation}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="scorecard-middle">
                <h3 className="scorecard-section-title">Key Performance Metrics</h3>
                <div className="metrics-list">
                  {dummyMetrics.map((metric, index) => (
                    <div key={index} className="metric-item">
                      <div className="metric-name">{metric.name}</div>
                      <div className="metric-value">{metric.value}</div>
                      <div className="metric-target">Target: {metric.target}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="scorecard-right">
                <h3 className="scorecard-section-title">Notes</h3>
                {loadingNotes ? (
                  <div className="notes-loading">Loading notes...</div>
                ) : (
                  <div className="notes-section">
                    <div className="notes-group">
                      <div className="notes-header">
                        <label htmlFor="self-notes" className="notes-label">Self Notes</label>
                        {noteHistory.self.length > 0 && noteHistory.self[0]?.created_at && (
                          <span className="notes-timestamp">
                            Last saved: {formatDate(noteHistory.self[0].created_at)}
                          </span>
                        )}
                      </div>
                      <textarea
                        id="self-notes"
                        className="notes-textarea p-input"
                        value={selfNotes}
                        onChange={(e) => setSelfNotes(e.target.value)}
                        placeholder="Enter self notes here..."
                        rows={6}
                        disabled={savingNotes}
                      />
                      <button
                        className="notes-save-btn"
                        onClick={handleSaveSelfNotes}
                        disabled={savingNotes || !selectedRole}
                      >
                        {savingNotes ? 'Saving...' : 'Save Self Notes'}
                      </button>
                      {noteHistory.self.length > 1 && (
                        <div className="notes-history">
                          <details className="notes-history-details">
                            <summary className="notes-history-summary">
                              View History ({noteHistory.self.length} entries)
                            </summary>
                            <div className="notes-history-list">
                              {noteHistory.self.map((note, index) => (
                                <div key={note.id} className="notes-history-item">
                                  <div className="notes-history-content">{note.note_content}</div>
                                  <div className="notes-history-date">{formatDate(note.created_at)}</div>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                    <div className="notes-group">
                      <div className="notes-header">
                        <label htmlFor="manager-notes" className="notes-label">Manager Notes</label>
                        {noteHistory.manager.length > 0 && noteHistory.manager[0]?.created_at && (
                          <span className="notes-timestamp">
                            Last saved: {formatDate(noteHistory.manager[0].created_at)}
                          </span>
                        )}
                      </div>
                      <textarea
                        id="manager-notes"
                        className="notes-textarea p-input"
                        value={managerNotes}
                        onChange={(e) => setManagerNotes(e.target.value)}
                        placeholder="Enter manager notes here..."
                        rows={6}
                        disabled={savingNotes}
                      />
                      <button
                        className="notes-save-btn"
                        onClick={handleSaveManagerNotes}
                        disabled={savingNotes || !selectedRole}
                      >
                        {savingNotes ? 'Saving...' : 'Save Manager Notes'}
                      </button>
                      {noteHistory.manager.length > 1 && (
                        <div className="notes-history">
                          <details className="notes-history-details">
                            <summary className="notes-history-summary">
                              View History ({noteHistory.manager.length} entries)
                            </summary>
                            <div className="notes-history-list">
                              {noteHistory.manager.map((note, index) => (
                                <div key={note.id} className="notes-history-item">
                                  <div className="notes-history-content">{note.note_content}</div>
                                  <div className="notes-history-date">{formatDate(note.created_at)}</div>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
        </div>
      </div>
    </div>
  );
}

export default Expectations2026;
