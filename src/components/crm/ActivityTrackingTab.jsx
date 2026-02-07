import React, { useEffect, useState } from 'react';
import activityTrackingService from '../../services/activityTrackingService';

const formatDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMondayOfWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

function ActivityTrackingTab() {
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const today = new Date();
    return getMondayOfWeek(today);
  });
  const [activityData, setActivityData] = useState({});
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [selectedActivityRep, setSelectedActivityRep] = useState(null);
  const [activityFormData, setActivityFormData] = useState({
    coldCalls: 0,
    insightMeetings: 0,
    initialCommitments: 0,
    referralJobs: 0
  });

  useEffect(() => {
    if (!selectedWeekStart) return;

    const loadActivityData = async () => {
      setLoadingActivity(true);
      try {
        const weekStartStr = formatDateString(selectedWeekStart);

        const weekData = await activityTrackingService.getByWeek(weekStartStr);

        const startOf2026 = '2026-01-01';
        const endOf2026 = '2026-12-31';
        const all2026Data = await activityTrackingService.getByDateRange(startOf2026, endOf2026);

        const allDataObj = {};
        all2026Data.forEach(record => {
          const weekStr = record.week_start_date;
          if (!allDataObj[weekStr]) {
            allDataObj[weekStr] = {};
          }
          const repName = record.sales_rep.charAt(0).toUpperCase() + record.sales_rep.slice(1).toLowerCase();
          allDataObj[weekStr][repName] = {
            id: record.id,
            coldCalls: record.cold_calls || 0,
            insightMeetings: record.insight_meetings || 0,
            initialCommitments: record.initial_commitments || 0,
            referralJobs: record.referral_jobs || 0
          };
        });

        const weekDataObj = {};
        const salesReps = ['Paige', 'Ainsley', 'Joe', 'Tony'];
        salesReps.forEach(rep => {
          const repData = weekData.find(d => d.sales_rep.toLowerCase() === rep.toLowerCase());
          weekDataObj[rep] = repData ? {
            id: repData.id,
            coldCalls: repData.cold_calls || 0,
            insightMeetings: repData.insight_meetings || 0,
            initialCommitments: repData.initial_commitments || 0,
            referralJobs: repData.referral_jobs || 0
          } : { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 };
        });

        setActivityData(prev => ({
          ...prev,
          ...allDataObj,
          [weekStartStr]: weekDataObj
        }));
      } catch (error) {
        console.error('Error loading activity data:', error);
      } finally {
        setLoadingActivity(false);
      }
    };

    loadActivityData();
  }, [selectedWeekStart]);

  const handleActivityFormSubmit = async (e) => {
    e.preventDefault();
    if (!selectedActivityRep || !selectedWeekStart) return;

    const mondayDate = getMondayOfWeek(selectedWeekStart);
    const weekStartStr = formatDateString(mondayDate);
    setSavingActivity(true);

    try {
      await activityTrackingService.upsert({
        week_start_date: weekStartStr,
        sales_rep: selectedActivityRep,
        cold_calls: parseInt(activityFormData.coldCalls) || 0,
        insight_meetings: parseInt(activityFormData.insightMeetings) || 0,
        initial_commitments: parseInt(activityFormData.initialCommitments) || 0,
        referral_jobs: parseInt(activityFormData.referralJobs) || 0
      });

      const startOf2026 = '2026-01-01';
      const endOf2026 = '2026-12-31';
      const all2026Data = await activityTrackingService.getByDateRange(startOf2026, endOf2026);

      const allDataObj = {};
      all2026Data.forEach(record => {
        const weekStr = record.week_start_date;
        if (!allDataObj[weekStr]) {
          allDataObj[weekStr] = {};
        }
        const repName = record.sales_rep.charAt(0).toUpperCase() + record.sales_rep.slice(1).toLowerCase();
        allDataObj[weekStr][repName] = {
          id: record.id,
          coldCalls: record.cold_calls || 0,
          insightMeetings: record.insight_meetings || 0,
          initialCommitments: record.initial_commitments || 0,
          referralJobs: record.referral_jobs || 0
        };
      });

      setActivityData(allDataObj);

      setShowActivityForm(false);
      setSelectedActivityRep(null);
    } catch (error) {
      console.error('Error saving activity data:', error);
      alert('Failed to save data: ' + (error.message || 'Unknown error'));
    } finally {
      setSavingActivity(false);
    }
  };

  // Generate week start dates (starting from Monday of week containing 1/5/2026, going forward only)
  const generateWeekOptions = () => {
    const options = [];
    const startDate = new Date('2026-01-05');
    const mondayStart = getMondayOfWeek(startDate);
    for (let i = 0; i <= 52; i++) {
      const date = new Date(mondayStart);
      date.setDate(mondayStart.getDate() + (i * 7));
      options.push(date);
    }
    return options;
  };

  const weekOptions = generateWeekOptions();

  const today = new Date();
  const currentMonday = getMondayOfWeek(today);
  const currentMondayStr = formatDateString(currentMonday);

  const selectedWeekStr = formatDateString(selectedWeekStart);
  const matchingOption = weekOptions.find(opt => formatDateString(opt) === selectedWeekStr);
  const currentWeekOption = weekOptions.find(opt => formatDateString(opt) === currentMondayStr);

  if (!matchingOption && currentWeekOption) {
    setTimeout(() => setSelectedWeekStart(currentWeekOption), 0);
  }

  const formatWeekLabel = (date) => {
    const weekEnd = new Date(date);
    weekEnd.setDate(date.getDate() + 6);
    return `${(date.getMonth() + 1)}/${date.getDate()} - ${(weekEnd.getMonth() + 1)}/${weekEnd.getDate()}/${date.getFullYear()}`;
  };

  const calculateConversions = (coldCalls, insightMeetings, initialCommitments, referralJobs) => {
    const insightMtg = coldCalls > 0 ? ((insightMeetings / coldCalls) * 100).toFixed(1) : '0.0';
    const initialCommitment = insightMeetings > 0 ? ((initialCommitments / insightMeetings) * 100).toFixed(1) : '0.0';
    const referralJob = initialCommitments > 0 ? ((referralJobs / initialCommitments) * 100).toFixed(1) : '0.0';
    const fullFunnel = coldCalls > 0 ? ((referralJobs / coldCalls) * 100).toFixed(1) : '0.0';
    return { insightMtg, initialCommitment, referralJob, fullFunnel };
  };

  const handleActivityRowClick = (salesRep) => {
    const weekStartStr = formatDateString(selectedWeekStart);
    const currentWeekData = activityData[weekStartStr] || {};
    const repData = currentWeekData[salesRep] || { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 };

    setActivityFormData({
      coldCalls: repData.coldCalls || 0,
      insightMeetings: repData.insightMeetings || 0,
      initialCommitments: repData.initialCommitments || 0,
      referralJobs: repData.referralJobs || 0
    });
    setSelectedActivityRep(salesRep);
    setShowActivityForm(true);
  };

  const renderActivityTable = (title, data, isEditable = false) => {
    const handleRowClick = isEditable ? (rep) => handleActivityRowClick(rep) : null;
    const hbNashvilleReps = ['Paige', 'Ainsley', 'Joe'];
    const nationalSalesReps = ['Tony'];

    const hbNashvilleTotals = { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 };
    hbNashvilleReps.forEach(rep => {
      if (data[rep]) {
        hbNashvilleTotals.coldCalls += data[rep].coldCalls || 0;
        hbNashvilleTotals.insightMeetings += data[rep].insightMeetings || 0;
        hbNashvilleTotals.initialCommitments += data[rep].initialCommitments || 0;
        hbNashvilleTotals.referralJobs += data[rep].referralJobs || 0;
      }
    });

    const nationalSalesTotals = { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 };
    nationalSalesReps.forEach(rep => {
      if (data[rep]) {
        nationalSalesTotals.coldCalls += data[rep].coldCalls || 0;
        nationalSalesTotals.insightMeetings += data[rep].insightMeetings || 0;
        nationalSalesTotals.initialCommitments += data[rep].initialCommitments || 0;
        nationalSalesTotals.referralJobs += data[rep].referralJobs || 0;
      }
    });

    const totals = {
      coldCalls: hbNashvilleTotals.coldCalls + nationalSalesTotals.coldCalls,
      insightMeetings: hbNashvilleTotals.insightMeetings + nationalSalesTotals.insightMeetings,
      initialCommitments: hbNashvilleTotals.initialCommitments + nationalSalesTotals.initialCommitments,
      referralJobs: hbNashvilleTotals.referralJobs + nationalSalesTotals.referralJobs
    };

    const hbNashvilleConversions = calculateConversions(
      hbNashvilleTotals.coldCalls,
      hbNashvilleTotals.insightMeetings,
      hbNashvilleTotals.initialCommitments,
      hbNashvilleTotals.referralJobs
    );

    const nationalSalesConversions = calculateConversions(
      nationalSalesTotals.coldCalls,
      nationalSalesTotals.insightMeetings,
      nationalSalesTotals.initialCommitments,
      nationalSalesTotals.referralJobs
    );

    const totalConversions = calculateConversions(
      totals.coldCalls,
      totals.insightMeetings,
      totals.initialCommitments,
      totals.referralJobs
    );

    return (
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ color: '#f1f5f9', marginBottom: '1rem' }}>{title}</h3>
        <div className="customers-table-container">
          <table className="customers-table activity-tracking-table">
            <thead>
              <tr>
                <th rowSpan="2" style={{ color: '#ffffff', textAlign: 'center' }}>Sales Rep</th>
                <th colSpan="4" style={{ backgroundColor: 'rgba(255, 182, 193, 0.2)', textAlign: 'center', color: '#ffffff' }}>ACTIVITY</th>
                <th colSpan="4" style={{ backgroundColor: 'rgba(144, 238, 144, 0.2)', textAlign: 'center', color: '#ffffff' }}>CONVERSION</th>
              </tr>
              <tr>
                <th style={{ backgroundColor: 'rgba(255, 255, 200, 0.3)', color: '#ffffff', textAlign: 'center' }}>Cold Calls</th>
                <th style={{ backgroundColor: 'rgba(255, 255, 200, 0.3)', color: '#ffffff', textAlign: 'center' }}>Insight Meetings</th>
                <th style={{ backgroundColor: 'rgba(255, 255, 200, 0.3)', color: '#ffffff', textAlign: 'center' }}>Initial Commitments</th>
                <th style={{ backgroundColor: 'rgba(255, 255, 200, 0.3)', color: '#ffffff', textAlign: 'center' }}>Referral Jobs</th>
                <th style={{ backgroundColor: 'rgba(173, 216, 230, 0.3)', color: '#ffffff', textAlign: 'center' }}>Insight Mtg</th>
                <th style={{ backgroundColor: 'rgba(173, 216, 230, 0.3)', color: '#ffffff', textAlign: 'center' }}>Initial Commitment</th>
                <th style={{ backgroundColor: 'rgba(173, 216, 230, 0.3)', color: '#ffffff', textAlign: 'center' }}>Referral Job</th>
                <th style={{ backgroundColor: 'rgba(173, 216, 230, 0.3)', color: '#ffffff', textAlign: 'center' }}>Full Funnel</th>
              </tr>
            </thead>
            <tbody>
              {/* HB Nashville Reps */}
              {hbNashvilleReps.map(rep => {
                const repData = data[rep] || { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 };
                const conversions = calculateConversions(
                  repData.coldCalls,
                  repData.insightMeetings,
                  repData.initialCommitments,
                  repData.referralJobs
                );
                return (
                  <tr
                    key={rep}
                    onClick={handleRowClick ? () => handleRowClick(rep) : undefined}
                    style={isEditable ? { cursor: 'pointer' } : {}}
                  >
                    <td className="customer-name" style={{ color: '#ffffff', textAlign: 'center' }}>{rep}</td>
                    <td style={{ color: '#ffffff', textAlign: 'center' }}>{repData.coldCalls}</td>
                    <td style={{ color: '#ffffff', textAlign: 'center' }}>{repData.insightMeetings}</td>
                    <td style={{ color: '#ffffff', textAlign: 'center' }}>{repData.initialCommitments}</td>
                    <td style={{ color: '#ffffff', textAlign: 'center' }}>{repData.referralJobs}</td>
                    <td style={{ textAlign: 'center', color: '#ffffff' }}>{conversions.insightMtg}%</td>
                    <td style={{ textAlign: 'center', color: '#ffffff' }}>{conversions.initialCommitment}%</td>
                    <td style={{ textAlign: 'center', color: '#ffffff' }}>{conversions.referralJob}%</td>
                    <td style={{ textAlign: 'center', color: '#ffffff' }}>{conversions.fullFunnel}%</td>
                  </tr>
                );
              })}
              {/* HB Nashville Subtotal */}
              <tr style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', fontWeight: '600' }}>
                <td className="customer-name" style={{ color: '#ffffff', textAlign: 'center' }}>HB Nashville</td>
                <td style={{ color: '#ffffff', textAlign: 'center' }}>{hbNashvilleTotals.coldCalls}</td>
                <td style={{ color: '#ffffff', textAlign: 'center' }}>{hbNashvilleTotals.insightMeetings}</td>
                <td style={{ color: '#ffffff', textAlign: 'center' }}>{hbNashvilleTotals.initialCommitments}</td>
                <td style={{ color: '#ffffff', textAlign: 'center' }}>{hbNashvilleTotals.referralJobs}</td>
                <td style={{ textAlign: 'center', color: '#ffffff' }}>{hbNashvilleConversions.insightMtg}%</td>
                <td style={{ textAlign: 'center', color: '#ffffff' }}>{hbNashvilleConversions.initialCommitment}%</td>
                <td style={{ textAlign: 'center', color: '#ffffff' }}>{hbNashvilleConversions.referralJob}%</td>
                <td style={{ textAlign: 'center', color: '#ffffff' }}>{hbNashvilleConversions.fullFunnel}%</td>
              </tr>
              {/* National Sales Reps */}
              {nationalSalesReps.map(rep => {
                const repData = data[rep] || { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 };
                const conversions = calculateConversions(
                  repData.coldCalls,
                  repData.insightMeetings,
                  repData.initialCommitments,
                  repData.referralJobs
                );
                return (
                  <tr
                    key={rep}
                    onClick={handleRowClick ? () => handleRowClick(rep) : undefined}
                    style={isEditable ? { cursor: 'pointer' } : {}}
                  >
                    <td className="customer-name" style={{ color: '#ffffff', textAlign: 'center' }}>{rep}</td>
                    <td style={{ color: '#ffffff', textAlign: 'center' }}>{repData.coldCalls}</td>
                    <td style={{ color: '#ffffff', textAlign: 'center' }}>{repData.insightMeetings}</td>
                    <td style={{ color: '#ffffff', textAlign: 'center' }}>{repData.initialCommitments}</td>
                    <td style={{ color: '#ffffff', textAlign: 'center' }}>{repData.referralJobs}</td>
                    <td style={{ textAlign: 'center', color: '#ffffff' }}>{conversions.insightMtg}%</td>
                    <td style={{ textAlign: 'center', color: '#ffffff' }}>{conversions.initialCommitment}%</td>
                    <td style={{ textAlign: 'center', color: '#ffffff' }}>{conversions.referralJob}%</td>
                    <td style={{ textAlign: 'center', color: '#ffffff' }}>{conversions.fullFunnel}%</td>
                  </tr>
                );
              })}
              {/* National Sales Subtotal */}
              <tr style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', fontWeight: '600' }}>
                <td className="customer-name" style={{ color: '#ffffff', textAlign: 'center' }}>National Sales</td>
                <td style={{ color: '#ffffff', textAlign: 'center' }}>{nationalSalesTotals.coldCalls}</td>
                <td style={{ color: '#ffffff', textAlign: 'center' }}>{nationalSalesTotals.insightMeetings}</td>
                <td style={{ color: '#ffffff', textAlign: 'center' }}>{nationalSalesTotals.initialCommitments}</td>
                <td style={{ color: '#ffffff', textAlign: 'center' }}>{nationalSalesTotals.referralJobs}</td>
                <td style={{ textAlign: 'center', color: '#ffffff' }}>{nationalSalesConversions.insightMtg}%</td>
                <td style={{ textAlign: 'center', color: '#ffffff' }}>{nationalSalesConversions.initialCommitment}%</td>
                <td style={{ textAlign: 'center', color: '#ffffff' }}>{nationalSalesConversions.referralJob}%</td>
                <td style={{ textAlign: 'center', color: '#ffffff' }}>{nationalSalesConversions.fullFunnel}%</td>
              </tr>
              {/* Grand Total */}
              <tr style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', fontWeight: '600' }}>
                <td className="customer-name" style={{ color: '#ffffff', textAlign: 'center' }}>TOTAL</td>
                <td style={{ color: '#ffffff', textAlign: 'center' }}>{totals.coldCalls}</td>
                <td style={{ color: '#ffffff', textAlign: 'center' }}>{totals.insightMeetings}</td>
                <td style={{ color: '#ffffff', textAlign: 'center' }}>{totals.initialCommitments}</td>
                <td style={{ color: '#ffffff', textAlign: 'center' }}>{totals.referralJobs}</td>
                <td style={{ textAlign: 'center', color: '#ffffff' }}>{totalConversions.insightMtg}%</td>
                <td style={{ textAlign: 'center', color: '#ffffff' }}>{totalConversions.initialCommitment}%</td>
                <td style={{ textAlign: 'center', color: '#ffffff' }}>{totalConversions.referralJob}%</td>
                <td style={{ textAlign: 'center', color: '#ffffff' }}>{totalConversions.fullFunnel}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Get current week data from state
  const weekData = activityData[selectedWeekStr] || {
    Paige: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
    Ainsley: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
    Joe: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
    Tony: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 }
  };

  // Calculate MTD (sum of all weeks in current month)
  const currentMonth = selectedWeekStart.getMonth();
  const currentYear = selectedWeekStart.getFullYear();
  const mtdData = {
    Paige: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
    Ainsley: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
    Joe: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
    Tony: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 }
  };

  // Calculate YTD (sum of all weeks from start of 2026)
  const ytdData = {
    Paige: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
    Ainsley: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
    Joe: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
    Tony: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 }
  };

  const isInCurrentMonth = (dateStr) => {
    const date = new Date(dateStr);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  };

  const isInYTD = (dateStr) => {
    const date = new Date(dateStr);
    const ytdStart = new Date('2026-01-05');
    const mondayStart = getMondayOfWeek(ytdStart);
    const weekStart = getMondayOfWeek(date);
    return date.getFullYear() === 2026 && weekStart >= mondayStart;
  };

  Object.keys(activityData).forEach(weekStr => {
    const weekDate = new Date(weekStr);
    if (isNaN(weekDate.getTime())) return;

    const weekDataForPeriod = activityData[weekStr];

    if (isInCurrentMonth(weekStr)) {
      ['Paige', 'Ainsley', 'Joe', 'Tony'].forEach(rep => {
        const repData = weekDataForPeriod[rep];
        if (repData) {
          mtdData[rep].coldCalls += repData.coldCalls || 0;
          mtdData[rep].insightMeetings += repData.insightMeetings || 0;
          mtdData[rep].initialCommitments += repData.initialCommitments || 0;
          mtdData[rep].referralJobs += repData.referralJobs || 0;
        }
      });
    }

    if (isInYTD(weekStr)) {
      ['Paige', 'Ainsley', 'Joe', 'Tony'].forEach(rep => {
        const repData = weekDataForPeriod[rep];
        if (repData) {
          ytdData[rep].coldCalls += repData.coldCalls || 0;
          ytdData[rep].insightMeetings += repData.insightMeetings || 0;
          ytdData[rep].initialCommitments += repData.initialCommitments || 0;
          ytdData[rep].referralJobs += repData.referralJobs || 0;
        }
      });
    }
  });

  return (
    <>
      <div className="customers-container">
        <div className="customers-header">
          <h2>Activity Tracking</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ color: '#f1f5f9' }}>Week Starting:</label>
            <select
              value={formatDateString(selectedWeekStart)}
              onChange={(e) => {
                const [year, month, day] = e.target.value.split('-').map(Number);
                const newDate = new Date(year, month - 1, day);
                const mondayDate = getMondayOfWeek(newDate);
                setSelectedWeekStart(mondayDate);
              }}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              {weekOptions.map((date, index) => (
                <option key={index} value={formatDateString(date)}>
                  {formatWeekLabel(date)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingActivity && <div style={{ color: '#f1f5f9', marginBottom: '1rem' }}>Loading...</div>}
        {savingActivity && <div style={{ color: '#f1f5f9', marginBottom: '1rem' }}>Saving...</div>}
        {renderActivityTable(`Week: ${formatWeekLabel(selectedWeekStart)}`, weekData, true)}
        {renderActivityTable('MTD (Month-to-Date)', mtdData, false)}
        {renderActivityTable('YTD (Year-to-Date)', ytdData, false)}
      </div>

      {/* Activity Data Entry Modal */}
      {showActivityForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Activity Data Entry - {selectedActivityRep}</h2>
              <button className="close-btn" onClick={() => {
                setShowActivityForm(false);
                setSelectedActivityRep(null);
              }}>×</button>
            </div>
            <form onSubmit={handleActivityFormSubmit}>
              <div className="form-group">
                <label>Cold Calls</label>
                <input
                  type="number"
                  min="0"
                  value={activityFormData.coldCalls}
                  onChange={(e) => setActivityFormData({...activityFormData, coldCalls: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Insight Meetings</label>
                <input
                  type="number"
                  min="0"
                  value={activityFormData.insightMeetings}
                  onChange={(e) => setActivityFormData({...activityFormData, insightMeetings: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Initial Commitments</label>
                <input
                  type="number"
                  min="0"
                  value={activityFormData.initialCommitments}
                  onChange={(e) => setActivityFormData({...activityFormData, initialCommitments: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Referral Jobs</label>
                <input
                  type="number"
                  min="0"
                  value={activityFormData.referralJobs}
                  onChange={(e) => setActivityFormData({...activityFormData, referralJobs: e.target.value})}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => {
                  setShowActivityForm(false);
                  setSelectedActivityRep(null);
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingActivity}>
                  {savingActivity ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ActivityTrackingTab;
