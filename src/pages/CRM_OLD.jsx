import React, { useEffect, useMemo, useState, useCallback } from 'react';
import customerService from '../services/customerService';
import SalesFunnel from '../components/SalesFunnel';
import { jsPDF } from 'jspdf';
import './Page.css';
import './CRM.css';

const decodeNotesMeta = (notesValue) => {
  if (!notesValue) {
    return {
      company: '',
      status: 'lead',
      source: 'website',
      notes: '',
      last_touch_date: '',
      last_touch_type: ''
    };
  }

  try {
    const parsed = JSON.parse(notesValue);
    if (parsed && typeof parsed === 'object' && 'status' in parsed && 'source' in parsed) {
      return {
        company: parsed.company || '',
        status: parsed.status || 'lead',
        source: parsed.source || 'website',
        notes: parsed.notes || '',
        last_touch_date: parsed.last_touch_date || '',
        last_touch_type: parsed.last_touch_type || ''
      };
    }
  } catch (error) {
    // fall through to treat as plain notes text
  }

  return {
    company: '',
    status: 'lead',
    source: 'website',
    notes: notesValue || '',
    last_touch_date: '',
    last_touch_type: ''
  };
};

const encodeNotesMeta = ({ company, status, source, notes, last_touch_date, last_touch_type }) => JSON.stringify({
  company: company || '',
  status: status || 'lead',
  source: source || 'website',
  notes: notes || '',
  last_touch_date: last_touch_date || '',
  last_touch_type: last_touch_type || ''
});

const normalizeCustomer = (customer) => {
  const meta = decodeNotesMeta(customer.notes);

  // Build address from billing fields
  const addressParts = [
    customer.billing_address1,
    customer.billing_address2,
    customer.billing_city,
    customer.billing_state,
    customer.billing_postal
  ].filter(Boolean);
  const address = addressParts.length > 0 ? addressParts.join(', ') : '';

  return {
    id: customer.id,
    name: customer.name || '',
    company: customer.billing_contact || meta.company || '',
    email: customer.email || '',
    phone: customer.phone || '',
    address,
    billing_address1: customer.billing_address1 || '',
    billing_address2: customer.billing_address2 || '',
    billing_city: customer.billing_city || '',
    billing_state: customer.billing_state || '',
    billing_postal: customer.billing_postal || '',
    billing_country: customer.billing_country || 'USA',
    status: meta.status,
    source: meta.source,
    notes: meta.notes,
    last_touch_date: meta.last_touch_date,
    last_touch_type: meta.last_touch_type,
    // New CRM fields
    date_closed_committed: customer.date_closed_committed || '',
    company_name: customer.company_name || '',
    contact_name: customer.contact_name || '',
    onsite_address: customer.onsite_address || '',
    referral_date: customer.referral_date || '',
    last_activity_date: customer.last_activity_date || '',
    last_face_to_face_date: customer.last_face_to_face_date || '',
    sales_person: customer.sales_person || '',
    ltmCost: customer.ltm_cost || customer.ltmCost || 0
  };
};

