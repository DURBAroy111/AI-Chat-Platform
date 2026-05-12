const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initializeDatabase } = require('./db/database');
const routes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Ensure upload directories exist
const dirs = [
  path.join(__dirname, UPLOAD_DIR),
  path.join(__dirname, UPLOAD_DIR, 'images'),
  path.join(__dirname, UPLOAD_DIR, 'videos'),
];
dirs.forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, UPLOAD_DIR)));

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 AI Chat Platform Backend');
      console.log(`   Server: http://localhost:${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
      console.log(`   Uploads: http://localhost:${PORT}/uploads/`);
      console.log('');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    console.error('   Make sure XAMPP MySQL is running and .env is configured');
    process.exit(1);
  }
}

start();
