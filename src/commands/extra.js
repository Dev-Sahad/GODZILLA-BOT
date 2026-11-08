// commands/extra.js — Additional commands & features
// Features:
//   🎨 .imagine / .aiart — AI Image Generator (Pollinations AI)
//   🔍 .wiki — Wikipedia instant lookup
//   🐱 .cat / .dog / .anime — Random high-res animals & anime
//   💡 .fact — Random fascinating facts
//   ⏱️ .remind — Set scheduled WhatsApp reminders
//   🔤 .fancy — Convert text to aesthetic Unicode fonts
//   🐙 .github — GitHub user profile & repo inspector
//   🔐 .password — Cryptographic secure password generator

import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config.js';
import { getSender, getDisplayName } from '../helpers.js';

const USER_AGENT = 'GodzillaBot/2.0 (WhatsApp Multi-Device Assistant; https://github.com/SxhdSha/godzilla-bot)';

/**
 * .imagine <prompt> — Generate AI images on the fly
 */
export async function imagineCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const prompt = args.join(' ').trim();

  if (!prompt) {
    return sock.sendMessage(jid, {
      text: `🎨 *Usage:* ${config.prefix}imagine <description of the image>\n\nExample:\n${config.prefix}imagine a futuristic cyberpunk samurai warrior in rain, 8k octane render`,
    });
  }

  await sock.sendMessage(jid, {
    text: `🎨 *Generating image…*\nPrompt: _${prompt}_\n_Please wait a few seconds…_`,
  });

  try {
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;

    await sock.sendMessage(jid, {
      image: { url: imageUrl },
      caption: `🎨 *AI Art Generated*\n\n📝 Prompt: _${prompt}_\n🤖 Engine: *Pollinations Flux*\n🦖 by *${config.botName}*`,
    }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Image generation failed.\n_${err.message}_`,
    });
  }
}

/**
 * .wiki <topic> — Instant Wikipedia lookup
 */
export async function wikiCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const query = args.join(' ').trim();

  if (!query) {
    return sock.sendMessage(jid, {
      text: `🔍 *Usage:* ${config.prefix}wiki <search topic>\n\nExample: ${config.prefix}wiki Black hole`,
    });
  }

  await sock.sendMessage(jid, { text: `📚 *Searching Wikipedia for:* _${query}_…` });

  try {
    const res = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': USER_AGENT }, timeout: 10000 }
    );

    const data = res.data;
    if (!data.extract) throw new Error('No summary found');

    const title = data.title;
    const extract = data.extract;
    const pageUrl = data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`;
    const thumbnail = data.thumbnail?.source;

    const messageText = `📚 *Wikipedia: ${title}*\n\n${extract}\n\n🔗 *Read more:* ${pageUrl}`;

    if (thumbnail) {
      await sock.sendMessage(jid, {
        image: { url: thumbnail },
        caption: messageText,
      });
    } else {
      await sock.sendMessage(jid, { text: messageText });
    }
  } catch {
    await sock.sendMessage(jid, {
      text: `❌ Could not find Wikipedia page for "_${query}_". Try a different spelling or term.`,
    });
  }
}

/**
 * .cat — Random cute cat picture
 */
export async function catCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    const res = await axios.get('https://api.thecatapi.com/v1/images/search', {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000,
    });
    const url = res.data[0]?.url;
    if (!url) throw new Error('No cat found');

    await sock.sendMessage(jid, {
      image: { url },
      caption: `🐱 *Meow!* Here is your random cat 🐾`,
    });
  } catch {
    await sock.sendMessage(jid, { text: '❌ Failed to fetch a cat image. Try again!' });
  }
}

/**
 * .dog — Random cute dog picture
 */
export async function dogCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    const res = await axios.get('https://dog.ceo/api/breeds/image/random', {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000,
    });
    const url = res.data?.message;
    if (!url) throw new Error('No dog found');

    await sock.sendMessage(jid, {
      image: { url },
      caption: `🐶 *Woof!* Here is your good boy 🐕`,
    });
  } catch {
    await sock.sendMessage(jid, { text: '❌ Failed to fetch a dog image. Try again!' });
  }
}

/**
 * .anime — Random anime illustration
 */
export async function animeCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    const res = await axios.get('https://api.waifu.pics/sfw/waifu', {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000,
    });
    const url = res.data?.url;
    if (!url) throw new Error('No anime art found');

    await sock.sendMessage(jid, {
      image: { url },
      caption: `🌸 *Anime Art* via ${config.botName}`,
    });
  } catch {
    await sock.sendMessage(jid, { text: '❌ Failed to fetch anime image.' });
  }
}

/**
 * .fact — Random fascinating fact
 */
