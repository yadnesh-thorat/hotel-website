require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
// Serve static uploads folder for photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static frontend files (Monolith support)
const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Ensure uploads directory exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// Setup PostgreSQL Database (Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Connected to PostgreSQL (Neon) Database');
  
  // Create tables on connection
  const initDb = async () => {
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          username TEXT PRIMARY KEY
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS trips (
          id TEXT PRIMARY KEY,
          username TEXT REFERENCES users(username),
          name TEXT,
          destination TEXT,
          "startDate" TEXT,
          description TEXT
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          trip_id TEXT REFERENCES trips(id),
          description TEXT,
          amount REAL,
          category TEXT,
          date TEXT
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS photos (
          id SERIAL PRIMARY KEY,
          trip_id TEXT REFERENCES trips(id),
          url TEXT
        );
      `);
      console.log('Database tables initialized');
    } catch (dbErr) {
      console.error('Error initializing data tables', dbErr);
    } finally {
      release();
    }
  };

  initDb();
});

// --- Routes ---
// Health Check API
app.get('/api/status', (req, res) => {
  res.json({ status: 'UP', message: 'Ready to receive trip data' });
});

// Login / Register (creates user if not exists)
app.post('/api/login', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });
  try {
    await pool.query(`INSERT INTO users (username) VALUES ($1) ON CONFLICT DO NOTHING`, [username]);
    res.json({ message: 'Success', username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all trips for a user
app.get('/api/trips/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const tripResult = await pool.query(`SELECT id, username, name, destination, "startDate" as "startDate", description FROM trips WHERE username = $1`, [username]);
    const trips = tripResult.rows;
    console.log(`Fetched ${trips.length} trips for user: ${username}`);
    
    // Fetch expenses and photos for each trip
    for (let trip of trips) {
      const expResult = await pool.query(`SELECT id, description, amount, category, date FROM expenses WHERE trip_id = $1`, [trip.id]);
      trip.expenses = expResult.rows;

      const photoResult = await pool.query(`SELECT url FROM photos WHERE trip_id = $1`, [trip.id]);
      trip.photos = photoResult.rows.map(p => p.url); // flatten
    }

    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new trip
app.post('/api/trips', async (req, res) => {
  const { id, username, name, destination, startDate, description } = req.body;
  try {
    console.log(`Creating trip: ${name} (ID: ${id}) for user: ${username}`);
    await pool.query(
      `INSERT INTO trips (id, username, name, destination, "startDate", description) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, username, name, destination, startDate, description]
    );
    res.json({ message: 'Trip created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Full update of a trip (easiest way to handle the current structure from frontend)
app.put('/api/trips/:id', async (req, res) => {
  const { id } = req.params;
  const { name, destination, startDate, description, expenses, photos } = req.body;
  
  // Use a transaction since we do multiple queries
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update trip details
    await client.query(
      `UPDATE trips SET name = $1, destination = $2, "startDate" = $3, description = $4 WHERE id = $5`,
      [name, destination, startDate, description, id]
    );

    // Replace expenses
    await client.query(`DELETE FROM expenses WHERE trip_id = $1`, [id]);
    for (let exp of expenses) {
      await client.query(
        `INSERT INTO expenses (id, trip_id, description, amount, category, date) VALUES ($1, $2, $3, $4, $5, $6)`,
        [exp.id, id, exp.description, exp.amount, exp.category, exp.date]
      );
    }

    // Replace photos
    await client.query(`DELETE FROM photos WHERE trip_id = $1`, [id]);
    for (let photo of photos) {
       // if it's a new base64 photo (not existing url), we save it to disk locally 
       // NOTE: In production you might upload to S3 instead of local disk
       let photoUrl = photo;
       if (photo.startsWith('data:image')) {
         const matches = photo.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
         if (matches && matches.length === 3) {
           const ext = matches[1].split('/')[1] || 'png';
           const buffer = Buffer.from(matches[2], 'base64');
           const filename = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
           const filepath = path.join(__dirname, 'uploads', filename);
           fs.writeFileSync(filepath, buffer);
           photoUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
         }
       }
       await client.query(`INSERT INTO photos (trip_id, url) VALUES ($1, $2)`, [id, photoUrl]);
    }

    console.log(`Updating trip: ${id} (${name})`);
    await client.query('COMMIT');
    res.json({ message: 'Trip updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// CATCH-ALL FOR REACT (Must be last)
app.get('/*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 2rem;">
        <h1>Frontend Build Missing</h1>
        <p>The <code>dist</code> folder was not found at: <code>${distPath}</code></p>
        <p>Please ensure you have run <code>npm run build</code> before starting the server.</p>
      </div>
    `);
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
