import React, { useState } from 'react';
import './Page.css';
import './DailyWarRoom.css';

function DailyWarRoom() {
  const [selectedDivision, setSelectedDivision] = useState('hb-nashville');
  const [selectedSubdivision, setSelectedSubdivision] = useState('mit');
  
  // Track checked metrics
  const [checkedMetrics, setCheckedMetrics] = useState({
    mit: {},
    recon: {},
    largeLoss: {}
  });

  const handleMetricCheck = (section, metricId) => {
    setCheckedMetrics(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [metricId]: !prev[section][metricId]
      }
    }));
  };

  return (
    <div className="page-container war-room-page">
      <div className="war-room-header">
        <h1>Daily War Room</h1>
      </div>

      {/* Content Area with Left Sidebar */}
      <div className="war-room-content">
        {/* Left Sidebar - All Divisions and Subdivisions */}
        <div className="main-sidebar">
          {/* HB Nashville Section */}
          <div className="division-section">
            <button 
              className={`division-btn ${selectedDivision === 'hb-nashville' ? 'active' : ''}`}
              onClick={() => setSelectedDivision('hb-nashville')}
            >
              <span className="division-icon">🏠</span>
              <span className="division-name">HB Nashville</span>
            </button>
            
            {selectedDivision === 'hb-nashville' && (
              <div className="subdivision-list">
                <button 
                  className={`subdivision-btn ${selectedSubdivision === 'mit' ? 'active' : ''}`}
                  onClick={() => setSelectedSubdivision('mit')}
                >
                  <span className="subdivision-icon">🔧</span>
                  <span className="subdivision-name">MIT</span>
                </button>
                <button 
                  className={`subdivision-btn ${selectedSubdivision === 'recon' ? 'active' : ''}`}
                  onClick={() => setSelectedSubdivision('recon')}
                >
                  <span className="subdivision-icon">🏗️</span>
                  <span className="subdivision-name">RECON</span>
                </button>
              </div>
            )}
          </div>

          {/* Large Loss Section */}
          <div className="division-section">
            <button 
              className={`division-btn ${selectedDivision === 'large-loss' ? 'active' : ''}`}
              onClick={() => {
                setSelectedDivision('large-loss');
                setSelectedSubdivision(null);
              }}
            >
              <span className="division-icon">📋</span>
              <span className="division-name">Large Loss</span>
            </button>
          </div>
        </div>

        {/* Right Content - Escalation Metrics */}
        <div className="metrics-content">
          {selectedDivision === 'hb-nashville' && selectedSubdivision === 'mit' && (
            <div className="metrics-section">
              <h2>MIT Escalation Metrics</h2>
              <div className="metrics-grid">
                <div className={`metric-card ${checkedMetrics.mit['forms-signed'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.mit['forms-signed'] || false}
                      onChange={() => handleMetricCheck('mit', 'forms-signed')}
                    />
                    <div className="metric-label">Jobs Without Forms Signed</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number urgent">10</span>
                    <span className="metric-total">/ 50 jobs</span>
                  </div>
                </div>

                <div className={`metric-card ${checkedMetrics.mit['equipment-pickups'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.mit['equipment-pickups'] || false}
                      onChange={() => handleMetricCheck('mit', 'equipment-pickups')}
                    />
                    <div className="metric-label">Equipment Pickups Overdue</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number warning">7</span>
                    <span className="metric-total">/ 50 jobs</span>
                  </div>
                </div>

                <div className={`metric-card ${checkedMetrics.mit['moisture-maps'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.mit['moisture-maps'] || false}
                      onChange={() => handleMetricCheck('mit', 'moisture-maps')}
                    />
                    <div className="metric-label">Missing Moisture Maps</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number warning">5</span>
                    <span className="metric-total">/ 50 jobs</span>
                  </div>
                </div>

                <div className={`metric-card ${checkedMetrics.mit['drying-target'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.mit['drying-target'] || false}
                      onChange={() => handleMetricCheck('mit', 'drying-target')}
                    />
                    <div className="metric-label">Drying Not On Target</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number urgent">8</span>
                    <span className="metric-total">/ 50 jobs</span>
                  </div>
                </div>

                <div className={`metric-card ${checkedMetrics.mit['daily-logs'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.mit['daily-logs'] || false}
                      onChange={() => handleMetricCheck('mit', 'daily-logs')}
                    />
                    <div className="metric-label">Daily Logs Missing</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number warning">12</span>
                    <span className="metric-total">/ 50 jobs</span>
                  </div>
                </div>

                <div className={`metric-card ${checkedMetrics.mit['tech-dispatch'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.mit['tech-dispatch'] || false}
                      onChange={() => handleMetricCheck('mit', 'tech-dispatch')}
                    />
                    <div className="metric-label">No Tech Dispatched Today</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number urgent">3</span>
                    <span className="metric-total">/ 50 jobs</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedDivision === 'hb-nashville' && selectedSubdivision === 'recon' && (
            <div className="metrics-section">
              <h2>RECON Escalation Metrics</h2>
              <div className="metrics-grid">
                <div className={`metric-card ${checkedMetrics.recon['without-estimates'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.recon['without-estimates'] || false}
                      onChange={() => handleMetricCheck('recon', 'without-estimates')}
                    />
                    <div className="metric-label">Jobs Without Estimates</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number urgent">6</span>
                    <span className="metric-total">/ 35 jobs</span>
                  </div>
                </div>

                <div className={`metric-card ${checkedMetrics.recon['change-orders'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.recon['change-orders'] || false}
                      onChange={() => handleMetricCheck('recon', 'change-orders')}
                    />
                    <div className="metric-label">Change Orders Unapproved</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number warning">4</span>
                    <span className="metric-total">/ 35 jobs</span>
                  </div>
                </div>

                <div className={`metric-card ${checkedMetrics.recon['over-budget'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.recon['over-budget'] || false}
                      onChange={() => handleMetricCheck('recon', 'over-budget')}
                    />
                    <div className="metric-label">Jobs Over Budget</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number urgent">5</span>
                    <span className="metric-total">/ 35 jobs</span>
                  </div>
                </div>

                <div className={`metric-card ${checkedMetrics.recon['material-orders'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.recon['material-orders'] || false}
                      onChange={() => handleMetricCheck('recon', 'material-orders')}
                    />
                    <div className="metric-label">Material Orders Delayed</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number warning">3</span>
                    <span className="metric-total">/ 35 jobs</span>
                  </div>
                </div>

                <div className={`metric-card ${checkedMetrics.recon['inspections'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.recon['inspections'] || false}
                      onChange={() => handleMetricCheck('recon', 'inspections')}
                    />
                    <div className="metric-label">Final Inspections Pending</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number">8</span>
                    <span className="metric-total">/ 35 jobs</span>
                  </div>
                </div>

                <div className={`metric-card ${checkedMetrics.recon['callbacks'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.recon['callbacks'] || false}
                      onChange={() => handleMetricCheck('recon', 'callbacks')}
                    />
                    <div className="metric-label">Customer Callbacks Missed</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number urgent">2</span>
                    <span className="metric-total">/ 35 jobs</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedDivision === 'large-loss' && (
            <div className="metrics-section">
              <h2>Large Loss Escalation Metrics</h2>
              <div className="metrics-grid">
                <div className={`metric-card ${checkedMetrics.largeLoss['daily-reports'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.largeLoss['daily-reports'] || false}
                      onChange={() => handleMetricCheck('largeLoss', 'daily-reports')}
                    />
                    <div className="metric-label">Projects Without Daily Reports</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number urgent">2</span>
                    <span className="metric-total">/ 12 projects</span>
                  </div>
                </div>

                <div className={`metric-card ${checkedMetrics.largeLoss['carrier-auth'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.largeLoss['carrier-auth'] || false}
                      onChange={() => handleMetricCheck('largeLoss', 'carrier-auth')}
                    />
                    <div className="metric-label">Carrier Authorization Pending</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number warning">3</span>
                    <span className="metric-total">/ 12 projects</span>
                  </div>
                </div>

                <div className={`metric-card ${checkedMetrics.largeLoss['budget-reviews'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.largeLoss['budget-reviews'] || false}
                      onChange={() => handleMetricCheck('largeLoss', 'budget-reviews')}
                    />
                    <div className="metric-label">Budget Reviews Overdue</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number urgent">4</span>
                    <span className="metric-total">/ 12 projects</span>
                  </div>
                </div>

                <div className={`metric-card ${checkedMetrics.largeLoss['safety-inspections'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.largeLoss['safety-inspections'] || false}
                      onChange={() => handleMetricCheck('largeLoss', 'safety-inspections')}
                    />
                    <div className="metric-label">Site Safety Inspections Due</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number warning">1</span>
                    <span className="metric-total">/ 12 projects</span>
                  </div>
                </div>

                <div className={`metric-card ${checkedMetrics.largeLoss['subcontractor-invoices'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.largeLoss['subcontractor-invoices'] || false}
                      onChange={() => handleMetricCheck('largeLoss', 'subcontractor-invoices')}
                    />
                    <div className="metric-label">Subcontractor Invoices Pending</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number">6</span>
                    <span className="metric-total">/ 12 projects</span>
                  </div>
                </div>

                <div className={`metric-card ${checkedMetrics.largeLoss['equipment-issues'] ? 'checked' : ''}`}>
                  <div className="metric-header">
                    <input 
                      type="checkbox" 
                      className="metric-checkbox"
                      checked={checkedMetrics.largeLoss['equipment-issues'] || false}
                      onChange={() => handleMetricCheck('largeLoss', 'equipment-issues')}
                    />
                    <div className="metric-label">Equipment Utilization Issues</div>
                  </div>
                  <div className="metric-value-display">
                    <span className="metric-number urgent">3</span>
                    <span className="metric-total">/ 12 projects</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DailyWarRoom;
