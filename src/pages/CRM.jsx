
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useCRM, useTopTargets, useCRMNeedingFollowup, useActiveProspects, useHotProspects, useAtRiskCustomers } from '../hooks/useCRM';
import { useCreateCRMRecord, useUpdateCRMRecord, useDeleteCRMRecord } from '../hooks/useCRMRecord';
import crmService from '../services/crmService';
import activityTrackingService from '../services/activityTrackingService';
import topTargetsService from '../services/topTargetsService';
import SalesFunnel from '../components/SalesFunnel';
import CRMTable from '../components/crm/CRMTable';
import ROITable from '../components/crm/ROITable';
import CRMFilters from '../components/crm/CRMFilters';
import CRMForm from '../components/crm/CRMForm';
import CRMDetail from '../components/crm/CRMDetail';
import CRMFollowUpsDueWidget from '../components/crm/widgets/CRMFollowUpsDueWidget';
import CRMTopTargetsWidget from '../components/crm/widgets/CRMTopTargetsWidget';
import CRMPipelineStatsWidget from '../components/crm/widgets/CRMPipelineStatsWidget';
import CRMAtRiskCustomersWidget from '../components/crm/widgets/CRMAtRiskCustomersWidget';
import CRMVIPCustomersWidget from '../components/crm/widgets/CRMVIPCustomersWidget';
import CRMRecentActivitiesWidget from '../components/crm/widgets/CRMRecentActivitiesWidget';
import ActivityForm from '../components/ActivityForm';
import { jsPDF } from 'jspdf';
import './Page.css';
import './CRM.css';

