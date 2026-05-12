const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'ai_chat_platform',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initializeDatabase() {
  const connection = await pool.getConnection();
  try {
    // Create chats table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chats (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) DEFAULT 'New Chat',
        task_type ENUM('text', 'image', 'video') NOT NULL DEFAULT 'text',
        model_id VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create messages table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        chat_id VARCHAR(36) NOT NULL,
        role ENUM('user', 'assistant') NOT NULL,
        content TEXT,
        media_url VARCHAR(500),
        media_type ENUM('text', 'image', 'video') NOT NULL DEFAULT 'text',
        model_id VARCHAR(100),
        job_id VARCHAR(255),
        status ENUM('pending', 'processing', 'complete', 'error') DEFAULT 'complete',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
        INDEX idx_chat_created (chat_id, created_at)
      )
    `);

    console.log('✅ Database tables initialized');
  } finally {
    connection.release();
  }
}

module.exports = { pool, initializeDatabase };
