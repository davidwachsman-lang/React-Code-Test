const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/database');

// GET /api/estimates - Get all estimates
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    const result = await pool.request()
      .query(`SELECT EstimateID, CustomerID, JobID, EstimateName, PropertyAddress, 
              TotalAmount, Status, CreatedAt, UpdatedAt
              FROM Estimates 
              ORDER BY CreatedAt DESC`);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching estimates:', error);
    res.status(500).json({ error: 'Failed to fetch estimates', details: error.message });
  }
});

// GET /api/estimates/search - Search estimates
router.get('/search', async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    const searchQuery = `%${req.query.q || ''}%`;
    
    const result = await pool.request()
      .input('search', sql.NVarChar, searchQuery)
      .query(`SELECT EstimateID, CustomerID, JobID, EstimateName, PropertyAddress, 
                     TotalAmount, Status, CreatedAt, UpdatedAt
              FROM Estimates 
              WHERE EstimateName LIKE @search 
                 OR EstimateDescription LIKE @search
                 OR PropertyAddress LIKE @search
              ORDER BY CreatedAt DESC`);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error searching estimates:', error);
    res.status(500).json({ error: 'Failed to search estimates', details: error.message });
  }
});

// GET /api/estimates/:id - Get estimate by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM Estimates WHERE EstimateID = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching estimate:', error);
    res.status(500).json({ error: 'Failed to fetch estimate', details: error.message });
  }
});

// POST /api/estimates - Create new estimate
router.post('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    const { 
      CustomerID, JobID, EstimateName, EstimateDescription, 
      PropertyAddress, EstimateData, TotalAmount, Status 
    } = req.body;
    
    const result = await pool.request()
      .input('CustomerID', sql.Int, CustomerID)
      .input('JobID', sql.Int, JobID || null)
      .input('EstimateName', sql.NVarChar, EstimateName)
      .input('EstimateDescription', sql.NVarChar, EstimateDescription)
      .input('PropertyAddress', sql.NVarChar, PropertyAddress)
      .input('EstimateData', sql.NVarChar, EstimateData)
      .input('TotalAmount', sql.Decimal(10, 2), TotalAmount || 0)
      .input('Status', sql.NVarChar, Status || 'Draft')
      .query(`INSERT INTO Estimates 
              (CustomerID, JobID, EstimateName, EstimateDescription, PropertyAddress, 
               EstimateData, TotalAmount, Status, CreatedAt, UpdatedAt) 
              OUTPUT INSERTED.EstimateID
              VALUES (@CustomerID, @JobID, @EstimateName, @EstimateDescription, @PropertyAddress,
                      @EstimateData, @TotalAmount, @Status, GETDATE(), GETDATE())`);
    
    res.status(201).json({ 
      EstimateID: result.recordset[0].EstimateID, 
      ...req.body
    });
  } catch (error) {
    console.error('Error creating estimate:', error);
    res.status(500).json({ error: 'Failed to create estimate', details: error.message });
  }
});

// PUT /api/estimates/:id - Update estimate
router.put('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    const { 
      EstimateName, EstimateDescription, PropertyAddress, 
      EstimateData, TotalAmount, Status 
    } = req.body;
    
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('EstimateName', sql.NVarChar, EstimateName)
      .input('EstimateDescription', sql.NVarChar, EstimateDescription)
      .input('PropertyAddress', sql.NVarChar, PropertyAddress)
      .input('EstimateData', sql.NVarChar, EstimateData)
      .input('TotalAmount', sql.Decimal(10, 2), TotalAmount)
      .input('Status', sql.NVarChar, Status)
      .query(`UPDATE Estimates 
              SET EstimateName = @EstimateName, EstimateDescription = @EstimateDescription,
                  PropertyAddress = @PropertyAddress, EstimateData = @EstimateData,
                  TotalAmount = @TotalAmount, Status = @Status, UpdatedAt = GETDATE()
              WHERE EstimateID = @id`);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }
    
    res.json({ EstimateID: req.params.id, ...req.body });
  } catch (error) {
    console.error('Error updating estimate:', error);
    res.status(500).json({ error: 'Failed to update estimate', details: error.message });
  }
});

// DELETE /api/estimates/:id - Delete estimate
router.delete('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Estimates WHERE EstimateID = @id');
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }
    
    res.json({ message: 'Estimate deleted successfully' });
  } catch (error) {
    console.error('Error deleting estimate:', error);
    res.status(500).json({ error: 'Failed to delete estimate', details: error.message });
  }
});

module.exports = router;
