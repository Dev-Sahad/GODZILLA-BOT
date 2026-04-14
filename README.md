# 🤖 GODZILLA by Sxhd

> Multi-feature WhatsApp Bot by Sxhd — built with **Baileys** (Node.js)

---

## ✨ Features

| Category | Commands |
|---|---|
| 🎵 Music | `.ytmusic`, `.spotify` — Download audio |
| 🎬 Video | `.ytvideo` — YouTube video (360p–1080p) |
| 📲 Social DL | `.sdl` — Instagram, TikTok, Twitter, FB, Reddit |
| 🖼️ Wallpapers | `.wall`, `.wallmobile`, `.wallpc` — 4K/8K |
| 🔍 Search | `.ytsearch`, `.lyrics` |
| 😂 Fun | `.meme`, `.joke`, `.quote` |
| 🛠️ Utility | `.ping`, `.alive`, `.uptime`, `.info`, `.help` |
| 👑 Owner | `.broadcast`, `.restart`, `.mode` |

---

## 🚀 Setup

### 1. Install Node.js 18+
```bash
node --version  # should be >= 18
```

### 2. Clone & install dependencies
```bash
git clone https://github.com/SxhdSha/godzilla-bot
cd godzilla-bot
npm install
```

### 3. Configure `.env`
```bash
cp .env.example .env
nano .env   # Fill in your details
```

**Required:**
- `OWNER_NUMBER` — Your WhatsApp number (e.g. `919876543210`)

**Optional (enhances features):**
- `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` — For Spotify metadata
- `WALLHAVEN_API_KEY` — For wallhaven.cc 4K/8K wallpapers
- `RAPID_API_KEY` — For additional social media downloaders

### 4. Run the bot
```bash
npm start
```

On first run, a **QR code** appears in the terminal — scan it with WhatsApp (Linked Devices).

---

## 📌 Command Reference

### 🎵 Music
```
.ytmusic <song name or YouTube URL>
.spotify <Spotify URL or song name>
```

### 🎬 Video
```
.ytvideo <query or URL> [360|480|720|1080]
```

### 📲 Social Download
```
.sdl <Instagram/TikTok/Twitter/Facebook/Reddit URL>
```
Supports: Instagram Reels, TikTok, Twitter/X, Facebook Videos, Reddit Videos, Pinterest

### 🖼️ Wallpapers
```
.wall <theme> [hd|2k|4k|8k]     → PC wallpaper
.wallmobile <theme>              → Portrait (1080x1920)
.wallpc <theme>                  → PC 4K (3840x2160)
```
Theme examples: `nature`, `anime`, `dark`, `minimal`, `space`, `city`, `car`

### 🔍 Search
```
.ytsearch <query>       → YouTube search (no download)
.lyrics <song name>     → Get song lyrics
```

### 😂 Fun
```
.meme     → Random meme from Reddit
.joke     → Random joke
.quote    → Inspirational quote
```

### 🛠️ Utilities
```
.ping     → Check latency
.alive    → Bot status check
.uptime   → How long bot has been running
.info     → Bot information
.help     → Full command list
```

### 👑 Owner Commands
```
.broadcast <message>     → Send to all groups
.restart                 → Restart bot
.mode <public|private|group>  → Change bot mode
```

---

## 🏠 Hosting

### Option 1: Render.com (Free)
1. Push code to GitHub
2. Create a new **Web Service** on Render
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add all `.env` variables in the Render dashboard

### Option 2: VPS / Local
```bash
# Install PM2 for auto-restart
npm install -g pm2
pm2 start index.js --name godzilla-bot
pm2 save
pm2 startup
```

---

## 📂 Project Structure

```
godzilla-bot/
├── index.js              # Entry point & WhatsApp connection
├── src/
│   ├── config.js         # Bot configuration
│   ├── handler.js        # Command router
│   ├── helpers.js        # Shared utilities
│   ├── logger.js         # Pretty logger
│   └── commands/
│       ├── ytmusic.js    # YouTube audio download
│       ├── ytvideo.js    # YouTube video download
│       ├── spotify.js    # Spotify downloader
│       ├── socialdl.js   # Social media video downloader
│       ├── wallpaper.js  # Wallpaper downloader
│       ├── utils.js      # Utility commands
│       ├── fun.js        # Fun commands
│       └── owner.js      # Owner-only commands
├── sessions/             # WhatsApp session data (auto-created)
├── temp/                 # Temp media files (auto-cleaned)
├── .env.example
└── package.json
```

---

## ⚡ Adding New Commands

1. Create `src/commands/mycommand.js`
2. Export a function: `export async function myCommand(sock, msg, args) { ... }`
3. Register it in `src/handler.js` under `COMMANDS`

---

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| QR not showing | Make sure terminal supports Unicode |
| Session expired | Delete `sessions/` folder and restart |
| Download fails | Check internet connection; URL may be private |
| Bot not responding | Check `.env` prefix matches what you type |

---

*Built by Sxhd • Powered by Baileys*
