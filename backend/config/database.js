const sql = require('mssql');
require('dotenv').config();

// SQL Server configuration
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Create connection pool
const poolPromise = sql.connect(config)
  .then(pool => {
    console.log('✅ Connected to SQL Server database');
    return pool;
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.log('📝 Check your SQL Server credentials in .env');
    return null;
  });

module.exports = {
  sql,
  poolPromise
};
