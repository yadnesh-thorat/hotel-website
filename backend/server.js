const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const axios = require('axios');
const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_key' });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');


const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Request Logger for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

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

// Handle pool errors to prevent process crash
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

const connectDb = async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL (Neon) Database');
    
    // Create tables on connection
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
        description TEXT,
        "tripNumber" TEXT,
        "originLat" REAL,
        "originLng" REAL,
        "startTime" TEXT,
        "destLat" REAL,
        "destLng" REAL,
        "endTime" TEXT,
        "mode" TEXT,
        "distance" REAL,
        "purpose" TEXT,
        "companions" INTEGER,
        "frequency" TEXT,
        "cost" REAL
      );
    `);

    // Attempt to add columns if table already exists
    const columnsToAdd = [
      `"tripNumber" TEXT`, `"originLat" REAL`, `"originLng" REAL`, `"startTime" TEXT`,
      `"destLat" REAL`, `"destLng" REAL`, `"endTime" TEXT`, `"mode" TEXT`,
      `"distance" REAL`, `"purpose" TEXT`, `"companions" INTEGER`, `"frequency" TEXT`, `"cost" REAL`
    ];
    for (let col of columnsToAdd) {
      try {
        await client.query(`ALTER TABLE trips ADD COLUMN ${col};`);
      } catch (e) {
        // Ignore, column likely already exists
      }
    }

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        trip_id TEXT REFERENCES trips(id),
        hotel_name TEXT,
        check_in TEXT,
        check_out TEXT,
        price REAL,
        booking_ref TEXT
      );
    `);

    console.log('Database tables initialized');
    client.release();
  } catch (err) {
    console.error('Database connection or initialization failed:', err.message);
    // We don't exit the process here, so the server can still serve AI/status routes
  }
};

connectDb();

// Helper for Geocoding using Nominatim
const getCoordinates = async (address) => {
  if (!address) return null;
  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q: address, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'TripLogApp/1.0' }
    });
    if (response.data && response.data.length > 0) {
      return {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon)
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error.message);
  }
  return null;
};

