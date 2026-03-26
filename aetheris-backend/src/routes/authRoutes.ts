import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from '../db';
import { signToken, requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// --- Google Strategy setup (only if credentials provided) ---
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback',
  }, (_at, _rt, profile, done) => {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value || null;
    const username = profile.displayName || `user_${googleId.slice(0, 6)}`;
    let user = db.prepare('SELECT * FROM users WHERE googleId = ?').get(googleId) as any;
    if (!user) {
      const id = Date.now().toString();
      db.prepare('INSERT INTO users (id, username, email, googleId) VALUES (?, ?, ?, ?)').run(id, username, email, googleId);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }
    return done(null, user);
  }));
  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser((id: string, done) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    done(null, user || false);
  });
}

// --- Register ---
router.post('/auth/register', (req: Request, res: Response): void => {
  const { username, password } = req.body;
  if (!username?.trim() || !password) { res.status(400).json({ error: 'Username and password required' }); return; }
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim())) {
    res.status(409).json({ error: 'Username already taken' }); return;
  }
  const id = Date.now().toString();
  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id, username, passwordHash) VALUES (?, ?, ?)').run(id, username.trim(), passwordHash);
  const token = signToken(id);
  res.status(201).json({ token, user: { id, username: username.trim(), avatarId: 0 } });
});

// --- Login ---
router.post('/auth/login', (req: Request, res: Response): void => {
  const { username, password } = req.body;
  if (!username || !password) { res.status(400).json({ error: 'Username and password required' }); return; }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim()) as any;
  if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid credentials' }); return;
  }
  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, username: user.username, avatarId: user.avatarId ?? 0 } });
});

// --- Google OAuth ---
router.get('/auth/google', (req, res, next) => {
  if (!GOOGLE_CLIENT_ID) { res.status(503).json({ error: 'Google OAuth not configured' }); return; }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/auth/google/callback',
  (req, res, next) => {
    if (!GOOGLE_CLIENT_ID) { res.redirect(`${CLIENT_URL}?error=google_not_configured`); return; }
    passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}?error=google_failed` })(req, res, next);
  },
  (req: any, res) => {
    const user = req.user as any;
    const token = signToken(user.id);
    res.redirect(`${CLIENT_URL}?token=${token}`);
  }
);

// --- Me ---
router.get('/auth/me', requireAuth, (req: AuthRequest, res: Response): void => {
  const user = db.prepare('SELECT id, username, email, avatarId FROM users WHERE id = ?').get(req.userId) as any;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(user);
});

router.put('/auth/me/avatar', requireAuth, (req: AuthRequest, res: Response): void => {
  const { avatarId } = req.body;
  db.prepare('UPDATE users SET avatarId = ? WHERE id = ?').run(avatarId ?? 0, req.userId);
  const user = db.prepare('SELECT id, username, email, avatarId FROM users WHERE id = ?').get(req.userId) as any;
  res.json(user);
});

export default router;
