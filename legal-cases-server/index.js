// index.js — Court Decisions API (MySQL)
// דרישות: npm i express cors mysql2 swagger-ui-express swagger-jsdoc body-parser-xml fast-xml-parser multer
// DB: ערכו את ההגדרות לפי הצורך (host/user/password/database)

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecification = require('./swagger'); // נעדכן בהמשך את הכותרת
const path = require('path');
const fs = require('fs').promises;

const bodyParser = require('body-parser');
const bodyParserXml = require('body-parser-xml');

const app = express();
const port = 3000;

// MySQL connection configuration (התאם לסביבה שלך)
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'mydb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create a MySQL connection pool
const pool = mysql.createPool(dbConfig);

// Init DB objects (DDL) once on startup — בטוח להרצה מרובה (IF NOT EXISTS)
async function initSchema() {
  const ddl = `
    CREATE TABLE IF NOT EXISTS court_decisions (
      decision_id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      source_slug       VARCHAR(200),
      source_url        VARCHAR(1000) NOT NULL,
      court_name        VARCHAR(200),
      court_level       VARCHAR(50),
      decision_type     VARCHAR(50),
      case_number       VARCHAR(120),
      decision_title    VARCHAR(500),
      decision_date     DATE,
      publish_date      DATE,
      language_code     VARCHAR(10) DEFAULT 'he',
      summary_text      LONGTEXT,
      keywords          VARCHAR(1000),
      page_count        INT,
      file_size_bytes   BIGINT,
      status            VARCHAR(30) DEFAULT 'PUBLISHED',
      created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at        TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_cd_case_number (case_number),
      KEY idx_cd_dates (decision_date, publish_date),
      KEY idx_cd_courtlevel (court_level)
    );

    CREATE TABLE IF NOT EXISTS court_decision_files (
      file_id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      decision_id       BIGINT UNSIGNED NOT NULL,
      file_url          VARCHAR(1000) NOT NULL,
      file_title        VARCHAR(500),
      mime_type         VARCHAR(100) DEFAULT 'application/pdf',
      lang_code         VARCHAR(10)  DEFAULT 'he',
      page_count        INT,
      file_size_bytes   BIGINT,
      hash_sha256       CHAR(64),
      created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_cdf_decision
        FOREIGN KEY (decision_id) REFERENCES court_decisions(decision_id)
        ON DELETE CASCADE,
      KEY idx_cdf_decision (decision_id)
    );
  `;
  const conn = await pool.getConnection();
  try {
    for (const stmt of ddl.split(';').map(s => s.trim()).filter(Boolean)) {
      await conn.query(stmt);
    }
    console.log('Schema is ready.');
  } finally {
    conn.release();
  }
}

