# 🤖 GODZILLA by Sxhd

> Multi-feature WhatsApp Bot by Sxhd — built with **Baileys** (Node.js) & **Google Gemini AI**

---

## ✨ Features

| Category | Commands | Description |
|---|---|---|
| 🤖 Google AI | `.ai`, `.gemini`, `.aiclear`, `.aistatus` | Powered by **Google Gemini** (multimodal vision + 30-min chat memory) |
| 🎨 AI Art | `.imagine`, `.aiart` | High-resolution AI Image Generator (Flux / Pollinations) |
| 🎵 Music | `.ytmusic`, `.spotify` | High-quality audio downloader |
| 🎬 Video | `.ytvideo` | YouTube video downloader (360p–1080p) |
| 📲 Social DL | `.sdl` | Instagram Reels, TikTok, Twitter/X, FB, Reddit |
| 🖼️ Wallpapers | `.wall`, `.wallmobile`, `.wallpc` | 4K & 8K PC & Portrait Mobile Wallpapers |
| 🛠️ Smart Tools | `.weather`, `.calc`, `.currency`, `.tr`, `.tts`, `.sticker` | Live weather, math, FX rates, translator, voice notes, stickers |
| 💡 Productivity | `.remind`, `.fancy`, `.password`, `.wiki`, `.github` | Timed reminders, aesthetic fonts, passwords, Wikipedia, GitHub |
| 🐾 Animals & Art | `.cat`, `.dog`, `.anime`, `.fact` | Cute animals, anime art, random facts of the day |
| 👥 Group Admin | `.kick`, `.promote`, `.demote`, `.mute`, `.unmute`, `.groupinfo`, `.tagall` | Full group moderation suite |
| 🎮 Mini Games | `.trivia`, `.8ball`, `.rps`, `.dice`, `.flip` | Interactive trivia, magic 8-ball, RPS, dice roll, coin flip |
| 🔍 Search & Fun | `.ytsearch`, `.lyrics`, `.meme`, `.joke`, `.quote` | YouTube search, song lyrics, Reddit memes, jokes |
| 👑 Admin Panel | `.admin`, `.eval`, `.exec`, `.backup`, `.cleartemp`, `.join`, `.leave`, `.block` | **Master Admin Control Panel** with all access & Web Dashboard |

---

## 🚀 Setup

