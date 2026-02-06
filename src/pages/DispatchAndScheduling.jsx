import React, { useState, useMemo, useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { supabase } from '../services/supabaseClient';
import './Page.css';
import './DispatchAndScheduling.css';

function DispatchAndScheduling() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState('table');
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [expandedCrews, setExpandedCrews] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterJobType, setFilterJobType] = useState('');
  const [draggedJob, setDraggedJob] = useState(null);
  const [dragSource, setDragSource] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [jobsDatabase, setJobsDatabase] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [checklistModal, setChecklistModal] = useState({ open: false, crewId: null, jobIndex: null });
  const [showUnassigned, setShowUnassigned] = useState(true);
  const [draggedUnassigned, setDraggedUnassigned] = useState(null);

  // Load Google Maps
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '8px' };
  const defaultCenter = { lat: 40.7128, lng: -74.0060 };

  // Crew definitions with colors and members
  const initialCrews = [
    { id: 'alpha', name: 'Alpha', zone: 'Zone 1', color: '#ef4444', members: ['Mike J.', 'Sarah C.'], startTime: '8:00 AM' },
    { id: 'bravo', name: 'Bravo', zone: 'Zone 2', color: '#f97316', members: ['Dave W.', 'Lisa B.'], startTime: '8:00 AM' },
    { id: 'charlie', name: 'Charlie', zone: 'Zone 3', color: '#eab308', members: ['Tom R.', 'Amy K.'], startTime: '8:00 AM' },
    { id: 'delta', name: 'Delta', zone: 'Zone 4', color: '#22c55e', members: ['Chris M.', 'Jen P.'], startTime: '8:00 AM' },
  ];

  const zones = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'];

  const jobTypes = [
    { value: '', label: 'Select status...', hours: 0 },
    { value: 'new-start', label: 'New Start', hours: 2.5 },
    { value: 'continue-service', label: 'Continue Service', hours: 1.5 },
    { value: 'demo', label: 'Demo', hours: 3.0 },
    { value: 'equipment-pickup', label: 'Equipment Pickup', hours: 0.5 },
    { value: 'emergency', label: 'Emergency', hours: 5.0 },
    { value: 'monitoring', label: 'Monitoring', hours: 0.8 },
  ];

  // Default checklists for each job type
  const defaultChecklists = {
    'new-start': [
      { id: 1, text: 'Assess damage and document with photos', checked: false },
      { id: 2, text: 'Set up containment barriers', checked: false },
      { id: 3, text: 'Extract standing water', checked: false },
      { id: 4, text: 'Place dehumidifiers and air movers', checked: false },
      { id: 5, text: 'Take initial moisture readings', checked: false },
      { id: 6, text: 'Complete job start paperwork', checked: false },
      { id: 7, text: 'Review scope with customer', checked: false },
    ],
    'continue-service': [
      { id: 1, text: 'Check equipment operation', checked: false },
      { id: 2, text: 'Take moisture readings', checked: false },
      { id: 3, text: 'Document progress with photos', checked: false },
      { id: 4, text: 'Adjust equipment placement if needed', checked: false },
      { id: 5, text: 'Update customer on progress', checked: false },
    ],
    'demo': [
      { id: 1, text: 'Review demo scope with customer', checked: false },
      { id: 2, text: 'Set up containment and protection', checked: false },
      { id: 3, text: 'Remove affected materials', checked: false },
      { id: 4, text: 'Bag and dispose of debris properly', checked: false },
      { id: 5, text: 'Clean work area', checked: false },
      { id: 6, text: 'Document completed demo with photos', checked: false },
      { id: 7, text: 'Get customer sign-off', checked: false },
    ],
    'equipment-pickup': [
      { id: 1, text: 'Take final moisture readings', checked: false },
      { id: 2, text: 'Document final conditions with photos', checked: false },
      { id: 3, text: 'Collect all equipment', checked: false },
      { id: 4, text: 'Clean equipment before loading', checked: false },
      { id: 5, text: 'Get customer sign-off on completion', checked: false },
    ],
    'emergency': [
      { id: 1, text: 'Assess emergency situation', checked: false },
      { id: 2, text: 'Stop source of water if possible', checked: false },
      { id: 3, text: 'Document damage with photos', checked: false },
      { id: 4, text: 'Begin extraction immediately', checked: false },
      { id: 5, text: 'Set up drying equipment', checked: false },
      { id: 6, text: 'Contact office with status update', checked: false },
      { id: 7, text: 'Complete emergency paperwork', checked: false },
      { id: 8, text: 'Schedule follow-up visit', checked: false },
    ],
    'monitoring': [
      { id: 1, text: 'Take moisture readings at all locations', checked: false },
      { id: 2, text: 'Record readings on monitoring log', checked: false },
      { id: 3, text: 'Check equipment operation', checked: false },
      { id: 4, text: 'Document conditions with photos', checked: false },
    ],
  };

  const maxHoursPerCrew = 8.0;
  const dayStartHour = 8; // 8:00 AM

  // Initialize expanded state for all crews
  useEffect(() => {
    const expanded = {};
    initialCrews.forEach(crew => {
      expanded[crew.id] = true;
    });
    setExpandedCrews(expanded);
  }, []);

  // Load jobs from database
  useEffect(() => {
    const loadJobs = async () => {
      setLoadingJobs(true);
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('id, job_number, customer_name, property_address')
          .limit(100);
        
        if (!error && data) {
          setJobsDatabase(data);
        }
      } catch (err) {
        console.log('Could not load jobs from database:', err);
      }
      setLoadingJobs(false);
    };
    loadJobs();
  }, []);

  // Helper to create checklist from job type
  const createChecklist = (jobType) => {
    const template = defaultChecklists[jobType];
    if (!template) return [];
    return template.map(item => ({ ...item, checked: false }));
  };

  // Create a new empty job
  const createEmptyJob = (customStartTime = null) => ({
    id: Date.now() + Math.random(),
    jobType: '',
    hours: 0,
    jobNumber: '',
    customer: '',
    address: '',
    checklist: [],
    customStartTime: customStartTime // null = auto-calculate, or "HH:MM" in 24h format
  });

  // Initialize schedule state with sequential jobs per crew
  const [schedule, setSchedule] = useState(() => {
    const initial = {};
    initialCrews.forEach(crew => {
      initial[crew.id] = [];
    });
    
    // Sample data - jobs as arrays (customStartTime: null = auto-calculate, or "HH:MM" for specific time)
    initial['alpha'] = [
      { id: 1, jobType: 'new-start', hours: 2.5, jobNumber: '26-0151-STC', customer: 'John Smith', address: '11 Willow St, Brentwood', checklist: createChecklist('new-start'), customStartTime: null },
      { id: 2, jobType: 'continue-service', hours: 1.5, jobNumber: '26-0148-WTR', customer: 'Jane Doe', address: '45 Oak Ave', checklist: createChecklist('continue-service'), customStartTime: null },
      { id: 3, jobType: 'demo', hours: 3.0, jobNumber: '26-0142-DEM', customer: 'Acme Corp', address: '100 Business Pkwy', checklist: createChecklist('demo'), customStartTime: '14:00' }, // Scheduled for 2 PM
    ];
    initial['bravo'] = [
      { id: 4, jobType: 'equipment-pickup', hours: 0.5, jobNumber: '26-0149-EQP', customer: 'Davis Property', address: '22 Maple Dr', checklist: createChecklist('equipment-pickup'), customStartTime: null },
    ];
    initial['charlie'] = [
      { id: 5, jobType: 'emergency', hours: 5.0, jobNumber: '26-0156-EMG', customer: 'Martinez Office', address: '500 Center St', checklist: createChecklist('emergency'), customStartTime: null },
      { id: 6, jobType: 'demo', hours: 3.0, jobNumber: '26-0153-DEM', customer: 'Brown Estate', address: '15 Lake View', checklist: createChecklist('demo'), customStartTime: null },
    ];
    initial['delta'] = [
      { id: 7, jobType: 'demo', hours: 3.0, jobNumber: '26-0150-DEM', customer: 'Taylor Residence', address: '77 Elm St', checklist: createChecklist('demo'), customStartTime: null },
      { id: 8, jobType: 'monitoring', hours: 0.8, jobNumber: '26-0147-MON', customer: 'Garcia Home', address: '33 River Rd', checklist: createChecklist('monitoring'), customStartTime: '13:00' }, // After lunch at 1 PM
    ];
    
    return initial;
  });

  // Unassigned jobs pool - jobs that need to be scheduled
  const [unassignedJobs, setUnassignedJobs] = useState([
    { id: 101, jobType: 'new-start', hours: 2.5, jobNumber: '26-0160-STC', customer: 'Williams Property', address: '55 Main St', zone: 'Zone 1', checklist: createChecklist('new-start') },
    { id: 102, jobType: 'continue-service', hours: 1.5, jobNumber: '26-0161-WTR', customer: 'Johnson Home', address: '123 Park Ave', zone: 'Zone 2', checklist: createChecklist('continue-service') },
    { id: 103, jobType: 'demo', hours: 3.0, jobNumber: '26-0162-DEM', customer: 'Metro Office', address: '400 Commerce Blvd', zone: 'Zone 3', checklist: createChecklist('demo') },
    { id: 104, jobType: 'equipment-pickup', hours: 0.5, jobNumber: '26-0163-EQP', customer: 'Rivera Residence', address: '78 Oak Lane', zone: 'Zone 1', checklist: createChecklist('equipment-pickup') },
    { id: 105, jobType: 'monitoring', hours: 0.8, jobNumber: '26-0164-MON', customer: 'Chen Property', address: '200 Harbor Dr', zone: 'Zone 4', checklist: createChecklist('monitoring') },
    { id: 106, jobType: 'new-start', hours: 2.5, jobNumber: '26-0165-STC', customer: 'Thompson LLC', address: '90 Industrial Way', zone: 'Zone 2', checklist: createChecklist('new-start') },
  ]);

  // Time utilities
  const formatTime = (hours) => {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  // Parse "HH:MM" 24h format to decimal hours
  const parseTimeToHours = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
  };

  // Format decimal hours to "HH:MM" 24h format for input
  const formatTimeForInput = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Get the start time in decimal hours for a job
  const getJobStartHours = (crewId, jobIndex) => {
    const jobs = schedule[crewId] || [];
    const job = jobs[jobIndex];
    
    // If this job has a custom start time, use it
    if (job?.customStartTime) {
      return parseTimeToHours(job.customStartTime);
    }
    
    // Otherwise, calculate from previous job's end time
    if (jobIndex === 0) {
      return dayStartHour;
    }
    
    // Find the previous job's end time
    const prevEndHours = getJobEndHours(crewId, jobIndex - 1);
    return prevEndHours;
  };

  // Get the end time in decimal hours for a job
  const getJobEndHours = (crewId, jobIndex) => {
    const jobs = schedule[crewId] || [];
    const job = jobs[jobIndex];
    const startHours = getJobStartHours(crewId, jobIndex);
    return startHours + (parseFloat(job?.hours) || 0);
  };

  const getJobStartTime = (crewId, jobIndex) => {
    return formatTime(getJobStartHours(crewId, jobIndex));
  };

  const getJobEndTime = (crewId, jobIndex) => {
    return formatTime(getJobEndHours(crewId, jobIndex));
  };

  // Check if there's a gap before this job
  const getGapBefore = (crewId, jobIndex) => {
    if (jobIndex === 0) return null;
    const jobs = schedule[crewId] || [];
    const job = jobs[jobIndex];
    if (!job?.customStartTime) return null;
    
    const prevEndHours = getJobEndHours(crewId, jobIndex - 1);
    const thisStartHours = parseTimeToHours(job.customStartTime);
    const gap = thisStartHours - prevEndHours;
    
    if (gap > 0.08) { // More than ~5 minutes gap
      return {
        duration: gap,
        formatted: gap >= 1 ? `${gap.toFixed(1)}h` : `${Math.round(gap * 60)}min`
      };
    }
    return null;
  };

  const formatDateShort = (date) => {
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const goToPreviousDay = () => setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; });
  const goToNextDay = () => setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; });
  const goToToday = () => setCurrentDate(new Date());
  const isToday = () => currentDate.toDateString() === new Date().toDateString();

  const toggleCrewExpanded = (crewId) => {
    setExpandedCrews(prev => ({ ...prev, [crewId]: !prev[crewId] }));
  };

  const expandAll = () => {
    const expanded = {};
    initialCrews.forEach(crew => { expanded[crew.id] = true; });
    setExpandedCrews(expanded);
  };

  const collapseAll = () => {
    const collapsed = {};
    initialCrews.forEach(crew => { collapsed[crew.id] = false; });
    setExpandedCrews(collapsed);
  };

  // Update a job field
  const updateJob = (crewId, jobIndex, field, value) => {
    setSchedule(prev => {
      const newSchedule = { ...prev };
      newSchedule[crewId] = [...newSchedule[crewId]];
      newSchedule[crewId][jobIndex] = { ...newSchedule[crewId][jobIndex], [field]: value };
      
      if (field === 'jobType') {
        const jobType = jobTypes.find(jt => jt.value === value);
        if (jobType) {
          newSchedule[crewId][jobIndex].hours = jobType.hours || 0;
          newSchedule[crewId][jobIndex].checklist = createChecklist(value);
        }
      }
      
      // Auto-fill from job database when job number is entered
      if (field === 'jobNumber' && value) {
        const matchedJob = jobsDatabase.find(j => 
          j.job_number?.toLowerCase().includes(value.toLowerCase())
        );
        if (matchedJob) {
          newSchedule[crewId][jobIndex].customer = matchedJob.customer_name || '';
          newSchedule[crewId][jobIndex].address = matchedJob.property_address || '';
        }
      }
      
      return newSchedule;
    });
  };

  // Add a new job to a crew
  const addJob = (crewId) => {
    setSchedule(prev => {
      const newSchedule = { ...prev };
      newSchedule[crewId] = [...newSchedule[crewId], createEmptyJob()];
      return newSchedule;
    });
  };

  // Remove a job from a crew (moves back to unassigned pool)
  const removeJob = (crewId, jobIndex) => {
    const job = schedule[crewId]?.[jobIndex];
    
    // Only move back to unassigned if it has actual job data
    if (job && job.jobType) {
      // Get the crew's zone to assign to the job
      const crew = initialCrews.find(c => c.id === crewId);
      
      // Add to unassigned pool
      setUnassignedJobs(prev => [...prev, {
        ...job,
        id: Date.now() + Math.random(), // New ID to avoid conflicts
        zone: job.zone || crew?.zone || 'Zone 1', // Preserve or inherit zone
        customStartTime: undefined // Clear custom time
      }]);
    }
    
    // Remove from schedule
    setSchedule(prev => {
      const newSchedule = { ...prev };
      newSchedule[crewId] = newSchedule[crewId].filter((_, i) => i !== jobIndex);
      return newSchedule;
    });
  };

  // Toggle a checklist item
  const toggleChecklistItem = (crewId, jobIndex, itemId) => {
    setSchedule(prev => {
      const newSchedule = { ...prev };
      newSchedule[crewId] = [...newSchedule[crewId]];
      newSchedule[crewId][jobIndex] = { ...newSchedule[crewId][jobIndex] };
      newSchedule[crewId][jobIndex].checklist = newSchedule[crewId][jobIndex].checklist.map(item =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
      return newSchedule;
    });
  };

  // Get checklist progress
  const getChecklistProgress = (checklist) => {
    if (!checklist || checklist.length === 0) return null;
    const completed = checklist.filter(item => item.checked).length;
    const total = checklist.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  // Open checklist modal
  const openChecklist = (e, crewId, jobIndex) => {
    e.stopPropagation();
    setChecklistModal({ open: true, crewId, jobIndex });
  };

  // Close checklist modal
  const closeChecklist = () => {
    setChecklistModal({ open: false, crewId: null, jobIndex: null });
  };

  const calculateCrewTotals = (crewId) => {
    const jobs = schedule[crewId] || [];
    let totalHours = 0;
    jobs.forEach(job => {
      totalHours += parseFloat(job.hours) || 0;
    });
    const jobCount = jobs.filter(j => j.jobType).length;
    const available = maxHoursPerCrew - totalHours;
    
    let status = 'OPEN';
    let statusClass = 'status-open';
    if (available <= 0) { status = 'FULL'; statusClass = 'status-full'; }
    else if (available < 3) { status = 'LIMITED'; statusClass = 'status-limited'; }
    
    return { totalHours: totalHours.toFixed(1), available: available.toFixed(1), status, statusClass, jobCount };
  };

  // Get crew recommendations for an unassigned job
  const getCrewRecommendations = (job) => {
    const recommendations = initialCrews.map(crew => {
      const totals = calculateCrewTotals(crew.id);
      const availableHours = parseFloat(totals.available);
      const jobHours = parseFloat(job.hours) || 0;
      
      // Calculate score
      let score = 0;
      let reasons = [];
      
      // Zone match (highest priority)
      if (crew.zone === job.zone) {
        score += 50;
        reasons.push('Zone match');
      }
      
      // Capacity check
      if (availableHours >= jobHours) {
        score += 30;
        reasons.push(`${availableHours}h available`);
      } else {
        score -= 100; // Penalize if not enough capacity
        reasons.push('No capacity');
      }
      
      // Prefer crews with more availability (for efficiency)
      score += Math.min(availableHours * 2, 20);
      
      return {
        crew,
        score,
        reasons,
        canFit: availableHours >= jobHours,
        availableHours
      };
    });
    
    // Sort by score descending
    return recommendations.sort((a, b) => b.score - a.score);
  };

  // Get the best crew for a job
  const getBestCrew = (job) => {
    const recommendations = getCrewRecommendations(job);
    const best = recommendations.find(r => r.canFit);
    return best || recommendations[0];
  };

  // Assign an unassigned job to a crew
  const assignJobToCrew = (job, crewId) => {
    // Add to crew's schedule
    setSchedule(prev => {
      const newSchedule = { ...prev };
      newSchedule[crewId] = [...newSchedule[crewId], {
        ...job,
        customStartTime: null
      }];
      return newSchedule;
    });
    
    // Remove from unassigned
    setUnassignedJobs(prev => prev.filter(j => j.id !== job.id));
  };

  // Auto-assign all unassigned jobs
  const autoAssignAll = () => {
    // Process jobs one by one, recalculating after each assignment
    let remainingJobs = [...unassignedJobs];
    let newSchedule = { ...schedule };
    
    // Sort jobs by priority (emergencies first, then by hours descending)
    remainingJobs.sort((a, b) => {
      if (a.jobType === 'emergency' && b.jobType !== 'emergency') return -1;
      if (b.jobType === 'emergency' && a.jobType !== 'emergency') return 1;
      return (b.hours || 0) - (a.hours || 0);
    });
    
    const assigned = [];
    const unassigned = [];
    
    remainingJobs.forEach(job => {
      // Find best crew based on current state
      let bestCrew = null;
      let bestScore = -Infinity;
      
      initialCrews.forEach(crew => {
        const jobs = newSchedule[crew.id] || [];
        let totalHours = 0;
        jobs.forEach(j => { totalHours += parseFloat(j.hours) || 0; });
        const availableHours = maxHoursPerCrew - totalHours;
        
        if (availableHours >= (job.hours || 0)) {
          let score = availableHours * 2;
          if (crew.zone === job.zone) score += 50;
          if (score > bestScore) {
            bestScore = score;
            bestCrew = crew;
          }
        }
      });
      
      if (bestCrew) {
        newSchedule[bestCrew.id] = [...newSchedule[bestCrew.id], { ...job, customStartTime: null }];
        assigned.push(job);
      } else {
        unassigned.push(job);
      }
    });
    
    setSchedule(newSchedule);
    setUnassignedJobs(unassigned);
    
    if (assigned.length > 0) {
      alert(`Assigned ${assigned.length} job(s). ${unassigned.length} job(s) could not be assigned (no capacity).`);
    }
  };

  // Summary stats
  const summaryStats = useMemo(() => {
    let totalJobs = 0;
    let openCrews = 0;
    let limitedCrews = 0;
    let fullCrews = 0;

    initialCrews.forEach(crew => {
      const totals = calculateCrewTotals(crew.id);
      totalJobs += totals.jobCount;
      if (totals.status === 'OPEN') openCrews++;
      else if (totals.status === 'LIMITED') limitedCrews++;
      else if (totals.status === 'FULL') fullCrews++;
    });

    return { totalJobs, openCrews, limitedCrews, fullCrews };
  }, [schedule]);

  // Filter crews based on search and filters
  const filteredCrews = useMemo(() => {
    return initialCrews.filter(crew => {
      if (filterZone && crew.zone !== filterZone) return false;
      
      const jobs = schedule[crew.id] || [];
      let hasMatch = !searchTerm && !filterJobType;
      
      if (searchTerm || filterJobType) {
        jobs.forEach(job => {
          if (job.jobType) {
            const matchesSearch = !searchTerm || 
              job.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              job.jobNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              job.address?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesJobType = !filterJobType || job.jobType === filterJobType;
            if (matchesSearch && matchesJobType) hasMatch = true;
          }
        });
      }
      
      return hasMatch;
    });
  }, [schedule, searchTerm, filterZone, filterJobType]);

  // Drag and drop handlers
  const handleDragStart = (e, crewId, jobIndex) => {
    const job = schedule[crewId]?.[jobIndex];
    if (!job?.jobType) return;
    setDraggedJob(job);
    setDragSource({ crewId, jobIndex });
    setDraggedUnassigned(null);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drag start for unassigned jobs
  const handleUnassignedDragStart = (e, job) => {
    setDraggedUnassigned(job);
    setDraggedJob(null);
    setDragSource(null);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => { 
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move'; 
  };

  const handleDragEnter = (crewId, jobIndex) => { 
    if (draggedJob || draggedUnassigned) setDragOverTarget({ crewId, jobIndex }); 
  };

  const handleDragLeave = () => setDragOverTarget(null);

  const handleDrop = (e, targetCrewId, targetIndex) => {
    e.preventDefault();
    
    // Handle drop from unassigned panel
    if (draggedUnassigned) {
      setSchedule(prev => {
        const newSchedule = { ...prev };
        const targetJobs = [...newSchedule[targetCrewId]];
        targetJobs.splice(targetIndex, 0, { ...draggedUnassigned, customStartTime: null });
        newSchedule[targetCrewId] = targetJobs;
        return newSchedule;
      });
      setUnassignedJobs(prev => prev.filter(j => j.id !== draggedUnassigned.id));
      setDraggedUnassigned(null);
      setDragOverTarget(null);
      return;
    }
    
    // Handle regular job reorder/move
    if (!draggedJob || !dragSource) return;
    
    const { crewId: sourceCrewId, jobIndex: sourceIndex } = dragSource;

    setSchedule(prev => {
      const newSchedule = { ...prev };
      
      if (sourceCrewId === targetCrewId) {
        // Reorder within same crew
        const jobs = [...newSchedule[sourceCrewId]];
        const [removed] = jobs.splice(sourceIndex, 1);
        jobs.splice(targetIndex, 0, removed);
        newSchedule[sourceCrewId] = jobs;
      } else {
        // Move between crews
        const sourceJobs = [...newSchedule[sourceCrewId]];
        const targetJobs = [...newSchedule[targetCrewId]];
        const [removed] = sourceJobs.splice(sourceIndex, 1);
        targetJobs.splice(targetIndex, 0, removed);
        newSchedule[sourceCrewId] = sourceJobs;
        newSchedule[targetCrewId] = targetJobs;
      }
      
      return newSchedule;
    });

    setDraggedJob(null);
    setDragSource(null);
    setDragOverTarget(null);
  };

  // Handle drop on crew header (append to end)
  const handleDropOnCrew = (e, crewId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedUnassigned) {
      assignJobToCrew(draggedUnassigned, crewId);
      setDraggedUnassigned(null);
      setDragOverTarget(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedJob(null);
    setDragSource(null);
    setDragOverTarget(null);
    setDraggedUnassigned(null);
  };

  // Map view data
  const scheduledJobs = useMemo(() => {
    const jobs = [];
    initialCrews.forEach(crew => {
      (schedule[crew.id] || []).forEach((job, index) => {
        if (job.jobType && job.address) {
          jobs.push({
            id: `${crew.id}-${index}`,
            crew: crew.name,
            crewColor: crew.color,
            zone: crew.zone,
            startTime: getJobStartTime(crew.id, index),
            jobType: jobTypes.find(jt => jt.value === job.jobType)?.label || job.jobType,
            customer: job.customer,
            address: job.address,
            jobNumber: job.jobNumber,
            lat: defaultCenter.lat + (Math.random() - 0.5) * 0.1,
            lng: defaultCenter.lng + (Math.random() - 0.5) * 0.1,
          });
        }
      });
    });
    return jobs;
  }, [schedule]);

  const handlePrint = () => window.print();

  const handleExport = () => {
    let csvContent = `DISPATCH BOARD - ${formatDateShort(currentDate)}\n\n`;
    csvContent += 'Crew,Zone,Order,Start Time,End Time,Job Type,Hours,Job Number,Customer,Address,Checklist\n';
    
    initialCrews.forEach(crew => {
      const jobs = schedule[crew.id] || [];
      jobs.forEach((job, index) => {
        if (job.jobType) {
          const jobTypeLabel = jobTypes.find(jt => jt.value === job.jobType)?.label || '';
          const progress = getChecklistProgress(job.checklist);
          const checklistStatus = progress ? `${progress.completed}/${progress.total}` : '';
          csvContent += `"${crew.name}","${crew.zone}","${index + 1}","${getJobStartTime(crew.id, index)}","${getJobEndTime(crew.id, index)}","${jobTypeLabel}","${job.hours}","${job.jobNumber || ''}","${job.customer || ''}","${job.address || ''}","${checklistStatus}"\n`;
        }
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dispatch_board_${formatDateShort(currentDate).replace(/\//g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container dispatch-page">
      {/* Header */}
      <div className="dispatch-board-header">
        <div className="header-top">
          <h1>DISPATCH BOARD</h1>
          <div className="header-actions">
            <div className="view-toggle">
              <button className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>Table</button>
              <button className={`toggle-btn ${viewMode === 'map' ? 'active' : ''}`} onClick={() => setViewMode('map')}>Map</button>
            </div>
            <button className="btn-primary" onClick={handlePrint}>Print</button>
            <button className="btn-secondary" onClick={handleExport}>Export</button>
          </div>
        </div>

        {/* Summary Stats Bar */}
        <div className="summary-bar">
          <div className="summary-stat">
            <span className="stat-value">{summaryStats.totalJobs}</span>
            <span className="stat-label">Jobs Today</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-stat status-open">
            <span className="stat-value">{summaryStats.openCrews}</span>
            <span className="stat-label">Open</span>
          </div>
          <div className="summary-stat status-limited">
            <span className="stat-value">{summaryStats.limitedCrews}</span>
            <span className="stat-label">Limited</span>
          </div>
          <div className="summary-stat status-full">
            <span className="stat-value">{summaryStats.fullCrews}</span>
            <span className="stat-label">Full</span>
          </div>
          <div className="summary-divider"></div>
          <div className="date-nav">
            <span className="date-label">DATE:</span>
            <span className="date-value">{formatDateShort(currentDate)}</span>
            <button className="nav-btn" onClick={goToPreviousDay}>‹</button>
            <button className={`nav-btn today-btn ${isToday() ? 'is-today' : ''}`} onClick={goToToday}>Today</button>
            <button className="nav-btn" onClick={goToNextDay}>›</button>
          </div>
        </div>

        {/* Filters and Controls */}
        {viewMode === 'table' && (
          <div className="filters-bar">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search customer, job #, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>
              )}
            </div>
            <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)} className="filter-select">
              <option value="">All Zones</option>
              {zones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
            <select value={filterJobType} onChange={(e) => setFilterJobType(e.target.value)} className="filter-select">
              <option value="">All Statuses</option>
              {jobTypes.filter(jt => jt.value).map(jt => <option key={jt.value} value={jt.value}>{jt.label}</option>)}
            </select>
            <div className="expand-buttons">
              <button onClick={expandAll} className="text-btn">Expand All</button>
              <button onClick={collapseAll} className="text-btn">Collapse All</button>
            </div>
          </div>
        )}
      </div>

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="dispatch-layout">
          {/* Unassigned Jobs Panel */}
          {showUnassigned && (
            <div className="unassigned-panel">
              <div className="unassigned-header">
                <h3>Unassigned Jobs</h3>
                <span className="unassigned-count">{unassignedJobs.length}</span>
                <button 
                  className="auto-assign-btn"
                  onClick={autoAssignAll}
                  disabled={unassignedJobs.length === 0}
                  title="Auto-assign all jobs based on zone and capacity"
                >
                  Auto-Assign
                </button>
                <button 
                  className="collapse-panel-btn"
                  onClick={() => setShowUnassigned(false)}
                  title="Hide panel"
                >
                  ‹
                </button>
              </div>
              
              {unassignedJobs.length === 0 ? (
                <div className="no-unassigned">
                  <span>✓</span>
                  <p>All jobs assigned!</p>
                </div>
              ) : (
                <div className="unassigned-list">
                  {unassignedJobs.map(job => {
                    const bestRec = getBestCrew(job);
                    const jobTypeInfo = jobTypes.find(jt => jt.value === job.jobType);
                    
                    return (
                      <div
                        key={job.id}
                        className={`unassigned-job ${draggedUnassigned?.id === job.id ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => handleUnassignedDragStart(e, job)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="unassigned-job-header">
                          <span className="job-type-badge">{jobTypeInfo?.label}</span>
                          <span className="job-hours">{job.hours}h</span>
                        </div>
                        <div className="unassigned-job-number">{job.jobNumber}</div>
                        <div className="unassigned-job-customer">{job.customer}</div>
                        <div className="unassigned-job-address">{job.address}</div>
                        <div className="unassigned-job-zone">
                          <span className="zone-tag">{job.zone}</span>
                        </div>
                        <div className="unassigned-job-recommendation">
                          {bestRec.canFit ? (
                            <>
                              <span className="rec-label">Best:</span>
                              <span 
                                className="rec-crew"
                                style={{ color: bestRec.crew.color }}
                              >
                                {bestRec.crew.name}
                              </span>
                              <span className="rec-reasons">
                                ({bestRec.reasons.join(', ')})
                              </span>
                              <button
                                className="assign-btn"
                                onClick={() => assignJobToCrew(job, bestRec.crew.id)}
                                title={`Assign to ${bestRec.crew.name}`}
                              >
                                Assign
                              </button>
                            </>
                          ) : (
                            <span className="no-capacity">No crew has capacity</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* Show panel button when hidden */}
          {!showUnassigned && (
            <button 
              className="show-unassigned-btn"
              onClick={() => setShowUnassigned(true)}
            >
              {unassignedJobs.length > 0 && (
                <span className="unassigned-badge">{unassignedJobs.length}</span>
              )}
              {unassignedJobs.length > 0 ? 'Unassigned' : 'Show Panel'}
            </button>
          )}
          
          <div className="dispatch-table-container">
          <table className="dispatch-table">
            <thead>
              <tr>
                <th className="col-expand"></th>
                <th className="col-crew">Crew</th>
                <th className="col-zone">Zone</th>
                <th className="col-order">#</th>
                <th className="col-time">Time</th>
                <th className="col-jobtype">Job Status</th>
                <th className="col-hours">Hrs</th>
                <th className="col-jobnumber">Job Number</th>
                <th className="col-customer">Customer</th>
                <th className="col-address">Address</th>
                <th className="col-checklist">Checklist</th>
                <th className="col-capacity">Capacity</th>
                <th className="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {filteredCrews.map(crew => {
                const totals = calculateCrewTotals(crew.id);
                const isExpanded = expandedCrews[crew.id];
                const jobs = schedule[crew.id] || [];

                return (
                  <React.Fragment key={crew.id}>
                    {/* Crew Header Row */}
                    <tr 
                      className={`crew-header-row ${totals.statusClass} ${draggedUnassigned ? 'drop-zone' : ''}`} 
                      onClick={() => toggleCrewExpanded(crew.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnCrew(e, crew.id)}
                    >
                      <td className="col-expand">
                        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
                      </td>
                      <td className="col-crew">
                        <span className="crew-color-dot" style={{ backgroundColor: crew.color }}></span>
                        <span className="crew-name">{crew.name}</span>
                        <span className="crew-members">{crew.members.join(', ')}</span>
                      </td>
                      <td className="col-zone">{crew.zone}</td>
                      <td className="col-order"></td>
                      <td className="col-time crew-summary">
                        {totals.jobCount} job{totals.jobCount !== 1 ? 's' : ''} • Starts {crew.startTime}
                      </td>
                      <td colSpan="5"></td>
                      <td className="col-checklist"></td>
                      <td className="col-capacity">
                        <div className={`capacity-indicator ${totals.statusClass}`}>
                          <div className="capacity-bar">
                            <div 
                              className="capacity-fill" 
                              style={{ width: `${Math.min((parseFloat(totals.totalHours) / maxHoursPerCrew) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <div className="capacity-info">
                            <span className="capacity-hours">{totals.totalHours}h / {maxHoursPerCrew}h</span>
                            <span className={`capacity-badge ${totals.statusClass}`}>{totals.status}</span>
                          </div>
                        </div>
                      </td>
                      <td className="col-actions"></td>
                    </tr>

                    {/* Job Rows */}
                    {isExpanded && jobs.map((job, jobIndex) => {
                      const isDropTarget = dragOverTarget?.crewId === crew.id && dragOverTarget?.jobIndex === jobIndex;
                      const isDragSource = dragSource?.crewId === crew.id && dragSource?.jobIndex === jobIndex;

                      return (
                        <tr 
                          key={job.id || jobIndex}
                          className={`job-row ${totals.statusClass} ${isDropTarget ? 'drop-target' : ''} ${isDragSource ? 'drag-source' : ''} ${job.jobType ? 'has-job' : 'empty-job'}`}
                          draggable={!!job.jobType}
                          onDragStart={(e) => handleDragStart(e, crew.id, jobIndex)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDragEnter={() => handleDragEnter(crew.id, jobIndex)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, crew.id, jobIndex)}
                        >
                          <td className="col-expand">
                            {job.jobType && <span className="drag-handle">⋮⋮</span>}
                          </td>
                          <td className="col-crew"></td>
                          <td className="col-zone"></td>
                          <td className="col-order">
                            <span className="job-order">{jobIndex + 1}</span>
                          </td>
                          <td className="col-time">
                            {(() => {
                              const gap = getGapBefore(crew.id, jobIndex);
                              const hasCustomTime = !!job.customStartTime;
                              return (
                                <div className="time-cell">
                                  {gap && (
                                    <div className="time-gap">
                                      <span className="gap-line"></span>
                                      <span className="gap-label">{gap.formatted} gap</span>
                                    </div>
                                  )}
                                  <div className="time-range">
                                    <input
                                      type="time"
                                      value={job.customStartTime || formatTimeForInput(getJobStartHours(crew.id, jobIndex))}
                                      onChange={(e) => updateJob(crew.id, jobIndex, 'customStartTime', e.target.value || null)}
                                      className={`time-input ${hasCustomTime ? 'custom-time' : ''}`}
                                      onClick={(e) => e.stopPropagation()}
                                      title={hasCustomTime ? 'Custom start time (click × to auto-calculate)' : 'Click to set specific start time'}
                                    />
                                    {hasCustomTime && (
                                      <button
                                        className="clear-time-btn"
                                        onClick={(e) => { e.stopPropagation(); updateJob(crew.id, jobIndex, 'customStartTime', null); }}
                                        title="Clear custom time (auto-calculate)"
                                      >
                                        ×
                                      </button>
                                    )}
                                    {job.jobType && (
                                      <>
                                        <span className="time-separator">→</span>
                                        <span className="end-time">{getJobEndTime(crew.id, jobIndex)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="col-jobtype">
                            <select
                              value={job.jobType || ''}
                              onChange={(e) => updateJob(crew.id, jobIndex, 'jobType', e.target.value)}
                              className="table-select"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {jobTypes.map(jt => <option key={jt.value} value={jt.value}>{jt.label}</option>)}
                            </select>
                          </td>
                          <td className="col-hours">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={job.hours || ''}
                              onChange={(e) => updateJob(crew.id, jobIndex, 'hours', parseFloat(e.target.value) || 0)}
                              className="table-input hours-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="col-jobnumber">
                            {job.jobNumber ? (
                              <a 
                                href={`/job-files?job=${job.jobNumber}`} 
                                className="job-link"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {job.jobNumber}
                              </a>
                            ) : (
                              <input
                                type="text"
                                value={job.jobNumber || ''}
                                onChange={(e) => updateJob(crew.id, jobIndex, 'jobNumber', e.target.value)}
                                className="table-input"
                                placeholder="Job #"
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </td>
                          <td className="col-customer">
                            <input
                              type="text"
                              value={job.customer || ''}
                              onChange={(e) => updateJob(crew.id, jobIndex, 'customer', e.target.value)}
                              className="table-input"
                              placeholder="Customer"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="col-address">
                            <input
                              type="text"
                              value={job.address || ''}
                              onChange={(e) => updateJob(crew.id, jobIndex, 'address', e.target.value)}
                              className="table-input"
                              placeholder="Address"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="col-checklist">
                            {job.jobType && (
                              <button
                                className={`checklist-btn ${getChecklistProgress(job.checklist)?.percentage === 100 ? 'complete' : ''}`}
                                onClick={(e) => openChecklist(e, crew.id, jobIndex)}
                              >
                                {(() => {
                                  const progress = getChecklistProgress(job.checklist);
                                  if (!progress) return '—';
                                  return (
                                    <>
                                      <span className="checklist-icon">☐</span>
                                      <span className="checklist-progress">{progress.completed}/{progress.total}</span>
                                    </>
                                  );
                                })()}
                              </button>
                            )}
                          </td>
                          <td className="col-capacity"></td>
                          <td className="col-actions">
                            <button 
                              className="remove-job-btn"
                              onClick={(e) => { e.stopPropagation(); removeJob(crew.id, jobIndex); }}
                              title="Remove job"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Add Job Row */}
                    {isExpanded && (
                      <tr className="add-job-row">
                        <td colSpan="13">
                          <button 
                            className="add-job-btn"
                            onClick={(e) => { e.stopPropagation(); addJob(crew.id); }}
                          >
                            + Add Job
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        /* Map View */
        <div className="dispatch-map-container">
          {!isLoaded ? (
            <div className="map-loading">Loading map...</div>
          ) : (
            <>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={defaultCenter}
                zoom={11}
                options={{
                  styles: [
                    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                  ],
                }}
              >
                {scheduledJobs.map((job) => (
                  <Marker
                    key={job.id}
                    position={{ lat: job.lat, lng: job.lng }}
                    onClick={() => setSelectedMarker(job)}
                    icon={{
                      path: window.google?.maps?.SymbolPath?.CIRCLE,
                      scale: 10,
                      fillColor: job.crewColor,
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 2,
                    }}
                  />
                ))}
                {selectedMarker && (
                  <InfoWindow position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }} onCloseClick={() => setSelectedMarker(null)}>
                    <div className="map-info-window">
                      <h3>{selectedMarker.customer || 'No Customer'}</h3>
                      <p><strong>Crew:</strong> {selectedMarker.crew}</p>
                      <p><strong>Time:</strong> {selectedMarker.startTime}</p>
                      <p><strong>Job:</strong> {selectedMarker.jobType}</p>
                      <p><strong>Address:</strong> {selectedMarker.address}</p>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
              <div className="map-legend">
                <h4>Crews</h4>
                {initialCrews.map(crew => (
                  <div key={crew.id} className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: crew.color }}></span>
                    <span>{crew.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="dispatch-instructions">
        <strong>Tips:</strong> Drag jobs to reorder • Start times auto-calculate based on duration • Click + Add Job to schedule more • Click checklist to track progress
      </div>

      {/* Checklist Modal */}
      {checklistModal.open && (
        <div className="checklist-modal-overlay">
          <div className="checklist-modal">
            {(() => {
              const { crewId, jobIndex } = checklistModal;
              const job = schedule[crewId]?.[jobIndex];
              const crew = initialCrews.find(c => c.id === crewId);
              const jobTypeLabel = jobTypes.find(jt => jt.value === job?.jobType)?.label || 'Job';
              const progress = getChecklistProgress(job?.checklist);

              return (
                <>
                  <div className="checklist-modal-header">
                    <div className="checklist-modal-title">
                      <h2>{jobTypeLabel} Checklist</h2>
                      <p className="checklist-job-info">
                        <span className="crew-badge" style={{ backgroundColor: crew?.color }}>{crew?.name}</span>
                        {job?.customer && <span>{job.customer}</span>}
                        <span className="time-badge">{getJobStartTime(crewId, jobIndex)}</span>
                      </p>
                    </div>
                    <button className="checklist-close-btn" onClick={closeChecklist}>×</button>
                  </div>

                  {progress && (
                    <div className="checklist-progress-bar">
                      <div className="progress-track">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${progress.percentage}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        {progress.completed} of {progress.total} complete ({progress.percentage}%)
                      </span>
                    </div>
                  )}

                  <div className="checklist-items">
                    {job?.checklist?.map((item) => (
                      <label 
                        key={item.id} 
                        className={`checklist-item ${item.checked ? 'checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleChecklistItem(crewId, jobIndex, item.id)}
                        />
                        <span className="checkmark">✓</span>
                        <span className="item-text">{item.text}</span>
                      </label>
                    ))}
                  </div>

                  <div className="checklist-modal-footer">
                    <button className="btn-secondary" onClick={closeChecklist}>Close</button>
                    {progress?.percentage === 100 && (
                      <span className="completion-badge">✓ All tasks complete!</span>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default DispatchAndScheduling;