function CRM() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [activeView, setActiveView] = useState('table'); // 'table', 'funnel', 'playbook', or 'topTargets'
  const [selectedSalesRep, setSelectedSalesRep] = useState('all'); // Sales rep filter for funnel
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

  const formatPhoneNumber = (value) => {
    if (!value) return '';
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');
    // Format as XXX-XXX-XXXX
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    // Return cleaned input if it doesn't match expected length
    return cleaned;
  };

  const formatLastTouch = (date, type) => {
    if (!date && !type) return 'N/A';
    const formattedDate = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const formattedType = type ? type.charAt(0).toUpperCase() + type.slice(1) : '';
    if (formattedDate && formattedType) return `${formattedType} - ${formattedDate}`;
    return formattedDate || formattedType || 'N/A';
  };

  // Calculate days between dates
  const calculateDaysSince = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    billing_address1: '',
    billing_address2: '',
    billing_city: '',
    billing_state: '',
    billing_postal: '',
    billing_country: 'USA',
    status: 'lead',
    source: 'website',
    notes: '',
    last_touch_date: '',
    last_touch_type: '',
    // New CRM fields
    date_closed_committed: '',
    company_name: '',
    contact_name: '',
    onsite_address: '',
    referral_date: '',
    last_activity_date: '',
    last_face_to_face_date: '',
    sales_person: ''
  });

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await customerService.getAll();
      if (!data || !Array.isArray(data)) {
        console.error('Invalid data returned from customerService.getAll():', data);
        setError('Failed to load customers: Invalid data format');
        setCustomers([]);
        return;
      }
      const normalizedCustomers = data.map(normalizeCustomer);
      
      // Fetch jobs for each customer to calculate metrics
      const customersWithMetrics = await Promise.all(
        normalizedCustomers.map(async (customer) => {
          try {
            const jobs = await customerService.getWithJobs(customer.id);
            const customerJobs = jobs?.jobs || [];
            
            // Calculate Jobs Referred Count
            const jobsReferredCount = customerJobs.length;
            
            // Calculate Job Revenue (sum of estimate_value or estimate)
            const jobRevenue = customerJobs.reduce((sum, job) => {
              const revenue = job.estimate_value || job.estimate || 0;
              return sum + (typeof revenue === 'number' ? revenue : parseFloat(revenue) || 0);
            }, 0);
            
            // Calculate LTM Cost (sum of costs from jobs in last 12 months)
            // For now, using jobRevenue as placeholder - will need actual cost data from jobs
            const ltmCost = customer.ltm_cost || customer.ltmCost || 0;
            
            return {
              ...customer,
              jobsReferredCount,
              jobRevenue,
              ltmCost
            };
          } catch (err) {
            // If job fetch fails, set defaults
            return {
              ...customer,
              jobsReferredCount: 0,
              jobRevenue: 0
            };
          }
        })
      );
      
      setCustomers(customersWithMetrics);
    } catch (err) {
      console.error('Error loading customers:', err);
      setError(err.message || 'Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'phone' ? formatPhoneNumber(value) : value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      billing_address1: '',
      billing_address2: '',
      billing_city: '',
      billing_state: '',
      billing_postal: '',
      billing_country: 'USA',
      status: 'lead',
      source: 'website',
      notes: '',
      last_touch_date: '',
      last_touch_type: '',
      // New CRM fields
      date_closed_committed: '',
      company_name: '',
      contact_name: '',
      onsite_address: '',
      referral_date: '',
      last_activity_date: '',
      last_face_to_face_date: '',
      sales_person: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);

    const payload = {
      name: formData.name,
      billing_contact: formData.company,
      email: formData.email,
      phone: formData.phone,
      billing_address1: formData.billing_address1 || '',
      billing_address2: formData.billing_address2 || '',
      billing_city: formData.billing_city || '',
      billing_state: formData.billing_state || '',
      billing_postal: formData.billing_postal || '',
      billing_country: formData.billing_country || 'USA',
      notes: encodeNotesMeta(formData),
      // New CRM fields
      sales_person: formData.sales_person || '',
      date_closed_committed: formData.date_closed_committed || null,
      company_name: formData.company_name || '',
      contact_name: formData.contact_name || '',
      onsite_address: formData.onsite_address || '',
      referral_date: formData.referral_date || null,
      last_activity_date: formData.last_activity_date || null,
      last_face_to_face_date: formData.last_face_to_face_date || null
    };

    try {
      if (editingId) {
        const updated = await customerService.update(editingId, payload);
        setCustomers(prev => prev.map(customer => 
          customer.id === editingId 
            ? normalizeCustomer(updated)
            : customer
        ));
      } else {
        const created = await customerService.create(payload);
        setCustomers(prev => [...prev, normalizeCustomer(created)]);
      }

      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (customer) => {
    setFormData({
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: formatPhoneNumber(customer.phone),
      billing_address1: customer.billing_address1 || '',
      billing_address2: customer.billing_address2 || '',
      billing_city: customer.billing_city || '',
      billing_state: customer.billing_state || '',
      billing_postal: customer.billing_postal || '',
      billing_country: customer.billing_country || 'USA',
      status: customer.status,
      source: customer.source,
      notes: customer.notes,
      last_touch_date: customer.last_touch_date || '',
      last_touch_type: customer.last_touch_type || '',
      // New CRM fields
      date_closed_committed: customer.date_closed_committed || '',
      company_name: customer.company_name || '',
      contact_name: customer.contact_name || '',
      onsite_address: customer.onsite_address || '',
      referral_date: customer.referral_date || '',
      last_activity_date: customer.last_activity_date || '',
      last_face_to_face_date: customer.last_face_to_face_date || '',
      sales_person: customer.sales_person || ''
    });
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      setDeletingId(id);
      setError(null);
      try {
        await customerService.delete(id);
        setCustomers(prev => prev.filter(customer => customer.id !== id));
      } catch (err) {
        setError(err.message || 'Failed to delete customer');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleCancel = () => {
    resetForm();
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'active': return 'status-active';
      case 'lead': return 'status-lead';
      case 'inactive': return 'status-inactive';
      default: return '';
    }
  };

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

  const filteredCustomers = useMemo(() => customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (customer.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || customer.status === filterStatus;
    return matchesSearch && matchesStatus;
  }), [customers, filterStatus, searchTerm]);

  // Helper function to extract sales rep from customer notes or metadata
  const getSalesRep = useCallback((customer) => {
    // Check if sales rep is stored in notes metadata or as a field
    // For now, we'll use a simple approach - can be enhanced later
    const notesLower = (customer.notes || '').toLowerCase();
    if (notesLower.includes('sales rep: bri') || notesLower.includes('rep: bri')) return 'bri';
    if (notesLower.includes('sales rep: paige') || notesLower.includes('rep: paige')) return 'paige';
    if (notesLower.includes('sales rep: matt') || notesLower.includes('rep: matt')) return 'matt';
    if (notesLower.includes('sales rep: tony') || notesLower.includes('rep: tony')) return 'tony';
    // Default assignment based on customer ID for demo purposes
    // In production, you'd want a dedicated sales_rep field in the database
    if (customer.id) {
      const idNum = typeof customer.id === 'string' ? parseInt(customer.id.replace(/\D/g, '')) : customer.id;
      const repIndex = idNum % 4;
      const reps = ['bri', 'paige', 'matt', 'tony'];
      return reps[repIndex];
    }
    return 'bri'; // Default fallback
  }, []);

  // Group customers by sales rep and get top 10 targets per rep
  const topTargetsByRep = useMemo(() => {
    const salesReps = ['bri', 'paige', 'matt', 'tony'];
    const targetsByRep = {};

    salesReps.forEach(rep => {
      // Get customers for this rep
      const repCustomers = customers
        .filter(customer => getSalesRep(customer) === rep)
        .map(customer => ({
          ...customer,
          salesRep: rep
        }))
        // Sort by priority: active status, then by job revenue, then by date
        .sort((a, b) => {
          // Prioritize active customers
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          // Then by job revenue (if available)
          const revenueA = a.jobRevenue || 0;
          const revenueB = b.jobRevenue || 0;
          if (revenueB !== revenueA) return revenueB - revenueA;
          // Then by most recent activity (use a fallback date if not available)
          const dateA = a.last_activity_date ? new Date(a.last_activity_date) : new Date(0);
          const dateB = b.last_activity_date ? new Date(b.last_activity_date) : new Date(0);
          return dateB - dateA;
        })
        .slice(0, 10); // Top 10

      targetsByRep[rep] = repCustomers;
    });

    return targetsByRep;
  }, [customers, getSalesRep]);

  return (
    <div className="page-container crm-page">
      <div className="crm-header">
        <h1>Customer Relationship Management</h1>
      </div>

      {/* Search and Filter */}
      {/* Controls Section - Only show for table view */}
      {activeView === 'table' && (
        <div className="crm-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-box">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="lead">Leads</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      )}

      {error && (
        <div className="crm-error">
          <p>{error}</p>
          <button onClick={loadCustomers} disabled={loading}>
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="crm-loading">
          <p>Loading customers...</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="crm-action-buttons">
        <button className="action-btn action-btn-blue" onClick={() => setShowForm(true)}>
          <span className="btn-icon">👤</span>
          Add Customer
        </button>
        <button 
          className={`action-btn ${activeView === 'table' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveView('table')}
        >
          <span className="btn-icon">📋</span>
          CRM
        </button>
        <button 
          className={`action-btn ${activeView === 'funnel' ? 'action-btn-purple' : 'action-btn-gray'}`}
          onClick={() => setActiveView('funnel')}
        >
          <span className="btn-icon">📊</span>
          Sales Funnel
        </button>
        <button 
          className={`action-btn ${activeView === 'playbook' ? 'action-btn-orange' : 'action-btn-gray'}`}
          onClick={() => setActiveView('playbook')}
        >
          <span className="btn-icon">📋</span>
          Insight Meeting Playbook
        </button>
        <button 
          className={`action-btn ${activeView === 'topTargets' ? 'action-btn-yellow' : 'action-btn-gray'}`}
          onClick={() => setActiveView('topTargets')}
        >
          <span className="btn-icon">🎯</span>
          Top Targets
        </button>
      </div>

      {/* Customer Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button className="close-btn" onClick={handleCancel}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="customer-form">
              {/* Customer Information Section */}
              <div className="form-section-header">Customer Information</div>

              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address Line 1</label>
                <input
                  type="text"
                  name="billing_address1"
                  value={formData.billing_address1}
                  onChange={handleInputChange}
                  placeholder="Street address"
                />
              </div>

              <div className="form-group">
                <label>Address Line 2</label>
                <input
                  type="text"
                  name="billing_address2"
                  value={formData.billing_address2}
                  onChange={handleInputChange}
                  placeholder="Apt, suite, unit, etc. (optional)"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="billing_city"
                    value={formData.billing_city}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    name="billing_state"
                    value={formData.billing_state}
                    onChange={handleInputChange}
                    maxLength="2"
                    placeholder="CA"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Postal Code</label>
                  <input
                    type="text"
                    name="billing_postal"
                    value={formData.billing_postal}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    name="billing_country"
                    value={formData.billing_country}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="form-section-divider"></div>

              {/* CRM Data Points Section */}
              <div className="form-section-header">Sales CRM Data Points</div>

              <div className="form-row">
                <div className="form-group">
                  <label>Sales Person</label>
                  <select
                    name="sales_person"
                    value={formData.sales_person}
                    onChange={handleInputChange}
                  >
                    <option value="">Select sales person...</option>
                    <option value="Bri">Bri</option>
                    <option value="Paige">Paige</option>
                    <option value="Matt">Matt</option>
                    <option value="Tony">Tony</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date Closed / Committed</label>
                  <input
                    type="date"
                    name="date_closed_committed"
                    value={formData.date_closed_committed}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    placeholder="Company name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Contact Name</label>
                  <input
                    type="text"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleInputChange}
                    placeholder="Primary contact name"
                  />
                </div>
                <div className="form-group">
                  <label>Referral Date</label>
                  <input
                    type="date"
                    name="referral_date"
                    value={formData.referral_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Onsite Address</label>
                <input
                  type="text"
                  name="onsite_address"
                  value={formData.onsite_address}
                  onChange={handleInputChange}
                  placeholder="Onsite address (may differ from billing address)"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Last Activity Date</label>
                  <input
                    type="date"
                    name="last_activity_date"
                    value={formData.last_activity_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Last Face-to-Face Date</label>
                  <input
                    type="date"
                    name="last_face_to_face_date"
                    value={formData.last_face_to_face_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="form-section-divider"></div>

              {/* Updates Section */}
              <div className="form-section-header">Updates & Activity</div>

              <div className="form-row">
                <div className="form-group">
                  <label>Last Touch Date</label>
                  <input
                    type="date"
                    name="last_touch_date"
                    value={formData.last_touch_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Last Touch Type</label>
                  <select
                    name="last_touch_type"
                    value={formData.last_touch_type}
                    onChange={handleInputChange}
                  >
                    <option value="">Select type...</option>
                    <option value="call">Call</option>
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="lead">Lead</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Source</label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleInputChange}
                  >
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="phone">Phone</option>
                    <option value="email">Email</option>
                    <option value="social">Social Media</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Add any relevant notes about this customer..."
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer List */}
      {/* Table View */}
      {activeView === 'table' && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>Customers ({filteredCustomers.length})</h2>
          </div>

          {!loading && filteredCustomers.length === 0 ? (
            <div className="no-customers">
              <p>No customers found. {searchTerm && 'Try adjusting your search.'}</p>
            </div>
          ) : (
            <div className="customers-table-container">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Company<br />Name</th>
                  <th>Sales<br />Person</th>
                  <th>Contact<br />Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Date<br />Closed</th>
                  <th>Jobs<br />Referred</th>
                  <th>Job<br />Revenue</th>
                  <th>LTM<br />Cost $</th>
                  <th>Days Since<br />Referral</th>
                  <th>Days Since<br />Last Activity</th>
                  <th>Days Since<br />Last F2F</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(customer => {
                  const daysSinceReferral = customer.referral_date ? calculateDaysSince(customer.referral_date) : null;
                  const daysSinceActivity = customer.last_activity_date ? calculateDaysSince(customer.last_activity_date) : null;
                  const daysSinceF2F = customer.last_face_to_face_date ? calculateDaysSince(customer.last_face_to_face_date) : null;
                  
                  return (
                    <tr
                      key={customer.id}
                      onClick={() => handleEdit(customer)}
                      className="customer-row"
                    >
                      <td className="customer-name">{customer.company_name || customer.company || 'N/A'}</td>
                      <td>{customer.sales_person || 'N/A'}</td>
                      <td>{customer.contact_name || customer.name || 'N/A'}</td>
                      <td>
                        <a
                          href={`mailto:${customer.email}`}
                          className="email-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {customer.email}
                        </a>
                      </td>
                      <td>
                        <a
                          href={`tel:${customer.phone}`}
                          className="phone-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {formatPhoneNumber(customer.phone)}
                        </a>
                      </td>
                      <td>
                        {customer.date_closed_committed 
                          ? new Date(customer.date_closed_committed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'N/A'}
                      </td>
                      <td>{customer.jobsReferredCount || 0}</td>
                      <td>{formatCurrency(customer.jobRevenue || 0)}</td>
                      <td>{formatCurrency(customer.ltmCost || 0)}</td>
                      <td>{daysSinceReferral !== null ? `${daysSinceReferral} days` : 'N/A'}</td>
                      <td>{daysSinceActivity !== null ? `${daysSinceActivity} days` : 'N/A'}</td>
                      <td>{daysSinceF2F !== null ? `${daysSinceF2F} days` : 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(customer.status)}`}>
                          {customer.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Sales Funnel View */}
      {activeView === 'funnel' && (
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
          <SalesFunnel 
            layers={[
              { name: 'Target Identified', count: 0, color: '#f97316', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', percentage: 95 },
              { name: 'Insight Meeting Scheduled', count: 0, color: '#fb923c', gradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)', percentage: 80 },
              { name: 'Insight Meeting Completed', count: 0, color: '#fbbf24', gradient: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)', percentage: 70 },
              { name: 'Presentation to Client', count: 0, color: '#fde047', gradient: 'linear-gradient(135deg, #fde047 0%, #fbbf24 100%)', percentage: 60 },
              { name: 'Initial Commitment', count: 0, color: '#60a5fa', gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', percentage: 40 },
              { name: 'First Referral Received', count: 0, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', percentage: 25 },
              { name: 'Closed / First Job Reviewed', count: 0, color: '#1e40af', gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', percentage: 10 },
              { name: 'MSA Signed', count: 0, color: '#1e3a8a', gradient: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)', percentage: 5 }
            ]}
            salesRep={selectedSalesRep}
          />
        </div>
      )}

      {/* Top Targets View */}
      {activeView === 'topTargets' && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>Top Targets by Sales Rep</h2>
          </div>
          
          <div className="top-targets-table-container">
            <table className="top-targets-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Bri</th>
                  <th>Paige</th>
                  <th>Matt</th>
                  <th>Tony</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }, (_, index) => {
                  const rank = index + 1;
                  return (
                    <tr key={rank}>
                      <td className="rank-cell">{rank}</td>
                      {['bri', 'paige', 'matt', 'tony'].map(rep => {
                        const targets = topTargetsByRep[rep] || [];
                        const target = targets[index];
                        const hasTarget = !!target;
                        return (
                          <td 
                            key={rep}
                            className={`target-cell ${hasTarget ? 'target-cell-clickable' : ''}`}
                            onClick={() => hasTarget && setViewingCustomer(target)}
                            style={{ cursor: hasTarget ? 'pointer' : 'default' }}
                          >
                            {hasTarget ? (target.company_name || target.company || target.name) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insight Meeting Playbook View */}
      {activeView === 'playbook' && (
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
                  placeholder="Plan and strategy for initial commitment interaction"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => {
                  setPlaybookFormData({
                    contactName: '', contactTitle: '', contactEmail: '', contactPhone: '', contactCompany: '',
                    propertyAddress: '', propertyType: '', propertySize: '', propertyAge: '', numberOfBuildings: '', currentChallenges: '',
                    currentProcess: '', processChallenges: '',
                    currentProviders: '', providerSatisfaction: '', providerImprovements: '',
                    numberOfMaintenanceEngineers: '', lastTraining: '', equipment: '',
                    recentLosses: '', lastEvent: '', eventType24Months: [], outsourcingScale: '', protocolForCallout: '', eventsAnnually: '',
                    portfolioManagers: '', regionalManagers: '', propertyManagers: '', maintenanceSupervisors: '', directorEngineeringMaintenance: '',
                    projectedJobDate: '', interactionPlanStrategy: ''
                  });
                }}>
                  Clear Form
                </button>
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

      {/* Customer Detail Modal */}
      {viewingCustomer && (
        <div className="modal-overlay" onClick={() => setViewingCustomer(null)}>
          <div className="modal-content customer-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{viewingCustomer.name}</h2>
              <button className="close-btn" onClick={() => setViewingCustomer(null)}>×</button>
            </div>

            <div className="customer-detail-body">
              <div className="detail-section">
                <h3>Contact Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <strong>Name:</strong>
                    <span>{viewingCustomer.name}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Company:</strong>
                    <span>{viewingCustomer.company || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Email:</strong>
                    <span>
                      <a href={`mailto:${viewingCustomer.email}`} className="email-link">
                        {viewingCustomer.email}
                      </a>
                    </span>
                  </div>
                  <div className="detail-item">
                    <strong>Phone:</strong>
                    <span>
                      <a href={`tel:${viewingCustomer.phone}`} className="phone-link">
                        {formatPhoneNumber(viewingCustomer.phone)}
                      </a>
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Address</h3>
                <p>{viewingCustomer.address || 'No address provided'}</p>
              </div>

              <div className="detail-section">
                <h3>Status & Source</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <strong>Status:</strong>
                    <span className={`status-badge ${getStatusClass(viewingCustomer.status)}`}>
                      {viewingCustomer.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <strong>Source:</strong>
                    <span className="source-tag">{viewingCustomer.source}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Last Touch:</strong>
                    <span>{formatLastTouch(viewingCustomer.last_touch_date, viewingCustomer.last_touch_type)}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Sales CRM Data</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <strong>Date Closed/Committed:</strong>
                    <span>{viewingCustomer.date_closed_committed 
                      ? new Date(viewingCustomer.date_closed_committed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Company Name:</strong>
                    <span>{viewingCustomer.company_name || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Contact Name:</strong>
                    <span>{viewingCustomer.contact_name || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Onsite Address:</strong>
                    <span>{viewingCustomer.onsite_address || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Jobs Referred:</strong>
                    <span>{viewingCustomer.jobsReferredCount || 0}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Job Revenue:</strong>
                    <span>{formatCurrency(viewingCustomer.jobRevenue || 0)}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Days Since Referral:</strong>
                    <span>{viewingCustomer.referral_date 
                      ? `${calculateDaysSince(viewingCustomer.referral_date)} days`
                      : 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Days Since Last Activity:</strong>
                    <span>{viewingCustomer.last_activity_date 
                      ? `${calculateDaysSince(viewingCustomer.last_activity_date)} days`
                      : 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Days Since Last Face-to-Face:</strong>
                    <span>{viewingCustomer.last_face_to_face_date 
                      ? `${calculateDaysSince(viewingCustomer.last_face_to_face_date)} days`
                      : 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Notes</h3>
                <div className="notes-display">
                  {viewingCustomer.notes ? (
                    <p>{viewingCustomer.notes}</p>
                  ) : (
                    <p className="no-notes">No notes available for this customer.</p>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="btn-primary"
                  onClick={() => {
                    setViewingCustomer(null);
                    handleEdit(viewingCustomer);
                  }}
                >
                  Edit Customer
                </button>
                <button className="btn-secondary" onClick={() => setViewingCustomer(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default CRM;
