import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// POST /api/votes/check - verifica se un codice membro è valido e se ha già votato
router.post('/check', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Codice mancante' });

  try {
    const [rows] = await pool.query(
      'SELECT id, name, has_voted FROM members WHERE code = ?',
      [code.trim().toUpperCase()]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Codice non valido' });
    }
    const member = rows[0];
    res.json({ valid: true, name: member.name, hasVoted: !!member.has_voted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nella verifica del codice' });
  }
});

// POST /api/votes - invia il voto di un membro
// body: { code, choices: [idPrimaScelta, idSecondaScelta, idTerzaScelta] }
router.post('/', async (req, res) => {
  const { code, choices } = req.body;

  if (!code) return res.status(400).json({ error: 'Codice mancante' });
  if (!Array.isArray(choices) || choices.length !== 3) {
    return res.status(400).json({ error: 'Servono esattamente 3 scelte' });
  }
  if (new Set(choices).size !== 3) {
    return res.status(400).json({ error: 'Le tre scelte devono essere libri diversi' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // blocco la riga del membro per evitare doppi invii concorrenti
    const [members] = await conn.query(
      'SELECT id, has_voted FROM members WHERE code = ? FOR UPDATE',
      [code.trim().toUpperCase()]
    );
    if (members.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Codice non valido' });
    }
    const member = members[0];
    if (member.has_voted) {
      await conn.rollback();
      return res.status(409).json({ error: 'Questo codice ha già votato' });
    }

    const points = [3, 2, 1];
    for (let i = 0; i < 3; i++) {
      await conn.query(
        'INSERT INTO votes (member_id, book_id, points) VALUES (?, ?, ?)',
        [member.id, choices[i], points[i]]
      );
    }

    await conn.query('UPDATE members SET has_voted = TRUE WHERE id = ?', [
      member.id,
    ]);

    await conn.commit();
    res.status(201).json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Errore durante l'invio del voto" });
  } finally {
    conn.release();
  }
});

// GET /api/votes/results - classifica con punteggio totale per libro
router.get('/results', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.id, b.title, b.author,
             COALESCE(SUM(v.points), 0) AS total_points,
             SUM(CASE WHEN v.points = 3 THEN 1 ELSE 0 END) AS first_choice_count,
             SUM(CASE WHEN v.points = 2 THEN 1 ELSE 0 END) AS second_choice_count,
             SUM(CASE WHEN v.points = 1 THEN 1 ELSE 0 END) AS third_choice_count
      FROM books b
      LEFT JOIN votes v ON v.book_id = b.id
      GROUP BY b.id, b.title, b.author
      ORDER BY total_points DESC, first_choice_count DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel calcolo dei risultati' });
  }
});

export default router;
