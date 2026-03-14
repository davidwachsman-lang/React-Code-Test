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
      icon: '\u{1F4CA}',
      categoryColor: '#9333EA'
    },
    {
      title: 'PM / Estimator Scorecard',
      description: 'Performance metrics for project managers and estimators',
      icon: '\u{1F3AF}',
      categoryColor: '#CA8A04'
    },
    {
      title: 'Revenue Pipeline by Stage',
      description: 'Revenue breakdown across different project stages',
      icon: '\u{1F4B0}',
      categoryColor: '#EA580C'
    },
    {
      title: 'Job Profitability',
      description: 'Analyze profit margins and financial performance by job',
      icon: '\u{1F4C8}',
      categoryColor: '#EA580C'
    },
    {
      title: 'Referral Source Report',
      description: 'Track which referral sources generate the most business',
      icon: '\u{1F517}',
      categoryColor: '#9333EA'
    },
    {
      title: 'Capacity and Scheduling Utilization',
      description: 'Monitor team capacity and resource allocation efficiency',
      icon: '\u26A1',
      categoryColor: '#CA8A04'
    },
    {
      title: 'Job Cycle Time Analysis',
      description: 'Measure time from job start to completion across stages',
      icon: '\u23F1\uFE0F',
      categoryColor: '#CA8A04'
    },
    {
      title: 'Job QA & Compliance Report',
      description: 'Quality assurance metrics and compliance tracking',
      icon: '\u2713',
      categoryColor: '#059669'
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
          <div
            key={index}
            className="report-card"
            style={{ borderLeft: `3px solid ${report.categoryColor}` }}
          >
            <div className="report-icon">
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
