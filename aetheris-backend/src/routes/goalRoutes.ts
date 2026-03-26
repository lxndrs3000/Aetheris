import { Router, Response } from 'express';
import db from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth as any);

router.get('/goals', (req: AuthRequest, res: Response) => {
  const rows = db.prepare('SELECT data FROM goals WHERE userId = ?').all(req.userId) as any[];
  res.json(rows.map(r => JSON.parse(r.data)));
});

router.post('/goals', (req: AuthRequest, res: Response) => {
  const newGoal = { id: Date.now().toString(), ...req.body, progress: 0 };
  db.prepare('INSERT INTO goals (id, userId, data) VALUES (?, ?, ?)').run(newGoal.id, req.userId, JSON.stringify(newGoal));
  res.status(201).json(newGoal);
});

router.put('/goals/:id', (req: AuthRequest, res: Response) => {
  const existing = db.prepare('SELECT id FROM goals WHERE id = ? AND userId = ?').get(req.params.id, req.userId);
  if (!existing) { res.status(404).json({ error: 'Goal not found' }); return; }
  const updated = { ...req.body, id: req.params.id };
  db.prepare('UPDATE goals SET data = ? WHERE id = ? AND userId = ?').run(JSON.stringify(updated), req.params.id, req.userId);
  res.json(updated);
});

router.get('/goals/:id', (req: AuthRequest, res: Response) => {
  const row = db.prepare('SELECT data FROM goals WHERE id = ? AND userId = ?').get(req.params.id, req.userId) as any;
  if (!row) { res.status(404).json({ error: 'Goal not found' }); return; }
  res.json(JSON.parse(row.data));
});

router.delete('/goals/:id', (req: AuthRequest, res: Response) => {
  const result = db.prepare('DELETE FROM goals WHERE id = ? AND userId = ?').run(req.params.id, req.userId) as any;
  if (result.changes === 0) { res.status(404).json({ error: 'Goal not found' }); return; }
  res.json({ success: true });
});

export default router;
