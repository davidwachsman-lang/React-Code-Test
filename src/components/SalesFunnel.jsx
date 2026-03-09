import React from 'react';
import './SalesFunnel.css';

/**
 * Sales Funnel Component - Clean CSS-based design
 * Displays a visual sales funnel with labels on the right
 * 
 * @param {Array} layers - Array of funnel layer objects
 * Each layer should have:
 *   - name: string (layer name)
 *   - count: number (number of items in this stage)
 *   - color: string (optional, hex color for the layer)
 *   - gradient: string (optional, gradient CSS)
 *   - percentage: number (optional, percentage of total)
 * @param {string} salesRep - Selected sales rep filter ('all', 'bri', 'paige', 'matt', 'tony')
 */
function SalesFunnel({ layers = [], salesRep = 'all' }) {
  // Default layers with 7 stages - warm to cool gradient
  const defaultLayers = [
    { name: 'Target Identified', count: 0, color: '#EA580C', percentage: 95 },
    { name: 'Insight Meeting Scheduled', count: 0, color: '#D97706', percentage: 80 },
    { name: 'Insight Meeting Completed', count: 0, color: '#CA8A04', percentage: 70 },
    { name: 'Presentation to Client', count: 0, color: '#16A34A', percentage: 60 },
    { name: 'Initial Commitment', count: 0, color: '#0284C7', percentage: 40 },
    { name: 'First Referral Received', count: 0, color: '#2563EB', percentage: 25 },
    { name: 'Closed / First Job Reviewed', count: 0, color: '#635BFF', percentage: 10 },
    { name: 'MSA Signed', count: 0, color: '#0A2540', percentage: 5 }
  ];

  const displayLayers = layers.length > 0 ? layers : defaultLayers;

  return (
    <div className="sales-funnel-wrapper">
      <div className="funnel-container">
        {displayLayers.map((layer, index) => {
          // Use percentage to create funnel effect - each bar gets progressively narrower
          // Scale down percentages to make bars narrower (multiply by 0.5 to make them half width)
          const widthPercent = (layer.percentage || 100) * 0.5;
          
          const backgroundStyle = { backgroundColor: layer.color || '#635BFF' };
          
          return (
            <div key={index} className="funnel-row">
              <div 
                className="funnel-bar"
                style={{
                  ...backgroundStyle,
                  width: `${widthPercent}%`
                }}
              >
              </div>
              <div className="funnel-label">
                <div className="funnel-label-name">{layer.name}</div>
              </div>
              <div className="funnel-count-display">
                {layer.count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SalesFunnel;

