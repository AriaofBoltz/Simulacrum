const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const db = require('../../database/db');
const auth = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = 'your-secret-key'; // In production, use env var

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post('/register', (req, res) => {
  const { username, password } = req.body;
  console.log(`User registration attempt: ${username}`);
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const isOwner = row.count === 0 ? 1 : 0;
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json({ error: 'Hash error' });
      db.run('INSERT INTO users (username, password, is_owner) VALUES (?, ?, ?)', [username, hash, isOwner], function(err) {
        if (err) {
          console.log(`Registration failed for ${username}: Username already exists`);
          return res.status(400).json({ error: 'Username already exists' });
        }
        console.log(`User registered successfully: ${username} (Owner: ${isOwner})`);
        const token = jwt.sign({ id: this.lastID, username, isOwner }, JWT_SECRET);
        res.status(201).json({ token, user: { username, id: this.lastID, isOwner } });
      });
    });
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`User login attempt: ${username}`);
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
      console.log(`Login failed for ${username}: User not found`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    bcrypt.compare(password, user.password, (err, match) => {
      if (!match) {
        console.log(`Login failed for ${username}: Invalid password`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      console.log(`User logged in successfully: ${username}`);
      const token = jwt.sign({ id: user.id, username, isOwner: user.is_owner }, JWT_SECRET);
      res.json({ token, user: { username, id: user.id, isOwner: user.is_owner } });
    });
  });
});

router.get('/profile', auth, (req, res) => {
  db.get('SELECT profile_picture, description FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ profile_picture: row?.profile_picture || '', description: row?.description || '' });
  });
});

router.put('/profile', auth, upload.single('profile_picture'), (req, res) => {
  const { description } = req.body;
  const profile_picture = req.file ? `/uploads/${req.file.filename}` : req.body.profile_picture || '';

  if (req.file) {
    console.log(`Profile picture uploaded successfully for user ${req.user.username}: ${req.file.filename}`);
  }

  db.run('UPDATE users SET profile_picture = ?, description = ? WHERE id = ?', [profile_picture, description || '', req.user.id], (err) => {
    if (err) {
      console.log(`Failed to update profile for user ${req.user.username}: ${err.message}`);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log(`Profile updated successfully for user ${req.user.username}`);
    res.json({ success: true });
  });
});

module.exports = router;