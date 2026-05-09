if (process.env.MOCK_DB === 'true') {
  module.exports = require('./mock-pool');
} else {
  const { Pool } = require('pg');

  if (!process.env.DATABASE_URL) {
    console.error('❌ FATAL: DATABASE_URL environment variable is not set!');
    console.error('Set DATABASE_URL in your Render environment variables.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  console.log('DATABASE_URL prefix:', process.env.DATABASE_URL.substring(0, 35) + '...');

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
