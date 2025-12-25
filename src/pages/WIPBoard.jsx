import React, { useState } from 'react';
import './Page.css';
import './WIPBoard.css';

function WIPBoard() {
  const [draggedCard, setDraggedCard] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState('mit');
  
  const [mitColumns, setMitColumns] = useState({
    'pending': {
      id: 'pending',
      title: 'Pending',
      color: '#f59e0b',
      cards: [
        { id: 1, jobNumber: 'MIT-001', customer: 'John Smith', address: '123 Main St', type: 'Water Damage', priority: 'high', estimate: 8500 },
        { id: 2, jobNumber: 'MIT-002', customer: 'Jane Doe', address: '456 Oak Ave', type: 'Mold Remediation', priority: 'medium', estimate: 12000 }
      ]
    },
    'wip': {
      id: 'wip',
      title: 'WIP',
      color: '#3b82f6',
      cards: [
        { id: 3, jobNumber: 'MIT-003', customer: 'Bob Johnson', address: '789 Elm St', type: 'Water Damage', priority: 'high', estimate: 15000 },
        { id: 4, jobNumber: 'MIT-004', customer: 'Alice Brown', address: '321 Pine Rd', type: 'Equipment Pickup', priority: 'low', estimate: 3500 }
      ]
    },
    'ready-to-bill': {
      id: 'ready-to-bill',
      title: 'Ready to Bill',
      color: '#8b5cf6',
      cards: [
        { id: 5, jobNumber: 'MIT-005', customer: 'Charlie Wilson', address: '654 Maple Dr', type: 'Water Damage', priority: 'medium', estimate: 9200 }
      ]
    },
    'ar': {
      id: 'ar',
      title: 'AR',
      color: '#10b981',
      cards: [
        { id: 6, jobNumber: 'MIT-006', customer: 'Diana Martinez', address: '987 Cedar Ln', type: 'Water Damage', priority: 'low', estimate: 6800 }
      ]
    }
  });

  const [reconColumns, setReconColumns] = useState({
    'pending': {
      id: 'pending',
      title: 'Pending',
      color: '#f59e0b',
      cards: [
        { id: 101, jobNumber: 'RECON-001', customer: 'Ethan Davis', address: '147 Birch Way', type: 'Fire Restoration', priority: 'high', estimate: 45000 }
      ]
    },
    'wip': {
      id: 'wip',
      title: 'WIP',
      color: '#3b82f6',
      cards: [
        { id: 102, jobNumber: 'RECON-002', customer: 'Fiona Garcia', address: '258 Spruce Ct', type: 'Reconstruction', priority: 'high', estimate: 68000 },
        { id: 103, jobNumber: 'RECON-003', customer: 'George Lee', address: '369 Willow St', type: 'Kitchen Remodel', priority: 'medium', estimate: 32000 }
      ]
    },
    'ready-to-bill': {
      id: 'ready-to-bill',
      title: 'Ready to Bill',
      color: '#8b5cf6',
      cards: [
        { id: 104, jobNumber: 'RECON-004', customer: 'Hannah White', address: '741 Ash Blvd', type: 'Bathroom Rebuild', priority: 'medium', estimate: 28500 }
      ]
    },
    'ar': {
      id: 'ar',
      title: 'AR',
      color: '#10b981',
      cards: [
        { id: 105, jobNumber: 'RECON-005', customer: 'Ian Cooper', address: '852 Oak Park', type: 'Full Restoration', priority: 'low', estimate: 52000 }
      ]
    }
  });

  const [largeLossColumns, setLargeLossColumns] = useState({
    'pending': {
      id: 'pending',
      title: 'Pending',
      color: '#f59e0b',
      cards: [
        { id: 201, jobNumber: 'LL-001', customer: 'Julia Green', address: '963 Pine Valley Apt Complex', type: 'Commercial Fire', priority: 'high', estimate: 285000 },
        { id: 202, jobNumber: 'LL-002', customer: 'Kevin Brown', address: '741 Business Plaza', type: 'Storm Damage', priority: 'high', estimate: 420000 }
      ]
    },
    'wip': {
      id: 'wip',
      title: 'WIP',
      color: '#3b82f6',
      cards: [
        { id: 203, jobNumber: 'LL-003', customer: 'Laura Martinez', address: '258 Industrial Park', type: 'Flood Damage', priority: 'high', estimate: 650000 }
      ]
    },
    'ready-to-bill': {
      id: 'ready-to-bill',
      title: 'Ready to Bill',
      color: '#8b5cf6',
      cards: [
        { id: 204, jobNumber: 'LL-004', customer: 'Mike Johnson', address: '852 Shopping Center', type: 'Hurricane Damage', priority: 'medium', estimate: 575000 }
      ]
    },
    'ar': {
      id: 'ar',
      title: 'AR',
      color: '#10b981',
      cards: [
        { id: 205, jobNumber: 'LL-005', customer: 'Nancy Wilson', address: '369 Office Building', type: 'Water Damage', priority: 'low', estimate: 195000 }
      ]
    }
  });

  // Get current columns based on selected division
  const getCurrentColumns = () => {
    switch(selectedDivision) {
      case 'mit': return mitColumns;
      case 'recon': return reconColumns;
      case 'largeLoss': return largeLossColumns;
      default: return mitColumns;
    }
  };

  const setCurrentColumns = (newColumns) => {
    switch(selectedDivision) {
      case 'mit': setMitColumns(newColumns); break;
      case 'recon': setReconColumns(newColumns); break;
      case 'largeLoss': setLargeLossColumns(newColumns); break;
      default: break;
    }
  };

  const columns = getCurrentColumns();

  const handleDragStart = (e, card, columnId) => {
    setDraggedCard({ card, sourceColumnId: columnId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();
    
    if (!draggedCard) return;
    
    const { card, sourceColumnId } = draggedCard;
    
    if (sourceColumnId === targetColumnId) {
      setDraggedCard(null);
      return;
    }

    const newColumns = { ...columns };
    
    // Remove card from source column
    newColumns[sourceColumnId] = {
      ...newColumns[sourceColumnId],
      cards: newColumns[sourceColumnId].cards.filter(c => c.id !== card.id)
    };
    
    // Add card to target column
    newColumns[targetColumnId] = {
      ...newColumns[targetColumnId],
      cards: [...newColumns[targetColumnId].cards, card]
    };
    
    setCurrentColumns(newColumns);
    setDraggedCard(null);
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#64748b';
    }
  };

  const getTotalEstimate = () => {
    return Object.values(columns).reduce((total, col) => {
      return total + col.cards.reduce((sum, card) => sum + (card.estimate || 0), 0);
    }, 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="page-container wip-board-page">
      <div className="wip-board-header">
        <h1>WIP Board</h1>
        <div className="board-stats">
          <div className="stat-item">
            <span className="stat-label">Job Count:</span>
            <span className="stat-value">{Object.values(columns).reduce((acc, col) => acc + col.cards.length, 0)}</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-label">Estimate Value:</span>
            <span className="stat-value">{formatCurrency(getTotalEstimate())}</span>
          </div>
        </div>
      </div>

      {/* Division Tabs */}
      <div className="division-tabs-wip">
        <button 
          className={`division-tab-wip ${selectedDivision === 'mit' ? 'active' : ''}`}
          onClick={() => setSelectedDivision('mit')}
        >
          <span className="tab-icon">🔧</span>
          MIT
        </button>
        <button 
          className={`division-tab-wip ${selectedDivision === 'recon' ? 'active' : ''}`}
          onClick={() => setSelectedDivision('recon')}
        >
          <span className="tab-icon">🏗️</span>
          RECON
        </button>
        <button 
          className={`division-tab-wip ${selectedDivision === 'largeLoss' ? 'active' : ''}`}
          onClick={() => setSelectedDivision('largeLoss')}
        >
          <span className="tab-icon">📋</span>
          LARGE LOSS
        </button>
      </div>

      <div className="kanban-board">
        {Object.values(columns).map(column => {
          const columnTotal = column.cards.reduce((sum, card) => sum + (card.estimate || 0), 0);
          
          return (
            <div 
              key={column.id}
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="column-header" style={{ borderTopColor: column.color }}>
                <div className="column-header-top">
                  <h3>{column.title}</h3>
                  <span className="card-count">{column.cards.length}</span>
                </div>
                <div className="column-estimate">
                  {formatCurrency(columnTotal)}
                </div>
              </div>
            
            <div className="column-content">
              {column.cards.map(card => (
                <div
                  key={card.id}
                  className="job-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, card, column.id)}
                >
                  <div className="card-header-wip">
                    <span className="job-number">{card.jobNumber}</span>
                    <span 
                      className="priority-badge" 
                      style={{ backgroundColor: getPriorityColor(card.priority) }}
                    >
                      {card.priority}
                    </span>
                  </div>
                  <div className="card-body-wip">
                    <div className="customer-name">{card.customer}</div>
                    <div className="job-address">{card.address}</div>
                    <div className="job-type">{card.type}</div>
                    <div className="job-estimate">{formatCurrency(card.estimate)}</div>
                  </div>
                </div>
              ))}
              
              {column.cards.length === 0 && (
                <div className="empty-column">
                  Drop jobs here
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

export default WIPBoard;
