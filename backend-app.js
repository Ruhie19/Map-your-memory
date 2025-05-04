// backend/app.js

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
// Configure Postgres pool
// ——————————————
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false } // if needed on production
});

// ——————————————
// Multer setup (disk storage)
// ——————————————
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.resolve(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random()*1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  })
});

// ——————————————
// Helper to “upload” file and return a URL
// (swap out for S3 or Cloudinary as needed)
// ——————————————
async function uploadToS3(file) {
  // for now, just return a local URL path:
  return `/uploads/${file.filename}`;
}

// serve your uploads folder statically
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// ——————————————
// 1) GET /prompts/random
//    returns { prompt_id, prompt_text, category_color }
// ——————————————
app.get('/prompts/random', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.prompt_id, p.prompt_text, c.marker_color AS category_color
        FROM prompts_for_map p
        JOIN categories_prompt c
          ON p.category_id = c.category_id
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
// 2) GET /memories
//    returns a list of all memories joined with their prompt_text & category_color
// ——————————————
app.get('/memories', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        m.*,
        p.prompt_text,
        c.marker_color AS category_color
      FROM map_your_memory m
      LEFT JOIN prompts_for_map p
        ON m.prompt_id = p.prompt_id
      LEFT JOIN categories_prompt c
        ON p.category_id = c.category_id
      ORDER BY m.memory_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error fetching memories' });
  }
});

// ——————————————
// 3) POST /memories
//    multipart/form-data: file + all fields
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

    // your auth might set req.user.id — use that or stub:
    const user_id = req.user?.id || 'anonymous';

    // 1) upload file
    if (!req.file) {
      return res.status(400).json({ error: 'Missing file' });
    }
    const fileUrl = await uploadToS3(req.file);

    // 2) insert into DB
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
      latitude || null,
      longitude || null,
      user_id,
      place,
      visibility,
      prompt_id || null
    ];
    const { rows: insertRows } = await pool.query(insertSQL, insertValues);
    const newId = insertRows[0].memory_id;

    // 3) fetch the full inserted record with joins
    const { rows } = await pool.query(`
      SELECT
        m.*,
        p.prompt_text,
        c.marker_color AS category_color
      FROM map_your_memory m
      LEFT JOIN prompts_for_map p
        ON m.prompt_id = p.prompt_id
      LEFT JOIN categories_prompt c
        ON p.category_id = c.category_id
      WHERE m.memory_id = $1
    `, [newId]);

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error inserting memory' });
  }
});

// ——————————————
// start server
// ——————————————
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
