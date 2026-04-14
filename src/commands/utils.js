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
  const jid = msg.key.remoteJid;
  await sock.sendMessage(jid, {
    text: `ℹ️ *${config.botName} — Bot Info*\n\n🤖 *Name:* ${config.botName}\n📌 *Prefix:* ${config.prefix}\n⚙️ *Mode:* ${config.mode}\n💻 *Platform:* WhatsApp\n🔧 *Engine:* Baileys (Node.js)\n📦 *Version:* 2.0.0\n\n👤 *Owner:* Sxhd\n\n_Type ${config.prefix}help to see all commands_`,
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
