-- AI Chat Platform - Database Setup
-- Run this in phpMyAdmin or MySQL command line BEFORE starting the backend

-- Create the database
CREATE DATABASE IF NOT EXISTS ai_chat_platform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ai_chat_platform;

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) DEFAULT 'New Chat',
  task_type ENUM('text', 'image', 'video') NOT NULL DEFAULT 'text',
  model_id VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify setup
SELECT 'Database setup complete!' AS status;
SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'ai_chat_platform';