// 1. Hotel Search (Moved to top for priority)
app.get('/api/hotels', async (req, res) => {
  const city = req.query.city;
  console.log(`AI Hotel search request received for city: ${city}`);
  if (!city) return res.status(400).json({ error: 'City is required' });
  
  try {
    const systemPrompt = `You are a travel booking assistant. Return a list of 4 real or realistic hotels for the city: ${city}.
    Your response MUST be ONLY a JSON array of objects.
    Each object must have: 
    - id: unique string (e.g., "h1", "h2")
    - name: hotel name string
    - price: integer (price per night in INR, between 3000 and 25000)
    - rating: float (between 4.0 and 5.0)
    
    Example format:
    [{"id": "h1", "name": "Hotel Luxury", "price": 5000, "rating": 4.5}]`;

    let hotelsText = "";
    
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "system", content: systemPrompt }],
        model: "llama-3.1-8b-instant",
        max_tokens: 500
      });
      hotelsText = chatCompletion.choices[0]?.message?.content || "[]";
    } catch (err) {
      console.warn("Groq failed for hotels, using Gemini fallback");
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      hotelsText = response.text();
    }

    const jsonMatch = hotelsText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const hotels = JSON.parse(jsonMatch[0]);
      res.json(hotels);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('AI Hotel Search Error:', error);
    res.status(500).json({ error: 'Failed to fetch hotels using AI' });
  }
});

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
    const tripResult = await pool.query(`SELECT * FROM trips WHERE username = $1`, [username]);
    const trips = tripResult.rows;
    console.log(`Fetched ${trips.length} trips for user: ${username}`);

    for (let trip of trips) {
      const expResult = await pool.query(`SELECT id, description, amount, category, date FROM expenses WHERE trip_id = $1`, [trip.id]);
      trip.expenses = expResult.rows;

      const photoResult = await pool.query(`SELECT url FROM photos WHERE trip_id = $1`, [trip.id]);
      trip.photos = photoResult.rows.map(p => p.url);

      const bookingResult = await pool.query(`SELECT id, hotel_name as "hotelName", check_in as "checkIn", check_out as "checkOut", price, booking_ref as "bookingRef" FROM bookings WHERE trip_id = $1`, [trip.id]);
      trip.bookings = bookingResult.rows;
    }

    res.json(trips);
  } catch (error) {
    console.error('TRIPS FETCH ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new trip
app.post('/api/trips', async (req, res) => {
  const {
    id, username, name, destination, startDate, description,
    tripNumber, originLat, originLng, startTime, destLat, destLng,
    endTime, mode, distance, purpose, companions, frequency, cost
  } = req.body;
  try {
    let finalDestLat = destLat;
    let finalDestLng = destLng;
    if (destination && (destLat == null || destLng == null)) {
      const coords = await getCoordinates(destination);
      if (coords) {
        finalDestLat = coords.lat;
        finalDestLng = coords.lng;
      }
    }

    await pool.query(
      `INSERT INTO trips (
        id, username, name, destination, "startDate", description,
        "tripNumber", "originLat", "originLng", "startTime",
        "destLat", "destLng", "endTime", "mode", "distance",
        "purpose", "companions", "frequency", "cost"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        id, username, name, destination, startDate, description,
        tripNumber, originLat, originLng, startTime, finalDestLat, finalDestLng,
        endTime, mode, distance, purpose, companions, frequency, cost
      ]
    );
    res.json({ message: 'Trip created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Full update of a trip
app.put('/api/trips/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name, destination, startDate, description, expenses, photos, bookings,
    tripNumber, originLat, originLng, startTime, destLat, destLng,
    endTime, mode, distance, purpose, companions, frequency, cost
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let finalDestLat = destLat;
    let finalDestLng = destLng;
    if (destination && (destLat == null || destLng == null)) {
      const coords = await getCoordinates(destination);
      if (coords) {
        finalDestLat = coords.lat;
        finalDestLng = coords.lng;
      }
    }

    await client.query(
      `UPDATE trips SET 
        name = $1, destination = $2, "startDate" = $3, description = $4,
        "tripNumber" = $5, "originLat" = $6, "originLng" = $7, "startTime" = $8,
        "destLat" = $9, "destLng" = $10, "endTime" = $11, "mode" = $12, "distance" = $13,
        "purpose" = $14, "companions" = $15, "frequency" = $16, "cost" = $17
       WHERE id = $18`,
      [name, destination, startDate, description, tripNumber, originLat, originLng, startTime, finalDestLat, finalDestLng, endTime, mode, distance, purpose, companions, frequency, cost, id]
    );

    await client.query(`DELETE FROM expenses WHERE trip_id = $1`, [id]);
    for (let exp of expenses) {
      await client.query(
        `INSERT INTO expenses (id, trip_id, description, amount, category, date) VALUES ($1, $2, $3, $4, $5, $6)`,
        [exp.id, id, exp.description, exp.amount, exp.category, exp.date]
      );
    }

    await client.query(`DELETE FROM photos WHERE trip_id = $1`, [id]);
    for (let photo of photos) {
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

    if (bookings) {
      await client.query(`DELETE FROM bookings WHERE trip_id = $1`, [id]);
      for (let b of bookings) {
        await client.query(
          `INSERT INTO bookings (id, trip_id, hotel_name, check_in, check_out, price, booking_ref) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [b.id, id, b.hotelName, b.checkIn, b.checkOut, b.price, b.bookingRef]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Trip updated successfully', tripId: id });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Chatbot API Endpoint
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;

  try {
    const systemInstruction = `You are 'TripBuddy', a friendly and direct travel companion.
Your personality:
- You are warm, helpful, and very concise. 🌟
- When a user wants to plan a trip or mentions a destination, propose a trip name, the best hotel, and a total budget.
- Ask: "Would you like me to create this trip plan for you?"
- You MUST provide the JSON block for the trip. This JSON is for the SYSTEM only. 
- IMPORTANT: Do NOT show the JSON to the user. Put it at the end of your message.
- The JSON block for creating a trip MUST be: {"action": "create_trip", "destination": "City Name", "hotel": "Hotel Name", "budget": 50000, "name": "Adventure in [City]", "days": 3}
- If the user specifically wants to book a hotel for an EXISTING trip, use: {"action": "book_hotel", "hotel": "Hotel Name", "price": 5000, "checkIn": "YYYY-MM-DD", "checkOut": "YYYY-MM-DD"}
- Keep responses short. Use emojis ✈️🏨.`;

    let text = "";

    try {
      // 1. Try Groq First
      const messages = [
        { role: "system", content: systemInstruction },
        ...history.map(h => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.content
        })),
        { role: "user", content: message }
      ];

      const chatCompletion = await groq.chat.completions.create({
        messages,
        model: "llama-3.1-8b-instant",
        max_tokens: 1000,
      });

      text = chatCompletion.choices[0]?.message?.content || "";
    } catch (groqError) {
      console.warn('Groq API failed, falling back to Gemini:', groqError.message);

      // 2. Try Gemini Fallback
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: {
          role: "system",
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          maxOutputTokens: 1000,
        }
      });

      const cleanHistory = history.filter((h, i) => !(i === 0 && h.role === 'assistant'));
      const chat = model.startChat({
        history: cleanHistory.map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        }))
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      text = response.text();
    }

    res.json({ reply: text });
  } catch (error) {
    console.error('Chat API Error:', error.message);

    // Provide a graceful fallback if both APIs fail
    if (error.message.includes('429') || error.message.includes('404') || error.message.includes('quota') || error.message.includes('models/')) {
      return res.json({
        reply: `**[Demo Mode Active]**\n\nI received your message: *"${message}"*\n\nHowever, both Groq and Gemini API Keys have failed (likely due to quota limits).\n\nSince I can't connect to the AI right now, I'm responding in offline Demo Mode! \n\nI've created a trip plan for Paris with a budget of 1,50,000 INR. Would you like me to create this trip plan for you?\n\n{"action": "create_trip", "destination": "Paris", "hotel": "The Ritz Paris", "budget": 150000, "name": "Dream Trip to Paris", "days": 5}`
      });
    }

    res.status(500).json({ error: 'Failed to communicate with AI', details: error.message });
  }
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
    const tripResult = await pool.query(`SELECT * FROM trips WHERE username = $1`, [username]);
    const trips = tripResult.rows;
    console.log(`Fetched ${trips.length} trips for user: ${username}`);

    // Fetch expenses and photos for each trip
    for (let trip of trips) {
      const expResult = await pool.query(`SELECT id, description, amount, category, date FROM expenses WHERE trip_id = $1`, [trip.id]);
      trip.expenses = expResult.rows;

      const photoResult = await pool.query(`SELECT url FROM photos WHERE trip_id = $1`, [trip.id]);
      trip.photos = photoResult.rows.map(p => p.url); // flatten

      const bookingResult = await pool.query(`SELECT id, hotel_name as "hotelName", check_in as "checkIn", check_out as "checkOut", price, booking_ref as "bookingRef" FROM bookings WHERE trip_id = $1`, [trip.id]);
      trip.bookings = bookingResult.rows;
    }

    res.json(trips);
  } catch (error) {
    console.error('TRIPS FETCH ERROR:', error);
    res.status(500).json({ error: error.message || String(error), stack: error.stack });
  }
});

