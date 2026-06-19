import { Router } from 'express';
import { pool } from '../db.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();
router.use(adminAuth);

function generateCode(length = 8) {
  // niente caratteri ambigui (0/O, 1/I) per facilitare la lettura del codice
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// POST /api/admin/members - crea uno o più membri con codice univoco
// body: { names: ["Mario Rossi", "Anna Bianchi"] } oppure { count: 5 }
// header richiesto: X-Admin-Key
router.post('/members', async (req, res) => {
  const { names, count } = req.body;
  const list =
    Array.isArray(names) && names.length > 0
      ? names
      : Array.from({ length: count || 1 }, () => null);

  const created = [];
  try {
    for (const name of list) {
      let code;
      let inserted = false;
      while (!inserted) {
        code = generateCode();
        try {
          await pool.query('INSERT INTO members (code, name) VALUES (?, ?)', [
            code,
            name,
          ]);
          inserted = true;
        } catch (err) {
          if (err.code !== 'ER_DUP_ENTRY') throw err;
        }
      }
      created.push({ code, name });
    }
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nella creazione dei membri' });
  }
});

// GET /api/admin/members - elenco membri e stato voto
router.get('/members', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, code, name, has_voted, created_at FROM members ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel recupero dei membri' });
  }
});

export default router;
