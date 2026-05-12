# AI Chat Platform — Complete Setup Guide

A full-stack AI chat platform supporting Text, Image, and Video generation via fal.ai.
Uses XAMPP (MySQL) for database storage and local file storage for generated media.

---

## What You Need Before Starting

1. **XAMPP** — for MySQL database → https://www.apachefriends.org
2. **Node.js 18+** — for running the app → https://nodejs.org (download LTS)
3. **fal.ai API Key** — for AI models → https://fal.ai/dashboard (free to sign up)

---

## Step-by-Step Setup

### STEP 1 — Install XAMPP

1. Download XAMPP from https://www.apachefriends.org
2. Run the installer (install to `C:\xampp`)
3. Open **XAMPP Control Panel**
4. Click **Start** next to **Apache** (optional, for phpMyAdmin)
5. Click **Start** next to **MySQL** ← THIS IS REQUIRED

You should see green "Running" status for MySQL.

---

### STEP 2 — Create the Database

**Option A: Using phpMyAdmin (easiest)**

1. Open your browser → go to `http://localhost/phpmyadmin`
2. Click **SQL** tab at the top
3. Copy and paste the entire contents of `database-setup.sql`
4. Click **Go**
5. You should see: "Database setup complete!"

**Option B: Using MySQL command line**

Open Command Prompt and run:
```
C:\xampp\mysql\bin\mysql.exe -u root -p < database-setup.sql
```
(Leave password blank if you haven't set one)

---

### STEP 3 — Install Node.js

1. Go to https://nodejs.org
2. Download the **LTS** version (e.g. 20.x or 22.x)
3. Run the installer — keep all defaults, check "Add to PATH"
4. Open a new Command Prompt and verify: `node --version`

---

### STEP 4 — Get your fal.ai API Key

1. Go to https://fal.ai/dashboard
2. Sign up for a free account
3. Go to **API Keys** → **Create new key**
4. Copy the key (starts with `fal-...`)

---

### STEP 5 — Configure the Backend

1. Go into the `backend` folder
2. Copy `.env.example` to `.env`
3. Open `.env` in Notepad and fill in:

```
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ai_chat_platform
DB_USER=root
DB_PASSWORD=           ← leave blank if no MySQL password
FAL_KEY=your_fal_api_key_here   ← paste your key here
CORS_ORIGIN=http://localhost:5173
```

Save the file.

---

### STEP 6 — Install Dependencies

Open Command Prompt. Navigate to the project folder.

**Install backend dependencies:**
```cmd
cd backend
npm install
```

**Install frontend dependencies:**
```cmd
cd ..\frontend
npm install
```

---

### STEP 7 — Start the Servers

You need **two** Command Prompt windows open at the same time.

**Terminal 1 — Backend:**
```cmd
cd backend
node server.js
```
You should see:
```
✅ Database tables initialized
🚀 AI Chat Platform Backend
   Server: http://localhost:3001
```

**Terminal 2 — Frontend:**
```cmd
cd frontend
npm run dev
```
You should see:
```
  ➜  Local:   http://localhost:5173/
```

---

### STEP 8 — Open the App

Go to: **http://localhost:5173**

Click **New Chat** → pick Text, Image, or Video → pick a model → start chatting!

---

## Quick Start (Windows Only)

Double-click `START-WINDOWS.bat` — it will:
- Check Node.js is installed
- Create `.env` from template and open it in Notepad
- Install all dependencies
- Start both servers
- Open the browser

---

## Project Structure

```
ai-chat-platform/
├── backend/
│   ├── server.js              ← Express entry point
│   ├── .env.example           ← Copy to .env and fill in
│   ├── db/
│   │   └── database.js        ← MySQL connection + table creation
│   ├── controllers/
│   │   ├── chatController.js  ← CRUD for chats
│   │   └── messageController.js ← AI generation logic
│   ├── services/
│   │   └── falService.js      ← fal.ai API wrapper
│   ├── routes/
│   │   └── index.js           ← All API routes
│   └── uploads/               ← Generated files saved here
│       ├── images/
│       └── videos/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            ← Root component
│   │   ├── components/
│   │   │   ├── Sidebar.jsx         ← Chat list
│   │   │   ├── ChatWindow.jsx      ← Main chat UI
│   │   │   ├── MessageBubble.jsx   ← Individual messages
│   │   │   ├── ModelSelector.jsx   ← Model dropdown
│   │   │   └── NewChatModal.jsx    ← New chat flow
│   │   ├── services/
│   │   │   └── api.js         ← All backend API calls
│   │   └── utils/
│   │       └── models.js      ← Model configs
│   └── vite.config.js         ← Dev server + proxy config
│
├── database-setup.sql         ← Run this in phpMyAdmin
└── START-WINDOWS.bat          ← One-click start (Windows)
```

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/health | Health check |
| GET | /api/chats | List all chats |
| POST | /api/chats | Create new chat |
| GET | /api/chats/:id/messages | Load chat history |
| DELETE | /api/chats/:id | Delete chat + files |
| POST | /api/chats/:id/messages | Send message (triggers AI) |
| GET | /api/jobs/:messageId/status | Poll video job status |
| GET | /api/models | Get all available models |
| GET | /api/admin/disk-usage | Check uploads folder size |
| GET | /uploads/* | Serve generated files |

---

## Troubleshooting

**"MySQL connection failed"**
→ Make sure XAMPP MySQL is running (green in XAMPP Control Panel)
→ Check DB_PASSWORD in .env matches your MySQL root password

**"FAL_KEY not set" or AI errors**
→ Open backend/.env and check FAL_KEY is set correctly
→ Make sure there are no spaces around the `=` sign

**Port already in use**
→ Change PORT=3001 in .env (and update vite.config.js proxy target)

**Images/videos not loading**
→ Check the backend terminal for file save errors
→ Make sure backend/uploads/images/ and /videos/ folders exist

**"Cannot GET /"**
→ Make sure you open http://localhost:5173 not 3001
→ 3001 is the backend API, 5173 is the frontend

---

## Adding fal.ai Credits

fal.ai has a free tier but image/video generation costs credits.
1. Go to https://fal.ai/dashboard
2. Add a payment method or use the free tier
3. FLUX Schnell (cheapest image model) costs only $0.003/image

---

*Built with React + Vite + Express + MySQL + fal.ai*