app.use(cors({ origin: 'http://localhost:4200' }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecification));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
bodyParserXml(bodyParser);
app.use(bodyParser.xml({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.send('Hello from Court Decisions API!');
});

/**
 * @swagger
 * /api/decisions:
 *   get:
 *     summary: List/search court decisions
 *     description: Filter by case_number, free-text q, court_level, decision_type, and date range.
 *     parameters:
 *       - in: query
 *         name: case
 *         schema: { type: string }
 *         description: Case number (e.g., בג״ץ 1711/24)
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Free-text over title/keywords/summary (LIKE)
 *       - in: query
 *         name: court_level
 *         schema: { type: string }
 *       - in: query
 *         name: decision_type
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Array of decisions
 */
app.get('/api/decisions', async (req, res) => {
  const { case: caseNumber, q, court_level, decision_type, from, to, limit = 100, offset = 0 } = req.query;
  const where = [];
  const params = [];

  if (caseNumber) { where.push('case_number = ?'); params.push(caseNumber); }
  if (court_level) { where.push('court_level = ?'); params.push(court_level); }
  if (decision_type) { where.push('decision_type = ?'); params.push(decision_type); }
  if (from) { where.push('(decision_date >= ? OR publish_date >= ?)'); params.push(from, from); }
  if (to)   { where.push('(decision_date <= ? OR publish_date <= ?)'); params.push(to, to); }
  if (q) {
    where.push('(decision_title LIKE ? OR keywords LIKE ? OR summary_text LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  const sql = `
    SELECT decision_id, source_slug, source_url, court_name, court_level, decision_type,
           case_number, decision_title, decision_date, publish_date, language_code,
           keywords, page_count, file_size_bytes, status, created_at, updated_at
    FROM court_decisions
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY COALESCE(decision_date, publish_date) DESC, decision_id DESC
    LIMIT ? OFFSET ?
  `;
  params.push(Number(limit), Number(offset));

  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed_to_query' });
  } finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/decisions:
 *   post:
 *     summary: Create a court decision (metadata)
 *     description: Inserts a new decision with optional summary_text and keywords.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [source_url]
 *             properties:
 *               source_slug: { type: string }
 *               source_url:  { type: string }
 *               court_name:  { type: string }
 *               court_level: { type: string }
 *               decision_type: { type: string }
 *               case_number: { type: string }
 *               decision_title: { type: string }
 *               decision_date: { type: string, format: date }
 *               publish_date: { type: string, format: date }
 *               language_code: { type: string }
 *               summary_text: { type: string }
 *               keywords: { type: string }
 *               page_count: { type: integer }
 *               file_size_bytes: { type: integer }
 *               status: { type: string }
 *     responses:
 *       201: { description: Created }
 */
app.post('/api/decisions', async (req, res) => {
  const b = req.body || {};
  if (!b.source_url) return res.status(400).json({ error: 'source_url is required' });

  const sql = `
    INSERT INTO court_decisions
    (source_slug, source_url, court_name, court_level, decision_type, case_number,
     decision_title, decision_date, publish_date, language_code, summary_text, keywords,
     page_count, file_size_bytes, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;
  const params = [
    b.source_slug || null, b.source_url, b.court_name || null, b.court_level || null,
    b.decision_type || null, b.case_number || null, b.decision_title || null,
    b.decision_date || null, b.publish_date || null, b.language_code || 'he',
    b.summary_text || null, b.keywords || null, b.page_count || null,
    b.file_size_bytes || null, b.status || 'PUBLISHED'
  ];

  let conn;
  try {
    conn = await pool.getConnection();
    const [r] = await conn.execute(sql, params);
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed_to_insert' });
  } finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/decisions/{id}:
 *   get:
 *     summary: Get a decision by id
 */
app.get('/api/decisions/:id', async (req, res) => {
  const id = req.params.id;
  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM court_decisions WHERE decision_id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    // fetch files
    const [files] = await conn.execute('SELECT * FROM court_decision_files WHERE decision_id = ?', [id]);
    const item = rows[0];
    item.files = files;
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed_to_get' });
  } finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/decisions/{id}:
 *   put:
 *     summary: Update decision
 */
app.put('/api/decisions/:id', async (req, res) => {
  const id = req.params.id;
  const b = req.body || {};
  const sql = `
    UPDATE court_decisions
    SET source_slug=?, source_url=?, court_name=?, court_level=?, decision_type=?,
        case_number=?, decision_title=?, decision_date=?, publish_date=?, language_code=?,
        summary_text=?, keywords=?, page_count=?, file_size_bytes=?, status=?
    WHERE decision_id=?
  `;
  const params = [
    b.source_slug || null, b.source_url || null, b.court_name || null, b.court_level || null,
    b.decision_type || null, b.case_number || null, b.decision_title || null,
    b.decision_date || null, b.publish_date || null, b.language_code || 'he',
    b.summary_text || null, b.keywords || null, b.page_count || null,
    b.file_size_bytes || null, b.status || 'PUBLISHED', id
  ];
  let conn;
  try {
    conn = await pool.getConnection();
    const [r] = await conn.execute(sql, params);
    if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed_to_update' });
  } finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/decisions/{id}:
 *   delete:
 *     summary: Delete decision
 */
app.delete('/api/decisions/:id', async (req, res) => {
  const id = req.params.id;
  let conn;
  try {
    conn = await pool.getConnection();
    const [r] = await conn.execute('DELETE FROM court_decisions WHERE decision_id = ?', [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed_to_delete' });
  } finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/decisions/{id}/files:
 *   post:
 *     summary: Attach file metadata (PDF) to a decision
 */
app.post('/api/decisions/:id/files', async (req, res) => {
  const decisionId = req.params.id;
  const b = req.body || {};
  if (!b.file_url) return res.status(400).json({ error: 'file_url is required' });

  const sql = `
    INSERT INTO court_decision_files
      (decision_id, file_url, file_title, mime_type, lang_code, page_count, file_size_bytes, hash_sha256)
    VALUES (?,?,?,?,?,?,?,?)
  `;
  const params = [
    decisionId, b.file_url, b.file_title || null, b.mime_type || 'application/pdf',
    b.lang_code || 'he', b.page_count || null, b.file_size_bytes || null, b.hash_sha256 || null
  ];

  let conn;
  try {
    conn = await pool.getConnection();
    const [r] = await conn.execute(sql, params);
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed_to_insert_file' });
  } finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/decisions/{id}/files:
 *   get:
 *     summary: List attached files for a decision
 */
app.get('/api/decisions/:id/files', async (req, res) => {
  const decisionId = req.params.id;
  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM court_decision_files WHERE decision_id = ?', [decisionId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed_to_list_files' });
  } finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Simple free-text search over decisions
 *     description: LIKE search over decision_title/keywords/summary_text + exact case_number when provided.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: case
 *         schema: { type: string }
 */
app.get('/api/search', async (req, res) => {
  const { q, case: caseNumber, limit = 100, offset = 0 } = req.query;
  const where = [];
  const params = [];

  if (caseNumber) { where.push('case_number = ?'); params.push(caseNumber); }
  if (q) {
    const like = `%${q}%`;
    where.push('(decision_title LIKE ? OR keywords LIKE ? OR summary_text LIKE ?)');
    params.push(like, like, like);
  }

  const sql = `
    SELECT decision_id, case_number, decision_title, court_name, court_level,
           decision_type, decision_date, publish_date
    FROM court_decisions
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY COALESCE(decision_date, publish_date) DESC
    LIMIT ? OFFSET ?
  `;
  params.push(Number(limit), Number(offset));

  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed_to_search' });
  } finally {
    if (conn) conn.release();
  }
});

app.listen(port, async () => {
  try {
    const conn = await pool.getConnection();
    console.log('Connected to MySQL database!');
    conn.release();
    await initSchema();
  } catch (e) {
    console.error('Error connecting to MySQL database:', e);
  }
  console.log(`Court Decisions API listening on http://localhost:${port}`);
});
