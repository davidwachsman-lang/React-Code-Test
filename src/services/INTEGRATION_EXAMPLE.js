// Example: Estimating Component with API Integration
// This shows how to replace localStorage with API calls

import { estimateService } from '../services';

// REPLACE THIS:
const saveEstimate = () => {
  const estimates = JSON.parse(localStorage.getItem('spwc_estimates') || '{}');
  estimates[name] = data;
  localStorage.setItem('spwc_estimates', JSON.stringify(estimates));
};

// WITH THIS:
const saveEstimate = async () => {
  try {
    const data = {
      name: estimateName,
      jobDetails,
      rooms,
      lineItems
    };
    
    const result = await estimateService.create(data);
    console.log('Saved to database:', result);
    setSaveStatus('✓ Estimate saved to database');
    loadSavedEstimates(); // Refresh list
  } catch (error) {
    console.error('Error saving:', error);
    setSaveStatus('❌ Error saving estimate');
    alert('Failed to save estimate: ' + error.message);
  }
};

// REPLACE THIS:
const loadSavedEstimates = () => {
  const estimates = JSON.parse(localStorage.getItem('spwc_estimates') || '{}');
  setSavedEstimates(Object.keys(estimates).sort());
};

// WITH THIS:
const loadSavedEstimates = async () => {
  try {
    const estimates = await estimateService.getAll();
    setSavedEstimates(estimates.map(e => e.name).sort());
  } catch (error) {
    console.error('Error loading estimates:', error);
  }
};

// REPLACE THIS:
const loadEstimate = (name) => {
  const estimates = JSON.parse(localStorage.getItem('spwc_estimates') || '{}');
  const data = estimates[name];
  // ... set state
};

// WITH THIS:
const loadEstimate = async (estimateId) => {
  try {
    const estimate = await estimateService.getById(estimateId);
    setEstimateName(estimate.name);
    setJobDetails(estimate.jobDetails);
    setRooms(estimate.rooms);
    setLineItems(estimate.lineItems);
    setSaveStatus('✓ Estimate loaded from database');
  } catch (error) {
    console.error('Error loading estimate:', error);
    alert('Failed to load estimate: ' + error.message);
  }
};

// REPLACE THIS:
const deleteEstimate = () => {
  const estimates = JSON.parse(localStorage.getItem('spwc_estimates') || '{}');
  delete estimates[estimateToDelete];
  localStorage.setItem('spwc_estimates', JSON.stringify(estimates));
};

// WITH THIS:
const deleteEstimate = async (estimateId) => {
  if (confirm('Are you sure you want to delete this estimate?')) {
    try {
      await estimateService.delete(estimateId);
      setSaveStatus('✓ Estimate deleted');
      loadSavedEstimates(); // Refresh list
    } catch (error) {
      console.error('Error deleting estimate:', error);
      alert('Failed to delete estimate: ' + error.message);
    }
  }
};

// SEARCH FUNCTIONALITY:
const searchEstimates = async (query) => {
  try {
    const results = await estimateService.search(query);
    setSavedEstimates(results);
  } catch (error) {
    console.error('Error searching:', error);
  }
};
