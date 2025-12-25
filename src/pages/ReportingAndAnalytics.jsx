import { useState } from 'react';
import './Page.css';
import './ReportingAndAnalytics.css';

function ReportingAndAnalytics() {
  const [loading] = useState(false);
  const [error] = useState(null);

  const reports = [
    {
      title: 'Sales Pipeline',
      description: 'Track leads and opportunities through each stage of the sales process',
      icon: '📊',
      color: 'rgba(59, 130, 246, 0.2)'
    },
    {
      title: 'PM / Estimator Scorecard',
      description: 'Performance metrics for project managers and estimators',
      icon: '🎯',
      color: 'rgba(16, 185, 129, 0.2)'
    },
    {
      title: 'Revenue Pipeline by Stage',
      description: 'Revenue breakdown across different project stages',
      icon: '💰',
      color: 'rgba(168, 85, 247, 0.2)'
    },
    {
      title: 'Job Profitability',
      description: 'Analyze profit margins and financial performance by job',
      icon: '📈',
      color: 'rgba(34, 197, 94, 0.2)'
    },
    {
      title: 'Referral Source Report',
      description: 'Track which referral sources generate the most business',
      icon: '🔗',
      color: 'rgba(251, 191, 36, 0.2)'
    },
    {
      title: 'Capacity and Scheduling Utilization',
      description: 'Monitor team capacity and resource allocation efficiency',
      icon: '⚡',
      color: 'rgba(59, 130, 246, 0.2)'
    },
    {
      title: 'Job Cycle Time Analysis',
      description: 'Measure time from job start to completion across stages',
      icon: '⏱️',
      color: 'rgba(239, 68, 68, 0.2)'
    },
    {
      title: 'Job QA & Compliance Report',
      description: 'Quality assurance metrics and compliance tracking',
      icon: '✓',
      color: 'rgba(14, 165, 233, 0.2)'
    }
  ];

  const handleGenerateReport = (reportTitle) => {
    alert(`Generate ${reportTitle} - Coming soon!`);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-state">
          <h2>Error Loading Analytics</h2>
          <p>{error}</p>
          <button onClick={loadData} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container analytics-page">
      <div className="analytics-header">
        <div>
          <h1>Reporting & Analytics</h1>
          <p>Generate and view comprehensive business reports</p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="reports-grid">
        {reports.map((report, index) => (
          <div key={index} className="report-card">
            <div className="report-icon" style={{ background: report.color }}>
              {report.icon}
            </div>
            <div className="report-content">
              <h3>{report.title}</h3>
              <p>{report.description}</p>
              <button
                className="btn-generate-report"
                onClick={() => handleGenerateReport(report.title)}
              >
                Generate Report
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReportingAndAnalytics;
