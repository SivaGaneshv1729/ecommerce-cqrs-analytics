const { Pool } = require('pg');

const readPool = new Pool({
  connectionString: process.env.READ_DATABASE_URL || 'postgresql://user:password@localhost:5433/read_db',
});

readPool.on('connect', () => {
  console.log('✓ Connected to read database');
});

readPool.on('error', (err) => {
  console.error('Read database connection error:', err);
});

module.exports = { readPool };
