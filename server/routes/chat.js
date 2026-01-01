const express = require('express');
const auth = require('../middleware/auth');
const db = require('../../database/db');

const router = express.Router();

router.get('/users', auth, (req, res) => {
  db.all('SELECT id, username, title, title_color, profile_picture, description FROM users', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

router.get('/groups', auth, (req, res) => {
  db.all('SELECT * FROM groups', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

router.post('/create-group', auth, (req, res) => {
  const { name } = req.body;
  const userStatus = req.user.isOwner ? 'Admin' : 'User';
  console.log(`Group creation attempt by ${req.user.username} (${userStatus}): "${name}"`);
  db.run('INSERT INTO groups (name) VALUES (?)', [name], function(err) {
    if (err) {
      console.log(`Group creation failed: ${err.message}`);
      return res.status(500).json({ error: 'DB error' });
    }
    const groupId = this.lastID;
    console.log(`Group created successfully: "${name}" (ID: ${groupId})`);
    // Add creator as approved member
    db.run('INSERT INTO group_members (group_id, user_id, status) VALUES (?, ?, ?)', [groupId, req.user.id, 'approved'], (err2) => {
      if (err2) {
        console.log(`Failed to add creator to group: ${err2.message}`);
      } else {
        console.log(`Creator added to group as approved member`);
      }
      res.json({ id: groupId });
    });
  });
});

router.get('/my-groups', auth, (req, res) => {
  console.log('Fetching my-groups for user:', req.user.username, 'id:', req.user.id);
  db.all(`
    SELECT g.id, g.name, gm.status
    FROM groups g
    LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
  `, [req.user.id], (err, rows) => {
    if (err) {
      console.log('DB error in my-groups:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    console.log('Groups returned:', rows.length, 'groups');
    res.json(rows);
  });
});

router.get('/messages', auth, (req, res) => {
  const { type, targetId } = req.query;
  const userId = req.user.id;
  let query, params;

  if (type === 'private') {
    query = `
      SELECT m.id, u.username as sender, m.content, m.created_at as timestamp
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
      AND m.group_id IS NULL
      ORDER BY m.created_at DESC
      LIMIT 50
    `;
    params = [userId, targetId, targetId, userId];
  } else if (type === 'group') {
    query = `
      SELECT m.id, u.username as sender, m.content, m.created_at as timestamp
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.group_id = ?
      ORDER BY m.created_at DESC
      LIMIT 50
    `;
    params = [targetId];
  } else {
    return res.status(400).json({ error: 'Invalid type' });
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.log('DB error in messages:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    // Ensure rows is an array before reversing
    if (!Array.isArray(rows)) {
      console.log('Invalid rows data:', rows);
      return res.status(500).json({ error: 'Invalid data format' });
    }
    // Reverse to show oldest first
    res.json(rows.reverse());
  });
});

module.exports = router;