import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/books - elenco di tutti i libri proposti
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, author, notes, added_by, created_at FROM books ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel recupero dei libri' });
  }
});

// POST /api/books - aggiunge un libro alla lista (form pubblico)
router.post('/', async (req, res) => {
  const { title, author, notes, addedBy } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Il titolo è obbligatorio' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO books (title, author, notes, added_by) VALUES (?, ?, ?, ?)',
      [
        title.trim(),
        author?.trim() || null,
        notes?.trim() || null,
        addedBy?.trim() || null,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [
      result.insertId,
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nell'aggiunta del libro" });
  }
});

export default router;