### 1. Install Node.js 18+
```bash
node --version  # should be >= 18.0.0
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
- `OWNER_NUMBER` — Your WhatsApp number with country code (e.g. `919876543210`)
- `GEMINI_API_KEY` — Your free Google Gemini API Key ([Get it at Google AI Studio](https://aistudio.google.com/app/apikey))

**Optional:**
- `ADMIN_PASSWORD` — Password for Web Admin Panel (defaults to `godzilla2025`)
- `GODZILLA_SESSION` — Base64 string for 24/7 cloud hosts (Railway, Render)

*(Note: Spotify, 4K Wallpapers, and Social DL are 100% open-source with **ZERO** external API keys required!)*

### 4. Run the bot
```bash
npm start
```

On first run, a **QR code** appears in the terminal — scan it with WhatsApp (*Linked Devices*).

---

## 📌 Command Reference

### 🤖 Google Gemini AI & AI Art
```
.ai <question>               → Chat with Google Gemini AI
.ai [reply to image]         → Ask Gemini to analyze an image or code
.imagine <prompt>            → Generate AI images (Flux Engine)
.aiclear                     → Reset conversation history
.aistatus                    → Check active memory and remaining TTL
```

### 🎵 Music & Audio
```
.ytmusic <song name or URL>  → Download YouTube audio (MP3)
.spotify <Spotify URL / song>→ Download Spotify track
```

### 🎬 Video & Social Media
```
.ytvideo <query or URL> [360|480|720|1080]  → Download YouTube video
.sdl <URL>                                  → Download Instagram, TikTok, Twitter/X, FB, Reddit
```

### 🖼️ Wallpapers
```
.wall <theme> [hd|2k|4k|8k]  → PC wallpaper (e.g. .wall nature 4k)
.wallmobile <theme>          → Mobile portrait (1080x1920)
.wallpc <theme>              → PC 4K (3840x2160)
```

### 🛠️ Smart Tools & Productivity
```
.remind <minutes> <message>  → Set timed WhatsApp reminder (e.g. .remind 30 Drink water)
.fancy <text>                → Transform text into aesthetic Unicode fonts
.password [length]           → Generate cryptographically secure passwords
.wiki <topic>                → Instant Wikipedia summary & link
.github <username>           → GitHub profile inspector (bio, repos, followers)
.weather <city>              → Live weather + 3-day forecast
.calc <expression>           → Math calculator (e.g. .calc 15% of 3500)
.currency <amount> <FROM> <TO> → Live currency conversion (e.g. .currency 100 USD INR)
.tr <lang_code> <text>       → Translate text (e.g. .tr ml Hello)
.tts <text>                  → Text to speech voice note
.sticker                     → Convert replied image to WhatsApp sticker
```

### 🐾 Animals & Fun
```
.cat                         → Random cute cat picture
.dog                         → Random cute dog picture
.anime                       → Random high-resolution anime illustration
.fact                        → Random fascinating fact of the day
.meme                        → Random meme from Reddit
.joke                        → Random joke
.quote                       → Inspirational quote
```

### 👥 Group Admin Commands
```
.kick @user                  → Remove member from group (or reply to user)
.promote @user               → Promote member to admin (or reply to user)
.demote @user                → Demote admin to member (or reply to user)
.mute / .unmute              → Close or open group chat for non-admins
.tagall [message]            → Mention all group members
.groupinfo                   → Display group statistics & metadata
```

### 🎮 Mini Games
```
.trivia                      → Trivia quiz (reply with A, B, C, or D)
.8ball <question>            → Magic 8-Ball answer
.rps <rock|paper|scissors>   → Play Rock Paper Scissors
.dice [sides]                → Roll a dice (default d6)
.flip                        → Flip a coin (Heads or Tails)
```

### 👑 Master Admin Panel (All-Access Owner Commands)
```
.admin                       → Interactive Control Center & Live Hardware Metrics
.eval <javascript_code>      → Execute dynamic JavaScript with full runtime access
.exec <terminal_command>     → Run shell & terminal commands directly in WhatsApp
.backup                      → Export session backup string directly to WhatsApp
.cleartemp                   → Wipe temporary cache & report freed disk space
.setprefix <prefix>          → Change command prefix dynamically
.setname <bot_name>          → Rename the bot on the fly
.join <group_invite_link>    → Make the bot join a WhatsApp group via link
.leave                       → Make the bot exit the current group
.block @user / .unblock @user→ Block or unblock WhatsApp contacts
.broadcast <message>         → Broadcast announcements to all participating groups
.restart                     → Reboot the bot process safely
.mode <public|private|group> → Toggle bot access permissions
```

---

## 🌐 Web Admin Dashboard

When running locally or on cloud hosts (Render, Railway, VPS) with a `PORT` configured:
* Visit `http://<your-host-or-domain>:<port>/admin` in any browser.
* **📱 In-Browser Live QR Scanner**: Scan WhatsApp pairing QR directly from the web page without needing terminal access.
* **🔐 24/7 Permanent Session Manager**: 1-click copy your `GODZILLA_SESSION` string so the bot never asks to log in again.
* **👥 Groups Manager**: View all joined WhatsApp groups, member counts, and leave groups with 1 click.
* **📢 Web Broadcast & Chat**: Dispatch group announcements or send WhatsApp messages directly from the browser.
* **⚡ Interactive Web Shell & Eval**: Execute terminal commands and dynamic JavaScript directly inside the web UI.
* **📊 Real-time Hardware Meters**: CPU, RAM progress bars, and live console logs viewer.
* **🔒 Password Protected**: Secured with `ADMIN_PASSWORD` (default: `GodZilla`).

---

## 🏠 Running 24/7 on Render (Without Keeping PC On)

Render Free Tier shuts down containers after 15 minutes of inactivity. GODZILLA solves this permanently:

### 1. 24/7 Keep-Alive Heartbeat
GODZILLA automatically detects `RENDER_EXTERNAL_URL` and **pings itself every 8 minutes**, preventing Render from ever sleeping even when your PC is turned off.

### 2. Never Login Again (Permanent Session)
1. Deploy to Render as a **Web Service**.
2. Open `https://<your-app>.onrender.com/admin` on your phone or PC.
3. Enter your password (`GodZilla`) and scan the QR code displayed on the screen.
4. As soon as connected, the bot will:
   - Send your permanent session string directly to your WhatsApp DM.
   - Display it in the **24/7 Session & QR** tab on the dashboard.
5. In your Render Dashboard, go to **Environment Variables** and add:
   - Key: `GODZILLA_SESSION`
   - Value: `<your_copied_session_string>`
6. **Done!** Even if Render redeploys or restarts, it will restore your session automatically from the variable and **never ask to scan QR code again**. You can safely turn off your PC!

---

*Built by Sxhd • Powered by Baileys & Google Gemini AI*
