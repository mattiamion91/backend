import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import booksRouter from './routes/books.js';
import votesRouter from './routes/votes.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/books', booksRouter);
app.use('/api/votes', votesRouter);
app.use('/api/admin', adminRouter);

app.use((req, res) => res.status(404).json({ error: 'Non trovato' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
