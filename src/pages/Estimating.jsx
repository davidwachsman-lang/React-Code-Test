import React, { useState, useEffect, useRef } from 'react';
import './Page.css';
import './Estimating.css';
import { estimateService } from '../services';

// Master Price List
const PRICE_LIST = {
  "Administration cost - accounting, JFC, office": { uom: "Each", price: 150.00 },
  "Content Manipulation - by hour - # of people times time": { uom: "HR", price: 55.00 },
  "Containment Barrier - plastic up to 6 mil & tape": { uom: "SF", price: 1.45 },
  "Zippers": { uom: "Each", price: 22.50 },
  "Site Prep - Floor coverings, contents covering, etc.": { uom: "SF", price: 0.70 },
  "Extraction - Carpet": { uom: "SF", price: 0.50 },
  "Extraction- Hard Surface": { uom: "SF", price: 0.30 },
  "Carpet Detach & Pad Removal": { uom: "SF", price: 1.25 },
  "Carpet and Pad Removal": { uom: "SF", price: 1.50 },
  "Trim Removal - detach for reuse": { uom: "LF", price: 1.25 },
  "Trim Tear out": { uom: "LF", price: 0.50 },
  "Wood Floor removal": { uom: "SF", price: 3.75 },
  "Vinyl Plank/Laminate Floor Removal": { uom: "SF", price: 1.80 },
  "Add for glue down": { uom: "SF", price: 4.00 },
  "Tile and underlayment removal": { uom: "SF", price: 7.00 },
  "Drywall - Drill Holes for drying": { uom: "Each", price: 0.50 },
  "Drywall Removal - by square foot": { uom: "SF", price: 1.25 },
  "Drywall Removal - up to 4' flood cut": { uom: "LF", price: 5.50 },
  "Insulation Removal": { uom: "SF", price: 0.65 },
  "Air Mover - # times 3 days minimum": { uom: "Each", price: 22.50 },
  "Dehumidifier - up to 110 ppd - # times 3 days": { uom: "Each", price: 75.00 },
  "Dehumidifier - Large - # times 3 days": { uom: "Each", price: 100.00 },
  "Air Scrubber - 3 times 3 days": { uom: "Each", price: 100.00 },
  "Equipment Set-up/monitor - per hour expected": { uom: "HR", price: 55.00 },
  "Apply Antimicrobial": { uom: "SF", price: 0.30 },
  "Clean Area - final cleaning": { uom: "SF", price: 0.35 },
  "Bags - for debris removal": { uom: "Each", price: 2.00 },
  "PPE - gloves, N95, booties, basic PPE - 2 changes per person per day": { uom: "Each", price: 22.00 },
  "Add on for confined space - crawl or attic": { uom: "SF", price: 0.85 },
  "Cabinet Removal - If needed": { uom: "LF", price: 22.00 },
  "Counter Removal - if needed": { uom: "LF", price: 9.00 },
  "Hydroxol, Ozone, Fogging": { uom: "CF", price: 0.05 },
  "Specialized Drying - Wood Floor mat system -per system": { uom: "Day", price: 200.00 },
  "Debris Disposal - per pick up truck load": { uom: "Each", price: 50.00 },
  "Dumpster/Dump Trailer up to 20 yards": { uom: "Each", price: 675.00 }
};

const PROJECT_MANAGERS = [
  "Leo Champion",
  "Taylor Garrett",
  "Kevin Shell",
  "Bryan Turpin",
  "Scottie Smith",
  "Eric Brown",
  "Travis Payne",
  "Kenny Taylor",
  "Josh Field"
];

