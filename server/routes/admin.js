const express = require('express');
const auth = require('../middleware/auth');
const db = require('../../database/db');
const multer = require('multer');
const path = require('path');
const os = require('os');

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

const router = express.Router();

router.post('/set-title', auth, (req, res) => {
  if (!req.user.isOwner) return res.status(403).json({ error: 'Not owner' });
  const { userId, title, color } = req.body;
  db.run('UPDATE users SET title = ?, title_color = ? WHERE id = ?', [title, color, userId], (err) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true });
  });
});

router.get('/pending-memberships', auth, (req, res) => {
  if (!req.user.isOwner) return res.status(403).json({ error: 'Not owner' });
  db.all(`
    SELECT gm.group_id, gm.user_id, g.name as group_name, u.username
    FROM group_members gm
    JOIN groups g ON gm.group_id = g.id
    JOIN users u ON gm.user_id = u.id
    WHERE gm.status = 'pending'
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

router.post('/approve-membership', auth, (req, res) => {
  if (!req.user.isOwner) return res.status(403).json({ error: 'Not owner' });
  const { groupId, userId } = req.body;
  db.run('UPDATE group_members SET status = ? WHERE group_id = ? AND user_id = ?', ['approved', groupId, userId], (err) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true });
  });
});

router.post('/reject-membership', auth, (req, res) => {
  if (!req.user.isOwner) return res.status(403).json({ error: 'Not owner' });
  const { groupId, userId } = req.body;
  db.run('DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND status = ?', [groupId, userId, 'pending'], (err) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true });
  });
});

router.post('/delete-group', auth, (req, res) => {
  if (!req.user.isOwner) return res.status(403).json({ error: 'Not owner' });
  const { groupId } = req.body;
  // Delete messages first
  db.run('DELETE FROM messages WHERE group_id = ?', [groupId], (err) => {
    if (err) return res.status(500).json({ error: 'DB error deleting messages' });
    // Delete group members
    db.run('DELETE FROM group_members WHERE group_id = ?', [groupId], (err2) => {
      if (err2) return res.status(500).json({ error: 'DB error deleting members' });
      // Delete group
      db.run('DELETE FROM groups WHERE id = ?', [groupId], (err3) => {
        if (err3) return res.status(500).json({ error: 'DB error deleting group' });
        res.json({ success: true });
      });
    });
  });
});

router.get('/users', auth, (req, res) => {
  if (!req.user.isOwner) return res.status(403).json({ error: 'Not owner' });
  db.all('SELECT id, username, title, title_color, profile_picture, description FROM users', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

router.post('/set-profile', auth, upload.single('profile_picture'), (req, res) => {
  if (!req.user.isOwner) return res.status(403).json({ error: 'Not owner' });
  const { userId, description } = req.body;
  const profile_picture = req.file ? `/uploads/${req.file.filename}` : req.body.profile_picture || '';

  if (req.file) {
    console.log(`Profile picture uploaded successfully for user ID ${userId} by admin ${req.user.username}: ${req.file.filename}`);
  }

  db.run('UPDATE users SET profile_picture = ?, description = ? WHERE id = ?', [profile_picture, description || '', userId], (err) => {
    if (err) {
      console.log(`Failed to update profile for user ID ${userId} by admin ${req.user.username}: ${err.message}`);
      return res.status(500).json({ error: 'DB error' });
    }
    console.log(`Profile updated successfully for user ID ${userId} by admin ${req.user.username}`);
    res.json({ success: true });
  });
});

router.post('/delete-user', auth, (req, res) => {
  if (!req.user.isOwner) return res.status(403).json({ error: 'Not owner' });
  const { userId } = req.body;
  // Delete messages sent by the user
  db.run('DELETE FROM messages WHERE sender_id = ?', [userId], (err) => {
    if (err) return res.status(500).json({ error: 'DB error deleting messages' });
    // Delete group memberships
    db.run('DELETE FROM group_members WHERE user_id = ?', [userId], (err2) => {
      if (err2) return res.status(500).json({ error: 'DB error deleting memberships' });
      // Delete user
      db.run('DELETE FROM users WHERE id = ?', [userId], (err3) => {
        if (err3) return res.status(500).json({ error: 'DB error deleting user' });
        res.json({ success: true });
      });
    });
  });
});

router.post('/rename-group', auth, (req, res) => {
  if (!req.user.isOwner) return res.status(403).json({ error: 'Not owner' });
  const { groupId, newName } = req.body;
  db.run('UPDATE groups SET name = ? WHERE id = ?', [newName, groupId], (err) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true });
  });
});

// Server status endpoint
router.get('/server-status', auth, (req, res) => {
  if (!req.user.isOwner) return res.status(403).json({ error: 'Not owner' });
  
  // Get system metrics
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const loadAvg = os.loadavg();
  
  // Get database statistics
  const dbStats = {
    users: 0,
    groups: 0,
    messages: 0
  };
  
  // Query database counts
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (!err) dbStats.users = row.count;
    
    db.get('SELECT COUNT(*) as count FROM groups', (err, row) => {
      if (!err) dbStats.groups = row.count;
      
      db.get('SELECT COUNT(*) as count FROM messages', (err, row) => {
        if (!err) dbStats.messages = row.count;
        
        // Get active connections count
        const io = req.app.get('io'); // Get Socket.IO instance
        const activeConnections = io ? io.engine.clientsCount : 0;
        
        res.json({
          uptime,
          memory: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external
          },
          cpu: {
            load1: loadAvg[0],
            load5: loadAvg[1],
            load15: loadAvg[2]
          },
          connections: activeConnections,
          database: dbStats,
          system: {
            nodeVersion: process.version,
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length
          }
        });
      });
    });
  });
});

module.exports = router;