function CRM() {
  const { data: crmRecordsData, loading, error, refetch } = useCRM();
  const [crmRecords, setCrmRecords] = useState(null);
  const [roiData, setRoiData] = useState(null);
  const [roiLoading, setRoiLoading] = useState(false);
  
  // Sync external data with local state
  useEffect(() => {
    if (crmRecordsData) {
      setCrmRecords(crmRecordsData);
    }
  }, [crmRecordsData]);
  const { mutate: createCRMRecord, loading: creating } = useCreateCRMRecord();
  const { mutate: updateCRMRecord, loading: updating } = useUpdateCRMRecord();
  const { mutate: deleteCRMRecord, loading: deleting } = useDeleteCRMRecord();

  const saving = creating || updating;

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [parentRecord, setParentRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'hot', 'atRisk', 'inactive', 'lost', 'dashboard', 'funnel', 'playbook', 'roi', 'topTargets'
  const [selectedSalesRep, setSelectedSalesRep] = useState('all');
  const [filters, setFilters] = useState({
    relationship_stage: 'all',
    salesRep: 'all',
    topTargetsOnly: false,
    needsFollowup: false,
    prospectType: 'all',
    industry: 'all',
    searchTerm: ''
  });
  const [showQuickActivityForm, setShowQuickActivityForm] = useState(false);
  const [quickActivityRecord, setQuickActivityRecord] = useState(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    // Default to week starting 1/5/2026
    return new Date('2026-01-05');
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
  const [topTargetsData, setTopTargetsData] = useState({});
  const [loadingTopTargets, setLoadingTopTargets] = useState(false);
  const [showTopTargetModal, setShowTopTargetModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [targetFormData, setTargetFormData] = useState({
    companyName: '',
    status: ''
  });

  // Load activity data when week changes or when activity tab is active
  useEffect(() => {
    if (activeTab !== 'activity' || !selectedWeekStart) return;
    
    const loadActivityData = async () => {
      setLoadingActivity(true);
      try {
        const weekStartStr = selectedWeekStart.toISOString().split('T')[0];
        
        // Load current week data
        const weekData = await activityTrackingService.getByWeek(weekStartStr);
        
        // Load all 2026 data for MTD/YTD calculations
        const startOf2026 = '2026-01-01';
        const endOf2026 = '2026-12-31';
        const all2026Data = await activityTrackingService.getByDateRange(startOf2026, endOf2026);
        
        // Convert all data to object keyed by week_start_date -> sales_rep (capitalized)
        const allDataObj = {};
        all2026Data.forEach(record => {
          const weekStr = record.week_start_date;
          if (!allDataObj[weekStr]) {
            allDataObj[weekStr] = {};
          }
          // Normalize sales rep name to capitalized format
          const repName = record.sales_rep.charAt(0).toUpperCase() + record.sales_rep.slice(1).toLowerCase();
          allDataObj[weekStr][repName] = {
            id: record.id,
            coldCalls: record.cold_calls || 0,
            insightMeetings: record.insight_meetings || 0,
            initialCommitments: record.initial_commitments || 0,
            referralJobs: record.referral_jobs || 0
          };
        });
        
        // Convert current week data to object keyed by sales rep
        const weekDataObj = {};
        const salesReps = ['Paige', 'Ainsley', 'Joe', 'Tony', 'Matt'];
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
        
        // Merge with existing activityData
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
  }, [activeTab, selectedWeekStart]);

  // Sales rep sections for Top 10 Targets
  const topTargetsSections = [
    { name: 'HB Nashville', reps: ['Ainsley', 'Joe', 'Paige', 'Bri'] },
    { name: 'National', reps: ['Matt', 'Tony'] },
    { name: 'Other', reps: ['David', 'Mike'] }
  ];
  const allTopTargetsReps = topTargetsSections.flatMap(section => section.reps);

  // Initial targets data to populate (from Top 10 Targets PowerPoint table)
  const initialTargetsData = {
    'Bri': [
      'Country Music Hall of Fame',
      'Fire Station Wilson Co (11 Total)'
    ],
    'Matt': [
      'National Management Resources',
      'Mercy Housing',
      'Sewanee Univ',
      'Union',
      'Cumberland Univ',
      'GT',
      'Share Source',
      'Univ of Tenn Med Ctr',
      'Higginbotham',
      'Belmont Univ.'
    ],
    'Tony': [
      'Cushman & Wakefield',
      'Avison Young',
      'Charles Hawkins Co',
      'Commonwealth Commercial Partners',
      'Holladay Properties',
      'Brookside Properties',
      'Lincoln Property Company',
      'Taubman Centers, Inc.',
      'Southeast Venture LLC',
      'Tony G (nashRE)'
    ],
    'Paige': [
      'Willow Bridge',
      'Greystar',
      'Avison Young',
      'Lion Real Estate Group',
      'Schatten Properties',
      'New Earth Residential',
      'TC Restaurant Group',
      'Evergreen',
      'Colliers',
      'Fairfield Residential',
      'Freeman Webb (Local)'
    ],
    'Mike': [
      // Mike's column appears to be empty in the table
    ],
    'David': [
      'HCA',
      'Acadia',
      'Strategic Hospitality',
      'Taylor Farms',
      'Oliver Hospitality',
      'Southern Land Co',
      'Abe\'s Garden',
      'Ghertner and Co',
      'AMZ'
    ]
  };

  // Load top targets data when tab is active
  useEffect(() => {
    if (activeTab !== 'topTargets') return;
    
    const loadTopTargets = async () => {
      setLoadingTopTargets(true);
      try {
        // Load existing data first (fast)
        const allTargets = await topTargetsService.getAll();
        
        // Transform and display data immediately
        const targetsObj = {};
        allTopTargetsReps.forEach(rep => {
          targetsObj[rep] = {};
          for (let i = 1; i <= 10; i++) {
            targetsObj[rep][i] = { companyName: '', status: '', id: null };
          }
        });
        
        allTargets.forEach(target => {
          const repName = target.sales_rep.charAt(0).toUpperCase() + target.sales_rep.slice(1).toLowerCase();
          if (targetsObj[repName] && target.target_position >= 1 && target.target_position <= 10) {
            targetsObj[repName][target.target_position] = {
              companyName: target.company_name || '',
              status: target.status || '',
              id: target.id
            };
          }
        });
        
        // Show data immediately
        setTopTargetsData(targetsObj);
        setLoadingTopTargets(false);
        
        // Check if sync is needed (only sync if data is missing or different)
        let needsSync = false;
        for (const [salesRep, targets] of Object.entries(initialTargetsData)) {
          const existingTargets = allTargets.filter(
            t => t.sales_rep.toLowerCase() === salesRep.toLowerCase()
          );
          // Check if we need to sync (missing data or first target doesn't match)
          if (existingTargets.length === 0 || 
              (targets.length > 0 && existingTargets[0]?.company_name !== targets[0])) {
            needsSync = true;
            break;
          }
        }
        
        // Sync in background if needed (don't block UI)
        if (needsSync) {
          console.log('Syncing targets data in background...');
          const syncPromises = [];
          
          for (const [salesRep, targets] of Object.entries(initialTargetsData)) {
            // Update targets for this sales rep (up to 10 positions)
            for (let i = 0; i < targets.length && i < 10; i++) {
              const existingTarget = allTargets.find(
                t => t.sales_rep.toLowerCase() === salesRep.toLowerCase() && t.target_position === i + 1
              );
              // Only update if different
              if (!existingTarget || existingTarget.company_name !== targets[i]) {
                syncPromises.push(
                  topTargetsService.upsert({
                    sales_rep: salesRep,
                    target_position: i + 1,
                    company_name: targets[i],
                    status: existingTarget?.status || null
                  })
                );
              }
            }
          }
          
          // Run all syncs in parallel (much faster)
          if (syncPromises.length > 0) {
            await Promise.all(syncPromises);
            // Reload and update after sync
            const reloadedTargets = await topTargetsService.getAll();
            const updatedTargetsObj = {};
            allTopTargetsReps.forEach(rep => {
              updatedTargetsObj[rep] = {};
              for (let i = 1; i <= 10; i++) {
                updatedTargetsObj[rep][i] = { companyName: '', status: '', id: null };
              }
            });
            reloadedTargets.forEach(target => {
              const repName = target.sales_rep.charAt(0).toUpperCase() + target.sales_rep.slice(1).toLowerCase();
              if (updatedTargetsObj[repName] && target.target_position >= 1 && target.target_position <= 10) {
                updatedTargetsObj[repName][target.target_position] = {
                  companyName: target.company_name || '',
                  status: target.status || '',
                  id: target.id
                };
              }
            });
            setTopTargetsData(updatedTargetsObj);
          }
        }
      } catch (error) {
        console.error('Error loading top targets:', error);
        setLoadingTopTargets(false);
      }
    };
    
    loadTopTargets();
  }, [activeTab]);

  // Handle target cell click
  const handleTargetCellClick = (salesRep, position) => {
    const target = topTargetsData[salesRep]?.[position] || { companyName: '', status: '', id: null };
    setEditingTarget({ salesRep, position, id: target.id });
    setTargetFormData({
      companyName: target.companyName,
      status: target.status
    });
    setShowTopTargetModal(true);
  };

  // Handle target form submission
  const handleTargetFormSubmit = async (e) => {
    e.preventDefault();
    if (!editingTarget) return;
    
    setLoadingTopTargets(true);
    try {
      await topTargetsService.upsert({
        sales_rep: editingTarget.salesRep,
        target_position: editingTarget.position,
        company_name: targetFormData.companyName.trim() || null,
        status: targetFormData.status || null
      });
      
      // Reload targets data
      const allTargets = await topTargetsService.getAll();
      const targetsObj = {};
      
      allTopTargetsReps.forEach(rep => {
        targetsObj[rep] = {};
        for (let i = 1; i <= 10; i++) {
          targetsObj[rep][i] = { companyName: '', status: '', id: null };
        }
      });
      
      allTargets.forEach(target => {
        const repName = target.sales_rep.charAt(0).toUpperCase() + target.sales_rep.slice(1).toLowerCase();
        if (targetsObj[repName] && target.target_position >= 1 && target.target_position <= 10) {
          targetsObj[repName][target.target_position] = {
            companyName: target.company_name || '',
            status: target.status || '',
            id: target.id
          };
        }
      });
      
      setTopTargetsData(targetsObj);
      setShowTopTargetModal(false);
      setEditingTarget(null);
    } catch (error) {
      console.error('Error saving target:', error);
      alert('Failed to save target: ' + (error.message || 'Unknown error'));
    } finally {
      setLoadingTopTargets(false);
    }
  };

  // Handle activity form submission
  const handleActivityFormSubmit = async (e) => {
    e.preventDefault();
    if (!selectedActivityRep || !selectedWeekStart) return;
    
    const weekStartStr = selectedWeekStart.toISOString().split('T')[0];
    setSavingActivity(true);
    
    try {
      const result = await activityTrackingService.upsert({
        week_start_date: weekStartStr,
        sales_rep: selectedActivityRep,
        cold_calls: parseInt(activityFormData.coldCalls) || 0,
        insight_meetings: parseInt(activityFormData.insightMeetings) || 0,
        initial_commitments: parseInt(activityFormData.initialCommitments) || 0,
        referral_jobs: parseInt(activityFormData.referralJobs) || 0
      });
      
      console.log('Save result:', result);
      
      // Reload all 2026 data to ensure MTD/YTD are accurate
      const startOf2026 = '2026-01-01';
      const endOf2026 = '2026-12-31';
      const all2026Data = await activityTrackingService.getByDateRange(startOf2026, endOf2026);
      
      // Convert all data to object keyed by week_start_date -> sales_rep (capitalized)
      const allDataObj = {};
      all2026Data.forEach(record => {
        const weekStr = record.week_start_date;
        if (!allDataObj[weekStr]) {
          allDataObj[weekStr] = {};
        }
        // Normalize sales rep name to capitalized format
        const repName = record.sales_rep.charAt(0).toUpperCase() + record.sales_rep.slice(1).toLowerCase();
        allDataObj[weekStr][repName] = {
          id: record.id,
          coldCalls: record.cold_calls || 0,
          insightMeetings: record.insight_meetings || 0,
          initialCommitments: record.initial_commitments || 0,
          referralJobs: record.referral_jobs || 0
        };
      });
      
      // Update local state with fresh data
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

  const [playbookFormData, setPlaybookFormData] = useState({
    // Contact Section
    contactName: '',
    contactTitle: '',
    contactEmail: '',
    contactPhone: '',
    contactCompany: '',
    
    // Property Section
    propertyAddress: '',
    propertyType: '',
    propertySize: '',
    propertyAge: '',
    numberOfBuildings: '',
    currentChallenges: '',
    
    // Process Section
    currentProcess: '',
    processChallenges: '',
    
    // Current Providers Section
    currentProviders: '',
    providerSatisfaction: '',
    providerImprovements: '',
    
    // Maintenance / Management Section
    numberOfMaintenanceEngineers: '',
    lastTraining: '',
    equipment: '',
    
    // Loss History Section
    recentLosses: '',
    lastEvent: '',
    eventType24Months: [],
    outsourcingScale: '',
    protocolForCallout: '',
    eventsAnnually: '',
    
    // Organization Structure Section
    portfolioManagers: '',
    regionalManagers: '',
    propertyManagers: '',
    maintenanceSupervisors: '',
    directorEngineeringMaintenance: '',
    
    // Commitment Section
    projectedJobDate: '',
    interactionPlanStrategy: ''
  });

  // Helper function to format phone numbers
  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else if (cleaned.length >= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length >= 3) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    }
    return cleaned;
  };

  // Get parent records for dropdown
  const parentRecords = useMemo(() => {
    return (crmRecords || []).filter(r => !r.parent_id);
  }, [crmRecords]);

  // Filter records based on active tab and filters
  const filteredRecords = useMemo(() => {
    if (!crmRecords) return [];
    
    let filtered = [...crmRecords];

    // Apply tab filter (only for non-standard tabs)
    if (activeTab === 'hot') {
      // Use hot prospects view logic
      filtered = filtered.filter(r => 
        r.relationship_stage === 'prospect' && (
          r.is_top_target === true ||
          (r.next_followup_date && new Date(r.next_followup_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
        )
      );
    } else if (activeTab === 'atRisk') {
      filtered = filtered.filter(r => r.relationship_stage === 'active_customer');
      // Additional filtering for at-risk would be done by the view
    } else if (activeTab === 'inactive') {
      filtered = filtered.filter(r => r.relationship_stage === 'inactive');
    } else if (activeTab === 'lost') {
      filtered = filtered.filter(r => r.relationship_stage === 'lost');
    }

    // Apply filters
    return filtered.filter(record => {
      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          (record.company_name || '').toLowerCase().includes(searchLower) ||
          (record.first_name || '').toLowerCase().includes(searchLower) ||
          (record.last_name || '').toLowerCase().includes(searchLower) ||
          (record.email || '').toLowerCase().includes(searchLower) ||
          (record.phone_primary || '').toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Relationship stage filter
      if (filters.relationship_stage !== 'all' && record.relationship_stage !== filters.relationship_stage) return false;

      // Prospect type filter
      if (filters.prospectType !== 'all' && record.prospect_type !== filters.prospectType) return false;

      // Industry filter
      if (filters.industry !== 'all' && record.industry !== filters.industry) return false;

      // Top targets filter
      if (filters.topTargetsOnly && !record.is_top_target) return false;

      // Needs followup filter
      if (filters.needsFollowup) {
        if (!record.next_followup_date) return false;
        const today = new Date().toISOString().split('T')[0];
        if (record.next_followup_date > today) return false;
      }

      // Sales rep filter (simplified - would need user mapping in production)
      if (filters.salesRep !== 'all') {
        // This is a placeholder - in production, map sales rep names to UUIDs
      }

      return true;
    });
  }, [crmRecords, activeTab, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleCreateCRMRecord = async (recordData) => {
    try {
      const result = await createCRMRecord(() => crmService.create(recordData));
      setShowForm(false);
      setEditingRecord(null);
      refetch();
      return result;
    } catch (error) {
      console.error('Error creating CRM record:', error);
      alert('Failed to create CRM record: ' + error.message);
      throw error;
    }
  };

  const handleUpdateCRMRecord = async (recordData) => {
    try {
      const result = await updateCRMRecord(() => crmService.update(editingRecord.id, recordData));
      setShowForm(false);
      setEditingRecord(null);
      setViewingRecord(null);
      refetch();
      return result;
    } catch (error) {
      console.error('Error updating CRM record:', error);
      alert('Failed to update CRM record: ' + error.message);
      throw error;
    }
  };

  const handleDeleteCRMRecord = async (id) => {
    if (window.confirm('Are you sure you want to hide this CRM record? It will be permanently hidden from all CRM views but data will be preserved.')) {
      try {
        await deleteCRMRecord(() => crmService.delete(id));
        refetch();
      } catch (error) {
        console.error('Error hiding CRM record:', error);
        alert('Failed to hide CRM record: ' + error.message);
      }
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleView = async (record) => {
    setViewingRecord(record);
    if (record.parent_id) {
      try {
        const parent = await crmService.getById(record.parent_id);
        setParentRecord(parent);
      } catch (error) {
        setParentRecord(null);
      }
    } else {
      setParentRecord(null);
    }
  };

  const handleQuickLogActivity = (record) => {
    setQuickActivityRecord(record);
    setShowQuickActivityForm(true);
  };

  const handleQuickActivitySave = async (activityData) => {
    try {
      const { crmActivityService } = await import('../services/crmActivityService');
      await crmActivityService.create({ ...activityData, crm_id: quickActivityRecord.id });
      setShowQuickActivityForm(false);
      setQuickActivityRecord(null);
      refetch();
    } catch (error) {
      console.error('Error saving activity:', error);
      alert('Failed to save activity: ' + error.message);
    }
  };

  const handleCreateParent = async (companyName) => {
    try {
      // Create a new parent record with just the company name
      const newParent = {
        prospect_type: 'commercial',
        parent_id: null, // Top-level record
        company_name: companyName,
        relationship_stage: 'prospect'
      };
      const result = await createCRMRecord(() => crmService.create(newParent));
      
      // Refresh the parent records list so it appears in the dropdown
      await refetch();
      
      return result;
    } catch (error) {
      console.error('Error creating parent:', error);
      alert('Failed to create parent company: ' + error.message);
      throw error;
    }
  };

  const handleToggleTopTarget = (recordId) => {
    // Optimistically update the record immediately without waiting for refetch
    // This prevents the page from reloading/scrolling
    if (crmRecords) {
      const updatedRecords = crmRecords.map(record => 
        record.id === recordId 
          ? { ...record, is_top_target: !record.is_top_target }
          : record
      );
      setCrmRecords(updatedRecords);
    }
    // Refetch in the background after a delay to sync with server
    // The delay prevents the loading state from showing during the toggle
    setTimeout(() => {
      refetch();
    }, 2000);
  };

  // Generate PDF for playbook (keeping existing functionality)
  const generatePDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;
    const sectionSpacing = 5;

    // Helper function to add a new page if needed
    const checkPageBreak = (requiredSpace = 10) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    };

    // Helper function to add text with word wrap
    const addText = (text, x, y, maxWidth, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text || 'N/A', maxWidth);
      doc.text(lines, x, y);
      return lines.length * lineHeight;
    };

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Insight Meeting Playbook', margin, yPosition);
    yPosition += 10;

    // Date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += sectionSpacing + 5;

    // Section 1: Contact
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('1. Contact', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Name: ${playbookFormData.contactName}`, margin, yPosition, 170);
    yPosition += addText(`Title: ${playbookFormData.contactTitle}`, margin, yPosition, 170);
    yPosition += addText(`Email: ${playbookFormData.contactEmail}`, margin, yPosition, 170);
    yPosition += addText(`Phone: ${playbookFormData.contactPhone}`, margin, yPosition, 170);
    yPosition += addText(`Company: ${playbookFormData.contactCompany}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 2: Property
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('2. Property', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Property Address: ${playbookFormData.propertyAddress}`, margin, yPosition, 170);
    yPosition += addText(`Property Type: ${playbookFormData.propertyType}`, margin, yPosition, 170);
    yPosition += addText(`Property Size: ${playbookFormData.propertySize}`, margin, yPosition, 170);
    yPosition += addText(`Property Age: ${playbookFormData.propertyAge}`, margin, yPosition, 170);
    yPosition += addText(`Number of Buildings: ${playbookFormData.numberOfBuildings}`, margin, yPosition, 170);
    yPosition += addText(`Current Challenges: ${playbookFormData.currentChallenges}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 3: Process
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('3. Process', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Current Process: ${playbookFormData.currentProcess}`, margin, yPosition, 170);
    yPosition += addText(`Process Challenges: ${playbookFormData.processChallenges}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 4: Current Providers
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('4. Current Providers', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Current Providers: ${playbookFormData.currentProviders}`, margin, yPosition, 170);
    yPosition += addText(`Provider Satisfaction: ${playbookFormData.providerSatisfaction}`, margin, yPosition, 170);
    yPosition += addText(`How/What could they improve?: ${playbookFormData.providerImprovements}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 5: Maintenance / Management
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('5. Maintenance / Management', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Number of maintenance / engineers: ${playbookFormData.numberOfMaintenanceEngineers}`, margin, yPosition, 170);
    yPosition += addText(`Last Training (What/When): ${playbookFormData.lastTraining}`, margin, yPosition, 170);
    yPosition += addText(`Equipment (Dehus, air movers, moister readers): ${playbookFormData.equipment}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 6: Loss History
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('6. Loss History', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Recent Losses: ${playbookFormData.recentLosses}`, margin, yPosition, 170);
    yPosition += addText(`Last Event (When / Details): ${playbookFormData.lastEvent}`, margin, yPosition, 170);
    const eventTypes = playbookFormData.eventType24Months.length > 0 
      ? playbookFormData.eventType24Months.join(', ') 
      : 'None';
    yPosition += addText(`Event Type in last 24 months: ${eventTypes}`, margin, yPosition, 170);
    yPosition += addText(`Emergency event Outsourcing Scale: ${playbookFormData.outsourcingScale}`, margin, yPosition, 170);
    yPosition += addText(`Protocol for deciding what gets called out: ${playbookFormData.protocolForCallout}`, margin, yPosition, 170);
    yPosition += addText(`Number of events annually: ${playbookFormData.eventsAnnually}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 7: Organization Structure
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('7. Organization Structure', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Portfolio Managers: ${playbookFormData.portfolioManagers}`, margin, yPosition, 170);
    yPosition += addText(`Regional Managers: ${playbookFormData.regionalManagers}`, margin, yPosition, 170);
    yPosition += addText(`Property Managers: ${playbookFormData.propertyManagers}`, margin, yPosition, 170);
    yPosition += addText(`Maintenance Supervisors: ${playbookFormData.maintenanceSupervisors}`, margin, yPosition, 170);
    yPosition += addText(`Director of Engineering / Maintenance: ${playbookFormData.directorEngineeringMaintenance}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 8: Commitment
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('8. Commitment', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Projected Job Date: ${playbookFormData.projectedJobDate}`, margin, yPosition, 170);
    yPosition += addText(`Initial Commitment Interaction Plan / Strategy: ${playbookFormData.interactionPlanStrategy}`, margin, yPosition, 170);

    // Save the PDF
    const fileName = `Insight_Meeting_Playbook_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  // Calculate funnel layers from CRM records
  const funnelLayers = useMemo(() => {
    if (!crmRecords) return [];
    
    const today = new Date();
    const targetIdentified = crmRecords.filter(r => r.relationship_stage === 'prospect').length;
    const insightScheduled = crmRecords.filter(r => r.insight_meeting_date && new Date(r.insight_meeting_date) >= today).length;
    const insightCompleted = crmRecords.filter(r => r.insight_meeting_date && new Date(r.insight_meeting_date) < today).length;
    const presentation = crmRecords.filter(r => r.insight_meeting_date && r.relationship_stage === 'prospect').length;
    const initialCommitment = crmRecords.filter(r => r.relationship_stage === 'prospect' && r.first_referral_date).length;
    const firstReferral = crmRecords.filter(r => r.first_referral_date).length;
    const closed = crmRecords.filter(r => r.relationship_stage === 'active_customer').length;
    const msaSigned = crmRecords.filter(r => r.date_closed).length;

    // Use dummy data that shows descending funnel pattern
    // Each level should be smaller than the previous
    const dummyData = [
      { name: 'Target Identified', count: 100, color: '#f97316', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', percentage: 100 },
      { name: 'Insight Meeting Scheduled', count: 75, color: '#fb923c', gradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)', percentage: 75 },
      { name: 'Insight Meeting Completed', count: 55, color: '#fbbf24', gradient: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)', percentage: 55 },
      { name: 'Presentation to Client', count: 40, color: '#fde047', gradient: 'linear-gradient(135deg, #fde047 0%, #fbbf24 100%)', percentage: 40 },
      { name: 'Initial Commitment', count: 28, color: '#60a5fa', gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', percentage: 28 },
      { name: 'First Referral Received', count: 18, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', percentage: 18 },
      { name: 'Closed / First Job Reviewed', count: 12, color: '#1e40af', gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', percentage: 12 },
      { name: 'MSA Signed', count: 8, color: '#1e3a8a', gradient: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)', percentage: 8 }
    ];

    return dummyData;
  }, [crmRecords]);

  return (
    <div className="page-container crm-page">
      <div className="crm-header">
        <h1>Customer Relationship Management</h1>
      </div>

      {error && (
        <div className="crm-error">
          <p>{error.message || 'Failed to load CRM records'}</p>
          <button onClick={refetch} disabled={loading}>
            Retry
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="crm-action-buttons">
        <button className="action-btn action-btn-blue" onClick={() => {
          setEditingRecord(null);
          setShowForm(true);
        }}>
          <span className="btn-icon">👤</span>
          Add CRM Record
        </button>
        <button 
          className={`action-btn ${activeTab === 'all' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('all')}
        >
          <span className="btn-icon">📋</span>
          CRM
        </button>
        <button 
          className={`action-btn ${activeTab === 'roi' ? 'action-btn-blue' : 'action-btn-gray'}`}
          onClick={async () => {
            setActiveTab('roi');
            setRoiLoading(true);
            try {
              const data = await crmService.getROIData();
              console.log('ROI data loaded:', data);
              setRoiData(data || []);
            } catch (err) {
              console.error('Error loading ROI data:', err);
              alert('Failed to load ROI data: ' + err.message);
              setRoiData([]);
            } finally {
              setRoiLoading(false);
            }
          }}
        >
          <span className="btn-icon">📈</span>
          ROI View
        </button>
        <button 
          className={`action-btn ${activeTab === 'funnel' ? 'action-btn-purple' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('funnel')}
        >
          <span className="btn-icon">📊</span>
          Sales Funnel
        </button>
        <button 
          className={`action-btn ${activeTab === 'playbook' ? 'action-btn-orange' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('playbook')}
        >
          <span className="btn-icon">📋</span>
          Insight Meeting Playbook
        </button>
        <button 
          className={`action-btn ${activeTab === 'activity' ? 'action-btn-blue' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('activity')}
        >
          <span className="btn-icon">📝</span>
          Activity Tracking
        </button>
        <button 
          className={`action-btn ${activeTab === 'topTargets' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('topTargets')}
        >
          <span className="btn-icon">🎯</span>
          Top 10 Targets
        </button>
      </div>

      {/* CRM Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => {
          setShowForm(false);
          setEditingRecord(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRecord ? 'Edit CRM Record' : 'Add New CRM Record'}</h2>
              <button className="close-btn" onClick={() => {
                setShowForm(false);
                setEditingRecord(null);
              }}>×</button>
            </div>
            <CRMForm
              crmRecord={editingRecord}
              parentRecords={parentRecords}
              onSave={editingRecord ? handleUpdateCRMRecord : handleCreateCRMRecord}
              onCreateParent={handleCreateParent}
              onCancel={() => {
                setShowForm(false);
                setEditingRecord(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Quick Activity Form Modal */}
      {showQuickActivityForm && quickActivityRecord && (
        <div className="modal-overlay" onClick={() => {
          setShowQuickActivityForm(false);
          setQuickActivityRecord(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Quick Log Activity - {quickActivityRecord.company_name || 'Unnamed'}</h2>
              <button className="close-btn" onClick={() => {
                setShowQuickActivityForm(false);
                setQuickActivityRecord(null);
              }}>×</button>
            </div>
            <ActivityForm
              crmId={quickActivityRecord.id}
              onSave={handleQuickActivitySave}
              onCancel={() => {
                setShowQuickActivityForm(false);
                setQuickActivityRecord(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Table Views */}
      {['all', 'hot', 'atRisk', 'inactive', 'lost'].includes(activeTab) && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>
              {activeTab === 'all' && 'All CRM Records'}
              {activeTab === 'hot' && 'Hot Prospects'}
              {activeTab === 'atRisk' && 'At-Risk Customers'}
              {activeTab === 'inactive' && 'Inactive Customers'}
              {activeTab === 'lost' && 'Lost Records'}
              {' '}({filteredRecords.length})
            </h2>
          </div>
          <CRMFilters filters={filters} onFilterChange={handleFilterChange} />
          {loading ? (
            <div className="crm-loading">
              <p>Loading CRM records...</p>
            </div>
          ) : (
            <CRMTable
              records={filteredRecords}
              onRecordClick={handleEdit}
              onQuickLogActivity={handleQuickLogActivity}
              onToggleTopTarget={handleToggleTopTarget}
              onDelete={handleDeleteCRMRecord}
            />
          )}
                </div>
      )}

      {/* Dashboard View */}
      {activeTab === 'dashboard' && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>CRM Dashboard</h2>
                </div>
          <div className="dashboard-grid">
            <div className="dashboard-widget">
              <CRMPipelineStatsWidget />
              </div>
            <div className="dashboard-widget">
              <CRMFollowUpsDueWidget onRecordClick={handleView} />
            </div>
            <div className="dashboard-widget">
              <CRMTopTargetsWidget onRecordClick={handleView} />
            </div>
            <div className="dashboard-widget">
              <CRMAtRiskCustomersWidget onRecordClick={handleView} />
            </div>
            <div className="dashboard-widget">
              <CRMVIPCustomersWidget onRecordClick={handleView} />
            </div>
            <div className="dashboard-widget">
              <CRMRecentActivitiesWidget onRecordClick={handleView} />
            </div>
          </div>
        </div>
      )}

      {/* ROI View */}
      {activeTab === 'roi' && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>ROI View</h2>
          </div>
          {roiLoading ? (
            <div className="crm-loading">
              <p>Loading ROI data...</p>
            </div>
          ) : roiData && roiData.length > 0 ? (
            <ROITable
              records={roiData}
              onRecordClick={handleEdit}
            />
          ) : (
            <div className="crm-table-empty">
              <p>No ROI data available. {roiData === null ? 'Click "ROI View" to load data.' : 'No records found.'}</p>
            </div>
          )}
        </div>
      )}


      {/* Sales Funnel View */}
      {activeTab === 'funnel' && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>Sales Funnel</h2>
            <div className="funnel-filter">
              <label htmlFor="sales-rep-filter">Sales Rep:</label>
                  <select
                id="sales-rep-filter"
                value={selectedSalesRep}
                onChange={(e) => setSelectedSalesRep(e.target.value)}
                className="sales-rep-select"
              >
                <option value="all">All Reps</option>
                <option value="bri">Bri</option>
                <option value="paige">Paige</option>
                <option value="matt">Matt</option>
                <option value="tony">Tony</option>
                  </select>
                </div>
                </div>
          <SalesFunnel layers={funnelLayers} salesRep={selectedSalesRep} />
              </div>
      )}

      {/* Insight Meeting Playbook View - Keep existing implementation */}
      {activeTab === 'playbook' && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>Insight Meeting Playbook</h2>
              </div>
          <div className="playbook-form-container">
            <form className="playbook-form" onSubmit={(e) => {
              e.preventDefault();
              // TODO: Save to Supabase or email output
              console.log('Playbook form data:', playbookFormData);
              alert('Form data ready for Supabase/email integration');
            }}>
              {/* Section 1: Contact */}
              <div className="form-section-header">1. Contact</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contact Name</label>
                  <input
                    type="text"
                    name="contactName"
                    value={playbookFormData.contactName}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, contactName: e.target.value})}
                    placeholder="Full name"
                  />
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    name="contactTitle"
                    value={playbookFormData.contactTitle}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, contactTitle: e.target.value})}
                    placeholder="Job title"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={playbookFormData.contactEmail}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, contactEmail: e.target.value})}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={playbookFormData.contactPhone}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, contactPhone: formatPhoneNumber(e.target.value)})}
                    placeholder="(555) 555-5555"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Company</label>
                <input
                  type="text"
                  name="contactCompany"
                  value={playbookFormData.contactCompany}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, contactCompany: e.target.value})}
                  placeholder="Company name"
                />
              </div>

              <div className="form-section-divider"></div>

              {/* Section 2: Property */}
              <div className="form-section-header">2. Property</div>
              <div className="form-group">
                <label>Property Address</label>
                <input
                  type="text"
                  name="propertyAddress"
                  value={playbookFormData.propertyAddress}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, propertyAddress: e.target.value})}
                  placeholder="Full property address"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Property Type</label>
                  <select
                    name="propertyType"
                    value={playbookFormData.propertyType}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, propertyType: e.target.value})}
                  >
                    <option value="">Select type...</option>
                    <option value="multi-family">Multi-Family (Apts)</option>
                    <option value="condos">Condos</option>
                    <option value="office">Office</option>
                    <option value="education">Education</option>
                    <option value="industrial">Industrial</option>
                    <option value="medical">Medical</option>
                    <option value="retail">Retail</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Property Size (sq ft)</label>
                  <input
                    type="text"
                    name="propertySize"
                    value={playbookFormData.propertySize}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, propertySize: e.target.value})}
                    placeholder="Square footage"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Property Age</label>
                  <input
                    type="text"
                    name="propertyAge"
                    value={playbookFormData.propertyAge}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, propertyAge: e.target.value})}
                    placeholder="Years or year built"
                  />
                </div>
                <div className="form-group">
                  <label>Number of Buildings</label>
                  <input
                    type="text"
                    name="numberOfBuildings"
                    value={playbookFormData.numberOfBuildings}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, numberOfBuildings: e.target.value})}
                    placeholder="Total buildings"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Current Challenges at Property</label>
                <textarea
                  name="currentChallenges"
                  value={playbookFormData.currentChallenges}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, currentChallenges: e.target.value})}
                  placeholder="Describe current challenges at the property"
                  rows="3"
                />
              </div>

              <div className="form-section-divider"></div>

              {/* Section 3: Process */}
              <div className="form-section-header">3. Process</div>
              <div className="form-group">
                <label>Current Process</label>
                <textarea
                  name="currentProcess"
                  value={playbookFormData.currentProcess}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, currentProcess: e.target.value})}
                  placeholder="Describe their current process for handling restoration/maintenance"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Process Challenges</label>
                <textarea
                  name="processChallenges"
                  value={playbookFormData.processChallenges}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, processChallenges: e.target.value})}
                  placeholder="What challenges do they face with their current process?"
                  rows="3"
                />
          </div>

              <div className="form-section-divider"></div>

              {/* Section 4: Current Providers */}
              <div className="form-section-header">4. Current Providers</div>
              <div className="form-group">
                <label>Current Providers</label>
                <textarea
                  name="currentProviders"
                  value={playbookFormData.currentProviders}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, currentProviders: e.target.value})}
                  placeholder="List current service providers, vendors, or contractors"
                  rows="3"
                />
          </div>
              <div className="form-group">
                <label>Provider Satisfaction Level</label>
                <select
                  name="providerSatisfaction"
                  value={playbookFormData.providerSatisfaction}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, providerSatisfaction: e.target.value})}
                >
                  <option value="">Select...</option>
                  <option value="very-satisfied">Very Satisfied</option>
                  <option value="satisfied">Satisfied</option>
                  <option value="neutral">Neutral</option>
                  <option value="dissatisfied">Dissatisfied</option>
                  <option value="very-dissatisfied">Very Dissatisfied</option>
                </select>
          </div>
              <div className="form-group">
                <label>How/What could they improve?</label>
                <textarea
                  name="providerImprovements"
                  value={playbookFormData.providerImprovements}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, providerImprovements: e.target.value})}
                  placeholder="What improvements could be made with current providers?"
                  rows="2"
                />
      </div>

              <div className="form-section-divider"></div>

              {/* Section 5: Maintenance / Management */}
              <div className="form-section-header">5. Maintenance / Management</div>
              <div className="form-group">
                <label>Number of maintenance / engineers</label>
                <input
                  type="text"
                  name="numberOfMaintenanceEngineers"
                  value={playbookFormData.numberOfMaintenanceEngineers}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, numberOfMaintenanceEngineers: e.target.value})}
                  placeholder="Number of maintenance staff/engineers"
                />
              </div>
              <div className="form-group">
                <label>Last Training (What/When)</label>
                <textarea
                  name="lastTraining"
                  value={playbookFormData.lastTraining}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, lastTraining: e.target.value})}
                  placeholder="What training was provided and when?"
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label>Equipment (Dehus, air movers, moisture readers)</label>
                <textarea
                  name="equipment"
                  value={playbookFormData.equipment}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, equipment: e.target.value})}
                  placeholder="List equipment available (dehumidifiers, air movers, moisture readers, etc.)"
                  rows="2"
                />
            </div>

              <div className="form-section-divider"></div>

              {/* Section 6: Loss History */}
              <div className="form-section-header">6. Loss History</div>
              <div className="form-group">
                <label>Recent Losses</label>
                <textarea
                  name="recentLosses"
                  value={playbookFormData.recentLosses}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, recentLosses: e.target.value})}
                  placeholder="Describe recent losses or incidents"
                  rows="3"
                />
                  </div>
              <div className="form-group">
                <label>Last Event (When / Details)</label>
                <textarea
                  name="lastEvent"
                  value={playbookFormData.lastEvent}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, lastEvent: e.target.value})}
                  placeholder="When was the last event and what were the details?"
                  rows="2"
                />
                  </div>
              <div className="form-group">
                <label>Event Type in last 24 months</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={playbookFormData.eventType24Months.includes('water')}
                      onChange={(e) => {
                        const current = playbookFormData.eventType24Months;
                        const updated = e.target.checked
                          ? [...current, 'water']
                          : current.filter(t => t !== 'water');
                        setPlaybookFormData({...playbookFormData, eventType24Months: updated});
                      }}
                    />
                    Water
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={playbookFormData.eventType24Months.includes('fire')}
                      onChange={(e) => {
                        const current = playbookFormData.eventType24Months;
                        const updated = e.target.checked
                          ? [...current, 'fire']
                          : current.filter(t => t !== 'fire');
                        setPlaybookFormData({...playbookFormData, eventType24Months: updated});
                      }}
                    />
                    Fire
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={playbookFormData.eventType24Months.includes('mold')}
                      onChange={(e) => {
                        const current = playbookFormData.eventType24Months;
                        const updated = e.target.checked
                          ? [...current, 'mold']
                          : current.filter(t => t !== 'mold');
                        setPlaybookFormData({...playbookFormData, eventType24Months: updated});
                      }}
                    />
                    Mold
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={playbookFormData.eventType24Months.includes('bio')}
                      onChange={(e) => {
                        const current = playbookFormData.eventType24Months;
                        const updated = e.target.checked
                          ? [...current, 'bio']
                          : current.filter(t => t !== 'bio');
                        setPlaybookFormData({...playbookFormData, eventType24Months: updated});
                      }}
                    />
                    Bio
                  </label>
                  </div>
                  </div>
              <div className="form-group">
                <label>Emergency event Outsourcing Scale (1-10)</label>
                <select
                  name="outsourcingScale"
                  value={playbookFormData.outsourcingScale}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, outsourcingScale: e.target.value})}
                >
                  <option value="">Select scale...</option>
                  <option value="1">1 - They only call if floors and walls are penetrated and multiple units are affected</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="10">10 - They don't clean up anything themselves</option>
                </select>
                </div>
              <div className="form-group">
                <label>Protocol for deciding what gets called out</label>
                <textarea
                  name="protocolForCallout"
                  value={playbookFormData.protocolForCallout}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, protocolForCallout: e.target.value})}
                  placeholder="What is their protocol for deciding when to call out external help?"
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label>Number of events annually</label>
                <input
                  type="text"
                  name="eventsAnnually"
                  value={playbookFormData.eventsAnnually}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, eventsAnnually: e.target.value})}
                  placeholder="Average number of events per year"
                />
              </div>

              <div className="form-section-divider"></div>

              {/* Section 7: Organization Structure */}
              <div className="form-section-header">7. Organization Structure</div>
              <div className="form-group">
                <label>Portfolio Managers</label>
                <textarea
                  name="portfolioManagers"
                  value={playbookFormData.portfolioManagers}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, portfolioManagers: e.target.value})}
                  placeholder="Portfolio managers information"
                  rows="2"
                />
                  </div>
              <div className="form-group">
                <label>Regional Managers</label>
                <textarea
                  name="regionalManagers"
                  value={playbookFormData.regionalManagers}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, regionalManagers: e.target.value})}
                  placeholder="Regional managers information"
                  rows="2"
                />
                  </div>
              <div className="form-group">
                <label>Property Managers</label>
                <textarea
                  name="propertyManagers"
                  value={playbookFormData.propertyManagers}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, propertyManagers: e.target.value})}
                  placeholder="Property managers information"
                  rows="2"
                />
                  </div>
              <div className="form-group">
                <label>Maintenance Supervisors</label>
                <textarea
                  name="maintenanceSupervisors"
                  value={playbookFormData.maintenanceSupervisors}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, maintenanceSupervisors: e.target.value})}
                  placeholder="Maintenance supervisors information"
                  rows="2"
                />
                </div>
              <div className="form-group">
                <label>Director of Engineering / Maintenance</label>
                <textarea
                  name="directorEngineeringMaintenance"
                  value={playbookFormData.directorEngineeringMaintenance}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, directorEngineeringMaintenance: e.target.value})}
                  placeholder="Director of Engineering / Maintenance information"
                  rows="2"
                />
              </div>

              <div className="form-section-divider"></div>

              {/* Section 8: Commitment */}
              <div className="form-section-header">8. Commitment</div>
              <div className="form-group">
                <label>Projected Job Date</label>
                <input
                  type="text"
                  name="projectedJobDate"
                  value={playbookFormData.projectedJobDate}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, projectedJobDate: e.target.value})}
                  placeholder="Enter projected job date"
                />
                </div>
              <div className="form-group">
                <label>Initial Commitment Interaction Plan / Strategy</label>
                <textarea
                  name="interactionPlanStrategy"
                  value={playbookFormData.interactionPlanStrategy}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, interactionPlanStrategy: e.target.value})}
                  placeholder="Describe the interaction plan and strategy for initial commitment"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={generatePDF}>
                  Print to PDF
                </button>
                <button type="submit" className="btn-primary">
                  Save / Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Tracking View */}
      {activeTab === 'activity' && (() => {
        // Helper function to get Monday of a given week
        const getMondayOfWeek = (date) => {
          const d = new Date(date);
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
          return new Date(d.setDate(diff));
        };

        // Generate week start dates (starting from Monday of week containing 1/5/2026, going forward only)
        const generateWeekOptions = () => {
          const options = [];
          const startDate = new Date('2026-01-05');
          const mondayStart = getMondayOfWeek(startDate);
          // Generate 52 weeks forward from the Monday of the week containing 1/5/2026
          for (let i = 0; i <= 52; i++) {
            const date = new Date(mondayStart);
            date.setDate(mondayStart.getDate() + (i * 7));
            options.push(date);
          }
          return options;
        };

        const weekOptions = generateWeekOptions();
        const formatWeekLabel = (date) => {
          const weekEnd = new Date(date);
          weekEnd.setDate(date.getDate() + 6); // Sunday (6 days after Monday)
          return `${(date.getMonth() + 1)}/${date.getDate()} - ${(weekEnd.getMonth() + 1)}/${weekEnd.getDate()}/${date.getFullYear()}`;
        };

        // Helper function to calculate conversion rates
        const calculateConversions = (coldCalls, insightMeetings, initialCommitments, referralJobs) => {
          const insightMtg = coldCalls > 0 ? ((insightMeetings / coldCalls) * 100).toFixed(1) : '0.0';
          const initialCommitment = insightMeetings > 0 ? ((initialCommitments / insightMeetings) * 100).toFixed(1) : '0.0';
          const referralJob = initialCommitments > 0 ? ((referralJobs / initialCommitments) * 100).toFixed(1) : '0.0';
          const fullFunnel = coldCalls > 0 ? ((referralJobs / coldCalls) * 100).toFixed(1) : '0.0';
          return { insightMtg, initialCommitment, referralJob, fullFunnel };
        };

        // Handle row click to open activity form
        const handleActivityRowClick = (salesRep) => {
          const weekStartStr = selectedWeekStart.toISOString().split('T')[0];
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

        // Helper function to render activity table
        const renderActivityTable = (title, data, isEditable = false) => {
          const handleRowClick = isEditable ? (rep) => handleActivityRowClick(rep) : null;
          const hbNashvilleReps = ['Paige', 'Ainsley', 'Joe'];
          const nationalSalesReps = ['Tony', 'Matt'];
          const allReps = [...hbNashvilleReps, ...nationalSalesReps];
          
          // Calculate HB Nashville subtotal
          const hbNashvilleTotals = { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 };
          hbNashvilleReps.forEach(rep => {
            if (data[rep]) {
              hbNashvilleTotals.coldCalls += data[rep].coldCalls || 0;
              hbNashvilleTotals.insightMeetings += data[rep].insightMeetings || 0;
              hbNashvilleTotals.initialCommitments += data[rep].initialCommitments || 0;
              hbNashvilleTotals.referralJobs += data[rep].referralJobs || 0;
            }
          });

          // Calculate National Sales subtotal
          const nationalSalesTotals = { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 };
          nationalSalesReps.forEach(rep => {
            if (data[rep]) {
              nationalSalesTotals.coldCalls += data[rep].coldCalls || 0;
              nationalSalesTotals.insightMeetings += data[rep].insightMeetings || 0;
              nationalSalesTotals.initialCommitments += data[rep].initialCommitments || 0;
              nationalSalesTotals.referralJobs += data[rep].referralJobs || 0;
            }
          });

          // Calculate grand total
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
        const weekStartStr = selectedWeekStart.toISOString().split('T')[0];
        const weekData = activityData[weekStartStr] || {
          Paige: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
          Ainsley: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
          Joe: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
          Tony: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
          Matt: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 }
        };

        // Calculate MTD (sum of all weeks in current month)
        const currentMonth = selectedWeekStart.getMonth();
        const currentYear = selectedWeekStart.getFullYear();
        const mtdData = {
          Paige: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
          Ainsley: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
          Joe: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
          Tony: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
          Matt: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 }
        };

        // Calculate YTD (sum of all weeks from start of 2026)
        const ytdData = {
          Paige: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
          Ainsley: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
          Joe: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
          Tony: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 },
          Matt: { coldCalls: 0, insightMeetings: 0, initialCommitments: 0, referralJobs: 0 }
        };

        // Helper function to check if a date string is in the current month
        const isInCurrentMonth = (dateStr) => {
          const date = new Date(dateStr);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        };

        // Helper function to check if a date string is in 2026 and on or after 1/5/2026
        const isInYTD = (dateStr) => {
          const date = new Date(dateStr);
          const ytdStart = new Date('2026-01-05');
          const mondayStart = getMondayOfWeek(ytdStart);
          const weekStart = getMondayOfWeek(date);
          return date.getFullYear() === 2026 && weekStart >= mondayStart;
        };

        // Sum up MTD and YTD from activityData
        Object.keys(activityData).forEach(weekStr => {
          const weekDate = new Date(weekStr);
          if (isNaN(weekDate.getTime())) return; // Skip invalid dates

          const weekDataForMTD = activityData[weekStr];
          const weekDataForYTD = activityData[weekStr];

          // Add to MTD if in current month
          if (isInCurrentMonth(weekStr)) {
            ['Paige', 'Ainsley', 'Joe', 'Tony', 'Matt'].forEach(rep => {
              const repData = weekDataForMTD[rep];
              if (repData) {
                mtdData[rep].coldCalls += repData.coldCalls || 0;
                mtdData[rep].insightMeetings += repData.insightMeetings || 0;
                mtdData[rep].initialCommitments += repData.initialCommitments || 0;
                mtdData[rep].referralJobs += repData.referralJobs || 0;
              }
            });
          }

          // Add to YTD if in 2026 and on or after 1/5/2026
          if (isInYTD(weekStr)) {
            ['Paige', 'Ainsley', 'Joe', 'Tony', 'Matt'].forEach(rep => {
              const repData = weekDataForYTD[rep];
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
          <div className="customers-container">
            <div className="customers-header">
              <h2>Activity Tracking</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ color: '#f1f5f9' }}>Week Starting:</label>
                <select
                  value={selectedWeekStart.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedWeekStart(new Date(e.target.value))}
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
                    <option key={index} value={date.toISOString().split('T')[0]}>
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
        );
      })()}

      {/* Activity Data Entry Modal */}
      {showActivityForm && (
        <div className="modal-overlay" onClick={() => {
          setShowActivityForm(false);
          setSelectedActivityRep(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
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

      {/* Top 10 Targets View */}
      {activeTab === 'topTargets' && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>Top 10 Targets</h2>
          </div>
          {loadingTopTargets ? (
            <div className="crm-loading">
              <p>Loading targets...</p>
            </div>
          ) : (
            <div className="top-targets-table-container">
              <table className="top-targets-table">
                <thead>
                  <tr>
                    <th rowSpan="2" className="top-targets-position-header">Position</th>
                    {topTargetsSections.map(section => (
                      <th key={section.name} colSpan={section.reps.length} className="top-targets-section-header">
                        {section.name}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {topTargetsSections.map(section =>
                      section.reps.map(rep => (
                        <th key={rep} className="top-targets-rep-header">{rep}</th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(position => (
                    <tr key={position}>
                      <td className="top-targets-position-cell">{position}</td>
                      {topTargetsSections.map(section =>
                        section.reps.map(rep => {
                          const target = topTargetsData[rep]?.[position] || { companyName: '', status: '', id: null };
                          const statusClass = target.status ? `top-targets-status-${target.status}` : '';
                          return (
                            <td
                              key={rep}
                              className={`top-targets-cell ${statusClass}`}
                              onClick={() => handleTargetCellClick(rep, position)}
                            >
                              {target.companyName || <span className="top-targets-empty">Click to add</span>}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Top Target Edit Modal */}
      {showTopTargetModal && editingTarget && (
        <div className="modal-overlay" onClick={() => {
          setShowTopTargetModal(false);
          setEditingTarget(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Edit Target - {editingTarget.salesRep} (Position {editingTarget.position})</h2>
              <button className="close-btn" onClick={() => {
                setShowTopTargetModal(false);
                setEditingTarget(null);
              }}>×</button>
            </div>
            <form onSubmit={handleTargetFormSubmit}>
              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  value={targetFormData.companyName}
                  onChange={(e) => setTargetFormData({...targetFormData, companyName: e.target.value})}
                  placeholder="Enter company name"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={targetFormData.status}
                  onChange={(e) => setTargetFormData({...targetFormData, status: e.target.value})}
                >
                  <option value="">Select status...</option>
                  <option value="green">Green (On Track)</option>
                  <option value="yellow">Yellow (In Progress)</option>
                  <option value="red">Red (Stalled/Need Help)</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => {
                  setShowTopTargetModal(false);
                  setEditingTarget(null);
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loadingTopTargets}>
                  {loadingTopTargets ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CRM Detail Modal */}
      {viewingRecord && (
        <CRMDetail
          crmRecord={viewingRecord}
          parentRecord={parentRecord}
          onEdit={handleEdit}
          onClose={() => {
            setViewingRecord(null);
            setParentRecord(null);
          }}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}

export default CRM;
