const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const db = require('../database/db');

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: process.env.LOG_FILE || 'logs/app.log' })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
    new winston.transports.Console()
  ]
});

// Override Winston's exception handler to also use our crash logger
const originalExceptionHandlers = logger.exceptionHandlers;
logger.exceptionHandlers = [
  new winston.transports.File({
    filename: 'logs/exceptions.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  new winston.transports.Console()
];

// Add our custom crash logger for uncaught exceptions
process.on('uncaughtException', (error) => {
  const { logCrash } = require('./utils/crashLogger');
  logCrash(error, { type: 'uncaughtException' });
});

process.on('unhandledRejection', (reason, promise) => {
  const { logCrash } = require('./utils/crashLogger');
  logCrash(reason, { type: 'unhandledRejection', promise: promise.toString() });
});

const app = express();
const server = http.createServer(app);

// Configure CORS with specific origin in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') || '*' : '*',
  methods: ["GET", "POST"],
  credentials: true
};

const io = socketIo(server, {
  cors: corsOptions
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configure Content Security Policy to allow Socket.IO
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "script-src 'self' https://cdn.socket.io;");
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

app.use(express.static(path.join(__dirname, '../client')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  const { logCrash } = require('./utils/crashLogger');
  
  // Log the crash with title and funny message
  const crashLog = logCrash(err, {
    status: err.status || 500,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  
  // Also log to Winston
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  
  res.status(500).json({ error: 'Internal Server Error' });
});

app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/chat', require('./routes/chat'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Make Socket.IO instance available to routes
app.set('io', io);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('authenticate', (token) => {
    try {
      const user = jwt.verify(token, JWT_SECRET);
      socket.user = user;
      socket.join(user.id);
      db.all('SELECT group_id FROM group_members WHERE user_id = ? AND status = ?', [user.id, 'approved'], (err, rows) => {
        if (!err) rows.forEach(row => socket.join(`group-${row.group_id}`));
      });
      socket.emit('authenticated');
    } catch {
      socket.emit('auth-error');
    }
  });

  socket.on('private-message', (data) => {
    if (!socket.user) return;
    console.log('Private message from', socket.user.username, 'to user id', data.to, ':', data.message, 'at', new Date().toISOString());
    db.run('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)', [socket.user.id, data.to, data.message]);
    console.log('Emitting private-message to', data.to, 'at', new Date().toISOString());
    io.to(data.to).emit('private-message', { from: socket.user.username, message: data.message, fromId: socket.user.id });
  });

  socket.on('group-message', (data) => {
    if (!socket.user) return;
    console.log('Group message from', socket.user.username, 'to group', data.groupId, ':', data.message, 'at', new Date().toISOString());
    db.run('INSERT INTO messages (sender_id, group_id, content) VALUES (?, ?, ?)', [socket.user.id, data.groupId, data.message]);
    console.log('Emitting group-message to room group-' + data.groupId, 'at', new Date().toISOString());
    io.to(`group-${data.groupId}`).emit('group-message', { from: socket.user.username, message: data.message, fromId: socket.user.id, groupId: data.groupId });
  });

  socket.on('join-group', (groupId) => {
    if (!socket.user) return;
    const status = socket.user.isOwner ? 'approved' : 'pending';
    db.run('INSERT OR IGNORE INTO group_members (group_id, user_id, status) VALUES (?, ?, ?)', [groupId, socket.user.id, status]);
    if (status === 'approved') {
      socket.join(`group-${groupId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Initialize console commands
const ConsoleCommands = require('./console');
const consoleCommands = new ConsoleCommands(server, app);
consoleCommands.start();