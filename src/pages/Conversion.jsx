import React, { useState, useMemo } from 'react';
import './Page.css';
import './Conversion.css';

function Conversion() {
  // Sorting state
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  // Mock conversion funnel metrics
  const mockConversionMetrics = [
    {
      metric: 'Leads to Emergency Service Conversion',
      actual: 68.5,
      goal: 65.0,
      delta: 3.5
    },
    {
      metric: 'Leads to Inspection',
      actual: 45.2,
      goal: 50.0,
      delta: -4.8
    },
    {
      metric: 'Inspection to Estimate',
      actual: 72.8,
      goal: 70.0,
      delta: 2.8
    },
    {
      metric: 'Estimates to Jobs',
      actual: 35.4,
      goal: 40.0,
      delta: -4.6
    },
    {
      metric: 'Mit to Recon',
      actual: 28.3,
      goal: 30.0,
      delta: -1.7
    }
  ];

  // Mock metrics data by division
  const mockMetricsByDivision = {
    mit: {
      estimatesSent: { count: 45, total: 890000 },
      converted: { count: 18, total: 345000 },
      conversionRate: { count: 40.0, dollar: 38.8 },
      openPending: { count: 22, total: 425000 },
      lost: { count: 5, total: 120000 }
    },
    recon: {
      estimatesSent: { count: 52, total: 980000 },
      converted: { count: 16, total: 310000 },
      conversionRate: { count: 30.8, dollar: 31.6 },
      openPending: { count: 28, total: 520000 },
      lost: { count: 8, total: 150000 }
    },
    ll: {
      estimatesSent: { count: 30, total: 580000 },
      converted: { count: 11, total: 220000 },
      conversionRate: { count: 36.7, dollar: 37.9 },
      openPending: { count: 12, total: 255000 },
      lost: { count: 7, total: 105000 }
    },
    total: {
      estimatesSent: { count: 127, total: 2450000 },
      converted: { count: 45, total: 875000 },
      conversionRate: { count: 35.4, dollar: 35.7 },
      openPending: { count: 62, total: 1200000 },
      lost: { count: 20, total: 375000 }
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format number with commas
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  // Mock estimates data (memoized to prevent unnecessary re-sorts)
  const mockEstimates = useMemo(() => [
    {
      jobNumber: 'JOB-2024-001',
      division: 'Mit',
      customer: 'ABC Property Management',
      estimateAmount: 125000,
      daysSinceSent: 5,
      owner: 'John Smith',
      pm: 'Leo Champion',
      estimator: 'Kevin Shell',
      salesPerson: 'Tony',
      status: 'Pending',
      nextAction: 'Follow up call',
      dueDate: '2024-01-20'
    },
    {
      jobNumber: 'JOB-2024-002',
      division: 'Recon',
      customer: 'XYZ Real Estate Group',
      estimateAmount: 87500,
      daysSinceSent: 12,
      owner: 'Sarah Johnson',
      pm: 'Aaron Kacel',
      estimator: 'Bryan Turpin',
      salesPerson: 'Paige',
      status: 'Pending',
      nextAction: 'Send revised estimate',
      dueDate: '2024-01-25'
    },
    {
      jobNumber: 'JOB-2024-003',
      division: 'LL',
      customer: 'Metro Commercial Properties',
      estimateAmount: 245000,
      daysSinceSent: 3,
      owner: 'Mike Davis',
      pm: 'Scottie Smith',
      estimator: 'Eric Brown',
      salesPerson: 'Ainsley',
      status: 'Converted',
      nextAction: 'Schedule kickoff meeting',
      dueDate: '2024-01-18'
    },
    {
      jobNumber: 'JOB-2024-004',
      division: 'Mit',
      customer: 'Residential Holdings Inc',
      estimateAmount: 67500,
      daysSinceSent: 18,
      owner: 'Emily Chen',
      pm: 'Travis Payne',
      estimator: 'Kenny Taylor',
      salesPerson: 'Joe',
      status: 'Lost',
      nextAction: 'Archive',
      dueDate: '2024-01-15'
    },
    {
      jobNumber: 'JOB-2024-005',
      division: 'Recon',
      customer: 'Premier Restoration Co',
      estimateAmount: 156000,
      daysSinceSent: 7,
      owner: 'David Wilson',
      pm: 'Josh Field',
      estimator: 'Kevin Shell',
      salesPerson: 'Tony',
      status: 'Pending',
      nextAction: 'Check in on decision',
      dueDate: '2024-01-22'
    },
    {
      jobNumber: 'JOB-2024-006',
      division: 'Mit',
      customer: 'Citywide Properties',
      estimateAmount: 98000,
      daysSinceSent: 2,
      owner: 'Lisa Anderson',
      pm: 'Leo Champion',
      estimator: 'Bryan Turpin',
      salesPerson: 'Paige',
      status: 'Pending',
      nextAction: 'Awaiting response',
      dueDate: '2024-01-19'
    },
    {
      jobNumber: 'JOB-2024-007',
      division: 'LL',
      customer: 'Industrial Complex LLC',
      estimateAmount: 320000,
      daysSinceSent: 1,
      owner: 'Robert Taylor',
      pm: 'Scottie Smith',
      estimator: 'Eric Brown',
      salesPerson: 'Ainsley',
      status: 'Converted',
      nextAction: 'Begin project planning',
      dueDate: '2024-01-17'
    },
    {
      jobNumber: 'JOB-2024-008',
      division: 'Recon',
      customer: 'Heritage Building Group',
      estimateAmount: 112000,
      daysSinceSent: 9,
      owner: 'Jennifer Martinez',
      pm: 'Aaron Kacel',
      estimator: 'Kenny Taylor',
      salesPerson: 'Joe',
      status: 'Pending',
      nextAction: 'Follow up email',
      dueDate: '2024-01-23'
    },
    {
      jobNumber: 'JOB-2024-009',
      division: 'Mit',
      customer: 'Sunset Apartments',
      estimateAmount: 78000,
      daysSinceSent: 15,
      owner: 'Thomas Brown',
      pm: 'Travis Payne',
      estimator: 'Josh Field',
      salesPerson: 'Tony',
      status: 'Lost',
      nextAction: 'Archive',
      dueDate: '2024-01-16'
    },
    {
      jobNumber: 'JOB-2024-010',
      division: 'LL',
      customer: 'Downtown Development Corp',
      estimateAmount: 189000,
      daysSinceSent: 4,
      owner: 'Amanda White',
      pm: 'Scottie Smith',
      estimator: 'Eric Brown',
      salesPerson: 'Paige',
      status: 'Pending',
      nextAction: 'Schedule site visit',
      dueDate: '2024-01-21'
    }
  ], []);

  // Handle column sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter and sort estimates by division
  const mitEstimates = useMemo(() => {
    const filtered = mockEstimates.filter(e => e.division.toLowerCase() === 'mit');
    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      // Handle different data types
      if (sortColumn === 'estimateAmount' || sortColumn === 'daysSinceSent') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (sortColumn === 'dueDate') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sortColumn, sortDirection, mockEstimates]);

  const reconEstimates = useMemo(() => {
    const filtered = mockEstimates.filter(e => e.division.toLowerCase() === 'recon');
    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      if (sortColumn === 'estimateAmount' || sortColumn === 'daysSinceSent') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (sortColumn === 'dueDate') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sortColumn, sortDirection, mockEstimates]);

  const llEstimates = useMemo(() => {
    const filtered = mockEstimates.filter(e => e.division.toLowerCase() === 'll');
    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      if (sortColumn === 'estimateAmount' || sortColumn === 'daysSinceSent') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (sortColumn === 'dueDate') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sortColumn, sortDirection, mockEstimates]);

  // Helper function to render a table for a division
  const renderDivisionTable = (estimates, divisionName) => {
    if (estimates.length === 0) return null;

    return (
      <div className="conversion-table-container">
        <table className="conversion-table">
          <thead>
            <tr>
              <th 
                className="sortable" 
                onClick={() => handleSort('jobNumber')}
              >
                Job #
                {sortColumn === 'jobNumber' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('customer')}
              >
                Customer
                {sortColumn === 'customer' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable owner-header" 
                onClick={() => handleSort('owner')}
              >
                Owner
                {sortColumn === 'owner' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('estimateAmount')}
              >
                Est $
                {sortColumn === 'estimateAmount' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('daysSinceSent')}
              >
                Days Since Sent
                {sortColumn === 'daysSinceSent' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('pm')}
              >
                PM
                {sortColumn === 'pm' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('estimator')}
              >
                Estimator
                {sortColumn === 'estimator' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('salesPerson')}
              >
                Sales Person
                {sortColumn === 'salesPerson' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('nextAction')}
              >
                Next Action
                {sortColumn === 'nextAction' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('dueDate')}
              >
                Due Date
                {sortColumn === 'dueDate' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {estimates.map((estimate, index) => (
              <tr key={index}>
                <td className="job-number">{estimate.jobNumber}</td>
                <td>{estimate.customer}</td>
                <td className="owner-cell">{estimate.owner}</td>
                <td className="estimate-amount">{formatCurrency(estimate.estimateAmount)}</td>
                <td>
                  <span className={
                    estimate.daysSinceSent >= 7 
                      ? 'days-red' 
                      : estimate.daysSinceSent >= 4 
                      ? 'days-yellow' 
                      : estimate.daysSinceSent >= 1 
                      ? 'days-green' 
                      : ''
                  }>
                    {estimate.daysSinceSent}
                  </span>
                </td>
                <td>{estimate.pm}</td>
                <td>{estimate.estimator}</td>
                <td>{estimate.salesPerson}</td>
                <td>{estimate.nextAction}</td>
                <td>{formatDate(estimate.dueDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Estimate Conversion Dashboard</h1>
        <p className="page-subtitle">Track estimate performance and conversion metrics</p>
      </div>

      {/* Conversion Funnel Metrics Table */}
      <div className="conversion-content">
        <div className="content-section">
          <h2>Conversion Funnel Metrics</h2>
          <div className="conversion-funnel-table-container">
            <table className="conversion-funnel-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>% Actual</th>
                  <th>% Goal</th>
                  <th>Delta</th>
                </tr>
              </thead>
              <tbody>
                {mockConversionMetrics.map((row, index) => (
                  <tr key={index}>
                    <td className="funnel-metric-name">{row.metric}</td>
                    <td className="funnel-actual">{row.actual.toFixed(1)}%</td>
                    <td className="funnel-goal">{row.goal.toFixed(1)}%</td>
                    <td className="funnel-delta">
                      <span className={row.delta >= 0 ? 'delta-positive' : 'delta-negative'}>
                        {row.delta >= 0 ? '+' : ''}{row.delta.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Ribbon Section - 4 Rows */}
      <div className="conversion-content">
        <div className="content-section">
          <h2>Conversion Ribbon</h2>
          <div className="conversion-ribbon-rows">
        {/* MIT Row */}
        <div className="ribbon-row ribbon-row-mit">
          <div className="ribbon-row-header">
            <span className="division-label">MIT</span>
          </div>
          <div className="ribbon-row-metrics">
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Sent</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.mit.estimatesSent.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.mit.estimatesSent.total)}</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Converted</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.mit.converted.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.mit.converted.total)}</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Converted %</div>
              <div className="ribbon-metric-value">{mockMetricsByDivision.mit.conversionRate.count}%</div>
              <div className="ribbon-metric-dollar">{mockMetricsByDivision.mit.conversionRate.dollar}%</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Open Pending</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.mit.openPending.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.mit.openPending.total)}</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Lost</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.mit.lost.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.mit.lost.total)}</div>
            </div>
          </div>
        </div>

        {/* RECON Row */}
        <div className="ribbon-row ribbon-row-recon">
          <div className="ribbon-row-header">
            <span className="division-label">RECON</span>
          </div>
          <div className="ribbon-row-metrics">
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Sent</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.recon.estimatesSent.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.recon.estimatesSent.total)}</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Converted</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.recon.converted.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.recon.converted.total)}</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Converted %</div>
              <div className="ribbon-metric-value">{mockMetricsByDivision.recon.conversionRate.count}%</div>
              <div className="ribbon-metric-dollar">{mockMetricsByDivision.recon.conversionRate.dollar}%</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Open Pending</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.recon.openPending.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.recon.openPending.total)}</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Lost</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.recon.lost.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.recon.lost.total)}</div>
            </div>
          </div>
        </div>

        {/* LL Row */}
        <div className="ribbon-row ribbon-row-ll">
          <div className="ribbon-row-header">
            <span className="division-label">LL</span>
          </div>
          <div className="ribbon-row-metrics">
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Sent</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.ll.estimatesSent.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.ll.estimatesSent.total)}</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Converted</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.ll.converted.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.ll.converted.total)}</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Converted %</div>
              <div className="ribbon-metric-value">{mockMetricsByDivision.ll.conversionRate.count}%</div>
              <div className="ribbon-metric-dollar">{mockMetricsByDivision.ll.conversionRate.dollar}%</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Open Pending</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.ll.openPending.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.ll.openPending.total)}</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Lost</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.ll.lost.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.ll.lost.total)}</div>
            </div>
          </div>
        </div>

        {/* Total Row */}
        <div className="ribbon-row ribbon-row-total">
          <div className="ribbon-row-header">
            <span className="division-label">TOTAL</span>
          </div>
          <div className="ribbon-row-metrics">
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Sent</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.total.estimatesSent.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.total.estimatesSent.total)}</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Converted</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.total.converted.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.total.converted.total)}</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Converted %</div>
              <div className="ribbon-metric-value">{mockMetricsByDivision.total.conversionRate.count}%</div>
              <div className="ribbon-metric-dollar">{mockMetricsByDivision.total.conversionRate.dollar}%</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Open Pending</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.total.openPending.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.total.openPending.total)}</div>
            </div>
            <div className="ribbon-metric">
              <div className="ribbon-metric-label">Lost</div>
              <div className="ribbon-metric-value">{formatNumber(mockMetricsByDivision.total.lost.count)}</div>
              <div className="ribbon-metric-dollar">{formatCurrency(mockMetricsByDivision.total.lost.total)}</div>
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>

      {/* Estimates Tables */}
      <div className="conversion-content">
        <div className="content-section">
          <h2>Estimate Details</h2>
          
          {/* MIT Table */}
          {mitEstimates.length > 0 && (
            <div className="division-table-section">
              <h3 className="division-table-title">MIT</h3>
              {renderDivisionTable(mitEstimates, 'MIT')}
            </div>
          )}

          {/* RECON Table */}
          {reconEstimates.length > 0 && (
            <div className="division-table-section">
              <h3 className="division-table-title">RECON</h3>
              {renderDivisionTable(reconEstimates, 'RECON')}
            </div>
          )}

          {/* LL Table */}
          {llEstimates.length > 0 && (
            <div className="division-table-section">
              <h3 className="division-table-title">LL</h3>
              {renderDivisionTable(llEstimates, 'LL')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Conversion;
