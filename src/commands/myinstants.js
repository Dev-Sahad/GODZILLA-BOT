// commands/myinstants.js — MyInstants Meme Sounds Integration
// Supports:
//   🔊 .sound / .instant <name> — Search & play any meme sound from MyInstants
//   🔍 .sounds / .searchsound <query> — Browse top meme sounds
//   🎲 .randomsound — Play a random trending sound
//   ⚡ Instant shortcuts: .bruh, .boom, .fbi, .emotional, .airhorn, .fart, .tada

import axios from 'axios';
import fs from 'fs-extra';
import { getTempPath, cleanupFile } from '../helpers.js';
import { config } from '../config.js';

const MYINSTANTS_API = 'https://www.myinstants.com/api/v1/instants/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Common sound shortcuts with direct or reliable search queries
const SHORTCUTS = {
  bruh:      'movie_1',
  boom:      'vine-dramatic-boom-sound-effect',
  vineboom:  'vine-dramatic-boom-sound-effect',
  fbi:       'fbi-open-up-sfx',
  emotional: 'emotional-damage-meme',
  airhorn:   'mlg-airhorn',
  fart:      'dry-fart',
  tada:      'tada-sound',
  yeet:      'yeet-sound-effect',
  augh:      'augh-sound-effect',
  sheesh:    'sheesh-sound',
  baba:      'baba-ji-ka-thullu',
};

/**
 * Download sound from URL and send as WhatsApp audio / voice note
 */
async function sendMemeSound(sock, jid, soundObj, msg, asPtt = true) {
  let soundUrl = soundObj.sound;
  if (!soundUrl.startsWith('http')) {
    soundUrl = `https://www.myinstants.com${soundUrl}`;
  }

  const tempPath = await getTempPath(`instant_${Date.now()}.mp3`);
  const res = await axios.get(soundUrl, {
    responseType: 'stream',
    headers: { 'User-Agent': USER_AGENT },
    timeout: 20000,
  });

  const ws = fs.createWriteStream(tempPath);
  await new Promise((resolve, reject) => {
    res.data.pipe(ws);
    ws.on('finish', resolve);
    ws.on('error', reject);
  });

  const buffer = await fs.readFile(tempPath);

  await sock.sendMessage(jid, {
    audio: buffer,
    mimetype: 'audio/mpeg',
    ptt: asPtt,
    fileName: `${soundObj.name}.mp3`,
  }, { quoted: msg });

  await sock.sendMessage(jid, {
    text: `🔊 *${soundObj.name}*\n🔗 _via myinstants.com_`,
  });

  await cleanupFile(tempPath);
}

/**
 * .sound <query> or .instant <query> — Search and play meme sound
 */
export async function soundCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const query = args.join(' ').trim();

  if (!query) {
    return sock.sendMessage(jid, {
      text: `🔊 *MyInstants Meme Sounds*\n\n*Usage:* ${config.prefix}sound <meme name>\n\n*Examples:*\n▸ ${config.prefix}sound bruh\n▸ ${config.prefix}sound vine boom\n▸ ${config.prefix}sound emotional damage\n▸ ${config.prefix}sound fbi open up\n▸ ${config.prefix}sound anime wow\n\n*Browse:* ${config.prefix}sounds <search>\n*Random:* ${config.prefix}randomsound`,
    });
  }

  try {
    const res = await axios.get(
      `${MYINSTANTS_API}?format=json&name=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': USER_AGENT }, timeout: 10000 }
    );

    const list = res.data?.results || [];
    if (list.length === 0) {
      return sock.sendMessage(jid, {
        text: `❌ No meme sound found for "_${query}_".\nTry: ${config.prefix}sounds ${query} to browse or try a different term.`,
      });
    }

    const sound = list[0];
    await sendMemeSound(sock, jid, sound, msg);
  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Failed to fetch meme sound.\n_${err.message}_`,
    });
  }
}

/**
 * .sounds <query> — Browse multiple sound search results
 */
export async function soundsListCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const query = args.join(' ').trim();

  if (!query) {
    return sock.sendMessage(jid, {
      text: `🔍 *Usage:* ${config.prefix}sounds <keyword>\n\nExample: ${config.prefix}sounds scream`,
    });
  }

  try {
    const res = await axios.get(
      `${MYINSTANTS_API}?format=json&name=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': USER_AGENT }, timeout: 10000 }
    );

    const list = (res.data?.results || []).slice(0, 10);
    if (list.length === 0) {
      return sock.sendMessage(jid, {
        text: `❌ No results found for "_${query}_".`,
      });
    }

    const items = list.map((s, i) => `*${i + 1}.* ${s.name}\n   ▸ Play: \`${config.prefix}sound ${s.name}\``).join('\n\n');

    await sock.sendMessage(jid, {
      text: `🔊 *MyInstants Results for: "${query}"*\n\n${items}\n\n_Type ${config.prefix}sound <name> to play any sound_`,
    });
  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Search failed: ${err.message}`,
    });
  }
}

/**
 * .randomsound — Play a random trending sound
 */
export async function randomSoundCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    const page = Math.floor(Math.random() * 5) + 1;
    const res = await axios.get(
      `${MYINSTANTS_API}?format=json&page=${page}`,
      { headers: { 'User-Agent': USER_AGENT }, timeout: 10000 }
    );

    const list = res.data?.results || [];
    if (list.length === 0) throw new Error('No sounds found');

    const sound = list[Math.floor(Math.random() * list.length)];
    await sendMemeSound(sock, jid, sound, msg);
  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Failed to play random sound: ${err.message}`,
    });
  }
}

/**
 * Handler for shortcut commands (.bruh, .boom, etc.)
 */
export async function soundShortcutCommand(sock, msg, shortcutName) {
  const jid = msg.key.remoteJid;
  const query = shortcutName.toLowerCase();

  try {
    // Search for shortcut query
    const res = await axios.get(
      `${MYINSTANTS_API}?format=json&name=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': USER_AGENT }, timeout: 10000 }
    );

    const list = res.data?.results || [];
    if (list.length > 0) {
      await sendMemeSound(sock, jid, list[0], msg);
    } else {
      await soundCommand(sock, msg, [query]);
    }
  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Sound failed: ${err.message}`,
    });
  }
}
