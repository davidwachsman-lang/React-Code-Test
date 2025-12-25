import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import scorecardService from '../../services/scorecardService';
import './PerformanceScorecard.css';

const columnHelper = createColumnHelper();

function PerformanceScorecard() {
  const [loading, setLoading] = useState(true);
  const [scorecards, setScorecards] = useState([]);
  const [settings, setSettings] = useState({
    effective_date: new Date().toISOString().split('T')[0],
    qualifying_target: 2000000.00,
    bonus_percentage: 0.0050
  });
  const [saving, setSaving] = useState({});
  const [selectedSalesRep, setSelectedSalesRep] = useState('all');
  const [allSalesReps, setAllSalesReps] = useState([]);
  
  // Refs for debouncing
  const saveTimeoutRef = useRef(null);
  const settingsTimeoutRef = useRef(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading scorecard data...');
      
      // Get settings first
      const settingsData = await scorecardService.getSettings();
      console.log('Settings loaded:', settingsData);
      setSettings(settingsData);
      
      // Get sales reps directly from CRM records (same way CRM table does it)
      const salesReps = await scorecardService.getAllSalesReps();
      console.log('Sales reps found from CRM:', salesReps);
      setAllSalesReps(salesReps);
      
      if (!salesReps || salesReps.length === 0) {
        console.warn('No sales reps found in CRM data');
        setScorecards([]);
        setLoading(false);
        return;
      }
      
      // Get all scorecards with metrics (this will get sales reps and calculate KPIs)
      const scorecardsData = await scorecardService.getAllScorecardsWithMetrics();
      console.log('Scorecards loaded:', scorecardsData);
      
      if (!scorecardsData || scorecardsData.length === 0) {
        console.warn('No scorecards found. Creating new ones for each sales rep...');
        // Create scorecards for each sales rep
        const newScorecards = await Promise.all(
          salesReps.map(async (repName) => {
            try {
              const metrics = await scorecardService.calculateKPIMetrics(repName, settingsData.effective_date);
              return {
                sales_rep_name: repName,
                effective_date: settingsData.effective_date,
                qualifying_target: 2500000,
                forecasted_referrals: null,
                target_additional_clients: null,
                kpi1_actual_referrals: metrics.kpi1_actual_referrals || 0,
                kpi2_actual_clients: metrics.kpi2_actual_clients || 0,
                kpi3_total_clients: metrics.kpi3_total_clients || 0,
                kpi3_visited_clients: metrics.kpi3_visited_clients || 0,
                kpi1_rating: null,
                kpi1_comments: null,
                kpi2_rating: null,
                kpi2_comments: null,
                kpi3_rating: null,
                kpi3_comments: null,
                overall_rating: null,
                overall_comments: null,
                id: null
              };
            } catch (error) {
              console.error(`Error calculating metrics for ${repName}:`, error);
              return {
                sales_rep_name: repName,
                effective_date: settingsData.effective_date,
                qualifying_target: 2500000,
                forecasted_referrals: null,
                target_additional_clients: null,
                kpi1_actual_referrals: 0,
                kpi2_actual_clients: 0,
                kpi3_total_clients: 0,
                kpi3_visited_clients: 0,
                kpi1_rating: null,
                kpi1_comments: null,
                kpi2_rating: null,
                kpi2_comments: null,
                kpi3_rating: null,
                kpi3_comments: null,
                overall_rating: null,
                overall_comments: null,
                id: null
              };
            }
          })
        );
        setScorecards(newScorecards);
      } else {
        setScorecards(scorecardsData);
      }
    } catch (error) {
      console.error('Error loading scorecard data:', error);
      alert('Failed to load scorecard data: ' + error.message);
      setScorecards([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPI metrics
  const calculateKPIMetrics = useCallback((scorecard) => {
    // KPI 1: Forecasted Referrals (50% weight)
    const forecasted = scorecard.forecasted_referrals || 0;
    const actual1 = scorecard.kpi1_actual_referrals || 0;
    const achievement1 = forecasted > 0 ? Math.min((actual1 / forecasted) * 100, 100) : 0;
    const bonus1 = (achievement1 / 100) * 50;

    // KPI 2: Additional Clients (30% weight)
    const target = scorecard.target_additional_clients || 0;
    const actual2 = scorecard.kpi2_actual_clients || 0;
    const achievement2 = target > 0 ? Math.min((actual2 / target) * 100, 100) : 0;
    const bonus2 = (achievement2 / 100) * 30;

    // KPI 3: F2F Visits (20% weight)
    const total3 = scorecard.kpi3_total_clients || 0;
    const visited3 = scorecard.kpi3_visited_clients || 0;
    const achievement3 = total3 > 0 ? Math.min((visited3 / total3) * 100, 100) : 0;
    const bonus3 = (achievement3 / 100) * 20;

    const totalBonus = bonus1 + bonus2 + bonus3;

    return {
      kpi1_achievement: achievement1,
      kpi1_bonus: bonus1,
      kpi2_achievement: achievement2,
      kpi2_bonus: bonus2,
      kpi3_achievement: achievement3,
      kpi3_bonus: bonus3,
      total_bonus: totalBonus
    };
  }, []);

  // Get color for KPI achievement (red < 80%, yellow 80-99%, green >= 100%)
  const getKPIColor = useCallback((achievement) => {
    if (achievement >= 100) return 'green';
    if (achievement >= 80) return 'yellow';
    return 'red';
  }, []);

  // Get all unique sales rep names for filter (use allSalesReps from CRM data)
  const salesRepNames = useMemo(() => {
    // Use allSalesReps if available, otherwise fall back to scorecards
    if (allSalesReps && allSalesReps.length > 0) {
      return allSalesReps;
    }
    const names = scorecards.map(sc => sc.sales_rep_name).filter(Boolean);
    return [...new Set(names)].sort();
  }, [allSalesReps, scorecards]);

  // Filter scorecards by selected sales rep
  const filteredScorecards = useMemo(() => {
    if (selectedSalesRep === 'all') return scorecards;
    return scorecards.filter(sc => sc.sales_rep_name === selectedSalesRep);
  }, [scorecards, selectedSalesRep]);

  // Transform scorecards into rows (one row per KPI per sales rep)
  const scorecardRows = useMemo(() => {
    const rows = [];
    console.log('Transforming scorecards to rows. Filtered scorecards:', filteredScorecards);
    
    if (filteredScorecards.length === 0) {
      // If no sales reps selected or found, show placeholder rows with just KPI descriptions
      const qualifyingTarget = 2500000; // Locked at $2,500,000
      
      // KPI 1 Row (placeholder)
      rows.push({
        id: 'placeholder-kpi1',
        sales_rep_name: null,
        kpi_number: 1,
        kpi_description: 'Achieve 80% of Forecasted Referrals',
        kpi_weight: 50,
        target: 100, // Fixed target for KPI 1
        actual: 0,
        achievement: 0,
        bonus_percent: 50, // Fixed at 50%
        bonus_amount: 0,
        rating: null,
        comments: null,
        scorecard_id: null,
        scorecard: null
      });
      
      // KPI 2 Row (placeholder)
      rows.push({
        id: 'placeholder-kpi2',
        sales_rep_name: null,
        kpi_number: 2,
        kpi_description: 'Add New Clients to Achieve Referral Growth',
        kpi_weight: 30,
        target: 20, // Fixed target for KPI 2
        actual: 0,
        achievement: 0,
        bonus_percent: 30, // Fixed at 30%
        bonus_amount: 0,
        rating: null,
        comments: null,
        scorecard_id: null,
        scorecard: null
      });
      
      // KPI 3 Row (placeholder)
      rows.push({
        id: 'placeholder-kpi3',
        sales_rep_name: null,
        kpi_number: 3,
        kpi_description: 'All Closed Clients Visited Every 60 Days',
        kpi_weight: 20,
        target: 50, // Fixed target for KPI 3
        actual: 0,
        achievement: 0,
        bonus_percent: 20, // Fixed at 20%
        bonus_amount: 0,
        rating: null,
        comments: null,
        scorecard_id: null,
        scorecard: null
      });
    } else {
      // Create rows for each sales rep's KPIs
      filteredScorecards.forEach(scorecard => {
        const metrics = calculateKPIMetrics(scorecard);
        const qualifyingTarget = 2500000; // Locked at $2,500,000
        
        // KPI 1 Row
        rows.push({
          id: `${scorecard.sales_rep_name}-kpi1`,
          sales_rep_name: scorecard.sales_rep_name,
          kpi_number: 1,
          kpi_description: 'Achieve 80% of Forecasted Referrals',
          kpi_weight: 50,
          target: 100, // Fixed target for KPI 1
          actual: scorecard.kpi1_actual_referrals || 0,
          achievement: metrics.kpi1_achievement,
          bonus_percent: 50, // Fixed at 50%
          bonus_amount: (qualifyingTarget * settings.bonus_percentage) * (metrics.kpi1_bonus / 100),
          rating: scorecard.kpi1_rating,
          comments: scorecard.kpi1_comments,
          scorecard_id: scorecard.id,
          scorecard: scorecard
        });
        
        // KPI 2 Row
        rows.push({
          id: `${scorecard.sales_rep_name}-kpi2`,
          sales_rep_name: scorecard.sales_rep_name,
          kpi_number: 2,
          kpi_description: 'Add New Clients to Achieve Referral Growth',
          kpi_weight: 30,
          target: 20, // Fixed target for KPI 2
          actual: scorecard.kpi2_actual_clients || 0,
          achievement: metrics.kpi2_achievement,
          bonus_percent: 30, // Fixed at 30%
          bonus_amount: (qualifyingTarget * settings.bonus_percentage) * (metrics.kpi2_bonus / 100),
          rating: scorecard.kpi2_rating,
          comments: scorecard.kpi2_comments,
          scorecard_id: scorecard.id,
          scorecard: scorecard
        });
        
        // KPI 3 Row
        rows.push({
          id: `${scorecard.sales_rep_name}-kpi3`,
          sales_rep_name: scorecard.sales_rep_name,
          kpi_number: 3,
          kpi_description: 'All Closed Clients Visited Every 60 Days',
          kpi_weight: 20,
          target: 50, // Fixed target for KPI 3
          actual: scorecard.kpi3_visited_clients || 0,
          achievement: metrics.kpi3_achievement,
          bonus_percent: 20, // Fixed at 20%
          bonus_amount: (qualifyingTarget * settings.bonus_percentage) * (metrics.kpi3_bonus / 100),
          rating: scorecard.kpi3_rating,
          comments: scorecard.kpi3_comments,
          scorecard_id: scorecard.id,
          scorecard: scorecard
        });
      });
    }
    
    console.log('Created scorecard rows:', rows.length, 'rows');
    if (rows.length > 0) {
      console.log('First row sample:', rows[0]);
    }
    return rows;
  }, [filteredScorecards, settings.bonus_percentage, calculateKPIMetrics]);

  // Save scorecard field (debounced)
  const saveScorecardField = useCallback(async (scorecardId, salesRepName, field, value) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout
    saveTimeoutRef.current = setTimeout(async () => {
      // Check if scorecardId is valid UUID (not null, undefined, or empty string)
      const hasValidId = scorecardId && scorecardId !== '' && scorecardId !== null && scorecardId !== undefined;
      
      if (!hasValidId) {
        // Create new scorecard
        try {
          const newScorecard = {
            sales_rep_name: salesRepName,
            effective_date: settings.effective_date,
            qualifying_target: 2500000, // Locked at $2,500,000
            [field]: value
          };
          const created = await scorecardService.createScorecard(newScorecard);
          
          // Update local state
          setScorecards(prev => prev.map(sc => 
            sc.sales_rep_name === salesRepName 
              ? { ...sc, ...created, id: created.id }
              : sc
          ));
        } catch (error) {
          console.error('Error creating scorecard:', error);
          alert('Failed to save: ' + error.message);
        }
      } else {
        // Update existing scorecard
        try {
          setSaving(prev => ({ ...prev, [scorecardId]: true }));
          await scorecardService.updateScorecard(scorecardId, { [field]: value });
          
          // Update local state
          setScorecards(prev => prev.map(sc => 
            sc.id === scorecardId ? { ...sc, [field]: value } : sc
          ));
        } catch (error) {
          console.error('Error updating scorecard:', error);
          alert('Failed to save: ' + error.message);
        } finally {
          setSaving(prev => ({ ...prev, [scorecardId]: false }));
        }
      }
    }, 1000);
  }, [settings]);

  // Handle field change
  const handleFieldChange = useCallback((scorecardId, salesRepName, field, value) => {
    // Update local state immediately
    setScorecards(prev => prev.map(sc => 
      sc.sales_rep_name === salesRepName 
        ? { ...sc, [field]: value }
        : sc
    ));
    
    // Save to database (debounced)
    saveScorecardField(scorecardId, salesRepName, field, value);
  }, [saveScorecardField]);

  // Handle settings change (debounced)
  const handleSettingsChange = useCallback((field, value) => {
    // Clear existing timeout
    if (settingsTimeoutRef.current) {
      clearTimeout(settingsTimeoutRef.current);
    }
    
    // Set new timeout
    settingsTimeoutRef.current = setTimeout(async () => {
      try {
        const updated = await scorecardService.updateSettings({ [field]: value });
        setSettings(prev => ({ ...prev, ...updated }));
      } catch (error) {
        console.error('Error updating settings:', error);
        alert('Failed to save settings: ' + error.message);
      }
    }, 1000);
  }, []);

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '0.0%';
    return `${value.toFixed(1)}%`;
  };

  const bonusAmount = useMemo(() => {
    const qualifyingTarget = 2500000; // Locked at $2,500,000
    return qualifyingTarget * settings.bonus_percentage;
  }, [settings.bonus_percentage]);

  // Define columns
  const columns = useMemo(() => [
    // KPI Description Column
    columnHelper.accessor('kpi_description', {
      id: 'kpi_description',
      header: 'KPI Description',
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="kpi-description-cell">
            <div className="kpi-description-title">
              KPI {row.kpi_number}: {row.kpi_description}
            </div>
          </div>
        );
      },
      size: 350,
    }),
    // Target Column
    columnHelper.accessor('target', {
      id: 'target',
      header: 'Target',
      cell: (info) => {
        const row = info.row.original;
        // Target values: KPI 1 = 100, KPI 2 = 20, KPI 3 = 50
        const targetValue = row.kpi_number === 1 ? 100 : row.kpi_number === 2 ? 20 : 50;
        return (
          <div className="target-cell">
            {targetValue}
          </div>
        );
      },
      size: 100,
    }),
    // Actual Number Column
    columnHelper.accessor('actual', {
      id: 'actual',
      header: 'Actual',
      cell: (info) => {
        const row = info.row.original;
        if (!row.sales_rep_name) {
          return <div className="actual-number-cell">-</div>;
        }
        return (
          <div className={`actual-number-cell kpi-color-${getKPIColor(row.achievement)}`}>
            {row.actual}
          </div>
        );
      },
      size: 120,
    }),
    // Bonus % Column
    columnHelper.accessor('bonus_percent', {
      id: 'bonus_percent',
      header: 'Bonus %',
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="bonus-percent-cell">
            {formatPercentage(row.bonus_percent)}
          </div>
        );
      },
      size: 120,
    }),
    // Bonus Amount Column
    columnHelper.accessor('bonus_amount', {
      id: 'bonus_amount',
      header: 'Bonus Amount',
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="bonus-amount-cell">
            {formatCurrency(row.bonus_amount)}
          </div>
        );
      },
      size: 150,
    }),
    // Rating/Comments Column
    columnHelper.accessor('rating_comments', {
      id: 'rating_comments',
      header: 'Rating / Comments',
      cell: (info) => {
        const row = info.row.original;
        const ratingField = `kpi${row.kpi_number}_rating`;
        const commentsField = `kpi${row.kpi_number}_comments`;
        
        return (
          <div className="rating-comments-cell">
            <select
              value={row.rating || ''}
              onChange={(e) => {
                if (row.sales_rep_name) {
                  handleFieldChange(
                    row.scorecard_id,
                    row.sales_rep_name,
                    ratingField,
                    e.target.value || null
                  );
                }
              }}
              className="scorecard-select"
            >
              <option value="">Select Rating...</option>
              <option value="1">1 - Failing at most aspects of KPI objectives (&lt;60%)</option>
              <option value="2">2 - Does not meet KPI objectives (60%+)</option>
              <option value="3">3 - Shows effort and ongoing improvement, seeks help, meets some KPI objectives (75%+)</option>
              <option value="4">4 - Performance frequently meets KPI objectives (90%+)</option>
              <option value="5">5 - Performance consistently meets and or exceeds KPI objectives (100%)</option>
            </select>
            <textarea
              value={row.comments || ''}
              onChange={(e) => {
                if (row.sales_rep_name) {
                  handleFieldChange(
                    row.scorecard_id,
                    row.sales_rep_name,
                    commentsField,
                    e.target.value || null
                  );
                }
              }}
              placeholder="Enter comments..."
              className="scorecard-textarea"
              rows="2"
            />
          </div>
        );
      },
      size: 300,
    }),
  ], [settings, handleFieldChange, getKPIColor]);

  const table = useReactTable({
    data: scorecardRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="scorecard-loading">
        <p>Loading performance scorecards...</p>
      </div>
    );
  }

  return (
    <div className="performance-scorecard">
      {/* Sales Rep Filter */}
      <div className="scorecard-filter">
        <label htmlFor="sales-rep-filter">Filter by Sales Rep:</label>
        <select
          id="sales-rep-filter"
          value={selectedSalesRep}
          onChange={(e) => setSelectedSalesRep(e.target.value)}
          className="scorecard-filter-select"
        >
          <option value="all">All Sales Reps</option>
          {salesRepNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Header Section - Two Boxes */}
      <div className="scorecard-header">
        <div className="scorecard-header-box">
          <label>FY 2026 Qualifying Target</label>
          <div className="scorecard-header-value">{formatCurrency(2500000)}</div>
          <div className="scorecard-header-note">(the above amount must be achieved to qualify for the overall Bonus)</div>
        </div>
        <div className="scorecard-header-box">
          <label>Bonus Amount</label>
          <div className="scorecard-header-value scorecard-header-value-green">{formatCurrency(bonusAmount)}</div>
          <div className="scorecard-header-note">(0.5% of Qualifying Target)</div>
        </div>
      </div>

      {/* Scorecard Table */}
      <div className="scorecard-table-container">
        <div className="scorecard-table-wrapper">
          <table className="scorecard-table">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="scorecard-empty">
                    No sales reps found. Add sales reps to CRM records to see scorecards.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PerformanceScorecard;

