import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import dotenv from 'dotenv';
import goalRoutes from './routes/goalRoutes';
import authRoutes from './routes/authRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(session({ secret: process.env.SESSION_SECRET || 'aetheris-session-secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api', goalRoutes as any);
app.use('/', authRoutes as any);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Aetheris API is running.' });
});

app.listen(port, () => {
  console.log(`Aetheris server running on port ${port}`);
});
