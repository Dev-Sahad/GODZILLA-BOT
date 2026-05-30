// commands/utils.js — Utility commands: ping, uptime, info, help, alive

import { config } from '../config.js';

const startTime = Date.now();

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

/**
 * .ping — Check latency
 */
export async function pingCommand(sock, msg) {
  const jid    = msg.key.remoteJid;
  const before = Date.now();
  const sent   = await sock.sendMessage(jid, { text: '🏓 Pong!' });
  const after  = Date.now();
  const latency = after - before;

  await sock.sendMessage(jid, {
    text: `🏓 *Pong!*\n⚡ Latency: *${latency}ms*\n📶 Status: *Online*`,
  });
}

/**
 * .uptime — Show bot uptime
 */
export async function uptimeCommand(sock, msg) {
  const jid    = msg.key.remoteJid;
  const uptime = Date.now() - startTime;
  await sock.sendMessage(jid, {
    text: `⏱️ *Bot Uptime*\n\n🟢 Running for: *${formatUptime(uptime)}*\n🤖 Bot: *${config.botName}*\n📌 Prefix: *${config.prefix}*`,
  });
}

/**
 * .alive — Simple alive check
 */
export async function aliveCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  await sock.sendMessage(jid, {
    text: `✅ *${config.botName} is Online!*\n\n🟢 Status: Running\n⏱ Uptime: ${formatUptime(Date.now() - startTime)}\n📌 Prefix: ${config.prefix}\n\n_Type ${config.prefix}help for all commands_`,
  });
}

/**
 * .info — Bot information
 */
