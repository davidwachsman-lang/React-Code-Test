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

const baseCustomerSelect = `
  SELECT 
    CustomerID AS id,
    Name AS name,
    Email AS email,
    Phone AS phone,
    Address AS address,
    Notes AS notes,
    CreatedAt AS createdAt,
    UpdatedAt AS updatedAt
  FROM Customers
`;

// GET /api/customers - Get all customers
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`${baseCustomerSelect} ORDER BY CreatedAt DESC`);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers', details: error.message });
  }
});

// GET /api/customers/search - Search customers
router.get('/search', async (req, res) => {
  try {
    const pool = await getPool();
    const searchTerm = `%${req.query.q || ''}%`;
    const result = await pool.request()
      .input('search', sql.NVarChar, searchTerm)
      .query(`${baseCustomerSelect}
              WHERE Name LIKE @search
                 OR Email LIKE @search
                 OR Phone LIKE @search
              ORDER BY CreatedAt DESC`);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error searching customers:', error);
    res.status(500).json({ error: 'Failed to search customers', details: error.message });
  }
});

// GET /api/customers/:id - Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`${baseCustomerSelect} WHERE CustomerID = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer', details: error.message });
  }
});

// POST /api/customers - Create new customer
router.post('/', async (req, res) => {
  try {
    const pool = await getPool();
    const { name, email, phone, address, notes } = req.body;

    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address)
      .input('notes', sql.NVarChar, notes)
      .query(`INSERT INTO Customers (Name, Email, Phone, Address, Notes, CreatedAt, UpdatedAt)
              OUTPUT INSERTED.CustomerID AS id
              VALUES (@name, @email, @phone, @address, @notes, GETDATE(), GETDATE())`);
    
    res.status(201).json({
      id: result.recordset[0].id,
      name,
      email,
      phone,
      address,
      notes,
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer', details: error.message });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const { name, email, phone, address, notes } = req.body;

    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address)
      .input('notes', sql.NVarChar, notes)
      .query(`UPDATE Customers
              SET Name = @name,
                  Email = @email,
                  Phone = @phone,
                  Address = @address,
                  Notes = @notes,
                  UpdatedAt = GETDATE()
              OUTPUT INSERTED.CustomerID AS id,
                     INSERTED.Name AS name,
                     INSERTED.Email AS email,
                     INSERTED.Phone AS phone,
                     INSERTED.Address AS address,
                     INSERTED.Notes AS notes,
                     INSERTED.UpdatedAt AS updatedAt
              WHERE CustomerID = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer', details: error.message });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Customers WHERE CustomerID = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer', details: error.message });
  }
});

module.exports = router;
