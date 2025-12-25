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
    { name: 'Target Identified', count: 0, color: '#f97316', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', percentage: 95 },
    { name: 'Insight Meeting Scheduled', count: 0, color: '#fb923c', gradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)', percentage: 80 },
    { name: 'Insight Meeting Completed', count: 0, color: '#fbbf24', gradient: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)', percentage: 70 },
    { name: 'Presentation to Client', count: 0, color: '#fde047', gradient: 'linear-gradient(135deg, #fde047 0%, #fbbf24 100%)', percentage: 60 },
    { name: 'Initial Commitment', count: 0, color: '#60a5fa', gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', percentage: 40 },
    { name: 'First Referral Received', count: 0, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', percentage: 25 },
    { name: 'Closed / First Job Reviewed', count: 0, color: '#1e40af', gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', percentage: 10 },
    { name: 'MSA Signed', count: 0, color: '#1e3a8a', gradient: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)', percentage: 5 }
  ];

  const displayLayers = layers.length > 0 ? layers : defaultLayers;

  return (
    <div className="sales-funnel-wrapper">
      <div className="funnel-container">
        {displayLayers.map((layer, index) => {
          // Use percentage to create funnel effect - each bar gets progressively narrower
          // Scale down percentages to make bars narrower (multiply by 0.5 to make them half width)
          const widthPercent = (layer.percentage || 100) * 0.5;
          
          const backgroundStyle = layer.gradient 
            ? { background: layer.gradient }
            : { backgroundColor: layer.color || '#3b82f6' };
          
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

