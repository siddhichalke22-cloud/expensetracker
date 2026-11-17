const fs = require('fs');
const path = require('path');
const { DATABASE_URL } = require('./env');

let dbClient = null;
let dbType = 'sqlite'; // 'postgres' or 'sqlite'

if (DATABASE_URL.startsWith('postgres://') || DATABASE_URL.startsWith('postgresql://')) {
  dbType = 'postgres';
  const { Pool } = require('pg');
  dbClient = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });
} else {
  dbType = 'sqlite';
  const sqlite3 = require('sqlite3').verbose();
  
  // Parse sqlite path
  let dbFilePath = DATABASE_URL.replace(/^sqlite:\/\//, '').replace(/^sqlite:/, '');
  if (!dbFilePath || dbFilePath === ':memory:') {
    dbFilePath = ':memory:';
  } else {
    // Ensure absolute path or resolve relative to workspace
    if (!path.isAbsolute(dbFilePath)) {
      dbFilePath = path.resolve(process.cwd(), dbFilePath);
    }
    const dir = path.dirname(dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new sqlite3.Database(dbFilePath, (err) => {
    if (err) {
      console.error('Failed to connect to SQLite database:', err.message);
    } else {
      // Enable foreign keys in SQLite
      db.run('PRAGMA foreign_keys = ON;');
    }
  });

  dbClient = db;
}

/**
 * Universal query runner
 * Accepts SQL queries using PostgreSQL-style parameter placeholders ($1, $2, ...)
 * and returns rows array, rowCount, or insertId.
 */
async function query(sql, params = []) {
  if (dbType === 'postgres') {
    const res = await dbClient.query(sql, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount,
      insertId: res.rows[0]?.id || null
    };
  }

  // SQLite execution
  return new Promise((resolve, reject) => {
    // Translate $1, $2, ... to ? for SQLite
    const sqliteSql = sql.replace(/\$\d+/g, '?');

    const trimmed = sqliteSql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH') || trimmed.startsWith('PRAGMA')) {
      dbClient.all(sqliteSql, params, (err, rows) => {
        if (err) return reject(err);
        resolve({ rows: rows || [], rowCount: (rows || []).length });
      });
    } else {
      dbClient.run(sqliteSql, params, function (err) {
        if (err) return reject(err);
        resolve({
          rows: [],
          rowCount: this.changes,
          insertId: this.lastID
        });
      });
    }
  });
}

/**
 * Initialize database schema
 */
async function initDatabase() {
  if (dbType === 'postgres') {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
        amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
        category VARCHAR(100) NOT NULL,
        description TEXT,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        payment_method VARCHAR(50) DEFAULT 'Cash',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);
    `);
  } else {
    // SQLite schema
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
        amount REAL NOT NULL CHECK (amount > 0),
        category TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL DEFAULT (date('now')),
        payment_method TEXT DEFAULT 'Cash',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);`);
  }

  console.log(`[Database] Initialized tables successfully (${dbType.toUpperCase()})`);
}

/**
 * Close database connection
 */
async function closeDatabase() {
  if (dbType === 'postgres' && dbClient) {
    await dbClient.end();
  } else if (dbType === 'sqlite' && dbClient) {
    return new Promise((resolve) => dbClient.close(resolve));
  }
}

module.exports = {
  dbType,
  dbClient,
  query,
  initDatabase,
  closeDatabase
};
