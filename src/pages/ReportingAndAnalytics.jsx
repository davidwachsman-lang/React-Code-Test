import { useState } from 'react';
import './ReportingAndAnalytics.css';

const svgProps = { viewBox: '0 0 24 24', fill: 'currentColor', width: 28, height: 28 };

const REPORT_ICONS = {
  chartBar: (
    <svg {...svgProps} aria-hidden="true">
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
    </svg>
  ),
  target: (
    <svg {...svgProps} aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  ),
  currency: (
    <svg {...svgProps} aria-hidden="true">
      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
    </svg>
  ),
  trendUp: (
    <svg {...svgProps} aria-hidden="true">
      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" />
    </svg>
  ),
  link: (
    <svg {...svgProps} aria-hidden="true">
      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
    </svg>
  ),
  lightning: (
    <svg {...svgProps} aria-hidden="true">
      <path d="M7 2v11h3v9l7-12h-4l4-8z" />
    </svg>
  ),
  clock: (
    <svg {...svgProps} aria-hidden="true">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
    </svg>
  ),
  checkCircle: (
    <svg {...svgProps} aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  )
};

function ReportIcon({ iconKey }) {
  const Icon = REPORT_ICONS[iconKey];
  return Icon ? <span className="report-icon-svg">{Icon}</span> : null;
}

function ReportingAndAnalytics() {
  const [loading] = useState(false);
  const [error] = useState(null);

  const loadData = () => {
    window.location.reload();
  };

  const reports = [
    {
      title: 'Sales Pipeline',
      description: 'Track leads and opportunities through each stage of the sales process',
      iconKey: 'chartBar',
      iconClass: 'blue'
    },
    {
      title: 'PM / Estimator Scorecard',
      description: 'Performance metrics for project managers and estimators',
      iconKey: 'target',
      iconClass: 'success'
    },
    {
      title: 'Revenue Pipeline by Stage',
      description: 'Revenue breakdown across different project stages',
      iconKey: 'currency',
      iconClass: 'primary'
    },
    {
      title: 'Job Profitability',
      description: 'Analyze profit margins and financial performance by job',
      iconKey: 'trendUp',
      iconClass: 'success'
    },
    {
      title: 'Referral Source Report',
      description: 'Track which referral sources generate the most business',
      iconKey: 'link',
      iconClass: 'warning'
    },
    {
      title: 'Capacity and Scheduling Utilization',
      description: 'Monitor team capacity and resource allocation efficiency',
      iconKey: 'lightning',
      iconClass: 'blue'
    },
    {
      title: 'Job Cycle Time Analysis',
      description: 'Measure time from job start to completion across stages',
      iconKey: 'clock',
      iconClass: 'error'
    },
    {
      title: 'Job QA & Compliance Report',
      description: 'Quality assurance metrics and compliance tracking',
      iconKey: 'checkCircle',
      iconClass: 'blue'
    }
  ];

  const handleGenerateReport = (reportTitle) => {
    alert(`Generate ${reportTitle} - Coming soon!`);
  };

  if (loading) {
    return (
      <div className="precision-layout reporting-page">
        <div className="precision-main">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="precision-layout reporting-page">
        <div className="precision-main">
          <div className="error-state">
            <h2>Error Loading Analytics</h2>
            <p>{error}</p>
            <button type="button" onClick={loadData} className="btn-primary">Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="precision-layout reporting-page">
      <div className="precision-main">
        <header className="reporting-header">
          <div>
            <h1>Reporting & Analytics</h1>
            <p>Generate and view comprehensive business reports</p>
          </div>
        </header>

        <div className="reporting-content">
          <div className="reports-grid">
            {reports.map((report, index) => (
              <div key={index} className="report-card">
                <div className={`report-icon ${report.iconClass}`}>
                  <ReportIcon iconKey={report.iconKey} />
                </div>
                <div className="report-content">
                  <h3>{report.title}</h3>
                  <p>{report.description}</p>
                  <button
                    type="button"
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
      </div>
    </div>
  );
}

export default ReportingAndAnalytics;
