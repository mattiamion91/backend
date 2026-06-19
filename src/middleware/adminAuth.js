// Protegge gli endpoint amministrativi (es. generazione codici membro)
// richiedendo l'header X-Admin-Key con il valore di ADMIN_KEY dal .env
export function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }
  next();
}
