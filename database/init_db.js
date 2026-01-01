// Database Initialization Script
// This script creates the required database tables for the Simple Messaging System

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Get database path from environment or use default
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'chat.db');

// Create database directory if it doesn't exist
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`📁 Created database directory: ${dbDir}`);
}

// Connect to database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
        process.exit(1);
    }
    console.log(`🗃️ Connected to database: ${dbPath}`);
});

// Create tables
const createTables = () => {
    return new Promise((resolve, reject) => {
        // Execute SQL commands serially
        db.serialize(() => {
            // Users table
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    title TEXT DEFAULT 'User',
                    title_color TEXT DEFAULT '#007bff',
                    profile_picture TEXT,
                    description TEXT,
                    is_owner INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) return reject(err);
                console.log('✅ Created users table');
            });

            // Groups table
            db.run(`
                CREATE TABLE IF NOT EXISTS groups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) return reject(err);
                console.log('✅ Created groups table');
            });

            // Messages table
            db.run(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sender_id INTEGER NOT NULL,
                    receiver_id INTEGER,
                    group_id INTEGER,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (sender_id) REFERENCES users(id),
                    FOREIGN KEY (receiver_id) REFERENCES users(id),
                    FOREIGN KEY (group_id) REFERENCES groups(id)
                )
            `, (err) => {
                if (err) return reject(err);
                console.log('✅ Created messages table');
            });

            // Group members table
            db.run(`
                CREATE TABLE IF NOT EXISTS group_members (
                    group_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    status TEXT DEFAULT 'pending',
                    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (group_id, user_id),
                    FOREIGN KEY (group_id) REFERENCES groups(id),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `, (err) => {
                if (err) return reject(err);
                console.log('✅ Created group_members table');
            });

            // Create indexes for better performance
            db.run('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)', (err) => {
                if (err) return reject(err);
                console.log('✅ Created index on messages(sender_id)');
            });

            db.run('CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)', (err) => {
                if (err) return reject(err);
                console.log('✅ Created index on messages(receiver_id)');
            });

            db.run('CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id)', (err) => {
                if (err) return reject(err);
                console.log('✅ Created index on messages(group_id)');
            });

            db.run('CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id)', (err) => {
                if (err) return reject(err);
                console.log('✅ Created index on group_members(user_id)');
            });

            // Create a default admin user if none exists
            db.get('SELECT COUNT(*) as count FROM users WHERE is_owner = 1', (err, row) => {
                if (err) return reject(err);
                
                if (row.count === 0) {
                    const bcrypt = require('bcryptjs');
                    const hashedPassword = bcrypt.hashSync('admin', 10);
                    
                    db.run('INSERT INTO users (username, password, title, title_color, is_owner) VALUES (?, ?, ?, ?, 1)', 
                        ['admin', hashedPassword, 'Admin', '#dc3545'], (err) => {
                            if (err) return reject(err);
                            console.log('✅ Created default admin user (username: admin, password: admin)');
                            resolve();
                        });
                } else {
                    console.log('✅ Admin user already exists');
                    resolve();
                }
            });
        });
    });
};

// Initialize database
createTables()
    .then(() => {
        console.log('🎉 Database setup completed successfully!');
        db.close();
    })
    .catch((err) => {
        console.error('❌ Database setup failed:', err.message);
        db.close();
        process.exit(1);
    });