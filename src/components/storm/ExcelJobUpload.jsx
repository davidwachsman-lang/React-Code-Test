import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { batchGeocode } from '../../services/geocodingService';
import './ExcelJobUpload.css';

// Color palette for dynamic color coding
const COLOR_PALETTE = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#6366f1', // Indigo
];

function ExcelJobUpload({ onJobsLoaded, onCancel }) {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState('upload'); // 'upload', 'sheet_select', 'mapping', 'processing', 'complete'
  const [fileName, setFileName] = useState('');
  const [workbook, setWorkbook] = useState(null); // Store workbook for sheet selection
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [rawData, setRawData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    customerName: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    jobNumber: '',
    notes: ''
  });
  const [colorColumn, setColorColumn] = useState(''); // Column to use for color coding
  const [processedJobs, setProcessedJobs] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [colorMapping, setColorMapping] = useState({}); // Maps unique values to colors

  // Get unique values from the selected color column
  const uniqueColorValues = useMemo(() => {
    if (!colorColumn || !rawData.length) return [];
    const values = new Set();
    rawData.forEach(row => {
      const val = row[colorColumn];
      if (val && String(val).trim() !== '') {
        values.add(String(val).trim());
      }
    });
    return Array.from(values).sort();
  }, [colorColumn, rawData]);

  // Generate color mapping when unique values change
  useMemo(() => {
    const mapping = {};
    uniqueColorValues.forEach((value, index) => {
      mapping[value] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });
    setColorMapping(mapping);
  }, [uniqueColorValues]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const fileExtension = file.name.split('.').pop().toLowerCase();
    console.log('Processing file:', file.name, 'Extension:', fileExtension, 'Size:', file.size);

    const reader = new FileReader();
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      setError('Failed to read the file. Please try again.');
    };

    reader.onload = (event) => {
      try {
        let workbook;
        const data = new Uint8Array(event.target.result);
        
        // Try different parsing options based on file type
        if (fileExtension === 'csv') {
          // For CSV files, read as text first
          const textDecoder = new TextDecoder('utf-8');
          const csvText = textDecoder.decode(data);
          workbook = XLSX.read(csvText, { type: 'string' });
        } else {
          // For Excel files (.xlsx, .xls)
          workbook = XLSX.read(data, { 
            type: 'array',
            cellDates: true,
            cellNF: false,
            cellText: false
          });
        }
        
        console.log('Workbook parsed successfully. Sheets:', workbook.SheetNames);
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setError('No sheets found in the file.');
          return;
        }

        // Store workbook for later use
        setWorkbook(workbook);
        setSheetNames(workbook.SheetNames);

        // If multiple sheets, let user select; otherwise auto-select the only sheet
        if (workbook.SheetNames.length > 1) {
          setSelectedSheet(workbook.SheetNames[0]); // Pre-select first sheet
          setStep('sheet_select');
          return;
        }

        // Single sheet - proceed directly to parsing
        const sheetName = workbook.SheetNames[0];
        setSelectedSheet(sheetName);
        parseSheet(workbook, sheetName);
        
      } catch (err) {
        console.error('Error parsing file:', err);
        console.error('Error details:', err.message, err.stack);
        
        // Provide more specific error messages
        if (err.message?.includes('password')) {
          setError('This file appears to be password protected. Please remove the password and try again.');
        } else if (err.message?.includes('Unsupported')) {
          setError('Unsupported file format. Please save the file as .xlsx and try again.');
        } else {
          setError(`Failed to parse file: ${err.message || 'Unknown error'}. Try saving as .xlsx format.`);
        }
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  // Parse a specific sheet from the workbook
  const parseSheet = (wb, sheetName) => {
    setError(null);
    
    try {
      const worksheet = wb.Sheets[sheetName];
      
      if (!worksheet) {
        setError('Could not read the worksheet.');
        return;
      }
      
      // Convert to JSON - include blank rows so we can find the header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        blankrows: true
      });
      
      console.log('JSON data rows (raw):', jsonData.length);
      console.log('First 5 rows:', jsonData.slice(0, 5));
      
      if (!jsonData || jsonData.length < 1) {
        setError('Sheet appears to be empty.');
        return;
      }

      // Find the header row - look for the first row with multiple non-empty cells
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
        const row = jsonData[i];
        if (Array.isArray(row)) {
          const nonEmptyCells = row.filter(cell => 
            cell !== undefined && cell !== null && String(cell).trim() !== ''
          );
          // Consider it a header row if it has at least 2 non-empty cells
          if (nonEmptyCells.length >= 2) {
            headerRowIndex = i;
            console.log('Found header row at index:', i, 'with cells:', nonEmptyCells);
            break;
          }
        }
      }
      
      if (headerRowIndex === -1) {
        setError('Could not find a header row in this sheet. Make sure it has column headers.');
        return;
      }

      // Get headers from the identified row
      const headerRow = jsonData[headerRowIndex];
      const headers = [];
      const headerIndexMap = []; // Track original indices
      
      headerRow.forEach((h, idx) => {
        const headerValue = String(h || '').trim();
        if (headerValue !== '') {
          headers.push(headerValue);
          headerIndexMap.push(idx);
        }
      });
      
      if (headers.length === 0) {
        setError('No column headers found in this sheet.');
        return;
      }
      
      console.log('Headers found:', headers);
      console.log('Header row index:', headerRowIndex);
      setColumns(headers);

      // Get data rows (everything after the header row)
      const dataRows = jsonData.slice(headerRowIndex + 1).map(row => {
        const obj = {};
        headers.forEach((header, idx) => {
          const originalIdx = headerIndexMap[idx];
          const value = Array.isArray(row) ? row[originalIdx] : undefined;
          // Handle different value types
          if (value instanceof Date) {
            obj[header] = value.toLocaleDateString();
          } else if (value !== undefined && value !== null && String(value).trim() !== '') {
            obj[header] = String(value).trim();
          } else {
            obj[header] = '';
          }
        });
        return obj;
      }).filter(row => Object.values(row).some(v => v !== '')); // Filter out empty rows

      console.log('Data rows processed:', dataRows.length);

      if (dataRows.length === 0) {
        setError('No data rows found after the header row in this sheet.');
        return;
      }

      setRawData(dataRows);
      
      // Try to auto-detect column mappings
      const autoMapping = autoDetectColumns(headers);
      setColumnMapping(autoMapping);
      
      setStep('mapping');
    } catch (err) {
      console.error('Error parsing sheet:', err);
      setError(`Failed to parse sheet: ${err.message || 'Unknown error'}`);
    }
  };

  // Handle sheet selection
  const handleSheetSelect = () => {
    if (workbook && selectedSheet) {
      parseSheet(workbook, selectedSheet);
    }
  };

  const autoDetectColumns = (headers) => {
    const mapping = {
      customerName: '',
      street: '',
      city: '',
      state: '',
      zip: '',
      status: '',
      jobNumber: '',
      notes: ''
    };

    const lowerHeaders = headers.map(h => h.toLowerCase());

    // Customer name detection
    const namePatterns = ['customer', 'name', 'client', 'owner'];
    const nameIdx = lowerHeaders.findIndex(h => namePatterns.some(p => h.includes(p)));
    if (nameIdx >= 0) mapping.customerName = headers[nameIdx];

    // Street/address detection
    const streetPatterns = ['street', 'address', 'addr'];
    const streetIdx = lowerHeaders.findIndex(h => streetPatterns.some(p => h.includes(p)));
    if (streetIdx >= 0) mapping.street = headers[streetIdx];

    // City detection
    const cityIdx = lowerHeaders.findIndex(h => h.includes('city'));
    if (cityIdx >= 0) mapping.city = headers[cityIdx];

    // State detection
    const stateIdx = lowerHeaders.findIndex(h => h.includes('state') || h === 'st');
    if (stateIdx >= 0) mapping.state = headers[stateIdx];

    // Zip detection
    const zipPatterns = ['zip', 'postal', 'code'];
    const zipIdx = lowerHeaders.findIndex(h => zipPatterns.some(p => h.includes(p)));
    if (zipIdx >= 0) mapping.zip = headers[zipIdx];

    // Status detection
    const statusIdx = lowerHeaders.findIndex(h => h.includes('status') || h.includes('type'));
    if (statusIdx >= 0) mapping.status = headers[statusIdx];

    // Job number detection
    const jobPatterns = ['job', 'number', 'id', '#'];
    const jobIdx = lowerHeaders.findIndex(h => jobPatterns.some(p => h.includes(p)));
    if (jobIdx >= 0) mapping.jobNumber = headers[jobIdx];

    // Notes detection
    const notesIdx = lowerHeaders.findIndex(h => h.includes('note') || h.includes('comment'));
    if (notesIdx >= 0) mapping.notes = headers[notesIdx];

    return mapping;
  };

  const handleMappingChange = (field, value) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProcessData = async () => {
    // Validate required mappings
    if (!columnMapping.street && !columnMapping.city) {
      setError('Please map at least a street address or city column');
      return;
    }

    setStep('processing');
    setError(null);
    setProgress({ current: 0, total: rawData.length });

    try {
      // Geocode all addresses
      const geocodedData = await batchGeocode(
        rawData,
        columnMapping,
        (current, total) => setProgress({ current, total })
      );

      // Build color mapping for all unique values
      const finalColorMapping = {};
      uniqueColorValues.forEach((value, index) => {
        finalColorMapping[value] = COLOR_PALETTE[index % COLOR_PALETTE.length];
      });

      // Transform to job format - include all raw data for filtering
      const jobs = geocodedData.map((row, index) => {
        const colorValue = colorColumn ? String(row[colorColumn] || '').trim() : '';
        
        // Create rawData object with all original columns for filtering
        const rawFields = {};
        columns.forEach(col => {
          rawFields[col] = row[col] !== undefined ? String(row[col]).trim() : '';
        });
        
        return {
          id: `excel-${index}`,
          customer_name: row[columnMapping.customerName] || 'Unknown',
          property_address: row.fullAddress || '',
          address: row.fullAddress || '',
          colorValue: colorValue, // The value from the selected color column
          color: finalColorMapping[colorValue] || '#6b7280', // The assigned color
          job_number: row[columnMapping.jobNumber] || '',
          notes: row[columnMapping.notes] || '',
          latitude: row.latitude,
          longitude: row.longitude,
          geocodeError: row.geocodeError,
          source: 'excel',
          rawData: rawFields // All original Excel columns for filtering
        };
      });

      setProcessedJobs(jobs);
      setColorMapping(finalColorMapping);
      setStep('complete');
    } catch (err) {
      console.error('Error processing data:', err);
      setError('Failed to process data. Please try again.');
      setStep('mapping');
    }
  };

  const handleConfirm = () => {
    // Pass jobs, color mapping, color column, and all available columns to parent
    onJobsLoaded(processedJobs, colorMapping, colorColumn, columns);
  };

  const handleReset = () => {
    setStep('upload');
    setFileName('');
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setRawData([]);
    setColumns([]);
    setColumnMapping({
      customerName: '',
      street: '',
      city: '',
      state: '',
      zip: '',
      jobNumber: '',
      notes: ''
    });
    setColorColumn('');
    setColorMapping({});
    setProcessedJobs([]);
    setProgress({ current: 0, total: 0 });
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const geocodedCount = processedJobs.filter(j => j.latitude && j.longitude).length;
  const failedCount = processedJobs.length - geocodedCount;

  return (
    <div className="excel-upload-container">
      {step === 'upload' && (
        <div className="upload-step">
          <h3>Upload Excel File</h3>
          <p className="upload-description">
            Upload an Excel file (.xlsx, .xls) or CSV file containing job data with addresses.
          </p>
          <div className="file-input-wrapper">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input" className="file-input-label">
              <span className="file-icon">📁</span>
              <span>Choose File</span>
            </label>
          </div>
          {error && <p className="upload-error">{error}</p>}
          {onCancel && (
            <button className="cancel-btn" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      )}

      {step === 'sheet_select' && (
        <div className="sheet-select-step">
          <h3>Select Sheet</h3>
          <p className="sheet-description">
            Your Excel file has multiple sheets. Select the one containing your job data.
            <br />
            <span className="file-info">File: {fileName}</span>
          </p>
          
          {error && <p className="upload-error">{error}</p>}

          <div className="sheet-options">
            {sheetNames.map((name, index) => (
              <label 
                key={name} 
                className={`sheet-option ${selectedSheet === name ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="sheet"
                  value={name}
                  checked={selectedSheet === name}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                />
                <span className="sheet-icon">📋</span>
                <span className="sheet-name">{name}</span>
                <span className="sheet-index">Sheet {index + 1}</span>
              </label>
            ))}
          </div>

          <div className="sheet-actions">
            <button className="secondary-btn" onClick={handleReset}>
              Back
            </button>
            <button 
              className="primary-btn" 
              onClick={handleSheetSelect}
              disabled={!selectedSheet}
            >
              Use This Sheet
            </button>
          </div>
        </div>
      )}

      {step === 'mapping' && (
        <div className="mapping-step">
          <h3>Map Columns</h3>
          <p className="mapping-description">
            Select which columns in your Excel file correspond to each field.
            <br />
            <span className="file-info">File: {fileName} ({rawData.length} rows)</span>
          </p>
          
          {error && <p className="upload-error">{error}</p>}

          <div className="mapping-grid">
            <div className="mapping-field">
              <label>Customer Name</label>
              <select
                value={columnMapping.customerName}
                onChange={(e) => handleMappingChange('customerName', e.target.value)}
              >
                <option value="">-- Select --</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div className="mapping-field">
              <label>Street Address *</label>
              <select
                value={columnMapping.street}
                onChange={(e) => handleMappingChange('street', e.target.value)}
              >
                <option value="">-- Select --</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div className="mapping-field">
              <label>City *</label>
              <select
                value={columnMapping.city}
                onChange={(e) => handleMappingChange('city', e.target.value)}
              >
                <option value="">-- Select --</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div className="mapping-field">
              <label>State</label>
              <select
                value={columnMapping.state}
                onChange={(e) => handleMappingChange('state', e.target.value)}
              >
                <option value="">-- Select --</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div className="mapping-field">
              <label>Zip Code</label>
              <select
                value={columnMapping.zip}
                onChange={(e) => handleMappingChange('zip', e.target.value)}
              >
                <option value="">-- Select --</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div className="mapping-field color-column-field">
              <label>Color Code By (optional)</label>
              <select
                value={colorColumn}
                onChange={(e) => setColorColumn(e.target.value)}
              >
                <option value="">-- Select Column --</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              <span className="field-hint">
                Select a column to color-code markers on the map
              </span>
            </div>

            <div className="mapping-field">
              <label>Job Number</label>
              <select
                value={columnMapping.jobNumber}
                onChange={(e) => handleMappingChange('jobNumber', e.target.value)}
              >
                <option value="">-- Select --</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div className="mapping-field">
              <label>Notes</label>
              <select
                value={columnMapping.notes}
                onChange={(e) => handleMappingChange('notes', e.target.value)}
              >
                <option value="">-- Select --</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Color Preview */}
          {colorColumn && uniqueColorValues.length > 0 && (
            <div className="color-preview-section">
              <h4>Color Legend Preview ({uniqueColorValues.length} unique values)</h4>
              <div className="color-preview-grid">
                {uniqueColorValues.map((value, index) => (
                  <div key={value} className="color-preview-item">
                    <span 
                      className="color-dot" 
                      style={{ backgroundColor: COLOR_PALETTE[index % COLOR_PALETTE.length] }}
                    />
                    <span className="color-label">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mapping-preview">
            <h4>Preview (first 3 rows)</h4>
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Address</th>
                  {colorColumn && <th>Color By</th>}
                </tr>
              </thead>
              <tbody>
                {rawData.slice(0, 3).map((row, idx) => (
                  <tr key={idx}>
                    <td>{row[columnMapping.customerName] || '-'}</td>
                    <td>
                      {[
                        row[columnMapping.street],
                        row[columnMapping.city],
                        row[columnMapping.state],
                        row[columnMapping.zip]
                      ].filter(Boolean).join(', ') || '-'}
                    </td>
                    {colorColumn && (
                      <td>
                        <span 
                          className="color-dot-inline"
                          style={{ backgroundColor: colorMapping[row[colorColumn]] || '#6b7280' }}
                        />
                        {row[colorColumn] || '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mapping-actions">
            <button className="secondary-btn" onClick={handleReset}>
              Back
            </button>
            <button className="primary-btn" onClick={handleProcessData}>
              Process & Geocode
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="processing-step">
          <h3>Processing Data</h3>
          <div className="progress-container">
            <div 
              className="progress-bar"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <p className="progress-text">
            Geocoding addresses: {progress.current} of {progress.total}
          </p>
          <p className="processing-note">
            Converting addresses to map coordinates...
          </p>
        </div>
      )}

      {step === 'complete' && (
        <div className="complete-step">
          <h3>Processing Complete</h3>
          <div className="results-summary">
            <div className="result-stat success">
              <span className="stat-value">{geocodedCount}</span>
              <span className="stat-label">Successfully geocoded</span>
            </div>
            <div className="result-stat warning">
              <span className="stat-value">{failedCount}</span>
              <span className="stat-label">Could not be mapped</span>
            </div>
          </div>
          
          {failedCount > 0 && (
            <p className="warning-note">
              Some addresses could not be converted to coordinates and will not appear on the map.
            </p>
          )}

          <div className="complete-actions">
            <button className="secondary-btn" onClick={handleReset}>
              Upload Different File
            </button>
            <button className="primary-btn" onClick={handleConfirm}>
              Show on Map ({geocodedCount} jobs)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExcelJobUpload;
