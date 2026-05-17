const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
  pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
} else {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'ai_chat_platform',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

async function initializeDatabase() {
  const connection = await pool.getConnection();
  try {
    console.log('✅ Database connected successfully');

    // Auto-migrate: add cost_usd column if it doesn't exist yet
    // Safe to run every startup — IF NOT EXISTS equivalent via IGNORE
    try {
      await connection.execute(
        `ALTER TABLE messages ADD COLUMN cost_usd DECIMAL(10,6) DEFAULT NULL`
      );
      console.log('✅ DB migration: added cost_usd column to messages');
    } catch (err) {
      // Error 1060 = "Duplicate column name" — column already exists, all good
      if (err.errno !== 1060) {
        console.warn('⚠️  DB migration warning (cost_usd):', err.message);
      }
    }
  } finally {
    connection.release();
  }
}

module.exports = { pool, initializeDatabase };
