const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
  console.log('Connection successful!');
  client.query('SELECT NOW()', (err, res) => {
    release();
    if (err) {
      console.error('Query failed:', err.message);
    } else {
      console.log('Query result:', res.rows[0]);
    }
    process.exit(0);
  });
});
