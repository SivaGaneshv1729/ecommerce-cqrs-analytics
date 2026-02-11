const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.READ_DATABASE_URL || 'postgresql://user:password@localhost:5433/read_db',
});

pool.on('connect', () => {
  console.log('✓ Connected to read database');
});

pool.on('error', (err) => {
  console.error('Read database connection error:', err);
});

module.exports = pool;
