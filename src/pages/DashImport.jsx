import React, { useRef, useState } from 'react';
import './Page.css';

function DashImport() {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dash Import</h1>
        <p className="page-subtitle">Import data from Dash super reports</p>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current.click()}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: '#fff',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Upload Dash Super Report
        </button>
        {fileName && (
          <p style={{ marginTop: '1rem', color: '#94a3b8' }}>
            Selected: {fileName}
          </p>
        )}
      </div>
    </div>
  );
}

export default DashImport;