export async function infoCommand(sock, msg) {
<<<<<<< HEAD
  const jid = msg.key.remoteJid;
  await sock.sendMessage(jid, {
    text: `ℹ️ *${config.botName} — Bot Info*\n\n🤖 *Name:* ${config.botName}\n📌 *Prefix:* ${config.prefix}\n⚙️ *Mode:* ${config.mode}\n💻 *Platform:* WhatsApp\n🔧 *Engine:* Baileys (Node.js)\n📦 *Version:* 2.0.0\n\n👤 *Owner:* Sxhd\n\n_Type ${config.prefix}help to see all commands_`,
=======
  const jid     = msg.key.remoteJid;
  const uptime  = formatUptime(Date.now() - startTime);

  // Live ping
  const before  = Date.now();
  await sock.sendMessage(jid, { text: '🦖 *Loading GODZILLA info…*' });
  const ping    = Date.now() - before;

  // Live time & date
  const now     = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  const text =
`╔═══════════════════════════╗
║   🦖 *GODZILLA BOT v2.0.0*  ║
║      _by Sxhd_              ║
╚═══════════════════════════╝

━━━━━━ 🪪 *IDENTITY* ━━━━━━━
📛 *Name*        : GODZILLA
🔖 *Version*     : 2.0.0
👑 *Owner*       : Sxhd
🏠 *Community*   : SHA COMMUNITY
📅 *Born*        : 2025
🌍 *Status*      : 🟢 _Online 24/7_

━━━━━━ ⚙️ *SYSTEM* ━━━━━━━━
📌 *Prefix*      : ${config.prefix}
💬 *Commands*    : 50+
🔧 *Engine*      : Baileys
💻 *Runtime*     : Node.js v24
🧠 *AI Model*    : Claude Haiku
🌐 *Platform*    : WhatsApp Web
📡 *Connection*  : WebSocket

━━━━━━ 📊 *LIVE STATS* ━━━━━━
⏱️ *Uptime*      : ${uptime}
🕒 *Time*        : ${timeStr}
📅 *Date*        : ${dateStr}
⚡ *Ping*        : ${ping}ms
🟢 *Mode*        : ${config.mode}

━━━━━━ 🎯 *FEATURES* ━━━━━━━
✅ YouTube Music Downloader
✅ YouTube Video (360p–1080p)
✅ Spotify Track Downloader
✅ Instagram Reels Downloader
✅ TikTok Video Downloader
✅ Twitter/X Video Downloader
✅ Facebook Video Downloader
✅ Reddit Video Downloader
✅ 4K & 8K PC Wallpapers
✅ Mobile Portrait Wallpapers
✅ AI Chat with Memory
✅ AI Image Understanding
✅ Live Weather + 3 Day Forecast
✅ Image to Sticker Converter
✅ Video to Animated Sticker
✅ Currency Converter (Live Rates)
✅ Multi-language Translator
✅ Text to Speech (Voice Note)
✅ Math Calculator
✅ Song Lyrics Finder
✅ YouTube Search
✅ Group Kick/Promote/Demote
✅ Group Mute/Unmute
✅ Tag All Members
✅ Trivia Quiz Game
✅ Magic 8-Ball
✅ Rock Paper Scissors
✅ Dice Roll & Coin Flip
✅ Random Memes from Reddit
✅ Jokes & Quotes
✅ Broadcast to All Groups
✅ Auto Reconnect 24/7

━━━━━━ 👨‍💻 *CREDITS* ━━━━━━━
💻 *Developer*   : Sxhd
🦖 *Project*     : GODZILLA Bot
🏠 *Built for*   : SHA COMMUNITY
🧠 *AI by*       : Anthropic (Claude)
🔧 *Bot by*      : Baileys Framework
📦 *Hosted on*   : Railway.app

━━━━━━ 📬 *GET IN TOUCH* ━━━━━

╔ 💬 *WhatsApp* ╗
║ Contact via WhatsApp ║
╚══════════════════════╝

╔ 📸 *Instagram* ╗
║ @sahad_____sha ║
╚════════════════╝

╔ 🐙 *GitHub* ╗
║ github.com/SxhdSha ║
╚════════════════════╝

╔ 🐙 *GitHub 2* ╗
║ github.com/Dev-Sahad ║
╚══════════════════════╝

╔ 🎮 *Discord* ╗
║ sxhd_sha ║
╚══════════╝

_For bugs & suggestions_

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Type ${config.prefix}help to see all commands_
_🦖 GODZILLA — King of Bots_
_Always Online. Always Ready._`;

  await sock.sendMessage(jid, { text });

  // Second message — clickable contact links
  await sock.sendMessage(jid, {
    text:
`📬 *CONTACT SXHD — SHA COMMUNITY*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 *WhatsApp*
https://wa.me/918147120709

📸 *Instagram*
https://instagram.com/sahad_____sha

🐙 *GitHub*
https://github.com/SxhdSha

🐙 *GitHub 2*
https://github.com/Dev-Sahad

🎮 *Discord*
https://discord.gg/sxhd_sha

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Tap any link to open_ 👆
_For bugs & suggestions only_`,
>>>>>>> b554de4 (Initial commit: Project setup)
  });
}

/**
 * .help — Full command list
 */
export async function helpCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const p   = config.prefix;

  const helpText = `
╔═══════════════════════╗
║  🦖 *GODZILLA by Sxhd*  ║
╚═══════════════════════╝

━━━━━━━━ 🎵 *MUSIC* ━━━━━━━━
▸ ${p}ytmusic <query/URL>
▸ ${p}spotify <URL/song name>

━━━━━━ 🎬 *VIDEO* ━━━━━━━
▸ ${p}ytvideo <query> [360|720|1080]
▸ ${p}sdl <URL>  _(IG/TT/Twitter/FB/Reddit)_

━━━━━ 🖼️ *WALLPAPER* ━━━━━━
▸ ${p}wall <theme> [hd|2k|4k|8k]
▸ ${p}wallmobile <theme>
▸ ${p}wallpc <theme>

━━━━━━ 🤖 *AI CHAT* ━━━━━━━
▸ ${p}ai <message>
▸ ${p}aiclear  _(reset history)_

━━━━━━ 🛠️ *TOOLS* ━━━━━━━━
▸ ${p}weather <city>
▸ ${p}calc <expression>
▸ ${p}currency <amt> <FROM> <TO>
▸ ${p}tr <lang_code> <text>
▸ ${p}tts <text>
▸ ${p}sticker  _(reply to image)_
▸ ${p}lyrics <song>
▸ ${p}ytsearch <query>

━━━━━━ 🎮 *GAMES* ━━━━━━━━
▸ ${p}trivia
▸ ${p}8ball <question>
▸ ${p}rps <rock|paper|scissors>
▸ ${p}dice [sides]
▸ ${p}flip

━━━━━ 👥 *GROUP ADMIN* ━━━━━
▸ ${p}kick @user
▸ ${p}promote / ${p}demote @user
▸ ${p}mute / ${p}unmute
▸ ${p}tagall <message>
▸ ${p}groupinfo

━━━━━━ 😂 *FUN* ━━━━━━━━━
▸ ${p}meme  ▸ ${p}joke  ▸ ${p}quote

━━━━━━ ⚙️ *UTILITY* ━━━━━━━
▸ ${p}ping  ▸ ${p}alive  ▸ ${p}uptime  ▸ ${p}info

━━━━━ 👑 *OWNER ONLY* ━━━━━
▸ ${p}broadcast <msg>
▸ ${p}restart  ▸ ${p}mode <public|private|group>

_🦖 GODZILLA by Sxhd_`.trim();

  await sock.sendMessage(jid, { text: helpText });
}
