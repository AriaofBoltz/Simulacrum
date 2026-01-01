const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/chat.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    is_owner INTEGER DEFAULT 0,
    title TEXT DEFAULT '',
    title_color TEXT DEFAULT '#000000',
    profile_picture TEXT DEFAULT '',
    description TEXT DEFAULT ''
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER,
    user_id INTEGER,
    status TEXT DEFAULT 'approved',
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    PRIMARY KEY (group_id, user_id)
  )`);

  // Add status column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE group_members ADD COLUMN status TEXT DEFAULT 'approved'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('Error adding status column:', err.message);
    }
  });

  // Add profile columns if they don't exist (for existing databases)
  db.run(`ALTER TABLE users ADD COLUMN profile_picture TEXT DEFAULT ''`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('Error adding profile_picture column:', err.message);
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN description TEXT DEFAULT ''`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('Error adding description column:', err.message);
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,  -- NULL for group messages
    group_id INTEGER,     -- NULL for private messages
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id),
    FOREIGN KEY (group_id) REFERENCES groups(id)
  )`);
});

module.exports = db;