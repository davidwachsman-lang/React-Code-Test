const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/database');

const getPool = async () => {
  const pool = await poolPromise;
  if (!pool) {
    throw new Error('Database connection not available');
  }
  return pool;
};

const baseJobSelect = `
  SELECT 
    JobID AS id,
    JobNumber AS jobNumber,
    Customer AS customer,
    CustomerID AS customerId,
    Address AS address,
    Type AS type,
    Priority AS priority,
    Estimate AS estimate,
    Division AS division,
    Status AS status,
    CreatedAt AS createdAt,
    UpdatedAt AS updatedAt
  FROM Jobs
`;

// GET /api/jobs - Get all jobs
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`${baseJobSelect} ORDER BY CreatedAt DESC`);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs', details: error.message });
  }
});

// GET /api/jobs/division/:division - Get jobs by division
router.get('/division/:division', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('division', sql.NVarChar, req.params.division)
      .query(`${baseJobSelect} WHERE Division = @division ORDER BY CreatedAt DESC`);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching jobs by division:', error);
    res.status(500).json({ error: 'Failed to fetch jobs', details: error.message });
  }
});

// GET /api/jobs/status/:status - Get jobs by status
router.get('/status/:status', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('status', sql.NVarChar, req.params.status)
      .query(`${baseJobSelect} WHERE Status = @status ORDER BY CreatedAt DESC`);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching jobs by status:', error);
    res.status(500).json({ error: 'Failed to fetch jobs', details: error.message });
  }
});

// GET /api/jobs/:id - Get job by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`${baseJobSelect} WHERE JobID = @id`);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job', details: error.message });
  }
});

// POST /api/jobs - Create new job
router.post('/', async (req, res) => {
  try {
    const pool = await getPool();
    const {
      jobNumber,
      customer,
      customerId,
      address,
      type,
      priority,
      estimate,
      division,
      status = 'pending'
    } = req.body;
    
    const result = await pool.request()
      .input('jobNumber', sql.NVarChar, jobNumber)
      .input('customer', sql.NVarChar, customer)
      .input('customerId', sql.Int, customerId)
      .input('address', sql.NVarChar, address)
      .input('type', sql.NVarChar, type)
      .input('priority', sql.NVarChar, priority)
      .input('estimate', sql.Decimal(10, 2), estimate || 0)
      .input('division', sql.NVarChar, division)
      .input('status', sql.NVarChar, status)
      .query(`INSERT INTO Jobs 
              (JobNumber, Customer, CustomerID, Address, Type, Priority, Estimate, Division, Status, CreatedAt, UpdatedAt)
              OUTPUT INSERTED.JobID AS id
              VALUES (@jobNumber, @customer, @customerId, @address, @type, @priority, @estimate, @division, @status, GETDATE(), GETDATE())`);
    
    res.status(201).json({
      id: result.recordset[0].id,
      jobNumber,
      customer,
      customerId,
      address,
      type,
      priority,
      estimate,
      division,
      status,
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job', details: error.message });
  }
});

// PUT /api/jobs/:id - Update job
router.put('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const {
      jobNumber,
      customer,
      customerId,
      address,
      type,
      priority,
      estimate,
      division,
      status
    } = req.body;

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('jobNumber', sql.NVarChar, jobNumber)
      .input('customer', sql.NVarChar, customer)
      .input('customerId', sql.Int, customerId)
      .input('address', sql.NVarChar, address)
      .input('type', sql.NVarChar, type)
      .input('priority', sql.NVarChar, priority)
      .input('estimate', sql.Decimal(10, 2), estimate || 0)
      .input('division', sql.NVarChar, division)
      .input('status', sql.NVarChar, status)
      .query(`UPDATE Jobs
              SET JobNumber = @jobNumber,
                  Customer = @customer,
                  CustomerID = @customerId,
                  Address = @address,
                  Type = @type,
                  Priority = @priority,
                  Estimate = @estimate,
                  Division = @division,
                  Status = @status,
                  UpdatedAt = GETDATE()
              OUTPUT INSERTED.JobID AS id,
                     INSERTED.JobNumber AS jobNumber,
                     INSERTED.Customer AS customer,
                     INSERTED.CustomerID AS customerId,
                     INSERTED.Address AS address,
                     INSERTED.Type AS type,
                     INSERTED.Priority AS priority,
                     INSERTED.Estimate AS estimate,
                     INSERTED.Division AS division,
                     INSERTED.Status AS status,
                     INSERTED.UpdatedAt AS updatedAt
              WHERE JobID = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job', details: error.message });
  }
});

// PATCH /api/jobs/:id/status - Update job status
router.patch('/:id/status', async (req, res) => {
  try {
    const pool = await getPool();
    const { status } = req.body;

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('status', sql.NVarChar, status)
      .query(`UPDATE Jobs
              SET Status = @status,
                  UpdatedAt = GETDATE()
              OUTPUT INSERTED.JobID AS id,
                     INSERTED.Status AS status
              WHERE JobID = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({ error: 'Failed to update job status', details: error.message });
  }
});

// DELETE /api/jobs/:id - Delete job
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Jobs WHERE JobID = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job', details: error.message });
  }
});

module.exports = router;
