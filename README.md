# 👩🏻‍❤️‍👩🏻 Riya AI Girlfriend & Global Economy Discord Bot + Web Hub ☕💖

[![Build Status](https://img.shields.io/badge/Status-Online-00FF7F?style=for-the-badge)](https://riya-ai-girlfriend-discord-bot-full.vercel.app/)
[![Node Version](https://img.shields.io/badge/Node.js-v18%2B-5865F2?style=for-the-badge)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-FF1493?style=for-the-badge)](https://discord.js.org/)
[![Firebase](https://img.shields.io/badge/Database-Firebase_Firestore-FFCA28?style=for-the-badge)](https://firebase.google.com/)

> **© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.**

A production-ready, feature-rich **AI Girlfriend Discord Bot & Web Dashboard** featuring **Riya**—a 20-year-old CS student and gamer girl from Ahmedabad, India—built with **Node.js (Discord.js v14)**, **Express**, **Firebase Firestore**, **OpenAI & Gemini AI**, **Karuta-Style Anime Card Collection System**, **Inter-Server Global Chat/Calls**, **Metallic Banking Economy**, **Vercel Serverless Architecture**, and an **Anti-Tamper DevTools Security Guard**.

---

## 🌟 Key Features & Systems

### 1. 🎭 Amdavadi AI Girlfriend Persona: Riya
- **Location**: Ahmedabad, Gujarat, India (Sabarmati Riverfront, SG Highway cafes).
- **Vibe**: Tech-savvy, sweet gamer girl mixing English with natural Amdavadi slang (*"Baka", "Su chale chhe?", "Bov mast", "Chalo ramiye", "Arrey yaar"*).
- **Affection System**: Mood state machine (`NEUTRAL`, `HAPPY`, `LOVING`, `SHY`), affection level progression, relationship titles, level-up cash bonuses, and persistent user memories.

### 2. 🎴 Anime Card Collection System (Karuta Style)
- **160,000+ Collectible Cards**: High-res anime character cards with custom print numbers, condition grades, and owner tracking.
- **Interactive Dropping & Grabbing**: `/card_drop` (`xdrop`) drops 4 cards with `1️⃣ 2️⃣ 3️⃣ 4️⃣` interactive buttons.
- **Card Economy & Management**: Wishlists (`/card_wishlist`), Card Collection viewer (`/card_collection`), Burn cards for Dust (`/card_burn`), and Player-to-Player Trading (`/card_trade`).

### 3. 🌐 Inter-Server Global Chat & Hotline Calls
- **Global Text Chat**: `/setup_global setchannel` (`xsetup_global setchannel`) links channels across all servers to chat live in real-time.
- **Global 1-on-1 Hotline Calls**: `/globalcall start` (`xcall`) dials out live server-to-server phone calls with `📵 End Call` buttons.
- **Private DM Calls**: `/globalprivatecall start` (`xprivatecall`) creates encrypted 1-on-1 DM hotline calls.

### 4. 💳 Metallic Banking & Global Economy
- **Banking Suite**: `/bank_balance` (`xbal`), `/deposit` (`xdep`), `/withdraw` (`xwith`), `/wallet` (`xw`), `/add_bank_balance`.
- **Metallic Rank Cards**: Gold, Platinum, and Diamond rank perks with `/globalbankbalance` (`xglobalbank`).

### 5. 🔑 Web Dashboard & Dedicated Login Portal
- **Web App**: Hosted live at [`https://riya-ai-girlfriend-discord-bot-full.vercel.app/`](https://riya-ai-girlfriend-discord-bot-full.vercel.app/).
- **Dedicated Login Page (`/login`)**: Featuring **Connect with Discord OAuth2** and **⚡ Skip Login (Guest Mode)**.
- **Circular Server Picker**: Dynamic Discord server picker grid displaying user admin servers and real-time connected bot servers.
- **Live 1-Second Ticking Uptime**: Dynamic uptime clock updating live on-screen in `Xd Xh Xm Xs` format (`3d 2h 12m 28s`).

### 6. 🔒 DevTools Protection & Anti-Inspect Security Guard
- **Anti-Tamper Security**: Disables Right-Click context menu and inspect shortcuts (`F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`, `Ctrl+U`, `Ctrl+S`).
- **Auto-Hide Security Screen**: Automatically hides/clears page contents if Developer Tools are opened (docked or split-screen) and displays a `🔒 Security Protection Active` screen.
- **Console Log Suppression**: Overrides console methods to prevent inspect data tampering.

### 7. 🛡️ Distributed Atomic Claim Lock (`claimMessageLock`)
- **Zero Double Messages**: Uses Firestore atomic message locks (`message_locks`) and process claims to prevent duplicate responses when multiple bot processes or serverless functions execute concurrently.

### 8. 💾 User Data & Privacy Session Storage
- **Session Tracking**: Persists user Discord ID, OAuth access tokens, and connected server counts securely in Firestore under `user_sessions/session_<userId>`.

---

## 🎮 Command Directory (85+ Commands - Dual Slash & Prefix)

All commands support both **Slash Commands (`/`)** and **Text Prefixes (`x` or `k!`)** (e.g. `xhelp`, `xdrop`, `xbal`, `xkiss`, `xdate`):

| Category | Example Commands | Description |
| :--- | :--- | :--- |
| **🎴 Anime Cards** | `/card_drop`, `/card_view`, `/card_collection`, `/card_wishlist`, `/card_burn`, `/card_trade`, `/card_lookup` | Karuta-style card drops, wishlist, trading, burning & database lookup |
| **⚔️ RPG & Combat** | `/attributes`, `/health`, `/cd`, `/attack`, `/battle`, `/rob` | Upgrade stats, PvP arena, dungeon raids & robbery |
| **🌍 Exploration & Mining**| `/explore`, `/mine`, `/dungeon`, `/craft`, `/trade`, `/bulksell` | Mine ores, craft gear, explore caverns & bulk sell loot |
| **🎰 Casino & Gambling** | `/blackjack`, `/slots`, `/mines`, `/crash`, `/war`, `/cups`, `/stack`, `/chance`, `/horseracing`, `/coinflip`, `/roulette` | Interactive minigames with live multipliers |
| **💳 Banking & Economy** | `/wallet`, `/deposit`, `/withdraw`, `/bank_balance`, `/globalbankbalance`, `/add_bank_balance` | Manage cash, bank accounts & global wealth leaderboards |
| **💖 Dating & Relationship**| `/date`, `/hug`, `/kiss`, `/compliment`, `/aura`, `/bestie`, `/daily_quiz`, `/daily_task` | Virtual dates, hugs, kisses, quizzes & affection XP |
| **🌐 System & Global** | `/setup_global`, `/globalcall`, `/globalprivatecall`, `/select_channel`, `/settings`, `/about` | Link global chat channels, phone calls & server channel binding |

---

## 📁 Project Directory Structure

```
👩🏻‍❤️‍👩🏻︱ᴀɪ-ɢɪʀʟꜰʀɪᴇɴᴅ/
├── package.json                   # Project dependencies and deployment scripts
├── .env.example                   # Environment configuration template
├── README.md                      # Comprehensive project documentation & guide
├── api/
│   └── index.js                   # Vercel Serverless Express API router (/health, /login, /connect, /api/user/session)
└── src/
    ├── index.js                   # Main application entry point: Express server & Discord Client initialization
    ├── config.js                  # Environment variable configuration & defaults loader
    ├── database/
    │   ├── connect.js             # Firebase Firestore connection initializer
    │   └── models/
    │       ├── User.js            # User document schema, session tracking & claimMessageLock
    │       ├── GuildConfig.js     # Guild server settings & channel binding schema
    │       └── Gang.js            # Gang syndicate schema
    ├── services/
    │   ├── aiService.js           # OpenAI & Gemini AI chat completion engine with Riya persona
    │   ├── cardService.js         # Karuta anime card generator & Firestore card database engine
    │   ├── economyService.js      # Global banking, transactions & metallic card tiers
    │   ├── globalChatService.js   # Inter-server text broadcast relay service
    │   ├── globalCallService.js   # Inter-server hotline call relay service
    │   ├── globalPrivateCallService.js # 1-on-1 private DM hotline relay service
    │   ├── guildService.js        # Discord REST API connected server fetching service
    │   ├── moodService.js         # Sentiment analysis & dynamic mood state machine
    │   ├── rpgService.js          # Affection XP, leveling, attributes & daily tasks
    │   └── voiceService.js        # Whisper audio transcription & TTS engine
    ├── events/
    │   ├── ready.js               # Bot startup & slash command registration
    │   ├── messageCreate.js       # Atomic claim lock, prefix adapter & message processing router
    │   └── interactionCreate.js   # Slash command router & button interaction handler
    ├── web/
    │   ├── dashboard.js           # Web dashboard UI module with live 1s ticking uptime & server picker
    │   └── login.js               # Dedicated glassmorphism /login page with Connect Discord & Skip Login options
    ├── commands/                  # 85+ modular Discord command files
    └── utils/
        ├── prefixAdapter.js       # Dual prefix parsing adapter (x & k!) & mock interaction generator
        ├── commandLoader.js       # Automatic command file loader
        ├── logger.js              # Timestamped console logging utility
        └── randomEvents.js        # Spontaneous channel activity events
```

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the root directory:

```env
# Discord Bot Credentials
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_client_id_here
REDIRECT_URI=https://riya-ai-girlfriend-discord-bot-full.vercel.app/auth/callback

# AI Engine Credentials
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
TENOR_API_KEY=your_tenor_api_key_here

# Firebase Firestore Configuration
FIREBASE_API_KEY=AIzaSy_YOUR_GOOGLE_API_KEY_HERE
FIREBASE_AUTH_DOMAIN=riya-ai-girlfriend-discord-bot.firebaseapp.com
FIREBASE_DATABASE_URL=https://riya-ai-girlfriend-discord-bot-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=riya-ai-girlfriend-discord-bot
FIREBASE_STORAGE_BUCKET=riya-ai-girlfriend-discord-bot.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=1016322069093
FIREBASE_APP_ID=1:1016322069093:web:51cc280facd87caa5d2c8c

# Server Port
PORT=3000
```

---

## 🚀 Deployment Guide

### Vercel Serverless Deployment
1. Import repository into **Vercel**.
2. Set Environment Variables (`DISCORD_TOKEN`, `CLIENT_ID`, `FIREBASE_*`).
3. Deploy! Output URL: `https://riya-ai-girlfriend-discord-bot-full.vercel.app/`

### 24/7 Cloud Deployment
- **Build Command**: `npm install`
- **Run Command**: `node server.js` (or `node index.js`)
- **Health Check Endpoint**: `/health` (also `/ping`, `/uptime`, `/`)
- **Auto Keep-Alive**: Add `APP_URL=https://your-domain.com` to environment variables for built-in 4-minute self-pinging.

### Local / Self-Hosted Running
```bash
# Install dependencies
npm install

# Check Node.js syntax
node --check src/index.js api/index.js src/web/dashboard.js src/web/login.js

# Start Bot Server
npm start
```

---

## 📄 License & Copyright

**© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.**  
*All code, assets, and branding for Riya AI Girlfriend Discord Bot are protected under copyright.*
"# Riya-ai-girlfriend-Discord-bot-free" 
"# Riya-ai-girlfriend-Discord-bot-free" 
"# Riya-ai-girlfriend-Discord-bot-free" 
"# Riya-ai-girlfriend-Discord-bot-free" 
