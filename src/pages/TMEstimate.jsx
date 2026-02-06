import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import equipmentCatalogService from '../services/equipmentCatalogService';
import laborPricingService from '../services/laborPricingService';
import './Page.css';
import './TMEstimate.css';

const miscellaneousItems = [
  { id: 'airfare', name: 'Airfare', fields: ['QTY', 'Round Trip Cost'], formula: 'QTY × Round Trip Cost' },
  { id: 'lodging', name: 'Lodging', fields: ['# Rooms', 'Billing Rate', '# of Days'], formula: '# Rooms × Billing Rate × # of Days' },
  { id: 'perDiem', name: 'Per Diem', fields: ['# People', 'Daily Rate', '# of Days'], formula: '# People × Daily Rate × # of Days' },
  { id: 'mobilization', name: 'Mobilization', fields: ['# People', 'Daily Rate', 'Round Trip'], formula: '# People × Daily Rate × Round Trip' },
  { id: 'fuel', name: 'Fuel', fields: ['# Gallons', 'Gallon Rate', '# of Days'], formula: '# Gallons × Gallon Rate × # of Days' },
  { id: 'misc', name: 'Misc.', fields: ['QTY', 'Daily Rate', '# of Days'], formula: 'QTY × Daily Rate × # of Days' }
];