function Estimating() {
  const [estimateName, setEstimateName] = useState('');
  const [savedEstimates, setSavedEstimates] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Job Details State
  const [jobDetails, setJobDetails] = useState({
    date: new Date().toISOString().split('T')[0],
    jobNumber: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    propertyAddress: '',
    projectManager: '',
    pmEmail: '',
    scopeType: '',
    waterCategory: 'N/A',
    afterHours: 'No',
    paymentTerms: '',
    scopeDescription: ''
  });

  // Rooms State
  const [rooms, setRooms] = useState([
    { id: 1, name: '', length: '', width: '', height: '' }
  ]);

  // Line Items State
  const [lineItems, setLineItems] = useState([
    { id: 1, item: '', uom: '', price: 0, qty: 1 }
  ]);

  // Load saved estimates on mount
  useEffect(() => {
    loadSavedEstimates();
  }, []);

  // Calculate totals whenever line items or job details change
  useEffect(() => {
    calculateTotals();
  }, [lineItems, jobDetails.afterHours, jobDetails.waterCategory]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const initAutocomplete = () => {
      if (addressInputRef.current && window.google && window.google.maps && window.google.maps.places) {
        try {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(
            addressInputRef.current,
            {
              types: ['address'],
              componentRestrictions: { country: 'us' }
            }
          );

          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current.getPlace();
            if (place.formatted_address) {
              setJobDetails(prev => ({ ...prev, propertyAddress: place.formatted_address }));
            }
          });
        } catch (error) {
          console.log('Google Places initialization error:', error);
        }
      } else {
        // Retry after a short delay if Google Maps isn't loaded yet
        setTimeout(initAutocomplete, 100);
      }
    };

    initAutocomplete();

    // Cleanup
    return () => {
      if (autocompleteRef.current && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(addressInputRef.current);
      }
    };
  }, []);

  const loadSavedEstimates = async () => {
    try {
      const estimates = await estimateService.getAll();
      setSavedEstimates(estimates.map(est => ({
        id: est.EstimateID,
        name: est.EstimateName || `Estimate #${est.EstimateID}`
      })));
    } catch (error) {
      console.error('Error loading estimates:', error);
      // Fallback to localStorage if API fails
      const localEstimates = JSON.parse(localStorage.getItem('spwc_estimates') || '{}');
      setSavedEstimates(Object.keys(localEstimates).map(name => ({ id: name, name })));
    }
  };

  const saveEstimate = async () => {
    let name = estimateName.trim();
    if (!name) {
      name = `${jobDetails.clientName || 'Unnamed'} - ${new Date().toLocaleDateString()}`;
      setEstimateName(name);
    }

    const estimateData = {
      CustomerID: 1, // TODO: Get from customer selection
      EstimateName: name,
      EstimateDescription: jobDetails.projectDescription || '',
      PropertyAddress: jobDetails.propertyAddress || '',
      EstimateData: JSON.stringify({
        jobDetails,
        rooms,
        lineItems
      }),
      TotalAmount: calculateTotal(),
      Status: 'Draft'
    };

    try {
      const result = await estimateService.create(estimateData);
      
      setSaveStatus(`✓ Estimate saved to database: ${name}`);
      setTimeout(() => setSaveStatus(''), 3000);
      loadSavedEstimates();
    } catch (error) {
      setSaveStatus('Error saving estimate to database');
      console.error('Error saving:', error);
      
      // Fallback to localStorage
      const estimates = JSON.parse(localStorage.getItem('spwc_estimates') || '{}');
      estimates[name] = { name, jobDetails, rooms, lineItems, savedAt: new Date().toISOString() };
      localStorage.setItem('spwc_estimates', JSON.stringify(estimates));
      setSaveStatus(`✓ Estimate saved locally: ${name}`);
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const loadEstimate = async (idOrName) => {
    if (!idOrName) return;

    try {
      // Try loading from API first (if it's a number, it's an ID)
      const isId = !isNaN(idOrName);
      
      if (isId) {
        const estimate = await estimateService.getById(idOrName);
        const parsedData = JSON.parse(estimate.EstimateData);
        
        setEstimateName(estimate.EstimateName);
        setJobDetails(parsedData.jobDetails || {});
        setRooms(parsedData.rooms || [{ id: 1, name: '', length: '', width: '', height: '' }]);
        setLineItems(parsedData.lineItems || [{ id: 1, item: '', uom: '', price: 0, qty: 1 }]);
        setSaveStatus(`✓ Estimate loaded from database: ${estimate.EstimateName}`);
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        // Fallback to localStorage for old estimates
        const estimates = JSON.parse(localStorage.getItem('spwc_estimates') || '{}');
        const data = estimates[idOrName];

        if (data) {
          setEstimateName(data.name);
          setJobDetails(data.jobDetails);
          setRooms(data.rooms || [{ id: 1, name: '', length: '', width: '', height: '' }]);
          setLineItems(data.lineItems || [{ id: 1, item: '', uom: '', price: 0, qty: 1 }]);
          setSaveStatus(`✓ Estimate loaded: ${idOrName}`);
          setTimeout(() => setSaveStatus(''), 3000);
        }
      }
    } catch (error) {
      console.error('Error loading estimate:', error);
      setSaveStatus('Error loading estimate');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const deleteEstimate = async () => {
    const selectElement = document.getElementById('saved-estimates');
    const estimateToDelete = selectElement.value;
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const estimateName = selectedOption?.text || estimateToDelete;
    
    if (!estimateToDelete) {
      alert('Please select an estimate to delete');
      return;
    }

    if (confirm(`Are you sure you want to delete "${estimateName}"?`)) {
      try {
        const isId = !isNaN(estimateToDelete);
        
        if (isId) {
          // Delete from API
          await estimateService.delete(estimateToDelete);
          setSaveStatus('✓ Estimate deleted from database');
        } else {
          // Delete from localStorage
          const estimates = JSON.parse(localStorage.getItem('spwc_estimates') || '{}');
          delete estimates[estimateToDelete];
          localStorage.setItem('spwc_estimates', JSON.stringify(estimates));
          setSaveStatus('✓ Estimate deleted');
        }
        
        loadSavedEstimates();
        setTimeout(() => setSaveStatus(''), 3000);
      } catch (error) {
        console.error('Error deleting estimate:', error);
        setSaveStatus('Error deleting estimate');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    }
  };

  const newEstimate = () => {
    setEstimateName('');
    setJobDetails({
      date: new Date().toISOString().split('T')[0],
      jobNumber: '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      propertyAddress: '',
      projectManager: '',
      pmEmail: '',
      scopeType: '',
      waterCategory: 'N/A',
      afterHours: 'No',
      paymentTerms: '',
      scopeDescription: ''
    });
    setRooms([{ id: 1, name: '', length: '', width: '', height: '' }]);
    setLineItems([{ id: 1, item: '', uom: '', price: 0, qty: 1 }]);
    setSaveStatus('New estimate started');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const exportEstimate = () => {
    const data = {
      name: estimateName,
      jobDetails,
      rooms,
      lineItems,
      exportedAt: new Date().toISOString()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(estimateName || 'estimate').replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    setSaveStatus('✓ Estimate exported to file');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const importEstimate = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setEstimateName(data.name || '');
        setJobDetails(data.jobDetails);
        setRooms(data.rooms || [{ id: 1, name: '', length: '', width: '', height: '' }]);
        setLineItems(data.lineItems || [{ id: 1, item: '', uom: '', price: 0, qty: 1 }]);
        setSaveStatus('✓ Estimate imported successfully');
        setTimeout(() => setSaveStatus(''), 3000);
      } catch (error) {
        alert('Error importing estimate file');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Room Functions
  const addRoom = () => {
    const newRoom = {
      id: rooms.length > 0 ? Math.max(...rooms.map(r => r.id)) + 1 : 1,
      name: '',
      length: '',
      width: '',
      height: ''
    };
    setRooms([...rooms, newRoom]);
  };

  const updateRoom = (id, field, value) => {
    setRooms(rooms.map(room => 
      room.id === id ? { ...room, [field]: value } : room
    ));
  };

  const removeRoom = (id) => {
    if (rooms.length > 1) {
      setRooms(rooms.filter(room => room.id !== id));
    }
  };

  const calculateRoomMetrics = (room) => {
    const l = parseFloat(room.length) || 0;
    const w = parseFloat(room.width) || 0;
    const h = parseFloat(room.height) || 0;
    
    return {
      sf: l * w,
      cf: l * w * h,
      perimeter: (l * 2) + (w * 2),
      wallArea: ((l * 2) + (w * 2)) * h
    };
  };

  // Line Item Functions
  const addLineItem = () => {
    const newItem = {
      id: lineItems.length > 0 ? Math.max(...lineItems.map(i => i.id)) + 1 : 1,
      item: '',
      uom: '',
      price: 0,
      qty: 1
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // If item name changed, update UOM and price
        if (field === 'item' && value && PRICE_LIST[value]) {
          updated.uom = PRICE_LIST[value].uom;
          updated.price = PRICE_LIST[value].price;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const calculateLineTotal = (item) => {
    return (parseFloat(item.price) || 0) * (parseFloat(item.qty) || 0);
  };

  // Calculate Totals
  const calculateTotals = () => {
    const subTotal = lineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
    
    // Surcharge calculation
    let surchargeCount = 0;
    if (jobDetails.afterHours === 'Yes') surchargeCount += 1;
    if (jobDetails.waterCategory === 'Cat 3') surchargeCount += 1;
    
    const surchargeAmount = subTotal * 0.30 * surchargeCount;
    const subTotalWithSurcharge = subTotal + surchargeAmount;
    
    // Tax calculation (25% of subtotal is taxable)
    const taxableBase = subTotal * 0.25;
    const taxAmount = taxableBase * 0.0975;
    
    const grandTotal = subTotalWithSurcharge + taxAmount;
    
    return {
      subTotal: subTotalWithSurcharge,
      surchargeAmount,
      taxableBase,
      taxAmount,
      grandTotal,
      hasSurcharge: surchargeCount > 0
    };
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const generateScope = () => {
    const scopeType = jobDetails.scopeType;
    const clientName = jobDetails.clientName || "[Client Name]";
    const address = jobDetails.propertyAddress || "[Property Address]";
    
    let scopeText = `Provide ${scopeType || "[Scope Type]"} mitigation services for ${clientName} at the property located at ${address}.\n\n`;
    
    if (scopeType === 'Water') {
      scopeText += `This scope includes water extraction, structural drying, and restoration of water-damaged areas.`;
    } else if (scopeType === 'Fire') {
      scopeText += `This scope includes deodorization, soot/smoke removal, and cleaning of all affected areas.`;
    } else if (scopeType === 'Storm') {
      scopeText += `This scope includes emergency board-up, tarping, and stabilization of storm-impacted areas to prevent further damage.`;
    } else if (scopeType === 'Mold') {
      scopeText += `This scope includes setting up containment, HEPA-filtration, removal of mold-affected materials, and detailed cleaning of the affected area.`;
    } else if (scopeType === 'Contents') {
      scopeText += `This scope includes the pack-out, cleaning, and restoration of salvageable personal property.`;
    }
    
    // Add room summary
    const validRooms = rooms.filter(r => r.name && r.length && r.width);
    if (validRooms.length > 0) {
      const totalSF = validRooms.reduce((sum, room) => {
        const metrics = calculateRoomMetrics(room);
        return sum + metrics.sf;
      }, 0);
      
      const roomNames = [...new Set(validRooms.map(r => r.name))];
      scopeText += ` The work is estimated to affect ${roomNames.length} ${roomNames.length === 1 ? 'room' : 'rooms'} (${roomNames.join(', ')}), totaling approximately ${Math.round(totalSF).toLocaleString()} SF.`;
    }
    
    scopeText += `\n\nAdditional work may be required based on findings during the mitigation process.`;
    
    setJobDetails({ ...jobDetails, scopeDescription: scopeText });
  };

  const totals = calculateTotals();

  return (
    <div className="page-container estimating-page">
      <div className="estimate-container">
        <h1>SPWC LLC Estimate Tool</h1>

        {/* Estimate Management */}
        <div className="estimate-management">
          <div className="management-grid">
            <div className="field-group">
              <label htmlFor="estimate-name">Estimate Name</label>
              <input
                type="text"
                id="estimate-name"
                value={estimateName}
                onChange={(e) => setEstimateName(e.target.value)}
                placeholder="e.g., Smith Job - Water Damage"
              />
            </div>
            <div className="field-group">
              <label htmlFor="saved-estimates">Load Saved Estimate</label>
              <select
                id="saved-estimates"
                onChange={(e) => loadEstimate(e.target.value)}
                defaultValue=""
              >
                <option value="">-- Select to Load --</option>
                {savedEstimates.map(est => (
                  <option key={est.id || est.name} value={est.id || est.name}>
                    {est.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label style={{ opacity: 0 }}>Actions</label>
              <button type="button" onClick={newEstimate} style={{ width: '100%', padding: '10px' }}>
                New Estimate
              </button>
            </div>
          </div>
          
          <div className="management-actions">
            <button onClick={saveEstimate}>💾 Save Estimate</button>
            <button onClick={exportEstimate}>📥 Export to File</button>
            <button onClick={() => document.getElementById('import-file').click()}>
              📤 Import from File
            </button>
            <button onClick={deleteEstimate} className="delete-btn">🗑️ Delete Selected</button>
            <input
              type="file"
              id="import-file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={importEstimate}
            />
          </div>
          
          {saveStatus && <div className="save-status">{saveStatus}</div>}
        </div>

        {/* Job Details */}
        <h2>Job Details</h2>
        <div className="job-details-grid">
          <div className="field-group">
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              value={jobDetails.date}
              onChange={(e) => setJobDetails({ ...jobDetails, date: e.target.value })}
            />
          </div>
          
          <div className="field-group">
            <label htmlFor="job-number">DASH Job ID</label>
            <input
              type="text"
              id="job-number"
              value={jobDetails.jobNumber}
              onChange={(e) => setJobDetails({ ...jobDetails, jobNumber: e.target.value })}
            />
          </div>
          
          <div className="field-group">
            <label htmlFor="client-name">Customer Name</label>
            <input
              type="text"
              id="client-name"
              value={jobDetails.clientName}
              onChange={(e) => setJobDetails({ ...jobDetails, clientName: e.target.value })}
            />
          </div>
          
          <div className="field-group">
            <label htmlFor="client-phone">Customer Phone</label>
            <input
              type="tel"
              id="client-phone"
              value={jobDetails.clientPhone}
              onChange={(e) => setJobDetails({ ...jobDetails, clientPhone: e.target.value })}
            />
          </div>
          
          <div className="field-group">
            <label htmlFor="client-email">Customer Email</label>
            <input
              type="email"
              id="client-email"
              value={jobDetails.clientEmail}
              onChange={(e) => setJobDetails({ ...jobDetails, clientEmail: e.target.value })}
            />
          </div>
          
          <div className="field-group">
            <label htmlFor="property-address">Property Address</label>
            <input
              type="text"
              id="property-address"
              ref={addressInputRef}
              value={jobDetails.propertyAddress}
              onChange={(e) => setJobDetails({ ...jobDetails, propertyAddress: e.target.value })}
              placeholder="Start typing address..."
            />
          </div>
          
          <div className="field-group">
            <label htmlFor="project-manager">Project Manager (PM)</label>
            <select
              id="project-manager"
              value={jobDetails.projectManager}
              onChange={(e) => setJobDetails({ ...jobDetails, projectManager: e.target.value })}
            >
              <option value="">-- Select PM --</option>
              {PROJECT_MANAGERS.map(pm => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
          </div>
          
          <div className="field-group">
            <label htmlFor="pm-email">PM Email</label>
            <input
              type="email"
              id="pm-email"
              value={jobDetails.pmEmail}
              onChange={(e) => setJobDetails({ ...jobDetails, pmEmail: e.target.value })}
            />
          </div>
          
          <div className="field-group">
            <label htmlFor="scope-type">Scope Type</label>
            <select
              id="scope-type"
              value={jobDetails.scopeType}
              onChange={(e) => setJobDetails({ ...jobDetails, scopeType: e.target.value })}
            >
              <option value="">Select Scope...</option>
              <option value="Water">Water</option>
              <option value="Fire">Fire</option>
              <option value="Mold">Mold</option>
              <option value="Contents">Contents</option>
              <option value="Storm">Storm</option>
            </select>
          </div>
          
          <div className="field-group">
            <label htmlFor="water-category">Water Category</label>
            <select
              id="water-category"
              value={jobDetails.waterCategory}
              onChange={(e) => setJobDetails({ ...jobDetails, waterCategory: e.target.value })}
            >
              <option value="N/A">N/A</option>
              <option value="Cat 1">Cat 1</option>
              <option value="Cat 2">Cat 2</option>
              <option value="Cat 3">Cat 3</option>
            </select>
          </div>
          
          <div className="field-group">
            <label htmlFor="after-hours">After-Hours Response</label>
            <select
              id="after-hours"
              value={jobDetails.afterHours}
              onChange={(e) => setJobDetails({ ...jobDetails, afterHours: e.target.value })}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          
          <div className="field-group">
            <label htmlFor="payment-terms">Payment Terms</label>
            <select
              id="payment-terms"
              value={jobDetails.paymentTerms}
              onChange={(e) => setJobDetails({ ...jobDetails, paymentTerms: e.target.value })}
            >
              <option value="">Select Payment Terms...</option>
              <option value="full">Payment in Full upon Authorization</option>
              <option value="phased">Phased Project Payments (50/50)</option>
              <option value="milestone">Milestone Schedule</option>
            </select>
          </div>
        </div>

        {/* Scope of Work */}
        <div className="h2-with-button">
          <h2>Scope of Work</h2>
          <button onClick={generateScope} className="inline-btn">Generate Scope</button>
        </div>
        <div className="field-group">
          <textarea
            id="scope-description"
            rows="5"
            value={jobDetails.scopeDescription}
            onChange={(e) => setJobDetails({ ...jobDetails, scopeDescription: e.target.value })}
            placeholder="Provide a brief description of the work to be performed..."
          />
        </div>

        {/* Rooms Table */}
        <h2>Affected Areas & Dimensions</h2>
        <table className="estimate-table">
          <thead>
            <tr>
              <th style={{ width: '18%' }}>Room Name</th>
              <th style={{ width: '9%' }}>Length (ft)</th>
              <th style={{ width: '9%' }}>Width (ft)</th>
              <th style={{ width: '9%' }}>Height (ft)</th>
              <th style={{ width: '11%' }}>SF</th>
              <th style={{ width: '11%' }}>CF</th>
              <th style={{ width: '11%' }}>Perimeter</th>
              <th style={{ width: '11%' }}>Wall Area</th>
              <th style={{ width: '6%' }}></th>
            </tr>
          </thead>
          <tbody>
            {rooms.map(room => {
              const metrics = calculateRoomMetrics(room);
              return (
                <tr key={room.id}>
                  <td>
                    <input
                      type="text"
                      value={room.name}
                      onChange={(e) => updateRoom(room.id, 'name', e.target.value)}
                      placeholder="Room name"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={room.length}
                      onChange={(e) => updateRoom(room.id, 'length', e.target.value)}
                      step="0.1"
                      min="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={room.width}
                      onChange={(e) => updateRoom(room.id, 'width', e.target.value)}
                      step="0.1"
                      min="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={room.height}
                      onChange={(e) => updateRoom(room.id, 'height', e.target.value)}
                      step="0.1"
                      min="0"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={formatCurrency(metrics.sf)}
                      readOnly
                      className="readonly"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={formatCurrency(metrics.cf)}
                      readOnly
                      className="readonly"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={formatCurrency(metrics.perimeter)}
                      readOnly
                      className="readonly"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={formatCurrency(metrics.wallArea)}
                      readOnly
                      className="readonly"
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => removeRoom(room.id)}
                      className="remove-btn"
                      disabled={rooms.length === 1}
                    >
                      X
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="button-row">
          <button onClick={addRoom} className="add-btn">+ Add Room</button>
        </div>

        {/* Line Items Table */}
        <h2>Mitigation Action Line Items</h2>
        <table className="estimate-table">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Item Description</th>
              <th style={{ width: '10%' }}>UOM</th>
              <th style={{ width: '15%' }}>Unit Price</th>
              <th style={{ width: '10%' }}>Quantity</th>
              <th style={{ width: '15%' }}>Line Total</th>
              <th style={{ width: '10%' }}></th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map(item => {
              const lineTotal = calculateLineTotal(item);
              return (
                <tr key={item.id}>
                  <td>
                    <select
                      value={item.item}
                      onChange={(e) => updateLineItem(item.id, 'item', e.target.value)}
                    >
                      <option value="">--- Select an Item ---</option>
                      {Object.keys(PRICE_LIST).map(itemName => (
                        <option key={itemName} value={itemName}>{itemName}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.uom}
                      readOnly
                      className="readonly"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={formatCurrency(item.price)}
                      readOnly
                      className="readonly"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateLineItem(item.id, 'qty', e.target.value)}
                      min="0"
                      step="any"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={formatCurrency(lineTotal)}
                      readOnly
                      className="readonly"
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => removeLineItem(item.id)}
                      className="remove-btn"
                      disabled={lineItems.length === 1}
                    >
                      X
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div className="button-row">
          <button onClick={addLineItem} className="add-btn">+ Add Line Item</button>
          <button onClick={() => window.print()} className="print-btn">Create Customer Estimate</button>
        </div>

        {/* Totals */}
        <div className="total-container">
          <div className="total-line">
            <span className="total-label">Sub-Total:</span>
            <span className="total-value">$ {formatCurrency(totals.subTotal)}</span>
          </div>
          {totals.hasSurcharge && (
            <div className="surcharge-note">
              Includes surcharge: ${formatCurrency(totals.surchargeAmount)}
              {jobDetails.afterHours === 'Yes' && ' (After-hours)'}
              {jobDetails.waterCategory === 'Cat 3' && ' (Cat 3)'}
            </div>
          )}
          <div className="total-line">
            <span className="total-label">Tax (9.75%):</span>
            <span className="total-value">$ {formatCurrency(totals.taxAmount)}</span>
          </div>
          <div className="total-line" style={{ fontSize: '12px', color: '#94a3b8' }}>
            <span className="total-label">Taxable portion:</span>
            <span className="total-value">$ {formatCurrency(totals.taxableBase)}</span>
          </div>
          <div className="total-line grand-total">
            <span className="total-label">Grand Total:</span>
            <span className="total-value">$ {formatCurrency(totals.grandTotal)}</span>
          </div>
        </div>

        {/* QR Code Payment Section */}
        <div className="qr-container">
          <div className="qr-title">Pay Online</div>
          <div className="qr-instructions">
            Scan QR code or visit payment link to pay this estimate online
            <br />
            <a
              href="https://connect.intuit.com/pay/ServproOfWilsonCounty/scs-v1-a686d70ef3e4437585c7ff97faab9864341e074cc01d43268d76a7b47b1405c0106cafa2d92949d4a7b3a06ce1777f33?locale=EN_US"
              target="_blank"
              rel="noopener noreferrer"
            >
              Click here to pay online
            </a>
          </div>
        </div>

        {/* Footer Section */}
        <div className="footer-section">
          <h2>Acknowledgement and Authorization</h2>
          <div className="legal-blurb">
            <p>I, the undersigned Customer, hereby acknowledge and agree that this Estimate is a preliminary projection of anticipated costs prepared by SPWC, LLC ("SPWC") based on conditions and information reasonably known to SPWC at the time of issuance, and that it is not a guarantee. I understand that the Estimate was generated using a computerized estimating system, which assigns pre-determined standard costs and prices to items and services and multiplies those figures by units or hours. I understand and agree to this method of pricing.</p>
            <p>I further understand that site conditions, scope, or other relevant information may change or be discovered as work progresses, and that SPWC reserves the right to revise this Estimate accordingly. Any such revisions will be documented in a written change order and must be approved by me in writing before any additional work is performed. I also understand that I am fully and solely responsible for the cost of SPWC's work, and if my insurer fails or refuses to pay any amount due to SPWC, I will remain fully and solely responsible for payment of all amounts due to SPWC. My payment obligations are absolute, independent of any insurance proceeds, and not contingent upon receipt of payment from any insurer.</p>
            <p>Finally, I understand that this Estimate is expressly incorporated into and made part of the Authorization to Perform Services and Direction of Payment signed by me and SPWC, and that the work described herein is governed by the terms of that Authorization.</p>
          </div>

          <div className="signature-container">
            <div className="signature-group">
              <div className="signature-line"></div>
              <div className="signature-name">{jobDetails.clientName || 'Customer Name'}</div>
              <div className="signature-title">Customer Signature & Date</div>
            </div>
            <div className="signature-group">
              <div className="signature-line"></div>
              <div className="signature-name">{jobDetails.projectManager || 'Project Manager'}</div>
              <div className="signature-title">SPWC LLC Representative & Date</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Estimating;
