// memory-api/server.js

// 🛠️ Redeploy bump
require('dotenv').config();


require('dotenv').config();        // loads DATABASE_URL, PORT
const express   = require('express');
const cors      = require('cors');
const multer    = require('multer');
const path      = require('path');
const { Pool }  = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// — Configure Postgres pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// — Multer setup (disk storage for uploads/)
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.resolve(__dirname, 'uploads')),
    filename:    (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext    = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + unique + ext);
    }
  })
});

// — Serve uploads as static files
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// — Helper to “upload” file and return a URL
async function uploadToS3(file) {
  return `/uploads/${file.filename}`;
}

// — GET /prompts/random
//    returns { prompt_id, prompt_text, category_color }
app.get('/prompts/random', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.prompt_id, p.prompt_text, c.marker_color AS category_color
        FROM prompts_for_map p
        JOIN categories_prompt c USING(category_id)
       ORDER BY random()
       LIMIT 1
    `);
    if (!rows[0]) return res.status(404).json({ error: 'No prompts found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error fetching random prompt' });
  }
});

// — GET /memories
//    returns all memories with prompt_text & category_color
app.get('/memories', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        m.*,
        p.prompt_text,
        c.marker_color AS category_color
      FROM map_your_memory m
      LEFT JOIN prompts_for_map    p USING(prompt_id)
      LEFT JOIN categories_prompt  c USING(category_id)
      ORDER BY memory_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error fetching memories' });
  }
});

// — POST /memories
//    multipart/form-data: file + fields
app.post('/memories', upload.single('file'), async (req, res) => {
  try {
    const {
      memory_name,
      memory_date,
      place,
      latitude,
      longitude,
      description = null,
      visibility,
      prompt_id = null
    } = req.body;

    // stubbed user ID
    const user_id = req.user?.id || 'anonymous';

    if (!req.file) {
      return res.status(400).json({ error: 'Missing file' });
    }
    const fileUrl = await uploadToS3(req.file);

    // insert
    const insertSQL = `
      INSERT INTO map_your_memory
        (memory_name, file_url, description,
         memory_date, latitude, longitude,
         user_id, place, visibility, prompt_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING memory_id
    `;
    const insertValues = [
      memory_name,
      fileUrl,
      description,
      memory_date,
      latitude  || null,
      longitude || null,
      user_id,
      place,
      visibility,
      prompt_id
    ];
    const { rows: inserted } = await pool.query(insertSQL, insertValues);
    const newId = inserted[0].memory_id;

    // fetch full record with joins
    const { rows } = await pool.query(`
      SELECT
        m.*,
        p.prompt_text,
        c.marker_color AS category_color
      FROM map_your_memory m
      LEFT JOIN prompts_for_map    p USING(prompt_id)
      LEFT JOIN categories_prompt  c USING(category_id)
      WHERE m.memory_id = $1
    `, [newId]);

    res.json(rows[0]);
  } catch (err) {
    console.error('Error inserting memory:', err);
    res.status(500).json({ error: 'DB error inserting memory' });
  }
});

// start server on PORT (3001 by default)
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`📡  API listening on port ${PORT}`);
});
