import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Page.css';
import './Estimating.css';
import { estimateService } from '../services';
import { jsPDF } from 'jspdf';
import { supabase } from '../services/supabaseClient';
import QRCode from 'qrcode';

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
  "Dumpster/Dump Trailer up to 20 yards": { uom: "Each", price: 675.00 },
  "Sub-Contract (Bid Item)": { uom: "Each", price: 0.00 },
  "Toilet Detach": { uom: "Each", price: 50.00 }
};

// Items that are considered materials (taxable)
const MATERIAL_ITEMS = [
  "Containment Barrier - plastic up to 6 mil & tape",
  "Zippers",
  "Bags - for debris removal",
  "PPE - gloves, N95, booties, basic PPE - 2 changes per person per day",
  "Apply Antimicrobial",
  "Hydroxol, Ozone, Fogging",
  "Cabinet Removal - If needed",
  "Counter Removal - if needed",
  "Sub-Contract (Bid Item)",
  "Toilet Detach"
];

const PROJECT_MANAGERS = [
  "Leo Champion",
  "Aaron Kacel",
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
  const [currentEstimateId, setCurrentEstimateId] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);
  const [autocompleteStatus, setAutocompleteStatus] = useState('loading');

  // Job Details State
  const [jobDetails, setJobDetails] = useState({
    date: new Date().toISOString().split('T')[0],
    jobNumber: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    propertyAddress: '',
    city: '',
    state: '',
    zip: '',
    latitude: '',
    longitude: '',
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

  // Line Items State - now organized by room
  // Each room will have its own array of line items
  // We'll store line items as: { roomId: roomId, items: [...] }
  const [roomLineItems, setRoomLineItems] = useState({});

  // Initialize line items for rooms when they're added
  useEffect(() => {
    const roomsNeedingInit = rooms.filter(room => !roomLineItems[room.id]);
    if (roomsNeedingInit.length > 0) {
      setRoomLineItems(prev => {
        const updated = { ...prev };
        roomsNeedingInit.forEach(room => {
          updated[room.id] = [];
        });
        return updated;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms]);

  // Load saved estimates on mount
  useEffect(() => {
    loadSavedEstimates();
  }, []);

  // Calculate totals whenever line items or job details change
  useEffect(() => {
    calculateTotals();
  }, [roomLineItems, jobDetails.afterHours, jobDetails.waterCategory]);

  // Auto-save functionality (debounced) - defined after saveEstimate

  // Initialize Google Places Autocomplete (classic API - same as Intake and Storm)
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 30; // 3 seconds max wait time

    const initAutocomplete = () => {
      // Check for Google Maps errors first
      if (window.googleMapsError) {
        console.error('Google Maps Error:', window.googleMapsError);
        setAutocompleteStatus('error');
        return;
      }

      // Check if input element exists and is in the DOM
      if (!addressInputRef.current || !document.contains(addressInputRef.current)) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(initAutocomplete, 100);
        }
        return;
      }

      // Check if Google Maps API is loaded with standard Places library
      if (!window.google || !window.google.maps || !window.google.maps.places || !window.google.maps.places.Autocomplete) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(initAutocomplete, 100);
        } else {
          console.warn('Google Maps API not loaded after 3 seconds. Autocomplete disabled.');
          setAutocompleteStatus('unavailable');
        }
        return;
      }

      // Initialize standard Google Places Autocomplete
      try {
        console.log('Initializing Google Places Autocomplete for Estimating form...');
        
        // Create autocomplete instance directly on the input element
        const autocompleteInstance = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            types: ['address'],
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address', 'address_components', 'geometry', 'name']
          }
        );
        
        console.log('✓ Autocomplete initialized successfully');
        setAutocompleteStatus('ready');
        
        // Listen for place selection
        autocompleteInstance.addListener('place_changed', () => {
          try {
            const place = autocompleteInstance.getPlace();
            console.log('Place selected:', place);
            
            if (!place || !place.geometry) {
              console.warn('No geometry found for selected place');
              return;
            }
            
            // Get formatted address
            const address = place.formatted_address || place.name || '';
            console.log('Address:', address);
              
            // Extract address components
            let city = '';
            let state = '';
            let zip = '';
          
            if (place.address_components) {
              place.address_components.forEach(component => {
                const types = component.types || [];
                if (types.includes('locality')) {
                  city = component.long_name;
                }
                if (types.includes('administrative_area_level_1')) {
                  state = component.short_name;
                }
                if (types.includes('postal_code')) {
                  zip = component.long_name;
                }
              });
            }
              
            // Extract coordinates
            let latitude = '';
            let longitude = '';
            if (place.geometry && place.geometry.location) {
              latitude = place.geometry.location.lat().toString();
              longitude = place.geometry.location.lng().toString();
            }
            
            // Fallback for city if not found
            if (!city) {
              const parts = address.split(',');
              if (parts.length >= 2) {
                city = parts[1].trim();
              }
            }
              
            console.log('Extracted data:', { address, city, state, zip, latitude, longitude });
              
            // Update job details state
            setJobDetails(prev => ({
              ...prev,
              propertyAddress: address,
              city: city || '',
              state: state || '',
              zip: zip || '',
              latitude: latitude || '',
              longitude: longitude || ''
            }));
            
          } catch (error) {
            console.error('Error processing place selection:', error);
          }
        });

        // Store reference for cleanup
        autocompleteRef.current = autocompleteInstance;
      } catch (error) {
        console.error('Google Places initialization error:', error);
        setAutocompleteStatus('error');
      }
    };

    const timeoutId = setTimeout(initAutocomplete, 200);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      if (autocompleteRef.current && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
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

  const saveEstimate = async (isAutoSave = false) => {
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
        roomLineItems
      }),
      TotalAmount: calculateTotals().grandTotal,
      Status: 'Draft'
    };

    try {
      let result;
      if (currentEstimateId) {
        // Update existing estimate
        result = await estimateService.update(currentEstimateId, estimateData);
      } else {
        // Create new estimate
        result = await estimateService.create(estimateData);
        setCurrentEstimateId(result.EstimateID);
      }
      
      if (!isAutoSave) {
      setSaveStatus(`✓ Estimate saved to database: ${name}`);
      setTimeout(() => setSaveStatus(''), 3000);
      }
      loadSavedEstimates();
    } catch (error) {
      if (!isAutoSave) {
      setSaveStatus('Error saving estimate to database');
      console.error('Error saving:', error);
      
      // Fallback to localStorage
      const estimates = JSON.parse(localStorage.getItem('spwc_estimates') || '{}');
        estimates[name] = { name, jobDetails, rooms, roomLineItems, savedAt: new Date().toISOString() };
      localStorage.setItem('spwc_estimates', JSON.stringify(estimates));
      setSaveStatus(`✓ Estimate saved locally: ${name}`);
      setTimeout(() => setSaveStatus(''), 3000);
      }
    }
  };

  // Auto-save functionality (debounced)
  useEffect(() => {
    if (autoSaveEnabled && currentEstimateId) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new timeout for auto-save (3 seconds after last change)
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveEstimate(true); // Pass true to indicate auto-save
      }, 3000);
      
      return () => {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimateName, jobDetails, rooms, roomLineItems, autoSaveEnabled, currentEstimateId]);

  const loadEstimate = async (idOrName) => {
    if (!idOrName) return;

    try {
      // Try loading from API first (if it's a number, it's an ID)
      const isId = !isNaN(idOrName);
      
      if (isId) {
        const estimate = await estimateService.getById(idOrName);
        const parsedData = JSON.parse(estimate.EstimateData);
        
        setEstimateName(estimate.EstimateName);
        setCurrentEstimateId(estimate.EstimateID);
        setJobDetails(parsedData.jobDetails || {});
        setRooms(parsedData.rooms || [{ id: 1, name: '', length: '', width: '', height: '' }]);
        // Handle migration from old format (lineItems) to new format (roomLineItems)
        if (parsedData.roomLineItems) {
          setRoomLineItems(parsedData.roomLineItems);
        } else if (parsedData.lineItems) {
          // Migrate old format: assign all line items to first room
          const firstRoomId = parsedData.rooms?.[0]?.id || 1;
          setRoomLineItems({ [firstRoomId]: parsedData.lineItems });
        } else {
          setRoomLineItems({});
        }
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
          if (data.roomLineItems) {
            setRoomLineItems(data.roomLineItems);
          } else if (data.lineItems) {
            const firstRoomId = data.rooms?.[0]?.id || 1;
            setRoomLineItems({ [firstRoomId]: data.lineItems });
          } else {
            setRoomLineItems({});
          }
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
    setCurrentEstimateId(null);
    setJobDetails({
      date: new Date().toISOString().split('T')[0],
      jobNumber: '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      propertyAddress: '',
      city: '',
      state: '',
      zip: '',
      latitude: '',
      longitude: '',
      projectManager: '',
      pmEmail: '',
      scopeType: '',
      waterCategory: 'N/A',
      afterHours: 'No',
      paymentTerms: '',
      scopeDescription: ''
    });
    setRooms([{ id: 1, name: '', length: '', width: '', height: '' }]);
    setRoomLineItems({});
    setSaveStatus('New estimate started');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Generate PDF and upload to Supabase Storage
  const generateAndSavePDF = async () => {
    // Try to save estimate first if it doesn't exist, but don't block PDF generation
    let estimateId = currentEstimateId;
    if (!estimateId) {
      try {
        await saveEstimate(false);
        // Wait a moment for state to update, then check again
        await new Promise(resolve => setTimeout(resolve, 500));
        estimateId = currentEstimateId;
      } catch (error) {
        console.error('Error saving estimate before PDF generation:', error);
        // Continue with PDF generation anyway
      }
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 20;

      // Header with Logo
      const logoY = 10;
      let logoHeight = 0;
      const logoWidth = 60;
      
      // Try to load logo from public folder (with timeout to prevent hanging)
      try {
        // Try both Logo.png and logo.png (case sensitivity)
        const logoPaths = ['/Logo.png', '/logo.png'];
        let logoDataUrl = null;
        
        for (const logoPath of logoPaths) {
          try {
            const logoPromise = fetch(logoPath).then(async (response) => {
              if (response.ok) {
                const blob = await response.blob();
                return new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              }
              return null;
            });
            
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1000));
            logoDataUrl = await Promise.race([logoPromise, timeoutPromise]);
            
            if (logoDataUrl) break;
          } catch (e) {
            continue;
          }
        }
        
        if (logoDataUrl) {
          // Determine image format from data URL
          const format = logoDataUrl.includes('data:image/png') ? 'PNG' : 'JPEG';
          logoHeight = 20; // Adjust based on your logo aspect ratio (width/height)
          const logoX = pageWidth / 2 - logoWidth / 2;
          doc.addImage(logoDataUrl, format, logoX, logoY, logoWidth, logoHeight);
        }
      } catch (error) {
        console.log('Logo not found or error loading:', error);
        // Continue without logo
      }
      
      // Set yPos after logo (or start position if no logo)
      // Ensure we always have content on the first page
      if (logoHeight > 0) {
        yPos = logoY + logoHeight + 8; // Reduced spacing from 15 to 8
      } else {
        yPos = 20; // Start at normal position if no logo
      }
      
      // Title - moved down and smaller font
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('SPWC LLC ESTIMATE', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Job Details - in specified order
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      // Format date as MM-DD-YEAR
      const formatDate = (dateString) => {
        if (!dateString) {
          const today = new Date();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          const year = today.getFullYear();
          return `${month}-${day}-${year}`;
        }
        const date = new Date(dateString);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}-${day}-${year}`;
      };
      doc.text(`Date: ${formatDate(jobDetails.date)}`, margin, yPos);
      yPos += 8;
      doc.text(`Client Name: ${jobDetails.clientName || 'N/A'}`, margin, yPos);
      yPos += 8;
      const phone = jobDetails.clientPhone || 'N/A';
      const email = jobDetails.clientEmail || 'N/A';
      doc.text(`Client Contact Info: ${phone}, ${email}`, margin, yPos);
      yPos += 8;
      doc.text(`Property Address: ${jobDetails.propertyAddress || 'N/A'}`, margin, yPos);
      yPos += 8;
      doc.text(`Project Manager: ${jobDetails.projectManager || 'N/A'}`, margin, yPos);
      yPos += 8;
      doc.text(`Job Number: ${jobDetails.jobNumber ? `- ${jobDetails.jobNumber}` : 'N/A'}`, margin, yPos);
      yPos += 8;
      // Payment Terms - last item before scope
      if (jobDetails.paymentTerms) {
        const paymentTermsText = {
          'full': 'Payment in Full upon Authorization',
          'phased': 'Phased Project Payments (50/50)',
          'milestone': 'Milestone Schedule',
          'net15': 'Net 15',
          'net30': 'Net 30',
          'net45': 'Net 45',
          'net60': 'Net 60',
          'dueOnCompletion': 'Due on Completion',
          'custom': jobDetails.paymentTermsCustom || 'Custom Payment Terms'
        };
        doc.text(`Payment Terms: ${paymentTermsText[jobDetails.paymentTerms] || jobDetails.paymentTerms}`, margin, yPos);
        yPos += 8;
      }
      yPos += 7; // Extra spacing before scope

      // Scope Section
      if (jobDetails.scopeDescription) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Scope', margin, yPos);
        yPos += 10;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const scopeLines = doc.splitTextToSize(jobDetails.scopeDescription, pageWidth - (margin * 2));
        doc.text(scopeLines, margin, yPos);
        yPos += (scopeLines.length * 6) + 10;
      }

      // Line separator
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Mitigation Line Items by Room - Simple Table
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Mitigation Line Items by Room', margin, yPos);
      yPos += 10;

      // Table headers
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      const colWidths = {
        room: 40,
        item: 90,
        qty: 30,
        total: 30
      };
      const tableStartX = margin;
      
      doc.text('Room', tableStartX, yPos);
      doc.text('Item Description', tableStartX + colWidths.room, yPos);
      doc.text('Qty', tableStartX + colWidths.room + colWidths.item, yPos);
      doc.text('Total $', pageWidth - margin, yPos, { align: 'right' });
      yPos += 8;
      
      // Table line
      doc.setDrawColor(0, 0, 0);
      doc.line(tableStartX, yPos, pageWidth - margin, yPos);
      yPos += 6;

      doc.setFont(undefined, 'normal');
      
      rooms.forEach(room => {
        const roomItems = roomLineItems[room.id] || [];
        if (roomItems.length > 0) {
          roomItems.forEach((item) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
              // Redraw headers on new page
              doc.setFont(undefined, 'bold');
              doc.text('Room', tableStartX, yPos);
              doc.text('Item Description', tableStartX + colWidths.room, yPos);
              doc.text('Qty', tableStartX + colWidths.room + colWidths.item, yPos);
              doc.text('Total $', pageWidth - margin, yPos, { align: 'right' });
              yPos += 8;
              doc.line(tableStartX, yPos, pageWidth - margin, yPos);
              yPos += 6;
              doc.setFont(undefined, 'normal');
            }
            
            const lineTotal = calculateLineTotal(item);
            const roomName = room.name || `Room ${room.id}`;
            const qtyText = `${item.qty || 0} ${item.uom || ''}`;
            
            doc.text(roomName, tableStartX, yPos);
            doc.text(item.item || 'Item', tableStartX + colWidths.room, yPos);
            doc.text(qtyText, tableStartX + colWidths.room + colWidths.item, yPos);
            doc.text(`$${lineTotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
            yPos += 7;
          });
        }
      });

      yPos += 5;
      doc.setDrawColor(0, 0, 0);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Totals - Tax and Grand Total only
      const totals = calculateTotals();
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Tax (9.75% on materials): $${totals.taxAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 10;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`GRAND TOTAL: $${totals.grandTotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });

      // Add new page for legal section and signatures
      doc.addPage();
      yPos = 20;

      // QR Code Payment Section at top
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Pay Online', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const paymentText = "Scan QR code or visit payment link to pay this estimate online";
      const paymentLines = doc.splitTextToSize(paymentText, pageWidth - (margin * 2));
      doc.text(paymentLines, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
      
      // Generate and add QR code
      const paymentUrl = 'https://connect.intuit.com/pay/ServproOfWilsonCounty/scs-v1-a686d70ef3e4437585c7ff97faab9864341e074cc01d43268d76a7b47b1405c0106cafa2d92949d4a7b3a06ce1777f33?locale=EN_US';
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(paymentUrl, {
          width: 60,
          margin: 1
        });
        
        // Add QR code image (centered)
        const qrSize = 60;
        const qrX = pageWidth / 2 - qrSize / 2;
        doc.addImage(qrCodeDataUrl, 'PNG', qrX, yPos, qrSize, qrSize);
        yPos += qrSize + 10;
      } catch (error) {
        console.error('Error generating QR code:', error);
        // Continue without QR code if generation fails
      }
      
      // Payment link (as clickable text)
      doc.setTextColor(0, 0, 255);
      const linkText = 'Click here to pay online';
      const linkWidth = doc.getTextWidth(linkText);
      doc.text(linkText, pageWidth / 2, yPos, { align: 'center' });
      // Add link annotation
      doc.link(pageWidth / 2 - linkWidth / 2, yPos - 4, linkWidth, 5, { url: paymentUrl });
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      // Legal Section - Acknowledgement and Authorization
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('Acknowledgement and Authorization', margin, yPos);
      yPos += 15;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      const legalText1 = "I, the undersigned Customer, hereby acknowledge and agree that this Estimate is a preliminary projection of anticipated costs prepared by SPWC, LLC (\"SPWC\") based on conditions and information reasonably known to SPWC at the time of issuance, and that it is not a guarantee. I understand that the Estimate was generated using a computerized estimating system, which assigns pre-determined standard costs and prices to items and services and multiplies those figures by units or hours. I understand and agree to this method of pricing.";
      const legalLines1 = doc.splitTextToSize(legalText1, pageWidth - (margin * 2));
      doc.text(legalLines1, margin, yPos);
      yPos += (legalLines1.length * 4.5) + 5;

      const legalText2 = "I further understand that site conditions, scope, or other relevant information may change or be discovered as work progresses, and that SPWC reserves the right to revise this Estimate accordingly. Any such revisions will be documented in a written change order and must be approved by me in writing before any additional work is performed. I also understand that I am fully and solely responsible for the cost of SPWC's work, and if my insurer fails or refuses to pay any amount due to SPWC, I will remain fully and solely responsible for payment of all amounts due to SPWC. My payment obligations are absolute, independent of any insurance proceeds, and not contingent upon receipt of payment from any insurer.";
      const legalLines2 = doc.splitTextToSize(legalText2, pageWidth - (margin * 2));
      doc.text(legalLines2, margin, yPos);
      yPos += (legalLines2.length * 4.5) + 5;

      const legalText3 = "Finally, I understand that this Estimate is expressly incorporated into and made part of the Authorization to Perform Services and Direction of Payment signed by me and SPWC, and that the work described herein is governed by the terms of that Authorization.";
      const legalLines3 = doc.splitTextToSize(legalText3, pageWidth - (margin * 2));
      doc.text(legalLines3, margin, yPos);
      yPos += (legalLines3.length * 4.5) + 20;

      // Signature blocks
      const signatureY = doc.internal.pageSize.getHeight() - 60;
      const signatureWidth = 80;
      const leftSignatureX = margin;
      const rightSignatureX = pageWidth - margin - signatureWidth;

      // Customer signature
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(leftSignatureX, signatureY, leftSignatureX + signatureWidth, signatureY);
      yPos = signatureY + 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(jobDetails.clientName || 'Customer Name', leftSignatureX, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('Customer Signature & Date', leftSignatureX, yPos);

      // PM signature
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(rightSignatureX, signatureY, rightSignatureX + signatureWidth, signatureY);
      yPos = signatureY + 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(jobDetails.projectManager || 'Project Manager', rightSignatureX, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('SPWC LLC Representative & Date', rightSignatureX, yPos);

      // Generate PDF blob
      const pdfBlob = doc.output('blob');
      const fileName = `${(estimateName || 'estimate').replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Always download PDF locally first
      doc.save(fileName);
      
      // Try to upload to Supabase Storage if estimate is saved
      if (estimateId) {
        try {
          const filePath = `estimates/${estimateId}/${fileName}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('estimates')
            .upload(filePath, pdfBlob, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (!uploadError) {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('estimates')
              .getPublicUrl(filePath);

            // Update estimate record with PDF URL
            await estimateService.update(estimateId, {
              PDFUrl: urlData.publicUrl
            });
            
            setSaveStatus(`✓ PDF generated and saved to Supabase: ${fileName}`);
            setTimeout(() => setSaveStatus(''), 5000);
          } else {
            console.error('Error uploading PDF to Supabase:', uploadError);
            setSaveStatus(`✓ PDF generated and downloaded. Could not upload to Supabase.`);
            setTimeout(() => setSaveStatus(''), 5000);
          }
        } catch (error) {
          console.error('Error saving PDF to Supabase:', error);
          setSaveStatus(`✓ PDF generated and downloaded. Could not save to Supabase.`);
          setTimeout(() => setSaveStatus(''), 5000);
        }
      } else {
        setSaveStatus(`✓ PDF generated and downloaded: ${fileName}`);
        setTimeout(() => setSaveStatus(''), 3000);
      }
      } catch (error) {
      console.error('Error generating PDF:', error);
      setSaveStatus('Error generating PDF');
      setTimeout(() => setSaveStatus(''), 3000);
      }
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
    // Initialize empty line items array for new room
    setRoomLineItems(prev => ({
      ...prev,
      [newRoom.id]: []
    }));
  };

  const updateRoom = (id, field, value) => {
    setRooms(rooms.map(room => 
      room.id === id ? { ...room, [field]: value } : room
    ));
  };

  const removeRoom = (id) => {
    const room = rooms.find(r => r.id === id);
    const roomName = room?.name || `Room ${id}`;
    
    if (rooms.length === 1) {
      alert('You must have at least one room. Please add another room before deleting this one.');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete "${roomName}"? This will also remove all line items associated with this room.`)) {
      setRooms(rooms.filter(room => room.id !== id));
      // Remove line items for this room
      setRoomLineItems(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
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
  // Get all line items across all rooms for calculations
  const getAllLineItems = () => {
    return Object.values(roomLineItems).flat();
  };

  const addLineItem = (roomId) => {
    const roomItems = roomLineItems[roomId] || [];
    const newItem = {
      id: Date.now() + Math.random(), // Unique ID
      item: '',
      uom: '',
      price: 0,
      qty: 1
    };
    setRoomLineItems(prev => ({
      ...prev,
      [roomId]: [...roomItems, newItem]
    }));
  };

  const updateLineItem = (roomId, itemId, field, value) => {
    setRoomLineItems(prev => {
      const roomItems = prev[roomId] || [];
      return {
        ...prev,
        [roomId]: roomItems.map(item => {
          if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        
        // If item name changed, update UOM and price
        if (field === 'item' && value && PRICE_LIST[value]) {
          updated.uom = PRICE_LIST[value].uom;
          updated.price = PRICE_LIST[value].price;
        }
        
        return updated;
      }
      return item;
        })
      };
    });
  };

  const removeLineItem = (roomId, itemId) => {
    setRoomLineItems(prev => {
      const roomItems = prev[roomId] || [];
      if (roomItems.length > 0) {
        return {
          ...prev,
          [roomId]: roomItems.filter(item => item.id !== itemId)
        };
      }
      return prev;
    });
  };

  const calculateLineTotal = (item) => {
    return (parseFloat(item.price) || 0) * (parseFloat(item.qty) || 0);
  };

  // Calculate Totals
  const calculateTotals = () => {
    const allLineItems = getAllLineItems();
    const subTotal = allLineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
    
    // Surcharge calculation
    let surchargeCount = 0;
    if (jobDetails.afterHours === 'Yes') surchargeCount += 1;
    if (jobDetails.waterCategory === 'Cat 3') surchargeCount += 1;
    
    const surchargeAmount = subTotal * 0.30 * surchargeCount;
    const subTotalWithSurcharge = subTotal + surchargeAmount;
    
    // Tax calculation - only on materials, not labor
    const materialsTotal = allLineItems.reduce((sum, item) => {
      if (MATERIAL_ITEMS.includes(item.item)) {
        return sum + calculateLineTotal(item);
      }
      return sum;
    }, 0);
    
    const taxAmount = materialsTotal * 0.0975; // 9.75% tax on materials only
    const grandTotal = subTotalWithSurcharge + taxAmount;
    
    return {
      subTotal: subTotalWithSurcharge,
      surchargeAmount,
      taxableBase: materialsTotal, // Now shows materials total instead of 25% of subtotal
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
    
    // Add room summary with square footage
    const validRooms = rooms.filter(r => r.name && r.length && r.width);
    if (validRooms.length > 0) {
      const totalSF = validRooms.reduce((sum, room) => {
        const metrics = calculateRoomMetrics(room);
        return sum + metrics.sf;
      }, 0);
      
      const roomCount = validRooms.length;
      scopeText += ` Mitigation needed for approximately ${Math.round(totalSF).toLocaleString()} square feet in ${roomCount} ${roomCount === 1 ? 'room' : 'rooms'}.`;
    }
    
    scopeText += `\n\nAdditional work may be required based on findings during the mitigation process.`;
    
    setJobDetails({ ...jobDetails, scopeDescription: scopeText });
  };

  const totals = calculateTotals();

  return (
    <div className="page-container estimating-page">
      <div className="estimate-container">
        <h1>SPWC Estimate Tool v2</h1>

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
            <button onClick={() => saveEstimate(false)}>💾 Save Estimate</button>
            <button onClick={generateAndSavePDF}>📄 Generate PDF</button>
            <button onClick={deleteEstimate} className="delete-btn">🗑️ Delete Selected</button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '10px' }}>
            <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => {
                  setAutoSaveEnabled(e.target.checked);
                  if (e.target.checked && !currentEstimateId) {
                    alert('Please save the estimate first to enable auto-save');
                    setAutoSaveEnabled(false);
                  }
                }}
              />
              <span style={{ fontSize: '0.9rem' }}>Auto-save</span>
            </label>
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
            <label htmlFor="property-address">
              Property Address
              {autocompleteStatus === 'ready' && <span style={{ color: '#22c55e', marginLeft: '8px', fontSize: '0.8em' }}>✓ Autocomplete active</span>}
              {autocompleteStatus === 'loading' && <span style={{ color: '#f59e0b', marginLeft: '8px', fontSize: '0.8em' }}>Loading...</span>}
              {autocompleteStatus === 'error' && <span style={{ color: '#ef4444', marginLeft: '8px', fontSize: '0.8em' }}>⚠ API Error</span>}
              {autocompleteStatus === 'unavailable' && <span style={{ color: '#94a3b8', marginLeft: '8px', fontSize: '0.8em' }}>Manual entry</span>}
            </label>
            <input
              type="text"
              id="property-address"
              ref={addressInputRef}
              value={jobDetails.propertyAddress}
              onChange={(e) => setJobDetails({ ...jobDetails, propertyAddress: e.target.value })}
              placeholder={autocompleteStatus === 'ready' ? "Start typing address..." : "Enter full address manually"}
              autoComplete="off"
            />
            {autocompleteStatus === 'error' && (
              <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                Google Maps API error. Please enter address manually or check browser console for details.
              </small>
            )}
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
              <option value="net15">Net 15</option>
              <option value="net30">Net 30</option>
              <option value="net45">Net 45</option>
              <option value="net60">Net 60</option>
              <option value="dueOnCompletion">Due on Completion</option>
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
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="button-row">
          <button onClick={addRoom} className="add-btn">+ Add Room</button>
        </div>

        {/* Line Items by Room */}
        <h2>Mitigation Action Line Items by Room</h2>
        {rooms.map(room => {
          const roomItems = roomLineItems[room.id] || [];
          return (
            <div key={room.id} style={{ marginBottom: '30px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px' }}>
              <h3 style={{ marginTop: '0', marginBottom: '15px', color: '#1e293b' }}>
                {room.name || `Room ${room.id}`}
              </h3>
        <table className="estimate-table">
          <thead>
            <tr>
                    <th style={{ width: '15%' }}>Room</th>
                    <th style={{ width: '30%' }}>Item Description</th>
              <th style={{ width: '10%' }}>UOM</th>
                    <th style={{ width: '12%' }}>Unit Price</th>
              <th style={{ width: '10%' }}>Quantity</th>
                    <th style={{ width: '13%' }}>Line Total</th>
              <th style={{ width: '10%' }}></th>
            </tr>
          </thead>
          <tbody>
                  {roomItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                        No line items for this room yet. Click "Add Line Item" below to add items.
                      </td>
                    </tr>
                  ) : (
                    roomItems.map(item => {
              const lineTotal = calculateLineTotal(item);
              return (
                <tr key={item.id}>
                          <td>
                            <input
                              type="text"
                              value={room.name || `Room ${room.id}`}
                              readOnly
                              className="readonly"
                              style={{ 
                                fontWeight: '600', 
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                padding: '8px',
                                borderRadius: '4px'
                              }}
                            />
                          </td>
                  <td>
                    <select
                      value={item.item}
                              onChange={(e) => updateLineItem(room.id, item.id, 'item', e.target.value)}
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
                              onChange={(e) => updateLineItem(room.id, item.id, 'qty', e.target.value)}
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
                              onClick={() => removeLineItem(room.id, item.id)}
                      className="remove-btn"
                    >
                      X
                    </button>
                  </td>
                </tr>
              );
                    })
                  )}
          </tbody>
        </table>
              <div className="button-row" style={{ marginTop: '10px' }}>
                <button onClick={() => addLineItem(room.id)} className="add-btn">+ Add Line Item to {room.name || `Room ${room.id}`}</button>
              </div>
            </div>
          );
        })}
        
        <div className="button-row" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={generateAndSavePDF} className="print-btn">📄 Create Customer Estimate</button>
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
            <span className="total-label">Tax (9.75% on materials):</span>
            <span className="total-value">$ {formatCurrency(totals.taxAmount)}</span>
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
