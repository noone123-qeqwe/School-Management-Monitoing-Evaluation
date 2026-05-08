// Use mock pool for development when DATABASE_URL is not properly configured
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('user:password')) {
  console.log('Using mock database for development...');
  module.exports = require('./mock-pool');
} else {
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  });

  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL error:', err);
  });

  module.exports = pool;
}
