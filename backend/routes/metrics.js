const express = require('express');
const router = express.Router();
const db = require('../config/database');

// In-memory storage for demo
let metrics = [
  { id: 1, division: 'mit', subdivision: 'mit', description: 'Forms signed', currentValue: 10, targetValue: 50, priority: 'urgent', isChecked: false },
  { id: 2, division: 'recon', subdivision: 'recon', description: 'Estimates', currentValue: 6, targetValue: 35, priority: 'urgent', isChecked: false }
];
let nextId = 3;

// GET /api/metrics - Get all metrics
router.get('/', async (req, res) => {
  try {
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// GET /api/metrics/division/:division - Get metrics by division
router.get('/division/:division', async (req, res) => {
  try {
    const filtered = metrics.filter(m => m.division === req.params.division);
    res.json(filtered);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// PATCH /api/metrics/:id/status - Update metric checked status
router.patch('/:id/status', async (req, res) => {
  try {
    const index = metrics.findIndex(m => m.id === parseInt(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Metric not found' });
    }
    
    metrics[index].isChecked = req.body.isChecked;
    metrics[index].updatedAt = new Date();
    
    res.json(metrics[index]);
  } catch (error) {
    console.error('Error updating metric status:', error);
    res.status(500).json({ error: 'Failed to update metric status' });
  }
});

// GET /api/metrics/urgent - Get urgent metrics only
router.get('/urgent', async (req, res) => {
  try {
    const filtered = metrics.filter(m => m.priority === 'urgent' && !m.isChecked);
    res.json(filtered);
  } catch (error) {
    console.error('Error fetching urgent metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// POST /api/metrics - Create new metric
router.post('/', async (req, res) => {
  try {
    const newMetric = {
      id: nextId++,
      ...req.body,
      createdAt: new Date()
    };
    
    metrics.push(newMetric);
    res.status(201).json(newMetric);
  } catch (error) {
    console.error('Error creating metric:', error);
    res.status(500).json({ error: 'Failed to create metric' });
  }
});

// DELETE /api/metrics/:id - Delete metric
router.delete('/:id', async (req, res) => {
  try {
    const index = metrics.findIndex(m => m.id === parseInt(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Metric not found' });
    }
    
    metrics.splice(index, 1);
    res.json({ message: 'Metric deleted successfully' });
  } catch (error) {
    console.error('Error deleting metric:', error);
    res.status(500).json({ error: 'Failed to delete metric' });
  }
});

module.exports = router;
