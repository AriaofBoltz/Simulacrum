// Database Connection Module
// This module provides a connection to the SQLite database

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Get database path from environment or use default
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'chat.db');

// Create and export database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
        throw err;
    }
    console.log(`Connected to SQLite database at ${dbPath}`);
});

// Export the database connection for use in other modules
module.exports = db;