function TMEstimate() {
  const [projectName, setProjectName] = useState('');
  const [estimatorName, setEstimatorName] = useState('');
  const [schedules, setSchedules] = useState({
    A: [], // Labor
    B: [], // Consumables
    C: [], // Equipment
    D: [], // Subcontractors
    E: miscellaneousItems.map(item => ({
      id: item.id,
      itemId: item.id,
      description: item.name,
      value1: '0',
      value2: '0',
      value3: '0'
    }))  // Miscellaneous - pre-populated with 6 items
  });
  const [consumablesPercentage, setConsumablesPercentage] = useState(10); // Default 10%
  const [equipmentCatalog, setEquipmentCatalog] = useState([]);
  const [laborPricingCatalog, setLaborPricingCatalog] = useState([]);
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(null);
  const [expandedSchedules, setExpandedSchedules] = useState({
    A: true,
    B: true,
    C: true,
    D: true,
    E: true
  });

  const scheduleTypes = [
    { id: 'A', name: 'Labor', fields: ['Description', 'QTY', 'Hours/Day', 'Days', 'Rate'] },
    { id: 'B', name: 'Consumables', fields: ['Description', 'Quantity', 'Unit Cost'] },
    { id: 'C', name: 'Equipment', fields: ['Description', 'Days', 'Daily Rate'] },
    { id: 'D', name: 'Subcontractors', fields: ['Description', 'QTY', 'Daily Rate', 'Number of Days'] },
    { id: 'E', name: 'Miscellaneous', fields: ['Description', 'Amount'] }
  ];

  // Load equipment and labor pricing catalogs on mount
  useEffect(() => {
    loadEquipmentCatalog();
    loadLaborPricingCatalog();
  }, []);

  const loadEquipmentCatalog = async () => {
    try {
      const equipment = await equipmentCatalogService.getAllEquipment();
      setEquipmentCatalog(equipment);
    } catch (error) {
      console.error('Error loading equipment catalog:', error);
    }
  };

  const loadLaborPricingCatalog = async () => {
    try {
      const laborPricing = await laborPricingService.getAllLaborPricing();
      setLaborPricingCatalog(laborPricing);
    } catch (error) {
      console.error('Error loading labor pricing catalog:', error);
    }
  };

  const addLineItem = (scheduleId) => {
    const schedule = scheduleTypes.find(s => s.id === scheduleId);
    const newItem = {
      id: Date.now(),
      description: '',
      value1: '',
      value2: '',
      value3: '' // For Schedule D (Number of Days)
    };

    setSchedules(prev => ({
      ...prev,
      [scheduleId]: [...prev[scheduleId], newItem]
    }));
  };

  const addEquipmentFromCatalog = (equipment) => {
    const newItem = {
      id: Date.now(),
      description: equipment.equipment_name,
      value1: '1', // Quantity
      value2: '1', // Days
      dailyRate: equipment.daily_rate, // Fixed daily rate from catalog
      equipmentId: equipment.id,
      category: equipment.category
    };

    setSchedules(prev => ({
      ...prev,
      C: [...prev.C, newItem]
    }));
  };

  const addLaborFromCatalog = (labor) => {
    const newItem = {
      id: Date.now(),
      description: labor.labor_type,
      qty: '0', // Number of laborers
      hoursPerDay: '0', // Hours per day
      days: '0', // Number of days
      hourlyRate: labor.hourly_rate, // Fixed hourly rate from catalog
      laborId: labor.id,
      category: labor.category
    };

    setSchedules(prev => ({
      ...prev,
      A: [...prev.A, newItem]
    }));
  };

  const isEquipmentSelected = (equipmentId) => {
    return schedules.C.some(item => item.equipmentId === equipmentId);
  };

  const removeLineItem = (scheduleId, itemId) => {
    setSchedules(prev => ({
      ...prev,
      [scheduleId]: prev[scheduleId].filter(item => item.id !== itemId)
    }));
  };

  const updateLineItem = (scheduleId, itemId, field, value) => {
    setSchedules(prev => ({
      ...prev,
      [scheduleId]: prev[scheduleId].map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  const selectEquipmentFromCatalog = (itemId, equipment) => {
    setSchedules(prev => ({
      ...prev,
      C: prev.C.map(item =>
        item.id === itemId ? {
          ...item,
          description: equipment.equipment_name,
          value2: equipment.daily_rate.toString(),
          value1: item.value1 || '1' // Default to 1 day if not set
        } : item
      )
    }));
    setShowEquipmentPicker(null);
  };

  const calculateLineTotal = (scheduleId, item) => {
    const val1 = parseFloat(item.value1) || 0;
    const val2 = parseFloat(item.value2) || 0;
    const val3 = parseFloat(item.value3) || 0;

    if (scheduleId === 'E') {
      // Miscellaneous: different calculations for different items
      if (item.itemId === 'airfare') {
        // Airfare: QTY × Round Trip Cost
        return val1 * val2;
      } else {
        // All others: value1 × value2 × value3
        return val1 * val2 * val3;
      }
    }

    if (scheduleId === 'D') {
      // Subcontractors: QTY × Daily Rate × Number of Days
      return val1 * val2 * val3;
    }

    if (scheduleId === 'C') {
      // Equipment: Qty × Days × Daily Rate
      const qty = val1;
      const days = val2;
      const dailyRate = parseFloat(item.dailyRate) || 0;
      return qty * days * dailyRate;
    }

    if (scheduleId === 'A') {
      // Labor: QTY × (Regular Hours + Overtime Hours) × Days
      // Regular hours: up to 8 hours per day at regular rate
      // Overtime hours: hours over 8 per day at 1.5x rate
      const qty = parseFloat(item.qty) || 1;
      const hoursPerDay = parseFloat(item.hoursPerDay) || 0;
      const days = parseFloat(item.days) || 1;
      const hourlyRate = parseFloat(item.hourlyRate) || 0;

      // Calculate regular hours (up to 8 per day)
      const regularHoursPerDay = Math.min(hoursPerDay, 8);
      const regularTotal = qty * regularHoursPerDay * hourlyRate * days;

      // Calculate overtime hours (over 8 per day at 1.5x rate)
      const overtimeHoursPerDay = Math.max(0, hoursPerDay - 8);
      const overtimeTotal = qty * overtimeHoursPerDay * hourlyRate * 1.5 * days;

      return regularTotal + overtimeTotal;
    }

    return val1 * val2; // Multiply for other schedules
  };

  const calculateScheduleTotal = (scheduleId) => {
    // Special handling for Schedule B (Consumables) - calculate as percentage of Labor
    if (scheduleId === 'B') {
      const laborTotal = schedules.A.reduce((sum, item) => {
        return sum + calculateLineTotal('A', item);
      }, 0);
      return (laborTotal * consumablesPercentage) / 100;
    }

    return schedules[scheduleId].reduce((sum, item) => {
      return sum + calculateLineTotal(scheduleId, item);
    }, 0);
  };

  const calculateGrandTotal = () => {
    return Object.keys(schedules).reduce((sum, scheduleId) => {
      return sum + calculateScheduleTotal(scheduleId);
    }, 0);
  };

  const toggleSchedule = (scheduleId) => {
    setExpandedSchedules(prev => ({
      ...prev,
      [scheduleId]: !prev[scheduleId]
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const generatePDFContent = () => {
    const grandTotal = calculateGrandTotal();

    let content = `T&M ESTIMATE\n\n`;
    content += `Project: ${projectName || 'Untitled Project'}\n`;
    if (estimatorName) content += `Estimator: ${estimatorName}\n`;
    content += `Date: ${new Date().toLocaleDateString()}\n`;
    content += `\n${'='.repeat(80)}\n\n`;

    scheduleTypes.forEach(schedule => {
      const items = schedules[schedule.id];
      const scheduleTotal = calculateScheduleTotal(schedule.id);

      // Always show Schedule B if there's labor
      if (items.length > 0 || (schedule.id === 'B' && schedules.A.length > 0)) {
        content += `SCHEDULE ${schedule.id}: ${schedule.name.toUpperCase()}\n`;
        content += `${'-'.repeat(80)}\n`;

        // Special handling for Schedule B (Consumables)
        if (schedule.id === 'B') {
          const laborTotal = calculateScheduleTotal('A');
          content += `Consumables calculated as ${consumablesPercentage}% of Labor Total\n`;
          content += `  Labor Total: ${formatCurrency(laborTotal)}\n`;
          content += `  Percentage: ${consumablesPercentage}%\n`;
          content += `  Total: ${formatCurrency(scheduleTotal)}\n\n`;
        }

        items.forEach(item => {
          if (item.description) {
            const lineTotal = calculateLineTotal(schedule.id, item);
            content += `${item.description}\n`;

            if (schedule.id === 'E') {
              // Miscellaneous: show formula based on item type
              const miscItem = miscellaneousItems.find(m => m.id === item.itemId);
              if (miscItem) {
                if (item.itemId === 'airfare') {
                  content += `  ${miscItem.fields[0]}: ${parseFloat(item.value1) || 0} × ${miscItem.fields[1]}: ${formatCurrency(parseFloat(item.value2) || 0)}\n`;
                } else {
                  content += `  ${miscItem.fields[0]}: ${parseFloat(item.value1) || 0} × ${miscItem.fields[1]}: ${formatCurrency(parseFloat(item.value2) || 0)} × ${miscItem.fields[2]}: ${parseFloat(item.value3) || 0}\n`;
                }
              }
            } else if (schedule.id === 'D') {
              // Subcontractors: show QTY × Daily Rate × Number of Days
              const qty = parseFloat(item.value1) || 0;
              const dailyRate = parseFloat(item.value2) || 0;
              const days = parseFloat(item.value3) || 0;
              content += `  QTY: ${qty} × Daily Rate: ${formatCurrency(dailyRate)} × Days: ${days}\n`;
            } else if (schedule.id === 'A') {
              // Labor: show QTY × Hours/Day × Days with overtime breakdown
              const qty = parseFloat(item.qty) || 1;
              const hoursPerDay = parseFloat(item.hoursPerDay) || 0;
              const days = parseFloat(item.days) || 1;
              const hourlyRate = parseFloat(item.hourlyRate) || 0;
              const regularHoursPerDay = Math.min(hoursPerDay, 8);
              const overtimeHoursPerDay = Math.max(0, hoursPerDay - 8);
              
              content += `  QTY: ${qty} × Hrs/Day: ${hoursPerDay} × Days: ${days} × Rate: ${formatCurrency(hourlyRate)}/hr\n`;
              if (overtimeHoursPerDay > 0) {
                content += `  Regular: ${qty} × ${regularHoursPerDay}hrs × ${days}days × ${formatCurrency(hourlyRate)} = ${formatCurrency(qty * regularHoursPerDay * hourlyRate * days)}\n`;
                content += `  Overtime (1.5x): ${qty} × ${overtimeHoursPerDay}hrs × ${days}days × ${formatCurrency(hourlyRate * 1.5)} = ${formatCurrency(qty * overtimeHoursPerDay * hourlyRate * 1.5 * days)}\n`;
              }
            } else {
              content += `  ${schedule.fields[1]}: ${item.value1 || '0'} × ${schedule.fields[2]}: ${formatCurrency(parseFloat(item.value2) || 0)}\n`;
            }
            content += `  Total: ${formatCurrency(lineTotal)}\n\n`;
          }
        });

        content += `Schedule ${schedule.id} Total: ${formatCurrency(scheduleTotal)}\n`;
        content += `\n`;
      }
    });

    content += `${'='.repeat(80)}\n`;
    content += `GRAND TOTAL: ${formatCurrency(grandTotal)}\n`;
    content += `${'='.repeat(80)}\n`;

    return content;
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const grandTotal = calculateGrandTotal();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('T&M ESTIMATE', pageWidth / 2, yPos, { align: 'center' });

    yPos += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    // Project Info
    doc.text(`Project: ${projectName || 'Untitled Project'}`, 20, yPos);
    yPos += 6;
    if (estimatorName) {
      doc.text(`Estimator: ${estimatorName}`, 20, yPos);
      yPos += 6;
    }
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 10;

    // Line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Schedules
    scheduleTypes.forEach(schedule => {
      const items = schedules[schedule.id];
      const scheduleTotal = calculateScheduleTotal(schedule.id);

      // Skip Schedule B rendering in the loop - we'll show it differently
      if (schedule.id === 'B') {
        return;
      }

      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Schedule Header
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Schedule ${schedule.id}: ${schedule.name}`, 20, yPos);
      doc.text(formatCurrency(scheduleTotal), pageWidth - 20, yPos, { align: 'right' });
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');

      if (items.length === 0) {
        doc.setTextColor(150, 150, 150);
        doc.text('No items', 25, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 6;
      } else {
        items.forEach(item => {
          // Check if we need a new page
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          const lineTotal = calculateLineTotal(schedule.id, item);

          // Item description
          doc.text(`• ${item.description || 'Untitled'}`, 25, yPos);
          yPos += 5;

          // Item details based on schedule type
          if (schedule.id === 'E') {
            // Miscellaneous: show formula based on item type
            const miscItem = miscellaneousItems.find(m => m.id === item.itemId);
            if (miscItem) {
              doc.setTextColor(100, 100, 100);
              if (item.itemId === 'airfare') {
                doc.text(`  ${miscItem.fields[0]}: ${parseFloat(item.value1) || 0} × ${miscItem.fields[1]}: ${formatCurrency(parseFloat(item.value2) || 0)}`, 30, yPos);
              } else {
                doc.text(`  ${miscItem.fields[0]}: ${parseFloat(item.value1) || 0} × ${miscItem.fields[1]}: ${formatCurrency(parseFloat(item.value2) || 0)} × ${miscItem.fields[2]}: ${parseFloat(item.value3) || 0}`, 30, yPos);
              }
            }
          } else if (schedule.id === 'D') {
            // Subcontractors: show QTY × Daily Rate × Number of Days
            const qty = parseFloat(item.value1) || 0;
            const dailyRate = parseFloat(item.value2) || 0;
            const days = parseFloat(item.value3) || 0;
            doc.setTextColor(100, 100, 100);
            doc.text(`  QTY: ${qty} × Daily Rate: ${formatCurrency(dailyRate)} × Days: ${days}`, 30, yPos);
          } else if (schedule.id === 'C') {
            // Equipment: show Qty × Days × Daily Rate
            const qty = parseFloat(item.value1) || 0;
            const days = parseFloat(item.value2) || 0;
            const dailyRate = parseFloat(item.dailyRate) || 0;
            doc.setTextColor(100, 100, 100);
            doc.text(`  Qty: ${qty} × Days: ${days} × Rate: ${formatCurrency(dailyRate)}/day`, 30, yPos);
          } else if (schedule.id === 'A') {
            // Labor: show QTY × Hours/Day × Days with overtime breakdown
            const qty = parseFloat(item.qty) || 1;
            const hoursPerDay = parseFloat(item.hoursPerDay) || 0;
            const days = parseFloat(item.days) || 1;
            const hourlyRate = parseFloat(item.hourlyRate) || 0;
            const regularHoursPerDay = Math.min(hoursPerDay, 8);
            const overtimeHoursPerDay = Math.max(0, hoursPerDay - 8);
            
            doc.setTextColor(100, 100, 100);
            doc.text(`  QTY: ${qty} × Hrs/Day: ${hoursPerDay} × Days: ${days} × Rate: ${formatCurrency(hourlyRate)}/hr`, 30, yPos);
            if (overtimeHoursPerDay > 0) {
              yPos += 4;
              doc.text(`  Regular: ${qty} × ${regularHoursPerDay}hrs × ${days}days × ${formatCurrency(hourlyRate)} = ${formatCurrency(qty * regularHoursPerDay * hourlyRate * days)}`, 30, yPos);
              yPos += 4;
              doc.text(`  Overtime (1.5x): ${qty} × ${overtimeHoursPerDay}hrs × ${days}days × ${formatCurrency(hourlyRate * 1.5)} = ${formatCurrency(qty * overtimeHoursPerDay * hourlyRate * 1.5 * days)}`, 30, yPos);
            }
          } else {
            doc.setTextColor(100, 100, 100);
            doc.text(`  ${schedule.fields[1]}: ${item.value1 || '0'} × ${schedule.fields[2]}: ${formatCurrency(parseFloat(item.value2) || 0)}`, 30, yPos);
          }

          // Line total
          doc.setTextColor(0, 0, 0);
          doc.text(`Total: ${formatCurrency(lineTotal)}`, pageWidth - 20, yPos, { align: 'right' });
          doc.setTextColor(0, 0, 0);
          yPos += 7;
        });
      }

      yPos += 3;

      // Add Schedule B (Consumables) after Schedule A if there's labor
      if (schedule.id === 'A' && schedules.A.length > 0) {
        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        const consumablesTotal = calculateScheduleTotal('B');
        const laborTotal = calculateScheduleTotal('A');

        // Schedule B Header
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Schedule B: Consumables', 20, yPos);
        doc.text(formatCurrency(consumablesTotal), pageWidth - 20, yPos, { align: 'right' });
        yPos += 8;

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Calculated as ${consumablesPercentage}% of Labor Total`, 25, yPos);
        yPos += 5;
        doc.text(`Labor Total: ${formatCurrency(laborTotal)} × ${consumablesPercentage}% = ${formatCurrency(consumablesTotal)}`, 25, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 10;
      }
    });

    // Grand Total
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }

    yPos += 5;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('GRAND TOTAL:', 20, yPos);
    doc.text(formatCurrency(grandTotal), pageWidth - 20, yPos, { align: 'right' });

    // Save PDF
    const fileName = `${projectName || 'estimate'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>T&M Estimate Calculator</h1>
          <p>Create detailed Time & Materials estimates with five cost schedules</p>
        </div>
        <div className="header-actions">
          <div className="action-buttons">
            <button onClick={downloadPDF} className="action-button download-button">
              Download PDF
            </button>
          </div>
        </div>
      </div>

      <div className="tm-estimate-content">
        {/* Project Info */}
        <div className="project-info-card">
          <label htmlFor="projectName">Project Name</label>
          <input
            id="projectName"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter project name"
            className="project-name-input"
          />

          <div className="project-info-field">
            <label htmlFor="estimatorName">Estimator Name</label>
            <input
              id="estimatorName"
              type="text"
              value={estimatorName}
              onChange={(e) => setEstimatorName(e.target.value)}
              placeholder="Enter estimator name"
              className="project-name-input"
            />
          </div>
        </div>

        {/* Schedule Cards */}
        {scheduleTypes.map((schedule) => {
          const scheduleTotal = calculateScheduleTotal(schedule.id);
          const items = schedules[schedule.id];

          return (
            <div key={schedule.id} className="schedule-card">
              <div className="schedule-header">
                <div className="schedule-title">
                  <span className="schedule-id">Schedule {schedule.id}</span>
                  <h3>{schedule.name}</h3>
                </div>
                <div className="schedule-total">
                  {formatCurrency(scheduleTotal)}
                </div>
              </div>

              <div className="schedule-body">
                {/* Special rendering for Consumables (Schedule B) */}
                {schedule.id === 'B' ? (
                  <div className="consumables-percentage-container">
                    <div className="percentage-selector">
                      <label htmlFor="consumablesPercentage">Consumables Percentage of Labor Total:</label>
                      <select
                        id="consumablesPercentage"
                        value={consumablesPercentage}
                        onChange={(e) => setConsumablesPercentage(Number(e.target.value))}
                        className="percentage-select"
                      >
                        <option value={5}>5%</option>
                        <option value={10}>10%</option>
                        <option value={15}>15%</option>
                        <option value={20}>20%</option>
                      </select>
                    </div>
                    <div className="consumables-calculation">
                      <div className="calculation-row">
                        <span>Labor Total:</span>
                        <span className="calculation-value">{formatCurrency(calculateScheduleTotal('A'))}</span>
                      </div>
                      <div className="calculation-row">
                        <span>Percentage:</span>
                        <span className="calculation-value">{consumablesPercentage}%</span>
                      </div>
                      <div className="calculation-row total-row">
                        <span>Consumables Total:</span>
                        <span className="calculation-value">{formatCurrency(scheduleTotal)}</span>
                      </div>
                    </div>
                  </div>
                ) : schedule.id === 'A' ? (
                  /* Special rendering for Labor (Schedule A) */
                  <div className="equipment-table-container">
                    {laborPricingCatalog.length === 0 ? (
                      <div className="no-items-message">
                        No labor pricing in catalog. Add items in Supabase.
                      </div>
                    ) : (
                      <>
                        <div className="equipment-catalog-table">
                          <div className="equipment-table-header">
                            <div>Labor Type</div>
                            <div>$/Hour</div>
                            <div>QTY</div>
                            <div>Hrs/Day</div>
                            <div>Days</div>
                            <div>Total</div>
                            <div></div>
                          </div>
                          {laborPricingCatalog.map((labor) => {
                            const selectedItem = schedules.A.find(item => item.laborId === labor.id);
                            const isSelected = !!selectedItem;

                            return (
                              <div 
                                key={labor.id} 
                                className={`equipment-table-row ${isSelected ? 'selected' : 'clickable-row'}`}
                                onClick={!isSelected ? () => addLaborFromCatalog(labor) : undefined}
                                style={!isSelected ? { cursor: 'pointer' } : {}}
                              >
                                <div className="equipment-table-name">
                                  {labor.labor_type}
                                </div>
                                <div className="equipment-table-rate">
                                  {formatCurrency(parseFloat(labor.hourly_rate))}
                                </div>
                                {isSelected ? (
                                  <>
                                    <div className="equipment-table-input">
                                      <input
                                        type="number"
                                        value={selectedItem.qty || '0'}
                                        onChange={(e) => updateLineItem('A', selectedItem.id, 'qty', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        min="0"
                                        step="1"
                                        placeholder="QTY"
                                      />
                                    </div>
                                    <div className="equipment-table-input">
                                      <input
                                        type="number"
                                        value={selectedItem.hoursPerDay || '0'}
                                        onChange={(e) => updateLineItem('A', selectedItem.id, 'hoursPerDay', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        min="0"
                                        step="0.25"
                                        placeholder="Hrs/Day"
                                      />
                                    </div>
                                    <div className="equipment-table-input">
                                      <input
                                        type="number"
                                        value={selectedItem.days || '0'}
                                        onChange={(e) => updateLineItem('A', selectedItem.id, 'days', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        min="0"
                                        step="1"
                                        placeholder="Days"
                                      />
                                    </div>
                                    <div className="equipment-table-total">
                                      {formatCurrency(calculateLineTotal('A', selectedItem))}
                                    </div>
                                    <div className="equipment-table-action">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeLineItem('A', selectedItem.id);
                                        }}
                                        className="remove-button-small"
                                        title="Remove"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="equipment-table-empty">-</div>
                                    <div className="equipment-table-empty">-</div>
                                    <div className="equipment-table-empty">-</div>
                                    <div className="equipment-table-empty">-</div>
                                    <div className="equipment-table-empty">-</div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                ) : schedule.id === 'C' ? (
                  <div className="equipment-table-container">
                    {equipmentCatalog.length === 0 ? (
                      <div className="no-items-message">
                        No equipment in catalog. Add items in Supabase.
                      </div>
                    ) : (
                      <>
                        <div className="equipment-catalog-table">
                          <div className="equipment-table-header">
                            <div>Equipment</div>
                            <div>Category</div>
                            <div>$/Day</div>
                            <div>Qty</div>
                            <div>Days</div>
                            <div>Total</div>
                            <div></div>
                          </div>
                          {equipmentCatalog.map((equipment) => {
                            const selectedItem = schedules.C.find(item => item.equipmentId === equipment.id);
                            const isSelected = !!selectedItem;

                            return (
                              <div
                                key={equipment.id}
                                className={`equipment-table-row ${isSelected ? 'selected' : 'clickable-row'}`}
                                onClick={!isSelected ? () => addEquipmentFromCatalog(equipment) : undefined}
                                style={!isSelected ? { cursor: 'pointer' } : {}}
                              >
                                <div className="equipment-table-name">
                                  {equipment.equipment_name}
                                </div>
                                <div className="equipment-table-category">
                                  {equipment.category || '-'}
                                </div>
                                <div className="equipment-table-rate">
                                  {formatCurrency(parseFloat(equipment.daily_rate))}
                                </div>
                                {isSelected ? (
                                  <>
                                    <div className="equipment-table-input">
                                      <input
                                        type="number"
                                        value={selectedItem.value1}
                                        onChange={(e) => updateLineItem('C', selectedItem.id, 'value1', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        min="1"
                                        step="1"
                                        placeholder="Qty"
                                      />
                                    </div>
                                    <div className="equipment-table-input">
                                      <input
                                        type="number"
                                        value={selectedItem.value2}
                                        onChange={(e) => updateLineItem('C', selectedItem.id, 'value2', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        min="1"
                                        step="1"
                                        placeholder="Days"
                                      />
                                    </div>
                                    <div className="equipment-table-total">
                                      {formatCurrency(calculateLineTotal('C', selectedItem))}
                                    </div>
                                    <div className="equipment-table-action">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeLineItem('C', selectedItem.id);
                                        }}
                                        className="remove-button-small"
                                        title="Remove"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="equipment-table-empty">-</div>
                                    <div className="equipment-table-empty">-</div>
                                    <div className="equipment-table-empty">-</div>
                                    <div className="equipment-table-action">
                                      {/* Empty action cell for unselected rows - click anywhere on row to add */}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                ) : schedule.id === 'E' ? (
                  /* Special rendering for Miscellaneous (Schedule E) */
                  <div className="equipment-table-container">
                    <div className="misc-items-container">
                      {items.map((item) => {
                        const miscItem = miscellaneousItems.find(m => m.id === item.itemId);
                        if (!miscItem) return null;

                        return (
                          <div key={item.id} className="misc-item-card">
                            <div className="misc-item-header">
                              {item.itemId === 'misc' ? (
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => updateLineItem('E', item.id, 'description', e.target.value)}
                                  placeholder="Enter description"
                                  className="misc-item-name-input"
                                />
                              ) : (
                                <span className="misc-item-name">{item.description}</span>
                              )}
                              <span className="misc-item-total">{formatCurrency(calculateLineTotal('E', item))}</span>
                            </div>
                            <div className="misc-item-fields">
                              <div className="misc-field">
                                <label>{miscItem.fields[0]}</label>
                                <input
                                  type="number"
                                  value={item.value1}
                                  onChange={(e) => updateLineItem('E', item.id, 'value1', e.target.value)}
                                  min="0"
                                  step="0.01"
                                  placeholder="0"
                                />
                              </div>
                              <div className="misc-field">
                                <label>{miscItem.fields[1]}</label>
                                <input
                                  type="number"
                                  value={item.value2}
                                  onChange={(e) => updateLineItem('E', item.id, 'value2', e.target.value)}
                                  min="0"
                                  step="0.01"
                                  placeholder="0"
                                />
                              </div>
                              {miscItem.fields[2] && (
                                <div className="misc-field">
                                  <label>{miscItem.fields[2]}</label>
                                  <input
                                    type="number"
                                    value={item.value3}
                                    onChange={(e) => updateLineItem('E', item.id, 'value3', e.target.value)}
                                    min="0"
                                    step="1"
                                    placeholder="0"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Original rendering for other schedules (Schedule B only now)
                  <>
                    {items.length === 0 ? (
                      <div className="no-items-message">
                        No line items added yet
                      </div>
                    ) : (
                      <div className="line-items-list">
                        {items.map((item) => (
                          <div key={item.id} className="line-item">
                            <div className="line-item-row">
                              <div className="description-field">
                                <input
                                  type="text"
                                  placeholder={schedule.fields[0]}
                                  value={item.description}
                                  onChange={(e) => updateLineItem(schedule.id, item.id, 'description', e.target.value)}
                                  className="description-input"
                                />
                              </div>

                              {schedule.id === 'E' ? (
                                // Single amount field for Miscellaneous
                                <div className="input-with-label">
                                  <label className="field-label">{schedule.fields[1]}</label>
                                  <input
                                    type="number"
                                    placeholder="0.00"
                                    value={item.value1}
                                    onChange={(e) => updateLineItem(schedule.id, item.id, 'value1', e.target.value)}
                                    className="amount-input"
                                    step="0.01"
                                  />
                                </div>
                              ) : schedule.id === 'D' ? (
                                // Three fields for Subcontractors: QTY, Daily Rate, Number of Days
                                <>
                                  <div className="input-with-label">
                                    <label className="field-label">{schedule.fields[1]}</label>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={item.value1}
                                      onChange={(e) => updateLineItem(schedule.id, item.id, 'value1', e.target.value)}
                                      className="quantity-input"
                                      step="1"
                                    />
                                  </div>
                                  <div className="input-with-label">
                                    <label className="field-label">{schedule.fields[2]}</label>
                                    <input
                                      type="number"
                                      placeholder="0.00"
                                      value={item.value2}
                                      onChange={(e) => updateLineItem(schedule.id, item.id, 'value2', e.target.value)}
                                      className="rate-input"
                                      step="0.01"
                                    />
                                  </div>
                                  <div className="input-with-label">
                                    <label className="field-label">{schedule.fields[3]}</label>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={item.value3}
                                      onChange={(e) => updateLineItem(schedule.id, item.id, 'value3', e.target.value)}
                                      className="quantity-input"
                                      step="1"
                                    />
                                  </div>
                                </>
                              ) : (
                                // Two fields for other schedules
                                <>
                                  <div className="input-with-label">
                                    <label className="field-label">{schedule.fields[1]}</label>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={item.value1}
                                      onChange={(e) => updateLineItem(schedule.id, item.id, 'value1', e.target.value)}
                                      className="quantity-input"
                                      step="0.01"
                                    />
                                  </div>
                                  <div className="input-with-label">
                                    <label className="field-label">{schedule.fields[2]}</label>
                                    <input
                                      type="number"
                                      placeholder="0.00"
                                      value={item.value2}
                                      onChange={(e) => updateLineItem(schedule.id, item.id, 'value2', e.target.value)}
                                      className="rate-input"
                                      step="0.01"
                                    />
                                  </div>
                                </>
                              )}

                              <div className="line-total">
                                {formatCurrency(calculateLineTotal(schedule.id, item))}
                              </div>

                              <button
                                onClick={() => removeLineItem(schedule.id, item.id)}
                                className="remove-button"
                                title="Remove line item"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => addLineItem(schedule.id)}
                      className="add-line-button"
                    >
                      + Add Line Item
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Grand Total */}
        <div className="grand-total-display">
          <span className="total-label">Grand Total:</span>
          <span className="total-amount">{formatCurrency(calculateGrandTotal())}</span>
        </div>
      </div>

      {/* Equipment Picker Modal */}
      {showEquipmentPicker && (
        <div className="modal-overlay">
          <div className="modal-content equipment-picker-modal">
            <div className="modal-header">
              <h3>Select Equipment</h3>
              <button
                className="modal-close"
                onClick={() => setShowEquipmentPicker(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="equipment-list">
                {equipmentCatalog.length === 0 ? (
                  <p className="modal-note">No equipment items in catalog. Add items in Supabase.</p>
                ) : (
                  equipmentCatalog.map(equipment => (
                    <button
                      key={equipment.id}
                      className="equipment-item"
                      onClick={() => selectEquipmentFromCatalog(showEquipmentPicker, equipment)}
                    >
                      <div className="equipment-info">
                        <div className="equipment-name">{equipment.equipment_name}</div>
                        {equipment.category && (
                          <div className="equipment-category">{equipment.category}</div>
                        )}
                      </div>
                      <div className="equipment-rate">
                        {formatCurrency(parseFloat(equipment.daily_rate))}/day
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TMEstimate;
