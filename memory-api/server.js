// memory-api/server.js
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const multer    = require('multer');
const path      = require('path');
const { Pool }  = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// ——————————————
// Postgres
// ——————————————
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false } // if you need it in prod
});

// ——————————————
// Multer disk storage
// ——————————————
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
      const suffix = Date.now() + '-' + Math.round(Math.random()*1e9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + suffix + ext);
    }
  })
});

// serve uploaded files back
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ——————————————
// GET /prompts/random
// ——————————————
app.get('/prompts/random', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.prompt_id, p.prompt_text, c.marker_color AS category_color
      FROM prompts_for_map p
      JOIN categories_prompt c ON p.category_id = c.category_id
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

// ——————————————
// GET /memories
// ——————————————
app.get('/memories', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        m.*,
        p.prompt_text,
        c.marker_color AS category_color
      FROM map_your_memory m
      LEFT JOIN prompts_for_map p  ON m.prompt_id = p.prompt_id
      LEFT JOIN categories_prompt c ON p.category_id = c.category_id
      ORDER BY m.memory_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error fetching memories' });
  }
});

// ——————————————
// POST /memories  ← <— this one parses FormData + file
// ——————————————
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

    const user_id = req.user?.id || 'anonymous';

    if (!req.file) {
      return res.status(400).json({ error: 'Missing file' });
    }
    // build a URL for your front-end to load:
    const fileUrl = `/uploads/${req.file.filename}`;

    // insert
    const insertSQL = `
      INSERT INTO map_your_memory
        (memory_name, file_url, description,
         memory_date, latitude, longitude,
         user_id, place, visibility, prompt_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING memory_id
    `;
    const values = [
      memory_name, fileUrl, description,
      memory_date, latitude||null, longitude||null,
      user_id, place, visibility, prompt_id||null
    ];
    const { rows: ins } = await pool.query(insertSQL, values);
    const newId = ins[0].memory_id;

    // fetch the full row + joins:
    const { rows } = await pool.query(`
      SELECT
        m.*,
        p.prompt_text,
        c.marker_color AS category_color
      FROM map_your_memory m
      LEFT JOIN prompts_for_map p  ON m.prompt_id = p.prompt_id
      LEFT JOIN categories_prompt c ON p.category_id = c.category_id
      WHERE m.memory_id = $1
    `, [ newId ]);

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error inserting memory' });
  }
});

// ——————————————
// start
// ——————————————
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`📡 API listening on port ${PORT}`));
