import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../../aetheris.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    passwordHash TEXT,
    googleId TEXT UNIQUE,
    avatarId INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    data TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`);

export default db;
