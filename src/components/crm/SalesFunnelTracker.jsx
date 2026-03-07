import React, { useState, useEffect } from 'react';
import { FUNNEL_STAGES } from '../../constants/crmConstants';

function SalesFunnelTracker({ recordId }) {
  const storageKey = `crm-funnel-${recordId}`;

  const [activeIndex, setActiveIndex] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? parseInt(saved, 10) : -1;
  });

  useEffect(() => {
    if (activeIndex >= 0) {
      localStorage.setItem(storageKey, activeIndex.toString());
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [activeIndex, storageKey]);

  const handleToggle = (index) => {
    if (index <= activeIndex) {
      setActiveIndex(index === 0 && activeIndex === 0 ? -1 : index - 1);
    } else {
      setActiveIndex(index);
    }
  };

  return (
    <div className="detail-section">
      <h3>Sales Funnel</h3>
      <div className="funnel-tracker-row">
        {FUNNEL_STAGES.map((stage, index) => {
          const isActive = index <= activeIndex;
          return (
            <button
              key={stage.name}
              className={`funnel-stage-pill ${isActive ? 'active' : ''}`}
              style={{
                '--stage-color': stage.color,
                background: isActive ? stage.color : 'rgba(30, 41, 59, 0.8)',
                color: isActive ? '#0f172a' : '#9ca3af',
                borderColor: isActive ? stage.color : 'rgba(55, 65, 81, 0.8)',
              }}
              onClick={() => handleToggle(index)}
              title={stage.name}
            >
              <span className="funnel-stage-indicator" />
              <span className="funnel-stage-name">{stage.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SalesFunnelTracker;