// Create a new trip
app.post('/api/trips', async (req, res) => {
  const {
    id, username, name, destination, startDate, description,
    tripNumber, originLat, originLng, startTime, destLat, destLng,
    endTime, mode, distance, purpose, companions, frequency, cost
  } = req.body;
  try {
    console.log(`Creating trip: ${name} (ID: ${id}) for user: ${username}`);

    let finalDestLat = destLat;
    let finalDestLng = destLng;
    if (destination && (destLat == null || destLng == null)) {
      const coords = await getCoordinates(destination);
      if (coords) {
        finalDestLat = coords.lat;
        finalDestLng = coords.lng;
        console.log(`Auto-filled coordinates for ${destination}:`, coords);
      }
    }

    await pool.query(
      `INSERT INTO trips (
        id, username, name, destination, "startDate", description,
        "tripNumber", "originLat", "originLng", "startTime",
        "destLat", "destLng", "endTime", "mode", "distance",
        "purpose", "companions", "frequency", "cost"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        id, username, name, destination, startDate, description,
        tripNumber, originLat, originLng, startTime, finalDestLat, finalDestLng,
        endTime, mode, distance, purpose, companions, frequency, cost
      ]
    );
    res.json({ message: 'Trip created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Full update of a trip (easiest way to handle the current structure from frontend)
app.put('/api/trips/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name, destination, startDate, description, expenses, photos, bookings,
    tripNumber, originLat, originLng, startTime, destLat, destLng,
    endTime, mode, distance, purpose, companions, frequency, cost
  } = req.body;

  // Use a transaction since we do multiple queries
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let finalDestLat = destLat;
    let finalDestLng = destLng;
    if (destination && (destLat == null || destLng == null)) {
      const coords = await getCoordinates(destination);
      if (coords) {
        finalDestLat = coords.lat;
        finalDestLng = coords.lng;
      }
    }

    // Update trip details
    await client.query(
      `UPDATE trips SET 
        name = $1, destination = $2, "startDate" = $3, description = $4,
        "tripNumber" = $5, "originLat" = $6, "originLng" = $7, "startTime" = $8,
        "destLat" = $9, "destLng" = $10, "endTime" = $11, "mode" = $12, "distance" = $13,
        "purpose" = $14, "companions" = $15, "frequency" = $16, "cost" = $17
       WHERE id = $18`,
      [
        name, destination, startDate, description,
        tripNumber, originLat, originLng, startTime,
        finalDestLat, finalDestLng, endTime, mode, distance,
        purpose, companions, frequency, cost,
        id
      ]
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

    // Replace bookings
    if (bookings) {
      await client.query(`DELETE FROM bookings WHERE trip_id = $1`, [id]);
      for (let b of bookings) {
        await client.query(
          `INSERT INTO bookings (id, trip_id, hotel_name, check_in, check_out, price, booking_ref) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [b.id, id, b.hotelName, b.checkIn, b.checkOut, b.price, b.bookingRef]
        );
      }
    }

    console.log(`Updating trip: ${id} (${name}) with ${bookings ? bookings.length : 0} bookings`);
    await client.query('COMMIT');
    res.json({ message: 'Trip updated successfully', tripId: id });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('DATABASE UPDATE ERROR:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});


app.get('/api/hotels', async (req, res) => {
  const city = req.query.city;
  console.log(`AI Hotel search request received for city: ${city}`);
  if (!city) return res.status(400).json({ error: 'City is required' });
  
  try {
    const systemPrompt = `You are a travel booking assistant. Return a list of 4 real or realistic hotels for the city: ${city}.
    Your response MUST be ONLY a JSON array of objects.
    Each object must have: 
    - id: unique string (e.g., "h1", "h2")
    - name: hotel name string
    - price: integer (price per night in INR, between 3000 and 25000)
    - rating: float (between 4.0 and 5.0)
    
    Example format:
    [{"id": "h1", "name": "Hotel Luxury", "price": 5000, "rating": 4.5}]`;

    let hotelsText = "";
    
    try {
      // Try Groq first
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "system", content: systemPrompt }],
        model: "llama-3.1-8b-instant",
        max_tokens: 500,
        response_format: { type: "json_object" } // Some versions of llama support this, but we'll handle the text anyway
      });
      hotelsText = chatCompletion.choices[0]?.message?.content || "[]";
    } catch (err) {
      console.warn("Groq failed for hotels, using Gemini fallback");
      // Fallback to Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      hotelsText = response.text();
    }

    // Clean the AI response (remove markdown code blocks if any)
    const jsonMatch = hotelsText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const hotels = JSON.parse(jsonMatch[0]);
      res.json(hotels);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('AI Hotel Search Error:', error);
    res.status(500).json({ error: 'Failed to fetch hotels using AI' });
  }
});