export async function factCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    const res = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000,
    });
    const fact = res.data?.text;
    await sock.sendMessage(jid, {
      text: `💡 *Did You Know?*\n\n${fact}`,
    });
  } catch {
    await sock.sendMessage(jid, { text: '❌ Could not retrieve a fact at this moment.' });
  }
}

/**
 * .remind <minutes> <message> — Set timed reminder
 */
export async function remindCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  const name = getDisplayName(msg);

  const mins = parseInt(args[0]);
  const text = args.slice(1).join(' ').trim();

  if (isNaN(mins) || mins <= 0 || mins > 1440 || !text) {
    return sock.sendMessage(jid, {
      text: `⏱️ *Usage:* ${config.prefix}remind <minutes> <message>\n\nExamples:\n${config.prefix}remind 10 Drink water\n${config.prefix}remind 45 Call the meeting\n_(Max: 1440 mins / 24h)_`,
    });
  }

  await sock.sendMessage(jid, {
    text: `⏱️ *Reminder Set!* I will notify you in *${mins} minute(s)* for:\n> _"${text}"_`,
  });

  setTimeout(async () => {
    try {
      const mentionJid = jid.endsWith('@g.us') ? sender : jid;
      await sock.sendMessage(jid, {
        text: `🔔 *REMINDER FOR ${name.toUpperCase()}!* ⏰\n\n📌 *Task:* ${text}\n⏱ _Scheduled ${mins} min(s) ago_`,
        mentions: [mentionJid],
      });
    } catch {}
  }, mins * 60 * 1000);
}

/**
 * .fancy <text> — Transform text to aesthetic typography
 */
export async function fancyCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const input = args.join(' ').trim();

  if (!input) {
    return sock.sendMessage(jid, {
      text: `🔤 *Usage:* ${config.prefix}fancy <text to style>\n\nExample: ${config.prefix}fancy Godzilla Bot`,
    });
  }

  const normal = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const fonts = {
    'Bold Serif': '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗',
    'Bold Sans':  '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
    'Italic':     '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡0123456789',
    'Script':     '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵0123456789',
    'Monospace':  '𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿',
    'Circled':    'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ⓪①②③④⑤⑥⑦⑧⑨',
  };

  const transform = (str, targetFont) => {
    return Array.from(str)
      .map(char => {
        const idx = normal.indexOf(char);
        if (idx === -1) return char;
        // targetFont contains surrogate pairs (2 UTF-16 code units per char)
        return Array.from(targetFont)[idx] || char;
      })
      .join('');
  };

  const results = Object.entries(fonts).map(([name, fontChars]) => {
    return `*${name}:*\n${transform(input, fontChars)}`;
  }).join('\n\n');

  await sock.sendMessage(jid, {
    text: `✨ *Fancy Fonts for:* "${input}"\n\n${results}`,
  });
}

/**
 * .github <username> — GitHub profile information
 */
export async function githubCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const username = args[0]?.trim();

  if (!username) {
    return sock.sendMessage(jid, {
      text: `🐙 *Usage:* ${config.prefix}github <username>\n\nExample: ${config.prefix}github SxhdSha`,
    });
  }

  await sock.sendMessage(jid, { text: `🐙 *Fetching GitHub profile for:* _${username}_…` });

  try {
    const res = await axios.get(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000,
    });
    const u = res.data;

    const createdYear = new Date(u.created_at).getFullYear();
    const text = `🐙 *GitHub User: ${u.login}*\n\n` +
      `👤 *Name:* ${u.name || 'Not specified'}\n` +
      `📝 *Bio:* ${u.bio || 'None'}\n` +
      `📍 *Location:* ${u.location || 'Unknown'}\n` +
      `📦 *Public Repos:* ${u.public_repos}\n` +
      `👥 *Followers:* ${u.followers.toLocaleString()} | *Following:* ${u.following.toLocaleString()}\n` +
      `📅 *Joined:* ${createdYear}\n` +
      `🔗 *Profile:* ${u.html_url}`;

    if (u.avatar_url) {
      await sock.sendMessage(jid, {
        image: { url: u.avatar_url },
        caption: text,
      });
    } else {
      await sock.sendMessage(jid, { text });
    }
  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ GitHub user "_${username}_" not found.`,
    });
  }
}

/**
 * .password [length] — Generate secure random password
 */
export async function passwordCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const length = parseInt(args[0]) || 16;

  if (length < 6 || length > 64) {
    return sock.sendMessage(jid, {
      text: '❌ Password length must be between 6 and 64 characters.',
    });
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }

  await sock.sendMessage(jid, {
    text: `🔐 *Generated Secure Password (${length} chars):*\n\n\`${password}\`\n\n_Keep it safe and do not share!_`,
  });
}

