require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 1) GET all memories
// columns: user_id, memory_id, memory_name, place, file_url, description, memory_date, latitude, longitude
app.get('/memories', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        user_id,
        memory_id,
        memory_name,
        place,
        file_url,
        description,
        memory_date,
        latitude,
        longitude
      FROM map_your_memory
      ORDER BY memory_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error fetching memories' });
  }
});

// 2) POST a new memory
app.post('/memories', async (req, res) => {
  const {
    user_id,
    memory_name,
    place,
    file_url,
    description,
    memory_date,
    latitude,
    longitude
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO map_your_memory
       (user_id,memory_name,place,file_url,description,memory_date,latitude,longitude)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING memory_id, memory_date`,
      [user_id, memory_name, place, file_url, description, memory_date, latitude, longitude]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error inserting memory' });
  }
});

// 3) GET categories (for your dropdowns, marker colors, etc.)
app.get('/categories', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT category_id, category_name, marker_color
      FROM categories_prompt
      ORDER BY category_name
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error fetching categories' });
  }
});

// 4) GET prompts (if you need them client-side)
app.get('/prompts', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT prompt_id, prompt_text, category_id, created_at
      FROM prompts_for_map
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error fetching prompts' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on ${PORT}`));
