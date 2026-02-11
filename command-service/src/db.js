const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/write_db',
});

// Test connection
pool.on('connect', () => {
  console.log('✓ Connected to write database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

module.exports = pool;
