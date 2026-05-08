// Use mock pool for development when DATABASE_URL is not properly configured
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL starts with:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'NOT SET');

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('user:password')) {
  console.log('⚠️  Using MOCK database - set DATABASE_URL to use real PostgreSQL');
  module.exports = require('./mock-pool');
} else {
  console.log('✅ Using REAL PostgreSQL database');
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