app.post('/api/book', async (req, res) => {
  const { userId, hotelId, tripId, hotelName, price } = req.body;
  console.log(`Booking request received for hotel ${hotelName} and trip ${tripId}`);
  
  if (!userId || !tripId || !hotelName || !price) {
    return res.status(400).json({ error: 'userId, tripId, hotelName, and price are required' });
  }

  const client = await pool.connect();
  try {
    const bookingId = Date.now().toString();
    const bookingRef = 'HTL' + Math.floor(100000 + Math.random() * 900000);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    await client.query(
      `INSERT INTO bookings (id, trip_id, hotel_name, check_in, check_out, price, booking_ref) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [bookingId, tripId, hotelName, today, tomorrow, price, bookingRef]
    );

    res.json({ 
      success: true, 
      message: 'Booking successful', 
      booking: {
        id: bookingId,
        hotelName: hotelName,
        price: price,
        checkIn: today,
        checkOut: tomorrow,
        bookingRef: bookingRef
      }
    });
  } catch (error) {
    console.error('BOOKING ERROR:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Dedicated Booking Endpoint for Chatbot
app.post('/api/bookings', async (req, res) => {
  const { tripId, hotelName, checkIn, checkOut, price } = req.body;
  if (!tripId) return res.status(400).json({ error: 'Trip ID is required' });

  const client = await pool.connect();
  try {
    const bookingId = Date.now().toString();
    const bookingRef = 'TL' + Math.floor(100000 + Math.random() * 900000);

    await client.query(
      `INSERT INTO bookings (id, trip_id, hotel_name, check_in, check_out, price, booking_ref) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [bookingId, tripId, hotelName, checkIn, checkOut, price, bookingRef]
    );

    console.log(`Direct booking saved for trip ${tripId}: ${hotelName}`);
    res.json({ message: 'Booking saved', bookingId, bookingRef });
  } catch (error) {
    console.error('DIRECT BOOKING ERROR:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// CATCH-ALL FOR REACT (Must be last)
// Using app.use with a check to avoid routing parser issues in Express 5
app.use((req, res) => {
  // Only handle GET requests for navigation, everything else is a 404
  if (req.method !== 'GET') {
    return res.status(404).json({ error: 'Not found' });
  }

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
