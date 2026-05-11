process.env.MOCK_DB = 'true';
console.log('Starting test...');
try {
  const pool = require('./server/db/pool');
  console.log('Pool loaded successfully');
  require('./server/index.js');
  console.log('Server module loaded');
} catch(e) {
  console.error('Error:', e.message);
  console.error('Stack:', e.stack);
}
